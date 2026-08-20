-- Program uyarılarının dilden bağımsız karşılığı.
--
-- `uyarilar` motorun ürettiği Türkçe cümleler; kalıyor ve çeviremediğimiz yerde yedek o.
-- Yeni sütun cümleyi kurmak için gerekeni taşıyor (kod ve değerler), böylece uyarı
-- kullanıcının dilinde anlatılabiliyor.
--
-- Eklemeli ve varsayılanlı: eski programlar boş dizi ile kalır ve Türkçe metne düşer.
alter table programs
  add column if not exists uyari_kodlari_jsonb jsonb not null default '[]'::jsonb;
