import { Platform } from 'react-native';
import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';
import { istek } from '../veri/api';

/**
 * Mağaza içi satın alma katmanı (F6.1).
 *
 * RevenueCat SDK'sı bu arayüzün arkasına takılır. Uygulamanın geri kalanı `magaza`
 * nesnesini kullanır; SDK'nın varlığından haberi olmaz. Bunun üç sebebi var:
 *
 *  1. Expo Go'da ve testte SDK yok — uygulama yine de açılmalı ve paywall görünmeli.
 *  2. Satın alma DOĞRULAMASI istemcide yapılmaz. SDK satın almayı başlatır, hak
 *     sunucudaki web kancasıyla açılır. İstemciye "premium oldum" dedirtmek,
 *     kilidi kapının üstündeki nota yazmaktır.
 *  3. Sağlayıcı değişirse yalnızca bu dosya değişir.
 *
 * API anahtarı derleme zamanında `EXPO_PUBLIC_REVENUECAT_*` ile gelir. Anahtar yoksa
 * uygulama açılır ve paywall görünür, yalnızca satın alma kapalıdır — Expo Go ve
 * geliştirme akışı bozulmasın diye.
 */

export type PlanKodu = 'temel' | 'pro';
export type Donem = 'aylik' | 'yillik';

export interface UrunTanimi {
  kod: PlanKodu;
  donem: Donem;
  /** Mağazadaki ürün kimliği. RevenueCat panelinde de aynı olmalı. */
  urun_id: string;
  /** Mağazadan gelen yerelleştirilmiş fiyat; yoksa sunucudaki liste fiyatı gösterilir. */
  magaza_fiyati?: string;
}

export const URUNLER: UrunTanimi[] = [
  { kod: 'temel', donem: 'aylik', urun_id: 'swiip_temel_aylik' },
  { kod: 'temel', donem: 'yillik', urun_id: 'swiip_temel_yillik' },
  { kod: 'pro', donem: 'aylik', urun_id: 'swiip_pro_aylik' },
  { kod: 'pro', donem: 'yillik', urun_id: 'swiip_pro_yillik' },
];

export interface SatinAlmaSonucu {
  durum: 'basarili' | 'iptal' | 'hata' | 'sdk_yok';
  mesaj?: string;
}

interface MagazaSaglayicisi {
  hazirla(kullaniciId: string): Promise<void>;
  fiyatlariGetir(): Promise<Record<string, string>>;
  satinAl(urunId: string): Promise<SatinAlmaSonucu>;
  geriYukle(): Promise<SatinAlmaSonucu>;
}

/**
 * SDK yokken çalışan sağlayıcı.
 *
 * Satın alma denemesi sessizce başarısız olmaz — kullanıcıya durumu söyler.
 * Sahte bir "satın alındı" döndürmek, test ortamında gerçek gibi görünen ama
 * mağazada karşılığı olmayan bir hak açardı.
 */
const sdksizSaglayici: MagazaSaglayicisi = {
  async hazirla() {
    /* SDK yok; yapılacak bir şey de yok. */
  },
  async fiyatlariGetir() {
    return {};
  },
  async satinAl() {
    return {
      durum: 'sdk_yok',
      mesaj: 'Satın alma bu sürümde kullanılamıyor. Mağaza bağlantısı yayın sürümünde açılıyor.',
    };
  },
  async geriYukle() {
    return { durum: 'sdk_yok' };
  },
};

/**
 * RevenueCat sağlayıcısı.
 *
 * Satın alma başarılı dönse bile burada hak açılmaz. Tek yaptığımız sonucu bildirmek;
 * abonelik durumunu sunucu web kancasıyla öğrenir ve `/v1/abonelik/durum` onu söyler.
 */
const revenueCatSaglayicisi: MagazaSaglayicisi = {
  async hazirla(kullaniciId) {
    Purchases.configure({ apiKey: apiAnahtari()!, appUserID: kullaniciId });
  },

  async fiyatlariGetir() {
    const urunler = await Purchases.getProducts(URUNLER.map((u) => u.urun_id));
    return Object.fromEntries(urunler.map((u) => [u.identifier, u.priceString]));
  },

  async satinAl(urunId) {
    const [urun] = await Purchases.getProducts([urunId]);
    if (!urun) return { durum: 'hata', mesaj: 'Ürün mağazada bulunamadı.' };

    try {
      await Purchases.purchaseStoreProduct(urun);
      return { durum: 'basarili' };
    } catch (hata) {
      return satinAlmaHatasi(hata);
    }
  },

  async geriYukle() {
    try {
      const bilgi = await Purchases.restorePurchases();
      const aktifVar = Object.keys(bilgi.entitlements.active).length > 0;
      return aktifVar ? { durum: 'basarili' } : { durum: 'hata' };
    } catch (hata) {
      return satinAlmaHatasi(hata);
    }
  },
};

/**
 * SDK hatasını kullanıcıya gösterilecek duruma çevirir.
 *
 * "Vazgeçtim" bir hata değil: kullanıcı iptal ettiğinde kırmızı bir uyarı göstermek,
 * yapmadığı bir şey için onu suçlamak olur.
 */
function satinAlmaHatasi(hata: unknown): SatinAlmaSonucu {
  const kod = (hata as { code?: string })?.code;

  if (kod === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return { durum: 'iptal' };

  return {
    durum: 'hata',
    mesaj: (hata as { message?: string })?.message,
  };
}

/**
 * Platform başına ayrı anahtar; RevenueCat böyle çalışıyor.
 * Anahtar tanımlı değilse SDK'sız moda düşülür.
 */
function apiAnahtari(): string | undefined {
  const anahtar =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID;

  return anahtar && anahtar.length > 0 ? anahtar : undefined;
}

let saglayici: MagazaSaglayicisi = sdksizSaglayici;
let hazirlandi = false;

/** Anahtar varsa gerçek SDK, yoksa SDK'sız mod. Karar tek yerde. */
function saglayiciSec(): MagazaSaglayicisi {
  return apiAnahtari() ? revenueCatSaglayicisi : sdksizSaglayici;
}

export const magaza = {
  async hazirla(kullaniciId: string): Promise<void> {
    if (hazirlandi) return;
    saglayici = saglayiciSec();
    await saglayici.hazirla(kullaniciId);
    hazirlandi = true;
  },

  /** Mağazadan yerelleştirilmiş fiyatlar. Boşsa arayüz sunucudaki liste fiyatını gösterir. */
  async fiyatlar(): Promise<Record<string, string>> {
    return saglayici.fiyatlariGetir().catch(() => ({}));
  },

  /**
   * Plan ve döneme karşılık gelen mağaza ürün kimliği.
   *
   * Eşleme tek yerde durur: arayüz `URUNLER` dizisini tarayıp kendi kimliğini kurarsa
   * ürün kimlikleri değiştiğinde iki yer birden güncellenmeyi bekler.
   */
  urunKimligi(kod: PlanKodu, donem: Donem): string | undefined {
    return URUNLER.find((u) => u.kod === kod && u.donem === donem)?.urun_id;
  },

  /**
   * Satın alma akışı.
   *
   * Başarılı olsa bile hak İSTEMCİDE açılmaz: sunucu web kancayla doğrular.
   * Burada yaptığımız tek şey, kullanıcı beklemesin diye durumu tazelemek.
   */
  async satinAl(kod: PlanKodu, donem: Donem): Promise<SatinAlmaSonucu> {
    const urun = URUNLER.find((u) => u.kod === kod && u.donem === donem);
    if (!urun) return { durum: 'hata', mesaj: 'Ürün bulunamadı.' };

    const sonuc = await saglayici.satinAl(urun.urun_id);

    if (sonuc.durum === 'basarili') {
      // Sunucu web kancadan zaten haberdar olacak; bu yalnızca hızlı tazeleme.
      await istek('/v1/abonelik/durum').catch(() => null);
    }

    return sonuc;
  },

  /** "Satın almalarımı geri yükle" — mağaza politikası gereği zorunlu. */
  async geriYukle(): Promise<SatinAlmaSonucu> {
    const sonuc = await saglayici.geriYukle();
    if (sonuc.durum === 'basarili') await istek('/v1/abonelik/durum').catch(() => null);
    return sonuc;
  },

  /**
   * İptal, uygulama içinden değil mağaza üzerinden yapılır — iki mağazanın da kuralı bu.
   * Ayarlardaki "iptal et" düğmesi kullanıcıyı doğrudan buraya götürür; ekstra adım koymayız.
   */
  iptalBaglantisi(platform: 'ios' | 'android'): string {
    return platform === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
  },
};
