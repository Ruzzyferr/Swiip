import type { Karar } from '@made2fit/shared';

/**
 * AI geçidi — spec bölüm 12.
 *
 * AI dört noktada kullanılır ve hiçbirinde karar vermez. Bu dosyanın asıl işi
 * modeli çağırmak değil, **modelin sınırlarını kodla zorlamak**:
 *
 *  - `sayilariDogrula`: modelin kaynakta olmayan bir sayı uydurması hâlinde çıktı reddedilir.
 *    Sağlık bağlamında uydurulmuş bir rakam, üslubu bozuk bir cümleden kat kat pahalıdır.
 *  - Her AI çağrısının deterministik bir yedeği vardır; model çökerse ürün çalışmaya devam eder.
 *  - Maliyet her çağrıda ölçülür; birim ekonomisi en büyük riskimiz.
 */

export const AI_ISLERI = [
  'degerlendirme_yorumlama',
  'vucut_analizi',
  'yemek_tanima',
  'koc_sohbeti',
  'gerekce_anlatimi',
  'ogun_plani',
] as const;
export type AiIsi = (typeof AI_ISLERI)[number];

export type ModelSeviyesi = 'guclu' | 'guclu_gorsel' | 'orta' | 'ucuz' | 'ucuz_gorsel';

export interface ModelSecimi {
  seviye: ModelSeviyesi;
  gorsel: boolean;
  /** Bu iş için üst sınır; aşılırsa çağrı kesilir. */
  max_cikti_token: number;
}

/** İş başına model seçimi. Gateway sayesinde sağlayıcı değişse de bu tablo aynı kalır. */
const IS_MODELLERI: Record<AiIsi, ModelSecimi> = {
  degerlendirme_yorumlama: { seviye: 'guclu', gorsel: false, max_cikti_token: 1200 },
  vucut_analizi: { seviye: 'guclu_gorsel', gorsel: true, max_cikti_token: 800 },
  yemek_tanima: { seviye: 'ucuz_gorsel', gorsel: true, max_cikti_token: 400 },
  koc_sohbeti: { seviye: 'orta', gorsel: false, max_cikti_token: 700 },
  gerekce_anlatimi: { seviye: 'ucuz', gorsel: false, max_cikti_token: 300 },
  ogun_plani: { seviye: 'orta', gorsel: false, max_cikti_token: 900 },
};

export function modelSec(is: AiIsi): ModelSecimi {
  return IS_MODELLERI[is];
}

/** Milyon token başına USD. Gateway fiyatı değişince yalnızca bu tablo güncellenir. */
const FIYATLAR: Record<ModelSeviyesi, { girdi: number; cikti: number }> = {
  guclu: { girdi: 3, cikti: 15 },
  guclu_gorsel: { girdi: 3, cikti: 15 },
  orta: { girdi: 0.8, cikti: 4 },
  ucuz: { girdi: 0.25, cikti: 1.25 },
  ucuz_gorsel: { girdi: 0.25, cikti: 1.25 },
};

export interface TokenKullanimi {
  girdi_token: number;
  cikti_token: number;
}

export function maliyetHesapla(seviye: ModelSeviyesi, kullanim: TokenKullanimi): number {
  const fiyat = FIYATLAR[seviye];
  const usd =
    (kullanim.girdi_token / 1_000_000) * fiyat.girdi +
    (kullanim.cikti_token / 1_000_000) * fiyat.cikti;
  return Math.round(usd * 1_000_000) / 1_000_000;
}

/** Çağrı başına tipik token kullanımı — maliyet tahmini için ölçülmüş ortalamalar. */
const CAGRI_PROFILLERI: Record<string, { is: AiIsi; girdi: number; cikti: number }> = {
  yemek_tanima: { is: 'yemek_tanima', girdi: 1200, cikti: 180 },
  vucut_analizi: { is: 'vucut_analizi', girdi: 2500, cikti: 500 },
  koc_sohbeti: { is: 'koc_sohbeti', girdi: 1800, cikti: 320 },
  degerlendirme_yorumlama: { is: 'degerlendirme_yorumlama', girdi: 4000, cikti: 900 },
  ogun_plani: { is: 'ogun_plani', girdi: 2000, cikti: 700 },
  gerekce_anlatimi: { is: 'gerekce_anlatimi', girdi: 900, cikti: 250 },
};

export interface MaliyetDokumu {
  toplam_usd: number;
  kalemler: Record<string, number>;
}

/** Kullanıcı başına aylık AI maliyeti. Yeni bir yere AI koymadan önce burayı çalıştır. */
export function aylikMaliyetTahmini(cagrilar: Record<string, number>): MaliyetDokumu {
  const kalemler: Record<string, number> = {};
  let toplam = 0;

  for (const [ad, adet] of Object.entries(cagrilar)) {
    const profil = CAGRI_PROFILLERI[ad];
    if (!profil || adet <= 0) continue;
    const maliyet = maliyetHesapla(modelSec(profil.is).seviye, {
      girdi_token: profil.girdi * adet,
      cikti_token: profil.cikti * adet,
    });
    kalemler[ad] = Math.round(maliyet * 10000) / 10000;
    toplam += maliyet;
  }

  return { toplam_usd: Math.round(toplam * 10000) / 10000, kalemler };
}

// ---------------------------------------------------------------------------
// Sayı doğrulaması — AI'ın karar vermediğinin kodla garantisi
// ---------------------------------------------------------------------------

export interface SayiDogrulamaSonucu {
  gecerli: boolean;
  uydurulan: string[];
}

const SAYI_DESENI = /\d+(?:[.,]\d+)?/g;

/**
 * Çıktıdaki her sayı kaynakta da geçmeli. Model üslubu değiştirebilir, rakamı değiştiremez.
 * Bu kural olmadan "kalori", "kilo", "set" gibi alanlarda modelin uydurduğu bir sayı
 * doğrudan kullanıcının sağlığına dokunur.
 */
export function sayilariDogrula(kaynak: string, cikti: string): SayiDogrulamaSonucu {
  const kaynakSayilari = new Set((kaynak.match(SAYI_DESENI) ?? []).map(sayiNormalize));
  const ciktiSayilari = cikti.match(SAYI_DESENI) ?? [];

  const uydurulan = [...new Set(ciktiSayilari.map(sayiNormalize))].filter(
    (s) => !kaynakSayilari.has(s),
  );

  return { gecerli: uydurulan.length === 0, uydurulan };
}

function sayiNormalize(ham: string): string {
  const sayi = Number(ham.replace(',', '.'));
  return Number.isFinite(sayi) ? String(sayi) : ham;
}

// ---------------------------------------------------------------------------
// Gerekçe anlatımı (F3.7)
// ---------------------------------------------------------------------------

export interface AiIstek {
  is: AiIsi;
  sistem: string;
  kullanici: string;
  max_cikti_token: number;
}

export interface AiCevap {
  metin: string;
  girdi_token: number;
  cikti_token: number;
  model: string;
}

export interface AiIstemcisi {
  metinUret(istek: AiIstek): Promise<AiCevap>;
}

export interface GerekceSonucu {
  /** entity_id -> kullanıcıya gösterilecek Türkçe cümle. */
  metinler: Record<string, string>;
  ai_kullanildi: boolean;
  girdi_token: number;
  cikti_token: number;
  maliyet_usd: number;
  /** Doğrulamadan geçemeyip deterministik metne düşen çıktı sayısı. */
  dusulen_sayisi: number;
  hata?: string;
}

const GEREKCE_SISTEM_MESAJI = [
  'Sen bir antrenörün not defterisin. Sana verilen karar izini akıcı Türkçeye çevirirsin.',
  'KURALLAR:',
  '1. Karar veremezsin. Sana verilen dışında hiçbir hareket, ağırlık, set veya sayı öneremezsin.',
  '2. Verilenler dışında HİÇBİR SAYI yazamazsın.',
  '3. Tanı koyamazsın. "fıtık", "tendinit" gibi tanı adlarını tekrar etme; kullanıcının kendi',
  '   beyanına atıf yap ("bel bölgende ağrı bildirdin").',
  '4. Tek paragraf, en fazla iki cümle. Abartı ve pazarlama dili yok.',
  '5. "Kişiselleştirilmiş" kelimesini kullanma.',
].join('\n');

/**
 * Karar izini Türkçe cümleye çevirir. AI yoksa, hata verirse veya sayı uydurursa
 * deterministik açıklama olduğu gibi kullanılır — program her hâlükârda teslim edilir.
 */
export async function gerekceAnlat(
  kararlar: readonly Karar[],
  istemci: AiIstemcisi | undefined,
): Promise<GerekceSonucu> {
  const metinler: Record<string, string> = {};
  for (const karar of kararlar) metinler[karar.entity_id] = karar.aciklama_tr;

  if (!istemci || kararlar.length === 0) {
    return {
      metinler,
      ai_kullanildi: false,
      girdi_token: 0,
      cikti_token: 0,
      maliyet_usd: 0,
      dusulen_sayisi: 0,
    };
  }

  const secim = modelSec('gerekce_anlatimi');
  const kaynak = kararlar
    .map((k) => `[${k.entity_id}] kurallar: ${k.kurallar.join(', ')} · ${k.aciklama_tr}`)
    .join('\n');

  try {
    const cevap = await istemci.metinUret({
      is: 'gerekce_anlatimi',
      sistem: GEREKCE_SISTEM_MESAJI,
      kullanici: kaynak,
      max_cikti_token: secim.max_cikti_token,
    });

    const dogrulama = sayilariDogrula(kaynak, cevap.metin);
    let dusulen = 0;

    if (dogrulama.gecerli) {
      // Tek karar için tek cümle; çoklu kararda modelin bölümlemesine güvenmek yerine
      // deterministik metni korur, yalnızca tek kararlı çağrılarda değiştiririz.
      if (kararlar.length === 1) {
        metinler[kararlar[0]!.entity_id] = cevap.metin.trim();
      }
    } else {
      dusulen = 1;
    }

    return {
      metinler,
      ai_kullanildi: dogrulama.gecerli,
      girdi_token: cevap.girdi_token,
      cikti_token: cevap.cikti_token,
      maliyet_usd: maliyetHesapla(secim.seviye, cevap),
      dusulen_sayisi: dusulen,
    };
  } catch (hata) {
    return {
      metinler,
      ai_kullanildi: false,
      girdi_token: 0,
      cikti_token: 0,
      maliyet_usd: 0,
      dusulen_sayisi: 0,
      hata: hata instanceof Error ? hata.message : String(hata),
    };
  }
}
