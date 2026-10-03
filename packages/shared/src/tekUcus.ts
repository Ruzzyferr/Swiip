/**
 * Aynı anda başlatılan çağrıları tek bir çalışmaya indirger.
 *
 * Token yenileme için yazıldı. Erişim tokeni dolduğunda ekrandaki birkaç istek aynı anda
 * 401 alıyor ve her biri yenilemeyi tetikliyordu. Yenileme tokeni **dönen** bir token:
 * ilk çağrı onu tüketip yenisini alıyor, sonrakiler artık geçersiz olan eskisiyle
 * gidiyor ve 401 alıyor.
 *
 * Asıl zarar oradan sonra geliyordu: başarısız olan çağrı "yenileme tutmadı" deyip
 * tokenları siliyor ve **başarılı çağrının az önce yazdığı yeni tokenı da götürüyordu.**
 * Kullanıcı hiçbir şey yapmadan oturumdan düşüyordu.
 *
 * Program sekmesi açılışta bir program + her hareket için bir gerekçe isteği atıyor;
 * yani bu yarış istisna değil, kural.
 */
export function tekUcus<T>(calisan: () => Promise<T>): () => Promise<T> {
  let ucus: Promise<T> | null = null;

  return () => {
    // Uçuş sürüyorsa yenisini başlatma; aynı sonucu bekle.
    if (ucus) return ucus;

    // `async` sarmalayıcı eşzamanlı fırlatmayı da reddedilmiş söze çeviriyor.
    // Temizlik `finally` içinde DEĞİL: çalışan eşzamanlı fırlattığında `finally`
    // atamadan önce koşuyor ve reddedilmiş söz `ucus`ta kalıcı olarak kalıyordu.
    const bu = (async () => calisan())();
    ucus = bu;
    const temizle = () => {
      // Bir sonraki çağrı yeni bir uçuş başlatabilsin.
      if (ucus === bu) ucus = null;
    };
    bu.then(temizle, temizle);

    return bu;
  };
}
