-- Yayın haberi listesi (marka sitesi).
--
-- Uygulama mağazada değilken sitedeki tek dönüşüm yolu. Bültene dönüşmüyor: tek bir
-- e-posta gönderilir, sonra kayıt silinir.
--
-- E-posta benzersiz: aynı adres iki kez eklenmez ve "zaten kayıtlısın" demek için
-- ayrı bir sorgu gerekmez. IP adresi tutulmuyor; gerekmiyor.
create table if not exists ilgi_kayitlari (
  id uuid primary key default gen_random_uuid(),
  eposta text not null unique,
  riza_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  bildirildi_at timestamptz
);
