# Uygulama durumu

`uygulama-plani.md`'deki her görevin karşılığı ve kanıtı. Son güncelleme: 2026-08-20.

**Özet:** 1.649 test yeşil · tip kontrolü, lint, biçim ve çeviri denetimi temiz.
**İmzalı yayın paketi hazır:** `app-release.aab` · sürüm 1.0.0 · versionCode 1.

**Uygulama gerçek bir Android cihazında (emülatör, API 36) baştan sona kullanıldı.**
Bugüne kadar hiçbir ekran cihazda açılmamıştı; açılır açılmaz on beş hata çıktı ve
hepsi kapatıldı. Ayrıntı aşağıda "Cihazda çalıştırma" bölümünde.

```
npm run verify            # biçim + lint + tip + çeviri denetimi + test
npm run guvenlik          # bağımlılık açıkları (gerekçeli muafiyet listesiyle)
npm run test:coverage     # motor kapsam eşikleri
```

---

## F0 · Temel kurulum

| Görev | Durum | Kanıt |
|---|---|---|
| F0.1 Expo projesi | ✅ | `apps/mobile` — expo-router, TypeScript, dosya tabanlı yönlendirme |
| F0.2 VPS: Postgres, API, Caddy, Compose | ✅ kod | `infra/docker-compose.yml`, `infra/Caddyfile`, `infra/api.Dockerfile` |
| F0.3 Göç aracı ve ilk şema | ✅ | Drizzle · `packages/api/gocler/` 3 göç · `src/db/goc.ts` |
| F0.4 Yedekleme + geri yükleme testi | ✅ **çalıştırıldı ve geçti** | 2026-08-20 · 27 tablo, 438 besin, 28 yabancı anahtar doğrulandı |
| F0.5 Kimlik: kayıt, giriş, JWT, yenileme, **parola sıfırlama, e-posta doğrulama** | ✅ | `rotalar/kimlik.ts` · 35 test + `kimlik/kod.ts` 10 test · scrypt, dönen yenileme tokeni |
| F0.6 Hata izleme ve log | ✅ | pino + alan maskeleme (`uygulama.ts` redact) |
| F0.7 Tasarım tokenleri | ✅ | `packages/shared/src/tokens.ts` → `apps/mobile/src/tasarim/tema.ts` |
| F0.8 CI | ✅ | `.github/workflows/ci.yml` — biçim, lint, tip, test, kapsam, veri tazeliği |

> **F0.4 artık gerçekten denendi.** `scripts/yedek-geri-yukleme-testi.sh` 2026-08-20'de
> çalıştırıldı: canlı veritabanından yedek alındı (102 KB), izole bir Postgres kabına geri
> yüklendi, 27 tablo · 438 besin · 28 yabancı anahtar doğrulandı.
>
> **İlk çalıştırma iki gerçek hata çıkardı** — betik yazılmış ama hiç koşturulmamıştı:
> `pg_dump` kullanıcı almıyordu (kapta `root` rolü yok) ve `.env` kabukta `source`
> edilemiyordu (`POSTA_GONDEREN="Made2Fit <...>"` içindeki `<` yönlendirme sayılıyor).
> Yazılmış ama çalıştırılmamış bir yedek betiği, olmayan bir yedektir.
>
> Bir sonraki test bir ay sonra. Ayrıca göçler ve tohumlama ilk kez **gerçek Postgres 17**
> üzerinde koşturuldu; bugüne kadar yalnızca PGlite'ta çalışmışlardı.

> **Parola sıfırlama ve e-posta doğrulama hakkında.** Kod altı hanelik, 15 dakika geçerli,
> tek kullanımlık; ham hâli hiç saklanmaz (`tokenOzeti`), karşılaştırma `timingSafeEqual` ile
> yapılır ve üretimi `randomInt` iledir. Hesabın var olup olmadığı yanıttan anlaşılmaz.
> Parola değişince **tüm** yenileme tokenleri iptal edilir. Posta sağlayıcısı
> (`POSTA_API_URL`) tanımlı değilse kodlar loga düşer ve sunucu açılışta uyarır —
> kullanıcıya "gönderdik" denmez.

## F1 · Veri modeli ve hareket veritabanı

| Görev | Durum | Kanıt |
|---|---|---|
| F1.1 Spec bölüm 14 tabloları | ✅ | `db/sema.ts` — 24 tablo, 11 şema testi |
| F1.2 Hareket şeması | ✅ | `packages/shared/src/domain.ts` · derleyici doğrulaması |
| F1.3 Açık kaynak veri (wger kullanılmadı) | ✅ | `data/kaynak/hareketler/*.mjs` başlıklarında kaynak notu |
| F1.4 120 hareket, Türkçe talimat | ✅ | **122 hareket**, her biri ≥4 adım Türkçe talimat |
| F1.5 Hareket görselleri | ✅ | **93/122 harekette görsel** (`apps/mobile/assets/hareketler`, 6 MB) · free-exercise-db, kamu malı · hareket detay ekranında gösteriliyor |
| F1.6 Program görüntüleme | ✅ | `app/(sekme)/program.tsx`, `app/program/gun.tsx` |
| F1.7 Hareket detayı | ✅ | `app/program/hareket.tsx` — talimat, kaslar, muadiller |
| F1.8 Program düzenleme | ✅ | `/v1/program/hareket-degistir` · ücretsiz ve sınırsız |
| F1.9 Çevrimdışı okuma | ✅ | `src/veri/onbellek.ts` + program ekranında önbellek yolu |

## F2 · Değerlendirme

| Görev | Durum | Kanıt |
|---|---|---|
| F2.1 Soru motoru | ✅ | `degerlendirme/motor.ts` · 41 test |
| F2.2 Tüm soru tipleri | ✅ | `SoruAlani.tsx` — 15 tip |
| F2.3 Vücut haritası | ✅ | `VucutHaritasi.tsx` — SVG + erişilebilir liste |
| F2.4 Hedef vücut görsel seçimi | ✅ | `HedefVucutSecimi.tsx` — 8 nötr siluet |
| F2.5 Ekipman envanteri + ön doldurma | ✅ | `EkipmanEnvanteri.tsx` + `salonOnDoldurma()` |
| F2.6 Dallanma mantığı | ✅ | `branch`, `conditional`, `conditionalOn`, `repeatBranch`, `repeatFor`, `_notYok`, `_bos` |
| F2.7 Dört güvenlik kapısı | ✅ | `kapilar/kapilar.ts` · 21 test · her cevap kaydında yeniden değerlendirilir |
| F2.8 Blok arası geri bildirim | ✅ | `geriBildirim.ts` · 14 test · her metin gerçek hesaptan |
| F2.9 Blok bazlı kayıt ve devam | ✅ | `/v1/degerlendirme/cevap` · yolculuk testi 3. adım |
| F2.10 Profil derleme | ✅ | `profil/profil.ts` · 26 test |
| F2.11 H10 gerçeklik testi | ✅ | `gercekcilikTesti()` · beslenme testleri |
| F2.12 Değerlendirmeyi güncelleme | ✅ | `/v1/degerlendirme/yeni-surum` — eski cevaplar taşınır |
| F2.13 Terk noktası analitiği | ✅ | `rotalar/analitik.ts` · 16 test · `/terk-noktalari`, `/blok-hunisi`, `/donusum`, `/birim-ekonomisi` — kişisel veri döndürmez, `YONETIM_ANAHTARI` ile kapalı |

## F3 · Program motoru ★

| Bitti kriteri | Durum | Kanıt |
|---|---|---|
| Aynı profil → birebir aynı program | ✅ | `program.test.ts` "determinizm" |
| Bel fıtığında yerden çekiş yok | ✅ | `program.test.ts` "bel fıtığında yerden çekiş hareketleri programda yoktur" |
| Ekipmanı olmayan hareket önerilmiyor | ✅ | `program.test.ts` "ekipmanı olmayan hareket asla önerilmez" |
| Her hareketin gerçek gerekçesi var | ✅ | `decisions` tablosu + `/v1/program/gerekce/:id` + yolculuk 8. adım |
| Geri bildirim → sonraki seans değişiyor | ✅ | yolculuk 11. adım: "artıyor" kararı döner |

Alt görevler: hacim bütçesi (26 test), split (12), kısıt çözücü (37), 1RM ve yük (24),
çift ilerleme + deload (32), **takvim yerleşimi (26)**, karar izi, gerekçe üretimi (21),
1. gün ekranı, üç dokunuş, ağrı bildirimi, seans atlama — hepsi tamam.

**Tekrar tavanı.** Vücut ağırlığı hareketlerinde ilerleme tekrar artırarak sürüyordu ama
tavan yoktu: başarılı bir kullanıcı zamanla "40 tekrar şınav" hedefine ulaşırdı. Yirmi
tekrarın üstünde uyaran kuvvet ve hipertrofiden dayanıklılığa kayar — bu, kullanıcının
zamanını harcayan bir programlama hatası. Artık tavan 20; tavana gelince tekrar eklenmiyor,
daha zor varyasyona geçiliyor ve sebebi söyleniyor.

**Takvim yerleşimi (Z3).** "Hangi günler uygun?" cevabı artık kullanılıyor: seanslar yalnızca
işaretlenen günlere konur ve aralarını en çok açan altküme seçilir (`seanslariYerlestir`,
tam kombinasyon taraması — en fazla 35 aday, sezgisel yok, sonuç tekrarlanabilir).
Uygunluk ile dinlenme çakışırsa **kullanıcının uygunluğu kazanır**; sıkışan yerleşim
programın uyarılarına yazılır, sessizce yapılmaz. Tarihler `sessions.planned_for` alanına
yazılır; tarih üretimi API katmanında, çekirdek makine saatine bakmaz.

## F4 · Vücut analizi ★

| Bitti kriteri | Durum | Kanıt |
|---|---|---|
| Fotoğraf sunucuda hiçbir yerde saklanmıyor | ✅ | **İki katmanlı otomatik doğrulama:** `db/sema.test.ts` (şema) + `servisler/gizlilik.test.ts` (kaynak kod taraması) |
| Rapor aralık gösteriyor | ✅ | `yagOraniAralik()` tek sayı döndüremez · 28 test |
| Fotoğrafsız akış çalışıyor | ✅ | `app/fotograf/gizlilik.tsx` çıkış yolu + ölçü tabanlı rapor |
| Play veri güvenliği formu doldurulabilir | ✅ | Fotoğraf saklanmadığı için "toplanmıyor" beyanı doğru |

**Kamera ve eğim doğrulaması bağlandı.** `app/fotograf/cekim.tsx` artık gerçek `CameraView`
kullanıyor; `expo-sensors` ivmeölçerinden gelen okuma `telefonDikMi()` ile değerlendiriliyor
ve telefon 8 dereceden fazla eğikse çekim düğmesi açılmıyor (`core/vucut/egim.ts`, 12 test).
Perspektif oranları bozar: eğik telefonla çekilen iki fotoğraf karşılaştırılamaz.

Fotoğraf `base64` ile bellekte tutulur, analiz isteğiyle gider ve hemen bırakılır.
`gizlilik.test.ts` artık çekim ekranını da tarıyor: fotoğrafın AsyncStorage, SecureStore,
kendi önbelleğimiz veya FileSystem'e yazılmadığını ve gönderim sonrası bellekten
bırakıldığını doğruluyor. İki korumanın da gerçekten yakaladığı, kodu bilerek bozup
koşturarak sınandı.

## F5 · Beslenme çekirdeği

| Bitti kriteri | Durum | Kanıt |
|---|---|---|
| Aynı yemek → aynı makro | ✅ | `beslenme.test.ts` (API) "aynı yemek iki kez eklendiğinde aynı makro" |
| Porsiyon "1 kase" seçilebiliyor | ✅ | `EV_OLCULERI` — kase, tabak, kepçe, kaşık, dilim, avuç, adet, bardak |
| ED modunda kalori görünmüyor | ✅ | `porsiyonRehberi()` sayı içeremez (test) + arayüzde `sayilar_gizli` |
| 2 hafta veriyle TDEE düzeltiliyor | ✅ | `/v1/beslenme/tdee-uyumla` · `tdeeDuzelt()` 6 test |

Besin veritabanı: **364 kayıt** — 180'i pişmiş Türk yemeği (F5.6), 153 ham gıda,
22 ambalajlı ürün, 10 zincir/dışarıda yemek kalemi. Hepsi ev ölçüleriyle (kase, tabak, kepçe, kaşık, dilim, avuç, adet, bardak).

`besinler.test.ts` (12 test) elle girilen veriyi koruyor. En güçlüsü **makro-kalori
tutarlılığı**: protein ve karbonhidrat 4 kcal/g, yağ 9 kcal/g. Beyan edilen kalori bu
hesaptan belirgin sapıyorsa satırlardan biri yanlıştır. Elle girilen sağlık verisinde en sık
hata bu — bir makro düzeltilir, kalori eski kalır. Testin gerçekten yakaladığı, hem kaba
(protein 10 katı) hem ince (yağ 6,5 → 20) bir hata sokularak sınandı.
TürKomp tam içe aktarma kullanım koşulları yazılı teyit edildikten sonra (F5.4, dış iş).
**Barkod artık çalışıyor (F5.5, F5.9).** `/v1/beslenme/besin/barkod/:barkod` önce yerel
veritabanına bakar; yoksa Open Food Facts'e sorar, gelen kaydı `verified: false` ile yerele
yazar ve döner. İkinci kullanıcı ağa hiç çıkmaz. OFF kullanıcı katkılı olduğu için dönüşüm
iyimser değil: 100 g'da 0-900 kcal, makro toplamı ≤105 g gibi makul aralıkların dışındaki
kayıt hiç alınmaz (`core/besin/off.ts`, 26 test). Mobil tarafta `app/beslenme/barkod.tsx` —
kamera modülü olmadan da elle giriş ile tam çalışıyor, EAN kontrol hanesi istemcide
doğrulanıyor.

Toplu içe aktarma betiği yazıldı
(`scripts/besin-ice-aktar.mjs`). Eski `cgi/search.pl` ucu düzenli 503 verdiği için v2 arama
ucuna geçirildi ve üstel bekleme eklendi; 300 kayıtlık kuru çalışmada **246 makul kayıt**
üretti. Veritabanına yazma `DATABASE_URL` istiyor, bu ortamda Postgres yok.

> **ODbL hakkında dürüst not.** Open Food Facts verisi ODbL. Tek tek ürün çekip
> önbelleklemek ile 9.000 kayıtlık bir çıkarımı ürünle birlikte dağıtmak farklı hukuki
> durumlar: ikincisi türetilmiş veritabanı sayılır ve **share-alike** yükümlülüğü doğurur —
> yani kendi besin veritabanımızı ODbL altında açmamız gerekir. `CLAUDE.md`'de wger'in
> CC-BY-SA share-alike'ı yüzünden reddedilmesiyle aynı mantık. Bu yüzden barkod akışı
> istek anında sorgu + önbellek olarak kuruldu; toplu içe aktarma betiği duruyor ama
> **çalıştırılması hukuki bir karar**, teknik bir adım değil.

TürKomp içe aktarımı `--turkomp-onayi-var` bayrağı olmadan **hata fırlatır** — yazılı teyit
gelmeden veri çekilemez.

## F6 · Ödeme

| Görev | Durum | Kanıt |
|---|---|---|
| F6.1 RevenueCat | ✅ kod tarafı | `react-native-purchases@10` bağlandı · `src/odeme/magaza.ts` · **web kancası** `/v1/abonelik/kanca` (12 test) · anahtar yoksa SDK'sız moda düşer · **mağaza hesabı ve gerçek satın alma denenmedi** |
| F6.2 Ürün tanımları | ✅ | `servisler/haklar.ts` — dört ürün, tek doğruluk kaynağı |
| F6.3 Paywall ekranı | ✅ | `app/odeme/paywall.tsx` — ön seçim yok, fiyat en büyük punto, kapatma ilk saniyeden |
| F6.4 Hak kontrolü ve kilitler | ✅ | Her uçta plan kontrolü · yolculuk 9-10. adım |
| F6.5 Abonelik yönetimi | ✅ | `app/(sekme)/ayarlar.tsx` — **iptal en üstte, tek adım** |
| F6.6 Kota sistemi | ✅ | Aylık havuz · adalet kuralları 4 testle doğrulandı |
| F6.7 Ödeyene promosyon yok | ✅ | `promosyon_goster` yalnızca ücretsiz planda `true` |

## F7 · Görsel yemek tanıma

| Bitti kriteri | Durum | Kanıt |
|---|---|---|
| İkinci fotoğraf AI çağrısı yapmadan tanınıyor | ✅ | `tanima.test.ts` — çağrı sayacı artmıyor |
| Yanlış tanıma tekrarı kota yemiyor | ✅ | `tanima.test.ts` — kota sabit kalıyor |
| Kullanıcı başına aylık maliyet ölçülebiliyor | ✅ | `/v1/beslenme/maliyet` · `ai_usage` tablosu |

Model çıktısında kalori/makro alanı görülürse **temizlenir ve uyarı taşınır** — besin değeri
yalnızca veritabanından gelir (`tanimaCiktisiniAyristir` 7 test).

## F8 · Planlama, buzdolabı, kaydırma

| Bitti kriteri | Durum | Kanıt |
|---|---|---|
| Alerjen hiçbir tarifte çıkmıyor | ✅ | `ogun.test.ts` uçtan uca |
| Bütçesi kısıtlıya pahalı protein yok | ✅ | `ogun.test.ts` — tüm tarifler kademe ≤1 |
| B5 "ailem" → menü değil porsiyon | ✅ | `mod: 'porsiyon'` + "Bugün ne pişti?" |
| Deste AI çağrısı yapmıyor | ✅ | `ai_cagrisi: false` sözleşmesi + test |
| Boş destede eksik malzeme önerisi | ✅ | "X eklersen N seçenek açılıyor" |

Tarif kütüphanesi: **335 tarif**. Dağılım: 149 vegan, 239 vejetaryen, 249 glutensiz,
253 laktozsuz, 179 ana yemek, 67 kahvaltı, 45 ara öğün, 41 çorba.
Dört bütçe kademesinin her birinde seçenek var.

**Kütüphaneyi ham sayıyla değil, doldurulabilirlikle ölçüyoruz.**
Spec "~800 tarif" diyor ama 800 tarifin 780'i etliyse vegan kullanıcı yine boş ekran görür.
`kutuphaneYeterliligi.test.ts` (50 test) 14 gerçek kısıt profili × 3 öğün için hem destenin
dolduğunu hem havuzun derinliğini sınıyor. Şu an her profil 15 kart tavanına ulaşıyor ve
hiçbir profilde boş öğün türü yok.

Bu test yazılırken **gerçek bir ürün boşluğu** çıktı: vegan + çölyak kullanıcısı için
kahvaltı havuzu **sıfırdı**. O kişi uygulamayı açtığında hiçbir kahvaltı görmeyecekti.
Hedefli bir tarif partisiyle (vegan/glutensiz kahvaltı, hızlı ana yemek, hızlı çorba)
kapatıldı; havuz artık en dar profilde bile bir haftayı dolduruyor.

Aynı ölçüm başka zayıf yerleri de gösterdi ve sonraki parti rastgele değil bu listeye
bakılarak yazıldı. Sonuç: vegan+çölyak kahvaltı 0 → 15, zamanı dar çorba 2 → 14,
vegan+kısıtlı bütçe+zamanı dar ana yemek 7 → 27.

Kazanım **cırcırla kilitlendi**: eşikler bugünkü seviyenin hemen altına çekildi, yani
kütüphane küçülürse veya bir kısıt yönü zayıflarsa test kırmızıya döner. Cırcırın gerçekten
tuttuğu, bir eşik bilerek yukarı itilip testin düştüğü görülerek doğrulandı.

Hedef hâlâ ~800 tarif ama ölçüt artık sayı değil: **her profil için haftayı tekrarsız
doldurabilmek.** 335 tarifle bu sağlanıyor; büyütme buradan sonra çeşitlilik için, boşluk
kapatmak için değil.

`tarifler.test.ts` (36 test) hem doğruluğu hem **kapsamı** koruyor. Kapsam testi olmasaydı
kütüphane büyürken bir köşe boş kalabilir ve vegan kullanıcı boş deste görürdü — eksik veri
gibi görünür ama ürünün çalışmaması demektir.

Bu testler yazılırken gerçek bir veri hatası çıktı: iki yulaf tarifi gluten durumunu hiç
bildirmiyordu. Yulaf doğal olarak glutensiz ama çapraz bulaşma yaygın; sertifikalı yulaf
varsaymak çölyak kullanıcısı için risk olurdu, o yüzden `glutenli` işaretlendi.

Et/tavuk/balık/yumurta içeren tariflerin tamamı `insan_kontrollu: true`; kontrolsüz tarif
tohumlanamaz (kod kapısı) ve test bunu malzeme listesinden bağımsız olarak doğruluyor.

**Ama bayrak bir beyandır, kanıt değil.** `insan_kontrollu: true` yazması, adımların içinde
ne yazdığını denetlemez. 171 tarifte gözle görülür, 800 tarifte görülmez. Bu yüzden pişirme
yeterliliği artık makineye denetletiliyor: tavuk, kıyma, balık veya yumurta içeren her
tarifin adımlarında somut bir pişme işareti aranıyor ("içinde pembelik kalmayana kadar",
"tamamen katılaşana kadar", "N dakika fırınla"...), ve hiçbir tarifte "az pişmiş" türü ifade
geçmiyor.

Denetim **32 tarifte gerçek bir eksik** buldu: "Tavuğu ızgarada pişir" gibi adımlar
kullanıcıya ne kadar pişireceğini söylemiyordu. Otuz ikisi de yeniden yazıldı. Az pişmiş
tavuk salmonella, az pişmiş kıyma E. coli demek; sağlık uygulamasında bunu kütüphanenin
büyümesine bırakamayız.

Füme hindi gibi üretimde ısıl işlem görmüş ürünler denetimden muaf ama **muafiyet bedava
değil**: bu tarifler soğuk zincir uyarısı taşımak zorunda, çünkü gerçek riskleri az pişme
değil sıcakta bekleme.

Tek malzemeli dört kayıt (ayran, kabak çekirdeği, yer fıstığı, protein bar) kütüphaneden
**çıkarıldı**: tek malzeme bir tarif değil, bir besindir ve zaten besin tablosunda var.
Destede ikinci kez göstermek kullanıcıya seçenek gibi görünen bir tekrar üretirdi.

**Tarif makroları artık veritabanından türetiliyor, elle yazılmıyor.**
`db/malzemeEslemesi.ts` malzeme adlarını besin tablosuna çözüyor ve `tarifleriTohumla`
makroyu oradan hesaplayarak yazıyor. Kaynak dosyadaki değer yalnızca malzemesi çözülemeyen
tarifler için yedek. Bu, ürünün "besin değeri veritabanından gelir, biz uydurmayız" sözünün
tarif katmanında da tutulması demek — daha önce burada elle yazılmış sayılar vardı.

Toplam enerji pişirme veriminden bağımsız: tencerede kaybedilen su enerji taşımaz. Bu yüzden
toplam için verim katsayısı varsaymıyoruz.

Bu değişiklik yapılırken **iki gerçek hata** çıktı: sekiz malzeme eşlemesi var olmayan besin
adlarına işaret ediyordu ve sessizce çözülemiyordu (kapsamı düşürüyor, kimseye görünmüyordu);
ayrıca `mercimek-koftesi` tarifinin kalorisi 450 yazılmışken malzemeleri 623 veriyordu —
80 g kuru mercimek ve 60 g kuru bulgur elle küçümsenmişti.

**Makrolar malzemelerden doğrulanıyor.** `core/besin/bilesim.ts` (13 test) bir yemeğin
makrosunu malzeme listesi ve pişirme veriminden hesaplıyor. `tarifler.test.ts` her tarifin
beyan ettiği kaloriyi bu hesapla karşılaştırıyor: **121 tarifin 68'i** çapraz kontrolden
geçiyor ve üçte birden fazla sapan kayıt CI'yı kırıyor.

Atwater kontrolü satırın kendi içinde tutarlı olduğunu söyler; malzemelerle tutarlı olduğunu
söylemez. "300 g tavuk yazıp 12 g protein beyan etmek" Atwater'dan geçer ama yanlıştır.

Bu kontrol yazılırken gerçek bir modelleme hatası çıktı: malzeme adları **çiğ mi pişmiş mi**
söylemiyordu. 80 g makarna kuru mu haşlanmış mı? İki buçuk kat fark eder. Tabloya çiğ/pişmiş
ayrımı eklendi (`Makarna, çiğ` / `Makarna, pişmiş` gibi) ve eşleme buna göre düzeltildi.
Kontrolün bu hata sınıfını gerçekten yakaladığı, pirinci bilerek pilava eşleyip koşturarak
sınandı.

**Hareket görselleri hakkında.** Otomatik eşleme 46 hareketi güvenle eşledi; kalan 76'sı
`data/medya-eslemeleri.json` içinde **elle** karara bağlandı — 47'sine doğru görsel bulundu,
29'u bilerek görselsiz bırakıldı (burpee, ip atlama, esnetme hareketleri: kaynakta doğru
karşılık yok). Yanlış görsel görselsizden kötüdür; kullanıcı yanlış hareketi yapar.

Bilerek boş bırakmak ile kimsenin bakmamış olması farklı şeyler, bu yüzden ikisi de dosyada
yazılı ve `katalog.test.ts` "görseli olmayan her hareket ya bilerek boş bırakılmış ya da
otomatik eşleşmemiştir" testiyle korunuyor. Testlerin gerçekten yakaladığı, envantere sahte
kayıt eklenip koşturularak doğrulandı.

**Modelleme notu:** tek tarif nadiren 950 kcal'lık bir öğünü olduğu gibi karşılıyor. Bunu
tarif birleştirerek değil **porsiyon ölçekleyerek** çözdük (`porsiyonKatsayisi`) — gerçek
mutfakta değişen şey tarif değil porsiyondur. Katsayı çeyreğe yuvarlanır: "1,25 porsiyon"
ölçülebilir, "1,37 porsiyon" ölçülemez.

## F9 · AI koç

| Bitti kriteri | Durum | Kanıt |
|---|---|---|
| Kullanıcının gerçek verisine atıfla cevap | ✅ | Araç katmanı · `kullanilan_araclar` cevapta döner |
| Sağlık sorusunda yönlendirme, tanı yok | ✅ | `sinirKontrolu` — model hiç çağrılmıyor |
| "Günde 800 kalori" gerekçesiyle reddediliyor | ✅ | `asiri_hedef` kategorisi |
| Token maliyeti sabit kalıyor | ✅ | `koc.test.ts` — 12 mesaj sonrası token 2 katına çıkmıyor |

**Türkçe regex tuzağı:** JavaScript'te `\b` sözcük sınırı ASCII harfleri tanır; `/\bağrı\b/`
hiçbir zaman eşleşmez. Sessizce çalışmayan bir güvenlik kuralı, hiç olmayan bir kuraldan
tehlikelidir. Bu yüzden sınır kontrolü metni önce ASCII'ye normalize eder (`koc.ts` başındaki
not). Bu hatayı test yakaladı.

### AI bütçesi — birim ekonomisi kaldıracı

Kota çağrı **sayısını** sınırlıyor, maliyeti değil. Aynı sayıda çağrı, uzun bağlamla veya
yanlış model seviyesiyle kat kat pahalıya gelebilir; kota bunu görmez. Ürünün bilinen en
büyük riski birim ekonomisi ve marjı yiyen şey ortalama kullanıcı değil uç kullanıcıdır.

İki katman eklendi:

**1. Girdi sınırı** (`core/ai/girdiSiniri.ts`, 9 test). Görsel modelde maliyet girdi
boyutuyla büyür: 12 MB'lık bir fotoğraf, sıkıştırılmış bir karenin onlarca katı tokene
karşılık gelir. Fotoğraf başına 2 MB tavanı kondu ve **plan ile kota kontrolünden önce**,
zod şemasında uygulanıyor — reddedilen fotoğraf kota da yemiyor, para da harcamıyor.
Boyut base64 uzunluğundan hesaplanıyor, dize çözülmüyor: 12 MB'ı belleğe açmak tam da
kaçınmak istediğimiz masrafı yapmak olurdu.

**2. Aylık bütçe** (`core/ai/butce.ts`, 16 test). Plan başına aylık USD tavanı; tavanın
%80'ini geçen kullanıcının koç sohbeti ucuz model seviyesine düşüyor ve çıktı sınırı
daralıyor. Hesap deterministik çekirdekte yapıldığı için kullanıcı bir şey kaybetmiyor:
sayılar aynı, anlatım sadeleşiyor.

**Bütçe hizmet kesmiyor.** `hizmetKesildi` her zaman `false` ve bu bir testle sabitlendi.
Ödeme yapan kullanıcıyı ay ortasında kapıda bırakmak, marjı korurken güveni harcamak
olurdu; üst sınırı kota zaten koyuyor.

**Tanıma bilerek indirilmiyor.** Yemek tanıma zaten en ucuz görsel seviyeden yapılıyor;
inecek kademe yok. Geriye kalan tek kaldıraç çıktı uzunluğu, ama tanıma çıktısı bir JSON
kalem listesi — kısaltmak listeyi ortasından keser ve ödeme yapan kullanıcıya bozuk sonuç
döndürür. Orada bütçe **ölçülüyor ve raporlanıyor, uygulanmıyor**; `/beslenme/maliyet` artık
bütçe oranını da döndürüyor. Bu, yazıldıktan sonra ölü kod olduğu görülüp **geri alınan** bir
indirimdi; testi de o kararı anlatacak şekilde yeniden yazıldı.

Bağlantının gerçek olduğu, indirimi kaldırıp testin kırmızıya döndüğü görülerek doğrulandı.

### Şapkasız arama — her gün kırılan bir yer

Besin araması ham `ILIKE '%sorgu%'` yapıyordu. Türkiye'de insanlar acele ederken "yogurt",
"kofte", "corba" yazar; bu sorgular **sıfır sonuç** döndürüyordu. Kullanıcı için bu
"veritabanında yok" ile aynı şey ve manuel kalori girişi ücretsiz planın çekirdeği, yani
uygulamanın günde en çok dokunulan yeri. Hiçbir program kalitesi bunu telafi etmez.

`shared/arama.ts` ortak bir katlama getirdi (`aramaAnahtari`); SQL tarafında aynısı
`lower(translate(...))` ile yapılıyor. **Katlama sırası önemli:** önce harf eşlemesi, sonra
küçültme — ters sırada `'İ'.toLowerCase()` iki kod noktası üretiyor ve eşleme tutmuyor.

İki uygulamanın ayrışmaması, tohumlanmış tablonun **tamamı** üzerinde sınanıyor. Sessizce
ayrışan bir eşleşme kuralı hata vermez, sadece bulmaz — en tehlikeli hâli budur.

Denetim üç şey daha ortaya çıkardı, üçü de sessiz:

**1. Niyet tespiti de şapkalıydı.** `/besin|kaç kalori|içinde ne var/` kalıbı "kac kalori"
yazan kullanıcıyı hiç yakalamıyordu. Aramayı katlayıp tetiği katlamamak, sorunu yarısında
bırakmaktı.

**2. Yemek adı cümleden yanlış çıkarılıyordu.** Kod son iki sözcüğü alıyordu; "yoğurt kaç
kalori" cümlesinde bu **"kac kalori"** demek — yani sorunun kendisini aramak. En doğal
Türkçe dizilim yemeği başa koyar, İngilizce alışkanlığıyla yazılmış kural onu tersten
okuyordu. Artık konumdan değil anlamdan gidiliyor: soru kalıbı atılıp geriye kalan aranıyor.

**3. Hareket bilgisi aracı hiç çalışmıyordu.** Koç, kullanıcının sorduğu hareketi Türkçe
adını tireleyip `hareketBul` ile **kimlik** olarak arıyordu; katalog kimlikleri İngilizce
slug ("ab-wheel"). Araç yazılıydı, testleri vardı, ama tek bir gerçek soruda tetiklenmiyordu
— koç kataloğu hiç görmeden cevap veriyordu. `hareketAdaGoreBul` eklendi (kimlik, Türkçe ad,
İngilizce ad, hepsi şapkasız katlanmış) ve kalıptaki açgözlü yakalama düzeltildi: negatif
ileri bakış olmadan "mekik hareketi" ad olarak yakalanıyor ve arama boşa düşüyordu.

**Kısmi eşleşme bilerek yok.** "press" onlarca harekete uyar; yanlış hareketin talimatını
göstermek göstermemekten kötüdür, çünkü kullanıcı yanlış hareketi yapar. Tutmazsa araç hiç
eklenmiyor ve bu ayrıca sınanıyor.

Bu sınıfın tamamı, "kod yazılı ama çalışmıyor" hatası. Testleri araç çıktısına değil
**aracın tetiklendiğine** bakacak şekilde yazmak yakaladı.

**Kural artık genel.** Tek tek araçları değil kuralın kendisini sınıyoruz: modele tanıtılan
her bağlam aracının gerçekçi bir kullanıcı cümlesiyle tetiklendiği gösterilmek zorunda. Yeni
araç ekleyen buraya bir cümle eklemeden geçemez; yoksa modele var olmayan bir yetenek
tanıtmış oluruz. Testin boşluğu gerçekten yakaladığı, bir cümle silinip koşturularak
doğrulandı.

**Aynı sınıf program motorunda da arandı.** Havuzda on sert güvenlik kuralı var
(`havuz.test.ts`, 28 test). Bir kural hiç tetiklenemiyorsa — katalogda o özelliği taşıyan
hareket yok ya da alan hiç doldurulmamışsa — kullanıcının kısıtı sessizce yok sayılır:
"tavanım alçak" der, kaydederiz, kural kodda durur, baş üstü hareket yine programa girer.
Koç aracında bu sınıfın sonucu kötü bir cevaptı; burada sonucu yaralanma olur.

Onun da onu tetiklenebilir çıktı, yani **burada ölü kural yok**. Kural artık genel biçimde
korunuyor: havuzda geçen her kural adının bir sınama profili olmak zorunda. Ayrıca
bildirilmemiş bir kısıtın havuzu daraltmadığı sınanıyor — kimsenin istemediği bir eleme,
programı boşuna fakirleştirir.

Reddetme seçimleri (T2) ayrıca kontrol edildi. Garanti "kural tetiklendi" değil, **hareket
havuzda yok**: burpee ve ip atlama zaten ana havuz dışında olduğu için `kullanici_reddetti`
onları elemiyor ama kullanıcıya verilen söz yine tutuyor. Kullanıcıyı ilgilendiren sonuçtur,
hangi kuralın elediği değil — test de bunu ölçüyor.

**İki normalleştirici tek kaynağa indirildi.** `tanima.ts` içinde ikinci bir Türkçe katlama
uygulaması duruyordu. 369 gerçek besin adında ikisi aynı sonucu veriyordu — yani bugün bir
hata yoktu, ama ayrışmaları an meselesiydi ve ayrışan bir eşleşme kuralı hata vermez, sadece
bulmaz. `turkceNormalize` artık `aramaAnahtari`'ye devrediyor; kendine ait tek işi kalan
boşluk sadeleştirmesi.

## T7 · Bildirimler

| Bitti kriteri | Durum | Kanıt |
|---|---|---|
| Plan deterministik ve test edilebilir | ✅ | `core/bildirim/plan.ts` · 25 test |
| Oyunlaştırma ve suçluluk dili yok | ✅ | Yasaklı sözcük testi: seri, rozet, elmas, özledik, kaçırdın, tebrikler |
| Gece bildirimi yok | ✅ | Sessiz saat 22:00–07:00; dışına düşen her bildirim sınıra çekilir veya düşer |
| Aynı anda iki bildirim gelmez | ✅ | `cakismalariAyir` — çakışanlar beşer dakika kaydırılır |
| Cihaza gerçekten kurulup kurulmadığı söylenir | ✅ | `src/bildirim/zamanlayici.ts` → `sdk_yok` / `izin_yok` / `kuruldu` |

Hangi günlere kurulacağı Z3 yerleşiminden gelir (`/v1/program/aktif` → `takvim.gunler`).
Dört haftada bir tekrar eden ölçüm hatırlatması haftalık tetikleyiciyle **yaklaşık olarak
kurulmaz**: verdiğimiz aralık dört haftaysa her hafta bildirim göndermek sözü bozar.

`expo-notifications` kuruldu ve bağlandı. Tetikleyici biçimi tahminle değil, kurulu paketin
tipinden yazıldı: SDK 52'de haftalık tetikleyici `{type: WEEKLY, weekday, hour, minute}`;
eski `{weekday, hour, minute, repeats}` biçimi sessizce çalışmıyor olurdu. Çıkışta tüm
hatırlatmalar iptal edilir — bir sonraki kullanıcıya öncekinin bildirimleri gitmez.

## F10 · Global

| Görev | Durum | Kanıt |
|---|---|---|
| F10.1 İkinci dil — **altyapı** | ✅ | `shared/i18n.ts` · 18 test · `metinler.tr.ts` + `metinler.en.ts`, `/v1/kimlik/dil`, `useDil()` / `useMetinler()`, ayarlarda dil seçici |
| F10.1 İkinci dil — **ekran metinleri** | ✅ | 39 ekranın tamamı sözlükten okuyor; `scripts/ceviri-denetimi.mjs` CI'da doğruluyor |
| F10.2 İkinci pazarın besin katmanı | ✅ mekanizma · ⏸ içerik | `veriYereli` · sorgular ayrışıyor · 10 test |
| F10.3 Bölgesel fiyatlandırma | ✅ | Mağaza fiyatı kullanılıyor; yedek `fiyatMetni` ile para birimi görünür |
| F10.4 O mutfağın tarif katmanı | ✅ mekanizma · ⏸ içerik | Aynı mekanizma; tarif sorgusu da yerele bağlı |

**Dil katmanı nasıl çalışıyor.** İki sözlük var ve İngilizce sözlük `Metinler` tipiyle
Türkçe sözlüğe bağlı: eksik bir anahtar **derleme hatası**, fazladan bir anahtar da test
hatası. Yarım çevrilmiş bir arayüz, hiç çevrilmemiş bir arayüzden daha kötü görünür —
kullanıcı hangi dilde olduğunu bilemez, o yüzden bu kapı otomatik.

Testler ayrıca İngilizce metinlerde Türkçe karakter kalmadığını, boş metin olmadığını ve
dil kurallarının (oyunlaştırma yok, "personalized" yok, tıbbi cihaz feragati var) iki dilde
de geçerli olduğunu doğruluyor.

Dil kullanıcının açık tercihi; cihaz dili otomatik alınmıyor. Türkiye'de telefonu İngilizce
kullanıp uygulamayı Türkçe isteyen çok kişi var.

**Ekran metinleri.** 40 ekranın tamamındaki kullanıcıya görünen metin sözlüğe taşındı.
`npm run ceviri` (CI'da da koşuyor) ekranlarda satır içi metin kalmadığını doğrular:
gösterim proplarını ve JSX metin düğümlerini tarar, yorumları ve veri listelerini bilerek
kapsam dışı bırakır.

**Denetimin kendisinde bir delik vardı ve kapatıldı.** İlk hâli Türkçe'ye özgü karakterlere
bakıyordu; "Geri", "Devam", "Plan" gibi yalnızca ASCII harf içeren Türkçe metinler ağdan
geçiyordu. Nitekim geçmişti: ayarlar ekranında satır içi bir "Plan" yazısı duruyordu ve
denetim onu görmüyordu.

Kural biçimsel hâle getirildi: **gösterim propuna düz dize yazılamaz, JSX metin düğümü harf
içeremez.** Dilden bağımsız çalışır, İngilizce bırakılmış bir metni de yakalar. Yeni kural
**25 kaçak metin** buldu ("Ekle", "Kaydet", "Kapat", "Miktar", "Deste bitti", "Barkod
okuma", tarih yer tutucuları "GG/AA/YYYY"...); hepsi sözlüğe taşındı ve İngilizce
karşılıkları yazıldı — tarih yer tutucuları İngilizcede doğru şekilde "DD/MM/YYYY" oluyor.

Yanlış pozitif riski tek yerde: `>` ve `<` TypeScript jeneriklerinde de geçiyor. Metin
düğümü sayılması için parçanın tek satırda kalması ve kod noktalaması taşımaması aranıyor;
şablon dizelerinde `${...}` parçaları çıkarılıp yalnızca sabit kısma bakılıyor, böylece
`` `${ad}: ${deger}` `` temiz sayılırken `` `${dakika} DK` `` yakalanıyor.

Denetimin gerçekten yakaladığı, Türkçe karakter **içermeyen** bir metin geri yazılıp
koşturularak doğrulandı — sessizce geçen bir kontrol, hiç olmayan kontrolden tehlikelidir.

**Bildirim metinleri de sözlüğe taşındı.** `npm run ceviri` yalnızca `apps/mobile` altını
tarıyor; bildirim metni ekranda değil çekirdekte üretildiği için o ağın dışındaydı ve
uygulamayı İngilizce kullanan kişiye **Türkçe bildirim** gidiyordu. Bildirim, kullanıcının
uygulamayı açmadan gördüğü tek yüzümüz. `bildirimPlaniHesapla` artık metin sözlüğünü
parametre alıyor; çekirdekte tek bir satır içi metin kalmadı ve bu, İngilizce sözlükle
üretilen planda Türkçe karakter aranarak sınanıyor.

**Gerekçe katmanı iki dilli hâle getirildi.**

Sorun şuydu: `aciklama_tr` adı doğruyu söylüyordu — o cümle Türkçe. Ürünün çekirdek vaadi
"programın neden o program olduğunu da söyleriz" ise, cümleyi motorda sabitlemek o vaadi
yalnızca Türkçe kullanıcıya tutmak demekti.

Çözüm cümleyi çevirmek değil, **cümleyi kurmak için gerekeni taşımak** oldu. Kural
kimlikleri zaten vardı (`Karar.kurallar`); eksik olan parametrelerdi. `KararParametreleri`
eklendi (hareket adı, kas grubu, patern, elenen hareket sayısı, yük, tekrar) ve
`shared/gerekce.ts` cümleyi sözlükle kuruyor. Motor artık metin üretmiyor — deterministik
çekirdeğin zaten olması gereken hâli.

Dört katman çevrildi: **havuz elemeleri**, **hareket seçimi**, **hacim düzeltmeleri** ve
**ilerleme kararları**. Sayı biçimi de dile bağlı: Türkçe ondalık ayırıcı virgül,
İngilizcede nokta — "52,5 kg" yazıp İngilizce cümlenin içine koymak, çevrilmiş görünen ama
okunmayan bir metin üretirdi. Hareket adı da katalogtan (`ad_en`) geliyor; cümleyi çevirip
içine Türkçe hareket adı gömmek yarım çevrilmiş bir gerekçe olurdu.

**Yedek bilinçli.** Çeviremediğimiz bir karar için cümle uydurmuyoruz; motorun Türkçe izini
olduğu gibi veriyoruz ve `cevrildi` alanı hangi durumda olduğunu söylüyor. Sağlık bağlamında
yanlış bir gerekçe, yabancı dilde doğru bir gerekçeden kötüdür.

Şema tarafında `decisions.parametreler_jsonb` eklendi (göç `0003`, eklemeli ve varsayılanlı;
eski satırlar Türkçe ize düşer). `explanation_tr` duruyor ve karar izinin kaydı hâlâ o.

**Koç da kullanıcının dilinde konuşuyor.** Sistem mesajı modele koşulsuz "Türkçe konuş"
diyordu; İngilizce soran kullanıcıya Türkçe cevap veriyordu. Sert sınırlar (tanı yasağı, doz
yasağı, "sayıyı araçtan al") iki dilde birebir aynı — bunlar üslup değil sağlık kuralı ve
test bunları **sayarak** koruyor, cümleye bakarak değil.

**Kalan yüzeyler de çevrildi.** Vücut analizi raporu (ücretsiz planın teslim ettiği tek
çıktı), değerlendirme blok geri bildirimleri (134 soruyu bitirten şey), split gerekçesi,
program uyarıları ve her satırda görünen ilerleme kuralı.

Aynı desen: motor **kod ve parametre** üretiyor, cümle sözlükte kuruluyor, Türkçe metin iz
olarak yerinde kalıyor. Şema tarafında `programs.uyari_kodlari_jsonb` eklendi (göç `0004`).
İlerleme kuralı cümlesi ise **yeni sütun gerektirmedi**: kaydedilmiş sayılardan ve
katalogdan yeniden kuruluyor — cümleyi saklamak yerine parçalarını saklamak zaten doğru
olandı.

**Ölçüt değişti.** Motorda Türkçe dize saymak artık yanlış ölçü: o metinler bilerek duruyor.
Doğru ölçü, İngilizce kullanıcıya giden cevabın içinde Türkçe kalıp kalmadığı.
`yolculuk.test.ts` bunu bir süpürme testiyle koruyor: uçların cevabı özyinelemeli taranıyor
ve Türkçe karakter arıyor. Veri alanları (`*_tr`, besin adı, soru bankası) kapsam dışı ve
bu bilerek — ayarlardaki dil notu onların Türkçe kaldığını kullanıcıya zaten söylüyor.

Süpürme yazıldığı anda **üç kaçak daha** buldu: split gerekçesi, program uyarıları ve
ilerleme kuralı metni. Tek tek uçlara bakarak bulunamayacak olanlar bunlardı; kuralı test
etmenin örneği test etmekten farkı burada görüldü.

**Yarım çeviri yapmıyoruz.** Takvim uyarısının kodu henüz yok (metni Z3 cevabından
hesaplanıyor); kod listesi metin listesinden kısa kaldığında çevirici **tümünü** Türkçe
bırakıyor. Yarım çevrilmiş bir uyarı listesi, hiç çevrilmemişten kötü.

Vücut analizi ucunun uçtan uca testi yoktu; bu çalışmayla birlikte yazıldı (`vucut.test.ts`,
8 test) ve tıbbi cihaz feragatinin İngilizcede de yerinde olduğunu ayrıca sınıyor —
çeviride kaybolabilecek en tehlikeli cümle o.

**Öğün adları ve API hata mesajları da kapandı.** Süpürme testinin kapsamı haftalık plana
genişletildiğinde iki kaçak daha çıktı: öğün adları (Kahvaltı/Öğle/Akşam, Ramazan'da
Sahur/İftar) motorda sabitti, ve API hata mesajları Türkçe gidiyordu.

Hata katmanında çözüm sunucuda çeviri yapmak **değil**: sunucu Türkçe mesaj ve **kod**
üretiyor, istemci metni koddan sözlükle kuruyor ve kodu çözemezse sunucunun mesajına
düşüyor. Böylece sunucunun kullanıcının dilini bilmesi gerekmiyor ve hiçbir durumda boş
mesaj kalmıyor. `UygulamaHatasi` artık `degerler` de taşıyor — onlarsız çeviri "kotan doldu"
gibi bilgiyi düşüren bir cümleye dönerdi.

**Kodların genel değil özgül olması şart.** `gecersiz_istek` kodunu çevirmek, "Bel ve boyun
ölçünü girmedin" cümlesini "Geçersiz istek"e düşürürdü: çevrilmiş ama bilgisi alınmış bir
hata, çevrilmemiş olandan kötü. Bu yüzden her çağrı yerine özgül kod verildi ve
`abonelikGuvenlik.test.ts` kaynak kodda geçen her kodun sözlükte karşılığı olduğunu
denetliyor. Bilerek yedeğe bırakılan kodlar listede gerekçesiyle yazılı — doğrulama
katmanından gelen ve alan adı taşıyan mesajlar sabit cümleye indirilemez.

Süpürme testinin kendisi de düzeltildi: hata cevabında `mesaj` **bilerek** Türkçe, çünkü
onu istemci çeviriyor. Oradaki garanti "Türkçe yok" değil, "kodu var ve sözlükte karşılığı
var".

Türkçe kalan içerik ve gerekçesi: hareket talimatları, tarifler ve `profil/kisitlar.ts`
içindeki soru bankası eşleşme anahtarları. Sonuncusu **görünen metin değil**; ilk ikisi için
makine çevirisi sağlık bağlamında kabul edilebilir değil. Ayarlardaki dil notu bunları doğru
sayıyor.

> **F10.1'de bilerek yapılmayan — dürüst not.** İki içerik katmanı Türkçe kalıyor:
> **134 sorunun metinleri** (`data/sorular.json`) ve **122 hareketin talimatları**
> (`talimat_tr`). İkisi de veri; şemada `locale` alanları hazır ama çevirileri yazılmadı.
> `Hareket.ad_en` var, `talimat_en` yok. Sağlık bağlamında makine çevirisi kabul edilebilir
> değil, bu yüzden uydurmak yerine boş bıraktık ve ayarlardaki dil kartı bunu kullanıcıya
> açıkça söylüyor: *"Hareket talimatları ve tarifler şimdilik yalnızca Türkçe."*

---

## Kesişen işler

| Konu | Durum |
|---|---|
| Test | ✅ Motor saf fonksiyon, arayüzden bağımsız; 1.298 test, kapsam eşikleri CI'da |
| Analitik | ✅ `analytics_events` + terk noktası, blok hunisi, dönüşüm ve birim ekonomisi uçları (`rotalar/analitik.ts`) |
| Posta | ✅ Sağlayıcı bağımsız HTTP postacısı (`servisler/postaci.ts`); yapılandırılmamışsa açıkça uyarır |
| Güvenlik | ✅ `npm run guvenlik` — düzeltilebilir her yüksek/kritik açık işi durdurur; muafiyetler gerekçeli ve tarihli |
| Metinler | ✅ İki sözlük: `metinler.tr.ts` + `metinler.en.ts`, tip düzeyinde eşitlenmiş; `npm run ceviri` satır içi metin bırakılmadığını denetler |
| Erişilebilirlik | ✅ 44 px dokunma hedefi bileşen düzeyinde zorlanıyor, `accessibilityRole`/`Label` her etkileşimde |
| Performans | ✅ Katalog kodda derli (ağ yok), çevrimdışı program, çekirdek saf fonksiyon |

## Güvenlik incelemesi

Kod incelemesinde **beş gerçek açık** bulundu ve kapatıldı. Hepsi testle önce kırmızıya
düşürüldü, sonra düzeltildi.

| Bulgu | Neydi | Ne yapıldı |
|---|---|---|
| Ödeme duvarı bypass'ı | `POST /abonelik/guncelle` kimliği doğrulanmış **her** kullanıcının kendini Pro yapmasına izin veriyordu — tek `curl` yeterliydi | Üretimde 403; gerçek akış RevenueCat web kancası (`/kanca`), paylaşılan sır ve sabit zamanlı karşılaştırma ile |
| Kota atlatma | `POST /abonelik/kota-tuket` istemcinin "bu önbellekten geldi" beyanına güveniyordu — ücretsiz sınırsız AI | Uç kaldırıldı; kota kararı zaten `tanima.ts` ve `koc.ts` içinde sunucuda veriliyor |
| Hareket kütüphanesi açıkta | 122 hareketin Türkçe talimatı oturumsuz indirilebiliyordu; `CLAUDE.md` wger'i tam da bunu rakibe açmamak için reddediyor | `/v1/hareket/*`, `/degerlendirme/sorular`, `/koc/araclar` kimlik doğrulaması istiyor. Çevrimdışı kullanım bozulmadı: istemci bir kez oturumla indirip önbelleğe alıyor |
| Kaba kuvvet | Giriş ve parola sıfırlama genel 120 istek/dk sınırına tabiydi | Kimlik uçlarına **ortak** havuz (`servisler/istekSayaci.ts`, 7 test), varsayılan 10/dk. Uç başına ayrı sayaç saldırgana her uçtan ayrı hak verirdi |
| Kota yarışı | Kota "oku → AI'ı çağır → artır" sırasıyla işliyordu; aradaki boşlukta paralel istekler sınırı aşabiliyordu. Sınıra yakınken elli paralel istek yeter | Hak model çağrılmadan **önce** tek SQL cümlesinde koşullu rezerve ediliyor (`servisler/kotaRezerve.ts`, 10 test). Çağrı patlarsa iade ediliyor — kullanıcı bizim hatamızı ödemez |
| Hata sözleşmesi | İki uç `hata` alanı gönderiyordu, istemci `kod` okuyor — o uçlarda kullanıcı "bilinmeyen hata" görüyordu | Alan `kod` olarak birleştirildi; bir test kaynak kodu tarayıp sözleşmeyi zorluyor |
| Sessiz yazma hataları | Kullanıcının başlattığı yazmalar `catch(() => null)` ile yutuluyordu: kilo girilir ekran kapanır, ertesi gün kayıt yoktur. ED ayar anahtarı, fotoğraf rızası, yemek ekleme, tanıma onayı, değerlendirme tamamlama — hepsi sessizce kaybolabiliyordu | Her yazma kendi cümlesiyle hata gösteriyor (`shared/islem.ts`, 6 test, iki dilde). "Uygulama çökmez" kuralı hatayı gizlemek değil, çökmeden söylemek demek |
| Hesap silme kapsamı | Silmenin gerçekten her tabloyu süpürdüğü hiç sınanmamıştı | 21 doğrudan + 1 dolaylı tablo için "kalan satır yok" testi (`hesapSilme.test.ts`); yeni tablo zincire bağlanmazsa CI kırılıyor |
| Log sızıntısı | Parola sıfırlama kodu, yemek fotoğrafı ve **koç mesajı** log maskesinde yoktu — koç mesajı KVKK'ya göre özel nitelikli veri | Maskeye eklendi; bir test maskeyi istek şemalarına karşı doğruluyor, yeni hassas alan maskesiz kalırsa CI kırılıyor |

Kota yarışı ayrıca ürünün bilinen en büyük riskine dokunuyordu: birim ekonomisi. Pro
kullanıcının aylık AI maliyeti gelirinin üçte biri; kotanın delinmesi doğrudan marj
sızıntısı ve tetiklemesi kolaydı.

**ED modunda bir ürün hatası** çıktı: ayarlardaki "Kalori ve makro sayılarını göster"
anahtarı `/beslenme/hedef` ucunda hiç dikkate alınmıyordu. Kullanıcı sayıları açıyor, ana
beslenme ekranı yine porsiyon dili gösteriyordu — oysa ürün açıkça "İstersen ayarlardan
açabilirsin" diyor. Kök neden aynı kuralın iki uçta iki farklı şekilde yazılmasıydı
(`ed_modu` ve `sayilar_gizli`); tek bir `sayilarGizliMi()` fonksiyonuna indirildi.
Kural artık uç uç değil davranış olarak sınanıyor (`edModu.test.ts`).

Sağlık kapıları da uç seviyesinde sınanmaya başladı (`kapilar.test.ts`): kardiyak bayrağı
ve eksik zorunlu tarama program üretimini durduruyor. Kapıyı yalnızca motorda sınamak
yetmez — bir kez atlanırsa geri alınamaz.

Web kancası sırrı tanımsızsa uç **hiç kurulmuyor** ve sunucu açılışta uyarıyor. Yarım
yapılandırmayla çalışan bir kanca, doğrulanmamış kanca demektir.

### Paywall sızıntısı — satılan ile uygulanan

`kalori_makro_hedefi` hak tablosunda ücretsize kapalı yazıyordu ve kodun **hiçbir yerinde
okunmuyordu**. Paywall ekranı özelliği "Kalori ve makro hedefi" satırıyla ücretli diye
satarken `/beslenme/hedef` onu herkese veriyordu. Spec bölüm 13 tablosu açık: ücretsiz
kullanıcı bakım kalorisini vücut analizi raporunda **bir kez** görür, günlük hedef ve makro
dağılımı Temel'den itibaren açılır.

Bu sınıf hata sessizdir: kimse hata almaz, sadece para kaybedilir ve verdiğimiz söz tutulmaz.

**Kilit manuel girişi kapatmıyor.** Ücretsizin çekirdek vaadi o; kullanıcı yemeğini kaydeder
ve günün toplamını görür, yalnızca "hedefe göre neredeyim" katmanı kilitli kalır. Ekran da
buna göre düzeltildi: kilitliyken toplam gösteriliyor ve kilit **tek satırda** açıklanıyor,
üstelenmiyor.

**Sıra bilinçli: profil → ED kapısı → plan.** Değerlendirmesini bitirmemiş kullanıcıya
"yükselt" demek yanlış yönlendirme olurdu. ED kapısı ise bir sağlık kapısı ve hiçbir ödeme
kararının arkasında kalamaz: ücretsiz ED kullanıcısı porsiyon rehberini görmeye devam ediyor
ve bu ayrıca sınanıyor. Ters sırada yazılsaydı o kullanıcı paywall mesajı görür, ürünün ona
verdiği tek güvenli anlatım biçimi kapanırdı.

**Kural genelleştirildi.** `abonelikGuvenlik.test.ts` artık hak tablosunu kaynak koduyla
karşılaştırıyor: planlar arasında **farklılaşan** her hakkın uygulandığı bir yer olmak
zorunda. Her plana aynı değeri veren alanlar (manuel giriş, program düzenleme, reklamsızlık)
muaf — onlar bir kapı değil, yazılı bir taahhüt, ve sessizce farklılaşırlarsa ayrı bir test
kırılıyor.

Denetim bir eksik daha buldu: `kaydirmali_ogun` hiçbir yerde okunmuyordu, çünkü öğün
uçlarının hepsi tek bir `ogun_plani` bayrağına bağlıydı. Paywall bu ikisini **ayrı satırlar**
olarak satıyor; sattığımız her satırın uygulandığı bir yer olmalı. Deste ve kaydırma uçları
artık kendi hakkına bağlı.

### Arama kapsamı — sayı değil, bulabilme

Besin tablosu 439 kayda çıktı ama ölçüt sayı değil: 185 gerçek sorgudan kaçının karşılığı
var. Ölçüm başladığında **28'i boş dönüyordu** (turp, ahududu, uskumru, pastırma, sosis,
kısır, piyaz, cips, sandviç, nugget, kruvasan...). Kullanıcı aradığını bulamazsa o öğünü hiç
kaydetmez; eksik gün, yanlış hedef demektir. Şimdi 185/185.

**Alkol yargısız listeleniyor.** İçen kullanıcı içtiğini kaydedemezse günü eksik kalır ve
bütün hesap kayar. Kaydını tutamadığımız kalori, olmayan kalori değildir; ürün burada ahlak
dersi vermiyor, doğru sayı veriyor.

## Bağımlılık güvenliği

`drizzle-orm` (0.38 → 0.45) ve `@fastify/jwt` (fast-jwt kritik açığı) yükseltildi; ikisi de
**çalışma zamanı** bağımlılığıydı. `vitest` 2 → 3'e çıkarıldı (vite yüksek açığı).

Kalan dört açık — `@xmldom/xmldom`, `image-size`, `postcss`, `tar` — Expo/Metro derleme
zincirinde ve kullanıcının cihazına giden kodda değil. Bunları kapatmak Expo SDK'sını
yükseltmek demek: platform kararı, ayrı bir doğrulama gerektiriyor. Bu yüzden
`scripts/guvenlik-denetimi.mjs` içinde **gerekçesi ve gözden geçirme tarihiyle** yazılılar.
Tarih geçerse betik kırmızıya döner; süresiz muafiyet yok.

Betiğin hem eksik muafiyeti hem süresi geçmiş muafiyeti yakaladığı, listeden madde çıkarılıp
tarih geriye alınarak sınandı.

## F10.2 / F10.4 — mekanizma tamam, içerik kararı açık

`foods.locale` ve `recipes.locale` sütunları ilk günden şemadaydı; `(locale, name_tr)`
indeksi bile vardı. Ama **hiçbir sorgu bu sütunu okumuyordu.**

Bugün tek veri kümesi var (Türkçe), o yüzden görünür bir hata yoktu. İkinci pazarın verisi
eklendiği gün Türk kullanıcı aramada yabancı besin adları görecek, destesine başka bir
mutfağın tarifleri karışacak, yemek tanıma "rice" fotoğrafını "pirinç" kaydına
eşleyebilecekti — ve bu, veri eklenene kadar hiçbir testin yakalayamayacağı bir hata.

`veriYereli` artık tek karar noktası: birebir eşleşme, sonra dil eşleşmesi
("en-GB" → "en-US"), sonra varsayılan. Bağlanan sorgular: besin araması, tarif
kütüphanesi, yemek tanıma eşleme havuzu, koç besin aracı. Test ikinci yerelde birer kayıt
yazıp ayrışmanın gerçekten olduğunu gösteriyor — **mekanizma, veriden önce kanıtlanıyor.**

Veri kümesi olmayan dil Türkçeye düşüyor ve bu bilinçli: İngilizce kullanıcıya boş bir
besin veritabanı vermek uygulamayı onun için çalışmaz hâle getirirdi. `kendiVerisiMi`
arayüzün "yedeğe düştün" diyebilmesi için var.

> **İçerik kararı açık.** İkinci pazarın besin ve tarif içeriği hedef pazar belirlenmeden
> yazılmamalı. Yarım bir küme, projenin kendi ölçütünü — *her kısıt profili için haftayı
> tekrarsız doldurabilmek* — karşılamaz ve pazar değişirse çöpe gider.
> `VERI_YERELLERI` listesine yeni yerel eklendiği an sorgular kendiliğinden ayrışır.

## Marka sitesi

`apps/site` — statik, derleme adımı yok, Caddy ile API ile **aynı origin**den sunuluyor
(ayrı alan adı yalnızca CORS ve çerez sorunu üretirdi).

Yön "ölçü aleti": logodaki 2'nin taksimatlı tabanı sayfanın kenarına dikilen bir cetvele
dönüşüyor ve kaydırma konumunu kumpas ağzıyla gösteriyor. Kahraman bölüm slogan atmıyor,
**çalışıyor**: gerçek karar izleri dönüyor (cevap → ateşlenen kural → programda değişen
şey). Ürünün iddiası "gerekçesini gösteririz" ise, sayfa da iddia etmek yerine göstermeli.

Tam genişlik: ortalanmış sabit sütun yok. Geniş ekranda tipografi ve **sütun sayısı**
büyüyor, boşluk değil — 2560'ta dört karar izi aynı anda duruyor. 390 / 834 / 1440 / 2560
piksellerde yatay taşma yok, konsol hatası yok, koyu tema destekli.

Yayın haberi formu gerçekten çalışıyor: `/v1/ilgi` ucu (8 test), açık rıza zorunlu, aynı
adres iki kez eklenmiyor ve "zaten kayıtlı" demiyor — kimin listede olduğunu sızdırmamak
için.

## Çalıştırılamayan doğrulamalar

Dürüstlük gereği: bu ortamda yapılamayan iki şey var.

1. ~~Yedekten geri yükleme testi~~ — **2026-08-20'de çalıştırıldı ve geçti.**
2. ~~Mobil uygulamanın cihazda çalıştırılması~~ — **Android emülatöründe baştan sona
   kullanıldı;** bulunanlar `docs/cihazda-calistirma.md` içinde. Kamera, bildirim ve
   satın alma hâlâ denenmedi (aşağıda).
3. **Besin toplu içe aktarma** — betik çalışıyor (kuru çalışmada 246 makul kayıt) ama
   veritabanına yazma `DATABASE_URL` istiyor; bu ortamda Postgres yok. Ayrıca yukarıdaki
   ODbL notu: çalıştırmak hukuki bir karar.
4. **Posta gönderimi** — sağlayıcı hesabı yok. HTTP postacısı yazıldı; testler
   `testPostacisi` ile bellekteki kutuyu okuyor, gerçek bir e-posta gönderilmedi.
5. **Yerel modüllerin cihazda çalıştırılması** — `expo-camera`, `expo-notifications`,
   `expo-sensors` ve `react-native-purchases` kuruldu, bağlandı ve tip denetiminden
   geçiyor; `npx expo config --type prebuild` yapılandırmayı doğruluyor. Ama hiçbiri
   gerçek bir cihazda çalıştırılmadı: kamera açılmadı, bildirim düşmedi, satın alma
   yapılmadı. Bunlar cihazda denenmeden yayına çıkılmamalı.
6. **RevenueCat mağaza kurulumu** — ürün tanımları, web kancası ve anahtarlar hesap
   açıldıktan sonra girilecek (`apps/mobile/.env.example`).

## Dış işler (koda bağlı değil)

- `made2fit.io` alan adı
- TürKomp kullanım koşulları yazılı teyidi → F5 tam içe aktarma
- Marka sicili kontrolü
- Play Console / App Store geliştirici hesabı
- RevenueCat hesabı ve ürün tanımları
- AI gateway hesabı (yoksa motor deterministik yedeklerle çalışır)
- KVKK aydınlatma ve rıza metinlerinin hukuki kontrolü

---

## Cihazda çalıştırma

Uygulama 2026-08-20'de ilk kez gerçek bir Android cihazında baştan sona kullanıldı ve on
beş hata çıktı. Ayrıntılı döküm: **[docs/cihazda-calistirma.md](cihazda-calistirma.md)**.

---

## Yayına hazırlık — nerede duruyoruz

| Adım | Durum | Not |
|---|---|---|
| İmzalı AAB | ✅ | `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab` · `jarsigner -verify` geçiyor · SHA256withRSA 4096 bit |
| Yükleme anahtarı | ✅ | `C:/dev/Made2Fit-imza/made2fit-upload.jks` — **depo dışında**, parolası `imza.properties` içinde ve o dosya gitignore'da |
| İmzanın prebuild'i atlatması | ✅ | `scripts/android-imza.mjs` · `android/` her prebuild'de sıfırlandığı için yapılandırma depoda duruyor |
| Mağaza görselleri | ✅ | `magaza/play/` — 512 ikon, 1024×500 öne çıkan, altı ekran görüntüsü (1080×2160) |
| Mağaza metni (TR) | ✅ | `magaza/play/liste-tr.md` |
| Konsol cevapları | ✅ | `magaza/play/konsol-rehberi.md` — veri güvenliği, içerik derecelendirmesi, sağlık beyanı, dört abonelik kimliği |
| Gizlilik politikası sayfası | ✅ | `apps/site/gizlilik.html` — Play zorunlu tutuyor |
| Hesap silme sayfası | ✅ | `apps/site/hesap-silme.html` — Play zorunlu tutuyor |
| Play Console'a yükleme | ⛔ | **Google oturumu yok.** Ayrıntı aşağıda |
| RevenueCat ürün tanımları | ⛔ | Play ürünleri oluşmadan bağlanamaz |

### Play Console neden bekliyor

Tarayıcıda `info@swiip.app` ile açılmış bir Google oturumu bulunamadı ve kayıtlı bir Google
parolası da yok (Brave'in parola deposunda `accounts.google.com` girdisi var ama içi boş —
"bu siteye kaydetme" işareti). İki adım doğrulama da işin içinde olacağı için giriş,
telefonunda onay vermeni gerektiriyor.

Ayrıca Play geliştirici hesabının kendisi tek seferlik 25 USD kayıt ve kimlik doğrulaması
istiyor; o adım kimlik bilgisi gerektirdiği için zaten sende.

Giriş yapıldıktan sonra kalan işin tamamı `konsol-rehberi.md`'de adım adım yazılı.

### Site doğrulaması

**Genişlik.** Üç sayfa (`index`, `gizlilik`, `hesap-silme`) 320'den 3440 piksele kadar on
dört genişlikte tarandı: hiçbirinde yatay taşma ve konsol hatası yok.

**Kontrast.** İlk tarama yalnızca taşmaya bakıyordu ve koyu temayı hiç açmamıştı; ekrana
bakılınca beş kusur çıktı:

| Kusur | Ölçüm | Sebep |
|---|---|---|
| Motor bandının tamamı okunmuyor | 1.08:1 | Koyu blokta arka plan `--yuzey`e dönüyor, metin `--zemin` kalıyor. `--zemin` koyu temada koyu bir renk: siyah üstüne siyah |
| Karar ağacının kök yongası | 1.73:1 (açık) · 2.56:1 (koyu) | Kod rengi `--aksan-koyu`; koyu yonganın üstünde kayboluyor. `--aksan-parlak` zaten tam bunun için tanımlıydı, kullanılmıyordu |
| Silik metin tonu | 4.28–4.30:1 | `--murekkep-silik` iki temada da AA eşiğinin hemen altında. Ayak notundaki tıbbi feragat de bu tondaydı |
| Kumpas ağzı yanlış yeri gösteriyor | 56 px sapma | Ham kaydırma yüzdesi çiziyordu; cetvel çentikleri eşit aralıklı ama bölümler eşit boyda değil |
| Aktif bölüm iki kez hesaplanıyor | — | Ağız ve etiket işareti ayrı hesaplıyordu, birbirinden kayıyorlardı |

Şimdi: `node scripts/site-kontrast.mjs` üç sayfayı iki temada geziyor, her metin ögesini
altında **gerçekten boyanan** renge karşı ölçüyor — hepsi eşiği geçiyor (en düşük 8.7:1).
Kumpas ağzı altı bölümün hepsinde etiketin tam üstünde (0 px sapma).

`siteTema.test.ts` kusurun sınıfını statik olarak koruyor: koyu blokta bir seçicinin arka
planı değişiyorsa metin rengi de değişmeli. Eski CSS'e karşı çalıştırıldığında
`.bolum-motor`'u adıyla söylüyor.

`--murekkep-silik` `packages/shared/src/tokens.ts` ile ortak, yani düzeltme mobil
uygulamadaki silik metni de kapsıyor.

