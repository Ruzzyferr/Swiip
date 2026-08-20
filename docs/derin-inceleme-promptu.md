# Derin inceleme promptu

Yeni bir Claude Code oturumu açıp aşağıdaki metnin tamamını yapıştır. Ortam bilgileri
bilerek içinde: bunları keşfetmek bir oturum sürdü, ikinci kez sürmesin.

---

Made2Fit'i baştan sona incele. Kod, arayüz, işlevsellik, sağlamlık, rakip farkı — hepsi.
Amaç "iyi görünüyor" demek değil, **kanıtla göstermek**: ne ölçtün, ne gördün, ne kırdın.

## Önce oku, sonra dokun

Sırayla: `CLAUDE.md` (oturum başında zaten yükleniyor) · `docs/spec.md` ·
`docs/durum.md` (nerede olduğumuz) · `docs/uygulama-plani.md` ·
`docs/rakip-analizi.md` (15.000 yorumluk araştırma — her ürün kararının dayanağı) ·
`docs/cihazda-calistirma.md` (cihazda çıkan on beş hata).

`CLAUDE.md`'deki "kilitlenmiş kararlar" tartışmaya kapalı. Değiştirmek istersen önce
`rakip-analizi.md`'de gerekçesini bul; hâlâ yanlış olduğunu düşünüyorsan **öner, uygulama.**

## Ortam — tekrar keşfetme

| Konu | Bilgi |
|---|---|
| Kök | `C:\dev\Made2Fit` · npm workspaces · kod ve testler Türkçe |
| Doğrulama | `npm run verify` (biçim + lint + tip + çeviri denetimi + test) |
| Geliştirme Postgres | `infra/docker-compose.gelistirme.yml` · `127.0.0.1:55433` (5432/5433 başka projelerde dolu) |
| API portu | 3311 — 3000'i başka bir konteyner tutuyor |
| Site sunucusu | `npx serve -l 8090 -s apps/site` |
| Android | Emülatör API 36 · `adb` · ekran ağacı için `uiautomator dump` |
| Sensörler | Emülatör konsoluna PowerShell'den TCP ile bağlanıp `sensor set acceleration` |
| Gradle | `--project-cache-dir=C:/gradle-cache/made2fit` — Defender geçici klasörü kilitliyor |
| İmza | `C:/dev/Made2Fit-imza/made2fit-upload.jks` · parolalar `apps/mobile/imza.properties` (gitignore) |
| İmza uygulaması | `expo prebuild` **sonrasında** `node scripts/android-imza.mjs` — `android/` üretilen çıktı, her prebuild'de sıfırlanıyor |
| Kontrast denetimi | `node scripts/site-kontrast.mjs` (tarayıcı ister) |

### Tarayıcı

Kullanıcının Brave'i. Playwright yok, `playwright-core` var; hata ayıklama portuna
`connectOverCDP` ile bağlanılıyor.

- Debug portu **çalışan** bir tarayıcıya sonradan eklenemiyor. Gerçek profilin oturumunu
  kullanman gerekiyorsa Brave'i kapatıp `--remote-debugging-port` ile açmak zorundasın —
  **bunu yapmadan önce kullanıcıya sor**, açık sekmeleri ve oturumları gidebilir.
- Yalnız ekran görüntüsü alacaksan gerçek profile hiç dokunma; geçici profille aç:
  `--user-data-dir=<scratchpad>/brave-profil --remote-debugging-port=9333`.

### Ekran görüntüsü tuzakları

- `page.screenshot()` bazen `waiting for fonts to load` diye 30 sn'de düşüyor. Onun yerine
  `Page.captureScreenshot` (CDP) kullan.
- CDP'nin `clip` alanı **sayfa koordinatı** ister, görünüm koordinatı değil. `scrollY`
  eklemezsen bambaşka bir yeri çekersin.
- `captureBeyondViewport: true` ile `position: fixed` ögeler yanlış yere düşüyor. Sabit
  rayı doğrulayacaksan normal görünüm çekimi kullan, ölçümü `getBoundingClientRect` ile yap.

## Bu projede yanılan şeyler — aynı taşa iki kez takılma

- **bash heredoc + `\n`**: kaçış dizileri gerçek satır sonuna dönüşüp üretilen JS/TS'i
  bozuyor. Uzun içerik için Write aracını kullan, ya da `String.fromCharCode(10)`.
- **Türkçe locale**: `\b` yalnızca ASCII · `'İ'.toLowerCase()` iki kod noktası üretiyor ·
  `toLocaleUpperCase('tr-TR')` İngilizce `i` harfini `İ` yapıyor.
- **`Intl`** para biriminden önce NBSP (U+00A0) koyuyor; testte normal boşluk beklersen kırılır.
- **İvmeölçer işaretleri iOS ve Android'de ters.** Expo normalize etmiyor. Eğim kapısı
  bu yüzden Android'de hiç açılmıyordu.
- **Metro monorepo**: giriş dosyası `apps/mobile/index.js` ve `unstable_serverRoot` olmadan
  yayın paketi girişi bulamıyor. Geliştirme derlemesi bunu göstermiyor.
- **`color(srgb ...)`** kanalları 0–1 verir, `rgb()` 0–255. Karıştırırsan kontrast ölçümün
  tamamen yanlış çıkar.

## Aradığın kusur sınıfı

Bu projede tekrar tekrar aynı şey çıktı: **tanımlanmış ama hiç uygulanmamış.**

- `vucutAnaliziHakki` tanımlıydı, hiç çağrılmıyordu → ücretsiz kullanıcı sınırsız AI harcıyordu
- 16 ekran için `_layout.tsx` yoktu → başlıkta ham rota yolu (`rapor/index`) görünüyordu
- `SafeAreaProvider` bağlıydı, hiçbir ekran kenar boşluğunu okumuyordu
- `dataSource: "tr_iller"` şemada vardı, veri yoktu → soru boş şıkla açılıyordu
- `--aksan-parlak` "koyu zeminde okunan aksan" diye tanımlıydı, koyu yongada kullanılmıyordu
- Dışa aktarma ucu veriyi döndürüyordu, ekran onu atıp "hazırlandı" diyordu

Bir şeyin **var olduğunu** görmek yetmez; **çağrıldığını** doğrula. En sinsi hâli:
testin kendisinin sahte olması — çağrıyı sildiğinde `import` satırı testi geçiriyordu.

## Yöntem — pazarlığa kapalı

1. **Ölç, göz kararı verme.** "Okunuyor gibi" bir bulgu değil; "1.08:1, eşik 4.5" bulgudur.
2. **TDD.** Önce kırmızı test, kırmızı olduğunu **doğru sebeple** gör, sonra düzelt.
3. **Her guard'ı kasten bozarak doğrula.** Bozunca kırmızıya dönmeyen test, test değildir.
4. **Saf mantık `packages/shared` veya `packages/core`'a.** Ekranda hesap yapma.
5. **Kullanıcıya görünen her metin sözlükte** (`metinler.tr.ts` / `metinler.en.ts`).
   `npm run ceviri` bunu denetliyor.
6. Bulduğun her kusuru **düzelt ve commit et**. Liste bırakıp gitme.

## Yapılacaklar

### A. Kod incelemesi

Her paketi (`shared`, `core`, `api`, `mobile`, `site`) gözden geçir. Aradıkların:
ölü kod, çağrılmayan koruma, sözleşmeden sapma, kopyalanmış mantık, sessiz `catch`,
sınır durumu (boş liste, tek eleman, `null`, çok uzun metin, negatif sayı),
yarış durumu, `await` unutulmuş promise, tip kaçağı (`as any`, `!`).

Sağlıkla ilgili her hesabı elle bir kez doğrula: 1RM, TDEE, makro, hacim bütçesi, deload.
Yanlış sayı burada kozmetik bir hata değil.

### B. Site — görsel ve estetik

`apps/site`. Kullanıcının kuralı: **her genişlikte sağda solda boşluk kalmayacak, sayfa
PDF gibi ortaya dizilmiş görünmeyecek, AI ürünü gibi durmayacak.**

- 320'den 3440 piksele en az on dört genişlikte, açık **ve** koyu temada gez, her bölümün
  ekran görüntüsünü al ve **gerçekten bak**. Taşma taraması yeterli değil — geçen sefer
  taşma temizdi ama koyu temada bir bölümün tamamı okunmuyordu.
- `node scripts/site-kontrast.mjs` sıfır bulguyla geçmeli.
- Klavyeyle baştan sona gez: odak halkası her yerde görünür mü, sıra mantıklı mı,
  "içeriğe atla" çalışıyor mu.
- `prefers-reduced-motion` açıkken hareket duruyor mu.
- Tipografi ölçeği, satır uzunluğu, ritim, boşluk. Marka: ölçü aleti metaforu,
  mürekkep `#131614`, çam yeşili `#14615A`, zemin `#F6F7F5`. **Neon ve turuncu yasak.**
- Estetik olarak zayıf bulduğun yeri düzelt, ama önce neden zayıf olduğunu tarif et.

### C. Mobil arayüz — görsel ve estetik

39 ekran var. Emülatörde **hepsini** aç, ekran görüntüsü al, tek tek incele.

- Dokunma hedefi 44 px altında kalan var mı
- Kenar boşluğu (çentik, durum çubuğu, alt gezinme çubuğu) her ekranda okunuyor mu
- Uzun Türkçe metin taşırıyor mu, cihaz yazı tipi büyütülünce ne oluyor
- Yükleniyor / boş / hata durumları tasarlanmış mı, yoksa boş ekran mı
- Koyu tema
- Ekran okuyucu etiketleri (`accessibilityLabel`, `accessibilityRole`)
- **Oyunlaştırma yok**: rozet, seri, konfeti, kutlama — bir tane bile görürsen kaldır

### D. Görsel MCP'ler

Tasarım işini hızlandıracak MCP sunucuları ara ve kur.

- **Önce mevcut olanlara bak** — bir kısmı zaten bağlı olabilir.
- Stitch, superdesign, Figma, tarayıcı otomasyonu ve ekran görüntüsü MCP'lerine bak.
- **MCP kurmak kullanıcının yapılandırmasını değiştiriyor; kurmadan önce ne kuracağını
  ve neden gerektiğini söyle.**
- Kurulan her MCP'yi gerçekten kullan. Kurup kullanmamak zaman kaybı.

### E. Gerçek kullanıcı olarak dene

Uygulamayı baştan sona, gerçekten kullan. Sadece mutlu yolu değil. Her persona için
kaydol, değerlendirmeyi doldur, program üret, kullan — ve ne kırıldığını yaz.

| Kim | Ne sınıyor |
|---|---|
| 52 yaşında, bel fıtığı, evde ekipmansız | Kısıt çözücü, gerekçe metni, "yerden çekiş yok" kuralı |
| 19 yaşında, hayatında hiç spor salonuna girmemiş | Terim yoğunluğu, hareket açıklamaları Türkçe mi |
| 17 yaşında | Yaş kapısı — atlanamamalı |
| Gebe | Sert kapı |
| Kardiyak bayrak taşıyan | Sert kapı, tanı dili kullanılmamalı |
| Yeme bozukluğu geçmişi olan | ED modu, sayıların gizlenmesi, dilin tamamı |
| Vegan + çölyak | Tarif kütüphanesi yeterliliği — burada daha önce gerçek bir boşluk çıktı |
| Bütçesi kısıtlı, ücretsizde kalmak isteyen | Ücretsiz katman gerçekten kullanılabilir mi, upsell duvarı var mı |
| Ödeme yapmış kullanıcı | **Tek satır bile reklam veya upsell görmemeli** |
| Aboneliğini iptal etmek isteyen | Tek tuş, ayarların en üstünde, gizlenmemiş |
| KVKK'ya duyarlı | Verimi dışa aktar → dosya eline geçiyor mu · hesap silme gerçekten siliyor mu |
| Ekran okuyucu kullanan | Her ekran sesli okunabiliyor mu |
| Renk körü | Yalnızca renkle anlatılan bir şey var mı |
| Metroda, çevrimdışı | Kayıt kayboluyor mu, hata mesajı doğru mu ("bağlantı yok" derken aslında 400 olabilir) |
| Telefon değiştiren | Oturum, veri, program taşınıyor mu |
| Tek eliyle kullanan | Kritik düğmeler baş parmak menzilinde mi |
| Uygulamayı kapatıp iki hafta sonra dönen | Program ne diyor, seri baskısı var mı (olmamalı) |

### F. Rakip farkı

Ürünün tek iddiası: **programın neden o program olduğunu gösterebilmek.**

Bunu gerçek bir kullanıcı olarak sına. Gerekçe her yerde görünüyor mu, anlaşılıyor mu,
doğru mu? `decisions` tablosundaki karar izi ile kullanıcıya gösterilen cümle örtüşüyor mu,
yoksa arada bir yerde AI'ın uydurduğu bir cümle mi var? İddia tutmuyorsa en büyük bulgu budur.

`rakip-analizi.md`'deki her rakip zaafına karşı bizim durumumuzu tek tek kontrol et.

### G. Sağlamlık

- Uçları bilerek kötü veriyle döv: boş gövde, dev gövde, yanlış tip, eksik alan,
  aynı isteği eşzamanlı iki kez, geçersiz token, süresi dolmuş token.
- Yetki: A kullanıcısı B'nin verisine ulaşabiliyor mu.
- Kota adaleti: önbellekten gelen tanıma ve yanlış tanıma sonrası tekrar deneme **kota
  yememeli**. Bunu gerçekten harcayarak sına.
- Fotoğraf: sunucuda hiçbir yerde kalmadığını bir kez daha doğrula.
- Uygulamayı çökertmeye çalış. Çökerse bulgu.

## Rapor

`docs/inceleme-<tarih>.md` yaz. Her bulgu için: **kanıt** (ekran görüntüsü yolu veya ölçüm),
**sebep**, **düzeltme**, **hangi test bunu bir daha bırakmaz**.

Düzeltemediğin bir şey varsa neden düzeltemediğini yaz. "Sonra bakılacak" listesi bırakma;
ya düzelt ya da neden bilinçli olarak bırakıldığını gerekçelendir.

## Yapma

- Oyunlaştırma ekleme.
- Fiyatları değiştirme (Temel 99₺/690₺ · Pro 169₺/1.190₺).
- wger verisi kullanma (CC-BY-SA, share-alike bulaşıcı).
- TürKomp veya Open Food Facts toplu içe aktarma — ikisi de yazılı izin/lisans kararına bağlı.
- Yeni bir yere AI koymadan önce aylık maliyetini hesapla. Pro kullanıcının AI maliyeti
  ~50₺, geliri 169₺. Bu marj dar.
- Play Console'a girmeye çalışma: tarayıcıda `info@swiip.app` oturumu yok ve kayıtlı Google
  parolası da yok. Giriş kullanıcının iki adım doğrulamasını gerektiriyor.

## Dışarıya bağlı, sende değil

`made2fit.io` alan adı ve Apple geliştirici hesabı kullanıcıda. Gizlilik politikası URL'si
alan adına bağlı, dolayısıyla Play'de üretime çıkış da öyle. İmzalı AAB hazır ve doğrulandı;
`magaza/play/konsol-rehberi.md` konsolda doldurulacak her alanın cevabını taşıyor.

Başla. Sorman gereken bir şey olursa sor, ama önce kendin bakabileceğin hiçbir şeyi sorma.
