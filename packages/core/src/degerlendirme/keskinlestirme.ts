import { SORU_BANKASI, type Karar, type Soru } from '@swiip/shared';
import { atlandiMi, type Cevaplar } from '../cevaplar';
import { soruAsamasi } from './motor';

/**
 * Keskinleştirme — değerlendirmeyi kısaltmanın karşılığı.
 *
 * Değerlendirme 136 sorudan 8 karta indi. Çıkan soruların bir kısmı gerçekten
 * gereksizdi; bir kısmı ise programı iyileştiriyor ama **ilk gün sorulması
 * gerekmiyor.** İkincisi buraya taşındı.
 *
 * Kritik olan şu: bu sorular kullanıcıya "istersen daha çok soru cevapla" diye
 * sunulmuyor. Program zaten hangi sorunun hangi hareketi elediğini biliyor —
 * `program.ts:466` her havuz elemesini bir `Karar`'a bağlıyor ve o kararın
 * `girdiler[].soru_id` alanını dolduruyor. Teklif bunun tersi:
 *
 *   "Karmaşık serbest ağırlık hareketlerini çıkardım — tekniğine ne kadar
 *    güvendiğini bilmiyorum. 20 saniye: hangilerini rahat yapıyorsun?"
 *
 * Yani görünür bir bedeli olan, kazanılmış bir teklif. Genel bir dırdır değil.
 * "Gerekçesi görünür program" vaadinin doğrudan devamı.
 */

export interface KeskinlestirmeTeklifi {
  /** Cevaplanınca kararı değiştirecek soru. */
  soru: Soru;
  /** Teklifi doğuran kararın kural kimliği — metin bundan kuruluyor. */
  kural: string;
  /** O kararın etkilediği hareket sayısı; "5 hareket geri gelir" bundan. */
  etkilenen: number;
}

/** Bir soru cevaplanmış mı — tekrarlı anahtarlar (A8:Squat) da sayılır. */
function cevaplandiMi(cevaplar: Cevaplar, soruId: string): boolean {
  const dolu = (d: unknown) =>
    d !== undefined && d !== null && d !== '' && !(Array.isArray(d) && d.length === 0);
  if (dolu(cevaplar[soruId]) && !atlandiMi(cevaplar[soruId])) return true;
  const onEk = `${soruId}:`;
  return Object.entries(cevaplar).some(([k, v]) => k.startsWith(onEk) && dolu(v) && !atlandiMi(v));
}

const KESKINLESTIRME_SORULARI = new Map<string, Soru>(
  SORU_BANKASI.blocks
    .flatMap((b) => b.questions)
    .filter((q) => soruAsamasi(q) === 'keskinlestirme')
    .map((q) => [q.id, q]),
);

/**
 * Programın karar izinden, cevaplanmamış keskinleştirme sorularını çıkarır.
 *
 * Sıralama etkilenen hareket sayısına göre: en çok şeyi değiştiren teklif başta.
 * Aynı soru birden çok karardan gelebilir (E6 hem gürültü hem zıplama kısıtı);
 * en yüksek etkili olan tutulur, soru iki kez teklif edilmez.
 */
export function keskinlestirmeTeklifleri(
  kararlar: readonly Karar[],
  cevaplar: Cevaplar,
): KeskinlestirmeTeklifi[] {
  const enIyi = new Map<string, KeskinlestirmeTeklifi>();

  for (const karar of kararlar) {
    const etkilenen = karar.parametreler?.adet ?? 0;
    for (const girdi of karar.girdiler ?? []) {
      const soru = KESKINLESTIRME_SORULARI.get(girdi.soru_id);
      if (!soru) continue;
      if (cevaplandiMi(cevaplar, soru.id)) continue;

      const mevcut = enIyi.get(soru.id);
      if (mevcut && mevcut.etkilenen >= etkilenen) continue;
      enIyi.set(soru.id, { soru, kural: karar.kurallar[0] ?? karar.entity_id, etkilenen });
    }
  }

  return [...enIyi.values()].sort(
    (a, b) => b.etkilenen - a.etkilenen || a.soru.id.localeCompare(b.soru.id),
  );
}

/** Cevaplanmamış bütün keskinleştirme soruları — program izi olmadan, ayarlar ekranı için. */
export function keskinlestirilebilirSorular(cevaplar: Cevaplar): Soru[] {
  return [...KESKINLESTIRME_SORULARI.values()].filter((q) => !cevaplandiMi(cevaplar, q.id));
}
