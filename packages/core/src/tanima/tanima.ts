import { jsonCikar } from '../ai/jsonCikar';
/**
 * Görsel yemek tanıma boru hattı — spec bölüm 9, plan F7.
 *
 * Mimarinin tamamı iki şey üzerine kurulu:
 *
 *  1. MALİYET. Sistemin en yüksek hacimli noktası burası. Önbellek isabeti AI çağrısını
 *     tamamen atlar; adalet kuralları da bu ölçümden doğar.
 *
 *  2. TUTARLILIK. Model **ne yendiğini ve ne kadar yendiğini** söyler; besin değerini
 *     ASLA söylemez. Kalori ve makro veritabanından gelir. Bu ayrım, "aynı şeyi
 *     eklediğimde farklı makro çıkıyor" şikâyetini yapısal olarak imkânsız kılar.
 *
 * Model çıktısında kalori veya makro alanı görürsek bunu sessizce yok saymayız —
 * temizler ve kullanıcıya uyarı olarak taşırız; sessiz düzeltme hatayı gizler.
 */

export interface BesinBilesimi {
  kalori: number;
  protein_g: number;
  yag_g: number;
  karbonhidrat_g: number;
  lif_g: number;
}

export interface BesinKaydi {
  id: string;
  ad: string;
  per_100g: BesinBilesimi;
  porsiyonlar: Array<{ id: string; ad: string; gram: number }>;
}

export interface TanimaKalemi {
  ad: string;
  miktar: number;
  birim?: string;
  /** Modelin gram tahmini; tabak ve çatal referans nesne olarak kullanılır. */
  gram_tahmini?: number;
}

export interface TanimaCiktisi {
  kalemler: TanimaKalemi[];
  uyari?: string;
}

/** Bir tabakta gerçekçi olarak bulunabilecek en fazla kalem sayısı. */
const MAKS_KALEM = 12;

/** Modelin üretmesi yasak alanlar: besin değeri veritabanından gelir. */
const YASAKLI_ALANLAR = ['kalori', 'kcal', 'protein_g', 'yag_g', 'karbonhidrat_g', 'makro'];

export function tanimaCiktisiniAyristir(ham: string): TanimaCiktisi {
  /**
   * Cikti ```json citiyle sarili gelebiliyor. Duz `JSON.parse` ilk karakterde patliyor,
   * hata sessizce yutuluyor ve kullanici "fotografta tanıyabildigim bir yemek yok"
   * goruyordu — model tabagi gayet iyi gormusken.
   */
  const json = jsonCikar(ham) as { kalemler?: unknown } | undefined;
  if (!json || typeof json !== 'object') return { kalemler: [] };

  if (!Array.isArray(json.kalemler)) return { kalemler: [] };

  let besinDegeriUretildi = false;
  const kalemler: TanimaKalemi[] = [];

  for (const ham of json.kalemler.slice(0, MAKS_KALEM)) {
    if (typeof ham !== 'object' || ham === null) continue;
    const kayit = ham as Record<string, unknown>;

    const ad = typeof kayit.ad === 'string' ? kayit.ad.trim() : '';
    if (ad === '') continue;

    if (YASAKLI_ALANLAR.some((alan) => alan in kayit)) besinDegeriUretildi = true;

    const hamMiktar = typeof kayit.miktar === 'number' ? kayit.miktar : 1;
    const kalem: TanimaKalemi = {
      ad,
      miktar: Number.isFinite(hamMiktar) && hamMiktar > 0 ? hamMiktar : 1,
    };

    if (typeof kayit.birim === 'string') kalem.birim = kayit.birim;
    if (typeof kayit.gram_tahmini === 'number' && kayit.gram_tahmini > 0) {
      kalem.gram_tahmini = kayit.gram_tahmini;
    }

    kalemler.push(kalem);
  }

  return besinDegeriUretildi
    ? {
        kalemler,
        uyari:
          'Model besin değeri üretmeye çalıştı; bu değerler yok sayıldı. Kalori ve makro her ' +
          'zaman besin veritabanından hesaplanır.',
      }
    : { kalemler };
}

import { aramaAnahtari } from '@swiip/shared';

// ---------------------------------------------------------------------------
// Eşleme
// ---------------------------------------------------------------------------

/**
 * Türkçe küçültme ve aksan sadeleştirme.
 *
 * Katlamanın kendisi `shared/arama.ts` içinde tek yerde duruyor. Burada ikinci bir
 * uygulama tutmak, iki kuralın sessizce ayrışması demekti — ayrışan bir eşleşme kuralı
 * hata vermez, sadece bulmaz. Buradaki fazladan iş yalnızca boşluk sadeleştirmesi:
 * tanıma çıktısında araları bozuk adlar geliyor ("köfte   ekmek").
 */
export function turkceNormalize(metin: string): string {
  /**
   * Noktalama boşluğa çevriliyor.
   *
   * Katalog adlarının çoğu virgüllü ("Beyaz peynir, tam yağlı") ve model çıktısı
   * parantezli ("beyaz peynir (feta)"). Noktalama kelimeye yapışınca "peynir," hiçbir
   * zaman "peynir" ile eşleşmiyor ve skor kelime örtüşmesini kaçırıyordu. Sonuç sessizdi:
   * eşleşme bulunuyor, sadece yanlışını buluyordu — kullanıcıya peynirin makrosu yerine
   * **ekmeğin** makrosu yazılıyordu.
   */
  return aramaAnahtari(metin)
    .replace(/[,;:()[\]{}/.!?"'`*_+&|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 0-1 arası benzerlik. Tam eşleşme, kelime içerme ve ortak kelime oranı üzerinden. */
export function eslesmeSkoru(aranan: string, aday: string): number {
  const a = turkceNormalize(aranan);
  const b = turkceNormalize(aday);

  if (a === b) return 1;
  if (b.includes(a) || a.includes(b)) {
    // Kısa aranan uzun adın içindeyse: "köfte" → "Izgara köfte"
    const oran = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return 0.55 + oran * 0.4;
  }

  const aKelime = new Set(a.split(' ').filter((k) => k.length > 2));
  const bKelime = new Set(b.split(' ').filter((k) => k.length > 2));
  if (aKelime.size === 0 || bKelime.size === 0) return 0;

  const ortak = [...aKelime].filter((k) => bKelime.has(k)).length;
  if (ortak > 0) return 0.45 + (ortak / Math.max(aKelime.size, bKelime.size)) * 0.3;

  // Kelime kökü yakınlığı: "pilav" ↔ "pilavi"
  const kokEslesmesi = [...aKelime].some((ka) =>
    [...bKelime].some((kb) => kb.startsWith(ka) || ka.startsWith(kb)),
  );
  return kokEslesmesi ? 0.42 : 0.1;
}

/** Bu skorun altındaki eşleşmeler kullanıcıya "bulunamadı" olarak gösterilir. */
const ESLESME_ESIGI = 0.4;
/** Birim tanınmadığında varsayılan gram. */
const VARSAYILAN_GRAM = 100;

export interface EslesmisKalem {
  ad: string;
  miktar: number;
  gram: number;
  eslesti: boolean;
  besin?: BesinKaydi;
  skor?: number;
}

/**
 * Genel terimin katalogdaki sade karşılığı.
 *
 * Görsel model çoğu zaman genel ad veriyor: "pilav", "ekmek", "mısır". Katalogda o
 * genel adın kendisi yok — sade kayıt başka bir adla duruyor ("Pirinç pilavı",
 * "Ekmek, beyaz") ve yanında bileşik yemekler var ("Perde pilav", "Etli ekmek").
 *
 * Benzerlik skoru ikisini ayırt edemiyor: her ikisi de terimi içeriyor ve kısa olan
 * kazanıyor. Persona koşusunda sade pilav **Perde pilav**a, ekmek **Etli ekmek**e
 * bağlandı — ve kullanıcıya o yemeğin makroları yazıldı.
 *
 * Bu bir tahmin tablosu değil, sözlük: genel terimin hangi sade kaydı kastettiği.
 * Yalnızca modelin gerçekten ürettiği ve katalogda sade karşılığı OLAN terimler var.
 * Eşleşme TAM: "perde pilav" buraya takılmaz, normal skorlamaya gider.
 */
const GENEL_TERIMLER: Record<string, string> = {
  pilav: 'Pirinç pilavı',
  ekmek: 'Ekmek, beyaz',
  misir: 'Mısır, haşlanmış',
  yogurt: 'Yoğurt, tam yağlı',
  peynir: 'Beyaz peynir, tam yağlı',
  makarna: 'Makarna, haşlanmış',
  'yesil biber': 'Yeşil biber, çiğ',
};

/** Genel terim sözlüğünden birebir karşılık; katalogda yoksa undefined. */
function genelTerimKarsiligi(ad: string, besinler: readonly BesinKaydi[]): BesinKaydi | undefined {
  const hedef = GENEL_TERIMLER[turkceNormalize(ad)];
  if (!hedef) return undefined;

  const anahtar = turkceNormalize(hedef);
  return besinler.find((b) => turkceNormalize(b.ad) === anahtar);
}

export function kalemleriEslestir(
  kalemler: readonly TanimaKalemi[],
  besinler: readonly BesinKaydi[],
): EslesmisKalem[] {
  return kalemler.map((kalem) => {
    const genel = genelTerimKarsiligi(kalem.ad, besinler);
    if (genel) {
      return {
        ad: kalem.ad,
        miktar: kalem.miktar,
        gram: gramHesapla(kalem, genel),
        eslesti: true,
        besin: genel,
        skor: 1,
      };
    }

    const adaylar = besinler
      .map((besin) => ({ besin, skor: eslesmeSkoru(kalem.ad, besin.ad) }))
      .sort((a, b) => (b.skor !== a.skor ? b.skor - a.skor : a.besin.id.localeCompare(b.besin.id)));

    const enIyi = adaylar[0];
    const eslesti = enIyi !== undefined && enIyi.skor >= ESLESME_ESIGI;

    const gram = gramHesapla(kalem, eslesti ? enIyi.besin : undefined);

    const sonuc: EslesmisKalem = { ad: kalem.ad, miktar: kalem.miktar, gram, eslesti };
    if (eslesti) {
      sonuc.besin = enIyi.besin;
      sonuc.skor = Math.round(enIyi.skor * 100) / 100;
    }
    return sonuc;
  });
}

function gramHesapla(kalem: TanimaKalemi, besin?: BesinKaydi): number {
  // Modelin gram tahmini varsa ona güvenilir: referans nesneyle ölçülmüştür.
  if (kalem.gram_tahmini !== undefined) return kalem.gram_tahmini;

  const porsiyon = besin?.porsiyonlar.find((p) => p.id === kalem.birim);
  if (porsiyon) return Math.round(porsiyon.gram * kalem.miktar);

  return Math.round(VARSAYILAN_GRAM * kalem.miktar);
}

/** Toplam = Σ (miktar × bileşim). Tek hesap yolu budur. */
export function besinToplami(kalemler: readonly EslesmisKalem[]): BesinBilesimi {
  const toplam = kalemler.reduce<BesinBilesimi>(
    (t, kalem) => {
      if (!kalem.eslesti || !kalem.besin) return t;
      const oran = kalem.gram / 100;
      return {
        kalori: t.kalori + kalem.besin.per_100g.kalori * oran,
        protein_g: t.protein_g + kalem.besin.per_100g.protein_g * oran,
        yag_g: t.yag_g + kalem.besin.per_100g.yag_g * oran,
        karbonhidrat_g: t.karbonhidrat_g + kalem.besin.per_100g.karbonhidrat_g * oran,
        lif_g: t.lif_g + kalem.besin.per_100g.lif_g * oran,
      };
    },
    { kalori: 0, protein_g: 0, yag_g: 0, karbonhidrat_g: 0, lif_g: 0 },
  );

  return {
    kalori: Math.round(toplam.kalori),
    protein_g: Math.round(toplam.protein_g * 10) / 10,
    yag_g: Math.round(toplam.yag_g * 10) / 10,
    karbonhidrat_g: Math.round(toplam.karbonhidrat_g * 10) / 10,
    lif_g: Math.round(toplam.lif_g * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// Kota adaleti
// ---------------------------------------------------------------------------

export interface KotaDurumu {
  /** Yerel görsel parmak izi eşleşti; AI çağrısı yapılmadı. */
  onbellekten: boolean;
  /** Yanlış tanıma sonrası tekrar deneme. */
  hataliTanimaTekrari: boolean;
}

/**
 * Şu iki durum hiçbir zaman kota yemez:
 *  - Önbellekten gelen tanıma (bize maliyeti sıfır)
 *  - Yanlış tanıma sonrası tekrar deneme (bizim hatamızın bedelini kullanıcı ödemez)
 */
export function kotaDusulmeliMi(durum: KotaDurumu): boolean {
  return !durum.onbellekten && !durum.hataliTanimaTekrari;
}

/** Görsel modele verilen sistem mesajı. Besin değeri istemesi bilinçli olarak yasak. */
export const TANIMA_SISTEM_MESAJI = [
  'Sen bir yemek tanıma aracısın. Fotoğraftaki yemekleri ve MİKTARLARINI listelersin.',
  'KURALLAR:',
  '1. Kalori, protein, yağ, karbonhidrat gibi besin değeri ASLA yazma. Bunlar veritabanından gelir.',
  '2. Sayılabilir yiyecekleri (köfte, yumurta, sarma) ADET olarak say.',
  '3. Şekilsiz yiyecekleri (pilav, çorba, salata) ev ölçüsüyle tahmin et; tabak ve çatalı',
  '   referans nesne olarak kullan.',
  '4. Emin olmadığın kalemi yazma; uydurma.',
  '5. Yalnızca JSON döndür.',
  'ÇIKTI: {"kalemler":[{"ad":"köfte","miktar":3,"birim":"adet","gram_tahmini":120}]}',
].join('\n');
