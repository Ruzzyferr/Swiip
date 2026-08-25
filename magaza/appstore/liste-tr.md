# App Store listesi — Türkçe

**Bu dosya alanların tek kaynağı.** Konsola elle yazma; `scripts/apple-liste.mjs`
yüklüyor ve yazdıktan sonra geri okuyup doğruluyor.

Bu dosya 2026-08-26'da açıldı, çünkü App Store metni **yalnızca konsolda** duruyordu ve
sürüklendi. İki somut sonucu görüldü:

1. Play listesi güncellenirken App Store'unki eski kaldı — hâlâ "Swiip 134 soruyor"
   diyordu, oysa değerlendirme sekiz karta inmişti.
2. Daha kötüsü: açıklama **"Ödeme Google Play hesabından tahsil edilir"** diyordu.
   Play metni olduğu gibi Apple'a yapıştırılmış. Başka bir mağazanın adı ve yanlış
   faturalandırma yönergesi, tek başına metadata reddi sebebi.

Play listesi `magaza/play/liste-tr.md`. İkisi bilerek ayrı dosya: abonelik
faturalandırma paragrafı mağazaya göre değişmek ZORUNDA.

## Sınırlar

| Alan | Sınır |
|---|---|
| Ad | 30 |
| Altbaşlık | 30 |
| Anahtar kelimeler | 100 (virgülle, boşluksuz) |
| Tanıtım metni | 170 |
| Açıklama | 4000 |

## Ad

```
Swiip
```

## Altbaşlık

```
Ölçüne göre antrenman koçu
```

## Anahtar kelimeler

```
antrenman,program,beslenme,kalori,makro,koç,spor,kas,kilo,egzersiz,diyet,form
```

## Açıklama

```
Çoğu uygulama sekiz soru sorup program üretir. Swiip'te de dört dakika sürüyor — ama
her cevabın programda görünür bir karşılığı var ve her hareketin yanına neden orada
olduğu yazılıyor.

"Bel fıtığın olduğunu söyledin; yerden çekiş yerine kalça itme koydum. Aynı kas
zincirini çalıştırıyor, bele eksenel yük bindirmiyor."

Fark ettiğin şey bu cümle. Programı üretmek kolay; neden o program olduğunu
gösterebilmek zor.


NASIL ÇALIŞIR

1. Değerlendirme — 4-6 dakika, sekiz kart. Her kart bittiğinde ne öğrendiğimizi ve
programını nasıl değiştirdiğini gösteriyoruz. Yarıda bırakırsan kaldığın yerden devam
edersin.

Soru sayısıyla övünmüyoruz: bankamızda bir ara 136 soru vardı ve ölçtüğümüzde 73'ünün
programa hiçbir etkisi olmadığını gördük. Hepsini attık. Kalanların bir kısmı da ilk gün
gerekmiyor — tekniğine ne kadar güvendiğini bilmiyorsak programı muhafazakâr kuruyoruz ve
bunu sana söylüyoruz: "20 saniye ver, on hareket geri gelsin".

2. Vücut analizi — üç fotoğraf ya da sadece çevre ölçüleri. Fotoğrafın analiz edildiği
anda bellekten silinir; sunucumuzun diskine hiç yazılmaz. Saklanan tek şey sayısal
çıktılar.

3. Programın — hazır. Her hareketin gerekçesi, ilerleme kuralı ve makine doluysa
alternatifi yazıyor.

4. Seans sonrası üç dokunuş — salonda telefonla kayıt tutmanı istemiyoruz. Sonrasında
üç dokunuş yeter; bir sonraki seansı ona göre hesaplarız.


HESAP FORMÜLLE, DİL YAPAY ZEKÂ İLE

Hacim, progresif yüklenme, deload, 1RM, kalori, makro — hepsi deterministik formül.
Aynı girdi her zaman aynı çıktıyı verir. Yapay zekâ yalnızca dört yerde çalışır ve
hiçbirinde karar vermez.

Yemek tanımada yapay zekâ yalnızca "bu ne yemeği" sorusunu cevaplar. Besin değeri her
zaman veritabanından gelir; bu yüzden aynı yemeği iki kez eklediğinde aynı makroyu
görürsün.


BESLENME

Türk mutfağı için yazılmış besin veritabanı: pişmiş yemekler, ev ölçüleriyle. Kase,
tabak, kepçe, kaşık, dilim, avuç, adet, bardak. Barkod okuma, haftalık öğün planı,
alışveriş listesi ve buzdolabı envanteri.


YAPMADIKLARIMIZ

• Rozet, seri, konfeti yok. Kutlama animasyonu koymadık.
• Ödeyen kullanıcıya reklam ve upsell gösterilmez. Tek satır bile.
• İptal tek tuş, ayarların en üstünde. Aramana veya sebep açıklamana gerek yok.
• Vücut fotoğrafın sunucuda saklanmaz.
• Salonda telefonla set kaydı tutturmuyoruz.
• Program düzenlemek ücretsiz ve sınırsız.
• Yağ oranını tek sayı olarak söylemiyoruz; ölçüm bir aralıktır, öyle sunuyoruz.


ÜCRETSİZ NE VAR

Sekiz kartlık değerlendirme, vücut analizi (bir kez), programının 1. günü, manuel kalori
girişi ve sınırsız program düzenleme. Hepsi ücretsiz, süresiz.


ABONELİK

Temel — 99 ₺/ay veya 690 ₺/yıl
Haftanın tüm günleri, seans sonrası uyarlama, kalori ve makro hedefi, öğün planı ve
tarifler, barkod okuma, AI koç sohbeti (ayda 60 mesaj).

Pro — 169 ₺/ay veya 1.190 ₺/yıl
Temel'in tamamı, fotoğraftan yemek tanıma (ayda 250) ve AI koç sohbeti (ayda 150 mesaj).

Ödeme, satın alma onaylandığında Apple Kimliği hesabından tahsil edilir. Abonelik,
dönem bitiminden en az 24 saat önce kapatılmazsa otomatik yenilenir; yenileme ücreti
dönem bitiminden önceki 24 saat içinde alınır. Yenilemeyi Apple Kimliği hesap
ayarlarından ya da uygulama içinden tek dokunuşla kapatabilirsin; dönem sonuna kadar
özellikler açık kalır.


SAĞLIK UYARISI

Swiip tıbbi cihaz değildir ve teşhis koymaz. Verdiği sayılar ölçüm ve görüntüden
çıkarılmış tahminlerdir; kesin değer değildir. Sağlık durumunla ilgili bir sorun varsa
hekimine danış.

Uygulamayı 18 yaş ve üzeri kullanabilir.
```
