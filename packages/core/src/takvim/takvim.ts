/**
 * Takvim yerleşimi.
 *
 * Z3 ("hangi günler uygun?") iki şeyi belirler:
 *  - takvim_yerlesimi: seans hangi güne düşer
 *  - kas_grubu_dinlenme: seanslar arasında kaç gün var
 *
 * İkisi çakışabilir. Çakışırsa kullanıcının uygunluğu kazanır: çalışamayacağı bir güne
 * seans yazmak, ideal dinlenme aralığını tutturmaktan daha büyük bir hata. Sıkışık
 * yerleşim durumunda bunu gerekçede söyleriz, sessizce yapmayız.
 *
 * Saf ve deterministik: makine saatine bakmaz, referans tarih dışarıdan verilir.
 */

/** 0 = Pazar … 6 = Cumartesi. Date.getUTCDay() ile aynı taban. */
export const HAFTA_GUNLERI = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
] as const;

export interface TakvimYerlesimi {
  /** Artan sırada hafta günleri. */
  gunler: number[];
  /** Kullanıcının işaretlediği gün sayısı, istenen seans sayısından az mı? */
  uygunGunSayisiYetersiz: boolean;
  gerekce: string;
}

function normalize(ad: string): string {
  return ad.trim().toLocaleLowerCase('tr-TR');
}

export function gunNumarasi(ad: string): number | undefined {
  const aranan = normalize(ad);
  const indeks = HAFTA_GUNLERI.findIndex((g) => normalize(g) === aranan);
  return indeks === -1 ? undefined : indeks;
}

/** Z3 cevabından uygun gün numaralarını çıkarır. Cevap yoksa boş liste — varsayım üretmeyiz. */
export function uygunGunler(cevaplar: Record<string, unknown>): number[] {
  const ham = cevaplar.Z3;
  if (!Array.isArray(ham)) return [];

  const numaralar = ham
    .filter((x): x is string => typeof x === 'string')
    .map(gunNumarasi)
    .filter((n): n is number => n !== undefined);

  return [...new Set(numaralar)].sort((a, b) => a - b);
}

/**
 * Verilen adaylardan `seansSayisi` kadar gün seçer, aralarını en çok açacak şekilde.
 *
 * Aday sayısı en fazla 7 olduğu için kombinasyonları tam tarıyoruz: en fazla 35 kombinasyon,
 * sezgisel bir yaklaşıma gerek yok. Tam tarama, "aynı girdi aynı çıktı" garantisini de
 * bedavaya veriyor.
 */
function enGenisAralikliAltkume(adaylar: number[], seansSayisi: number): number[] {
  if (seansSayisi >= adaylar.length) return [...adaylar];
  if (seansSayisi <= 0) return [];

  let enIyi: number[] = adaylar.slice(0, seansSayisi);
  let enIyiSkor = -1;

  const secim: number[] = [];
  const gez = (baslangic: number) => {
    if (secim.length === seansSayisi) {
      const skor = yerlesimSkoru(secim);
      // Eşitlikte önce gelen kazanır: sonuç sıralamaya bağlı ve tekrarlanabilir olur.
      if (skor > enIyiSkor) {
        enIyiSkor = skor;
        enIyi = [...secim];
      }
      return;
    }

    for (let i = baslangic; i < adaylar.length; i++) {
      secim.push(adaylar[i]!);
      gez(i + 1);
      secim.pop();
    }
  };
  gez(0);

  return enIyi;
}

/**
 * Bir yerleşimin kalitesi: önce en dar aralığı büyütmeye bakarız (zayıf halka),
 * eşitlik bozulmazsa aralıkların toplam kare farkını küçültürüz (dengeli dağılım).
 */
function yerlesimSkoru(gunler: number[]): number {
  const araliklar = dairesalAraliklar(gunler);
  const enDar = Math.min(...araliklar);
  const ortalama = 7 / gunler.length;
  const sapma = araliklar.reduce((t, a) => t + (a - ortalama) ** 2, 0);

  return enDar * 1000 - sapma;
}

function dairesalAraliklar(gunler: number[]): number[] {
  if (gunler.length < 2) return [7];
  const sirali = [...gunler].sort((a, b) => a - b);
  return sirali.map((gun, i) =>
    i === sirali.length - 1 ? sirali[0]! + 7 - gun : sirali[i + 1]! - gun,
  );
}

export function seanslariYerlestir(seansSayisi: number, uygun: number[]): TakvimYerlesimi {
  if (seansSayisi <= 0) {
    return { gunler: [], uygunGunSayisiYetersiz: false, gerekce: 'Seans yok.' };
  }

  const belirtildi = uygun.length > 0;
  const adaylar = belirtildi ? [...new Set(uygun)].sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6];

  const yetersiz = belirtildi && adaylar.length < seansSayisi;
  const gunler = enGenisAralikliAltkume(adaylar, seansSayisi).sort((a, b) => a - b);

  return {
    gunler,
    uygunGunSayisiYetersiz: yetersiz,
    gerekce: gerekceUret(gunler, seansSayisi, yetersiz, belirtildi),
  };
}

function gerekceUret(
  gunler: number[],
  seansSayisi: number,
  yetersiz: boolean,
  belirtildi: boolean,
): string {
  const adlar = gunler.map((g) => HAFTA_GUNLERI[g]).join(', ');

  if (yetersiz) {
    return (
      `${seansSayisi} seans istendi ama uygun işaretlediğin ${gunler.length} gün var. ` +
      `Seanslar ${adlar} günlerine kondu; daha fazlası için uygun gün eklemen gerekir.`
    );
  }

  if (gunler.length === 7) {
    return (
      `Haftanın yedi günü de seans var. Dinlenme günü kalmadı; toparlanma sinyali ` +
      `düşerse hacmi otomatik olarak azaltacağız.`
    );
  }

  const enDar = Math.min(...dairesalAraliklar(gunler));
  const kaynak = belirtildi ? 'İşaretlediğin günler arasından' : 'Uygun gün belirtmediğin için';

  return (
    `${kaynak} aralarını en çok açan yerleşim seçildi: ${adlar}. ` +
    `İki seans arasında en az ${enDar} gün var.`
  );
}

// ---------------------------------------------------------------------------
// Tarihe çevirme
// ---------------------------------------------------------------------------

const GUN_MS = 86_400_000;

function isoAyristir(tarih: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return undefined;
  const zaman = Date.parse(`${tarih}T00:00:00.000Z`);
  return Number.isNaN(zaman) ? undefined : new Date(zaman);
}

function isoYaz(tarih: Date): string {
  return tarih.toISOString().slice(0, 10);
}

/**
 * Hafta günlerini, `baslangic` gününden itibaren ilk denk gelen takvim tarihlerine çevirir.
 *
 * Başlangıç günü listede varsa o gün sayılır — "bugün antrenman günü" bildirimi bunun
 * üstünde çalışıyor.
 */
export function seansTarihleri(haftaGunleri: number[], baslangic: string): string[] {
  const baz = isoAyristir(baslangic);
  if (!baz || haftaGunleri.length === 0) return [];

  const bazGun = baz.getUTCDay();

  return haftaGunleri
    .map((gun) => {
      const fark = (gun - bazGun + 7) % 7;
      return isoYaz(new Date(baz.getTime() + fark * GUN_MS));
    })
    .sort();
}
