import { varsayilanDil, type Dil } from './diller';

/**
 * Yazma işlemi hata metinleri.
 *
 * Kullanıcının başlattığı bir yazma sessizce başarısız olursa kullanıcı kaydettiğini
 * sanır: kilo girer, ekran kapanır, ertesi gün kayıt yoktur. Bu, çöken bir uygulamadan
 * daha kötü — çünkü fark edilmiyor.
 *
 * "Uygulama çökmez" kuralı hatayı gizlemek değil; çökmeden hatayı söylemek demek.
 *
 * Her işlemin kendi cümlesi var. "Bir şeyler ters gitti" kullanıcıya ne kaybettiğini
 * söylemiyor; oysa kaybettiği şeyi bilmek tekrar denemesini sağlıyor.
 */

export const YAZMA_ISLEMLERI = [
  'kilo_kaydet',
  'yemek_ekle',
  'tanima_onayla',
  'barkod_ekle',
  'degerlendirme_tamamla',
  'ed_sayilar',
  'dil_degistir',
  'dolap_kaydet',
  'plan_uret',
  'ogun_degistir',
  'foto_riza',
] as const;

export type YazmaIslemi = (typeof YAZMA_ISLEMLERI)[number];

const METINLER: Record<Dil, Record<YazmaIslemi, string>> = {
  tr: {
    kilo_kaydet: 'Kilon kaydedilemedi. Bağlantını kontrol edip tekrar deneyebilirsin.',
    yemek_ekle: 'Yemek güne eklenemedi. Tekrar denediğinde aynı sonucu alırsın.',
    tanima_onayla: 'Tanınan kalemler kaydedilemedi. Tekrar deneyebilirsin; kotandan düşmez.',
    barkod_ekle: 'Ürün güne eklenemedi. Tekrar deneyebilirsin.',
    degerlendirme_tamamla:
      'Değerlendirme tamamlanamadı. Cevapların cihazında duruyor; tekrar deneyebilirsin.',
    ed_sayilar: 'Ayar kaydedilemedi. Sayı gösterimi değişmedi; tekrar deneyebilirsin.',
    dil_degistir: 'Dil değiştirilemedi. Tekrar deneyebilirsin.',
    dolap_kaydet: 'Dolabın kaydedilemedi. Tekrar denediğinde listeyi kaybetmezsin.',
    plan_uret: 'Haftalık plan üretilemedi. Tekrar deneyebilirsin.',
    ogun_degistir: 'Öğün değiştirilemedi. Tekrar deneyebilirsin.',
    foto_riza:
      'Rızan kaydedilemedi. Rıza kaydedilmeden fotoğraf istemiyoruz; tekrar deneyebilirsin.',
  },
  en: {
    kilo_kaydet: 'Your weight could not be saved. Check your connection and try again.',
    yemek_ekle: 'The food could not be added to today. You can try again.',
    tanima_onayla:
      'The recognised items could not be saved. You can try again; it does not cost a credit.',
    barkod_ekle: 'The product could not be added to today. You can try again.',
    degerlendirme_tamamla:
      'The assessment could not be completed. Your answers are kept on this device; try again.',
    ed_sayilar: 'The setting could not be saved. Number display is unchanged; try again.',
    dil_degistir: 'The language could not be changed. You can try again.',
    dolap_kaydet: 'Your fridge could not be saved. Trying again will not lose the list.',
    plan_uret: 'The weekly plan could not be generated. You can try again.',
    ogun_degistir: 'The meal could not be swapped. You can try again.',
    foto_riza: 'Your consent could not be saved. We do not ask for photos without it; try again.',
  },
};

const GENEL: Record<Dil, string> = {
  tr: 'İşlem tamamlanamadı. Tekrar deneyebilirsin.',
  en: 'That did not go through. You can try again.',
};

export function islemHatasiMetni(islem: YazmaIslemi, dil: Dil = varsayilanDil): string {
  return METINLER[dil]?.[islem] ?? GENEL[dil] ?? GENEL[varsayilanDil];
}
