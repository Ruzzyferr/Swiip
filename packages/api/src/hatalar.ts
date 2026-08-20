/**
 * Uygulama hataları. Her hatanın kullanıcıya gösterilebilir Türkçe bir mesajı vardır;
 * yığın izi veya SQL hatası hiçbir zaman istemciye çıkmaz.
 *
 * **Mesaj Türkçe, kod dilden bağımsız.** İstemci metni koddan sözlükle kuruyor; kodu
 * çözemezse buradaki Türkçe mesaja düşüyor. Böylece hata metni de tek dile bağlı kalmıyor
 * ve sunucuda kullanıcının dilini bilmek gerekmiyor.
 *
 * `degerler`, cümleye giren sayı ve adları taşır (kalan kota, yenilenme tarihi, hareket
 * adı). Onlarsız çeviri "kotan doldu" gibi bilgiyi düşüren bir cümleye dönerdi.
 */
export class UygulamaHatasi extends Error {
  constructor(
    readonly durum: number,
    readonly kod: string,
    readonly mesaj: string,
    readonly degerler?: Record<string, string | number>,
  ) {
    super(mesaj);
    this.name = 'UygulamaHatasi';
  }
}

type Degerler = Record<string, string | number>;

export const HataliIstek = (mesaj: string, kod = 'gecersiz_istek', degerler?: Degerler) =>
  new UygulamaHatasi(400, kod, mesaj, degerler);

export const Yetkisiz = (
  mesaj = 'Oturumun sona ermiş. Tekrar giriş yap.',
  kod = 'yetkisiz',
  degerler?: Degerler,
) => new UygulamaHatasi(401, kod, mesaj, degerler);

export const Yasak = (mesaj: string, kod = 'yasak', degerler?: Degerler) =>
  new UygulamaHatasi(403, kod, mesaj, degerler);

export const Bulunamadi = (
  mesaj = 'Aradığın kayıt yok.',
  kod = 'bulunamadi',
  degerler?: Degerler,
) => new UygulamaHatasi(404, kod, mesaj, degerler);

export const Cakisma = (mesaj: string, kod = 'cakisma', degerler?: Degerler) =>
  new UygulamaHatasi(409, kod, mesaj, degerler);

/** Kota dolduğunda; ödeme duvarı değil, sayaç sınırı. */
export const KotaDoldu = (mesaj: string, kod = 'kota_doldu', degerler?: Degerler) =>
  new UygulamaHatasi(429, kod, mesaj, degerler);

/** Plan yetmiyorsa. Mesaj satış dili kullanmaz, sadece durumu söyler. */
export const PlanYetersiz = (mesaj: string, kod = 'plan_yetersiz', degerler?: Degerler) =>
  new UygulamaHatasi(402, kod, mesaj, degerler);
