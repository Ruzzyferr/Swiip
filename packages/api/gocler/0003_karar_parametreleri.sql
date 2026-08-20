-- Karar izine dilden bağımsız parametreler.
--
-- `explanation_tr` motorun ürettiği Türkçe cümle; kalıyor ve karar izinin kaydı o.
-- Yeni sütun cümleyi **kurmak** için gerekeni taşıyor (hareket adı, kas grubu, patern,
-- elenen hareket sayısı), böylece gerekçe kullanıcının dilinde kurulabiliyor.
--
-- Eklemeli ve varsayılanlı: eski satırlar boş nesneyle kalır ve Türkçe ize düşer.
alter table decisions
  add column if not exists parametreler_jsonb jsonb not null default '{}'::jsonb;
