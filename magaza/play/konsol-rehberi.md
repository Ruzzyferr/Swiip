# Play Console kurulum rehberi

Konsolda doldurulacak her alanın cevabı. Cevaplar uygulamanın **gerçekten yaptığı şeye**
göre yazıldı; tahmin yok. Yanlış beyan, yayından kaldırılma sebebi.

Hesap: `info@swiip.app` · Paket adı: `io.made2fit.app`

---

## 1. Uygulama oluşturma

| Alan | Değer |
|---|---|
| Uygulama adı | Made2Fit |
| Varsayılan dil | Türkçe (tr-TR) |
| Uygulama mı oyun mu | Uygulama |
| Ücretsiz mi ücretli mi | Ücretsiz (uygulama içi satın alma var) |

> Ücretsiz seçilen bir uygulama sonradan ücretliye çevrilemez. Bizim modelimiz abonelik,
> yani doğru seçim ücretsiz.

---

## 2. Mağaza listesi

Metinler `liste-tr.md` içinde. Görseller:

| Varlık | Dosya |
|---|---|
| Uygulama simgesi 512×512 | `ikon-512.png` |
| Öne çıkan görsel 1024×500 | `one-cikan-1024x500.png` |
| Telefon ekran görüntüleri (6) | `ekranlar/*.png` (1080×2160) |

---

## 3. Uygulama erişimi (App access)

**Tüm işlevler kısıtlı** — uygulama hesap açmadan kullanılamaz.

İnceleme ekibi için hesap:

```
E-posta : inceleme@made2fit.io
Parola  : (kurulumda üretilecek, buraya yazılacak)
```

Not olarak eklenecek açıklama:

> Uygulama 134 soruluk bir değerlendirme ile başlar. İncelemeyi hızlandırmak için bu
> hesabın değerlendirmesi tamamlanmış ve programı üretilmiş durumdadır; giriş yaptıktan
> sonra Program sekmesi doğrudan açılır. Vücut fotoğrafı adımı atlanabilir; "Ölçülerle
> devam et" seçeneği vardır.

---

## 4. Reklamlar

**Uygulama reklam içermiyor.** Kodda hiçbir reklam SDK'sı yok; hak tablosunda her plan
için `reklam: false`.

---

## 5. İçerik derecelendirmesi (IARC anketi)

| Soru | Cevap | Gerekçe |
|---|---|---|
| Şiddet | Hayır | — |
| Cinsellik | Hayır | — |
| Küfür | Hayır | — |
| Uyuşturucu | Hayır | — |
| **Alkol / tütün** | **Evet — referans var** | Besin veritabanında alkollü içecekler var (kalori kaydı için). Teşvik yok, yalnızca listeleniyor. |
| Kumar | Hayır | — |
| Kullanıcılar içerik paylaşabiliyor mu | Hayır | Koç sohbeti kullanıcı ile yapay zekâ arasında; kullanıcılar birbirini görmez. |
| Konum paylaşımı | Hayır | Şehir soruluyor ama konum izni istenmiyor ve paylaşılmıyor. |
| Dijital satın alma | Evet | Abonelik. |

> Alkol sorusuna "hayır" demek kolay olurdu ama doğru değil: içen kullanıcı içtiğini
> kaydedemezse günü eksik kalır ve bütün hesap kayar. Ürün burada ahlak dersi vermiyor,
> doğru sayı veriyor — ve beyanı da doğru veriyoruz.

---

## 6. Hedef kitle ve içerik

- Hedef yaş aralığı: **18 ve üzeri**
- Çocuklara yönelik mi: **Hayır**
- Uygulama, 18 yaşından küçük olduğunu belirten kullanıcıya program üretmiyor (sert kapı).

---

## 7. Veri güvenliği formu (Data safety)

Genel:

- Veriler aktarım sırasında **şifreleniyor** (TLS): **Evet**
- Kullanıcı verisinin silinmesini isteyebiliyor mu: **Evet** — uygulama içinden ve
  `https://made2fit.io/hesap-silme`
- Bağımsız güvenlik incelemesinden geçti mi: **Hayır**

### Toplanan veriler

| Kategori | Tür | Toplanıyor | Paylaşılıyor | Zorunlu | Amaç |
|---|---|---|---|---|---|
| Kişisel bilgiler | E-posta adresi | Evet | Hayır | Zorunlu | Hesap yönetimi |
| Sağlık ve fitness | Sağlık bilgisi | Evet | Hayır | Zorunlu | Uygulama işlevi |
| Sağlık ve fitness | Fitness bilgisi | Evet | Hayır | Zorunlu | Uygulama işlevi |
| Fotoğraf ve video | Fotoğraf | Evet | Hayır | İsteğe bağlı | Uygulama işlevi |
| Uygulama etkinliği | Uygulama içi eylemler | Evet | Hayır | Zorunlu | Analiz |

### Fotoğraf — önemli ayrım

Fotoğraf için **"Veri geçici olarak işleniyor"** (processed ephemerally) seçilecek.

Sebebi: fotoğraf cihazdan çıkıyor (yani Play'in tanımıyla "toplanıyor") ama sunucuda
**saklanmıyor** — aynı istek içinde bellekten bırakılıyor, diske hiç yazılmıyor.
`body_analyses` tablosunda fotoğraf alanı yok ve bunu iki ayrı test koruyor
(`db/sema.test.ts` şema tarafını, `servisler/gizlilik.test.ts` kaynak kodu tarar).

### "Paylaşılıyor" neden hayır

Yapay zekâ hizmet sağlayıcısı bizim talimatımızla, bizim adımıza işliyor
(service provider). Play'in tanımında bu "paylaşım" değil. Sağlayıcı veriyi kendi amacı
için kullanmıyor ve program üretimi için gönderilen veride sağlık ayrıntıları yer almıyor.

---

## 8. Sağlık uygulamaları beyanı

Play, sağlık verisi işleyen uygulamalar için ek beyan istiyor.

- Uygulama **tıbbi cihaz değil**, teşhis koymuyor, tedavi önermiyor.
- Sağlık verisi yalnızca kişiye özel antrenman ve beslenme programı üretmek için işleniyor.
- Tahminler **aralık** olarak sunuluyor, tek sayı olarak değil.
- Her ekranda tıbbi cihaz feragati var.

---

## 9. Diğer beyanlar

| Soru | Cevap |
|---|---|
| Devlet uygulaması mı | Hayır |
| Finansal özellik içeriyor mu | Hayır (ödeme Google Play üzerinden) |
| COVID-19 izleme | Hayır |
| Haber uygulaması | Hayır |

---

## 10. Uygulama içi ürünler (abonelikler)

Dört ürün. Kimlikler `apps/mobile/src/odeme/magaza.ts` içindeki `URUNLER` dizisiyle
**birebir aynı olmak zorunda** — farklı olursa satın alma sessizce çalışmaz.

| Ürün kimliği | Ad | Fiyat | Dönem |
|---|---|---|---|
| `made2fit_temel_aylik` | Temel — Aylık | 99,00 ₺ | 1 ay |
| `made2fit_temel_yillik` | Temel — Yıllık | 690,00 ₺ | 1 yıl |
| `made2fit_pro_aylik` | Pro — Aylık | 169,00 ₺ | 1 ay |
| `made2fit_pro_yillik` | Pro — Yıllık | 1.190,00 ₺ | 1 yıl |

- Deneme süresi: **yok**. Ücretsiz katman zaten kalıcı ve kullanılabilir.
- Giriş teklifi (introductory offer): **yok**. Sahte indirim yok.
- Yenileme: otomatik. Kullanıcı uygulama içinden tek dokunuşla iptal edebiliyor.

---

## 11. RevenueCat bağlantısı

1. RevenueCat'te proje: **Made2Fit**, platform **Google Play**.
2. Play Console → Kurulum → API erişimi: hizmet hesabı oluştur, RevenueCat'e JSON anahtarı ver.
3. Ürünler: yukarıdaki dört kimlik. Hak (entitlement) adları: `temel`, `pro`.
4. Web kancası: `https://made2fit.io/v1/abonelik/kanca`
   - Yetkilendirme başlığı: `infra/.env` içindeki `REVENUECAT_KANCA_SIRRI` değeri.
   - **Sır tanımlı değilse uç hiç kurulmuyor** — doğrulanmamış kanca ödeme duvarını
     herkese açardı.
5. İstemci anahtarı: `apps/mobile/.env` → `EXPO_PUBLIC_REVENUECAT_ANDROID`.

> Anahtar tanımlı değilken uygulama açılır ve paywall görünür; yalnızca satın alma kapalı
> kalır. Bu bilinçli: geliştirme ve inceleme akışı bozulmasın diye.

---

## 12. Sürüm

- Yapı: `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`
- İmza: `C:/dev/Made2Fit-imza/made2fit-upload.jks` (yükleme anahtarı; Play App Signing açık)
- İlk sürüm **iç test** kanalına yüklenir. Üretime çıkmadan önce:
  - Alan adı alınmış ve `https://made2fit.io/gizlilik` yayında olmalı (Play çalışan bir
    URL istiyor).
  - Sunucu yayında olmalı; aksi hâlde inceleme ekibi giriş yapamaz.

---

## Bu rehber neden var

Konsoldaki soruların çoğu "evet/hayır" ama cevabı ürünün gerçek davranışına bağlı.
Kaynak koda bakmadan doldurulursa yanlış beyan olur ve yanlış beyan, yayından kaldırılma
sebebidir. Her satırın dayanağı yukarıda yazılı.
