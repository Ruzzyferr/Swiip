import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { istek } from '../veri/api';
import { useOturum } from '../durum/Oturum';

/**
 * "Bu kullanıcıya reklam gösterilir mi" sorusunun TEK kaynağı.
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
 */

interface ReklamHakki {
  /** Reklam gösterilecek mi. Cevap gelene kadar `false`. */
  goster: boolean;
  /** Sunucudan cevap geldi mi — ekranlar yer ayırmak için kullanabilir. */
  bilindi: boolean;
  yenile: () => Promise<void>;
}

const Baglam = createContext<ReklamHakki | null>(null);

interface AbonelikYaniti {
  haklar?: { reklam?: boolean };
}

export function ReklamSaglayici({ children }: { children: ReactNode }) {
  const { kullanici } = useOturum();
  const [goster, setGoster] = useState(false);
  const [bilindi, setBilindi] = useState(false);

  /** Aynı anda birden çok ekran mount olduğunda tek istek gitsin. */
  const ucus = useRef<Promise<void> | null>(null);

  const yenile = useCallback(async () => {
    if (!kullanici) {
      setGoster(false);
      setBilindi(false);
      return;
    }
    if (ucus.current) return ucus.current;

    ucus.current = (async () => {
      try {
        const yanit = await istek<AbonelikYaniti>('/v1/abonelik/durum');
        setGoster(yanit.haklar?.reklam === true);
        setBilindi(true);
      } catch {
        /*
         * Hata durumunda REKLAM YOK ve `bilindi` false kalıyor.
         *
         * `setGoster(false)` yerine "son bilinen değeri koru" da yazılabilirdi ama
         * o, planı biten kullanıcıyı değil ödeyen kullanıcıyı riske atar: uygulama
         * açıkken abonelik başlarsa (satın alma sonrası) eski değer `true` olur ve
         * yeni ödeyen kullanıcı bir süre daha reklam görür.
         */
        setGoster(false);
      } finally {
        ucus.current = null;
      }
    })();
    return ucus.current;
  }, [kullanici]);

  useEffect(() => {
    void yenile();
  }, [yenile]);

  return <Baglam.Provider value={{ goster, bilindi, yenile }}>{children}</Baglam.Provider>;
}

export function useReklamHakki(): ReklamHakki {
  const deger = useContext(Baglam);
  if (!deger) throw new Error('useReklamHakki, ReklamSaglayici içinde kullanılmalı.');
  return deger;
}
