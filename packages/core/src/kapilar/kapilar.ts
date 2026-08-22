import type { Kapi, KapiDurumu } from '@swiip/shared';
import { metinler } from '@swiip/shared';
import { metin, type Cevaplar } from '../cevaplar';

/**
 * Dört sert kapı — spec bölüm 4.
 *
 * Tasarım ilkesi: kullanıcıyı suçlamaz ve kapıyı çarpmaz. Ne olduğu, neden olduğu ve
 * ne yapabileceği söylenir. Verisi silinmez, döndüğünde devam eder.
 */

/** Cevaplanmadan program üretilemeyecek zorunlu tarama soruları. */
export const ZORUNLU_TARAMA = ['K6', 'K7', 'S2', 'S3', 'S7', 'S18'] as const;

/** Kardiyak kırmızı bayrak taşıyan PAR-Q+ soruları. */
const KARDIYAK_SORULAR = ['S2', 'S3', 'S7'] as const;

/**
 * Gebelik taraması bu kullanıcıda gereksiz mi?
 *
 * K6 ("Hamile misin veya emziriyor musun?") erkek beyan edene artık sorulmuyor:
 * karşılığı olmayan bir soru, ürünün "134 sorunun hepsinin bir karşılığı var" sözünü
 * kullanıcının ilk on iki dakikasında yalanlıyordu.
 *
 * Ama K6 aynı zamanda dört sert kapıdan birinin tarama sorusu. Yalnızca gizlenseydi
 * `eksik_tarama` hiç kapanmaz ve program HİÇ üretilemezdi. Bu yüzden kapı da biliyor.
 *
 * Gevşetme değil, aynı sonucun daha kısa yolu: "Erkek" beyanı gebelik ve emzirme
 * ihtimalini zaten dışarıda bırakıyor. Cinsiyet CEVAPLANMAMIŞSA gevşetme yok — bilgi
 * yokken güvenlik tarafında varsayım yapılmaz.
 */
function gebelikTaramasiGereksizMi(cevaplar: Cevaplar): boolean {
  return metin(cevaplar, 'K2') === 'Erkek';
}

export interface KapiSecenekleri {
  /** Yaş hesabında referans gün. Test edilebilirlik için dışarıdan verilir. */
  bugun: Date;
  /** Kardiyak kapısı için doktor onay belgesi yüklendi mi. */
  doktorOnayiVar?: boolean;
  /** ED modunda kullanıcı sayıları ayarlardan kendisi açtı mı. Biz açmayız. */
  kullaniciSayilariActi?: boolean;
}

export function kapilariDegerlendir(cevaplar: Cevaplar, secenekler: KapiSecenekleri): KapiDurumu {
  const kapilar: Kapi[] = [];

  const eksik_tarama = ZORUNLU_TARAMA.filter((id) => {
    // Erkek beyan edende gebelik taraması karşılanmış sayılır; soru da sorulmuyor.
    if (id === 'K6' && gebelikTaramasiGereksizMi(cevaplar)) return false;

    const deger = cevaplar[id];
    return deger === undefined || deger === null || deger === '';
  });

  // 1. Yaş kapısı — beyan ve doğum tarihi birlikte kontrol edilir.
  const yasTetikleyen: string[] = [];
  if (metin(cevaplar, 'K7') === 'Hayır') yasTetikleyen.push('K7');
  const yas = yasHesapla(metin(cevaplar, 'K1'), secenekler.bugun);
  if (yas !== undefined && yas < 18) yasTetikleyen.push('K1');

  if (yasTetikleyen.length > 0) {
    kapilar.push({
      tip: 'yas',
      eylem: 'kayit_reddet',
      mesaj: metinler.kapilar.yas.govde,
      tetikleyen: yasTetikleyen,
    });
  }

  // 2. Gebelik / emzirme kapısı — doktor onayıyla açılmaz.
  const gebelik = metin(cevaplar, 'K6');
  if (gebelik === 'Hamileyim' || gebelik === 'Emziriyorum') {
    kapilar.push({
      tip: 'gebelik',
      eylem: 'program_uretme',
      mesaj: metinler.kapilar.gebelik.govde,
      tetikleyen: ['K6'],
    });
  }

  // 3. Kardiyak kırmızı bayrak — tüm tetikleyiciler tek kapıda toplanır.
  const kardiyakTetikleyen = KARDIYAK_SORULAR.filter((id) => metin(cevaplar, id) === 'Evet');
  if (kardiyakTetikleyen.length > 0 && !secenekler.doktorOnayiVar) {
    kapilar.push({
      tip: 'kardiyak',
      eylem: 'doktor_onayi_bekle',
      mesaj: metinler.kapilar.kardiyak.govde,
      tetikleyen: [...kardiyakTetikleyen],
    });
  }

  // 4. Yeme bozukluğu — program üretilir, sayılar gizlenir.
  const ed = metin(cevaplar, 'S18') === 'Evet';
  if (ed) {
    kapilar.push({
      tip: 'yeme_bozuklugu',
      eylem: 'sayilari_gizle',
      mesaj: metinler.kapilar.yemeBozuklugu.govde,
      tetikleyen: ['S18'],
    });
  }

  return {
    kapilar,
    kayit_engelli: kapilar.some((k) => k.eylem === 'kayit_reddet'),
    program_engelli:
      eksik_tarama.length > 0 ||
      kapilar.some((k) => k.eylem === 'program_uretme' || k.eylem === 'doktor_onayi_bekle'),
    sayilar_gizli: ed && secenekler.kullaniciSayilariActi !== true,
    eksik_tarama: [...eksik_tarama],
  };
}

/** Tam yıl olarak yaş. Doğum gününden bir gün önce hâlâ küçük yaştır. */
export function yasHesapla(dogumTarihi: string | undefined, bugun: Date): number | undefined {
  if (!dogumTarihi) return undefined;
  const dogum = new Date(`${dogumTarihi.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(dogum.getTime())) return undefined;

  let yas = bugun.getUTCFullYear() - dogum.getUTCFullYear();
  const ayFarki = bugun.getUTCMonth() - dogum.getUTCMonth();
  if (ayFarki < 0 || (ayFarki === 0 && bugun.getUTCDate() < dogum.getUTCDate())) {
    yas -= 1;
  }
  return yas;
}
