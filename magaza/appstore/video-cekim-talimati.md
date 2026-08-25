# Swiip — App Review videosu çekim senaryosu

> **Bu talimat YENİ değerlendirmeyi (sekiz kart) anlatıyor.** Kaydı çekmeden önce
> telefonundaki Swiip'in yeni derleme olduğundan emin ol: TestFlight'ta sürüm notunda
> "değerlendirme sekiz karta indi" yazmalı. Eski derlemede akış 10 bölüm ve 136 soru
> olarak görünür; o hâliyle çekilen kayıt Apple'a yanlış uygulamayı gösterir.

Apple, Swiip 1.0'ı **Guideline 2.1 — Information Needed** ile geri çevirdi. Uygulamada
hata bulmuş değiller; yeni uygulamalardan istedikleri sekiz bilgiyi istiyorlar ve
bunların başında **gerçek bir telefonda çekilmiş ekran kaydı** geliyor.
Simülatör kaydı kabul edilmiyor.

**Bu dosya olduğu gibi testçiye gönderilebilir.**

---

## Hesaplar

Üç hesap var. Hangisiyle ne çekileceği bölüm başlarında yazıyor.

| # | Hesap | Ne için |
|---|---|---|
| 1 | *kendi açacağın hesap* | Kayıt olma, izin istemleri, değerlendirmenin başı |
| 2 | `inceleme-ucretsiz@swiip.app` · `kumsal-terazi-5820-fener` | **Satın alma ekranı** ve kilitli özellikler |
| 3 | `inceleme@swiip.app` · `mercan-defter-7431-yelken` | Uygulamanın tamamı — bütün ekranlar açık |

**Neden üç tane:** 3 numaralı hesap Pro. Ödeyen kullanıcıya tek satır bile upsell
göstermiyoruz, yani o hesapta Ayarlar'daki **"Planlara bak" düğmesi hiç çıkmıyor.**
Satın alma ekranını ancak 2 numaralı ücretsiz hesapla gösterebilirsin. 1 numaralı
hesabı da sen açacaksın çünkü Apple kayıt akışını ve izin istemlerini görmek istiyor.

> **3 numaralı hesabı (`inceleme@swiip.app`) SAKIN SİLME.** Apple'ın gireceği hesap o.
> Silinecek olan yalnızca kendi açtığın 1 numaralı deneme hesabı.

---

## Çekimden önce

- **TestFlight**'ı App Store'dan kur ve davet aldığın Apple ID'yle gir. Swiip
  görünecek; **en yeni derlemeyi** kur ("Güncelle" yazıyorsa güncelle). Görünmüyorsa
  gelen kutundaki TestFlight davetini kabul et.

  > Bu belge bilerek bir derleme numarası vermiyor: main'e her güncelleme
  > girdiğinde yeni bir derleme otomatik olarak TestFlight'a çıkıyor. Sabit bir
  > numara yazsaydık belge bir hafta içinde yanlış olurdu.
- Telefon **güncel iOS**'ta olsun — Apple bunu şart koşuyor.
- Kaydı **dikey** al, telefonu döndürme.
- Kayıt: Kontrol Merkezi → ekran kaydı düğmesi. Ses gerekmiyor.
- **Her ekranda 1-2 saniye bekle.** Hızlı geçilen ekranı inceleyici göremez.
- Toplam **5-7 dakika** yeterli. Tek parça çek, kesme.

**Videoyla birlikte bana lazım olan tek bilgi:** hangi iPhone modeli ve hangi iOS
sürümü. `Ayarlar → Genel → Hakkında` ekranında yazıyor. Bunu yazmadan gönderme —
Apple'ın sekiz sorusundan biri bu ve videosuz kadar önemli.

---

## Bölüm 1 — Kayıt ve izinler · *kendi açacağın hesapla* (~2 dk)

1. **Uygulamayı tamamen kapat, sonra aç.** Kayıt soğuk başlangıçtan başlamalı.
2. Açılış / "nasıl çalışır" ekranını geç.
3. **Kayıt ol.** E-posta ve parola gir. **Sağlık verisi onay kutusunu işaretle** —
   bu ekran önemli, Apple veri toplama iznini görmek istiyor. Kadrajda dursun.
4. **Değerlendirme başlıyor.** Sekiz kart, toplam ~32 girdi — baştan sona 4-6 dakika.
   Yalnızca altında **"Zorunlu"** yazanlar gerekiyor.
   - **İlk kartı** doldur: doğum tarihi, cinsiyet, boy, kilo. Dördü de tek ekranda.
   - **Kart sonu geri bildirim ekranını kadraja al** — "senin cevaplarından şunu
     hesapladık" diyen ekran. Ürünün ayırt edici yeri orası, 2-3 saniye bekle.
   - İsteğe bağlı sorusu olan bir karta gelirsen **"İsteğe bağlı soruları sonra
     cevaplayacağım"** satırı çıkar. Buna bir kez bas; kadrajda dursun.
5. **Değerlendirmeyi bitirmene gerek yok.** İkinci karta (Güvenlik) geçildiğini göster
   ve dur.

Bu bölümde çıkan **bildirim izni istemi** olursa kadraja al.

> Değerlendirmeyi sonuna kadar doldurma. Kısaldı ama yine de videoyu uzatır;
> tamamlanmış hâli zaten 2 ve 3 numaralı hesaplarda hazır.

---

## Bölüm 2 — Satın alma · *2 numaralı hesapla* (~2 dk)

Ayarlar → **Çıkış yap**, sonra `inceleme-ucretsiz@swiip.app` ile gir.
**Bu bölüm Apple için en kritik olanı** — 1.0'ın reddedilme sebeplerinden biri buydu.

6. **Program sekmesi.** 1. gün açık. Aşağı in: **"2 gün daha hazır"** başlıklı kart
   çıkacak, altında *"Haftanın tamamı hesaplandı. 1. günü ücretsiz görüyorsun…"* yazıyor.
   Bu kartı 2-3 saniye kadrajda tut, sonra içindeki **"Planlara bak"** düğmesine bas.
   Satın alma ekranı açılacak. Bu, kullanıcının gerçek yolu.
7. Satın alma ekranında sırayla göster:
   - **Aylık / Yıllık** geçişi
   - **Temel ve Pro fiyatları**
   - En alta in: **Kullanım koşulları** ve **Gizlilik politikası** bağlantıları
   - **Bir plan seç** → seçince **ödenecek tutar ve yenileme tarihi** en büyük puntoyla
     çıkar. 2-3 saniye bekle, Apple tam olarak buna bakıyor.
8. **"Plan seç" düğmesine bas.** Apple'ın satın alma sayfası açılacak.
   **TestFlight'ta satın almalar sandbox'tır — para çekilmez.** Satın almayı tamamla.
9. Geri dön, **Ayarlar → Planlara bak** düğmesinin de aynı ekranı açtığını göster
   (bir bas, yeter). Apple satın almaya iki ayrı yoldan ulaşıldığını görmüş olur.

---

## Bölüm 3 — Uygulamanın tamamı · *3 numaralı hesapla* (~3 dk)

Ayarlar → **Çıkış yap**, sonra `inceleme@swiip.app` ile gir.
Bu hesabın değerlendirmesi dolu, programı ve öğün planı hazır.

10. **Giriş yap.** Giriş akışını da göstermiş oluyorsun.
11. **Program sekmesi.**
    - **Listenin ikinci hareketine bas.** Birincinin fotoğrafı yok; kaynağımız kamu malı
      ve bazı hareketleri içermiyor, yanlış fotoğraf koymaktansa boş bırakıyoruz.
      Videoda fotoğraflı olan görünsün.
    - **"Neden bu hareket"** kutusunu göster ve 2-3 saniye bekle. **Uygulamanın asıl
      farkı bu** — kararın hangi cevaplardan çıktığını yazıyor.
    - Aşağı in: Türkçe talimat, çalışan kaslar, hareket fotoğrafı.
    - Geri dön, **"Haftalık yapı"**ya bas.
12. **Beslenme sekmesi.**
    - Günün öğün planını göster
    - **"Öğün değiştir"**e gir, kaydırmalı destede birkaç alternatif geç
    - **Barkod okuma**yı aç — kamera izni istemi burada çıkarsa **kadraja al**
13. **Vücut analizi.** Yolu: **İlerleme sekmesi → "Fotoğrafları karşılaştır" → "Yeni
    ölçüm"**. Kamera izni istemini kadraja al, fotoğrafı çek, ardından **fotoğrafın
    silindiğini söyleyen ekranı göster.** Apple gizlilik iddiamızı burada doğruluyor.
    (Bu hesabın aylık analiz hakkı varsa çalışır; "hakkın bitti" derse bölümü atla ve
    bana söyle.)
14. **Koç sekmesi.** Bir soru yaz, cevabı bekle. **1-2 mesaj yeter** — her mesaj para.
15. **İlerleme sekmesi.** Grafikleri kısaca göster.
16. **Ayarlar sekmesi.** En üstte **"Aboneliği iptal et"** düğmesini göster —
    **basma, sadece görünsün.** Apple iptalin gizlenmediğini görmek istiyor.

---

## Bölüm 4 — Hesap silme · *1 numaralı hesapla* (~30 sn)

17. Çıkış yap, **Bölüm 1'de kendi açtığın hesapla** gir.
18. **Ayarlar → Hesabımı sil.** Akışı sonuna kadar göster (onay metnini yazman
    isteniyor). Bu hem Apple'ın istediği silme akışını gösterir hem deneme hesabını
    temizler.

---

## Yapma

- **`inceleme@swiip.app` hesabını silme.** Apple'ın gireceği hesap o.
- **`inceleme-ucretsiz@swiip.app` hesabını da silme.** Apple satın alma ekranına o
  hesapla ulaşıyor.
- Değerlendirmenin sekiz kartını baştan sona doldurma; ilk kart yeterli.
- Koç sohbetinde uzun uzun yazışma.
- Videoyu kesip birleştirme; tek parça olsun.

---

## Bittiğinde

İki şeyi gönder:

1. **Videoyu** (tek parça, dikey).
2. **iPhone modelini ve iOS sürümünü.** `Ayarlar → Genel → Hakkında` ekranında
   yazıyor. Apple'ın sekiz sorusundan biri bu; videosuz kadar önemli, unutma.

Gerisi bizde — Apple'a cevabı biz yazıyoruz.
