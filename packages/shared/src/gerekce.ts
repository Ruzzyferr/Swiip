import type { Karar } from './domain';
import { HAREKET_KATALOGU } from './hareketler.uretilmis';
import type { Metinler } from './i18n';

/**
 * Karar izini kullanıcının dilinde cümleye çevirir.
 *
 * Motor metin üretmiyor; kural kimlikleri ve parametreler üretiyor. Cümle burada, sözlükle
 * kuruluyor. Böylece "programın neden o program olduğunu da söyleriz" vaadi tek bir dile
 * bağlı kalmıyor ve çekirdek deterministik, metinsiz kalıyor.
 *
 * **Yedek bilinçli:** çeviremediğimiz bir karar için uydurmuyoruz, motorun ürettiği Türkçe
 * izi olduğu gibi veriyoruz. Sağlık bağlamında yanlış bir gerekçe, yabancı dilde doğru bir
 * gerekçeden kötüdür.
 */

type GerekceMetinleri = Metinler['gerekce'];

/** Havuz kararı: "N hareket şu nedenle çıkarıldı". */
function havuzCumlesi(karar: Karar, metinler: GerekceMetinleri): string | undefined {
  const kural = karar.kurallar[0];
  if (!kural) return undefined;

  const hazir = (metinler.havuz as Record<string, unknown>)[kural];
  if (typeof hazir === 'string') return hazir;

  const adet = karar.parametreler?.adet;
  return adet === undefined ? undefined : metinler.havuz.varsayilan(adet);
}

/**
 * Hacim düzeltmesi: her düzeltme bir kurala bağlı, cümle kuraldan geliyor.
 *
 * Program gerekçesiyle aynı sebep: "haftalık hacmini neden bu tuttum" cümlesi ürünün
 * vaadinin parçası ve tek dile bağlı kalamaz.
 */
function hacimCumlesi(karar: Karar, metinler: GerekceMetinleri): string | undefined {
  const kural = karar.kurallar[0];
  if (!kural) return undefined;

  const hazir = (metinler.hacim as Record<string, unknown>)[kural];
  return typeof hazir === 'string' ? hazir : undefined;
}

/**
 * İlerleme kararı: yük, tekrar ve deload cümleleri.
 *
 * Sayı biçimi de dile bağlı: Türkçe ondalık ayırıcı virgül, İngilizcede nokta. "52,5 kg"
 * yazıp İngilizce cümlenin içine koymak, çevrilmiş görünen ama okunmayan bir metin üretir.
 */
function ilerlemeCumlesi(karar: Karar, metinler: GerekceMetinleri): string | undefined {
  const p = karar.parametreler;
  if (!p?.hareket_adi) return undefined;

  const ad = hareketAdi(karar, metinler.dil);
  if (!ad) return undefined;

  const sayi = (deger: number | undefined): string => {
    if (deger === undefined) return '';
    const yuvarli = Math.round(deger * 100) / 100;
    return Number.isInteger(yuvarli)
      ? String(yuvarli)
      : String(yuvarli).replace('.', metinler.ondalikAyirac);
  };

  const i = metinler.ilerleme;
  const cumleler: string[] = [];

  for (const kural of karar.kurallar) {
    switch (kural) {
      case 'tekrar_tavani':
        cumleler.push(i.tekrar_tavani(ad, p.tekrar ?? 0));
        break;
      case 'cift_ilerleme_basari':
        cumleler.push(
          p.vucut_agirligi
            ? i.tekrar_artti(ad, p.tekrar ?? 0)
            : i.yuk_artti(ad, sayi(p.artis), sayi(p.kg)),
        );
        break;
      case 'cift_ilerleme_sabit':
        cumleler.push(i.cift_ilerleme_sabit(ad, sayi(p.kg)));
        break;
      case 'hacim_dusuruldu':
        cumleler.push(i.hacim_dusuruldu(ad));
        break;
      case 'yuk_dusuruldu':
        cumleler.push(
          p.vucut_agirligi
            ? i.tekrar_dusuruldu(ad, p.tekrar ?? 0)
            : i.yuk_dusuruldu(ad, sayi(p.kg)),
        );
        break;
      case 'agri_bildirimi':
        cumleler.push(i.agri_bildirimi);
        break;
      case 'deload':
        cumleler.push(i.deload);
        break;
      default:
        break;
    }
  }

  // Cümleler arası ayırıcı boşluk: çevrilecek bir metin değil, noktalama.
  return cumleler.length === 0 ? undefined : cumleler.join(' ');
}

let katalogDizini: Map<string, { ad_tr: string; ad_en: string }> | undefined;

/**
 * Hareketin kullanıcının dilindeki adı.
 *
 * Ad katalog verisi, sözlük verisi değil: `ad_en` zaten var. Cümleyi çevirip içine Türkçe
 * hareket adı gömmek, yarım çevrilmiş bir gerekçe üretirdi.
 */
function hareketAdi(karar: Karar, dil: string): string | undefined {
  if (!katalogDizini) {
    katalogDizini = new Map(
      HAREKET_KATALOGU.map((h) => [h.id, { ad_tr: h.ad_tr, ad_en: h.ad_en }]),
    );
  }

  const katalog = katalogDizini.get(karar.entity_id);
  if (dil === 'en' && katalog?.ad_en) return katalog.ad_en;

  return katalog?.ad_tr ?? karar.parametreler?.hareket_adi;
}

/** Hareket kararı: seçimi kazandıran kuralların cümlesi. */
function hareketCumlesi(karar: Karar, metinler: GerekceMetinleri): string | undefined {
  const p = karar.parametreler;
  if (!p?.hareket_adi) return undefined;

  const ad = hareketAdi(karar, metinler.dil);
  if (!ad) return undefined;

  const grup = p.grup ? ((metinler.gruplar as Record<string, string>)[p.grup] ?? p.grup) : '';
  const patern = p.patern
    ? ((metinler.paternler as Record<string, string>)[p.patern] ?? p.patern)
    : '';

  const sebepler: string[] = [];
  for (const kural of karar.kurallar) {
    switch (kural) {
      case 'oncelikli_bolge':
        sebepler.push(metinler.hareket.oncelikli_bolge(grup));
        break;
      case 'bilesik_cekirdek':
        sebepler.push(metinler.hareket.bilesik_cekirdek(patern));
        break;
      case 'izolasyon_tamamlayici':
        sebepler.push(metinler.hareket.izolasyon_tamamlayici(grup));
        break;
      case 'sfr_yuksek':
        sebepler.push(metinler.hareket.sfr_yuksek);
        break;
      case 'kontrendikasyon_uyumlu':
        sebepler.push(metinler.hareket.kontrendikasyon_uyumlu);
        break;
      case 'kalabalik_salon_uyumlu':
        sebepler.push(metinler.hareket.kalabalik_salon_uyumlu);
        break;
      default:
        break;
    }
  }

  if (sebepler.length === 0) return undefined;

  return metinler.hareket.cumle(ad, sebepler.join(metinler.hareket.ayirac));
}

/** Karar türüne göre cümleyi kurar; kuramazsa undefined. */
function cumleKur(karar: Karar, metinler: GerekceMetinleri): string | undefined {
  switch (karar.entity_tipi) {
    case 'havuz':
      return havuzCumlesi(karar, metinler);
    case 'hareket':
      return hareketCumlesi(karar, metinler);
    case 'hacim':
      return hacimCumlesi(karar, metinler);
    case 'ilerleme':
      return ilerlemeCumlesi(karar, metinler);
    default:
      return undefined;
  }
}

/**
 * Kararın kullanıcıya gösterilecek cümlesi.
 *
 * Çevrilebiliyorsa sözlükten kurulur; kurulamıyorsa motorun Türkçe izi döner. Hangi
 * durumda olduğunu çağıran bilmek zorunda değil, ama boş cümle asla dönmez.
 */
export function kararMetni(karar: Karar, metinler: GerekceMetinleri): string {
  return cumleKur(karar, metinler) ?? karar.aciklama_tr;
}

/** Cümle gerçekten çevrildi mi — yedeğe düşen kararları görünür kılar. */
export function kararCevrildiMi(karar: Karar, metinler: GerekceMetinleri): boolean {
  return cumleKur(karar, metinler) !== undefined;
}

// ---------------------------------------------------------------------------
// Vücut analizi raporu
// ---------------------------------------------------------------------------

/** Motorun ürettiği rapor; yalnızca cümle kurmak için gereken alanlar. */
export interface RaporIzi {
  durus_bayraklari: string[];
  sinirlama_kodlari: string[];
  ozet_parametreleri?: {
    kaynak: 'capraz' | 'gorsel' | 'olcu';
    alt: number;
    ust: number;
    kiloKg: number;
    boyCm: number;
  };
  bel_boy?: { uyari: boolean };
  /** Motorun Türkçe metinleri — çeviremediğimiz yerde yedek. */
  ozet: string;
  durus: string[];
  sinirlamalar: string[];
  feragat: string;
}

type RaporMetinleri = Metinler['rapor']['motor'];

/** Raporun kullanıcının dilindeki metinleri. Çevrilemeyen parça Türkçe ize düşer. */
/**
 * Karar izindeki bir girdi değerini okunur hâle getirir.
 *
 * "Hangi cevaplarından çıktı" listesi ham motor kodu yazıyordu: kullanıcı
 * `kablo_makinesi`, `sirt`, `omuz_instabilite` görüyordu. Ürünün en güçlü ekranı —
 * kararın nereden geldiğini gösteren ekran — içinden bir geliştirici not defteri
 * sızdırıyordu.
 *
 * Karşılığı olmayan kod olduğu gibi bırakılmıyor, en azından alt çizgileri boşluğa
 * çevriliyor: uydurmadan, ama makine gibi de görünmeden.
 */
export function kararGirdisiMetni(deger: string, metinler: GerekceMetinleri): string {
  const sozlukler: Array<Record<string, string>> = [
    metinler.ekipmanlar as Record<string, string>,
    metinler.kontrendikasyonlar as Record<string, string>,
    metinler.gruplar as Record<string, string>,
    metinler.paternler as Record<string, string>,
  ];

  return deger
    .split(',')
    .map((ham) => ham.trim())
    .filter((ham) => ham !== '')
    .map((ham) => {
      for (const sozluk of sozlukler) {
        const karsilik = sozluk[ham];
        if (karsilik) return karsilik;
      }
      // Karşılığı yoksa hiç değilse alt çizgi gitsin.
      const bosluklu = ham.replace(/_/g, ' ');
      return bosluklu.charAt(0).toLocaleUpperCase('tr-TR') + bosluklu.slice(1);
    })
    .join(', ');
}

export function raporMetinleri(
  rapor: RaporIzi,
  metinler: RaporMetinleri,
): {
  ozet: string;
  durus: string[];
  sinirlamalar: string[];
  belBoyMesaji?: string;
  feragat: string;
} {
  const durus = rapor.durus_bayraklari
    .map((bayrak) => (metinler.durus as Record<string, string>)[bayrak])
    .filter((metin): metin is string => metin !== undefined);

  const sinirlamalar = rapor.sinirlama_kodlari
    .map((kod) => (metinler.sinirlama as Record<string, string>)[kod])
    .filter((metin): metin is string => metin !== undefined);

  const p = rapor.ozet_parametreleri;
  const ozet = p
    ? metinler.ozet.cumle(metinler.ozet.yontem[p.kaynak], p.alt, p.ust, p.kiloKg, p.boyCm)
    : metinler.ozet.veriYok;

  const sonuc: ReturnType<typeof raporMetinleri> = {
    ozet,
    // Kod çözülemediyse motorun Türkçe metnine düşülür; boş liste göstermeyiz.
    durus: durus.length === rapor.durus_bayraklari.length ? durus : rapor.durus,
    sinirlamalar:
      sinirlamalar.length === rapor.sinirlama_kodlari.length ? sinirlamalar : rapor.sinirlamalar,
    feragat: metinler.feragat,
  };

  if (rapor.bel_boy) {
    sonuc.belBoyMesaji = rapor.bel_boy.uyari ? metinler.belBoy.uyari : metinler.belBoy.normal;
  }

  return sonuc;
}

// ---------------------------------------------------------------------------
// Değerlendirme blok geri bildirimi
// ---------------------------------------------------------------------------

/** Motorun ürettiği blok geri bildirimi izi. */
export interface BlokGeriBildirimiIzi {
  anahtar: string;
  degerler?: Record<string, string | number>;
  /** Motorun Türkçe metni — çeviremediğimiz anahtarda yedek. */
  metin: string;
}

type BlokMetinleri = Metinler['blokGeriBildirimi'];

/**
 * Blok geri bildirimini kullanıcının dilinde kurar.
 *
 * Değerlendirmenin her bloğunun sonunda "ne öğrendik, programını nasıl değiştirdi" cümlesi
 * çıkıyor; akışı bitirten şey bu geri bildirim. Bilinmeyen bir anahtarda cümle
 * uydurmuyoruz, motorun Türkçe metnine düşüyoruz.
 */
export function blokGeriBildirimiMetni(iz: BlokGeriBildirimiIzi, metinler: BlokMetinleri): string {
  const uretici = (metinler as Record<string, unknown>)[iz.anahtar];
  if (typeof uretici !== 'function') return iz.metin;

  const degerler = { ...(iz.degerler ?? {}) };

  // Seviye kodu ada burada çevrilir: ad sözlük verisi, motor yalnızca kodu taşır.
  if (typeof degerler.seviye === 'string') {
    degerler.seviyeAdi =
      (metinler.seviyeAdlari as Record<string, string>)[degerler.seviye] ?? degerler.seviye;
  }

  return (uretici as (d: Record<string, string | number>) => string)(degerler);
}

// ---------------------------------------------------------------------------
// Program metinleri: split gerekçesi, uyarılar, ilerleme kuralı
// ---------------------------------------------------------------------------

type ProgramMetinleri = Metinler['program']['motor'];

/** Sözlükten anahtarla üretici çeker; yoksa undefined. */
function ureticiBul(
  bolum: unknown,
  anahtar: string | undefined,
): ((d: Record<string, string | number>) => string) | undefined {
  if (!anahtar) return undefined;
  const uretici = (bolum as Record<string, unknown>)[anahtar];
  return typeof uretici === 'function'
    ? (uretici as (d: Record<string, string | number>) => string)
    : undefined;
}

/** Split gerekçesi; anahtarı çözemezsek motorun Türkçe metnine düşer. */
export function splitGerekcesi(
  split: {
    gerekce: string;
    gerekce_anahtari?: string;
    gerekce_degerleri?: Record<string, string | number>;
  },
  metinler: ProgramMetinleri,
): string {
  const uretici = ureticiBul(metinler.split, split.gerekce_anahtari);
  return uretici ? uretici(split.gerekce_degerleri ?? {}) : split.gerekce;
}

/**
 * Program uyarıları.
 *
 * Kod listesi metin listesiyle aynı uzunlukta değilse çeviriye güvenmiyoruz: eksik bir
 * uyarı, kullanıcıya söylemediğimiz bir kısıt demek.
 */
export function programUyarilari(
  program: {
    uyarilar: string[];
    uyari_kodlari?: Array<{ kod: string; degerler?: Record<string, string | number> }>;
  },
  metinler: ProgramMetinleri,
): string[] {
  const kodlar = program.uyari_kodlari ?? [];
  if (kodlar.length !== program.uyarilar.length) return program.uyarilar;

  const cevrilen = kodlar
    .map((u) => ureticiBul(metinler.uyari, u.kod)?.(u.degerler ?? {}))
    .filter((metin): metin is string => metin !== undefined);

  return cevrilen.length === kodlar.length ? cevrilen : program.uyarilar;
}

/** Hareketin ilerleme kuralı cümlesi. */
export function ilerlemeKuraliMetni(
  hareket: {
    ilerleme_kurali: string;
    ilerleme_kurali_kodu?: {
      kod: string;
      set: number;
      tekrar_alt: number;
      tekrar_ust: number;
      artis?: number;
    };
  },
  metinler: ProgramMetinleri,
): string {
  const kod = hareket.ilerleme_kurali_kodu;
  const uretici = ureticiBul(metinler.ilerlemeKurali, kod?.kod);
  if (!kod || !uretici) return hareket.ilerleme_kurali;

  return uretici({
    set: kod.set,
    tekrar_alt: kod.tekrar_alt,
    tekrar_ust: kod.tekrar_ust,
    ...(kod.artis !== undefined ? { artis: kod.artis } : {}),
  });
}

// ---------------------------------------------------------------------------
// API hata mesajları
// ---------------------------------------------------------------------------

type ApiHataMetinleri = Metinler['apiHatalari'];

/**
 * Sunucu hatasını kullanıcının dilinde anlatır.
 *
 * Sunucu mesajı Türkçe üretir ve **kod** döner. Metin burada koddan kuruluyor; kodu
 * çözemezsek sunucunun mesajına düşüyoruz. Böylece sunucunun kullanıcının dilini bilmesi
 * gerekmiyor ve hiçbir durumda boş mesaj kalmıyor.
 *
 * Kodların genel değil **özgül** olması şart: "gecersiz_istek" kodunu çevirmek
 * "Bel ve boyun ölçünü girmedin" cümlesini "Geçersiz istek"e düşürürdü — çevrilmiş ama
 * bilgisi alınmış bir hata, çevrilmemiş olandan kötü.
 */
export function apiHataMetni(
  hata: { kod?: string; mesaj?: string; degerler?: Record<string, string | number> },
  metinler: ApiHataMetinleri,
): string | undefined {
  const uretici = hata.kod ? (metinler as Record<string, unknown>)[hata.kod] : undefined;
  if (typeof uretici === 'function') {
    return (uretici as (d: Record<string, string | number>) => string)(hata.degerler ?? {});
  }

  return hata.mesaj;
}
