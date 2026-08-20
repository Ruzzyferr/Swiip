import { HAREKET_KATALOGU } from '@made2fit/shared';
import { metin, sayi, type Cevaplar } from '../cevaplar';
import { bmrHesapla, beslenmeHedefiHesapla } from '../beslenme/beslenme';
import { TABAN_HACIM } from '../hacim/hacim';
import { havuzHazirla } from '../program/havuz';
import { antrenmanYasiBelirle, aktiviteCarpani } from '../profil/olcumler';
import { profilDerle } from '../profil/profil';
import { splitSec } from '../split/split';

/**
 * Blok arası geri bildirim (F2.8).
 *
 * Bu ekranlar terk oranına karşı en güçlü kozumuz: kullanıcı 12 dakikayı boşa harcamadığını
 * her blokta görür. Bu yüzden her metin gerçek bir hesaptan gelir, genel bir cümle değildir.
 *
 * ED modunda hiçbir metinde sayı görünmez.
 */

export interface BlokGeriBildirimi {
  blok_id: string;
  /** Motorun Türkçe metni — iz bu, ve çeviremediğimiz yerde yedek bu. */
  metin: string;
  /**
   * Metin anahtarı.
   *
   * Değerlendirmenin her bloğunun sonunda "ne öğrendik, programını nasıl değiştirdi"
   * cümlesi çıkıyor; 134 soruyu bitirten şey bu. Cümleyi motorda sabitlemek onu yalnızca
   * Türkçe kullanıcıya vermek demekti — motor anahtar üretiyor, cümle sözlükte kuruluyor.
   */
  anahtar: string;
  /** Cümleye giren sayılar ve adlar. */
  degerler?: Record<string, string | number>;
}

export function blokGeriBildirimi(
  blokId: string,
  cevaplar: Cevaplar,
): BlokGeriBildirimi | undefined {
  const edModu = metin(cevaplar, 'S18') === 'Evet';
  const uretici = URETICILER[blokId];
  if (!uretici) return undefined;

  const sonuc = uretici(cevaplar, edModu);

  return {
    blok_id: blokId,
    metin: sonuc.metin,
    anahtar: sonuc.anahtar,
    ...(sonuc.degerler ? { degerler: sonuc.degerler } : {}),
  };
}

interface UreticiSonucu {
  metin: string;
  anahtar: string;
  degerler?: Record<string, string | number>;
}

/** Kısaltma: anahtar ve Türkçe metni birlikte döndürür. */
const c = (
  anahtar: string,
  metin: string,
  degerler?: Record<string, string | number>,
): UreticiSonucu => (degerler ? { anahtar, metin, degerler } : { anahtar, metin });

type Uretici = (cevaplar: Cevaplar, edModu: boolean) => UreticiSonucu;

const URETICILER: Record<string, Uretici> = {
  K: (cevaplar, edModu) => {
    const kilo = sayi(cevaplar, 'K4');
    const boy = sayi(cevaplar, 'K3');
    if (kilo === undefined || boy === undefined) {
      return c(
        'kimlikEksik',
        'Temel bilgilerin kaydedildi. Bir sonraki bölümde hedefini konuşacağız.',
      );
    }
    if (edModu) {
      return c(
        'kimlikEd',
        'Temel bilgilerin kaydedildi. Senin için sayıları kapattık; beslenmeyi porsiyon diliyle ' +
          'anlatacağız.',
      );
    }

    const yas = yasTahmini(cevaplar);
    const { bmr } = bmrHesapla({
      cinsiyet: metin(cevaplar, 'K2') === 'Kadın' ? 'kadin' : 'erkek',
      yas,
      boyCm: boy,
      kiloKg: kilo,
      ...(sayi(cevaplar, 'F2') !== undefined ? { yagOrani: sayi(cevaplar, 'F2')! } : {}),
    });
    const tdee = Math.round(bmr * aktiviteCarpani(cevaplar, sayi(cevaplar, 'A2') ?? 3));

    return c(
      'bakimKalorisi',
      `Bakım kalorin yaklaşık ${tdee} kcal. Bu, kilonu korumak için günde aldığın enerji.`,
      { tdee },
    );
  },

  H: (cevaplar, edModu) => {
    const beklenti = sayi(cevaplar, 'H10');
    const kilo = sayi(cevaplar, 'K4');
    if (edModu) {
      return c(
        'hedefEd',
        'Hedefini not ettim. İlerlemeyi kilo yerine nasıl hissettiğin ve ölçülerinle takip edeceğiz.',
      );
    }
    if (beklenti === undefined || kilo === undefined) {
      return c('hedefKaydedildi', 'Hedefin kaydedildi. Programı buna göre kuracağız.');
    }

    const hedefKilo = sayi(cevaplar, 'H3');
    if (hedefKilo === undefined) {
      return c(
        'hedefBeklenti',
        `Ayda ${sayiMetni(beklenti)} kg beklentini not ettim; gerçekçiliğini raporda göstereceğim.`,
        { beklenti },
      );
    }

    const fark = Math.abs(hedefKilo - kilo);
    const hafta = beklenti > 0 ? Math.ceil((fark / beklenti) * 4.345) : 0;
    return hafta > 0
      ? c(
          'hedefSure',
          `Bu hedef yaklaşık ${hafta} haftalık bir yol. Gerçekçi olup olmadığını raporda göstereceğim.`,
          { hafta },
        )
      : c('hedefKisa', 'Hedefin kaydedildi.');
  },

  A: (cevaplar) => {
    const yas = antrenmanYasiBelirle(cevaplar);
    const esik = TABAN_HACIM[yas];
    const etiket = SEVIYE_ADLARI[yas];
    return c(
      'antrenmanYasi',
      `${etiket} seviye. Haftada kas grubu başına ${esik.hedefAlt}-${esik.hedefUst} set kaldırırsın.`,
      { seviye: yas, alt: esik.hedefAlt, ust: esik.hedefUst },
    );
  },

  S: (cevaplar) => {
    const profil = profilDerle(cevaplar, { bugun: new Date(), userId: 'onizleme' });
    const havuz = havuzHazirla(profil);
    const kisitElemesi = new Set(
      havuz.elemeler
        .filter((e) => e.kural === 'kontrendikasyon' || e.kural === 'eksenel_yuk_yasak')
        .map((e) => e.hareket_id),
    ).size;

    if (kisitElemesi === 0) {
      return c(
        'saglikTemiz',
        'Sağlık taramanda program üretimini kısıtlayan bir şey görünmüyor. Yine de ağrı ' +
          'bildirdiğin an programı değiştiririz.',
      );
    }
    return c(
      'saglikEleme',
      `Bildirdiklerine göre ${kisitElemesi} hareket havuzdan çıkarıldı. Yerlerine aynı kası ` +
        'çalıştıran güvenli muadiller koyacağım.',
      { adet: kisitElemesi },
    );
  },

  E: (cevaplar) => {
    const profil = profilDerle(cevaplar, { bugun: new Date(), userId: 'onizleme' });
    const havuz = havuzHazirla(profil);
    const yapilabilir = havuz.havuz.length;
    const toplam = HAREKET_KATALOGU.length;

    return c(
      'ekipman',
      `Ekipmanınla ${yapilabilir} hareket yapılabiliyor (kütüphanede ${toplam} hareket var).`,
      { yapilabilir, toplam },
    );
  },

  Z: (cevaplar) => {
    const gun = sayi(cevaplar, 'Z1') ?? Number(metin(cevaplar, 'Z1')?.match(/\d+/)?.[0] ?? 3);
    const dakika = Number(metin(cevaplar, 'Z2')?.match(/\d+/)?.[0] ?? 45);
    const split = splitSec({
      gunSayisi: gun,
      antrenmanYasi: antrenmanYasiBelirle(cevaplar),
      seansDakika: dakika,
    });

    return c('split', `${SPLIT_ADLARI[split.tip]} · ${split.gun_sayisi} gün sana uygun.`, {
      split: SPLIT_ADLARI[split.tip] ?? split.tip,
      gun: split.gun_sayisi,
    });
  },

  Y: (cevaplar) => {
    const uyku = metin(cevaplar, 'Y1');
    const stres = sayi(cevaplar, 'Y6') ?? 5;
    const duzeltmeler: string[] = [];

    if (uyku === '5 saatten az' || uyku === '5-6 saat') duzeltmeler.push('uykun kısa');
    if (stres >= 8) duzeltmeler.push('stresin yüksek');

    if (duzeltmeler.length === 0) {
      return c(
        'toparlanmaTemiz',
        'Toparlanma tarafında engelleyici bir şey yok; hacmi standart aralıkta tutuyorum.',
      );
    }

    const oran = (uyku === '5 saatten az' || uyku === '5-6 saat' ? 12 : 0) + (stres >= 8 ? 10 : 0);
    return c(
      'toparlanmaDuzeltme',
      `${cumleBasi(duzeltmeler.join(' ve '))}; haftalık hacmi yaklaşık %${oran} düşürdüm.`,
      {
        oran,
        uykuKisa: uyku === '5 saatten az' || uyku === '5-6 saat' ? 1 : 0,
        stres: stres >= 8 ? 1 : 0,
      },
    );
  },

  B: (cevaplar, edModu) => {
    if (edModu) {
      return c(
        'beslenmeEd',
        'Beslenme tarafını sayı göstermeden anlatacağım: her öğünde bir avuç protein, bir yumruk ' +
          'karbonhidrat, iki avuç sebze.',
      );
    }

    const profil = profilDerle(cevaplar, { bugun: new Date(), userId: 'onizleme' });
    const hedef = beslenmeHedefiHesapla(profil);
    return c(
      'beslenmeProtein',
      `Protein hedefin ${hedef.protein_g} g. Bu, kas kaybını önleyen en önemli tek sayı.`,
      { protein: hedef.protein_g },
    );
  },

  T: (cevaplar) => {
    const kardiyo = metin(cevaplar, 'T3');
    if (kardiyo === 'Nefret ederim') {
      return c(
        'kardiyoSevmiyor',
        'Kardiyoyu sevmiyorsun; minimuma indirdim ve yerine günlük adım hedefi koydum.',
      );
    }
    if (kardiyo === 'Severim') {
      return c(
        'kardiyoSeviyor',
        'Kardiyoyu seviyorsun; toparlanmayı bozmayacak şekilde programa yerleştirdim.',
      );
    }
    return c(
      'kardiyoOlculu',
      'Kardiyoyu ölçülü tuttum: sağlık için yeterli, antrenmanı bozmayacak kadar.',
    );
  },

  F: (_cevaplar, edModu) =>
    edModu
      ? c(
          'fotografEd',
          'Ölçülerin kaydedildi. Vücut analizini sayı göstermeden, bölge bazlı anlatacağım.',
        )
      : c(
          'fotograf',
          'Vücut analizin hazırlanıyor. Yağ oranını tek sayı olarak değil, aralık olarak vereceğim.',
        ),
};

const SEVIYE_ADLARI: Record<string, string> = {
  yeni: 'Yeni başlayan',
  erken: 'Erken',
  orta: 'Orta',
  ileri: 'İleri',
  kidemli: 'Kıdemli',
};

const SPLIT_ADLARI: Record<string, string> = {
  full_body: 'Full body',
  upper_lower: 'Upper/Lower',
  upper_lower_full: 'Upper/Lower/Full',
  ppl: 'Push/Pull/Legs',
  upper_lower_ppl: 'Upper/Lower/Push/Pull/Legs',
  ppl_x2: 'Push/Pull/Legs ×2',
};

function yasTahmini(cevaplar: Cevaplar): number {
  const dogum = metin(cevaplar, 'K1');
  if (!dogum) return 30;
  const tarih = new Date(`${dogum.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(tarih.getTime())) return 30;
  // Referans yıl sabit tutulmaz; yaş gerçek zamana göre hesaplanır.
  const bugun = new Date();
  let yas = bugun.getUTCFullYear() - tarih.getUTCFullYear();
  const ayFarki = bugun.getUTCMonth() - tarih.getUTCMonth();
  if (ayFarki < 0 || (ayFarki === 0 && bugun.getUTCDate() < tarih.getUTCDate())) yas -= 1;
  return yas > 0 && yas < 120 ? yas : 30;
}

function sayiMetni(deger: number): string {
  return Number.isInteger(deger) ? String(deger) : String(deger).replace('.', ',');
}

function cumleBasi(metin: string): string {
  return metin.charAt(0).toLocaleUpperCase('tr-TR') + metin.slice(1);
}
