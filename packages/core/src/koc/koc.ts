import type { Profil } from '@swiip/shared';
import { metinler } from '@swiip/shared';
import { turkceNormalize } from '../tanima/tanima';

/**
 * AI koç — spec bölüm 11.
 *
 * Serbest bir sohbet botu DEĞİL. Kullanıcının kendi verisine erişimi olan, sınırları
 * kodla çizilmiş bir koç.
 *
 * Sınırlar modele "lütfen yapma" diye söylenmez — istek modele ULAŞMADAN önce burada
 * kesilir. Bir sağlık uygulamasında sistem mesajına güvenmek, kilidi kapıya değil kapının
 * üstündeki nota yazmaktır.
 */

export type SinirKategorisi = 'tani' | 'doz' | 'asiri_hedef' | 'kapsam_disi' | 'ed_sayi';

export interface SinirSonucu {
  izin: boolean;
  kategori?: SinirKategorisi;
  /** Reddedildiğinde kullanıcıya gösterilecek hazır cevap; model çağrılmaz. */
  cevap: string;
}

export interface SinirBaglami {
  edModu: boolean;
}

const IZIN_VERILDI: SinirSonucu = { izin: true, cevap: '' };

/**
 * Desenler ASCII'ye normalize edilmiş metin üzerinde çalışır.
 *
 * Neden: JavaScript'te `` sözcük sınırı yalnızca ASCII harfleri tanır. "ağrı" içindeki
 * "ı" sözcük karakteri sayılmadığı için `/ağrı/` hiçbir zaman eşleşmez — Türkçe metinde
 * sessizce çalışmayan bir güvenlik kuralı, hiç olmayan bir kuraldan daha tehlikelidir.
 * Bu yüzden önce `turkceNormalize` ile sadeleştirip sonra eşliyoruz.
 */

/** Semptom ve tanı dili. Bunlar hekime yönlendirilir. */
const TANI_DESENLERI = [
  /agri/,
  /sanci/,
  /batma/,
  /sislik/,
  /uyusma/,
  /fitik/,
  /menisk/,
  /yirtik/,
  /tendinit/,
  /hastalik/,
  /semptom/,
  /belirti/,
  /(^|[^a-z])tani([^a-z]|$)/,
  /teshis/,
  /tutuldu/,
  /zonkl/,
  /sakatlan/,
];

/** Doz ve ilaç soruları. */
const DOZ_DESENLERI = [
  /kac\s*(gram|mg|mcg|ml|iu|unite)/,
  /(^|[^a-z])doz/,
  /(^|[^a-z])ilac/,
  /(^|[^a-z])hap([^a-z]|$)/,
  /kreatin.*(kac|ne kadar|almali|iceyim)/,
  /vitamin.*(doz|kac|ne kadar|olmali)/,
  /(cinko|magnezyum|omega).*(kac|mg|iceyim|almali)/,
  /(al|ic)abilir miyim.*(ilac|hap|antibiyotik)/,
  /antrenmandan (once|sonra).*(ilac|hap)/,
];

/** Aşırı kısıtlayıcı veya tehlikeli hedefler. */
const ASIRI_HEDEF_DESENLERI = [
  /(^|[^0-9])([0-9]{1,3})\s*kalori/,
  /hic\s*yeme/,
  /ac\s*kal.*kac/,
  /su\s*orucu/,
  /bir\s*ayda\s*([5-9]|[1-9][0-9])\s*kilo/,
  /(uc|3|iki|2|bir|1)\s*gun.*([3-9]|[1-9][0-9])\s*kilo/,
  /(kusma|kusarak)/,
  /laksatif/,
  /aclik grevi/,
];

/** Kapsam dışı konular. */
const KAPSAM_DISI_DESENLERI = [
  /hava\s*(nasil|durumu)/,
  /siir/,
  /hikaye\s*yaz/,
  /(python|javascript|kod)\w*\s*(yaz|ornegi)/,
  /(^|[^a-z])secim(ler)?([^a-z]|$)/,
  /siyaset/,
  /borsa/,
  /kripto/,
  /mac\s*skoru/,
];

/** ED modunda sayıya dokunan sorular. */
const ED_SAYI_DESENLERI = [
  /kac\s*kalori/,
  /kalori.*(aldim|yedim|kaldi|hedefim)/,
  /kac\s*kilo/,
  /kilo.*(hedef|dusmeli|vermeli)/,
  /makro.*kac/,
  /kac\s*gram\s*(protein|karbonhidrat|yag)/,
];

/** Fitness ve beslenme bağlamı: kapsam kontrolünde yanlış pozitifi azaltır. */
const KAPSAM_ICI_ANAHTARLAR = [
  'antrenman',
  'egzersiz',
  'hareket',
  'program',
  'protein',
  'kalori',
  'beslenme',
  'yemek',
  'ogun',
  'squat',
  'bench',
  'deadlift',
  'barfiks',
  'kardiyo',
  'toparlanma',
  'salon',
  'agirlik',
];

/** Bir desen kümesi normalize metinle eşleşiyor mu. */
function eslesir(desenler: readonly RegExp[], normal: string): boolean {
  return desenler.some((d) => d.test(normal));
}

export function sinirKontrolu(mesaj: string, baglam: SinirBaglami): SinirSonucu {
  const normal = turkceNormalize(mesaj);

  // Sıra önemli: ED sayı kısıtı en dıştaki koruma, çünkü kullanıcı en kırılgan durumda.
  if (baglam.edModu && eslesir(ED_SAYI_DESENLERI, normal)) {
    return {
      izin: false,
      kategori: 'ed_sayi',
      cevap:
        'Bu konuyu sayılarla konuşmuyoruz. İstersen bugün nasıl hissettiğini, tabağının nasıl ' +
        'göründüğünü ya da antrenmanı konuşalım. Sayıları görmek istersen ayarlardan açabilirsin.',
    };
  }

  if (eslesir(ASIRI_HEDEF_DESENLERI, normal)) {
    return { izin: false, kategori: 'asiri_hedef', cevap: metinler.koc.asiriHedefRed };
  }

  if (eslesir(DOZ_DESENLERI, normal)) {
    return { izin: false, kategori: 'doz', cevap: metinler.koc.dozVermez };
  }

  if (eslesir(TANI_DESENLERI, normal)) {
    return { izin: false, kategori: 'tani', cevap: metinler.koc.tanıKoymaz };
  }

  if (eslesir(KAPSAM_DISI_DESENLERI, normal)) {
    const kapsamIci = KAPSAM_ICI_ANAHTARLAR.some((a) => normal.includes(a));
    if (!kapsamIci) {
      return { izin: false, kategori: 'kapsam_disi', cevap: metinler.koc.kapsamDisi };
    }
  }

  return IZIN_VERILDI;
}

// ---------------------------------------------------------------------------
// Bellek stratejisi
// ---------------------------------------------------------------------------

/** Kaba token tahmini: Türkçede ortalama ~3,3 karakter bir token. */
export function yaklasikToken(metin: string): number {
  return Math.ceil(metin.length / 3.3);
}

/**
 * Kalıcı profil özeti (~600 token). Her mesajda gönderilir; geçmişin tamamı gönderilmez.
 * Konuşma uzadıkça bu özet değişmez, maliyet sabit kalır.
 */
export function profilOzeti(profil: Profil): string {
  const k = profil.kisitlar;
  const h = profil.hedef_vektoru;

  const satirlar = [
    `Kullanıcı: ${profil.yas} yaşında, ${profil.cinsiyet}.`,
    `Antrenman yaşı: ${profil.antrenman_yasi}. Toparlanma skoru: ${profil.toparlanma_skoru}.`,
    `Haftada ${profil.gun_sayisi} gün, seans başına ${profil.seans_dakika} dakika, ortam: ${profil.ortam}.`,
    `Birincil hedef: ${h.birincil}${h.ikincil ? `, ikincil: ${h.ikincil}` : ''}.`,
    h.oncelikli_bolgeler.length > 0
      ? `Öncelikli bölgeler: ${h.oncelikli_bolgeler.join(', ')}.`
      : '',
    k.kontrendikasyonlar.length > 0
      ? `Sağlık kısıtları: ${k.kontrendikasyonlar.join(', ')}.`
      : 'Bildirilmiş sağlık kısıtı yok.',
    k.sakatliklar.length > 0
      ? `Ağrı bildirilen bölgeler: ${k.sakatliklar.map((s) => s.bolge).join(', ')}.`
      : '',
    `Ekipman: ${k.ekipman.length > 0 ? k.ekipman.join(', ') : 'yok, vücut ağırlığı'}.`,
    k.reddedilen_anahtarlar.length > 0
      ? `Yapmak istemedikleri: ${k.reddedilen_anahtarlar.join(', ')}.`
      : '',
    profil.ed_modu
      ? 'ED MODU AÇIK: bu kullanıcıyla kalori, kilo ve makro sayıları konuşulmaz.'
      : '',
  ];

  // ED modunda ölçü sayıları özete girmez.
  if (!profil.ed_modu) {
    satirlar.splice(1, 0, `Boy ${profil.boy_cm} cm, kilo ${profil.kilo_kg} kg.`);
  }

  return satirlar.filter((s) => s !== '').join('\n');
}

export interface KocMesaji {
  role: 'user' | 'assistant';
  content: string;
}

export interface BaglamGirdisi {
  ozet: string;
  gecmis: readonly KocMesaji[];
  aracVerisi?: Record<string, unknown>;
}

export interface Baglam {
  sistem: string;
  mesajlar: KocMesaji[];
  tahmini_token: number;
}

/** Bağlamda tutulan en fazla mesaj sayısı. Daha eskisi özete yedirilir. */
const SON_MESAJ_SAYISI = 10;

export function baglamKur(girdi: BaglamGirdisi): Baglam {
  const mesajlar = girdi.gecmis.slice(-SON_MESAJ_SAYISI).map((m) => ({ ...m }));

  if (girdi.aracVerisi && Object.keys(girdi.aracVerisi).length > 0) {
    mesajlar.push({
      role: 'assistant',
      content: `[araç verisi] ${JSON.stringify(girdi.aracVerisi)}`,
    });
  }

  const sistem = kocSistemMesaji({ ozet: girdi.ozet, edModu: girdi.ozet.includes('ED MODU') });
  const tahmini_token =
    yaklasikToken(sistem) + mesajlar.reduce((t, m) => t + yaklasikToken(m.content), 0);

  return { sistem, mesajlar, tahmini_token };
}

// ---------------------------------------------------------------------------
// Araçlar — spec bölüm 11
// ---------------------------------------------------------------------------

export interface AracTanimi {
  ad: string;
  aciklama: string;
  parametreler: Record<string, { tip: string; aciklama: string; zorunlu?: boolean }>;
  /** Yalnızca program_degistir yazar; diğerleri okur. */
  yazar?: boolean;
}

export const ARAC_TANIMLARI: AracTanimi[] = [
  {
    ad: 'profil_getir',
    aciklama:
      'Kullanıcının değerlendirme cevaplarını ve analiz çıktılarını getirir. Genel cevap vermek ' +
      'yerine kullanıcının kendi verisine bakmak için kullanılır.',
    parametreler: {},
  },
  {
    ad: 'antrenman_gecmisi',
    aciklama:
      'Son n seansı, verilen geri bildirimleri ve ağırlık ilerlemesini getirir. "Bench takıldı" ' +
      'gibi sorularda önce buna bakılır.',
    parametreler: { n: { tip: 'number', aciklama: 'Kaç seans geriye bakılacağı (1-30)' } },
  },
  {
    ad: 'beslenme_gecmisi',
    aciklama:
      'Son n günün kalori ve makro alımını, hedefe uyumu getirir. Hafta içi/hafta sonu farkı ' +
      'gibi örüntüler buradan çıkar.',
    parametreler: { n: { tip: 'number', aciklama: 'Kaç gün geriye bakılacağı (1-90)' } },
  },
  {
    ad: 'olcum_gecmisi',
    aciklama: 'Kilo, çevre ölçüleri ve vücut analizi çıktılarının zaman serisini getirir.',
    parametreler: {},
  },
  {
    ad: 'hareket_bilgisi',
    aciklama: 'Bir hareketin tekniğini, çalıştırdığı kasları ve muadillerini getirir.',
    parametreler: {
      hareket_id: { tip: 'string', aciklama: 'Hareket kimliği', zorunlu: true },
    },
  },
  {
    ad: 'besin_ara',
    aciklama:
      'Besin veritabanında arama yapar. Kalori ve makro değerleri BURADAN gelir; tahmin edilmez.',
    parametreler: { sorgu: { tip: 'string', aciklama: 'Aranacak yemek adı', zorunlu: true } },
  },
  {
    ad: 'program_degistir',
    aciklama:
      'Hareket değiştirir, gün kaydırır veya hacim ayarlar. Kullanıcı açıkça istemeden çağrılmaz.',
    parametreler: {
      islem: {
        tip: 'string',
        aciklama: 'hareket_degistir | gun_kaydir | hacim_ayarla',
        zorunlu: true,
      },
      hareket_id: { tip: 'string', aciklama: 'İlgili hareket' },
      yeni_hareket_id: { tip: 'string', aciklama: 'Yeni hareket (değiştirmede)' },
    },
    yazar: true,
  },
];

export interface SistemMesajiGirdisi {
  ozet: string;
  edModu: boolean;
  /** Kullanıcının dili; verilmezse Türkçe. */
  dil?: string;
}

/**
 * Sistem mesajı, kullanıcının dilinde.
 *
 * İlk hâli modele koşulsuz "Türkçe konuş" diyordu; uygulamayı İngilizce kullanan kişi
 * İngilizce soruyor, koç Türkçe cevap veriyordu. Ekranların tamamı çevrilmişken sohbetin
 * çevrilmemiş kalması, yarı çevrilmiş bir üründen daha görünür bir kusur.
 *
 * **Sert sınırlar iki dilde de birebir aynı.** Tanı yasağı, doz yasağı ve "sayıyı araçtan
 * al" kuralı üslup değil sağlık kuralı; çeviride eksilemez. Test bunu sayarak koruyor.
 */
/** Sistem mesajı satır ayırıcısı. */
const SATIR_SONU = String.fromCharCode(10);

const SISTEM_METINLERI = {
  tr: {
    kimlik: 'Sen Swiip koçusun. Türkçe, kısa ve somut konuşursun.',
    profilBasligi: 'KULLANICI PROFİLİ:',
    sinirBasligi: 'SERT SINIRLAR:',
    sinirlar: [
      '1. Tanı koyamazsın. Ağrı, semptom veya hastalık sorusunda hekime yönlendirirsin.',
      '2. İlaç ve takviye dozu veremezsin.',
      '3. Aşırı kısıtlayıcı hedefi onaylamazsın; gerekçesiyle reddeder, güvenli alternatif sunarsın.',
      '4. Fitness ve beslenme kapsamı dışına çıkmazsın.',
      '5. Kalori ve makro değerlerini tahmin etmezsin; besin_ara aracıyla veritabanından alırsın.',
    ],
    bicimBasligi: 'ÇALIŞMA BİÇİMİ:',
    bicim: [
      '- Genel tavsiye verme. Önce araç çağır, kullanıcının kendi verisine bak, sonra konuş.',
      '- Rakam söylüyorsan o rakam araç çıktısından gelmiş olmalı.',
      '- Övgü ve motivasyon klişesi kullanma. Kullanıcı ne olduğunu ve ne yapacağını bilsin.',
      '- "Kişiselleştirilmiş" kelimesini kullanma.',
    ],
    edBasligi: 'ED MODU AÇIK:',
    ed: [
      '- Kalori, kilo, makro ve porsiyon gramı gibi hiçbir sayı kullanma.',
      '- Kilo hedefi tartışma. Beslenmeyi el ölçüsüyle anlat.',
    ],
  },
  en: {
    kimlik: 'You are the Swiip coach. You speak English, briefly and concretely.',
    profilBasligi: 'USER PROFILE:',
    sinirBasligi: 'HARD LIMITS:',
    sinirlar: [
      '1. You cannot diagnose. For pain, symptoms or illness, refer the user to a doctor.',
      '2. You cannot give medication or supplement doses.',
      '3. You do not endorse over-restrictive goals; you refuse with a reason and offer a safe alternative.',
      '4. You stay within fitness and nutrition.',
      '5. You never estimate calories or macros; you take them from the database via the besin_ara tool.',
    ],
    bicimBasligi: 'HOW YOU WORK:',
    bicim: [
      '- Do not give generic advice. Call a tool, look at the user data, then speak.',
      '- If you state a number, it must have come from a tool result.',
      '- No praise or motivational cliches. The user should know what happened and what to do.',
      '- Never use the word "personalized".',
    ],
    edBasligi: 'ED MODE ON:',
    ed: [
      '- Use no numbers at all: no calories, weight, macros or portion grams.',
      '- Do not discuss a weight target. Describe nutrition in hand measures.',
    ],
  },
} as const;

export function kocSistemMesaji(girdi: SistemMesajiGirdisi): string {
  const m = SISTEM_METINLERI[girdi.dil === 'en' ? 'en' : 'tr'];

  const satirlar = [
    m.kimlik,
    '',
    m.profilBasligi,
    girdi.ozet,
    '',
    m.sinirBasligi,
    ...m.sinirlar,
    '',
    m.bicimBasligi,
    ...m.bicim,
  ];

  if (girdi.edModu) {
    satirlar.push('', m.edBasligi, ...m.ed);
  }

  return satirlar.join(SATIR_SONU);
}
