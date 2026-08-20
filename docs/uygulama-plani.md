# Made2Fit — Uygulama Planı

Bu belge `spec.md`'yi inşa sırasına çevirir. Her faz **tam ve kullanılabilir** biter —
yarım özellik yok. Faz sınırları, sonraki fazın öncekini bozmayacağı yerlerden geçirildi.

**Kural:** Bir faz bitmeden sonrakine geçilmez. "Şimdilik böyle kalsın, sonra düzeltiriz"
denilen hiçbir şey bırakılmaz.

---

## Faz sırası ve gerekçesi

F1-F4 hiç para kazanmıyor ama ücretsiz katmanı tam kuruyor — ve **F4 sonunda yayınlanabilir
bir ürün var**. Ödeme (F6) ve en pahalı özellik (F7) yan yana; gelir olmadan AI faturası
açılmıyor. Bu sıra tek geliştiricinin nakit riskini minimize ediyor.

```
F0  Temel kurulum          → çalışan iskelet
F1  Veri ve hareket        → program okunabiliyor
F2  Değerlendirme          → profil çıkarılabiliyor
F3  Program motoru         → ★ kişiye özel program üretiliyor
F4  Vücut analizi          → ★ YAYINLANABİLİR — ücretsiz katman tam
F5  Beslenme çekirdeği     → kalori takibi çalışıyor
F6  Ödeme                  → ★ para kazanmaya başlıyor
F7  Görsel tanıma          → Pro planı anlam kazanıyor
F8  Planlama ve buzdolabı  → beslenme tarafı tam
F9  AI koç                 → ürün tam
F10 Global                 → marj problemi çözülüyor
```

---

## F0 · Temel kurulum

**Amaç:** Boş ama doğru kurulmuş bir iskelet. Sonraki her şey buna dayanacak.

### Görevler

- `F0.1` Expo projesi kur (React Native, TypeScript, dosya tabanlı yönlendirme)
- `F0.2` VPS hazırla: Postgres, Node API, Caddy ile TLS, Docker Compose
- `F0.3` Veritabanı göç aracı kur (Drizzle veya Prisma), ilk şema göçü
- `F0.4` **Yedekleme.** Otomatik `pg_dump` + dışarı kopyalama + **geri yükleme testi**
- `F0.5` Kimlik doğrulama: kayıt, giriş, JWT + yenileme, şifre sıfırlama, e-posta doğrulama
- `F0.6` Hata izleme ve log toplama
- `F0.7` Tasarım tokenleri: renk, tipografi, boşluk ölçeği — `brand/` ile tutarlı
- `F0.8` CI: lint, tip kontrolü, test çalıştırma

### Bitti kriteri

- Uygulama açılıyor, kayıt olunabiliyor, giriş yapılabiliyor
- Sunucu yeniden başlatıldığında veri kaybı yok
- **Yedekten geri yükleme bir kez gerçekten denendi ve çalıştı**
- CI yeşil

### Dikkat

Yedekleme F0'da, sonda değil. Kullanıcı verisi kabul etmeden önce geri yükleme çalışmalı.

---

## F1 · Veri modeli ve hareket veritabanı

**Amaç:** Program okunabiliyor ve düzenlenebiliyor. Motor yok, elle girilen programla test.

### Görevler

- `F1.1` `spec.md` bölüm 14'teki tüm tabloları oluştur
- `F1.2` Hareket veri şemasını kur (`data/hareketler.json` yapısı)
- `F1.3` Açık kaynaklardan hareket verisi al: **free-exercise-db (kamu malı)** ve
  **exercemus (MIT)**. **wger kullanma** — CC-BY-SA share-alike, Türkçe kütüphanemizi
  rakibe açar
- `F1.4` **120 temel hareket** için Türkçe ad ve talimat yaz. AI ile taslakla, elle kontrol et
- `F1.5` Hareket görselleri: açık kaynak setten al, tutarsız olanları işaretle
- `F1.6` Program görüntüleme ekranı: gün, hareket listesi, set/tekrar/ağırlık, ilerleme kuralı
- `F1.7` Hareket detay ekranı: Türkçe talimat, hedef kas, alternatifler
- `F1.8` Program düzenleme: hareket değiştir, gün kaydır, ağırlık düzelt, hareket çıkar
- `F1.9` Çevrimdışı okuma: son program cihazda önbelleklenir

### Bitti kriteri

- 120 hareket Türkçe talimatıyla veritabanında
- Elle girilen bir program ekranda düzgün görünüyor
- Uçak modunda program açılıyor
- Hareket değiştirilebiliyor ve değişiklik kalıcı

### Kapsam dışı

Set kaydı arayüzü, dinlenme kronometresi, senkron kuyruğu. Bunlar **yok** — bkz. spec bölüm 7.

---

## F2 · Değerlendirme

**Amaç:** 134 soru sorulabiliyor, profil çıkarılabiliyor. Program henüz yok.

### Görevler

- `F2.1` `data/sorular.json`'u yükleyen soru motoru: tip başına bileşen render
- `F2.2` Soru tipleri: date, number, single, multi, scale, text, longtext, time, daterange,
  measure, liftinput
- `F2.3` **Vücut haritası bileşeni** (bodymap) — ön/arka, bölge seçimi, seçilene dallanma
- `F2.4` **Hedef vücut görsel seçimi** (imagechoice) — cinsiyete göre 8 görsel
- `F2.5` **Ekipman envanteri** — görsel çoklu seçim, salon zincirine göre ön doldurma
- `F2.6` Dallanma mantığı: `branch`, `conditional`, `conditionalOn` alanlarını işle
- `F2.7` **Dört güvenlik kapısı** — spec bölüm 4. Atlanamaz, test edilir
- `F2.8` Blok arası geri bildirim ekranları
- `F2.9` Blok bazlı kaydetme ve kaldığı yerden devam
- `F2.10` Profil derleme: cevaplar → `profiles` tablosu (antrenman yaşı, toparlanma skoru,
  kısıt listesi, hedef vektörü)
- `F2.11` H10 gerçeklik testi: aşırı hedefte itiraz metni
- `F2.12` Değerlendirmeyi ayarlardan güncelleme

### Bitti kriteri

- 134 soru baştan sona cevaplanabiliyor
- 7. blokta uygulamayı kapatıp açınca kaldığı yerden devam ediyor
- Dört kapının dördü de test edildi ve gerçekten durduruyor
- S18 = Evet olan kullanıcıda ED modu bayrağı set ediliyor
- Profil tablosu doğru dolduruluyor

### Dikkat

Terk oranı burada ölçülür. Blok bazlı analitik ilk günden kurulur — hangi soruda kaç kişi
düştüğünü bilmeden iyileştirilemez.

---

## F3 · Program motoru ★

**Amaç:** Ürünün kalbi. Kişiye özel program üretiliyor ve gerekçesi gösteriliyor.

### Görevler

- `F3.1` **Hacim bütçesi hesabı** — spec bölüm 6 tablosu + çarpımsal düzeltmeler
- `F3.2` **Split seçimi** — gün sayısı + seans süresi + toparlanma
- `F3.3` **Kısıt çözücü** — sert filtreler, skorlama, yerleşim
- `F3.4` **1RM tahmini** (Epley) ve başlangıç yükü ataması
- `F3.5` **Çift ilerleme** mantığı ve deload tetikleyicileri
- `F3.6` **`decisions` kaydı** — her seçimde hangi kuralların ateşlendiği
- `F3.7` **Gerekçe üretimi** — karar izini Türkçe cümleye çeviren AI çağrısı
  (AI burada **karar vermez**, sadece anlatır)
- `F3.8` **1. gün açılış ekranı** — ürünün en kritik ekranı
- `F3.9` Seans sonrası geri bildirim ekranı (üç dokunuş) ve motor kararının gösterimi
- `F3.10` Ağrı bildirimi → program değişikliği
- `F3.11` Seans atlama → sebep → program kaydırma

### Bitti kriteri

- Aynı profil iki kez girildiğinde **birebir aynı program** çıkıyor (determinizm testi)
- Bel fıtığı bildiren kullanıcıda yerden çekiş hareketleri programda yok
- Ekipmanı olmayan hareket asla önerilmiyor
- Her hareketin yanında gerçek bir gerekçe var ve gerekçe cevaplarla tutarlı
- Geri bildirim girildiğinde bir sonraki seans ağırlıkları değişiyor

### Test stratejisi

Motor saf fonksiyon olarak yazılır, arayüzden bağımsız test edilir. En az 20 sentetik profil
ile: yeni başlayan, ileri seviye, sakat, ev antrenmanı, kadın, 55 yaş üstü, ED modu.

---

## F4 · Vücut analizi ★ YAYINLANABİLİR

**Amaç:** Ücretsiz katman tamamlanıyor. Buradan sonra mağazaya çıkılabilir.

### Görevler

- `F4.1` Kamera akışı ve **jiroskopla açı doğrulama**
- `F4.2` Çekim yönlendirme ekranı, üç poz
- `F4.3` **Gizlilik mimarisi**: fotoğraf analiz sonrası bellekten silinir, diske yazılmaz
- `F4.4` Cihaz üzerinde yerel kopya (karşılaştırma için), sunucuda değil
- `F4.5` Görsel model çağrısı → yağ oranı aralığı, kas dağılımı, duruş eğilimleri
- `F4.6` Navy formülüyle çapraz doğrulama (F1 ölçüleri varsa)
- `F4.7` **Analiz raporu ekranı** — aralık dili, tanı dili yok
- `F4.8` F6 çıkış yolu: fotoğrafsız akış, ölçülerle devam
- `F4.9` KVKK açık rıza akışı ve metinleri
- `F4.10` Hayalet çerçeve (sonraki ölçümlerde aynı poz)

### Bitti kriteri

- Fotoğraf sunucuda **hiçbir yerde** saklanmıyor — kod incelemesiyle doğrulandı
- Rapor aralık gösteriyor, tek sayı göstermiyor
- Fotoğrafsız akış sonuna kadar çalışıyor
- Play Console veri güvenliği formu doldurulabilir durumda

### Bu noktada yayınlanabilir

Ücretsiz katman: değerlendirme + vücut analizi + 1. gün programı + manuel kalori girişi.
Mağazaya çıkıp gerçek kullanıcı verisi toplamaya başla.

---

## F5 · Beslenme çekirdeği

### Görevler

- `F5.1` BMR/TDEE/makro hesabı — spec bölüm 8 formülleri
- `F5.2` **TDEE uyum döngüsü**: 2 haftada bir gerçek kilo ile düzeltme
- `F5.3` Besin veritabanı şeması ve içe aktarma altyapısı
- `F5.4` **TürKomp** verisi (kullanım koşulları teyit edildikten sonra)
- `F5.5` **Open Food Facts** barkod verisi
- `F5.6` **~700 pişmiş Türk yemeği** — biz gireriz
- `F5.7` **Ev ölçü birimleri** — kase, tabak, kepçe, kaşık, dilim, avuç, adet, bardak
- `F5.8` Yemek arama ve manuel giriş ekranı
- `F5.9` Barkod okuyucu
- `F5.10` Günlük özet ekranı
- `F5.11` **ED modu**: sayı yok, porsiyon dili

### Bitti kriteri

- Aynı yemek iki kez eklendiğinde **aynı makro** çıkıyor
- Porsiyon "1 kase" olarak seçilebiliyor, sadece gram değil
- ED modunda hiçbir ekranda kalori sayısı görünmüyor
- 2 hafta veri girildiğinde TDEE otomatik düzeltiliyor

---

## F6 · Ödeme ★

### Görevler

- `F6.1` RevenueCat entegrasyonu, iki mağaza
- `F6.2` Ürün tanımları: Temel aylık/yıllık, Pro aylık/yıllık
- `F6.3` **Paywall ekranı** — spec bölüm 13 kuralları. Önseçim yok, fiyat büyük punto
- `F6.4` Hak (entitlement) kontrolü ve özellik kilitleri
- `F6.5` **Abonelik yönetimi ekranı** — iptal en üstte, tek adım
- `F6.6` Kota sistemi: aylık havuz, önbellek ve tekrar deneme sayılmaz
- `F6.7` Ödeme yapan kullanıcıya **hiçbir promosyon arayüzü gösterilmemesi**

### Bitti kriteri

- Satın alma iki mağazada da çalışıyor
- İptal iki dokunuşta yapılabiliyor
- Ödeyen kullanıcı hiçbir yerde upsell görmüyor
- Kota doğru sayıyor, adalet kuralları uygulanıyor

---

## F7 · Görsel yemek tanıma

**En pahalı özellik. Ödeme sistemi hazır olmadan açılmaz.**

### Görevler

- `F7.1` Yerel görsel parmak izi önbelleği
- `F7.2` Tanıma çağrısı — **kalem listesi + miktar**, kalori değil
- `F7.3` Sayılabilir/şekilsiz ayrımı, referans nesne kullanımı
- `F7.4` Veritabanı eşleme ve toplam hesabı
- `F7.5` **Doğrulama ekranı** — ev ölçü birimleriyle porsiyon düzeltme
- `F7.6` Geri besleme: düzeltme önbelleğe ve global eşleme tablosuna
- `F7.7` Kota göstergesi ve adalet kuralları
- `F7.8` Maliyet izleme paneli (kullanıcı başına aylık AI harcaması)

### Bitti kriteri

- Aynı yemeğin ikinci fotoğrafı **AI çağrısı yapmadan** tanınıyor
- Yanlış tanıma sonrası tekrar deneme kota yemiyor
- Kullanıcı başına aylık maliyet ölçülebiliyor ve hedefin altında

---

## F8 · Planlama, buzdolabı, kaydırma

### Görevler

- `F8.1` Tarif veritabanı şeması
- `F8.2` **~800 Türk tarifi** — yemek listesi sahadan, metin bizden, makro besin DB'den
- `F8.3` Et/tavuk/yumurta içeren tariflerin **tamamının elle kontrolü** (gıda güvenliği)
- `F8.4` Öğün planı kısıt çözücüsü — spec bölüm 10 tablosu
- `F8.5` **B5 mantığı**: "ailem" ise menü değil porsiyon önerisi
- `F8.6` **Ramazan modu**
- `F8.7` Haftalık plan ekranı
- `F8.8` Alışveriş listesi, reyona göre gruplu
- `F8.9` Buzdolabı envanteri: fotoğraf, ses, liste girişi
- `F8.10` **Kaydırmalı öğün destesi** — makro kilidi ±%8, 12-15 kart, boş deste çözümü
- `F8.11` Kaydırma tercih öğrenmesi

### Bitti kriteri

- Alerjisi olan kullanıcıya o malzeme **hiçbir tarifte** çıkmıyor
- Bütçesi kısıtlı kullanıcıya pahalı protein önerilmiyor
- B5 = "ailem" olan kullanıcı menü değil porsiyon görüyor
- Deste açmak AI çağrısı yapmıyor
- Boş destede eksik malzeme önerisi çıkıyor

---

## F9 · AI koç

### Görevler

- `F9.1` Sohbet arayüzü
- `F9.2` Araç katmanı — spec bölüm 11 listesi
- `F9.3` Bellek stratejisi: profil özeti + son 10 mesaj + araç verisi
- `F9.4` **Sert sınırlar**: tanı yok, doz yok, aşırı hedef onayı yok, kapsam dışı red
- `F9.5` ED modunda sayı konuşmama
- `F9.6` Kota ve kalan mesaj göstergesi

### Bitti kriteri

- Koç kullanıcının gerçek verisine atıfla cevap veriyor
- Sağlık sorusunda yönlendirme yapıyor, tanı koymuyor
- "Günde 800 kalori" gibi talebi gerekçesiyle reddediyor
- Token maliyeti konuşma uzadıkça sabit kalıyor

---

## F10 · Global

### Görevler

- `F10.1` İkinci dil (İngilizce) — tüm arayüz ve hareket talimatları
- `F10.2` İkinci pazarın besin veritabanı katmanı
- `F10.3` Bölgesel fiyatlandırma
- `F10.4` O mutfağın tarif katmanı

---

## Kesişen işler

Bunlar tek faza ait değil, her fazda uygulanır:

- **Test:** Motor mantığı saf fonksiyon, arayüzden bağımsız test edilir. Her formül için
  birim test. Güvenlik kapıları için ayrı test seti.
- **Analitik:** Değerlendirme terk noktaları, paywall dönüşümü, kota kullanımı, AI maliyeti.
- **Türkçe metinler:** Buton, hata, boş durum, bildirim. Tek dosyada toplanır, dağıtılmaz.
- **Erişilebilirlik:** Kontrast, dokunma hedefi 44 px, ekran okuyucu etiketleri.
- **Performans:** Uygulama açılışı, liste kaydırma, çevrimdışı davranış.

---

## Yapılacak dış işler

Koda bağlı değil ama fazları bloke edebilir:

| İş | Ne zaman | Bloke ettiği |
|---|---|---|
| `made2fit.io` alan adı | Hemen | — |
| TürKomp kullanım koşulları teyidi | F5 öncesi | F5.4 |
| Marka sicili kontrolü | Markaya para harcamadan önce | — |
| Play Console ve App Store geliştirici hesabı | F4 öncesi | Yayın |
| RevenueCat hesabı ve ürün tanımları | F6 öncesi | F6 |
| AI gateway hesabı | F3 öncesi | F3.7 |
| KVKK aydınlatma ve rıza metinleri (hukuki kontrol) | F4 öncesi | F4.9 |
