/**
 * Arama anahtarı — şapkasız yazan kullanıcıyı bulur.
 *
 * Türkiye'de telefon klavyesi Türkçe olsa bile insanlar acele ederken "yogurt", "kofte",
 * "corba" yazar. Ham `ILIKE '%yogurt%'` bu aramada **sıfır** sonuç döner; kullanıcı için
 * bu "veritabanında yok" ile aynı şeydir ve manuel kalori girişi ücretsiz planın
 * çekirdeği, yani uygulamanın günde en çok dokunulan yeri.
 *
 * Katlama iki adımlı ve **sırası önemli**: önce harf eşlemesi, sonra küçültme.
 * Ters sırada `'İ'.toLowerCase()` çoğu ortamda `i` + birleşen nokta (iki kod noktası)
 * üretir ve eşleme onu yakalayamaz.
 *
 * Aynı katlama SQL tarafında `lower(translate(...))` ile yapılıyor. İki uygulamanın
 * ayrışmaması `beslenme.test.ts` içinde tohumlanmış tablonun tamamı üzerinde sınanıyor —
 * sessizce ayrışan bir eşleşme kuralı, hiç olmayan kuraldan tehlikelidir.
 */

/** Katlanan harfler ve karşılıkları. SQL `translate()` çağrısıyla birebir aynı olmalı. */
export const KATLANAN = 'çğıİöşüâîûÇĞÖŞÜ';
export const KATLANMIS = 'cgiiosuaiuCGOSU';

export function aramaAnahtari(metin: string): string {
  let sonuc = '';

  for (const harf of metin) {
    const yer = KATLANAN.indexOf(harf);
    sonuc += yer >= 0 ? KATLANMIS[yer] : harf;
  }

  return sonuc.toLowerCase();
}
