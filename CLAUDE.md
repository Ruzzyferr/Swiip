# Swiip

AI antrenör ve beslenme koçu uygulaması. Türkiye önce, global mimari.

**Bu dosya her oturumda otomatik yüklenir. Kod yazmadan önce `docs/spec.md` okunmalı.**

---

## Ürün tek cümlede

Kullanıcının sekiz kartta verdiği cevapları ve vücut fotoğrafını, **gerekçesi görünür** bir
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
| Değerlendirme | **8 kart, ~32 girdi, 4-6 dakika.** Soru sayısı bir vaat değil |
| Program | Statik doküman değil; her seans önceki geri bildirimden hesaplanır |
| Planlar | Ücretsiz · Temel 99₺/690₺ · Pro 169₺/1.190₺ |
| Ücretsiz kapsam | Vücut analizi (bir kez), 1. gün programı, manuel kalori girişi |
| Pro farkı | Fotoğraftan yemek tanıma (aylık 250) |

---

## Değerlendirme: sekiz kart, ~32 girdi

**Soru sayısı bir vaat değil.** Uzun süre öyle sanıldı; ölçüldüğünde tersi çıktı.

2026-08-25'te soru bankasının tamamı tarandı: her sorunun cevabı tek tek değiştirilip
üretilen profil, program, kalori/makro ve öğün kısıtları yeniden hesaplandı. Sonuç:

| | |
|---|---|
| Çıktıyı gerçekten değiştiren | 54 |
| Yalnızca başka bir soruyu açan | 7 |
| Yalnızca kart sonu metnini değiştiren | 2 |
| **Hiçbir şey yapmayan** | **73** |

Üçü zorunluydu (`H5`, `B24`, `F4`) — yani atlanamıyordu bile. `S1 -> S1a -> S1b` zinciri
kullanıcıya "kalp rahatsızlığım var" dedirtip iki soru daha soruyor, sonunda hiçbir şey
yapmıyordu. `S4`'te "Osteoporoz" işaretlenebiliyor ve program değişmiyordu.

Bugün banka 53 soru: **40 temel** (sekiz kart), **10 keskinleştirme**, **3 periyodik**.

**Kural — bozulmasın:** `soruTuketimi.test.ts` bankadaki her sorunun bir tüketicisi
olmasını şart koşuyor. Bir soru ya kodda okunuyor, ya bir dalı açıyor. İkisi de değilse
CI kırmızı. Bir dalın ölü zincire çıkması da yasak. `drives` alanı artık bir söz değil,
doğrulanan bir şey.

**Keskinleştirme.** Geri bildirim döngüsünün 1-2 haftada öğrenebileceğini ilk gün sormuyoruz
(yükler, teknik güveni, salon kalabalığı, partner, istenmeyen hareketler). Ama bu sorular
kaybolmuyor: `programUret` her havuz elemesini bir karara ve o kararı bir `soru_id`'ye
bağlıyor. Cevaplanmamış bir soru bir kararı etkilediyse program bunu **görünür bedeliyle**
söylüyor — *"Karmaşık serbest ağırlık hareketlerini çıkardım, tekniğine ne kadar
güvendiğini bilmiyorum · 10 hareket geri gelir"*. Dırdır değil, kazanılmış teklif.

**Bir tuzak var, tekrar kurulmasın:** `teknikGuveni` cevapsız A8'de sabit `2.5` dönüyordu
ve `DUSUK_GUVEN_ESIGI` de tam `2.5`, karşılaştırma `<=`. Yani A8'i görmeyen HERKES teknik
zorluk tavanı 3'e düşüyor, barbell squat (4), omuz presi (4) ve deadlift (5) havuzdan
siliniyordu. A8 akıştan çıkınca bu, beş yıllık kullanıcıya yeni başlayan programı çıkarmak
olurdu. Varsayılan artık antrenman yaşından türüyor (yeni 2 · orta 2,5 · ileri 3,5) ve
**deadlift hiçbir varsayılanla açılmıyor** — zorluk 5 yalnızca açık beyanla geliyor.

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

Renk: mürekkep `#131614`, aksan çam yeşili `#14615A`, zemin `#ECEEED`.
Zemin bir ton soğutuldu (`#F6F7F5` → `#ECEEED`, gerekçesi `tokens.ts`'te):
eski değer kâğıdımsıydı, ölçü aleti gövdesi kâğıt değil metaldir.
**Yan etkisi ölçüldü:** soğuk zemin, beyaz kart kenarının kontrastını iki
katına çıkarıyor (ΔL* 2,9 → 6,1). Aşağıdaki "beyaz kartlar ekranı bölüyor"
itirazının muhtemel kök nedeni bu — kutuları sökmeden önce düşünülmeli.
**Neon veya turuncu kullanma** — kategorinin tamamı orada.

Tipografi: başlıklarda grotesk, sayısal veride tabular rakamlı monospace.

---

## Klasör düzeni

```
docs/spec.md              Tam spesifikasyon. Kod yazmadan önce oku.
docs/uygulama-plani.md    Faz ve görev sırası, bitti kriterleriyle
docs/rakip-analizi.md     15.000 yorumluk araştırma — kararların dayanağı
data/sorular.json         53 soru (40 temel + 10 keskinleştirme + 3 periyodik), makine okunur
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
  1b. ~~`₺` işareti sayısal fontta yok~~ — **ÇÖZÜLDÜ.** `tasarim/para.ts` para
     dizesini rakam ve sembol parçalarına bölüyor: rakamlar monospace, sembol
     arayüz fontunda basılıyor. `para.test.ts` fontun cmap'ini her koşuda yeniden
     ölçüyor. Cihazda doğrulandı (2026-08-26): paywall'da `₺169` düzgün çiziliyor.
  2. 23 hareket görselsiz. Kaynak (free-exercise-db, kamu malı) bunları içermiyor —
     çoğu mobilite ve ısınma. `data/medya-eslemeleri.json` içinde `null` olarak
     kayıtlı: "bakıldı, bilinçli olarak boş". Yanlış görsel görselsizden kötüdür.

  **Taksimat kuralı — bozulmasın:** motif yalnızca kullanıcının değer girdiği ya da bir
  ölçüm okuduğu yerde kullanılır. Şu an iki yerde: değerlendirme cetveli ve yağ oranı
  skalası. Navigasyonda, kart kenarında, düz metin altında çentik yok. Ekran başına tek
  ölçek: ikincisi konduğunda arayüz kumpas değil, bozuk bir ses mikseri gibi görünür.

- **Play kapalı testi: 14 günlük sayaç HENÜZ BAŞLAMADI (2026-08-26).**
  Konsolun kendi satırı: *"Have at least 12 testers opted-in to your closed test —
  **1 tester currently opted-in**"*. İz sekmesindeki e-posta listesi "Testers" 16 kişi
  içeriyor ama Google'ın saydığı şey davet değil **katılım**: 16 davetliden yalnızca
  1'i opt-in bağlantısını açıp teste girmiş. Yükleme tabanı da bunu doğruluyor (1 kişi).

  Yani "12 kişi × 14 gün" şartının sayacı hiç çalışmaya başlamadı. Liste eklemek
  katılım değil — aynı sınıf: yedek görevi, `eas submit` taslak sürümü.
  **Yapılacak:** kapalı test izindeki "Join on the web / Join on Android" bağlantısını
  16 testçiye gönder, her birinin KABUL ettiğini dashboard'dan say. Sayanç 12'ye
  ulaşınca başlar; üretime başvuru ondan 14 gün sonra.

- **Play ön-yayın raporu HİÇ üretilmemiş.** 5 paket yüklendi (vc 6-10), rapor yok.
  Ayarlarda "Provide test account credentials" zorunlu alanı "Don't provide"ta duruyor
  ve uygulamanın tamamı giriş ekranının arkasında — kimlik verilmeden Google'ın
  tarayıcısı yalnızca giriş ekranını görür. `inceleme-ucretsiz@swiip.app` hesabı
  Apple için zaten kuruldu; aynısı buraya da girilebilir. "Uygulama çökmez" vaadini
  bedavaya sınayan tek otomatik araç ve kapalı duruyor.

- **Apple: "Regulated Medical Device" beyanı yapılmamış.** App Information → App Store
  Regulations & Permits altında düğme hâlâ "Declare Regulated Medical Device" diyor.
  Apple'ın metni: Health &amp; Fitness kategorisindeki uygulama, **belirli bölgelerde
  dağıtıma devam edebilmek için** tıbbi cihaz olup olmadığını beyan etmek zorunda.
  Cevap kolay (inceleme notları zaten "not a medical device" diyor) ama beyan şart.

- **Yaş derecelendirmesi: kusur DEĞİL, ve şu an değiştirilemez de.**
  Önce "9+ ama uygulama 18 yaş altını reddediyor" diye tutarsızlık sanılmıştı.
  2026-08-26'da ASC API'den anketin tamamı okundu ve resim değişti:

  ```
  healthOrWellnessTopics                 true    <<< tek "true" bu
  medicalOrTreatmentInformation          NONE
  ageRatingOverride                      NONE
  (diğer 26 sorunun hepsi false / NONE)
  ```

  Yani **9+ tek bir DOĞRU cevaptan geliyor**: uygulama sağlık/wellness konuları
  içeriyor. Apple'ın yaş derecelendirmesi bir **içerik** derecelendirmesidir,
  erişim kontrolü değil — bir bankacılık uygulaması da 4+ olup 18 yaş şartı koyar.
  `K7` kapısının varlığı anketin cevabını değiştirmiyor.

  Ayrıca **şu an teknik olarak da değiştirilemez**: `appInfos.state` = `IN_REVIEW`.
  App Information (yaş derecelendirmesi dahil) sürümle birlikte inceleniyor.

  Yine de yükseltmek istenirse yolu var: `ageRatingOverride` alanı (şu an `NONE`)
  17+/18+ yapılabiliyor. Ama **inceleme sonuçlandıktan sonra** — şimdi dokunmak
  incelemedeki sürümü riske atar ve kazanılan bir şey yok.

- **Pub/Sub: Conversa, SWIIP'in RTDN konusunu kullanıyor.**
  `projects/swiip-revenuecat/topics/Play-Store-Notifications` konusuna iki push
  aboneliği bağlı: `...-app0ee7872a7b` (Swiip Android, doğru) ve `...-app4d2c3ef35f`
  (**Conversa (Play Store)**, `com.conversa.app`). Sebep: Conversa'nın Play
  Console'undaki konu adı da aynı konuyu gösteriyor. Sonuç çift yönlü — Swiip'in
  satın alma/iptal/iade olayları Conversa'nın RevenueCat projesine, Conversa'nınkiler
  Swiip'inkine düşüyor. RevenueCat paket adına göre elediği için yanlış hak
  açılması beklenmiyor, ama iki ürünün ödeme olayları birbirinin projesine akıyor.
  (Cheep doğru yapmış: kendi konusu `cheep-play-rtdn`.)
  **Sıra önemli:** önce Conversa kendi konusuna taşınsın, sonra
  `RevenueCat-Subscriber-app4d2c3ef35f` bu konudan silinsin.

- TürKomp kullanım koşulları yazılı teyit edilecek

## 2026-08-26 denetiminde panelden yapılanlar

Üçü de panelde uygulandı ve geri okunarak doğrulandı:

1. **Apple · Regulated Medical Device beyanı yapıldı.** App Information → App Store
   Regulations & Permits artık "This app has been declared not a regulated medical
   device in any country or region." diyor. Sürüm 1.0 beyandan sonra da
   `WAITING_FOR_REVIEW` olarak kaldı — gönderim bozulmadı (API ile doğrulandı).

2. **Play · ön-yayın raporu için test hesabı kimliği girildi.** Pre-launch report →
   Settings artık "Provide credentials" ve `inceleme-ucretsiz@swiip.app`. Hesap
   önce üretimde denendi (`/v1/kimlik/giris` → 200, token döndü). Rapor bir sonraki
   AAB yüklemesinde kendiliğinden üretilecek; şu an "Upload artifacts" diyor.

3. **Pub/Sub · Conversa kendi konusuna taşındı.** Artık Swiip'in RTDN konusunda
   yalnızca Swiip'in aboneliği var. Sıra bilerek şöyle işletildi:

   1. `conversa-play-rtdn` konusu açıldı,
   2. çalışan `cheep-play-rtdn` konusunun izinleri okundu ve aynısı verildi
      (`google-play-developer-notifications@system.gserviceaccount.com` → Pub/Sub Publisher),
   3. RevenueCat > Conversa (Play Store) → Disconnect → yeni konu → Connect,
   4. Play Console > Conversa → Monetization setup → yeni konu adı,
   5. iki uygulamadan da test bildirimi gönderilip iki panelden geri okundu.

   Sonuç: Conversa "Last received" 18 Ağustos → **26 Ağustos 09:27 UTC**,
   Swiip → **09:29 UTC**. İki zincir de sağlam.

   **Öğrenilen:** RevenueCat'te "Disconnect from Google" servis hesabı kimliğini
   SİLMİYOR ("File saved" ve "Valid credentials" duruyor), yalnızca konu seçimini
   açıyor. Başka bir ürünün kimlik JSON'u elimizde olmasa bile bu geçiş güvenli.

**Yapılmayan, bilerek:** yaş derecelendirmesi (sürüm incelemede, düzenlemek onu
incelemeden çıkarabilir — inceleme sonuçlanmadan dokunulmayacak) ve testçi daveti
(`scripts/testci-daveti.mjs` hazır; 16 gerçek kişiye posta gitmesi kullanıcının
kararı). Play sayacı hâlâ **1/12**.

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

     2026-08-25'te bu katmanın ölü olduğu bulundu (görevin çalışma dizini
     `C:\dev\Made2Fit` — taşınmadan önceki ad — gösteriyordu ve her sabah
     `LastTaskResult = 1` ile düşüyordu). **Düzeltildi ve doğrulandı (2026-08-26):**
     çalışma dizini artık `C:\dev\Swiip`, `LastRunTime` 26.08 09:39,
     `LastTaskResult` **0**, yerelde 22-26 Ağustos dump'ları sırasıyla duruyor.

     Kusur "uçtan uca doğrulandı" denmiş olmasına rağmen durdu, çünkü doğrulama
     **betiği** çalıştırmıştı, **görevi** değil. Betik her zaman çalışıyordu.
     Bundan sonra kontrol şu:

     ```powershell
     Get-ScheduledTaskInfo -TaskName 'Swiip-yedek-indir' |
       Select-Object LastRunTime, LastTaskResult   # 0 olmalı
     ```

     Aylık geri yükleme testiyle **aynı turda** bakılacak. Yol değiştiren bir
     zamanlanmış görev sessizce ölür; hiçbir şey uyarmaz.
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
- **GCP'deki üç servis hesabı anahtarının ÜÇÜ DE KULLANIMDA — hiçbiri silinmeyecek.**
  `revenuecat-connect@swiip-revenuecat` altında üç anahtar var ve 2026-08-26'da
  RevenueCat panellerinden tek tek okundu; her biri ayrı bir uygulamaya bağlı:

  | Anahtar | Tarih | Kullanan |
  |---|---|---|
  | `0c19f00fab…` | 4 Ocak | **Swiip Android** + yereldeki `scripts/play-*.mjs` |
  | `1fb2aea794…` | 8 Temmuz | **Conversa Android** |
  | `881ba0e978…` | 25 Ağustos | **Cheep Android** |

  Eski not "kalan ikisini sil" diyordu; o plan uygulansaydı Conversa ve Cheep'in
  canlı fatura doğrulaması kesilirdi. Üç anahtarın varlığı bir birikinti değil,
  üç ayrı uygulamanın aynı servis hesabını paylaşmasının sonucu.

  Gerçek risk başka: **üç uygulama tek servis hesabını paylaşıyor.** O hesap
  üçünün de Play faturalandırmasına erişiyor; biri sızarsa üçü birden etkilenir.
  Doğru düzeltme silmek değil AYIRMAK: her uygulamaya kendi servis hesabı.
  Acıl değil, ama üçünü de "artık gereksiz" sanıp silmekten çok daha doğru.
- Posta `bilgi@send.swiip.app` üzerinden gidiyor (Resend, eu-west-1). Kök `swiip.app`
  Resend'de başka bir takıma kayıtlı ve devralınamıyor — gönderen adresi bu yüzden alt
  alan adı. Uçtan uca denendi: kod e-postayla ulaştı, parola değişti.
- **App Store: 1.0 reddedildi — Guideline 2.1, Information Needed (2026-08-22).**
  Hata bulunmuş değil; yeni uygulamadan istenen sekiz bilgi. Cevap taslağı
  `magaza/appstore/inceleme-cevabi.md`. Altı maddesi `App Review Information → Notes`
  alanında hazır.

  **Notes alanı artık depodan yönetiliyor:** kaynak `magaza/appstore/inceleme-notlari.md`
  içindeki ```notlar bloğu, yükleyici `scripts/apple-notlar.mjs`. Betik 4.000 karakter
  sınırını yazmadan ÖNCE kontrol ediyor ve yazdıktan sonra alanı geri okuyup doğruluyor —
  konsol sınırı aşan metni sessizce kırpıyor. Gövde 3.762 karakter; kalan 238 karakter
  bilerek boş: Apple'ın 1. (ekran kaydı) ve 2. (denenen cihazlar) soruları oraya giriyor.

  ```bash
  node scripts/apple-notlar.mjs --dene --kayit "<url>" --cihazlar "iPhone 15 Pro (iOS 26.0)"
  ```

  **Bende yapılabilecek her şey bitti (2026-08-25):** build 12 `VALID` ve 1.0'a
  **bağlı**; dört abonelik de aynı gönderime ekli ve `READY_FOR_REVIEW`; inceleme
  hesabı uçtan uca denendi (giriş 200, değerlendirme tamam, hafta 1 programı, bu
  haftanın öğün planı, Pro hakkı). Sürüm `PREPARE_FOR_SUBMISSION`, cihaz ailesi
  yalnızca iPhone, 6.7" ekran görüntüsü seti yüklü — iPad istenmiyor.

  **İki inceleme hesabı var, ve ikincisi zorunlu.** `inceleme@swiip.app` Pro; ödeyene
  upsell göstermediğimiz için o hesapta Ayarlar'daki "Planlara bak" düğmesi **hiç
  çıkmıyor** (`promosyon_goster: false`). Notlar Apple'a "Settings → Planlar" diyordu;
  inceleyici satın alma ekranına asla ulaşamazdı — tek başına ret sebebi.
  `scripts/inceleme-hesabi-kur.mjs` ücretsiz katmanda, değerlendirmesi tamamlanmış
  ikinci hesabı kuruyor (`inceleme-ucretsiz@swiip.app`) ve inceleyicinin göreceği dört
  şartı geri okuyup doğruluyor. Testçi senaryosu `magaza/appstore/video-cekim-talimati.md`.

  **Kalan iki şey uydurulamaz:** fiziksel cihazda çekilmiş ekran kaydı (simülatör
  kabul edilmiyor) ve test edilen iPhone modeli + iOS sürümü. Bunlar girilmeden
  gönderim tekrarlanmadı — 2.1'e yarım cevap vermek bir inceleme turu daha harcar.

  **Build'i sürüme bağlamak ayrı bir adım.** Sürüm kaydı hangi build'i gösteriyorsa
  Apple onu inceliyor. Build 5-9 yüklenip hiçbiri bağlanmadığı için sürüm uzun süre
  build 4'ü gösterdi. Yükleme bağlama demek değil.

  Reddedilen gönderim (`897eade5…`) hâlâ açık: `UNRESOLVED_ISSUES`, sürüm ögesi
  `REJECTED`, diğer beş öge `READY_FOR_REVIEW`. Gerekçe metni App Store Connect API
  ile **okunamıyor** — Resolution Center yalnızca konsolda; `scripts/apple-api.mjs`
  sadece durumu veriyor.

  **EAS ücretsiz iOS derleme kotası bu ay doldu, 1 Eylül'de sıfırlanıyor.** Masaüstündeki
  simülatör `.app`'i bu yüzden build 11'de kaldı (build 12'den tek farkı izin metinleri).
- **Play: versionCode 6 iç testte YAYINDA (2026-08-25).** `eas submit` paketi yüklüyor
  ama sürümü **taslak** bırakıyor — taslak sürüm test cihazlarına inmiyor, yani konsolda
  "yüklendi" görünürken kimse kuramıyor. Yayına almak ayrı bir adım:
  `PLAY_SERVIS_HESABI=… node scripts/play-yayinla.mjs internal <versionCode>`.
  Betik taahhütten sonra izi geri okuyup doğruluyor.
- **Play Health beyanı: 11'de 10.** Eksik adım `ACTIVITY_RECOGNITION` izni için
  gerekçe istiyor. O izni uygulama kullanmıyor — `expo-sensors` manifest birleşmesiyle
  ekliyor, biz yalnızca `Accelerometer` kullanıyoruz. `app.json`'a `blockedPermissions`
  eklendi; **yeni AAB yüklendikten sonra bu adım kendiliğinden kayboluyor.**
  Kullanılmayan bir izne gerekçe yazmak yanlış beyan olur.

  Aynı yerde bir kez yanlış yapıldı: üretilen AAB'de `android.permission.DUMP` görülüp
  engellenmeye çalışıldı. O bir `uses-permission` değil, AndroidX'in
  `ProfileInstallReceiver`'ı üzerindeki `android:permission` **koruması**. Paketi
  `grep`lemek yetmiyor, bağlamına bakmak gerekiyor.
- **Play: uygulama 2026-08-25'te ilk kez incelemeye GÖNDERİLDİ.** O güne kadar
  "taslak uygulama"ydı ve bu, kapalı testi API'den yayına almayı engelliyordu:

      "Only releases with status draft may be created on draft app."

  Konsoldan tamamlananlar: Advertising ID beyanı (**Hayır** — pakette `AD_ID` izni
  ve `gms.ads` yok, Google'ın kendi kuralına göre kullanan bir SDK olsa izin
  manifeste birleşirdi), kapalı test için ülke (Türkiye), her iki ize 16 kişilik
  mevcut "Testers" listesi, geri bildirim adresi, ve sürüm notu.

  Sağlık beyanı **kendiliğinden düştü** — yeni paketten `ACTIVITY_RECOGNITION`
  çıktığı için. App content artık "You're all caught up".

  Sonuç: 14 değişiklik incelemede, kapalı test sürümü `draft` → `completed`.
  Google tipik olarak 7 gün içinde sonuçlandırıyor.

  **Sürüm notu konsolda dil etiketi istiyor:** düz metin `Line 1: text outside
  language tags` hatası veriyor, `<tr-TR>…</tr-TR>` ile sarılmalı. API'de böyle bir
  şey yok (`releaseNotes: [{language, text}]`), yalnızca konsol alanı için.

  **Yayın hattının izi `alpha` (kapalı test).** 2026-08-25'te çevrildi: uygulama
  taslaktan çıktı, kapalı testte yayında bir sürüm var ve `internal` izi artık gereksiz
  bir ara durak. `gh variable set PLAY_IZ --body alpha` yapıldı.

  Aynı gün bir kez terfi gerekti: vc=10 `internal`'a yüklenmişti, kapalı test hâlâ
  vc=7'deydi. `play-yayinla.mjs` yalnızca izde ZATEN var olan sürümü yayına alıyor,
  terfi etmiyor. Değişkeni çevirdikten sonra bu bir daha gerekmiyor.

- Play iç testi: "Select testers" seçilmemiş (3'te 2). Kapalı testten önce bitmeli.
- Play kapalı testi: 12 test kullanıcısı × 14 gün — Google'ın kuralı, kısaltılamıyor
- Play servis hesabı anahtarı `C:\Users\ruzzy\.play-keys\play-servis-hesabi.json`
  (`revenuecat-connect@swiip-revenuecat`). `scripts/play-*.mjs` bunu
  `PLAY_SERVIS_HESABI` ile bekliyor
- Play veri güvenliği formu tamamlandı (2026-08-22): satın alma geçmişi, fotoğraf
  (geçici işleniyor) ve uygulama içi eylemler eklendi. **Taslak olarak kaydedildi;
  incelemeye göndermek ayrı bir adım.** Ayrıntı `magaza/play/konsol-rehberi.md` bölüm 7.

## Yayın hattı (GitHub Actions)

`.github/workflows/yayin.yml` — CI yeşil bittiğinde çalışıyor (`workflow_run`), main'e
giren ürün değişikliğini iki mağazanın **test** izlerine götürüyor: Play kapalı test
(`alpha`) ve TestFlight. **Mağazaya göndermek elle kalıyor, bilerek.**

Adımlar: sürüm notu üret → derle → yükle → yayına al → notu yaz → etiketle.

Bilinmesi gerekenler:

- **Sürüm sayacı EAS'te.** `appVersionSource` `local`den `remote`a alındı. Yerelken
  `autoIncrement` app.json'ı koşucuda artırıyordu ve o değişiklik commit edilmediği
  için kayboluyordu: her koşu aynı numarayı üretir, mağaza yinelenen sürümü reddederdi.
  Sayaç iOS 12 / Android 6'ya tohumlandı. `app.json`'daki `buildNumber` ve
  `versionCode` **silindi** — uzak kaynakta yok sayılıyorlar ve orada durmaları
  "sürüm bu" diye okunacak bir tuzaktı.
- **Kapı var.** Son `yayin-*` etiketinden beri `apps/mobile`, `packages/core` veya
  `packages/shared` değişmediyse derleme atlanıyor. `packages/api` bilerek listede
  yok: sunucu kodu mobil pakete girmiyor, yalnız API'yi düzelten bir commit iki
  derleme birden yakardı.
- **Derleme GitHub koşucularında, EAS bulutunda DEĞİL** (`eas build --local`).
  iOS `macos-15`, Android `ubuntu-latest` + JDK 17. EAS yalnızca kimlik çözümü ve
  sürüm sayacı için kullanılıyor.

  Sebep ölçüldü: EAS ücretsiz planının aylık iOS derleme kotası 2026-08-25'te doldu
  (1 Eylül'de sıfırlanıyor) ve hat doğruyken günlerce hiçbir şey çıkmayacaktı.
  Yerel derlemede o kota hiç devreye girmiyor. Bulut kuyruğu da ücretsiz planda
  uzun; aynı gün bir Android derlemesi 15 dakikadan fazla kuyrukta bekledi.

  **Bir ara iOS elle tetiklemeye alınmıştı; geri alındı.** Gerekçe ölçülmüştü: özel
  depolarda macOS çarpanı **10** ve 2026-08-25'te iki iOS derlemesi (29 ve 24 dakika)
  **528 faturalanan dakika** yedi.

  O gerekçe artık yok — **depo herkese açık** ve herkese açık depolarda GitHub Actions
  ücretsiz ve sınırsız, macOS dahil. Karar ölçülmüş bir maliyete dayanıyordu; maliyet
  ortadan kalkınca kararın da kalkması gerekti.

  **Kural: main'e giren her ürün değişikliği İKİ mağazanın test izine birden gider** —
  Play kapalı test (`alpha`) ve TestFlight. Yalnız birine gitmesi, iki mağazanın farklı
  sürümleri test etmesi demek; hangi hatanın hangi derlemede olduğu kaybolur.
  `yayinHatti.test.ts` ikisinin de otomatik kalmasını kilitliyor.

  Elle tetikleme tek platform için hâlâ çalışıyor:

      gh workflow run yayin.yml -f platform=ios

- **iOS işinde SDK kapısı var.** Apple, paketin iOS 26 SDK'sıyla derlenmiş olmasını
  şart koşuyor; build 3 bu yüzden ITMS-90725 ile geri döndü. Koşucu imajı eskiyse
  derleme sorunsuz biter ve iş yalnızca YÜKLEMEDE patlar — 30 dakika macOS dakikası
  harcandıktan sonra. Kontrol derlemeden önce, en başta.

- **`eas submit` yerel dosyayı `--path` ile alıyor**, `--latest` ile değil: yerel
  derleme EAS'in derleme listesinde görünmüyor. Aynı sebeple Play'de yayına alınacak
  versionCode `en-yeni` ile izin kendisinden okunuyor.
- **İmzalama malzemesi depoda değil** (`credentialsSource: local`, `kimlik/` ve
  `credentials.json` gitignore'da). Koşucu bunları sırlardan `credentials.json`'ın
  beklediği göreli yollara yazıyor, yani CI ile yerel derleme aynı kimlikle imzalıyor.
- **`eas.json`'da ayrı bir `ci` gönderim profili var.** `uretim` profili mutlak
  Windows yolları tutuyor (`C:/Users/ruzzy/...`) ve Linux koşucusunda yok.
- **Play sürümü taslak kalır.** `eas submit` yüklüyor ama yayına almıyor;
  `scripts/play-yayinla.mjs` alıyor ve sürüm notunu orada yazıyor.

Gereken sırlar (hepsi kurulu): `EXPO_TOKEN`, `ASC_API_KEY_P8` (base64), `ASC_KEY_ID`,
`ASC_ISSUER_ID`, `PLAY_SERVIS_HESABI_JSON`, `CREDENTIALS_JSON`, `ANDROID_KEYSTORE_B64`,
`IOS_DIST_P12_B64`, `IOS_PROVISION_B64`.

**Bildirim.** Her koşunun sonucu — başarı, başarısızlık ve "atlandı" dahil — e-posta
olarak `info@swiip.app`'e gidiyor (`scripts/bildirim-gonder.mjs`). Yol ürünün zaten
kullandığı Resend; yeni servis yok. GitHub'ın kendi e-postası yeterli değil: yalnız
başarısızlıkta, yalnız commit'i atana ve kişinin bildirim ayarına bağlı olarak gidiyor.

İş `always()` ile koşuyor. Yalnız başarıda koşan bir bildirim sessizliği "her şey
yolunda" diye okutur; oysa sessizlik hem başarı hem çöküş anlamına gelir.

**Telegram isteğe bağlı ve kurulu değil.** Bot token'ı BotFather'dan alınıyor, o yüzden
bende üretilemedi. İstenirse iki sır yeter, betik kendiliğinden devreye giriyor:

1. Telegram'da **@BotFather**'a `/newbot` yaz, adı ver, sana bir token verir.
2. Bota bir mesaj at, sonra
   `https://api.telegram.org/bot<TOKEN>/getUpdates` adresini aç ve `chat.id`'yi al.
3. `gh secret set TELEGRAM_BOT_TOKEN` ve `gh secret set TELEGRAM_SOHBET_ID`.

Hiçbir kanal kurulu değilse betik **hata veriyor** — "bildirim kurdum" deyip hiçbir
yere göndermemek, bildirimin hiç olmamasından kötü.

Sürüm notu `scripts/surum-notlari.mjs` ile commit konularından üretiliyor. Hedef kitle
kapalı test ve TestFlight **testçileri**, halka açık mağaza metni değil — o zaten elle
yazılıyor. Bir commit'e başka bir cümle gerekiyorsa gövdeye `not: ...` satırı eklenir.
Play'in sınırı 500 karakter, TestFlight'ın 4.000; ikisi ayrı üretiliyor ve kaç madde
düştüğü yazılıyor.

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

**İki şey sessizce hiç dağıtılmıyordu — 2026-08-26'da bulundu ve düzeltildi.**

1. **Marka sitesi hiçbir dağıtımda güncellenmiyordu.** `git archive` yalnızca
   `infra magaza packages scripts` gönderiyordu ve yorumu "apps/ gönderilmiyor:
   mobil uygulama sunucuda derlenmiyor" diyordu. Doğru ama eksik: aynı depodaki
   `docker-compose.yml` Caddy'ye `../apps/site:/site:ro` bağlıyor, yani site
   sunucudaki **o klasörden** servis ediliyor. Sunucudaki kopya ilk kurulumdan
   (21 Ağustos) kalmıştı ve dört dosyadan üçünün md5'i depodakinden farklıydı —
   **canlıdaki gizlilik politikası ve hesap silme sayfası depodakiyle aynı değildi.**
   İkisi de mağaza incelemesinde tıklanan bağlantılar.

2. **Caddyfile değişikliği konteynere hiç ulaşmıyordu.** Yukarıdaki düzeltme
   dağıtıldı, sunucudaki `infra/Caddyfile` güncel görünüyordu — ama yanlış yollar
   hâlâ 200 ile ana sayfayı döndürüyordu. Konteynerin içine bakınca oradaki dosyanın
   eskİ olduğu görüldü (`handle_errors` sayısı 0).

   Sebep bir Docker davranışı: `Caddyfile` konteynere **tek dosya** olarak bağlanıyor
   ve Docker tek dosya bağlantısını **inode'a** bağlıyor. `tar -xzf` dosyayı yerinde
   değiştirmiyor; siliyor ve yenisini oluşturuyor — yani yeni inode. Konteyner eski
   inode'u tutmaya devam ediyor. `docker compose up -d` de yardım etmiyor: compose
   dosyası değişmediği için caddy'yi "Running" bırakıyor. **`caddy reload` bile
   yetmedi** — okuduğu dosyanın kendisi eskiydi.

   Düzeltme: `up -d --force-recreate caddy`. `dagitim.test.ts` artık üç şeyi
   koruyor: compose'un bağladığı her yol pakette olmalı, caddy zorla yeniden
   oluşturulmalı, ve bu adım normal `up`'tan **sonra** gelmeli.

   Canlıda doğrulandı: `/bulunmayan-sayfa`, `/destek.html`, `/.env` → **404**
   ("Sayfa bulunamadı — Swiip"); `/gizlilik` → 200 "Gizlilik — Swiip";
   `/`, `/gizlilik.html`, `/stil.css`, `/saglik` → hepsi 200, bozulma yok.

> Bu, bu depoda **üçüncü kez** yakalanan aynı sınıf kusur: önce `gocmen` imajı,
> sonra yedek görevi, şimdi Caddy. Ortak deseni şu — bir şey yapıldığı **sanılıyor**,
> başarısızlık gibi görünmüyor ve hiçbir şey uyarmıyor. Dağıtımdan sonra "değişen
> şey gerçekten değişti mi" diye **dışarıdan** bakmak, betik çıktısına güvenmekten
> daha ucuz.

**BU SÜRÜM TEK BAŞINA DAĞITILMAZ — mobil derlemeyle birlikte çıkar.**

Değerlendirme sekiz karta indirilirken blok kimlikleri de değişti (`S`→`G`, `A` artık
"Ağrı", `Y`/`T`/`F` kalktı). Kart sonu geri bildirimi sunucuda **blok kimliğine göre**
üretiliyor (`geriBildirim.ts` içindeki `URETICILER`). Yeni API'yi tek başına dağıtırsan
mağazadaki eski derleme eski kimlikleri gönderir, eşleşme bulunamaz ve
`blok_geri_bildirimi` **null** döner.

Uygulama çökmez, hata da vermez — yalnızca "emeğin karşılığını gör" ekranı hiç çıkmaz.
Yani terke karşı en güçlü kozumuz sessizce kaybolur, ve inceleyicinin göreceği ilk şey
tam orası. Cevapların kendisi güvende: `/cevap` tanımadığı soru kimliğini reddetmiyor,
sessizce saklıyor; yeni zorunlu küme de eskisinin alt kümesi.

Sıra: mobil derleme mağaza testine çıksın → sunucu dağıtılsın.

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
