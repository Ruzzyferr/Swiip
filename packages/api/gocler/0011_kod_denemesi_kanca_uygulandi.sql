-- İki küçük sütun, iki ayrı açık.
--
-- 1. `dogrulama_kodlari.deneme_sayisi`
--
--    Parola sıfırlama kodu altı hane (10^6) ve 15 dakika geçerli. Tek koruma IP başına
--    dakikalık istek sınırıydı; kodun kendisinin bir deneme sınırı yoktu. Dağıtık bir
--    saldırgan (farklı IP'ler) aynı kodu 15 dakika boyunca sınırsız deneyebiliyordu:
--    10^6 olasılık, birkaç yüz IP ile pencere içinde taranabilir. Kod beş yanlış
--    denemeden sonra kullanılmış sayılıyor; saldırgan yeni kod istemek zorunda ve her
--    kod için şansı 5 / 10^6.
--
-- 2. `kanca_olaylari.uygulandi`
--
--    Sıra koruması "bu kullanıcı için işlenmiş en yeni olaydan eski olan olay plan
--    yazamaz" diyordu — ama plan YAZMAYAN olaylar da (sıradan CANCELLATION,
--    BILLING_ISSUE, tanınmayan ürün) referans sayılıyordu. Teslimatı gecikmiş bir
--    RENEWAL, ondan sonra gelen bir CANCELLATION (otomatik yenilemeyi kapatma) yüzünden
--    "eski" sayılıp atılıyordu: `renews_at` uzamıyor, parasını ödemiş kullanıcının
--    hakkı 48 saatlik ek süreden sonra kapanıyordu. Artık yalnızca planı gerçekten
--    yazan olaylar sıra referansı.
--
--    Mevcut satırlar `true` ile işaretleniyor: hangilerinin plan yazdığını bilmiyoruz
--    ve muhafazakâr taraf, eskiden olduğu gibi hepsini referans saymak.
ALTER TABLE dogrulama_kodlari
  ADD COLUMN IF NOT EXISTS deneme_sayisi integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE kanca_olaylari
  ADD COLUMN IF NOT EXISTS uygulandi boolean NOT NULL DEFAULT false;
--> statement-breakpoint
UPDATE kanca_olaylari SET uygulandi = true;
