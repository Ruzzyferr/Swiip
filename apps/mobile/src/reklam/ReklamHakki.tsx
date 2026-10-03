import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import { istek } from '../veri/api';
import { ANAHTARLAR, oku, yaz } from '../veri/onbellek';
import { useOturum } from '../durum/Oturum';
import { haklarDegisti } from '../durum/tazele';

/**
 * "Bu kullanıcıya reklam gösterilir mi" sorusunun TEK kaynağı — ve aboneliğin.
 *
 * Cevap SUNUCUDAN geliyor (`GET /v1/abonelik/durum` → `haklar.reklam`). İstemcinin
 * kendi elindeki plan bilgisinden türetilmiyor: türetilseydi istemciyi kandıran
 * herkes reklamsız olurdu ve abonelik satın almanın somut karşılıklarından biri
 * kağıt üstünde kalırdı.
 *
 * **Bilinmiyorsa reklam GÖSTERİLMEZ.** Varsayılan `false` ve bu bilinçli:
 *
 *   `docs/rakip-analizi.md`, EatBetter, 1★ / 8 beğeni —
 *   "3 aylık programı satın aldım ama öğün kaydetmek istediğimde kaydet tuşuna
 *    basıyorum, kaydetmek yerine reklam çıkıyor."
 *
 * Ödeyen bir kullanıcıya yükleme sırasında BİR KEZ reklam göstermek tam olarak bu
 * yorumu yazdıran deneyim. Ağ yavaşken hata yönü ücretsiz kullanıcıya reklam
 * göstermemek olsun — ödeyene göstermekten ucuz.
 *
 * **Abonelik durumunun tamamı da burada.** Ayarlar (iptal düğmesi, kota), koç ve öğün
 * planı aynı ucu ayrı ayrı okuyordu ve satın almadan sonra hiçbiri yeniden okumuyordu:
 * yeni ödeyen kullanıcı Ayarlar'da hâlâ "Planlara bak" görüyordu. Tek kaynak, tek tazeleme.
 */

export interface AbonelikDurumu {
  plan: string;
  haklar: { reklam?: boolean; aylik_fiyat_try?: number };
  kota: {
    yenilenme: string;
    yemek_tanima: { kullanilan: number; toplam: number; kalan: number };
    koc_sohbeti: { kullanilan: number; toplam: number; kalan: number };
    adalet_notu: string;
  };
  promosyon_goster: boolean;
}

interface ReklamHakki {
  /** Reklam gösterilecek mi. Cevap gelene kadar `false`. */
  goster: boolean;
  /** Sunucudan BU OTURUMDA cevap geldi mi. */
  bilindi: boolean;
  /**
   * Cevap gelmeden önce banner'ın YERİ ayrılsın mı.
   *
   * Sunucunun bu kullanıcı için verdiği SON kararı cihazda tutuyoruz. Son karar "reklam
   * var" idiyse yer baştan ayrılır ve cevap geldiğinde hiçbir şey kaymaz. Reklamın
   * kendisi yine yalnızca `bilindi && goster` iken yüklenir — boş şerit reklam değildir,
   * "bilinmiyorsa reklam yok" kuralı bozulmuyor.
   */
  yerAyir: boolean;
  /** Son bilinen abonelik durumu (önbellekten ya da sunucudan). */
  durum: AbonelikDurumu | null;
  /** Son okuma hata verdi mi — ekran durumu bilmediğini SÖYLESİN diye. */
  okunamadi: boolean;
  yenile: () => Promise<void>;
  /**
   * Mağaza satın almayı ya da geri yüklemeyi ONAYLADI.
   *
   * Hak sunucuda web kancasıyla açılıyor ve kanca birkaç saniye geç geliyor: o arada
   * `/durum` hâlâ "ücretsiz" diyor. Reklam BURADA hemen kapanıyor (yalnızca kapatma
   * yönünde istemciye güveniyoruz — istemcinin açabileceği bir hak yok) ve sunucu
   * yeni planı söyleyene kadar durum aralıklarla yeniden okunuyor.
   */
  odemeOnaylandi: () => void;
}

const Baglam = createContext<ReklamHakki | null>(null);

/** Ödeme onayından sonra sunucunun kancayı işlemesi için tanınan süre. */
const ODEME_KORUMASI_MS = 24 * 60 * 60 * 1000;
/** Ödeme sonrası yoklama aralıkları (ms). Toplam ~1 dakika. */
const YOKLAMA_ARALIKLARI = [1500, 3000, 5000, 8000, 13000, 21000];

interface Onbellek {
  kimlik: string;
  durum: AbonelikDurumu;
}

export function ReklamSaglayici({ children }: { children: ReactNode }) {
  const { kullanici } = useOturum();
  const [goster, setGoster] = useState(false);
  const [bilindi, setBilindi] = useState(false);
  const [durum, setDurum] = useState<AbonelikDurumu | null>(null);
  const [okunamadi, setOkunamadi] = useState(false);

  /**
   * Aynı anda birden çok ekran mount olduğunda tek istek gitsin.
   *
   * Uçuş KULLANICIYA bağlı. Yalnızca "bir istek var mı" diye bakılınca, çıkış yapıp
   * başka bir hesapla giren kullanıcı ÖNCEKİNİN uçuşunu alıyordu: ücretsiz A'nın
   * cevabı ödeyen B'ye yazılıyor ve B reklam görüyordu.
   */
  const ucus = useRef<{ kimlik: string; soz: Promise<AbonelikDurumu | null> } | null>(null);
  /** Cevap geldiğinde hâlâ aynı kullanıcı mı — değilse sonuç çöpe. */
  const aktifKimlik = useRef<string | null>(null);
  aktifKimlik.current = kullanici?.id ?? null;
  /** Mağazanın satın almayı onayladığı an; sunucu henüz bilmiyor olabilir. */
  const odemeAni = useRef<number | null>(null);

  // Kullanıcı değişince önceki kullanıcının durumu ekranda bir an bile kalmasın.
  useEffect(() => {
    setGoster(false);
    setBilindi(false);
    setDurum(null);
    setOkunamadi(false);
    odemeAni.current = null;
    const kimlik = kullanici?.id;
    if (!kimlik) return;
    void oku<Onbellek>(ANAHTARLAR.abonelikDurumu).then((kayit) => {
      // Önbellek yalnızca yer ayırmak ve ilk çizim için; reklam kararı değil.
      if (kayit && kayit.kimlik === kimlik && aktifKimlik.current === kimlik) {
        setDurum((d) => d ?? kayit.durum);
      }
    });
  }, [kullanici?.id]);

  const sunucudanOku = useCallback(async (): Promise<AbonelikDurumu | null> => {
    if (!kullanici) {
      setGoster(false);
      setBilindi(false);
      return null;
    }
    const kimlik = kullanici.id;
    if (ucus.current?.kimlik === kimlik) return ucus.current.soz;

    const soz = (async () => {
      try {
        const yanit = await istek<AbonelikDurumu>('/v1/abonelik/durum');
        if (aktifKimlik.current !== kimlik) return null;
        const odemeYeni =
          odemeAni.current !== null && Date.now() - odemeAni.current < ODEME_KORUMASI_MS;
        // Ödeme onaylıyken sunucu henüz "ücretsiz" diyorsa: reklam kapalı kalır.
        setGoster(yanit.haklar?.reklam === true && !odemeYeni);
        setBilindi(true);
        setDurum(yanit);
        setOkunamadi(false);
        void yaz<Onbellek>(ANAHTARLAR.abonelikDurumu, { kimlik, durum: yanit });
        return yanit;
      } catch {
        /*
         * Hata durumunda REKLAM YOK ve `bilindi` false kalıyor.
         *
         * `setGoster(false)` yerine "son bilinen değeri koru" da yazılabilirdi ama
         * o, planı biten kullanıcıyı değil ödeyen kullanıcıyı riske atar: uygulama
         * açıkken abonelik başlarsa (satın alma sonrası) eski değer `true` olur ve
         * yeni ödeyen kullanıcı bir süre daha reklam görür.
         */
        if (aktifKimlik.current === kimlik) {
          setGoster(false);
          setOkunamadi(true);
        }
        return null;
      } finally {
        // Aynı kullanıcı için ikinci uçuş bu bitmeden açılamıyor; kimlik yeter.
        if (ucus.current?.kimlik === kimlik) ucus.current = null;
      }
    })();
    ucus.current = { kimlik, soz };
    return soz;
  }, [kullanici]);

  const yenile = useCallback(async () => {
    await sunucudanOku();
  }, [sunucudanOku]);

  useEffect(() => {
    void yenile();
  }, [yenile]);

  /*
    Ön plana dönüşte yeniden sor. Abonelik uygulama dışında değişebiliyor (mağazadan
    iptal, başka cihazdan satın alma, yenilemenin düşmesi); uygulama günlerce açık
    kalabiliyor.
  */
  useEffect(() => {
    const abonelik = AppState.addEventListener('change', (d) => {
      if (d === 'active') void yenile();
    });
    return () => abonelik.remove();
  }, [yenile]);

  const yoklama = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (yoklama.current) clearTimeout(yoklama.current);
    },
    [],
  );

  const odemeOnaylandi = useCallback(() => {
    odemeAni.current = Date.now();
    setGoster(false);
    if (yoklama.current) clearTimeout(yoklama.current);

    const kimlik = aktifKimlik.current;
    const adim = (i: number) => {
      yoklama.current = setTimeout(() => {
        void sunucudanOku().then((yanit) => {
          if (aktifKimlik.current !== kimlik) return;
          if (yanit && yanit.plan !== 'ucretsiz') {
            // Sunucu yeni planı biliyor: açık ekranlar kotayı, kilitleri, iptali tazelesin.
            haklarDegisti();
            return;
          }
          if (i + 1 < YOKLAMA_ARALIKLARI.length) adim(i + 1);
        });
      }, YOKLAMA_ARALIKLARI[i]);
    };
    adim(0);
  }, [sunucudanOku]);

  const yerAyir = goster || (!bilindi && durum?.haklar?.reklam === true);

  return (
    <Baglam.Provider value={{ goster, bilindi, yerAyir, durum, okunamadi, yenile, odemeOnaylandi }}>
      {children}
    </Baglam.Provider>
  );
}

export function useReklamHakki(): ReklamHakki {
  const deger = useContext(Baglam);
  if (!deger) throw new Error('useReklamHakki, ReklamSaglayici içinde kullanılmalı.');
  return deger;
}

/** Abonelik durumu — reklam kararıyla aynı kaynak. */
export function useAbonelik(): Pick<ReklamHakki, 'durum' | 'okunamadi' | 'yenile'> {
  const { durum, okunamadi, yenile } = useReklamHakki();
  return { durum, okunamadi, yenile };
}
