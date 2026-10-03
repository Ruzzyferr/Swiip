-- 2026-10-03 güvenlik turunun iki göçü.
--
-- 1. `users.token_surumu`
--
--    Erişim tokenı 15 dakika yaşıyor ve imzalı olduğu için sunucu onu geri alamıyordu:
--    parola sıfırlansa, çıkış yapılsa ya da çalınmış bir yenileme tokenı yakalansa bile
--    eldeki erişim tokenı ömrünü dolduruyordu. Token artık hesabın oturum sürümünü
--    taşıyor (`tv`); kimlik katmanı her istekte karşılaştırıyor. Sürüm artınca o
--    hesabın bütün erişim tokenları ANINDA geçersiz.
--
-- 2. `kayit_kodlari`
--
--    Kayıt ucu "bu e-posta ile bir hesap zaten var" (409) diyordu: herkes bir adresin
--    Swiip'te kayıtlı olup olmadığını öğrenebiliyordu — bir sağlık uygulamasında
--    kendi başına hassas bir bilgi. Kayıt artık önce e-postaya kod gönderiyor ve yanıt
--    adres kayıtlı olsa da olmasa da AYNI. Kod hesaptan önce var olduğu için kullanıcıya
--    değil e-postaya bağlı.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_surumu integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS kayit_kodlari (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  kod_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  kullanildi_at timestamp with time zone,
  deneme_sayisi integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS kayit_kodlari_email_idx ON kayit_kodlari (lower(email), created_at);
