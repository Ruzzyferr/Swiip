-- Günlük su takibi.
--
-- YAZIO paritesinde kalan son eksik: kullanıcı yemeğini kaydediyor, kilosunu
-- kaydediyor ama içtiği suyu kaydedemiyordu.
--
-- Tablo günde TEK satır tutuyor (`user_id, gun` benzersiz) ve `ml` toplam. Her
-- bardağı ayrı satır yazmak da mümkündü ama bu ekranın tek sorusu "bugün ne kadar
-- içtim"; ayrı satırlar o soruyu her okumada bir toplama işine çeviriyor ve
-- karşılığında kimsenin sormadığı bir soruyu ("saat 14'te mi 15'te mi içtim")
-- cevaplıyordu.
--
-- `weight_logs` ile aynı desen: aynı benzersiz indeks, aynı upsert.
CREATE TABLE IF NOT EXISTS water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gun date NOT NULL,
  ml integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS water_user_gun_idx ON water_logs (user_id, gun);
