# Swiip

AI antrenör ve beslenme koçu uygulaması. Türkiye önce, global mimari.

**Bu dosya her oturumda otomatik yüklenir. Kod yazmadan önce `docs/spec.md` okunmalı.**

---

## Ürün tek cümlede

Kullanıcının 134 soruya verdiği cevapları ve vücut fotoğrafını, **gerekçesi görünür** bir
antrenman ve beslenme programına çeviren koç.

Rakiplerden ayrıştığımız yer program üretmek değil — **programın neden o program olduğunu
gösterebilmek.** "Bel fıtığın olduğu için yerden deadlift yerine hip thrust koydum."

---

## Kilitlenmiş kararlar — tartışmaya kapalı

Bunlar uzun bir tasarım sürecinde, 20 rakibin 14.960 Türkçe yorumu analiz edilerek alındı.
Değiştirmek istiyorsan önce `docs/rakip-analizi.md`'yi oku, gerekçeleri orada.

| Konu | Karar |
|---|---|
| Platform | React Native + Expo |
| Backend | Node + Postgres, kendi VPS'imiz |
| AI erişimi | Gateway üzerinden çok model, iş başına model seçimi |
| Ödeme | RevenueCat + mağaza içi satın alma |
| Pazar | Türkiye önce, veri modeli ilk günden çok dilli |
| İsim | Swiip · `swiip.app` |
| Zeka mimarisi | Deterministik çekirdek + yalnızca 4 noktada AI |
| Vücut fotoğrafı | Analiz sonrası **anında silinir**, sadece ölçümler saklanır |
| Antrenman takibi | Salonda kayıt **yok**. Seans sonrası üç dokunuş geri bildirim |
| Program | Statik doküman değil; her seans önceki geri bildirimden hesaplanır |
| Planlar | Ücretsiz · Temel 99₺/690₺ · Pro 169₺/1.190₺ |
| Ücretsiz kapsam | Vücut analizi (bir kez), 1. gün programı, manuel kalori girişi |
| Pro farkı | Fotoğraftan yemek tanıma (aylık 250) |

---

## Mimari ilkeler

**1. Hesap formülle, dil AI ile.**
Hacim, progresif yüklenme, deload, 1RM, kalori, makro — hepsi deterministik formül.
LLM aritmetikte tutarsızdır ve sağlık bağlamında bu kabul edilemez.

AI yalnızca dört yerde:
- Değerlendirme yorumlama (kullanıcı başına 1-2 kez)
- Vücut fotoğrafı analizi (ayda ~1)
- Yemek tanıma — sadece "bu ne yemeği", besin değeri **veritabanından** (Pro, aylık 250)
- Koç sohbeti (kotalı)

**2. Aynı girdi her zaman aynı çıktı.**
EatBetter'ın en beğenilen negatif yorumu: *"aynı şeyi eklediğimde yine farklı makrolar
çıkarıyor."* Bu, besin değerini LLM'e sorduğun için olur. Bizde değerler veritabanından
gelir; tutarsızlık yapısal olarak imkânsız.

**3. Her karar izlenebilir.**
`decisions` tablosu her program kararının hangi cevaplardan ve hangi kurallardan doğduğunu
saklar. Kullanıcıya gösterilen gerekçe AI'ın uydurduğu cümle değil, çözücünün karar izidir.

**4. Sağlıkta muhafazakâr ol.**
Dört sert kapı var (18 yaş, gebelik, kardiyak bayrak, yeme bozukluğu). Atlanamaz.
Tahminler **aralık** olarak sunulur, tek sayı olarak asla. Tanı dili yasak.

---

## Yazarken uyulacak kurallar

Bunların hepsi ölçülmüş bir rakip zaafından türedi. Gerekçeleri `docs/spec.md` bölüm 02'de.

- **Oyunlaştırma yok.** Rozet, elmas, seri, konfeti, kutlama animasyonu — hiçbiri.
  YAZIO'nun 120 beğenili iki şikâyeti tam bu: *"çocuk muyuz biz"*.
- **Ödeyene reklam ve upsell gösterilmez.** Tek satır bile.
- **İptal tek tuş**, ayarların en üstünde, gizlenmez.
- **Fiyat ve yenileme tarihi** paywall'da en büyük puntoda. Önceden seçili plan yok.
- **Hareket açıklamaları Türkçe.** Fitify'ın 144 beğenili tek talebi buydu.
- **Program düzenlemek ücretsiz ve sınırsız.** Buraya duvar koymak ürünü öldürür.
- **Uygulama çökmez.** Diyetkolik negatiflerinin %34'ü teknik hataydı.
- **Kota adaleti:** önbellekten gelen tanıma ve yanlış tanıma sonrası tekrar deneme
  **kota yemez.** Bizim hatamızın bedelini kullanıcı ödemez.

---

## Marka

**Ölçüne göre.**
*Programın neden o program olduğunu da söyleriz.*

İngilizce: *Made to fit. And made to explain.*

İşaret: **işaretin kendisi bir ölçü aleti.** Made2Fit'te bunu 2 rakamı yapıyordu — üst
kavisi çentikli açıölçer, tabanı taksimatlı cetvel. Swiip'te 2 yok; fikir korundu, harfe
taşındı: S, teğet noktasında birleşen iki yaydan kuruluyor ve dış kavislerinde taksimat
var. `scripts/marka-uret.mjs` üretiyor — çentik açıları hesapla çıksın, elle kaymasın.
`brand/mark.svg` · `brand/lockup.svg` · `brand/icon.svg`

Kilitteki "Swiip" yazısı `<text>` değil **yol**: font kurulu olmayan her yerde (mağaza
görseli, PDF, baskı, başka bir bilgisayar) aynı çiziliyor. Yüz Inter Bold — uygulamanın
başlık fontunun ta kendisi. Önceki `Archivo` bir niyetti, hiçbir yerde kurulu değildi ve
pratikte Arial'a düşüyordu. `scripts/marka-uret.mjs` harfleri tek tek yerleştiriyor.

> **Bu işaret bir ilk taslak, onaylanmış değil.** İki tur döndü: ilkinde yaylar
> birleşmiyordu ve dişli çark okunuyordu; ikincisi doğru bir S ama çentikler hâlâ
> "taksimat" değil "yırtık kenar" gibi duruyor. Tasarımcı eli değmeden mağazaya gitmesin.

Renk: mürekkep `#131614`, aksan çam yeşili `#14615A`, zemin `#F6F7F5`.
**Neon veya turuncu kullanma** — kategorinin tamamı orada.

Tipografi: başlıklarda grotesk, sayısal veride tabular rakamlı monospace.

---

## Klasör düzeni

```
docs/spec.md              Tam spesifikasyon. Kod yazmadan önce oku.
docs/uygulama-plani.md    Faz ve görev sırası, bitti kriterleriyle
docs/rakip-analizi.md     15.000 yorumluk araştırma — kararların dayanağı
data/sorular.json         134 soru, şıklarıyla, makine okunur
data/hareketler.json      Hareket şeması ve başlangıç seti
packages/shared/src/metinler.tr.ts   Türkçe sözlük — kullanıcıya görünen tüm metinler
packages/shared/src/metinler.en.ts   İngilizce sözlük; tip düzeyinde Türkçeye bağlı
brand/                    Logo dosyaları (SVG, currentColor kullanır)
```

---

## Açık işler

- **Arayüz: kalan üç iş.** Tasarım turu yapıldı (bkz. `git log`). Kalanlar:
  1. Beyaz kartlar gri zeminde hâlâ ekranı iri bloklara bölüyor. 2026-08-25'te iki
     bağımsız inceleme daha aynı sonuca vardı ve ikisi de somut bir çıkış önerdi:
     kutuları büsbütün bırak, ayraç olarak gutter'dan gutter'a 1 px çizgi kullan,
     bölüm başlığı olarak zaten var olan "NEDEN BU PROGRAM" tarzı 12 px versal
     etiketi kullan — ve **tek kap fotoğraf olsun.** Fotoğraf sayfadaki tek yarıçaplı
     dolu nesne olduğunda kutu içinde içerik olmaktan çıkıp sayfanın çapası oluyor;
     yani fotoğraf itirazı aslında çözümün kendisi. Görselsiz hareketler aynı 1:1
     karoyu düz renkle alıyor, böylece listenin ritmi bozulmuyor. Karar hâlâ senin.
  1b. **`₺` işareti sayısal fontta YOK.** Ölçüldü: `JetBrainsMono_500Medium`
     cmap'inde U+20BA yok, `Inter` içinde var. Yani her fiyat, para biriminde sistem
     serif yedeğine düşüyor — paywall'da rakamla çakışıyor ve "Ł99" gibi okunuyor.
     Türkiye önce bir üründe ödeme ekranının en büyük puntosu bu. İki yol: sembolü
     başlık fontunda ayrı basmak, ya da sayısal fontu ₺ içeren birine çevirmek
     (IBM Plex Mono, Roboto Mono).
  2. 23 hareket görselsiz. Kaynak (free-exercise-db, kamu malı) bunları içermiyor —
     çoğu mobilite ve ısınma. `data/medya-eslemeleri.json` içinde `null` olarak
     kayıtlı: "bakıldı, bilinçli olarak boş". Yanlış görsel görselsizden kötüdür.

  **Taksimat kuralı — bozulmasın:** motif yalnızca kullanıcının değer girdiği ya da bir
  ölçüm okuduğu yerde kullanılır. Şu an iki yerde: değerlendirme cetveli ve yağ oranı
  skalası. Navigasyonda, kart kenarında, düz metin altında çentik yok. Ekran başına tek
  ölçek: ikincisi konduğunda arayüz kumpas değil, bozuk bir ses mikseri gibi görünür.

- TürKomp kullanım koşulları yazılı teyit edilecek
- **AI geçidi ÇALIŞIYOR (2026-08-25).** Eski not "anahtar şu an çalışmıyor" diyordu;
  artık doğru değil. Vercel'de $9,18 kredi var, `swiip-api` anahtarının aylık $5
  tavanı kurulu ve `scripts/ai-gecit-dogrula.mjs` üç modelin üçünde de yeşil.
  Sunucudaki anahtar bu anahtarla aynı (doğrulandı). Panelde tek uyarı kalıyor:
  "billing address is missing or incomplete" — çağrıları engellemiyor ama adres
  senin girmen gereken bir şey.
- **Marka: Türkiye temiz, AB/İngiltere çekişmeli.** TMview taraması (2026-08-21):
  Türkiye'de "swiip" içeren **sıfır** kayıt — TÜRKPATENT'te 9/41/44 başvurusu yapılmalı.
  Ama İngiltere'de birebir `swiip` (sınıf 35/42, Hassan Hashmi) ve EUIPO'da `Swiipe`
  (sınıf 9/36, Swiipe ApS) tescilli. AB'de sınıf 9 başvurusunda `Swiipe` karşına çıkar.
  Global açılımdan önce marka vekiline danış.
- **Yedek üç katman da çalışıyor (2026-08-22'de uçtan uca doğrulandı).**
  1. Sunucuda her gece 03:15'te `scripts/yedek-al.sh` → `/opt/swiip/yedekler`
  2. Bu makineye çekme: `scripts/yedek-indir.mjs`, Windows görev zamanlayıcıda
     **Swiip-yedek-indir** adıyla her gün 09:30. Hedef `~/Swiip-yedekler`.
     Nesne deposu (Spaces) aylık ücretli ve kullanıcı sayısı sıfır; şart yine
     karşılanıyor, kopya sunucunun **dışında**. Betik her çalıştığında yerelde
     olmayan **bütün** dump'ları indiriyor — bir hafta kapalı kalan bilgisayar
     açıldığında haftanın hepsini alır.
  3. Geri yükleme: `scripts/yedek-geri-yukleme-testi.sh <dosya>` yerel kopyayı da
     kabul ediyor. Son test: 28 tablo, 439 besin, 1 kullanıcı, 28 yabancı anahtar.
     **Ayda bir tekrarla.**

  Dürüst sınır: bu makine kapalıysa o gün çekilmez ve makinenin kendisi de tek
  nokta. Gerçek kullanıcı gelmeye başlayınca uzak hedef tekrar değerlendirilmeli.
  Hedef bilinçli olarak OneDrive **dışında**: dump şifresiz ve içinde sağlık
  verisi var; fotoğrafı sunucuya bile yazmayan bir uygulamanın tüm veritabanını
  kişisel buluta kopyalaması tutarsız olurdu.

- **Gerçek zamanlı mağaza bildirimleri BAĞLANDI (2026-08-25).** Üçü de eksikti:
  - Apple: `subscriptionStatusUrl` boştu; ASC API ile yazıldı (üretim + sandbox, V2).
  - Play RTDN: Monetization setup'ta konu adı boştu. `projects/swiip-revenuecat/
    topics/Play-Store-Notifications` yazıldı ve etkinleştirildi.
  - RevenueCat > Swiip Android: "Connect to Google" yapıldı.
  Uçtan uca doğrulandı: Play'den test bildirimi gönderildi, RevenueCat panelinde
  "Last received" göründü. Öncesinde "No notifications received" yazıyordu.
  Bunlar bağlı değilken iade, iptal ve yenileme yalnızca yoklamayla öğreniliyordu;
  **parasını geri alan kullanıcı Pro kalıyordu.**
- **GCP'de üç servis hesabı anahtarı var** (`revenuecat-connect@swiip-revenuecat`):
  4 Ocak (yerel betiklerin kullandığı), 8 Temmuz ve 25 Ağustos. RevenueCat hangisini
  tuttuğunu panelde göstermiyor, o yüzden körlemesine silinmedi — silinen anahtar
  canlı fatura doğrulamasını durdurabilir. Sıra: yeni anahtar yükle → test olayıyla
  doğrula → kalan ikisini sil.
- Posta `bilgi@send.swiip.app` üzerinden gidiyor (Resend, eu-west-1). Kök `swiip.app`
  Resend'de başka bir takıma kayıtlı ve devralınamıyor — gönderen adresi bu yüzden alt
  alan adı. Uçtan uca denendi: kod e-postayla ulaştı, parola değişti.
- **App Store: 1.0 reddedildi — Guideline 2.1, Information Needed (2026-08-22).**
  Hata bulunmuş değil; yeni uygulamadan istenen sekiz bilgi. Cevap taslağı
  `magaza/appstore/inceleme-cevabi.md`. **Eksik iki şey var ve uydurulamaz:**
  fiziksel cihazda çekilmiş ekran kaydı (simülatör kabul edilmiyor) ve test edilen
  iPhone modeli + iOS sürümü listesi. Cevap Resolution Center'dan yazılıyor,
  aynı metin `App Review Information → Notes` alanına da konmalı.

  Gerekçe App Store Connect API ile **okunamıyor** — Resolution Center yalnızca
  konsolda. `scripts/apple-api.mjs` sadece durumu veriyor. Build 3 yüklemede
  ITMS-90725 almıştı (iOS 18.2 SDK; iOS 26 şart), build 4 sorunsuz ve `VALID`.
  **1.0 hâlâ build 4'e bağlı.** Build 5, 6, 7 yüklendi ve hepsi `VALID`, ama sürüm
  kaydı build 4'ü gösteriyor. Build 7'yi bağlamak da doğru değil: 2026-08-25
  denetimindeki düzeltmelerin hiçbiri hiçbir derlemede yok. Sıra: **build 8 üret →
  yükle → 1.0'a bağla → Health beyanını bitir → cevabı yaz → yeniden gönder.**

  `App Review Information → Notes` içindeki "Cancelling takes two taps from the top
  of Settings" cümlesi düzeltilmeli: iptal artık mağazanın abonelik sayfasını açıyor.
  Apple bu maddeyi birebir deniyor.
- **Play Health beyanı: 11'de 10.** Eksik adım `ACTIVITY_RECOGNITION` izni için
  gerekçe istiyor. O izni uygulama kullanmıyor — `expo-sensors` manifest birleşmesiyle
  ekliyor, biz yalnızca `Accelerometer` kullanıyoruz. `app.json`'a `blockedPermissions`
  eklendi; **yeni AAB yüklendikten sonra bu adım kendiliğinden kayboluyor.**
  Kullanılmayan bir izne gerekçe yazmak yanlış beyan olur.
- Play iç testi: "Select testers" seçilmemiş (3'te 2). Kapalı testten önce bitmeli.
- Play kapalı testi: 12 test kullanıcısı × 14 gün — Google'ın kuralı, kısaltılamıyor
- Play servis hesabı anahtarı `C:\Users\ruzzy\.play-keys\play-servis-hesabi.json`
  (`revenuecat-connect@swiip-revenuecat`). `scripts/play-*.mjs` bunu
  `PLAY_SERVIS_HESABI` ile bekliyor
- Play veri güvenliği formu tamamlandı (2026-08-22): satın alma geçmişi, fotoğraf
  (geçici işleniyor) ve uygulama içi eylemler eklendi. **Taslak olarak kaydedildi;
  incelemeye göndermek ayrı bir adım.** Ayrıntı `magaza/play/konsol-rehberi.md` bölüm 7.

## Dağıtım ve sunucu

Dağıtım `scripts/sunucu-dagit.sh` ile. Kaynağı `git archive` ile paketler, `/opt/swiip`
altına açar, `api` imajını kurar ve sağlık ucu 200 dönene kadar bekler. Dağıtılan commit
sunucuda `/opt/swiip/SURUM` dosyasında yazar.

Sunucudaki `/opt/swiip` bir git deposu **değil** — "hangi kod dönüyor" sorusunun tek
cevabı o dosya.

**Betik TÜM servisleri derliyor, yalnızca `api`'yi değil — bu satırı geri alma.**
Uzun süre `docker compose build api` yazıyordu. `gocmen` ve `tohumcu` aynı Dockerfile'ı
kullanıyor ama ayrı servisler, yani ayrı imajları var: `api` her dağıtımda tazelenirken
ötekiler ilk derlendikleri hâlde kalıyordu. `gocmen` göç dosyalarını **imajdan** okuyor.
Sonuç: o imaj derlendikten sonra eklenen **hiçbir göç veritabanına uygulanmadı.**

Kusur sessizdi — `gocmen` başarıyla çıkıyor (uygulayacak yeni dosya görmüyor), `api`
ayağa kalkıyor, sağlık ucu 200 dönüyor, dağıtım "başarılı" yazıyor. Ancak yeni tablo ilk
kez sorgulandığında 500 olarak görünüyor. 2026-08-25'te üretimde tam bu bulundu:
`kanca_olaylari` tablosu yoktu ve **abonelik kancası** — hakkı açan tek yol — 42P01 ile
patlıyordu. Yalnızca canlı bir kanca çağrısı denendiği için görüldü.
`dagitim.test.ts` artık dört maddeyi birden koruyor.

Erişim bilgileri (SSH, root parolası, DigitalOcean tokenı) depoda değil:
`Masaüstü/Swiip-YEDEK/sunucu-erisimi.md`. Kurulumu yapan oturum SSH anahtarını
kaydetmeyi unuttuğu için erişim bir kez kaybedildi ve parola sıfırlamayla geri alındı;
o dosyayı kaybetme.

## Bilinen en büyük risk

**Birim ekonomisi.** Marj artık düşünüldüğünden geniş — ama kural aynı: yeni bir yere
AI koymadan önce maliyetini hesapla.

2026-08-25'te ölçüldü. Ucuz seviye `anthropic/claude-haiku-4.5` ($1/$5) yerine
`google/gemini-3.1-flash-lite` ($0,25/$1,50) — dört kat ucuz, iki kat hızlı. Karar
tahminle değil dört adayın ürünün **gerçek sistem mesajlarıyla**, Türkçe, aynı
sorularla denenmesiyle verildi (koç tanı koyuyor mu, sayı uyduruyor mu; tanıma
yalnızca JSON dönüyor mu, besin değeri yazıyor mu). `alibaba/qwen3.7-flash` daha da
ucuzdu ama ~14 saniyede cevap veriyor; istemcinin zaman aşımı 20 sn ve koç o hızda
bozuk hissettirir. **Ucuzluk tek başına ölçüt değil.**

Ölçülen sonuç: tam kota kullanan bir Pro kullanıcı ayda **$0,093** (bütçe hedefi
$1,20). Vercel'deki $9,18 kredi ~98 Pro-kullanıcı-ayı ediyor; Haiku ile aynı para
23 ay ederdi.

Pahalı seviye bilerek Opus'ta kaldı: oradan yalnızca değerlendirme yorumlama (ömür
boyu 1-2 kez) ve vücut analizi (ayda ~1) geçiyor. Aylık katkısı birkaç kuruş ama
ikisi de kullanıcının gördüğü ilk cümle ve ölçüm üreten görsel yol.

`orta` seviyeyi kullanan tek iş `ogun_plani` ve o iş **hiç çağrılmıyor** — öğün
planlama baştan sona deterministik bir kısıt çözücü.

Ayrıca her program üretiminde bir AI çağrısı yapılıp **çıktısı %100 çöpe gidiyordu**
(`gerekceAnlat` sonucu yalnızca tek kararda uyguluyor, çağıran ise haftanın bütün
hareket kararlarını gönderiyor). Kaldırıldı; gerekçe zaten çözücünün karar izi.
