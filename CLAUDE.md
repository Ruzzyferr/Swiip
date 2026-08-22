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

- **Arayüz premium değil — tasarım turu gerekiyor.** Üç persona emülatörde
  gezdirildi, dışarıdan da görüş alındı. Ortak yargı: "şablon / yarım kalmış,
  geliştirici prototipi". Somut nedenler ve öneri sırası:
  1. Değerlendirme ekranlarının %80'i boş. 134 soru × tek soru/ekran, 12 dakika.
     Boşluk odak değil, terk sebebi. Sorular mantıksal adımlara gruplanmalı
     (15-20 ekran); dikey ortalama çözmez, veri yoğunluğu çözer.
  2. Renkli kart dolguları (mint/krem) kliniği çağrıştırıyor, salonu değil.
     Aksan rengi zemine yayılmamalı; yalnız aktif öğede ve kritik sayıda.
     Ayrım kart yerine 1 px kılavuz çizgisiyle.
  3. Tipografi varsayılan ölçekte. Sayısal veride tabular monospace zaten var,
     hiyerarşi yok. Puntolar/ağırlıklar elden geçmeli.
  4. Sekme ikonları jenerik (beslenme = kronometre). "Ölçü aleti" fikriyle bağı yok.
  5. Beslenme sekmesinde 6 eş ağırlıklı buton 2×3 ızgarada. Pro'nun tek farkı
     olan "Fotoğraftan ekle" ile "Alışveriş listesi" aynı görünüyor.
  6. İlerleme sekmesinde hiç grafik yok — en çok grafiğe ihtiyaç duyan ekran.
  7. Rıza kutucuklarının işaretsiz hâlinde onay kutusu yok; dokunulabilir
     olduğu anlaşılmıyor. KVKK açık rızası için fazla belirsiz.
  8. Koç ekranında kalan kota yazmıyor (Pro 150, Temel 60).

- **Besin kataloğunda sade karşılıklar eksik.** Fotoğraf tanıma çalışıyor ama
  "pilav" → *Perde pilav*, "ekmek" → *Etli ekmek*, "yeşil biber" → *Pul biber*
  eşleşiyor: sade giriş yoksa eşleştirici en yakın bileşik yemeği seçiyor.
  Katalogda düz "Pilav", "Ekmek", "Yeşil biber", "Mısır" gibi temel kayıtlar olmalı.

- **Genel istek sınırı IP başına dakikada 120.** Mobil operatörlerde CGNAT
  yüzünden çok kullanıcı tek IP'den çıkıyor; sınır kullanıcı başına değil.

- TürKomp kullanım koşulları yazılı teyit edilecek
- **Marka: Türkiye temiz, AB/İngiltere çekişmeli.** TMview taraması (2026-08-21):
  Türkiye'de "swiip" içeren **sıfır** kayıt — TÜRKPATENT'te 9/41/44 başvurusu yapılmalı.
  Ama İngiltere'de birebir `swiip` (sınıf 35/42, Hassan Hashmi) ve EUIPO'da `Swiipe`
  (sınıf 9/36, Swiipe ApS) tescilli. AB'de sınıf 9 başvurusunda `Swiipe` karşına çıkar.
  Global açılımdan önce marka vekiline danış.
- **Veritabanı yedeği yalnızca sunucuda.** `scripts/yedek-al.sh` her gece 03:15'te
  `/opt/swiip/yedekler` altına dump alıyor ve geri yüklemesi denendi (28 tablo,
  veriler yerinde). Ama `YEDEK_UZAK_HEDEF` boş: sunucu tümden kaybedilirse dump'lar
  da gider. DO anlık yedeği açık (haftalık) ve bu riski azaltıyor, tek başına yeterli
  değil — uzak hedef tanımlanmalı
- Kilitteki "Swiip" yazısı outline'a çevrilecek
- Posta `bilgi@send.swiip.app` üzerinden gidiyor (Resend, eu-west-1). Kök `swiip.app`
  Resend'de başka bir takıma kayıtlı ve devralınamıyor — gönderen adresi bu yüzden alt
  alan adı. Uçtan uca denendi: kod e-postayla ulaştı, parola değişti.
- Play kapalı testi: 12 test kullanıcısı × 14 gün — Google'ın kuralı, kısaltılamıyor
- Play servis hesabı anahtarı `C:\Users\ruzzy\.play-keys\play-servis-hesabi.json`
  (`revenuecat-connect@swiip-revenuecat`). `scripts/play-*.mjs` bunu
  `PLAY_SERVIS_HESABI` ile bekliyor
- Play veri güvenliği formunda **kullanıcı kimliği ve satın alma geçmişi eksik**;
  ikisi de toplanıyor. Ayrıntı `magaza/play/konsol-rehberi.md` bölüm 7.

## Dağıtım ve sunucu

Dağıtım `scripts/sunucu-dagit.sh` ile. Kaynağı `git archive` ile paketler, `/opt/swiip`
altına açar, `api` imajını kurar ve sağlık ucu 200 dönene kadar bekler. Dağıtılan commit
sunucuda `/opt/swiip/SURUM` dosyasında yazar.

Sunucudaki `/opt/swiip` bir git deposu **değil** — "hangi kod dönüyor" sorusunun tek
cevabı o dosya.

Erişim bilgileri (SSH, root parolası, DigitalOcean tokenı) depoda değil:
`Masaüstü/Swiip-YEDEK/sunucu-erisimi.md`. Kurulumu yapan oturum SSH anahtarını
kaydetmeyi unuttuğu için erişim bir kez kaybedildi ve parola sıfırlamayla geri alındı;
o dosyayı kaybetme.

## Bilinen en büyük risk

**Birim ekonomisi.** Pro kullanıcının aylık AI maliyeti ~50₺, geliri 169₺. Marj var ama
dar. Kotalar gevşetilirse veya AI her yere serpiştirilirse ürün ne kadar çok kullanılırsa
o kadar çok kaybettirir. Yeni bir yere AI koymadan önce maliyetini hesapla.
