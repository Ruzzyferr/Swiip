/**
 * Kullanıcı başına aylık AI bütçesi.
 *
 * Kota çağrı **sayısını** sınırlıyor, maliyeti değil. Aynı sayıda çağrı uzun bağlamla
 * veya yanlış model seviyesiyle kat kat pahalıya gelebilir; kota bunu görmez.
 *
 * Ürünün bilinen en büyük riski birim ekonomisi: Pro aylık 169₺, AI maliyeti ~50₺.
 * Marj var ama dar, ve marjı yiyen şey ortalama kullanıcı değil uç kullanıcıdır.
 *
 * Bu bir kesme anahtarı değil, bir görünürlük ve yumuşak fren katmanı:
 *  - Eşiğe yaklaşınca model seviyesi ucuza düşer (anlatım sadeleşir, hesap değişmez).
 *  - Bütçe aşılırsa kullanıcı işaretlenir ama **hizmet kesilmez**.
 *
 * Ödeme yapan kullanıcıyı ay ortasında kapıda bırakmak, marjı korurken güveni harcamak
 * olurdu. Üst sınırı kota zaten koyuyor.
 */

import type { ModelSecimi, ModelSeviyesi } from './gecit';

export type ButcePlani = 'ucretsiz' | 'temel' | 'pro';

/**
 * Plan başına aylık AI bütçesi (USD).
 *
 * Ücretsiz planda AI kotası zaten kapalı; bütçe sıfır, tutarlılık için burada.
 */
export const PLAN_AYLIK_BUTCE_USD: Record<ButcePlani, number> = {
  ucretsiz: 0,
  temel: 0.35,
  pro: 1.2,
};

/** Bu orandan sonra ucuz model seviyesine düşülür. */
const UCUZA_DUSME_ORANI = 0.8;

export interface ButceGirdisi {
  plan: ButcePlani;
  harcananUsd: number;
}

export interface ButceDurumu {
  butceUsd: number;
  harcananUsd: number;
  kalanUsd: number;
  kullanimYuzdesi: number;
  /** Eşiğe yaklaşıldı: bundan sonraki çağrılar ucuz seviyeden yapılır. */
  ucuzaDus: boolean;
  asildi: boolean;
  /** Her zaman `false`. Alan bilinçli: kesmediğimiz sözleşmede yazılı dursun. */
  hizmetKesildi: boolean;
}

export function butceDurumu(girdi: ButceGirdisi): ButceDurumu {
  const butceUsd = PLAN_AYLIK_BUTCE_USD[girdi.plan] ?? 0;
  const harcananUsd = Math.max(0, girdi.harcananUsd);
  const kalanUsd = Math.max(0, Math.round((butceUsd - harcananUsd) * 1e6) / 1e6);

  const kullanimYuzdesi =
    butceUsd > 0 ? Math.round((harcananUsd / butceUsd) * 100) : harcananUsd > 0 ? 100 : 100;

  return {
    butceUsd,
    harcananUsd,
    kalanUsd,
    kullanimYuzdesi,
    ucuzaDus: butceUsd === 0 || harcananUsd >= butceUsd * UCUZA_DUSME_ORANI,
    asildi: harcananUsd >= butceUsd,
    hizmetKesildi: false,
  };
}

/**
 * Bütçe eşiğine yaklaşan kullanıcı için model seçimini ucuza indirir.
 *
 * Kullanıcı bir şey kaybetmiyor: hesap deterministik çekirdekte yapılıyor, model yalnızca
 * anlatıyor. Ucuz modelde anlatım sadeleşir, sayılar aynı kalır.
 *
 * Görsel iş görsel kalmak zorunda — metin modeli fotoğraf okuyamaz; "ucuzlatalım" diye
 * çalışmayan bir çağrı yapmak, para değil güven kaybettirir.
 */
export function ucuzaDusur(secim: ModelSecimi): ModelSecimi {
  const seviye: ModelSeviyesi = secim.gorsel ? 'ucuz_gorsel' : 'ucuz';

  return {
    seviye,
    gorsel: secim.gorsel,
    // Çıktıyı da kısıyoruz: model ucuzlatmak maliyetin yarısı, uzunluk diğer yarısı.
    //
    // Uzunluk kısıtı, seviye ZATEN ucuz olsa bile uygulanır. Önce "zaten ucuzsa
    // dokunma" deniyordu; koç sohbeti ucuz seviyeye alınınca bu, bütçe supabını
    // sessizce işlevsiz bıraktı — bütçe aşılıyor, `ucuzaDus` true dönüyor, ama hiçbir
    // şey ucuzlamıyordu. Seviye dibe vurduğunda elde kalan tek kaldıraç uzunluk.
    max_cikti_token: Math.max(150, Math.round(secim.max_cikti_token * 0.6)),
  };
}
