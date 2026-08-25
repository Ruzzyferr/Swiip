import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Çevrimdışı önbellek.
 *
 * "Uygulama çökmez" kuralının somut karşılığı: son program, hareket kütüphanesi ve
 * yarım kalan değerlendirme cevapları cihazda tutulur. Uçak modunda program açılır.
 *
 * Sağlık cevapları burada değil sunucuda; burada yalnızca kullanıcının kendi girdiği
 * taslak cevaplar ve okunabilir program tutulur.
 */

const ON_EK = 'swiip.onbellek.';

export const ANAHTARLAR = {
  program: 'program',
  hareketler: 'hareketler',
  degerlendirmeTaslagi: 'degerlendirme_taslagi',
  beslenmeHedefi: 'beslenme_hedefi',
  profilOzeti: 'profil_ozeti',
  bildirimTercihleri: 'bildirim_tercihleri',
  /** Alışveriş listesinde işaretlenen kalemler. Markette ekrandan çıkınca kaybolmasın. */
  alisverisIsaretleri: 'alisveris_isaretleri',
} as const;

export type OnbellekAnahtari = (typeof ANAHTARLAR)[keyof typeof ANAHTARLAR];

interface OnbellekKaydi<T> {
  veri: T;
  zaman: number;
}

export async function yaz<T>(anahtar: OnbellekAnahtari, veri: T): Promise<void> {
  const kayit: OnbellekKaydi<T> = { veri, zaman: Date.now() };
  await AsyncStorage.setItem(ON_EK + anahtar, JSON.stringify(kayit));
}

export async function oku<T>(anahtar: OnbellekAnahtari): Promise<T | null> {
  const ham = await AsyncStorage.getItem(ON_EK + anahtar);
  if (!ham) return null;

  try {
    const kayit = JSON.parse(ham) as OnbellekKaydi<T>;
    return kayit.veri;
  } catch {
    // Bozuk önbellek uygulamayı çökertmez; sessizce atılır.
    await AsyncStorage.removeItem(ON_EK + anahtar);
    return null;
  }
}

export async function okuYas(anahtar: OnbellekAnahtari): Promise<number | null> {
  const ham = await AsyncStorage.getItem(ON_EK + anahtar);
  if (!ham) return null;
  try {
    return (JSON.parse(ham) as OnbellekKaydi<unknown>).zaman;
  } catch {
    return null;
  }
}

export async function sil(anahtar: OnbellekAnahtari): Promise<void> {
  await AsyncStorage.removeItem(ON_EK + anahtar);
}

/** Çıkışta ve hesap silmede çağrılır: cihazda kişisel veri bırakılmaz. */
export async function tumunuTemizle(): Promise<void> {
  const anahtarlar = await AsyncStorage.getAllKeys();
  const bizimkiler = anahtarlar.filter((a) => a.startsWith(ON_EK));
  if (bizimkiler.length > 0) await AsyncStorage.multiRemove(bizimkiler);
}
