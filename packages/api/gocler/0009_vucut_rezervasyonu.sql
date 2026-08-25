-- Vücut analizi hakkı için defter düzeyinde rezervasyon.
--
-- Kontrol ile kayıt arasında görsel AI çağrısı var ve saniyeler sürüyor. O aralıkta
-- gelen ikinci istek de kontrolü geçiyordu: ücretsiz kullanıcı çift dokunuşla ömür
-- boyu bir olan hakkını İKİ analize çeviriyor ve iki görsel çağrısının parası
-- gidiyordu.
--
-- `quotas` bu kuralı taşıyamıyor: satır `YYYY-MM` ile anahtarlı, oysa ay ortasında
-- ödemeye geçen kullanıcının penceresi abonelik anında başlıyor. Bu yüzden rezervasyon
-- defterin kendisine yazılıyor — satır AI çağrısından ÖNCE açılıyor, sonra
-- tamamlanıyor; hata olursa siliniyor.
ALTER TABLE body_analyses
  ADD COLUMN IF NOT EXISTS tamamlandi boolean NOT NULL DEFAULT true;

-- Rezervasyonlar (`tamamlandi = false`) sayıma girer ama rapor okumalarına girmez.
-- Kısmi dizin: okuma yolları yalnızca tamamlanmış kayıtları tarasın.
CREATE INDEX IF NOT EXISTS body_user_tamam_idx
  ON body_analyses (user_id, taken_at DESC)
  WHERE tamamlandi;
