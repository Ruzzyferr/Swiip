# Swiip — Ürün Spesifikasyonu

Sürüm 1.0 · Bu belge kod yazmadan önce okunur. Kararların dayanağı `rakip-analizi.md`.

---

## 1. Ürün tezi

Kullanıcının 134 soruya verdiği cevapları ve vücut fotoğrafını, **gerekçesi görünür** bir
antrenman ve beslenme programına çeviren koç.

Rakip analizinde ölçtüğümüz şey şuydu: YAZIO 8 soru soruyor, Fitify sakatlık bile sormuyor
ve Türkiye'nin en çok beğenilen fitness şikâyeti tam bu (69 beğeni: *"bel fıtığım ve omuz
sakatlığım var, sorulsaydı riskli hareketlerden kaçınılırdı"*). Kimse derinlemesine sormuyor
çünkü derin soru sormak dönüşümü düşürür.

**Bizim bahsimiz tersi: derinlik dönüşümü düşürmez, güveni kurar.** 134 soruya cevap veren
biri, karşısına çıkan programda kendi cevaplarını görürse ödemeye hazır hale gelir.

> Program satmıyoruz, **gerekçe** satıyoruz. Rakibin veremediği şey program değil, o
> programın neden sana ait olduğunun kanıtı.

### Ne yapmıyoruz

Bilinçli olarak reddedildi, "sonra ekleriz" listesinde değil:

- **Sosyal akış, arkadaş takibi, lider tablosu** — moderasyon yükü ve boş-ağ problemi
- **Oyunlaştırma** — rozet, elmas, seri, konfeti yok
- **Giyilebilir cihaz senkronu** — v2
- **Canlı insan koç pazaryeri** — farklı iş
- **Video ile form analizi** — güvenilmez ve sorumluluk çok yüksek

---

## 2. Veriden gelen tasarım kuralları

Her kural 14.960 Türkçe yorumda ölçülmüş bir bulguya bağlı. Tasarım tartışmasında hakem
bu tablodur — tercih değil, kanıt.

| Kural | Ölçülen bulgu | Uygulama karşılığı |
|---|---|---|
| Aynı yemek her zaman aynı makro | EatBetter: *"aynı şeyi eklediğimde farklı makrolar"* | Besin değeri veritabanından, LLM'den değil |
| Ödeyene sıfır reklam | EatBetter: *"3 aylık aldım, kaydet'e basıyorum reklam çıkıyor"* | Ödeyen kullanıcıya hiçbir promosyon arayüzü yok |
| İptal tek tuş | Pilates Workout negatiflerinin %42'si iptal/iade | Ayarların en üstünde, tek adım |
| Fiyat tek ekranda, dönem net | YAZIO 214 beğenili: aylık sanıp yıllık 600₺ kesilmiş | Toplam tutar ve yenileme tarihi büyük punto, önseçim yok |
| Oyunlaştırma yok | YAZIO'da 120 beğenili iki şikâyet: *"çocuk muyuz biz"* | İlerleme yalnızca gerçek veriyle |
| Sakatlık ilk sınıf vatandaş | Fitify 69 beğenili şikâyet | Vücut haritası zorunlu adım |
| Hareket açıklamaları Türkçe | Fitify 144 beğenili tek talep; Strava 5★'larının sebebi | Tüm hareket adı, talimat, altyazı Türkçe |
| Program düzenlemek ücretsiz | Hevy'nin en beğenilen övgüsü | Hareket değiştir, gün kaydır, ağırlık düzelt — duvarsız |
| Uygulama çökmez | Diyetkolik negatiflerinin %34'ü teknik; "açılmıyor" 54 kez | Program çevrimdışı okunabilir |
| Ev yemeği gerçeği | Hiçbir rakip "yemeğini kim pişiriyor" diye sormuyor | B5; "ailem" ise menü dayatmaz, porsiyon verir |
| Bütçe farkındalığı | Türkiye'de bağlayıcı kısıt, rakiplerde yok | B8 öğün planını kısıtlar |
| Ramazan modu | Hiçbir global rakipte yok | B12; öğün penceresi ve antrenman saati değişir |

---

## 3. Değerlendirme protokolü

**Tam içerik `data/sorular.json` dosyasında** — 134 soru, şıkları, sürücüleri, dallanma
mantığı ve güvenlik kapılarıyla birlikte.

Kaynak: PAR-Q+ 2024 sağlık taraması, ACSM ön katılım değerlendirmesi, standart PT alım
formları, diyetisyen beslenme değerlendirmesi. Üstüne Türkiye'ye özgü sorular eklendi.

### Blok yapısı

| # | Blok | Soru | Blok sonu geri bildirimi |
|---|---|---|---|
| 1 | Kimlik ve kapı | 12 | "Bakım kalorin yaklaşık 2.340 kcal" |
| 2 | Hedef | 10 | "Bu hedef 14 haftada gerçekçi" |
| 3 | Antrenman geçmişi | 14 | "Orta seviye. Haftada 14-18 set/kas grubu" |
| 4 | Sağlık ve sakatlık | 20 | "3 hareket havuzdan çıkarıldı" |
| 5 | Ekipman ve ortam | 12 | "Salonunda 87 hareket yapılabilir" |
| 6 | Zaman | 8 | "Upper/Lower 4 gün sana uygun" |
| 7 | Yaşam ve toparlanma | 12 | "Uykun kısa, hacmi %10 düşürdüm" |
| 8 | Beslenme | 25 | "Protein hedefin 132 g" |
| 9 | Tercih ve psikoloji | 10 | "Kardiyoyu sevmiyorsun, minimuma indirdim" |
| 10 | Ölçüm ve fotoğraf | 6 | vücut analizi |

Tahmini süre 11-14 dakika. **Her blok bittiğinde profil kaydedilir**; yarıda bırakan
kullanıcı kaldığı yerden devam eder ve en değerli yeniden pazarlama hedefidir.

### Kuralı

**Her sorunun bir sürücüsü vardır.** Sürücüsü olmayan soru sorulmaz — dolgu soru yoktur.
`sorular.json` içindeki `drives` alanı bunu tanımlar.

---

## 4. Güvenlik kapıları

Dört kapı program üretimini **durdurur**. Uyarı değil, engel. Sağlık bağlamında yanlış
program vermek, program vermemekten çok daha kötüdür.

| Kapı | Tetik | Davranış |
|---|---|---|
| 18 yaş altı | K7 = Hayır | Kayıt tamamlanmaz |
| Gebelik / emzirme | K6 = Evet | Program üretilmez, yönlendirme yapılır |
| Kardiyak kırmızı bayrak | S2, S3 veya S7 = Evet | Doktor onayı yüklenene kadar program yok |
| Yeme bozukluğu | S18 = Evet | Program üretilir, **sayılar gizlenir** |

**Kapı tasarım ilkesi:** kullanıcıyı suçlamaz ve kapıyı çarpmaz. Ne olduğu, neden olduğu ve
ne yapabileceği söylenir. Verisi silinmez, döndüğünde devam eder.

**S18 pazarlık edilemez.** EatBetter'ın gerçek bir yorumu:
*"I'm recovering from an ED and everything is measured and weighed... this app did a great
job bringing back some extremely negative thoughts."*
Bu kullanıcıda kalori, kilo grafiği ve makro yüzdeleri varsayılan olarak gizlenir. Beslenme
"porsiyon ve öğün düzeni" dilinde anlatılır. Kullanıcı isterse açar; biz açmayız.

---

## 5. Vücut analizi

Ücretsiz katmanın yarısı. Kullanıcının para vermeden önce aldığı en somut değer.

### Çekim protokolü

- Telefon yere dik, 2 metre, göğüs hizası — **jiroskopla açı doğrulanır**, eğikse çekim yok
- Düz ve sade zemin, gündüz ışığı, tepe ışığı değil
- Dar veya spor kıyafet, vücut hattı görünür
- Üç poz: ön (kollar 45°), yan, arka
- Sonraki ölçümlerde **hayalet çerçeve**: önceki fotoğrafın silueti yarı saydam gösterilir

### Çıkarılan veriler

| Çıktı | Yöntem | Sunum |
|---|---|---|
| Yağ oranı | Görsel model + varsa Navy formülüyle çapraz doğrulama | **±3-4 puan aralık**, tek sayı asla |
| Kas dağılımı | Bölge bazlı gelişmişlik skoru | Göreli sıralama |
| Duruş eğilimleri | Yan profil: omuz protraksiyonu, pelvik eğim, baş öne | "Eğilim" dili, **tanı dili yasak** |
| Somatotip | Omuz/bel oranı, uzuv oranları | Yaklaşık |
| Bel/boy oranı | F1 ölçüsü | 0,5 üstü uyarı |

### Gizlilik mimarisi — pazarlık edilemez

Fotoğraf **asla kalıcı saklanmaz**. Akış: cihazda çekilir → şifreli kanaldan analiz
servisine gider → çıktı üretilir → **fotoğraf aynı istek içinde bellekten silinir**, diske
hiç yazılmaz. Saklanan tek şey sayısal çıktılar ve kullanıcının kendi cihazındaki kopya.

Karşılaştırma özelliği tamamen **cihaz üzerinde** çalışır. Kullanıcı telefon değiştirirse
fotoğraflar gider — bunu ona açıkça söyleriz.

Kazanç: KVKK'da özel nitelikli veri saklama yükünden kurtuluruz, ve Türkiye'de indirmeyi
öldürebilecek en büyük çekinceyi pazarlama argümanına çeviririz.

### Ücretsiz teslim edilen rapor

Yağ oranı aralığı · bakım kalorisi ve hedefe göre günlük ihtiyaç (sayı verilir, plan
verilmez) · kas dağılımı haritası · duruş eğilimleri · antrenman yaşı ve hacim kapasitesi ·
sakatlığa göre çıkarılan hareketler ve gerekçesi · hedefin gerçekçiliği.

**Bu teşhistir, reçete değildir.** Alıp gitmesi işe yaramaz: bakım kalorini bilmek sana
periyodize program vermez.

---

## 6. Program üretim motoru

Tamamen **deterministik**. Aynı profil her zaman aynı programı üretir. Test edilebilir,
açıklanabilir, ucuz, çevrimdışı çalışır. AI yalnızca çıktının **anlatımını** üretir.

### Beş aşama

```
1. PROFİL DERLEME
   134 cevap → yapılandırılmış profil
   Antrenman yaşı, toparlanma kapasitesi, kısıt listesi, hedef vektörü

2. HACİM BÜTÇESİ
   Kas grubu başına haftalık set sayısı
   Taban: antrenman yaşı → MEV/MAV/MRV aralığı
   Düzeltmeler çarpımsal uygulanır

3. SPLIT SEÇİMİ
   2 gün → Full Body ×2
   3 gün → Full Body ×3 | Upper/Lower/Full
   4 gün → Upper/Lower ×2
   5 gün → Upper/Lower/Push/Pull/Legs
   6 gün → Push/Pull/Legs ×2

4. HAREKET SEÇİMİ (kısıt çözücü)
   Sert filtreler:  ekipman yok → çıkar
                    sakatlık kontrendikasyonu → çıkar
                    kullanıcı reddetti → çıkar
                    teknik güveni düşük → makine/dumbbell varyantı
                    tavan alçak → baş üstü çıkar
                    gürültü kısıtı → pliometrik çıkar
   Skorlama:        hedef uyumu × tarz tercihi × uyaran/yorgunluk oranı
                    × ekipman erişilebilirliği (kalabalık salon cezası)
   Yerleşim:        bileşik önce, izolasyon sonra
                    kas grubu hacmi bütçeye eşitlenene kadar doldur

5. YÜK VE İLERLEME
   Başlangıç yükü: 1RM tahmini × hedef tekrar yüzdesi × güven düzeltmesi
   İlerleme: çift ilerleme (önce tekrar, sonra ağırlık)
   Deload: 4-6 haftada bir veya yorgunluk tetiklemesiyle
```

### Hacim eşikleri (haftalık set, kas grubu başına)

| Antrenman yaşı | Başlangıç | Hedef | Tavan | Haftalık artış |
|---|---|---|---|---|
| Yeni (<6 ay) | 8 | 10-14 | 16 | +1 set / 2 hafta |
| Erken (6-12 ay) | 10 | 12-18 | 20 | +1 set / hafta |
| Orta (1-3 yıl) | 12 | 14-20 | 22 | +1-2 set / hafta |
| İleri (3-5 yıl) | 14 | 16-22 | 25 | +2 set / hafta |
| Kıdemli (5+ yıl) | 14 | 16-24 | 26 | özelleştirilmiş |

Düzeltme katsayıları **çarpımsal**:

```
uyku < 6 saat          ×0,88
stres ≥ 8              ×0,90
yaş > 50               ×0,90
öncelikli bölge (H6)   ×1,25
aktif sakatlık bölgesi ×0,60
kalori açığı > %20     ×0,90
```

### Kritik karar: program önceden üretilmez

Motor 12 haftalık tablo **çıkarmaz**. Yalnızca **bir sonraki seansı** hesaplar. Haftanın
yapısı ve hedefleri gösterilir, ama 5. haftanın ağırlıkları 4. hafta geri bildirimi
gelmeden var olmaz.

Üç şeyi birden çözer: ürün sızdırılamaz, program gerçekten adapte olur, AI maliyeti tek
büyük çağrı yerine küçük parçalara yayılır.

### "Neden bu hareket" motoru

Çözücü, her hareket seçiminde o hareketi kazandıran kısıtları **kaydeder**. Kullanıcıya
gösterilen gerekçe AI'ın uydurduğu cümle değil, çözücünün karar izidir:

```
hip_thrust seçildi çünkü:
  S17 = bel_fıtığı        → eksenel_yuklenme = yüksek olanlar çıkarıldı
  H6  = kalça önceliği    → kalça baskın patern ×1,25
  E3  = bench mevcut
```

AI bunu Türkçe bir cümleye çevirir, **kararı vermez**.

---

## 7. Seans teslimi ve geri bildirim

### Terk edilen varsayım — salonda kayıt tutma

Bu bölüm başta "canlı seans" olarak tasarlanmıştı: kullanıcı salonda telefonla set
kaydeder, uygulama anında karar verirdi. **Bu varsayım terk edildi.**

Gerekçe: Hevy Türkiye'de 254 bin yorumun yalnızca 245'ini alıyor — %0,1. Doğru okuma
**talep yokluğu**: Türk salon kullanıcısı antrenman sırasında telefonla kayıt tutmuyor ve
bunu istemek ürünün önüne davranış değişikliği şartı koymak demek.

Bunun yerine gerçek PT'lerin Türkiye'de zaten yaptığı şeyi yapıyoruz: **ilerleme kuralı
programın içine yazılır**, kullanıcı uygular.

### Program nasıl teslim edilir

```
BENCH PRESS            4 set × 8-12 tekrar          Başlangıç: 50 kg
  Dinlenme 2-3 dk
  İLERLEME KURALI      Dört setin dördünde de 12 tekrarı tamamlarsan
                       gelecek hafta 2,5 kg ekle.
                       8 tekrarın altına düşersen ağırlığı sabit tut.
  NEDEN BU HAREKET     Omuz sıkışması bildirmedin ve bench mevcut.
                       Yatay itme paterni haftalık hacminin çekirdeği.
  MAKİNE DOLUYSA       Dumbbell press · Makine göğüs presi
```

### Geri bildirim: salonda değil, sonrasında

Kullanıcı programı bir sonraki açtığında tek ekran görür. Üç dokunuş, on beş saniye.

```
"Geçen seansı nasıl geçirdin?"
  Bench press   50 kg × 8-12   [Tamamladım] [Zorlandım] [Yapamadım]
  Hip thrust    60 kg × 10-15  [Tamamladım] [Zorlandım] [Yapamadım]

  Bir yerin ağrıdı mı?  → vücut haritası (opsiyonel)
  Seansı atladım        → sebep sorulur, program kaydırılır

MOTOR KARARI (anında gösterilir)
  "Bench 2,5 kg artıyor → 52,5 kg
   Hip thrust sabit, bir hafta daha 60 kg
   Lat pulldown'da iki hafta üst üste zorlandın, hacmi bir set düşürdüm"
```

Bu tasarım üç şeyi çözer: **davranış değişikliği istemiyor**, **sızıntı koruması duruyor**
(ekran görüntüsü ilk haftayı verir ama ilerleme kararlarını vermez), ve **ürün küçülüyor**
— set kaydı arayüzü, kronometre, senkron kuyruğu, seans içi düzenleme hepsi düşüyor.

### Değiştirme hâlâ ücretsiz ve sınırsız

Hareket değiştirme (muadil zinciri, hacim bütçesi korunur), gün kaydırma, ağırlık düzeltme,
hareket çıkarma. Hiçbiri duvarın arkasında değil.

Program görünümü **çevrimdışı okunabilir** — son program cihazda önbelleklenir.

---

## 8. Beslenme motoru

Tamamen deterministik. Hiçbir kalori veya makro değeri LLM'den gelmez.

```
BMR      Yağ oranı biliniyorsa → Katch-McArdle:  370 + 21,6 × yağsız_kütle
         Bilinmiyorsa           → Mifflin-St Jeor

TDEE     BMR × aktivite çarpanı
         masa başı 1,25 · hareketli iş 1,45 · fiziksel iş 1,70
         + antrenman günü başına ~0,03

HEDEF    Yağ kaybı:    TDEE − (vücut ağırlığının %0,5-1'i/hafta karşılığı)
                       TAVAN: TDEE'nin %25'inden fazla açık ASLA
         Kas kazanımı: TDEE + 200-350 kcal
         Koruma:       TDEE

PROTEIN  Açıkta 2,0-2,4 g/kg yağsız kütle · fazlada 1,6-2,0 g/kg
YAĞ      Minimum 0,6 g/kg vücut ağırlığı (hormonal taban)
KARB     Kalan kalori
LİF      14 g / 1000 kcal, B23'e göre kademeli artırılır
SU       35 ml/kg + antrenman günü +500 ml
```

### Uyum döngüsü

Hesap tek seferlik değil. **Her 2 haftada bir gerçek kilo değişimi ile tahmin karşılaştırılır
ve TDEE geriye dönük düzeltilir.** Formül yanılır, veri yanılmaz. Bu, "kalori hesabı tutmuyor"
şikâyetinin panzehiri.

### Yeme bozukluğu modu

S18 evet ise arayüz tamamen değişir: sayı yok, porsiyon var. "1.850 kcal hedefin" yerine
"her öğünde bir avuç protein, bir yumruk karbonhidrat, iki avuç sebze." Kilo grafiği kapalı.

---

## 9. Yemek tanıma ve besin veritabanı

Sistemin en yüksek hacimli noktası. Mimarinin tamamı maliyeti kırmak üzerine kurulu — ve
yan ürün olarak rakiplerin en büyük kalite sorununu çözüyor.

```
KULLANICI FOTOĞRAF ÇEKER
    │
    ├─ 1. YEREL ÖNBELLEK      Bu kullanıcı bu yemeği daha önce yedi mi?
    │                          Görsel parmak izi eşleşmesi → AI ÇAĞRISI YOK
    │                          Beklenen isabet: %35-45
    │
    ├─ 2. TANIMA + MİKTAR     Ucuz görsel model
    │                          ÇIKTI: kalem listesi + HER KALEMİN MİKTARI
    │                          "3 adet köfte (~120 g)" + "patates (~150 g)"
    │                          ÇIKTI DEĞİL: kalori, makro
    │
    │      Sayılabilir (köfte, yumurta) → model ADET sayar
    │      Şekilsiz (pilav, çorba)      → ev ölçüsü tahmini
    │                                     tabak ve çatal referans nesne
    │
    ├─ 3. VERİTABANI EŞLEME   Kalem adı → besin veritabanı
    │                          Yalnızca BİLEŞİM: "köfte 240 kcal/100 g"
    │                          Toplam = miktar × bileşim
    │
    ├─ 4. KULLANICI DOĞRULAMA "3 köfte · 1 orta porsiyon patates"
    │                          Düzelt / porsiyon değiştir / onayla
    │
    └─ 5. GERİ BESLEME        Düzeltme önbelleğe ve global eşleme tablosuna
```

### Miktar mı bileşim mi

Veritabanı **miktarı vermez, bileşimi verir**. 3 köfte + bol patates ile 5 köfte + az
patates farklı sonuç alır, çünkü miktarı model tahmin eder.

Kaçındığımız hata: **aynı girdinin farklı çıktı vermesi**. Farklı tabağın farklı çıktı
vermesi hata değil, işin kendisi.

### Veritabanı katmanları

| Katman | Türkiye kaynağı | Yeni pazarda | Maliyet |
|---|---|---|---|
| Barkodlu ürün | Open Food Facts | Aynı kaynak, 200+ ülke | Ücretsiz (ODbL) |
| Ham gıda bileşimi | **TürKomp** (TÜBİTAK + Tarım Bakanlığı) | O ülkenin ulusal DB'si (ABD: USDA) | Ücretsiz |
| Pişmiş yerel yemek | **Biz gireriz** — ~700 kalem | O mutfağın katmanı | Emek |
| Ev ölçü birimleri | **Biz gireriz** — kase, tabak, kepçe, kaşık, dilim, avuç | O kültürün birimleri | Emek |
| Zincir restoran | Menü beyanları | Yerel zincirler | Düşük |
| Kullanıcı katkısı | Doğrulama akışıyla | Aynı | Ücretsiz |

`foods` tablosundaki `locale` ve `source` alanları bunun için. Yeni pazar = bir açık
veritabanı bağla + o mutfağın yemek katmanını ekle.

**Not:** Veritabanı bizim *farklılaşmamız değil*, **giriş biletimiz**. Rakip analizinde
"Türk yemekleri hendeği" tezi çürüdü — 15.000 yorumda "yemek bulamıyorum" şikâyeti %0-1.
Öne geçiren şey tutarlılık ve ölçü birimleri. Buraya gereğinden fazla emek yatırıp asıl
ayrışmayı ıskalamak kolay bir hata olurdu.

**Yapılacak:** TürKomp kullanım koşulları yazılı teyit edilmeli.

---

## 10. Öğün planlama, buzdolabı, kaydırmalı değiştirme

Tamamen ödemeli. Planlama motoru bir **kısıt problemidir**, AI serbest yazımı değil.

### Kısıtlar

| Kaynak | Kısıt | Tip |
|---|---|---|
| B9 alerji | Malzeme kesinlikle geçemez | Sert |
| B11 dini/etik | Helal, vejetaryen, vegan | Sert |
| B10 intolerans | Laktoz, gluten, FODMAP ikamesi | Sert |
| B8 bütçe | Öğün başına maliyet tavanı | Sert |
| B7 pişirme süresi | Tarif karmaşıklık tavanı | Sert |
| B5 kim pişiriyor | "Ailem" ise menü değil **porsiyon** | Sert |
| B12 oruç | Ramazan'da öğün penceresi iftar-sahur | Sert |
| B14 vazgeçemediği | Haftada en az 2 kez plana **dahil edilir** | Zorunlu dahil |
| B13 sevmediği | Havuzdan çıkarılır | Yumuşak |
| Makro hedefi | Günlük toplam ±%5 | Sert |

### B5 — hiçbir rakipte olmayan soru

Türkiye'de yetişkinlerin büyük kısmı ev yemeği yiyor ve menüyü **kendi seçmiyor**.
Yabancı uygulamaların "pazartesi somon, salı quinoa" planı bu kullanıcı için baştan çöp.

"Ailem" ise plan menü dayatmaz: *"Bugün ne pişti?"* diye sorar, ev yemeğini alır ve
**porsiyon + tamamlayıcı** önerir — *"kuru fasulyeden 1 kepçe, pilavı yarım porsiyon al,
yanına 150 g yoğurt ekle, protein hedefin tutar."*

### Kaydırmalı öğün değiştirme

Kullanıcı planladığımız öğünü beğenmediğinde, o öğünün **makro bütçesini koruyan**
alternatifler arasında kart kaydırarak gezer.

```
1. MAKRO KİLİDİ      Öğün hedefi sabit: örn. 520 kcal · 35p/45k/22y
                     Destedeki her tarif ±%8 içinde
                     ⇒ Kullanıcı ne seçerse günlük toplam bozulmaz

2. DOLAP KISITI      Yalnızca mevcut envanterle yapılabilenler
                     Envanter yoksa deste açılmaz, önce envanter sorulur

3. SERT FİLTRELER    Yukarıdaki kısıt tablosunun tamamı

4. DESTE BOYUTU      12-15 kart, sonra biter. Sonsuz kaydırma yok

5. BOŞ DESTE ÇÖZÜMÜ  "Dolabındakilerle 3 seçenek çıkıyor.
                      Yumurta ve yulaf eklersen 14 oluyor."
                     Eksik malzeme tek dokunuşla alışveriş listesine

6. ÖĞRENME SİNYALİ   Sağa kaydırma → tercih edilen tarif ve malzemeler
                     Sola kaydırma → bir daha gösterme; malzeme B13'e yazılır

7. MALİYET           Deste bir VERİTABANI SORGUSU, AI çağrısı DEĞİL
                     Tarifler makroları hesaplanmış ve etiketlenmiş saklanır
```

Beslenme planlarının terk edilme sebebi neredeyse her zaman aynı: *"canım onu istemiyor."*
Makro kilidi bunu çözer: kullanıcı özgürlük hisseder, plan sağlam kalır.

### Buzdolabı

Üç giriş yolu: fotoğraf, ses, liste. Çıktı: o anda yapılabilecek ve makro hedefine uyan
tarifler. Alışveriş listesi haftalık plandan otomatik üretilir, markete göre gruplanır
(manav, kasap, şarküteri, kuru gıda).

### Tarif veritabanı

**Yemek listesi sahadan, tarif metni kendimizden.** Türk hukukunda malzeme listesi telif
korumasında değil, ama anlatım metni ve fotoğraf korunuyor. Popüler sitelerden hangi ~800
yemeğin gerçekten pişirildiğini öğreniriz (olgusal bilgi); tarif metnini kendimiz üretir,
makroyu kendi besin veritabanımızdan hesaplarız.

Et, tavuk ve yumurta içeren tariflerin **tamamı** gıda güvenliği için elle kontrol edilir.

---

## 11. AI koç sohbeti

Ödemeli, kotalı. Serbest bir chatbot **değil** — kullanıcının kendi verisine erişimi olan,
sınırları çizilmiş bir koç.

### Erişebildiği araçlar

```
profil_getir()              134 cevap + analiz çıktıları
antrenman_gecmisi(n)        son n seans, geri bildirimler, ilerleme
beslenme_gecmisi(n)         son n gün, hedefe uyum
program_degistir(...)       hareket değiştir, gün kaydır, hacim ayarla
olcum_gecmisi()             kilo, çevre ölçüleri, analiz çıktıları
hareket_bilgisi(id)         teknik, kas, alternatifler
besin_ara(sorgu)            veritabanı sorgusu
```

Koç genel cevap vermez, **kullanıcının kendi verisine bakar**: *"Son 3 haftada ortalama
1.980 kcal aldın, hedefin 1.850'ydi. Kilon 0,4 kg düştü, beklenen 1,2 kg'dı. Fark hafta
sonlarından geliyor: cumartesi ortalaman 2.640."*

### Sert sınırlar

- **Tanı koymaz.** Ağrı, semptom, hastalık sorusu → sağlık profesyoneline yönlendirme
- **İlaç ve takviye dozu vermez**
- **Aşırı kısıtlayıcı hedefi onaylamaz.** "Günde 800 kalori yesem?" → hayır, gerekçesiyle
- **ED modunda** sayı konuşmaz, kilo hedefi tartışmaz
- **Kapsam dışına çıkmaz.** Fitness ve beslenme dışını kibarca reddeder

### Bellek stratejisi

Her mesajda tüm geçmişi göndermek maliyeti katlar. Bunun yerine: **kalıcı profil özeti**
(~600 token) + **son 10 mesaj** + **araç çağrısıyla çekilen ilgili veri**. Konuşma uzadıkça
özetlenir. Token maliyeti sabit kalır.

---

## 12. AI mimarisi ve maliyet

AI dört noktada, başka hiçbir yerde yok.

| Nokta | Sıklık | Model seviyesi | Neden |
|---|---|---|---|
| Değerlendirme yorumlama | Kullanıcı başına 1-2 | En güçlü | Ürünün "vay be" anı, nadir |
| Vücut analizi | Ayda ~1 | Güçlü görsel | Nadir, yüksek değer |
| Yemek tanıma | **Ayda 250'ye kadar (Pro)** | Ucuz görsel + önbellek | Hacim burada |
| Koç sohbeti | Kotalı | Orta | Araçlarla veri çeker |

Erişim **gateway üzerinden**: tek entegrasyon, iş başına model seçimi, sağlayıcı bağımlılığı
yok, fiyat değiştiğinde kod değişmez.

### Aylık maliyet — aktif Pro kullanıcı

| Kalem | Adet | Önbellek sonrası | Maliyet |
|---|---|---|---|
| Yemek tanıma | ~150 | ~90 | $0,35-0,70 |
| Vücut analizi | 1 | 1 | $0,02-0,05 |
| Koç sohbeti | ~80 mesaj | 80 | $0,25-0,50 |
| Değerlendirme | amortize | — | $0,03 |
| Öğün planı | 4 | 4 | $0,05-0,10 |
| **Toplam** | | | **~$0,70-1,40** |

### Marj

| Plan | Aylık brüt | Mağaza payı sonrası | AI maliyeti | Brüt marj |
|---|---|---|---|---|
| Temel | 99₺ | ~84₺ | ~12₺ | ~72₺ |
| Pro | 169₺ | ~144₺ | ~50₺ | ~94₺ |

Mağaza payı ilk 1M dolar için %15 varsayıldı.

**En büyük risk bu.** Marj var ama dar. Kotalar gevşetilirse veya AI yeni yerlere
serpiştirilirse ürün ne kadar çok kullanılırsa o kadar çok kaybettirir. **Yeni bir yere AI
koymadan önce maliyetini hesapla.**

---

## 13. Paywall ve fiyatlandırma

Üç katman. Hikâyesi: **Temel sana planı verir, Pro takibi zahmetsiz yapar.**
**Dördüncü plan asla eklenmez.**

| Özellik | Ücretsiz | Temel 99₺/690₺ | Pro 169₺/1.190₺ |
|---|---|---|---|
| 134 soruluk değerlendirme | Tam | Tam | Tam |
| Vücut analizi + rapor | Bir kez | Aylık | Aylık |
| 1. gün programı | Tam | ✓ | ✓ |
| Manuel kalori girişi + arama | Sınırsız | ✓ | ✓ |
| 2. gün ve sonrası | — | ✓ | ✓ |
| Seans sonrası geri bildirim | — | ✓ | ✓ |
| Kalori ve makro hedefi | — | ✓ | ✓ |
| Öğün planı, tarifler, buzdolabı | — | ✓ | ✓ |
| Kaydırmalı öğün değiştirme | — | ✓ | ✓ |
| Barkod okuma | — | ✓ | ✓ |
| AI koç sohbeti | — | Ayda 60 | Ayda 150 |
| **Fotoğraftan yemek tanıma** | — | — | **Ayda 250** |
| Program düzenleme | — | Sınırsız | Sınırsız |

### Kota adalet kuralları

Şu iki durum **hiçbir zaman kota yemez**:
- Önbellekten gelen tanıma (bize maliyeti sıfır)
- Yanlış tanıma sonrası tekrar deneme (bizim hatamızın bedelini kullanıcı ödemez)

Kota günlük tavan değil **aylık havuz**. Aynı maliyete çok daha cömert hissettirir.

### Paywall ekranı kuralları

- Tek ekran, kaydırma yok, karşılaştırma tablosu var
- Toplam tutar ve yenileme tarihi **en büyük punto**
- Önceden seçili plan **yok**
- "İptal etmek 2 dokunuş sürer, işte nasıl" satın alma ekranında gösterilir
- Geri sayım, sahte kıtlık, "son şans" yok
- Kapatma butonu ilk saniyeden görünür ve gerçekten kapatır

---

## 14. Veri modeli

```
users              id, created_at, locale, birth_date, sex, height_cm,
                   consent_health, consent_photo, ed_mode, medical_gate_status

assessments        id, user_id, version, completed_at, answers_jsonb
                   → 134 cevap; versiyonlu

profiles           user_id, training_age, recovery_score, tdee_estimated,
                   tdee_corrected, volume_budget_jsonb, constraints_jsonb,
                   goal_vector_jsonb, updated_at

body_analyses      id, user_id, taken_at, bodyfat_low, bodyfat_high,
                   muscle_map_jsonb, posture_flags[], measurements_jsonb
                   ⚠ fotoğraf ALANI YOK — bilinçli

exercises          id, name_tr, name_en, primary[], secondary[], equipment[],
                   pattern, contraindications[], technique_difficulty,
                   sfr_score, axial_load, overhead, noise, spotter,
                   increment_kg, alternatives[], instructions_tr[]

sessions           id, user_id, planned_for, status, feedback_at
                   status: planlandi | tamamlandi | atlandi
                   skip_reason

session_items      id, session_id, exercise_id, order_index,
                   target_weight, target_reps_low, target_reps_high,
                   rest_seconds, progression_rule_text, rationale_id,
                   feedback (tamamladim|zorlandim|yapamadim|null),
                   pain_flag
                   -- set bazlı gerçekleşme KAYDEDILMIYOR (bkz. bölüm 7)

progression_state  user_id, exercise_id, current_weight, current_reps,
                   consecutive_success, last_deload_at, e1rm

decisions          id, user_id, session_id, entity_type, entity_id,
                   rule_fired[], inputs_jsonb, explanation_tr
                   → "neden bu hareket" izleri. Ürünün kalbi.

foods              id, name_tr, name_en, per_100g_jsonb, portions_jsonb,
                   barcode, brand, source, verified, locale

food_logs          id, user_id, logged_at, food_id, portion_id, quantity,
                   entry_method, photo_hash, corrected_from

recipes            id, name_tr, ingredients_jsonb, steps_tr[], macros_jsonb,
                   cost_tier, prep_minutes, tags[], verified_by_human

meal_plans         id, user_id, week_of, days_jsonb, constraints_snapshot
shopping_lists     id, plan_id, items_jsonb, grouped_by_aisle
pantry             user_id, items_jsonb, updated_at

coach_messages     id, user_id, role, content, tools_called[], tokens
quotas             user_id, period, food_photos_used, coach_messages_used
subscriptions      user_id, product_id, status, renews_at, platform
```

**`decisions` en değerli tablo.** Kullanıcıya gerekçe gösterir, hata ayıklamayı mümkün
kılar, ve zamanla "hangi kurallar gerçekten sonuç üretiyor" sorusunu cevaplar.

---

## 15. Ekran envanteri

40 ekran.

| Grup | Adet | Ekranlar |
|---|---|---|
| Giriş | 4 | Karşılama, kayıt/giriş, sağlık onayı, nasıl çalışır |
| Değerlendirme | 12 | 10 blok + vücut haritası + hedef vücut görsel seçimi |
| Fotoğraf | 4 | Gizlilik açıklaması, çekim yönlendirmesi, üç poz, bekleme |
| Rapor | 3 | Analiz özeti, kas haritası ve duruş, hedef gerçekçiliği |
| Program | 4 | **1. gün açılışı**, neden bu program, hareket gerekçeleri, haftalık yapı |
| Seans | 4 | Günün programı, hareket detayı + kural, hareket değiştirme, **seans sonrası 3 dokunuş** |
| Beslenme | 7 | Günlük özet, öğün kaydı, fotoğraf tanıma, doğrulama, haftalık plan, tarif, alışveriş listesi |
| Buzdolabı | 4 | Malzeme girişi, uygun tarifler, **kaydırmalı deste**, boş deste |
| Koç | 2 | Sohbet, kota durumu |
| İlerleme | 4 | Kilo ve ölçü, hacim, fotoğraf karşılaştırma, hareket bazlı gelişim |
| Ödeme | 2 | Plan karşılaştırma, abonelik yönetimi |
| Ayarlar | 4 | Profil, bildirimler, gizlilik ve veri, değerlendirmeyi güncelle |

**En kritik ekran: 1. gün açılışı.** Ürünün tamamı burada kazanılır veya kaybedilir.
Kullanıcı 134 soruya cevap verdi, fotoğrafını yükledi, 12 dakikasını harcadı. Bu ekran ona
*"emeğin karşılığını aldın"* demek zorunda — programı göstererek değil, **cevaplarını
programda göstererek**.

---

## 16. KVKK, sağlık ve mağaza uyumu

### KVKK

- Sağlık verisi **özel nitelikli kişisel veridir**; **açık rıza** şart. Kayıt akışında ayrı
  adım, kullanım koşullarının içine gömülemez
- Rıza her kategori için ayrı: sağlık beyanları, ölçüler, fotoğraf. Fotoğrafa rıza vermeden
  diğerlerine verilebilir (F6 çıkış yolu)
- Aydınlatma metni: hangi veri, hangi amaç, ne kadar süre, kimlerle paylaşılıyor (AI servis
  sağlayıcısı açıkça yazılır)
- Erişim, düzeltme, **silme** hakları. Hesap silme uygulama içinden tek akışta ve gerçekten
- Veri dışa aktarma
- Yurt dışına aktarım açıkça beyan edilir ve rızası alınır

### Sağlık sorumluluğu

- Uygulama **tıbbi cihaz değildir** ve teşhis koymaz. Açılışta ve raporda yazılır
- Analiz çıktıları **aralık** olarak sunulur: "%16-21" — "%18,4" değil
- Duruş bulguları "eğilim" dilinde: *"omuzlarında öne kayma eğilimi görünüyor"*
- Dört güvenlik kapısı atlanamaz
- Ağrı bildirimi her zaman programı değiştirir; ısrarlı ağrıda uzman yönlendirmesi

### Mağaza politikaları

- Play **Sağlık uygulamaları** politikası: yanıltıcı vaat yasak. "2 haftada 10 kilo"
  pazarlaması kullanılamaz
- Abonelik kuralları: fiyat, dönem, yenileme satın alma öncesi net
- 18 yaş sınırı ve içerik derecelendirmesi doğru beyan
- Kamera izni gerekçesi ekranda yazar
- Veri güvenliği formu mimariyle tutarlı — fotoğraf saklamadığımız için "toplanmıyor"
  beyanı doğru

---

## 17. Riskler

| Risk | Şiddet | Azaltma |
|---|---|---|
| **Birim ekonomisi** — AI maliyeti marjı yer | Kritik | Kota + PT kıyasına dayalı fiyat + 12 ay içinde global |
| **134 soruda terk** | Yüksek | Blok arası geri bildirim, her blokta kayıt, yarım kalana yeniden pazarlama |
| **Hareket veritabanı emeği** | Yüksek | F1'de 120 temel hareketle başla, kullanıma göre genişlet |
| **Vücut analizi doğruluğu** | Yüksek | Aralık sun, ölçüyle çapraz doğrula, çekim standardını zorla |
| **Sağlık sorumluluğu** | Kritik | Dört kapı, muhafazakâr varsayılan, aralık dili |
| **"ChatGPT'ye sorarım"** | Orta | Ayrışma sohbet değil, **geri bildirimle adapte olan döngü** |
| **Tek geliştirici kapasitesi** | Yüksek | F4 sonunda yayınlanabilir kesit; sonrası gelirle finanse |
| **Mağaza puanı** | Orta | Ücretsiz katman korunur, karanlık kalıp yok |

---

## 18. Marka

**Ölçüne göre.**
*Programın neden o program olduğunu da söyleriz.*

İngilizce: *Made to fit. And made to explain.*

Slogan seçiminde tek kural: **"kişiselleştirilmiş" demek yasak.** Kategorideki herkes bunu
söylüyor, dolayısıyla hiçbir şey söylemiyor.

### İşaret

Rakam 2'nin kendisi bir ölçü aleti: üst kavis çentikli bir açıölçer, taban çizgisi
taksimatlı bir cetvel. Ne yaptığımızı tek bakışta söylüyor.

`brand/mark.svg` · `brand/lockup.svg` · `brand/icon.svg` — üçü de `currentColor` kullanır,
CSS'ten tek satırla renk değişir.

### Renk ve tipografi

- Mürekkep `#131614` · Aksan çam yeşili `#14615A` · Zemin `#F6F7F5`
- **Neon veya turuncu yok** — kategorinin tamamı orada
- Başlıklarda karakterli grotesk, sayısal veride **tabular rakamlı monospace**

Uygulamanın her yerinde kilo, tekrar, kalori, makro var; rakamların hizalanması hem
okunurluk hem "ölçü aleti" hissi verir.

---

## Terk edilen varsayımlar

Tasarım sürecinde çürüyen üç varsayım. Sonradan "bu neden böyle" diye soranlar için:

1. **"Türk yemekleri veritabanı bir hendektir."** Çürüdü — 15.000 yorumda "yemek
   bulamıyorum" şikâyeti %0-1. YAZIO'nun Türkçe içeriği zaten yeterli.

2. **"Program dokümanı sızdırılamaz."** Çürüdü — herhangi bir statik program ekran
   görüntüsü alınıp götürülebilir. Çözüm: programı geri bildirimden hesaplamak.

3. **"Hevy Türkiye'de düşük çünkü Türkçe değil."** Çürüdü — Hevy zaten Türkçe. Doğru okuma
   talep yokluğu; salonda kimse telefonla kayıt tutmuyor.
