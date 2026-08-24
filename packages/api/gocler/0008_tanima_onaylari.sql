-- Tanıma düzeltmesi artık FARKLI KULLANICI sayıyor.
--
-- `tanima_eslemeleri.onay_sayisi` her `/tani/onayla` çağrısında bir artıyordu ve
-- `eslemeleriUygula` `onay >= 2` olan eşlemeyi TÜM kullanıcılar için bağlayıcı
-- sayıyordu. Kodun kendi yorumu "iki kullanıcı aynı düzeltmeyi yaptıysa" diyor —
-- ama kod kullanıcı saymıyordu, çağrı sayıyordu.
--
-- Sonuç: tek bir ücretsiz hesap, aynı isteği iki kez göndererek "pilav" kelimesini
-- istediği besine bağlayabiliyordu. Bir sağlık ürününde bu, herkesin kalori ve
-- makro değerlerini bozmak demek. Ucun plan kapısı da yok, yani maliyeti sıfır.
--
-- Bu tablo (user_id, locale, taninan_ad, food_id) çiftini benzersiz tutuyor; aynı
-- kullanıcının tekrarı sayıyı artırmıyor.
create table if not exists tanima_onaylari (
  user_id uuid not null references users(id) on delete cascade,
  locale text not null default 'tr-TR',
  taninan_ad text not null,
  food_id uuid not null references foods(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, locale, taninan_ad, food_id)
);

create index if not exists tanima_onaylari_esleme_idx
  on tanima_onaylari (locale, taninan_ad, food_id);
