# Swiip — App Review videosu çekim talimatı

Apple, Swiip 1.0'ı "Guideline 2.1 — Information Needed" ile geri çevirdi. Uygulamada
hata bulmuş değiller; yeni uygulamalardan istedikleri bilgileri istiyorlar ve bunların
başında **gerçek bir telefonda çekilmiş ekran kaydı** geliyor. Simülatör kabul edilmiyor.

Bu dosya Arda'ya olduğu gibi gönderilebilir.

---

## Çekimden önce

- **TestFlight**'ı App Store'dan kur, `ardaerenbulut2121@gmail.com` Apple ID'siyle gir.
  Swiip görünecek (build 5). Görünmüyorsa gelen kutusundaki TestFlight davetini kabul et.
- Telefon **güncel iOS**'ta olsun. Apple bunu şart koşuyor.
- Kaydı **dikey** al, telefonu döndürme.
- Kayıt: Kontrol Merkezi → ekran kaydı düğmesi. Ses gerekmiyor.
- Her ekranda **1-2 saniye bekle**. Hızlı geçilen ekranı inceleyici göremiyor.
- Toplam 4-6 dakika yeterli.

**Bana lazım olan tek şey:** hangi iPhone modeli ve hangi iOS sürümü. `Ayarlar → Genel →
Hakkında` ekranından bakabilirsin, yazıp göndermen yeterli.

---

## Bölüm 1 — Kayıt, izinler, satın alma (yeni hesapla)

Bu bölümü **yeni açacağın** bir hesapla çek. Deneme hesabı; sonunda silinecek.

1. **Uygulamayı kapalıyken aç.** Kayıt açılış ekranından başlamalı, uygulama arka planda
   açık kalmışsa önce tamamen kapat.
2. Açılış / "nasıl çalışır" ekranını geç.
3. **Kayıt ol.** E-posta ve parola gir. Sağlık verisi onay kutusunu işaretle — bu ekran
   önemli, Apple veri toplama iznini görmek istiyor.
4. **Değerlendirme başlıyor.** İlk soru doğum tarihi. **5-6 soru cevapla, hepsini değil.**
   134 soru var, tamamını çekmene gerek yok.
5. **Vücut fotoğrafı adımına gel.** Kamera izni istemi çıkacak — **izin istemini kadraja
   al**, Apple bunu özellikle istiyor. Fotoğrafı çek ve **fotoğrafın silindiğini söyleyen
   ekranı göster.**
6. **Ayarlar sekmesi → Bildirim ayarları.** Bildirim izni istemini de göster.
7. **Ayarlar → Planlar.** Paywall açılacak:
   - Aylık / Yıllık geçişini göster
   - Temel ve Pro fiyatlarını göster
   - En alta in: **Kullanım koşulları** ve **Gizlilik politikası** bağlantılarını göster
   - Bir plan seç → seçince **ödenecek tutar ve yenileme tarihi** çıkacak, onu göster
   - **"Plan seç" düğmesine bas.** Apple'ın satın alma sayfası açılacak.
     **TestFlight'ta satın almalar sandbox'tır, para çekilmez.** Satın almayı tamamla.
8. **Ayarlar → Hesabını sil → Sil.** Silme akışını sonuna kadar göster. Bu deneme hesabını
   temizler ve seni çıkışa atar.

---

## Bölüm 2 — Uygulamanın tamamı (inceleme hesabıyla)

```
E-posta : inceleme@swiip.app
Parola  : mercan-defter-7431-yelken
```

Bu hesabın değerlendirmesi dolu, programı ve öğün planı hazır — bütün ekranlar açık.

9. **Giriş yap.** Giriş akışını da göstermiş oluyorsun.
10. **Program sekmesi.** Haftanın programı görünecek.
    - Bir **hareketin üstüne bas**, detay sayfasını aç
    - **"Neden bu hareket"** kutusunu göster — uygulamanın asıl farkı bu, kararın hangi
      cevaplardan çıktığını yazıyor
    - Aşağı in: Türkçe talimat, çalışan kaslar, hareket fotoğrafı
    - Geri dön, **"Haftalık yapı"**ya bas — hacim bütçesini göster
11. **Beslenme sekmesi.**
    - Günün öğün planını göster
    - **"Öğün değiştir"**e gir, kaydırmalı destede birkaç alternatif geç
    - **Barkod okuma**yı aç (kamera izni burada da çıkabilir, göster)
12. **Koç sekmesi.** Bir soru yaz, cevabı bekle. **1-2 mesaj yeter** — her mesaj para.
13. **İlerleme sekmesi.** Grafikleri kısaca göster.
14. **Ayarlar sekmesi.** En üstte **"Aboneliği iptal et"** düğmesini göster —
    **basma, sadece görünsün.** Apple iptalin gizlenmediğini görmek istiyor.

---

## Yapma

- **İnceleme hesabını (`inceleme@swiip.app`) SİLME.** Silinecek olan Bölüm 1'de kendi
  açtığın deneme hesabı. İnceleme hesabı silinirse Apple'ın gireceği hesap kalmaz.
- Değerlendirmenin 134 sorusunu baştan sona çekme, gereksiz.
- Koç sohbetinde uzun uzun yazışma.
