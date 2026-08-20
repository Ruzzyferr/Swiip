# Cihazda çalıştırma — 2026-08-20

Uygulama ilk kez gerçek bir Android cihazında (emülatör, API 36, yeni mimari) baştan sona
kullanıldı: kayıt, 131 soruluk değerlendirme, vücut analizi, program, paywall, beş sekme.
Ekranlar `adb` ile sürüldü ve her adımın görüntüsü alınıp incelendi.

Bugüne kadar hiçbir ekran cihazda açılmamıştı. Açılır açılmaz aşağıdakiler çıktı. Hepsi
önce kırmızı bir testle sabitlendi, sonra düzeltildi; her korumanın gerçekten yakaladığı
kodu bilerek bozup koşturarak sınandı.

---

## 1. Değerlendirme başlatılamıyordu

`TarihGirisi` üç parçayı da üst durumdan okuyor, eksik girişte oraya `null` yazıyordu:
gün yazılınca ay ve yıl siliniyor, ay yazılınca gün siliniyordu. **Üç parça hiçbir zaman
aynı anda bilinemediği için doğum tarihi hiçbir koşulda tamamlanamıyordu.** Ürünün ilk
sorusunda "Devam et" hiç açılmıyordu; huninin tamamı bu alanın arkasında.

Mantık `tarihBirlestir` içine saf olarak alındı (15 test). Yanında ikinci bir hata daha
vardı: `g.length === 2` şartı tek haneli günü reddediyordu, hemen altındaki
`padStart(2, '0')` ise tam tersini varsayıyordu — kod kendi kendisiyle çelişiyordu.

## 2. Geçersiz cevap, cevap sayılıyordu

`sonrakiSoru` yalnızca "değer var mı" diye bakıyordu. Aralık dışında bir sayı da bir
değerdir: soru **cevaplanmış sayılıp atlanıyordu.** Cihazdaki taslakta geçersiz değer
kalıyor, sunucu her kaydı reddediyor ve kullanıcı o soruya bir daha dönemiyordu.
Değerlendirme kalıcı olarak kilitleniyordu — üstelik sessizce, ilerleme çubuğu dolarken.

## 3. "Bu soruyu atla" değerlendirmeyi bozuyordu

Atlama işaretini (`'__atlandi__'`) yalnızca istemci biliyordu. Sunucu onu listede olmayan
bir seçenek sayıp reddediyordu: bir soruyu atlayan kullanıcının cevapları o andan sonra
**hiç kaydedilmiyordu.** Hata görünmüyordu çünkü istemci her hatayı "bağlantı yok" diye
gösteriyordu — iki kusur birbirini örtüyordu.

İşaret artık motorun bildiği bir kavram (`ATLANDI`): isteğe bağlı soruda geçerli, zorunlu
soruda geçersiz, veri okuyan hiçbir yerde görünmüyor.

## 4. Sunucunun reddi "bağlantı yok" diye gösteriliyordu

Değerlendirme ekranı her hatayı `catch` ile yakalayıp çevrimdışı sayıyordu. Sunucu 400
döndürürken ekranda *"Bağlantı yok — cevapların cihazında tutuluyor, bağlanınca
gönderilecek"* yazıyordu. Kullanıcı verisinin güvende olduğunu sanıyordu; oysa
`answers_jsonb` boştu.

Ağ katmanı ikisini zaten ayırıyordu (bağlantı hatası `durum: 0`); ekran o bilgiyi atıyordu.

Ayrıca kayıt reddedildiğinde **akış durmuyordu**: kullanıcı değerlendirmeyi bitirip
programa geçiyor, sunucudaki kayıt eksik kalıyordu.

## 5. İstemci her soruda tüm cevap kümesini gönderiyordu

Sunucu gelen her cevabı doğruluyor; küme içinde bir kez geçersiz cevap oluşursa sonraki
her kayıt da reddedilir — değerlendirme kalıcı olarak zehirlenir. Artık yalnızca fark
gidiyor.

## 6. K9 "Yaşadığın şehir" cevaplanamıyordu

Soru `dataSource: "tr_iller"` tanımlıyordu ve **bu mekanizma hiçbir yerde
uygulanmamıştı**: `soru.options ?? []` boş liste veriyor, ekranda başlıktan başka hiçbir
şey çizilmiyordu. Soru bankası doğrulaması bile `dataSource`u seçeneklerin yerine geçen
bir gerekçe sayıyordu.

Soru `salon_zinciri_tespiti` ve `birim_sistemi` sürücülerini besliyor — yani ekipman ön
doldurma özelliği hiç çalışmıyordu.

81 il artık **derleme zamanında** seçeneklere açılıyor: motor doğrulaması, sunucu ve
arayüz aynı listeyi görüyor. Çalışma zamanında çözülen bir liste üçünde ayrışabilirdi.
12'den uzun listeler şapkasız aranabiliyor (`aramaAnahtari` ile, besin aramasıyla aynı
kural).

## 7. K3'ün metni belirsizdi

"Boyun" yazıyordu ve `cm` cinsinden bir sayı istiyordu. Türkçede bu kelime hem "boy
uzunluğun" hem "boyun" demek — ve aynı uygulama F1'de gerçekten **boyun çevresi**
soruyor (`boyun_cm`, Navy formülü için).

Boy yerine boyun ölçüsü giren kullanıcının BMR'si, TDEE'si, kalori hedefi ve makroları
toptan yanlış çıkardı. 120 cm alt sınırı çoğu hatayı yakalar ama kullanıcı anlamadığı bir
hata mesajı görür. "Boy uzunluğun" oldu; çakışmayı bir test koruyor.

## 8. Vücut analizi hakkı hiç uygulanmıyordu

`vucutAnaliziHakki` yazılmıştı, testi vardı, **hiçbir yerden çağrılmıyordu.** Ücretsiz bir
kullanıcı rapor ekranını beş kez açtı ve beş ayrı analiz kaydı oluştu; oysa ücretsiz
katmanda ömür boyu bir kez.

Fotoğraflı her analiz bir görsel AI çağrısı. Sınırsız çalışan bu uç, ürünün bilinen en
büyük riskine — birim ekonomisine — doğrudan açılan bir kapıydı.

Hak tablosu denetimi kaçırmıştı çünkü `vucut_analizi_aylik` her planda `1`:
"planlar arasında farklılaşmıyor" sayılıp muaf tutulmuştu. Farklılaşan şey sayı değil
**kural** — ücretsizde ömür boyu, ödemelide her ay. Denetim artık `haklar.ts` içinden
dışa açılan her yardımcının çağrıldığını da sınıyor ve bu bir ölü yardımcı daha buldu
(`ozellikAcik`, kaldırıldı).

Ücretsiz analizini kullanıp ödemeye geçen kullanıcı ay sonuna kadar beklemiyor: ödemeli
hak abonelik anından sayılıyor. Yeni ödeme yapana "bu ayı kullandın" demek, ödediği ilk
ayı elinden almak olurdu.

## 9. On altı ekran yüklenirken başlıkta ham rota yolu gösteriyordu

Ekranlar başlığını kendi gövdelerinde kuruyordu ve o satır yükleme/hata dallarından
**sonra** geliyordu. Veri gelene kadar başlıkta `rapor/index`, `ogun/plan` yazıyordu — her
yavaş yüklemede görünen bir kusur.

Kök sebep: klasörlerin `_layout.tsx` dosyaları hiç yazılmamıştı. Kök düzendeki on
`Stack.Screen` tanımı bu yapıyı bekliyormuş ve karşılığı olmadığı için sessizce yok
sayılıyordu — `presentation: 'modal'` dahil, yani paywall hiç modal açılmıyordu.

On klasör düzeni eklendi; başlık artık veri gelmeden de doğru, dinamik başlıklar (tarif
adı, hareket adı) veri gelince üstüne yazıyor.

## 10. Güvenli alan hiç okunmuyordu

`SafeAreaProvider` kökte takılıydı ama **hiçbir ekran kenar boşluklarını okumuyordu**;
paket yalnızca sağlayıcı için duruyordu. Başlığı gizlenmiş ekranlarda içerik doğrudan
durum çubuğunun altından başlıyordu: 18 yaş kapısının başlığı saatin hizasındaydı ve o
ekran bir **güvenlik kapısı** — okunmaması kabul edilebilir değil.

## 11. Fotoğraf yokken "fotoğrafın silindi" deniyordu

Rapor her durumda *"Fotoğrafın analiz edildi ve bu istek biterken bellekten düştü"*
yazıyordu. Ölçülerle devam eden kullanıcı hiç fotoğraf göndermemişti. Olmayan bir şeyin
silindiğine dair güvence, tam da kazanmak istediğimiz güveni harcıyor.

## 12. Dil süpürmesi yalnızca GET uçlarını tarıyordu

Kural "kullanıcıya metin döndüren her uç" diyordu; uygulama yarısını kapsıyordu. Vücut
analizi bir POST ve ücretsiz planın teslim ettiği tek çıktı; gizlilik notu orada sabit
Türkçe duruyordu ve süpürme onu hiç görmedi.

POST'lar eklendi ve iki sızıntı daha çıktı. Bunlardan biri yapısaldı: program hem `/uret`
hem `/aktif` tarafından biçimlendiriliyordu ve ikisi ayrışmıştı — `/aktif` kullanıcının
diline çeviriyor, `/uret` ham Türkçe döndürüyordu. `/uret` artık yalnızca üretildiğini
söylüyor; **tek üretim yeri = çevrilmeyi unutabileceğimiz tek yer.**

## 13. Plan adı sunucudan Türkçe gidiyordu

`HAK_TABLOSU.ad` bir görünen ad ("Ücretsiz") ve API cevabında doğrudan gidiyordu; ayarlar
ekranı ve paywall onu basıyordu. Süpürme kaçırdı çünkü alan adı `ad` ve `ad` alanları veri
sayılıp muaf tutuluyor — hareket adı ve besin adı gerçekten Türkçe veri.

Muafiyet doğruydu; sorun arayüz metninin veri alanı adıyla gönderilmesiydi. Çözüm alanı
çevirmek değil **göndermemek**: kod zaten cevapta, ismi istemci sözlükten kuruyor.

## 14. İçe aktarma döngüsü

Sözlükler tarih ve para biçimini kullanıyor, biçimlendiriciler de dilin BCP47 karşılığını.
İkisi de `i18n.ts` içindeyken zincir kapanmıştı:

```
i18n → metinler.tr → tarih → i18n
```

Metro bunu uyarıyla geçiyor ve modüllerden birini **yarı yüklenmiş** veriyor: `BCP47`
biçimlendirici çalışırken `undefined` olabiliyor. Ne derleme ne test yakalar; yalnızca
çalışma zamanında, bazen.

Dil kimlikleri hiçbir şeye bağımlı olmayan `diller.ts` içine alındı. Yeni bir test tüm
paylaşılan modülleri gezip döngü arıyor ve zinciri adıyla gösteriyor; tip-yalnızca
importlar sayılmıyor (derlemede siliniyorlar).

## 15. Başlık tekrarı ve kilit görünmezliği

Gezinme çubuğu "Koç" yazarken ekran hemen altına yine "Koç" basıyordu. Üç sekmede ve iki
ekranda aynı durum. Yalnızca ekran görüntüsünde görülebilecek bir kusur — metin okuyarak
fark edilmiyor, çünkü ikisi de doğru metinler; sorun ikisinin bir arada olması.

Beslenme sekmesindeki altı kısayolun üçü ücretli katmanda ama hepsi aynı görünüyordu:
ücretsiz kullanıcı "Haftalık plan"a basıp duvara çarpıyordu. Kilit artık önceden
söyleniyor — ve **ödeyene görünmüyor**; "tek satır bile" kuralı testle korunuyor.

---

## Ne değişmedi

**Vücut haritası küçültülmedi.** Dokunma hedefleri zaten 32 px; figürü küçültmek onları
daha da küçültürdü. Erişilebilir liste tam da bunun için var ve 44 px kuralını karşılıyor.
Bilinçli bir denge, kusur değil.

**Ekranların kendi `<Stack.Screen options>` tanımları kaldı.** Dinamik başlıklar (tarif
adı, hareket adı) veri gelince kesinleşiyor; klasör düzeni yalnızca varsayılanı veriyor.

---

## Hâlâ cihazda denenmemiş olanlar

Emülatörde çalıştırmak her şeyi kapatmıyor:

- **Kamera** — emülatörde izin verilmedi; barkod ve vücut fotoğrafı akışları elle giriş
  yoluyla sınandı, gerçek çekim yapılmadı.
- **Bildirimler** — zamanlayıcı kuruldu ama gerçek bir bildirim düşmedi.
- **Satın alma** — RevenueCat anahtarı yok; paywall açılıyor, satın alma denenmedi.
- **iOS** — yalnızca Android'de çalıştırıldı.
