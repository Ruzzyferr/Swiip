# Swiip — App Review videosu çekim talimatı

Apple, Swiip 1.0'ı "Guideline 2.1 — Information Needed" ile geri çevirdi. Uygulamada
hata bulmuş değiller; yeni uygulamalardan istedikleri bilgileri istiyorlar ve bunların
başında **gerçek bir telefonda çekilmiş ekran kaydı** geliyor. Simülatör kabul edilmiyor.

Bu dosya Arda'ya olduğu gibi gönderilebilir.

---

## Çekimden önce

- **TestFlight**'ı App Store'dan kur, `ardaerenbulut2121@gmail.com` Apple ID'siyle gir.
  Swiip görünecek. **Build 7'yi kur** — daha eskisi yüklüyse TestFlight'ta "Güncelle"
  yazar, güncelle. Görünmüyorsa gelen kutusundaki TestFlight davetini kabul et.
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
4. **Değerlendirme başlıyor.** 10 bölüm, toplam 136 soru — ama **yalnızca altında
   "Zorunlu" yazanları doldurman gerekiyor**, o da 25 tane. Bölüm başında kaç tanesinin
   zorunlu olduğu yazıyor.
   - İlk bölümde zorunluları doldur, **bölüm sonu geri bildirim ekranını kadraja al** —
     "senin cevaplarından şunu hesapladık" diyen ekran, ürünün ayırt edici yeri orası.
   - Zorunlular bitince araya **"İsteğe bağlı soruları sonra cevaplayacağım"** satırı
     çıkar. **Buna bir kez bas** — kalan bütün isteğe bağlı sorular atlanır, geriye
     yalnızca zorunlular kalır. Videoyu kısaltan şey bu, kadrajda dursun.
   - Sonraki bölümlerde yalnızca "Zorunlu" yazanlar çıkacak; doldur ve geç.
   - Bölüm başına zorunlu: K 5 · H 3 · A 1 · S 6 · E 2 · Z 2 · Y 2 · B 3 · T 0 · F 1.
   - "Devam et" ilerletmiyorsa düğmenin hemen üstünde kaç zorunlu sorunun boş kaldığı
     yazar; yukarı kaydırıp doldur.
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
    - **Listenin ikinci hareketine bas** (Romanian deadlift). Birincinin — dizden şınav —
      fotoğrafı yok; kaynağımız kamu malı ve bazı hareketleri içermiyor, yanlış fotoğraf
      koymaktansa boş bırakıyoruz. Videoda fotoğraflı olan görünsün.
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
- Değerlendirmedeki 136 sorunun hepsini doldurma; 25'i zorunlu, gerisi isteğe bağlı.
- Koç sohbetinde uzun uzun yazışma.
