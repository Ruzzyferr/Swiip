-- Mağaza kancası: tekrar oynatma ve sıra koruması.
--
-- `/v1/abonelik/kanca` hakkı açan tek yol ve tek yazar. Ama olay kimliği hiçbir yerde
-- saklanmıyordu, yani aynı gövde kaç kez gelirse o kadar kez uygulanıyordu. İki gerçek
-- sonuç vardı:
--
--  1. RevenueCat 2xx almadığı teslimatı saatlerce yeniden dener ve olaylar sırayla
--     gelmez. Gecikmiş bir RENEWAL, zaten işlenmiş bir EXPIRATION'ın üstüne yazıp
--     süresi dolmuş aboneye Pro'yu geri veriyordu.
--  2. Paylaşılan sırrı ele geçiren biri (log, vekil, hata raporu) tek bir gövdeyi
--     tekrar tekrar göndererek istediği hesaba hak açabiliyordu.
--
-- `event_id` birincil anahtar: `on conflict do nothing` gelen kopyayı sessizce yutar ve
-- 200 döner — RevenueCat'in kuyruğu tıkanmasın diye. `olay_at` sıra kontrolü için.
create table if not exists kanca_olaylari (
  event_id text primary key,
  tip text not null,
  app_user_id text,
  olay_at timestamptz,
  islendi_at timestamptz not null default now()
);

-- Eski kayıtların temizliği için: hangi olaylar ne zaman işlendi.
create index if not exists kanca_olaylari_islendi_idx on kanca_olaylari (islendi_at);
