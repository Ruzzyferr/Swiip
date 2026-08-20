# Made2Fit

**Ölçüne göre.** Programın neden o program olduğunu da söyleriz.

Kullanıcının 134 soruya verdiği cevapları ve vücut fotoğrafını, **gerekçesi görünür** bir
antrenman ve beslenme programına çeviren koç.

Ürün kararlarının tamamı ve dayanakları: [`docs/spec.md`](docs/spec.md) ·
[`docs/uygulama-plani.md`](docs/uygulama-plani.md) · [`docs/rakip-analizi.md`](docs/rakip-analizi.md)

---

## Depo düzeni

```
packages/shared    Alan modeli, tasarım tokenleri, Türkçe metinler, derlenmiş veri
packages/core      Deterministik motor — saf fonksiyon, ağ yok, dosya yok, zaman okuma yok
packages/api       Node + Fastify + Postgres (Drizzle)
apps/mobile        React Native + Expo (expo-router)

data/kaynak/       Hareket ve soru verisinin okunabilir kaynağı
data/*.json        Derlenmiş veri artefaktı
scripts/           Veri derleyicileri, yedekleme ve geri yükleme testi
infra/             Docker Compose, Caddy, üretim Dockerfile
```

### Neden motor ayrı bir paket

`packages/core` içinde **ağ çağrısı, dosya erişimi ve `Date.now()` yok**. Zamana bağlı her
hesap referans tarihini dışarıdan alır. Bunun iki sonucu var:

1. Aynı profil her zaman aynı programı üretir — determinizm test edilebilir bir özellik.
2. Motor hem sunucuda hem telefonda çalışır; istemci çevrimdışıyken de doğru soruyu sorar.

---

## Kurulum

```bash
npm install
npm run verify        # biçim + lint + tip + test
```

`verify` yeşilse ortam hazır.

### Veri derleyicileri

Hareket ve soru verisi elle düzenlenmez; kaynağı derlenir ve doğrulanır:

```bash
node scripts/hareketleri-derle.mjs   # data/kaynak/hareketler/*.mjs → JSON + TS modülü
node scripts/sorulari-derle.mjs      # data/sorular.json doğrula → TS modülü
```

Derleyiciler kırık muadil zinciri, bilinmeyen ekipman kodu, sürücüsüz soru ve hiçbir
dallanmanın açmadığı koşullu soru gibi hataları CI'da yakalar.

### API

```bash
cp infra/.env.example infra/.env     # sırları doldur
npm run db:migrate
npm run db:seed
npm run api:dev
```

Testler PGlite ile bellek içinde gerçek Postgres çalıştırır; Docker gerektirmez.

### Mobil

```bash
npm run mobile:start
```

---

## Üretim

```bash
cd infra && docker compose up -d
```

Postgres dışarı açılmaz, TLS'i Caddy otomatik alır, yedekleyici her gece `pg_dump` alır.

### Yedekten geri yükleme testi

Geri yüklemesi denenmemiş yedek, yedek değildir. **Kullanıcı verisi kabul etmeden önce
bir kez çalıştırılmalı**, sonra ayda bir:

```bash
scripts/yedek-geri-yukleme-testi.sh
```

Betik izole bir Postgres kabı açar, yedeği geri yükler, tabloları ve yabancı anahtarları
doğrular, kabı siler. Canlı veritabanına yazmaz.

---

## Mimarinin sert kuralları

Bunlar tercih değil, kodda zorlanan kısıtlar:

| Kural | Nerede zorlanıyor |
|---|---|
| Hesap formülle, dil AI ile | `packages/core` — tüm hesap; AI yalnızca `ai/gecit.ts` |
| AI karar veremez | `sayilariDogrula()` — kaynakta olmayan sayı üreten çıktı reddedilir |
| Fotoğraf saklanmaz | `body_analyses` tablosunda foto alanı yok; şema testi bunu doğrular |
| Salonda kayıt yok | `session_items` tablosunda set bazlı gerçekleşme alanı yok |
| Dört güvenlik kapısı atlanamaz | `kapilar.ts` + her cevap kaydında yeniden değerlendirme |
| Aynı yemek aynı makro | Toplam = miktar × bileşim; tek hesap yolu `besinHesapla()` |
| Ödeyene upsell yok | `promosyon_goster` yalnızca ücretsiz planda `true` |
| İptal tek tuş | Ayarların en üstünde, koşulsuz |
| Yağ oranı aralık olarak | `yagOraniAralik()` tek sayı döndüremez |
| Tanı dili yasak | `DURUS_ETIKETLERI` + test: "kifoz/lordoz/tanı" geçemez |

---

## Test

```bash
npm test                # tüm testler
npm run test:coverage   # motor kapsam eşikleri (satır %85, dal %80)
```

Motor testleri sentetik profillerle çalışır: yeni başlayan, ileri seviye, bel fıtıklı,
ev antrenmanı, kadın, 55 yaş üstü, ED modu, ekipmansız.

`packages/api/src/rotalar/yolculuk.test.ts` uçtan uca yolculuğu doğrular:
kayıt → 134 soru → profil → program → gerekçe → geri bildirim → motor kararı.
