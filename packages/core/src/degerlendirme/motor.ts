import { SORU_BANKASI, type Soru, type SoruAsamasi, type SoruBlogu } from '@swiip/shared';
import { atlandiMi, dizi, type CevapDegeri, type Cevaplar } from '../cevaplar';

/**
 * Değerlendirme motoru — spec bölüm 3, plan F2.
 *
 * Görünürlük tamamen cevaplardan türetilir; ekranda hiçbir durum saklanmaz.
 * Böylece kullanıcı uygulamayı 7. blokta kapatıp açtığında kaldığı yer yeniden hesaplanır.
 */

/** Tekrarlanan soruların cevap anahtarı: "S11:bel", "A8:Squat". */
export function tekrarAnahtari(soruId: string, kalem: string): string {
  return `${soruId}:${kalem}`;
}

export interface GorunurSoru extends Soru {
  /** Tekrarlanan sorularda benzersiz anahtar; diğerlerinde soru id'sinin kendisi. */
  id: string;
  blok_id: string;
  /** repeatFor/repeatBranch ile üretildiyse hangi kalem için. */
  kalem?: string;
  temel_id: string;
}

/** Sorunun aşaması; alan yoksa `temel`. */
export function soruAsamasi(soru: Soru): SoruAsamasi {
  return soru.asama ?? 'temel';
}

/**
 * Cevaplara göre görünür soruların tam listesi, sırayla.
 * Saf fonksiyon: aynı cevaplar her zaman aynı listeyi verir.
 *
 * Yalnızca `temel` aşama döner. `keskinlestirme` soruları programın karar izinden,
 * `periyodik` olanlar check-in'den çağrılıyor; ikisi de değerlendirme akışında yok.
 * Filtre BURADA, çünkü `sonrakiSoru`, `blokIlerlemesi` ve arayüzün blok listesi
 * hepsi bu tek listeden türüyor — ayrı ayrı filtrelenseydi biri unutulurdu ve
 * değerlendirme asla "tamamlandı" olmazdı.
 */
export function gorunurSorular(cevaplar: Cevaplar): GorunurSoru[] {
  const acilanlar = acilanSorulariTopla(cevaplar);
  const sonuc: GorunurSoru[] = [];

  for (const blok of SORU_BANKASI.blocks) {
    for (const soru of blok.questions) {
      if (soruAsamasi(soru) !== 'temel') continue;
      if (!soruGorunur(soru, cevaplar, acilanlar)) continue;

      if (soru.repeatFor && soru.repeatFor.length > 0) {
        for (const kalem of soru.repeatFor) {
          sonuc.push({
            ...soru,
            id: tekrarAnahtari(soru.id, kalem),
            temel_id: soru.id,
            blok_id: blok.id,
            kalem,
            text: `${soru.text} — ${kalem}`,
          });
        }
        continue;
      }

      const bolge = acilanlar.tekrarBolgeleri.get(soru.id);
      if (bolge) {
        for (const b of bolge) {
          sonuc.push({
            ...soru,
            id: tekrarAnahtari(soru.id, b),
            temel_id: soru.id,
            blok_id: blok.id,
            kalem: b,
            text: `${soru.text} — ${bolgeAdi(b)}`,
          });
        }
        continue;
      }

      sonuc.push({ ...soru, temel_id: soru.id, blok_id: blok.id });
    }
  }

  return sonuc;
}

interface AcilanSorular {
  /** Bir branch tarafından açılmış soru id'leri. */
  acik: Set<string>;
  /** repeatBranch hedefleri: soru id -> tekrarlanacak bölgeler. */
  tekrarBolgeleri: Map<string, string[]>;
}

function acilanSorulariTopla(cevaplar: Cevaplar): AcilanSorular {
  const acik = new Set<string>();
  const tekrarBolgeleri = new Map<string, string[]>();

  for (const blok of SORU_BANKASI.blocks) {
    for (const soru of blok.questions) {
      const cevap = cevaplar[soru.id];

      for (const [anahtar, hedefler] of Object.entries(soru.branch ?? {})) {
        if (branchTetiklendi(anahtar, cevap)) {
          for (const hedef of hedefler) acik.add(hedef);
        }
      }

      if (soru.repeatBranch && soru.repeatBranch.length > 0) {
        const bolgeler = dizi(cevaplar, soru.id).filter((b) => b.length > 0);
        if (bolgeler.length > 0) {
          for (const hedef of soru.repeatBranch) {
            tekrarBolgeleri.set(hedef, bolgeler);
            acik.add(hedef);
          }
        }
      }
    }
  }

  return { acik, tekrarBolgeleri };
}

function branchTetiklendi(anahtar: string, cevap: CevapDegeri | undefined): boolean {
  if (cevap === undefined || cevap === null || cevap === '') return false;
  /**
   * Atlanmış cevap dal açmaz.
   *
   * Boşluk kontrolü vardı ama `ATLANDI` kontrolü yoktu ve `_notYok` "Yok" dışındaki
   * her şeyi tetikliyor. H4 ("belirli bir tarihe yetiştirmen gereken bir şey var mı?")
   * boş bırakılıp geçildiğinde H4 atlanmış işaretleniyor, `'__atlandi__' !== 'Yok'`
   * doğru çıkıyor ve H4a ("Hangi tarihe?") açılıyordu: cevaplamayı reddettiğin sorunun
   * devamı soruluyordu. Atlamak "bilmiyorum"dur, bir şık değil.
   */
  if (atlandiMi(cevap)) return false;

  if (anahtar === '_notYok') {
    if (Array.isArray(cevap)) return cevap.some((c) => c !== 'Yok');
    return cevap !== 'Yok';
  }

  if (Array.isArray(cevap)) return cevap.includes(anahtar);
  return cevap === anahtar;
}

function soruGorunur(soru: Soru, cevaplar: Cevaplar, acilanlar: AcilanSorular): boolean {
  if (soru.conditionalOn) {
    for (const [bagimliId, beklenen] of Object.entries(soru.conditionalOn)) {
      if (beklenen === '_bos') {
        if (cevaplandiMi(cevaplar, bagimliId)) return false;
        continue;
      }
      const cevap = cevaplar[bagimliId];
      const eslesti = Array.isArray(cevap) ? cevap.includes(beklenen) : cevap === beklenen;
      if (!eslesti) return false;
    }
    return true;
  }

  if (soru.conditional) return acilanlar.acik.has(soru.id);
  return true;
}

/** Bir soru cevaplanmış mı — tekrarlı sorularda alt anahtarlar da sayılır. */
function cevaplandiMi(cevaplar: Cevaplar, soruId: string): boolean {
  if (dolu(cevaplar[soruId])) return true;
  const onEk = `${soruId}:`;
  return Object.entries(cevaplar).some(([k, v]) => k.startsWith(onEk) && dolu(v));
}

function dolu(deger: CevapDegeri | undefined): boolean {
  if (deger === undefined || deger === null || deger === '') return false;
  if (Array.isArray(deger)) return deger.length > 0;
  if (typeof deger === 'object') return Object.keys(deger).length > 0;
  return true;
}

/**
 * Bir cevap gerçekten cevap mı?
 *
 * "Değer var" yetmez: aralık dışında bir sayı da bir değerdir. Yalnızca doluluğa bakmak,
 * geçersiz cevabı cevaplanmış sayıp soruyu **atlıyordu** — ve kullanıcı o soruya bir daha
 * dönemiyordu. Cihazdaki taslakta geçersiz değer kalıyor, sunucu her kaydı reddediyor,
 * değerlendirme kalıcı olarak kilitleniyordu. Üstelik sessizce: ilerleme çubuğu doluyordu.
 */
function gecerliCevaplandiMi(soru: GorunurSoru, cevaplar: Cevaplar): boolean {
  if (!dolu(cevaplar[soru.id])) return false;
  return cevabiDogrula(soru, cevaplar[soru.id] as never).gecerli;
}

/** Sıradaki cevaplanmamış (ya da geçersiz cevaplanmış) görünür soru. */
export function sonrakiSoru(cevaplar: Cevaplar): GorunurSoru | undefined {
  return gorunurSorular(cevaplar).find((soru) => !gecerliCevaplandiMi(soru, cevaplar));
}

export function toplamSoruSayisi(cevaplar: Cevaplar): number {
  return gorunurSorular(cevaplar).length;
}

export interface BlokIlerlemesi {
  blok_id: string;
  blok_basligi: string;
  cevaplanan: number;
  toplam: number;
  yuzde: number;
  tamamlanan_bloklar: string[];
  tamamlandi: boolean;
}

/** Blok bazlı ilerleme. Yarıda bırakan kullanıcı buradan devam eder. */
export function blokIlerlemesi(cevaplar: Cevaplar): BlokIlerlemesi {
  const sorular = gorunurSorular(cevaplar);
  const tamamlanan_bloklar: string[] = [];

  for (const blok of SORU_BANKASI.blocks) {
    const blokSorulari = sorular.filter((s) => s.blok_id === blok.id);
    if (blokSorulari.length > 0 && blokSorulari.every((s) => gecerliCevaplandiMi(s, cevaplar))) {
      tamamlanan_bloklar.push(blok.id);
    }
  }

  const sirada = sonrakiSoru(cevaplar);
  const aktifBlok: SoruBlogu =
    SORU_BANKASI.blocks.find((b) => b.id === sirada?.blok_id) ??
    SORU_BANKASI.blocks[SORU_BANKASI.blocks.length - 1]!;

  const cevaplananToplam = sorular.filter((s) => dolu(cevaplar[s.id])).length;
  const aktifSorular = sorular.filter((s) => s.blok_id === aktifBlok.id);

  return {
    blok_id: aktifBlok.id,
    blok_basligi: aktifBlok.title,
    cevaplanan: aktifSorular.filter((s) => dolu(cevaplar[s.id])).length,
    toplam: aktifSorular.length,
    yuzde: sorular.length === 0 ? 0 : Math.round((cevaplananToplam / sorular.length) * 100),
    tamamlanan_bloklar,
    tamamlandi: sirada === undefined,
  };
}

// ---------------------------------------------------------------------------
// Cevap doğrulama
// ---------------------------------------------------------------------------

export interface DogrulamaSonucu {
  gecerli: boolean;
  mesaj?: string;
}

const GECERLI = { gecerli: true } as const;

function gecersiz(mesaj: string): DogrulamaSonucu {
  return { gecerli: false, mesaj };
}

export function cevabiDogrula(soru: Soru, cevap: CevapDegeri): DogrulamaSonucu {
  // Atlama, isteğe bağlı soruya özgü. Zorunlu bir soru atlanmış sayılamaz.
  if (atlandiMi(cevap)) {
    return soru.required
      ? gecersiz('Bu soruyu cevaplaman gerekiyor; programın buna dayanıyor.')
      : GECERLI;
  }

  if (!dolu(cevap)) {
    return soru.required
      ? gecersiz('Bu soruyu cevaplaman gerekiyor; programın buna dayanıyor.')
      : GECERLI;
  }

  switch (soru.type) {
    case 'number':
    case 'scale': {
      const sayi = typeof cevap === 'number' ? cevap : Number(String(cevap).replace(',', '.'));
      if (!Number.isFinite(sayi)) return gecersiz('Lütfen bir sayı gir.');
      if (soru.min !== undefined && sayi < soru.min) {
        return gecersiz(`Değer ${soru.min} ile ${soru.max} arasında olmalı.`);
      }
      if (soru.max !== undefined && sayi > soru.max) {
        return gecersiz(`Değer ${soru.min} ile ${soru.max} arasında olmalı.`);
      }
      return GECERLI;
    }

    case 'single':
    case 'imagechoice': {
      if (!soru.options) return GECERLI;
      return soru.options.includes(String(cevap))
        ? GECERLI
        : gecersiz('Listedeki seçeneklerden birini seç.');
    }

    case 'multi': {
      const secimler = Array.isArray(cevap) ? cevap : [String(cevap)];
      if (soru.options) {
        const gecersizler = secimler.filter((s) => !soru.options!.includes(s));
        if (gecersizler.length > 0) {
          return gecersiz(`Tanımadığım seçenek var: ${gecersizler.join(', ')}`);
        }
      }
      if (soru.maxSelect !== undefined && secimler.length > soru.maxSelect) {
        return gecersiz(`En fazla ${soru.maxSelect} seçim yapabilirsin.`);
      }
      return GECERLI;
    }

    case 'bodymap': {
      const secimler = Array.isArray(cevap) ? cevap : [String(cevap)];
      if (soru.regions) {
        const gecersizler = secimler.filter((s) => !soru.regions!.includes(s));
        if (gecersizler.length > 0) return gecersiz('Tanımadığım bir bölge işaretlendi.');
      }
      if (soru.maxSelect !== undefined && secimler.length > soru.maxSelect) {
        return gecersiz(`En fazla ${soru.maxSelect} bölge seçebilirsin.`);
      }
      return GECERLI;
    }

    case 'date': {
      const metin = String(cevap);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(metin)) return gecersiz('Tarihi gün/ay/yıl olarak seç.');
      const tarih = new Date(`${metin}T00:00:00.000Z`);
      if (Number.isNaN(tarih.getTime())) return gecersiz('Bu tarih geçerli değil.');
      if (soru.id === 'K1' && tarih.getTime() > Date.parse('2100-01-01')) {
        return gecersiz('Doğum tarihi gelecekte olamaz.');
      }
      if (soru.id === 'K1' && tarih.getUTCFullYear() > new Date().getUTCFullYear()) {
        return gecersiz('Doğum tarihi gelecekte olamaz.');
      }
      return GECERLI;
    }

    case 'consent':
      return cevap === true || cevap === 'evet'
        ? GECERLI
        : gecersiz('Devam etmek için bu onayı vermen gerekiyor.');

    default:
      return GECERLI;
  }
}

const BOLGE_ADLARI: Record<string, string> = {
  boyun: 'boyun',
  omuz_sag: 'sağ omuz',
  omuz_sol: 'sol omuz',
  dirsek_sag: 'sağ dirsek',
  dirsek_sol: 'sol dirsek',
  bilek_sag: 'sağ bilek',
  bilek_sol: 'sol bilek',
  ust_sirt: 'üst sırt',
  bel: 'bel',
  kalca_sag: 'sağ kalça',
  kalca_sol: 'sol kalça',
  diz_sag: 'sağ diz',
  diz_sol: 'sol diz',
  ayak_bilegi_sag: 'sağ ayak bileği',
  ayak_bilegi_sol: 'sol ayak bileği',
};

export function bolgeAdi(bolge: string): string {
  return BOLGE_ADLARI[bolge] ?? bolge.replace(/_/g, ' ');
}
