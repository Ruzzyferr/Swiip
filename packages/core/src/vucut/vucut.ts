import type { Cinsiyet } from '@swiip/shared';
import { kirp, yuvarla } from '../profil/olcumler';

/**
 * Vücut analizi — spec bölüm 5.
 *
 * İki sert kural:
 *  1. Yağ oranı asla tek sayı olarak sunulmaz; her zaman aralık.
 *  2. Duruş bulguları "eğilim" dilinde yazılır; tanı adı kullanılmaz.
 *
 * Bu modül fotoğrafı görmez ve saklamaz. Görsel modelin çıkardığı sayısal özet girdi olarak
 * gelir; fotoğrafın kendisi hiçbir zaman bu katmana ulaşmaz.
 */

export interface NavyGirdisi {
  cinsiyet: Cinsiyet;
  boyCm: number;
  boyunCm: number;
  belCm: number;
  kalcaCm?: number;
}

/** ABD Donanması çevre ölçüsü formülü (metrik). */
export function navyYagOrani(girdi: NavyGirdisi): number | undefined {
  const { cinsiyet, boyCm, boyunCm, belCm, kalcaCm } = girdi;
  if (boyCm <= 0 || boyunCm <= 0 || belCm <= 0) return undefined;

  if (cinsiyet === 'erkek') {
    const fark = belCm - boyunCm;
    if (fark <= 0) return undefined;
    const ham = 495 / (1.0324 - 0.19077 * Math.log10(fark) + 0.15456 * Math.log10(boyCm)) - 450;
    return yuvarla(kirp(ham, 3, 60), 1);
  }

  if (kalcaCm === undefined || kalcaCm <= 0) return undefined;
  const fark = belCm + kalcaCm - boyunCm;
  if (fark <= 0) return undefined;
  const ham = 495 / (1.29579 - 0.35004 * Math.log10(fark) + 0.221 * Math.log10(boyCm)) - 450;
  return yuvarla(kirp(ham, 5, 65), 1);
}

export interface YagOraniAralikGirdisi {
  /** Görsel modelin tahmini (%). */
  gorselTahmin?: number;
  /** Çevre ölçüsünden Navy formülü tahmini (%). */
  navyTahmin?: number;
}

export interface YagOraniAraligi {
  alt: number;
  ust: number;
  /** İki yöntem ne kadar uyumlu: 'capraz' | 'gorsel' | 'olcu'. */
  kaynak: 'capraz' | 'gorsel' | 'olcu';
}

/** Tek yöntemin belirsizliği; iki yöntem uyuşursa daralır, çelişirse genişler. */
const TEK_YONTEM_PAYI = 4;
const CAPRAZ_PAYI = 2.5;

export function yagOraniAralik(girdi: YagOraniAralikGirdisi): YagOraniAraligi | undefined {
  const { gorselTahmin, navyTahmin } = girdi;

  if (gorselTahmin !== undefined && navyTahmin !== undefined) {
    const ortalama = (gorselTahmin + navyTahmin) / 2;
    const celiski = Math.abs(gorselTahmin - navyTahmin);
    // Yöntemler çelişiyorsa bunu gizlemek yerine aralığı genişletip dürüst davranırız.
    const pay = CAPRAZ_PAYI + celiski / 2;
    return aralikKur(ortalama, pay, 'capraz');
  }

  if (gorselTahmin !== undefined) return aralikKur(gorselTahmin, TEK_YONTEM_PAYI, 'gorsel');
  if (navyTahmin !== undefined) return aralikKur(navyTahmin, TEK_YONTEM_PAYI, 'olcu');
  return undefined;
}

function aralikKur(
  merkez: number,
  pay: number,
  kaynak: YagOraniAraligi['kaynak'],
): YagOraniAraligi {
  return {
    alt: Math.max(3, Math.floor(merkez - pay)),
    ust: Math.min(65, Math.ceil(merkez + pay)),
    kaynak,
  };
}

export interface BelBoySonucu {
  oran: number;
  uyari: boolean;
  mesaj: string;
}

/** Bel/boy oranı 0,5 üstü metabolik risk göstergesidir; tanı değil, işaret. */
export function belBoyOrani(belCm: number, boyCm: number): BelBoySonucu {
  const oran = yuvarla(belCm / boyCm, 3);
  const uyari = oran > 0.5;

  return {
    oran,
    uyari,
    mesaj: uyari
      ? 'Bel ölçün boyunun yarısından fazla. Bu, göbek çevresi yağlanmasının biraz yüksek ' +
        'olabileceğine işaret eden basit bir göstergedir. Bel çevresi, kilo düşmese bile ' +
        'antrenman ve beslenmeye en hızlı yanıt veren ölçülerden biri.'
      : 'Bel ölçün boyunun yarısının altında. Bu genellikle iyi bir göstergedir; ' +
        'ilerlemeyi takip ederken bu oranı izlemeye devam edeceğiz.',
  };
}

/** Duruş bayrağı -> eğilim dilinde Türkçe karşılık. Tanı adı kullanılmaz. */
export const DURUS_ETIKETLERI: Record<string, string> = {
  omuz_protraksiyonu:
    'Omuzlarında öne doğru kayma eğilimi görünüyor. Üst sırt ve arka omuz çalışmasını ' +
    'artırdım, göğüs esnekliği için ısınmaya hareket ekledim.',
  bas_one:
    'Başın gövde hizasının biraz önünde duruyor gibi görünüyor. Uzun süre ekran başında ' +
    'kalanlarda sık görülen bir eğilim; boyun ve üst sırt çalışması yardımcı olur.',
  pelvik_egim:
    'Leğen kemiğinde öne dönme eğilimi görünüyor. Karın ve kalça çalışmasını dengeleyerek ' +
    'bu eğilimi azaltmayı hedefliyoruz.',
  ust_sirt_yuvarlanma:
    'Üst sırtında yuvarlanma eğilimi görünüyor. Programda çekme hareketlerinin payını ' +
    'itme hareketlerine göre biraz yüksek tuttum.',
  omuz_asimetrisi:
    'İki omzun arasında hafif bir yükseklik farkı görünüyor. Tek taraflı hareketler ekleyerek ' +
    'iki tarafı ayrı ayrı çalıştırıyoruz.',
  diz_ice_donme:
    'Çömelirken dizlerinde içe doğru kayma eğilimi görünüyor. Kalça yan kaslarını ' +
    'güçlendiren hareketler ekledim.',
};

export interface GorselAnalizCiktisi {
  /** Görsel modelin yağ oranı tahmini (%). */
  yagOrani?: number;
  /** Bölge bazlı gelişmişlik skoru (1-5). Göreli sıralama için. */
  kasDagilimi: Record<string, number>;
  durusBayraklari: string[];
}

export interface VucutRaporuGirdisi {
  cinsiyet: Cinsiyet;
  yas: number;
  boyCm: number;
  kiloKg: number;
  olculer?: {
    bel_cm?: number;
    kalca_cm?: number;
    boyun_cm?: number;
    gogus_cm?: number;
    kol_cm?: number;
    uyluk_cm?: number;
  };
  gorsel?: GorselAnalizCiktisi;
}

/** Özet cümlesini herhangi bir dilde kurmaya yeten değerler. */
export interface OzetParametreleri {
  kaynak: YagOraniAraligi['kaynak'];
  alt: number;
  ust: number;
  kiloKg: number;
  boyCm: number;
}

export interface VucutRaporu {
  yag_orani?: YagOraniAraligi;
  yontem: 'capraz' | 'gorsel' | 'olcu' | 'yok';
  bel_boy?: BelBoySonucu;
  kas_dagilimi: Array<{ bolge: string; skor: number }>;
  /** Türkçe duruş cümleleri — karar izi ve çeviremediğimiz yerde yedek. */
  durus: string[];
  /**
   * Duruş bayrağı kodları.
   *
   * Rapor ücretsiz planın teslim ettiği tek çıktı, yani ürünün ilk izlenimi. Cümleyi
   * motorda sabitlemek bu izlenimi yalnızca Türkçe kullanıcıya vermek demekti; motor kod
   * üretiyor, cümle sözlükte kuruluyor.
   */
  durus_bayraklari: string[];
  ozet: string;
  /** Özet cümlesini kurmak için gerekenler; veri yetersizse yok — cümle uydurulmaz. */
  ozet_parametreleri?: OzetParametreleri;
  sinirlamalar: string[];
  /** Sınırlama gerekçelerinin kodları: 'fotograf_yok' | 'olcu_yok'. */
  sinirlama_kodlari: string[];
  feragat: string;
}

const FERAGAT =
  'Swiip tıbbi cihaz değildir, teşhis koymaz. Buradaki çıktılar ölçüm ve görüntüden ' +
  'çıkarılmış tahminlerdir; kesin değer değildir. Bir şikâyetin varsa hekimine danış.';

export function vucutRaporuUret(girdi: VucutRaporuGirdisi): VucutRaporu {
  const sinirlamalar: string[] = [];
  const sinirlama_kodlari: string[] = [];

  const bel = girdi.olculer?.bel_cm;
  const boyun = girdi.olculer?.boyun_cm;
  const kalca = girdi.olculer?.kalca_cm;

  const navy =
    bel !== undefined && boyun !== undefined
      ? navyYagOrani({
          cinsiyet: girdi.cinsiyet,
          boyCm: girdi.boyCm,
          boyunCm: boyun,
          belCm: bel,
          ...(kalca !== undefined ? { kalcaCm: kalca } : {}),
        })
      : undefined;

  const aralik = yagOraniAralik({
    ...(girdi.gorsel?.yagOrani !== undefined ? { gorselTahmin: girdi.gorsel.yagOrani } : {}),
    ...(navy !== undefined ? { navyTahmin: navy } : {}),
  });

  if (!girdi.gorsel) {
    sinirlama_kodlari.push('fotograf_yok');
    sinirlamalar.push(
      'Fotoğraf yüklemedin. Ölçülerinle devam ettik; yağ oranı aralığı biraz daha geniş çıkıyor ' +
        've kas dağılımı haritası çıkarılamıyor. İstediğin zaman fotoğrafla güncelleyebilirsin.',
    );
  }
  if (navy === undefined) {
    sinirlama_kodlari.push('olcu_yok');
    sinirlamalar.push(
      'Bel ve boyun ölçünü girmedin. Bu ikisi girildiğinde tahmini ölçüyle çapraz doğrulayabiliyoruz.',
    );
  }

  const kas_dagilimi = Object.entries(girdi.gorsel?.kasDagilimi ?? {})
    .map(([bolge, skor]) => ({ bolge, skor }))
    .sort((a, b) => (b.skor !== a.skor ? b.skor - a.skor : a.bolge.localeCompare(b.bolge)));

  // Yalnızca karşılığı olan bayraklar taşınır: karşılığı olmayan bir kod, ekranda boş satır.
  const durus_bayraklari = (girdi.gorsel?.durusBayraklari ?? []).filter(
    (bayrak) => DURUS_ETIKETLERI[bayrak] !== undefined,
  );
  const durus = durus_bayraklari.map((bayrak) => DURUS_ETIKETLERI[bayrak]!);

  const yontem: VucutRaporu['yontem'] = aralik ? aralik.kaynak : 'yok';

  const rapor: VucutRaporu = {
    yontem,
    kas_dagilimi,
    durus,
    durus_bayraklari,
    ozet: ozetYaz(aralik, girdi),
    sinirlamalar,
    sinirlama_kodlari,
    feragat: FERAGAT,
  };

  if (aralik) {
    rapor.ozet_parametreleri = {
      kaynak: aralik.kaynak,
      alt: aralik.alt,
      ust: aralik.ust,
      kiloKg: girdi.kiloKg,
      boyCm: girdi.boyCm,
    };
  }

  if (aralik) rapor.yag_orani = aralik;
  if (bel !== undefined) rapor.bel_boy = belBoyOrani(bel, girdi.boyCm);

  return rapor;
}

/** Ondalık ayraç Türkçede virgül. "78.5 kg" yabancı bir üründen çıkmış gibi duruyor. */
function sayiYaz(deger: number): string {
  return (Math.round(deger * 10) / 10).toString().replace('.', ',');
}

function ozetYaz(aralik: YagOraniAraligi | undefined, girdi: VucutRaporuGirdisi): string {
  if (!aralik) {
    return (
      'Yağ oranı tahmini için yeterli veri yok. Bel ve boyun ölçünü girer ya da fotoğraf ' +
      'yüklersen bir aralık çıkarabiliriz.'
    );
  }

  const yontemMetni =
    aralik.kaynak === 'capraz'
      ? 'Fotoğraf ve çevre ölçülerini birlikte değerlendirdik'
      : aralik.kaynak === 'gorsel'
        ? 'Fotoğraf üzerinden değerlendirdik'
        : 'Çevre ölçülerin üzerinden değerlendirdik';

  /**
   * Kilo bilinmiyorsa cümleden çıkıyor.
   *
   * Bir zamanlar burası her raporda "0 kg" yazıyordu; ölçen bir ürünün kullanıcıya
   * söyleyebileceği en kötü cümle. Bilmediğimiz sayıyı yazmamak, uydurmaktan iyidir.
   */
  const olcuMetni =
    girdi.kiloKg > 0
      ? `${sayiYaz(girdi.kiloKg)} kg ve ${sayiYaz(girdi.boyCm)} cm değerlerinle`
      : `${sayiYaz(girdi.boyCm)} cm boyunla`;

  return (
    `${yontemMetni}: vücut yağ oranın yaklaşık %${aralik.alt}-${aralik.ust} aralığında ` +
    `görünüyor. Bu bir aralıktır, kesin ölçüm değil — ${olcuMetni} ` +
    'birlikte ilerlemeyi bu aralığın nasıl değiştiğine bakarak takip edeceğiz.'
  );
}
