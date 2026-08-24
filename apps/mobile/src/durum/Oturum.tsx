import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { dilCozumle, metinleriAl, type Dil, type Metinler } from '@swiip/shared';
import {
  agDiliniAyarla,
  ApiHatasi,
  istek,
  oturumDustugundeCalistir,
  oturumVar,
  tokenlariKaydet,
  tokenlariSil,
} from '../veri/api';
import { router } from 'expo-router';
import { tumunuTemizle } from '../veri/onbellek';
import { disaAktarmaArtiklariniSil } from '../veri/disaAktar';
import { magaza } from '../odeme/magaza';
import { bildirimleriKapat } from '../bildirim/zamanlayici';

/**
 * Oturum durumu. Uygulamanın tek küresel durumu budur; gerisi ekranların kendi içinde.
 * Küçük bir uygulamada durum yöneticisi kurmak, çözdüğünden fazla sorun yaratır.
 */

export interface Kullanici {
  id: string;
  email: string;
  locale: string;
  ed_mode: boolean;
  ed_sayilar_acik: boolean;
  medical_gate_status: string;
  consent_photo: string | null;
  email_dogrulandi_at: string | null;
}

interface OturumDurumu {
  kullanici: Kullanici | null;
  hazir: boolean;
  girisYap: (email: string, parola: string) => Promise<void>;
  kayitOl: (girdi: KayitGirdisi) => Promise<void>;
  cikisYap: () => Promise<void>;
  yenile: () => Promise<void>;
}

export interface KayitGirdisi {
  email: string;
  parola: string;
  saglik_onayi: boolean;
  olcum_onayi?: boolean;
}

interface OturumCevabi {
  erisim_token: string;
  yenileme_token: string;
}

const Baglam = createContext<OturumDurumu | null>(null);

export function OturumSaglayici({ children }: { children: ReactNode }) {
  const [kullanici, setKullanici] = useState<Kullanici | null>(null);
  const [hazir, setHazir] = useState(false);

  const yenile = useCallback(async () => {
    if (!(await oturumVar())) {
      setKullanici(null);
      agDiliniAyarla(null);
      return;
    }
    let kayit: Kullanici;
    try {
      kayit = await istek<Kullanici>('/v1/kimlik/ben');
    } catch (hata) {
      /**
       * Ağ hatası oturumu DÜŞÜRMEZ.
       *
       * Buradaki `catch` her hatayı `setKullanici(null)` yapıyordu; yani uçakta ya da
       * metroda uygulamayı açan, tokenı tamamen geçerli bir kullanıcı karşılama
       * ekranına düşüyordu. `api.ts` tam da bu durum için "İnternet yok. Son programın
       * cihazında kayıtlı, açabilirsin." diyor — ama o ekrana ulaşmanın yolu yoktu.
       *
       * Yalnızca sunucunun "bu oturum geçersiz" dediği durumda çıkış yapılır.
       */
      const baglantiSorunu = hata instanceof ApiHatasi && hata.durum === 0;
      if (!baglantiSorunu) {
        setKullanici(null);
        agDiliniAyarla(null);
      }
      return;
    }

    setKullanici(kayit);
    // Ağ katmanı bir bileşen değil; dili kancayla okuyamıyor. Hata metinleri de
    // kullanıcının dilinde çıksın diye burada bildiriliyor.
    agDiliniAyarla(kayit.locale);

    /**
     * Mağaza hazırlığı oturumun DIŞINDA.
     *
     * Aynı `try` içindeyken `Purchases.configure` bir nedenle patladığında (bozuk
     * anahtar, yerel modül sorunu) `/ben` başarılı olmasına rağmen kullanıcı çıkış
     * yapmış sayılıyordu. Satın alma katmanının arızası oturumu düşürmemeli.
     */
    await magaza.hazirla(kayit.id).catch(() => null);
  }, []);

  useEffect(() => {
    void (async () => {
      await yenile();
      setHazir(true);
    })();
  }, [yenile]);

  const girisYap = useCallback(
    async (email: string, parola: string) => {
      const cevap = await istek<OturumCevabi>('/v1/kimlik/giris', {
        yontem: 'POST',
        govde: { email, parola },
        yetkisiz: true,
      });
      await tokenlariKaydet(cevap.erisim_token, cevap.yenileme_token);
      await yenile();
    },
    [yenile],
  );

  const kayitOl = useCallback(
    async (girdi: KayitGirdisi) => {
      const cevap = await istek<OturumCevabi>('/v1/kimlik/kayit', {
        yontem: 'POST',
        govde: girdi,
        yetkisiz: true,
      });
      await tokenlariKaydet(cevap.erisim_token, cevap.yenileme_token);
      await yenile();
    },
    [yenile],
  );

  const cikisYap = useCallback(async () => {
    await tokenlariSil();
    // Cihazda kişisel veri bırakılmaz.
    await tumunuTemizle();
    // Dışa aktarma dosyası önbellekte duruyor ve içinde sağlık verisi var; depo
    // temizliği onu kapsamıyor çünkü ayrı bir klasörde.
    await disaAktarmaArtiklariniSil();
    // Bir sonraki kullanıcıya öncekinin antrenman hatırlatmaları gitmesin.
    await bildirimleriKapat();

    /**
     * Mağaza kimliği de bırakılır.
     *
     * Bırakılmazsa RevenueCat SDK'sı hâlâ ÖNCEKİ kullanıcının `appUserID`'siyle
     * yapılandırılmış kalıyordu (`magaza.hazirla` içindeki `if (hazirlandi) return`
     * hiç sıfırlanmıyordu). Aynı telefonda A çıkıp B girdiğinde B'nin satın alması
     * kancaya `app_user_id = A` olarak düşüyordu: **A Pro oluyor, parayı B ödüyor.**
     */
    await magaza.oturumuBirak();

    setKullanici(null);
  }, []);

  /**
   * Oturum kesin düştüğünde karşılama ekranına dönüyoruz.
   *
   * Yenileme tokeni de geçersizse kullanıcı artık oturumda değil; her ekranda genel hata
   * göstermek onu neden hiçbir şeyin çalışmadığını bilmeden bırakır.
   */
  useEffect(() => {
    oturumDustugundeCalistir(() => {
      setKullanici(null);
      router.replace('/');
    });
    return () => oturumDustugundeCalistir(null);
  }, []);

  const deger = useMemo<OturumDurumu>(
    () => ({ kullanici, hazir, girisYap, kayitOl, cikisYap, yenile }),
    [kullanici, hazir, girisYap, kayitOl, cikisYap, yenile],
  );

  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>;
}

export function useOturum(): OturumDurumu {
  const deger = useContext(Baglam);
  if (!deger) throw new Error('useOturum, OturumSaglayici içinde kullanılmalı.');
  return deger;
}

/** ED modunda sayılar gizli mi — arayüzün her yerinde bu tek kaynaktan okunur. */
export function useSayilarGizli(): boolean {
  const { kullanici } = useOturum();
  return (kullanici?.ed_mode ?? false) && !(kullanici?.ed_sayilar_acik ?? false);
}

/**
 * Arayüz dili kullanıcının `locale` alanından gelir; oturum açılmamışsa varsayılan Türkçe.
 *
 * Cihaz dilini otomatik almıyoruz: Türkiye'de İngilizce telefon kullanan çok kişi var ve
 * uygulamanın Türkçe içeriğini görmek istiyorlar. Dil, kullanıcının açık tercihidir.
 */
export function useDil(): Dil {
  const { kullanici } = useOturum();
  return dilCozumle(kullanici?.locale);
}

export function useMetinler(): Metinler {
  return metinleriAl(useDil());
}
