# Rakip Analizi

20 uygulama · 14.960 Türkçe Play Store yorumu · Ağustos 2026

Bu belge `spec.md`'deki kararların dayanağıdır. Bir tasarım kuralını değiştirmek istiyorsan
önce buradaki bulguya bak.

**Yöntem:** Play Store sayfalarından global indirme, yorum sayısı ve puan. Play'in yorum uç
noktasından uygulama başına 1.050'ye kadar Türkçe yorum. Tema oranları negatif yorumlar
(1-2 yıldız) üzerinde düzenli ifade taramasıyla. Kategori sıralamaları AppBrain ülke bazlı
top-grossing listelerinden.

**Sınırlar:** İndirme sayıları Play'in kaba kovaları. Yorumlar kullanıcı kitlesini değil
yorum yazanları temsil eder; memnuniyetsizler fazla temsil edilir.

---

## Bulgu 1 — Puan uçurumu

**Türk kullanıcı, aynı uygulamaya dünyanın verdiğinden 1 ila 1,6 yıldız düşük puan veriyor.**
İstisna değil, kural. Sebebi tek kelime: **para.**

| Uygulama | Global puan | TR puan | TR negatif | Fiyat şikâyeti |
|---|---|---|---|---|
| YAZIO | 4,4 | **3,25** | %40 | %47 |
| MyFitnessPal | 4,4 | **3,25** | %40 | %13 |
| Strava | 4,5 | **3,17** | %39 | %26 |
| Lifesum | 4,4 | **3,21** | %39 | %25 |
| Foodvisor | 4,7 | **3,59** | %29 | %61 |
| Fitify | 4,6 | **3,76** | %29 | %76 |
| Freeletics | 4,4 | **3,46** | %35 | %68 |
| Muscle Monster | 4,5 | 4,38 | %15 | **%81** |
| Pilates Workout | 4,7 | 4,59 | %9 | %78 |
| Diyetkolik (TR) | 3,8 | **3,22** | %38 | %17 |
| EatBetter (TR) | 4,8 | 4,20 | %16 | %48 |
| FatSecret | 4,6 | **4,36** | %11 | %22 |
| Hevy | 4,9 | **4,81** | %2 | %0 |
| Home Workout | 4,8 | **4,87** | %2 | %36 |
| Weight Loss for Women | 4,8 | **4,87** | %2 | %10 |

**Kalıp net:** Türkiye'de en yüksek puanlı iki fitness uygulaması (4,87) **ücretsiz ve
reklamlı**. Abonelikli olan her uygulama 3,2-3,8 bandında sıkışmış. Bu ürün kalitesi farkı
değil, iş modeli farkı.

5 yıldızlı yorumlarda en sık geçen övgü kelimesi: **"ücretsiz"**.

### Buradan çıkan kural

Abonelik yasak değil — Hevy'nin de aboneliği var ve 4,81. Yasak olan **karanlık kalıp**:
sürpriz kesinti, iptal edememe, ödediği hâlde reklam görme, ücretsiz olması gerekeni duvarın
arkasına koyma.

---

## Bulgu 2 — Çürüyen tez: Türk yemekleri veritabanı

Başlangıç tezi: *"Yabancı kalori uygulamaları Türk yemeklerini bilmez, yerel veritabanı
savunulabilir bir hendektir."*

15.000 yorum "bulamıyorum / listede yok / türk / ev yemeği / veritabanı" kalıplarıyla tarandı:

| Uygulama | Yemek bulunamadı şikâyeti | Oran |
|---|---|---|
| YAZIO | 13 / 1050 | %1 |
| EatBetter | 8 / 1050 | %0 |
| Diyetkolik | 16 / 1050 | %1 |
| FatSecret | 14 / 1050 | %1 |
| MyFitnessPal | 24 / 1050 | %2 |

**Şikâyet yok.** YAZIO'nun Türkçe içeriği zaten oturmuş. Veritabanı **farklılaşma değil,
giriş bileti**. İyi yapmazsak batarız, iyi yapmak bizi öne geçirmez.

Öne geçiren şey: **tutarlılık** ve **ev ölçü birimleri**.

---

## Bulgu 3 — Rakiplerin somut zaafları

### EatBetter (TR, 100K+ indirme, TR 4,20) — en ciddi rakip

**Güçlü:** TR sağlık top-grossing'e girmiş tek yerli kalori uygulaması. Fotoğraftan tanıma
çalışıyor. Kullanıcıların ayırt ettiği asıl özellik kalori sayma değil, **bir sonraki öğünü
planlaması**.

**Zayıf:**
> *"Asla değerleri doğru hesaplamıyor. Kendim manuel giriyorum, yarın aynı şeyi eklediğimde
> yine farklı makrolar çıkarıyor."* — 1★, 11 beğeni

> *"3 aylık programı satın aldım ama öğün kaydetmek istediğimde kaydet tuşuna basıyorum,
> kaydetmek yerine reklam çıkıyor."* — 1★, 8 beğeni

Ve yorumlarda tekrar eden cümle: *"bunun yerine fotoğrafı ChatGPT'ye atarsan daha mantıklı."*

### YAZIO (TR pazar lideri, TR 3,25)

**Zayıf — faturalandırma:**
> *"Aylık 50 TL ve dilediğiniz zaman iptal seçeneği olduğu için pro seçeneğini tercih ettim.
> Sonra bakıyorum hesabımdan senelik ücret kesilmiş, 600 TL."* — 5★, 214 beğeni

**Zayıf — oyunlaştırma:**
> *"Uygulamayı iyice çocuk oyununa çevirdiniz. Bu tarz animasyon, elmas, sandık gibi şeyler
> yetişkinlere motivasyon sağlamıyor."* — 5★, 65 beğeni

> *"Saçma sapan animasyonlar çok sıkıcı, itici ve zaman kaybı. Çocuk muyuz biz?"* — 1★, 55 beğeni

### Diyetkolik (TR, 1M+ indirme, TR 3,22) — yürütmeyle yenilebilir

**Güçlü:** Gerçekten sadık kitle. En beğenilen üç yorum (75, 67, 64 beğeni) yıllardır kullanan
ve kilo vermiş insanlara ait. Ölçü çeşitliliği rakiplerinden iyi.

**Zayıf:** Uygulama basitçe çalışmıyor. Negatiflerin **%34'ü teknik hata**; "açılmıyor" 54 kez,
"giremiyorum" 19 kez.

Talep edilen özellikler **küçük** ve yıllardır gelmiyor: egzersize göre kalori ayarı, kilo
takibi bildirimi, favorilerin alfabetik sıralanması.

### Fitify (10M+, TR 3,76)

Türkiye'nin en çok beğenilen fitness yorumu buraya ait:
> *"Uygulamanız çok iyi ve kullanışlı ama Türk kullanıcılar için Türkçe dil desteği gerekli.
> Çoğu içerik İngilizce olduğu için kullanamıyoruz."* — 5★, **144 beğeni**

İkinci en beğenilen talep (69 beğeni): sakatlık farkındalığı. Bel fıtığı ve omuz sakatlığı
sorulmadan program yazılıyor.

### Hevy (5M+, TR 4,81, ama sadece 245 Türkçe yorum)

**Güçlü:** Salon antrenman kaydında dünya lideri, aylık 160 bin dolar gelir. Türk kullanıcılar
arasında taradığımız en yüksek memnuniyet. Övülenler: sade arayüz, önceki setlerdeki ağırlığı
gösterme, dinlenme kronometresi, ücretsiz katmanda bile 4 program.

**Kritik bulgu:** Hevy'nin **Türkçe desteği zaten var**.
> *"Sonunda türkçe dil desteği gelmiş, artık pro versiyon alabilirim."* — 5★

Yani Türkiye'deki %0,1'lik pay bir dil sorunu değil. Doğru okuma: **Türk salon kullanıcısı
antrenman sırasında telefonla kayıt tutmuyor.** Bu bulgu spec bölüm 7'yi belirledi.

---

## Bulgu 4 — Pazar boşlukları (AppBrain top-grossing karşılaştırması)

| Kategori | Türkiye | Polonya | Almanya |
|---|---|---|---|
| **Finans** | TradingView, Investing, Fintables, Matriks — **hepsi borsa** | Splitwise, Wallet, Spendee, 4grosze | Finanzguru, Splitwise, Splid, Outbank |
| **Sağlık** | YAZIO, Strava, Foodvisor, Fitify (hepsi yabancı) | **Fitatu #1 (yerel)**, Diet by Ann, Fitollo | YAZIO, Komoot, FDDB |
| **Yemek** | Tomati, Kuşkuş (tarif kaydetme) | Cookidoo, Pierwsze Smaki | Chefkoch, KptnCook, Choosy (menü planlayıcı) |
| **Ebeveynlik** | **Tamamı takip/casus uygulaması** | — | — |

Polonya'da **yerel** bir kalori takipçisi (Fitatu, 5M indirme, 155K yorum, 4,5) YAZIO'yu
kendi ülkesinde yenmiş. Türkiye'de yerel oyuncu Diyetkolik 1M indirmede 7,7K yorum ve 3,8
puanla ölü.

Ama Fitatu 15 yıldır **sadece Polonya'da** — yerel beslenme uygulamaları büyür, sınırın
dışına çıkamaz. Tavan sert.

---

## Bulgu 5 — Pazar büyüklüğü

- Türkiye'de **2 milyon** spor salonu üyesi, 1.500+ spor merkezi
- MACFit: 121 salon, **305 bin aktif üye** (uygulaması 1M+ indirme, 3,5 puan, giriş akışı bozuk)
- 18-65 yaş arası 58,1 milyon kişinin 20,3 milyonu aktif spor yapıyor
- Sektör 3,5 milyar TL

Salon kaydı ürününün adreslenebilir kitlesi 20 milyon değil, **2 milyon**.

---

## Fiyat çapası

Yorumlardan doğrudan okunan gerçek fiyatlar:

- **YAZIO:** aylık 50 TL, yıllık 600 TL
- **EatBetter:** premium ~1.000 TL
- **Türkiye'de PT seansı:** 500-1.500 TL · aylık paket beş haneli

Made2Fit'in konumu: kalori uygulamasıyla değil **PT ile** kıyaslanmak. Temel 99₺, Pro 169₺
— YAZIO'nun iki katı ama PT'nin onda biri.

---

## Elenen isimler

| İsim | Neden elendi |
|---|---|
| Fitter | FITTR — Hindistan merkezli, 3-5M üye, aynı kategori, aynı okunuş |
| ReFit | REFIT® — ABD'de tescilli dans-fitness markası, uygulaması var |
| TailorFit | tailorfit.app terzi ölçü uygulaması + gettailorfit.com fitness takviyesi |
| Square | Block'un fintech markası |
| FitMe | fit-me.app mevcut |

**Made2Fit** seçildi: kategoride çakışma bulunamadı, `made2fit.io` müsait.

**Not:** Web üzerinden kategori taraması yapıldı, **tescil sorgusu yapılmadı.** Markaya para
harcamadan önce sicil kontrolü şart.
