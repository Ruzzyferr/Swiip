import { HAREKET_KATALOGU } from '@swiip/shared';
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
 * Bu ekranlar terk oranına karşı en güçlü kozumuz: kullanıcı emeğini boşa harcamadığını
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
   * cümlesi çıkıyor; akışı bitirten şey bu. Cümleyi motorda sabitlemek onu yalnızca
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

/**
 * Bakım kalorisi tahmininin belirsizlik payı ve yuvarlama adımı.
 *
 * %8: Mifflin-St Jeor'un bildirilen standart hatası (~%10) ile aktivite çarpanının
 * kendi payı arasında, muhafazakâr ama abartısız bir orta yol. 25 kcal adımı ise
 * aralığın kendisinin sahte bir kesinlik taşımasını engelliyor: `1817-2133` yazmak
 * `1975` yazmak kadar yanıltıcı olurdu.
 */
const TDEE_BELIRSIZLIK = 0.08;
const KALORI_YUVARLAMA = 25;

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

    /**
     * Tahmin ARALIK olarak veriliyor, tek sayı olarak değil.
     *
     * Burada `yaklaşık 1975 kcal` yazıyordu. "Yaklaşık" kelimesi vardı ama gösterilen
     * şey yuvarlanmamış dört haneli tek bir sayıydı ve olduğundan çok daha kesin
     * okunuyordu. Oysa hem Mifflin-St Jeor'un standart hatası (~%10) hem de aktivite
     * çarpanı birer tahmin; ikisinin çarpımı tek bir sayıyla ifade edilemez.
     *
     * Ürünün kilitli kuralı zaten bunu söylüyor: "Tahminler aralık olarak sunulur,
     * tek sayı olarak asla." Vücut yağı tarafında uygulanmış (`vucut.ts` ·
     * `yagOraniAralik`), bakım kalorisinde uygulanmamıştı.
     *
     * Pratik sonucu da var: kullanıcı bir sonraki kartta 1990 görürse tek sayı
     * "tutarsızlık" gibi okunur — rakip analizinde en çok beğenilen negatif yorum
     * tam olarak buydu. Aralık, aynı belirsizliği dürüstçe gösteriyor.
     */
    const pay = tdee * TDEE_BELIRSIZLIK;
    const alt = Math.round((tdee - pay) / KALORI_YUVARLAMA) * KALORI_YUVARLAMA;
    const ust = Math.round((tdee + pay) / KALORI_YUVARLAMA) * KALORI_YUVARLAMA;

    return c(
      'bakimKalorisi',
      `Bakım kalorin yaklaşık ${alt}-${ust} kcal. Bu, kilonu korumak için günde aldığın enerji.`,
      { alt, ust, tdee },
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
    const profil = profilDerle(cevaplar, { bugun: new Date(), userId: 'onizleme' });
    const havuz = havuzHazirla(profil);
    const agriElemesi = new Set(
      havuz.elemeler
        .filter((e) => e.kural === 'agriyi_artiran_patern' || e.kural === 'eksenel_yuk_yasak')
        .map((e) => e.hareket_id),
    ).size;

    if (agriElemesi === 0) {
      return c(
        'agriTemiz',
        'Ağrı tarafında programı kısıtlayan bir şey yok. Bir seansta ağrı bildirirsen ' +
          'programı o gün değiştiririm.',
      );
    }
    return c(
      'agriEleme',
      `Bildirdiğin ağrıya göre ${agriElemesi} hareket değişti; yerlerine aynı kası çalıştıran ` +
        'muadiller koydum.',
      { adet: agriElemesi },
    );
  },

  G: (cevaplar) => {
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
    const yas = antrenmanYasiBelirle(cevaplar);
    const split = splitSec({ gunSayisi: gun, antrenmanYasi: yas, seansDakika: dakika });
    const esik = TABAN_HACIM[yas];

    /**
     * Antrenman yaşı ve split aynı kartta soruluyor, dolayısıyla aynı cümlede dönüyor.
     * Ayrı bloklarken iki ayrı geri bildirim ekranıydı; kart birleşince cümle de birleşti.
     */
    return c(
      'splitVeSeviye',
      `${SPLIT_ADLARI[split.tip]} · ${split.gun_sayisi} gün. ${SEVIYE_ADLARI[yas]} seviye: ` +
        `haftada kas grubu başına ${esik.hedefAlt}-${esik.hedefUst} set.`,
      {
        split: SPLIT_ADLARI[split.tip] ?? split.tip,
        gun: split.gun_sayisi,
        seviye: yas,
        alt: esik.hedefAlt,
        ust: esik.hedefUst,
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

  M: (cevaplar, edModu) => {
    const kim = metin(cevaplar, 'B5');
    if (kim === 'Ailem') {
      return c(
        'mutfakAilem',
        'Yemeği evde başkası hazırlıyor; menü dayatmayacağım. Mevcut sofraya porsiyon ve ' +
          'tamamlayıcı önereceğim.',
      );
    }
    if (edModu) {
      return c('mutfakEd', 'Mutfak tercihlerini not ettim; planı porsiyon diliyle anlatacağım.');
    }
    const sure = metin(cevaplar, 'B7');
    if (sure === 'Hiç pişiremem') {
      return c(
        'mutfakPisirmez',
        'Pişirme gerektirmeyen ve hazır alınabilen seçeneklerden kuracağım.',
      );
    }
    return c('mutfakTamam', 'Mutfak kısıtlarını not ettim; tarifleri bunlara göre seçeceğim.');
  },
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
