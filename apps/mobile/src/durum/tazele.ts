import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Ekranlar ne zaman verisini YENİDEN okur.
 *
 * Sekmeler verisini yalnızca mount anında okuyordu ve bir sekme bir kez mount olduktan
 * sonra açık kalıyor. Sonucu ölçülmüş üç kusur:
 *
 *  - Fotoğraftan ya da barkoddan onaylanan öğün Beslenme'ye dönüldüğünde GÖRÜNMÜYORDU;
 *    kullanıcı kaydın düştüğünü sanıp ikinci kez giriyordu.
 *  - Seans geri bildirimi verilip Program'a dönülünce eski program duruyordu.
 *  - Satın alan kullanıcı Ayarlar'da hâlâ "Planlara bak" görüyordu — ödeyene upsell.
 *
 * İki tetik var:
 *
 *  1. **Odak.** Ekran yeniden öne geldiğinde (bağlanmadan hemen sonraki odak hariç —
 *     o an mount zaten okuyor; ikinci okuma aynı isteği iki kez atmak olurdu).
 *  2. **Hak değişimi.** Satın alma sunucuya web kancasıyla birkaç saniye geç ulaşıyor.
 *     Kullanıcı o arada sekmeye dönmüş olabilir — odak tetiği çoktan geçmiştir.
 *     Sunucu yeni planı söylediği anda açık olan her ekran yeniden okur.
 *
 * Yeniden okuma SESSİZ olmalı: çağıran `yukle`, eldeki veriyi yükleniyor göstergesiyle
 * değiştirmemeli. Her sekme geçişinde yanıp sönen bir ekran, bayat bir ekrandan kötüdür.
 */

type Dinleyici = () => void;
const dinleyiciler = new Set<Dinleyici>();

/** Plan / haklar değişti: açık ekranlar yeniden okusun. */
export function haklarDegisti(): void {
  for (const d of dinleyiciler) d();
}

export function useOdaktaTazele(yukle: () => unknown): void {
  const son = useRef(yukle);
  son.current = yukle;
  const baglanmaAni = useRef(Date.now());

  useFocusEffect(
    useCallback(() => {
      /*
        Bağlanmadan HEMEN sonraki odak atlanıyor (mount zaten okuyor). "İlk odak" diye
        atlanmıyor: başka bir ekranın altında bağlanan ekran ilk odağını o ekrandan
        dönüşte alıyor — tam tazelenmesi gereken an. Ödeme ekranını kapatıp Ayarlar'a
        dönen kullanıcı eski planı görüyordu.
      */
      if (Date.now() - baglanmaAni.current < 1000) return;
      void son.current();
    }, []),
  );

  useEffect(() => {
    const d = () => void son.current();
    dinleyiciler.add(d);
    return () => {
      dinleyiciler.delete(d);
    };
  }, []);
}
