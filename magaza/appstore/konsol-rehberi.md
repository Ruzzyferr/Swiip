# App Store Connect — kurulum ve gönderim

Uygulama: **Swiip** · Apple ID `6803979374` · paket `app.swiip`
Hesap sahibi: Rüzgar Bulut · `info@swiip.app`

Bu dosya elle tıklanacak adımların listesi değil; **betiklerin ne yaptığını ve neden o
sırada yaptığını** anlatır. Tekrarlanabilir olan her şey betikte:

| İş | Betik |
|---|---|
| Sertifika, profil, `credentials.json` | `scripts/apple-kimlik-kur.mjs` |
| Mağaza metni, yaş derecelendirme | `scripts/apple-magaza.mjs` |
| Ekran görüntüleri | `scripts/apple-ekran.mjs <klasor>` |
| Abonelik ürünleri ve fiyatlar | `scripts/apple-abonelik.mjs [gorsel.png]` |
| Satış yapılacak ülkeler | `scripts/apple-ulke.mjs [ULKE ...]` |

Üçü de şu üç ortam değişkenini ister:

```
EXPO_ASC_API_KEY_PATH=C:/Users/ruzzy/.asc-keys/AuthKey_YX69K49LLD.p8
EXPO_ASC_KEY_ID=YX69K49LLD
EXPO_ASC_ISSUER_ID=785ff925-e57d-4629-b589-eb48230f0a8f
```

---

## İnceleme ekibi için hesap

```
E-posta : inceleme@swiip.app
Parola  : mercan-defter-7431-yelken
```

Bu hesabın değerlendirmesi **doldurulmuş ve programı üretilmiş** durumda. Böyle olmak
zorunda: uygulama 134 soruluk değerlendirmeyle başlıyor ve program, beslenme, koç
ekranları değerlendirme bitmeden görünmüyor. Boş hesap veren bir gönderim, inceleyicinin
gördüğü tek ekranın anket olması demek.

Yeniden doldurmak gerekirse: `node_modules/.swiip-gecici/degerlendirme-doldur.mjs`.

---

## Gönderimi kilitleyen dört şey

İlk gönderimde `reviewSubmissionItems` API'si ısrarla
`STATE_ERROR.ENTITY_STATE_INVALID` döndü ve sebebini **söylemedi**. Sebepler yalnızca
konsolda, sürüm sayfasındaki "Add for Review" düğmesine basınca çıkan kırmızı kutuda
görünüyor. API ile uğraşırken saatler kaybetmemek için: **önce o düğmeye bas, listeyi
oku.**

Çıkan liste ve karşılıkları:

1. **Birincil kategori** — `appInfos` ilişkisi, `HEALTH_AND_FITNESS` / `SPORTS`
2. **Fiyat kademesi** — `appPriceSchedules`; ücretsiz uygulama için de zorunlu
3. **Telif** — `appStoreVersions.copyright`
4. **İçerik hakları** — `apps.contentRightsDeclaration`

Ayrıca bunlar da vardı ve hiçbiri hata listesinde görünmüyordu:

- **App Privacy yayınlanmamıştı.** Bu bölüm hiç başlatılmamışsa sürüm incelemeye
  giremiyor ama hata metni bunu söylemiyor.
- **İnceleme bilgileri (`appStoreReviewDetails`) yoktu.** Telefon zorunlu.
- **Yaş derecelendirmede sosyal medya soruları boştu** (`socialMedia`,
  `socialMediaAgeRestricted`). Yeni uygulamada cevaplanması şart.

---

## Abonelikler — üç tuzak

**1. Kullanılabilirlik fiyattan önce gelir.**
Ülke ayarlanmadan fiyat yazmaya çalışınca Apple
`An error occurred while processing the pricing information` diyor. Fiyatta bir sorun
yok; ürün o ülkede satılmıyor.

**2. Fiyat noktaları sayfalı ve ilk sayfa 200₺'de bitiyor.**
Sayfalama yapılmazsa "hedefe en yakın nokta" yıllık plan için 199,99₺ çıkıyor —
690₺ yerine. Betikte hem sayfalama var hem de %12'den fazla sapmada duruyor.

**3. Ürün tek ülkede satılsa bile 175 ülkenin HEPSİNDE fiyatlı olmalı.**
Yalnızca Türkiye fiyatlanınca konsol `You must add a subscription price` diyor —
fiyat aslında var. Kur çevirisi elle yapılmıyor; Apple'ın
`subscriptionPricePoints/{id}/equalizations` ucu taban fiyatın her ülkedeki karşılığını
veriyor. Konsoldaki "otomatik hesapla" düğmesinin API karşılığı bu.

Ürünler ve fiyatlar (`CLAUDE.md`'de kilitli):

| Ürün | Süre | Fiyat |
|---|---|---|
| `swiip_temel_aylik` | 1 ay | ₺99,00 |
| `swiip_temel_yillik` | 1 yıl | ₺690,00 |
| `swiip_pro_aylik` | 1 ay | ₺169,00 |
| `swiip_pro_yillik` | 1 yıl | ₺1.189,99 |

Yıllık Pro'da 1 kuruş sapma var: Apple'ın nokta listesinde 1.190,00 yok.

---

## Satış yapılan ülkeler

**Yalnızca Türkiye.** Gerekçe `CLAUDE.md`'deki "Türkiye önce" kararı: mağaza metni
Türkçe, fiyatlar TRY. Başka ülkeye açmak, satın alması çalışmayan bir vitrin demek.

`availableInNewTerritories` **kapalı** — Apple yeni ülke eklediğinde kendiliğinden
açılmasın; fiyatı olmayan ülkeye açılmak tam da kaçındığımız uyuşmazlık.

Apple'ın v2 ucu kısmi liste kabul etmiyor: 175 ülkenin hepsi açık/kapalı olarak tek tek
gönderilmeli. `scripts/apple-ulke.mjs` bunu yapıyor.

---

## App Privacy beyanı

Beyan tahminle değil `packages/api/src/db/sema.ts` okunarak çıkarıldı. Hiçbiri **izleme**
amaçlı değil; reklam ağı ve veri simsarı yok.

| Apple kategorisi | Tür | Amaç | Kimliğe bağlı | Kaynak |
|---|---|---|---|---|
| Contact Info | Email Address | App Functionality | Evet | `users.email` |
| Health & Fitness | Health | App Functionality | Evet | ölçümler, tıbbi kapı |
| Health & Fitness | Fitness | App Functionality | Evet | `programs`, `sessions` |
| User Content | Photos or Videos | App Functionality | Evet | vücut/yemek fotoğrafı |
| User Content | Other User Content | App Functionality | Evet | `coach_messages` |
| Identifiers | User ID | App Functionality | Evet | `users.id` |
| Purchases | Purchase History | App Functionality | Evet | `subscriptions` |
| Usage Data | Product Interaction | Analytics | Evet | `analytics_events` |

**Fotoğraf hakkında:** cihazdan çıkıyor, yani Apple'ın tanımıyla "toplanıyor". Ama
sunucuda saklanmıyor — analiz sonrası bellekten bırakılıyor, diske hiç yazılmıyor.
`body_analyses` tablosunda fotoğraf alanı yok ve bunu iki test koruyor
(`db/sema.test.ts`, `servisler/gizlilik.test.ts`).

Play'deki veri güvenliği formunda **User ID ve Purchase History beyan edilmemişti.**
İkisi de aslında toplanıyor. Play tarafı bir sonraki güncellemede düzeltilmeli —
`magaza/play/konsol-rehberi.md` bölüm 7.

---

## Konsolu betikle sürerken

Tarayıcı otomasyonunda iki şey tekrar tekrar yakaladı:

- **`element.click()` işe yaramıyor.** React'in iç modeli güncellenmediği için tıklama
  yok sayılıyor. Gerçek fare olayı gerekiyor (`Input.dispatchMouseEvent`).
- **"Add for Review" bir düğme değil, açılır menü.** Basınca "Draft iOS Submission" ve
  "Create New Submission" çıkıyor; asıl ekleme ikinci tıklamada oluyor. İlk denemede
  düğmeye basıp "hiçbir şey olmadı" sanmıştım.

Yardımcı betikler `node_modules/.swiip-gecici/` altında; depoya girmiyorlar çünkü tek
seferlik ve kırılganlar.
