import type {
  AntrenmanYasi,
  Ekipman,
  HacimGrubu,
  Kisitlar,
  Kontrendikasyon,
  Patern,
  Sakatlik,
} from '@swiip/shared';
import { alan, dizi, metin, sayi, type Cevaplar } from '../cevaplar';
import { antrenmanYasiBelirle } from './olcumler';

/**
 * Kısıt derleme — hareket havuzunu daraltan her şey burada toplanır.
 * Muhafazakârlık ilkesi: bilgi eksikse kısıtlayıcı taraf seçilir.
 */

/** Ağrı bu seviyeden itibaren aktif sakatlık sayılır ve hacmi ×0,60 düşürür. */
export const AKTIF_AGRI_ESIGI = 4;

const EKIPMAN_HARITA: Record<string, Ekipman[]> = {
  'Barbell ve plaka': ['barbell'],
  Dumbbell: ['dumbbell'],
  Kettlebell: ['kettlebell'],
  'Leg press': ['leg_press'],
  'Hack squat': ['hack_squat'],
  'Lat pulldown': ['lat_pulldown'],
  'Kablo makinesi': ['kablo_makinesi'],
  'Smith makinesi': ['smith_makinesi'],
  'Barfiks barı': ['barfiks_bari'],
  'Dip barı': ['dip_bari'],
  'Düz bench': ['duz_bench'],
  'Eğimli bench': ['egimli_bench'],
  'Ayarlanabilir bench': ['duz_bench', 'egimli_bench', 'ayarlanabilir_bench'],
  'Direnç bandı': ['direnc_bandi'],
  'Koşu bandı': ['kosu_bandi'],
  'Sabit bisiklet': ['sabit_bisiklet'],
  'Kürek makinesi': ['kurek_makinesi'],
  Merdiven: ['merdiven'],
  'TRX / askı': ['trx'],
  'Squat rack': ['squat_rack'],
  'Göğüs presi makinesi': ['makine_gogus'],
  'Sırt makinesi': ['makine_sirt'],
  'Omuz presi makinesi': ['makine_omuz'],
  'Bacak ekstansiyon / curl makinesi': ['makine_quadriceps', 'makine_hamstring'],
  'Baldır makinesi': ['makine_baldir'],
  'Abduktor / adduktor makinesi': ['makine_abduktor'],
  'Preacher bench': ['preacher_bench'],
  'Roma sandalyesi / hiperekstansiyon': ['roman_chair'],
  'Plyo box': ['plyo_box'],
  'Hiçbiri, vücut ağırlığı': [],
};

/** Zincir salonlarda standart makine seti; kullanıcı arayüzde tikini kaldırabilir. */
const TAM_DONANIM: Ekipman[] = [
  'barbell',
  'dumbbell',
  'kettlebell',
  'leg_press',
  'hack_squat',
  'lat_pulldown',
  'kablo_makinesi',
  'smith_makinesi',
  'barfiks_bari',
  'dip_bari',
  'duz_bench',
  'egimli_bench',
  'ayarlanabilir_bench',
  'squat_rack',
  'kosu_bandi',
  'sabit_bisiklet',
  'kurek_makinesi',
  'makine_gogus',
  'makine_sirt',
  'makine_omuz',
  'makine_quadriceps',
  'makine_hamstring',
  'makine_baldir',
  'makine_abduktor',
  'preacher_bench',
  'roman_chair',
];

const BAGIMSIZ_SALON: Ekipman[] = [
  'barbell',
  'dumbbell',
  'lat_pulldown',
  'kablo_makinesi',
  'barfiks_bari',
  'duz_bench',
  'egimli_bench',
  'squat_rack',
  'leg_press',
  'kosu_bandi',
];

const CEKIRDEK_SET: Ekipman[] = [
  'barbell',
  'dumbbell',
  'duz_bench',
  'lat_pulldown',
  'barfiks_bari',
];

/**
 * Salon zincirine göre ekipman ön doldurma (F2.5).
 * Bu bir varsayımdır, kısıt değil — kullanıcı onaylayana kadar bağlayıcı olmaz.
 */
export function salonOnDoldurma(salon: string | undefined): Ekipman[] {
  switch (salon) {
    case 'MACFit':
    case 'Fit In Time':
    case 'Sportium':
      return [...TAM_DONANIM];
    case 'B-Fit':
    case 'Üniversite / kurum salonu':
    case 'Bağımsız salon':
      return [...BAGIMSIZ_SALON];
    default:
      return [...CEKIRDEK_SET];
  }
}

/** Vücut haritası bölgesi -> kontrendikasyon kodları. */
const BOLGE_KONTRENDIKASYON: Record<string, Kontrendikasyon[]> = {
  boyun: ['boyun_fitigi'],
  omuz_sag: ['omuz_sikismasi', 'omuz_instabilite'],
  omuz_sol: ['omuz_sikismasi', 'omuz_instabilite'],
  dirsek_sag: ['dirsek_tendinit'],
  dirsek_sol: ['dirsek_tendinit'],
  bilek_sag: ['bilek_agrisi'],
  bilek_sol: ['bilek_agrisi'],
  ust_sirt: ['boyun_fitigi'],
  bel: ['bel_fitigi'],
  kalca_sag: ['kalca_impingement'],
  kalca_sol: ['kalca_impingement'],
  diz_sag: ['diz_menisküs', 'diz_patellofemoral'],
  diz_sol: ['diz_menisküs', 'diz_patellofemoral'],
  ayak_bilegi_sag: ['ayak_bilegi_kisitli'],
  ayak_bilegi_sol: ['ayak_bilegi_kisitli'],
};

/** Aktif sakatlık bölgesi -> hacmi kısılacak gruplar. */
const BOLGE_HACIM_GRUBU: Record<string, HacimGrubu[]> = {
  omuz_sag: ['omuz', 'gogus'],
  omuz_sol: ['omuz', 'gogus'],
  dirsek_sag: ['triceps', 'biceps'],
  dirsek_sol: ['triceps', 'biceps'],
  bilek_sag: ['biceps', 'triceps'],
  bilek_sol: ['biceps', 'triceps'],
  bel: ['sirt', 'kalca', 'hamstring'],
  ust_sirt: ['sirt'],
  kalca_sag: ['kalca', 'hamstring'],
  kalca_sol: ['kalca', 'hamstring'],
  diz_sag: ['quadriceps', 'hamstring'],
  diz_sol: ['quadriceps', 'hamstring'],
  ayak_bilegi_sag: ['baldir', 'quadriceps'],
  ayak_bilegi_sol: ['baldir', 'quadriceps'],
  boyun: ['omuz'],
};

/** S12: ağrıyı artıran hareket -> kısıtlanan patern. */
const S12_PATERN: Record<string, Patern[]> = {
  'Öne eğilme': ['kalca_baskin'],
  'Geriye yaslanma': ['izolasyon'],
  'Ağırlık kaldırma': ['kalca_baskin'],
  'Baş üstü hareket': ['itme_dikey'],
  Çömelme: ['diz_baskin'],
  Dönme: ['rotasyon'],
  'Uzun oturma': [],
  'Koşma / zıplama': [],
  'Belli değil': [],
};

const T2_ANAHTAR: Record<string, string[]> = {
  Burpee: ['burpee'],
  Deadlift: ['deadlift', 'cekis'],
  Squat: ['squat'],
  Koşu: ['kosu', 'run'],
  'Ip atlama': ['ip-atlama', 'jump-rope'],
  'Baş üstü pres': ['omuz-presi', 'overhead'],
  Barfiks: ['barfiks', 'pull-up'],
  Yok: [],
  Diğer: [],
};

export function kisitlariDerle(cevaplar: Cevaplar): Kisitlar {
  const ekipman = ekipmaniDerle(cevaplar);
  const { sakatliklar, kontrendikasyonlar, kisitli_hacim_gruplari, kisitli_paternler, bayraklar } =
    sakatlikDerle(cevaplar);

  if (metin(cevaplar, 'S15') === 'Kontrolsüz / bilmiyorum') {
    kontrendikasyonlar.add('tansiyon_kontrolsuz');
    bayraklar.bas_ustu_yasak = true;
  }

  const gurultu = metin(cevaplar, 'E6');
  const ziplaYasak =
    gurultu === 'Var, zıplayamam' || gurultu === 'İkisi de' || bayraklar.zipla_yasak;
  const gurultuYasak = gurultu === 'Var, ağırlık bırakamam' || gurultu === 'İkisi de';

  const basUstuYasak = metin(cevaplar, 'E5a') === 'Hayır' || bayraklar.bas_ustu_yasak;

  const reddedilen = new Set<string>();
  for (const secim of dizi(cevaplar, 'T2')) {
    for (const anahtar of T2_ANAHTAR[secim] ?? []) reddedilen.add(anahtar);
  }

  const kalabalik = ['Sık sık beklerim', 'Sürekli kalabalık'].includes(metin(cevaplar, 'E4') ?? '');

  const kisitlar: Kisitlar = {
    ekipman,
    sakatliklar,
    kontrendikasyonlar: [...kontrendikasyonlar].sort(),
    reddedilen_anahtarlar: [...reddedilen].sort(),
    kisitli_hacim_gruplari: [...kisitli_hacim_gruplari].sort(),
    kisitli_paternler: [...kisitli_paternler].sort(),
    bas_ustu_yasak: basUstuYasak,
    zipla_yasak: ziplaYasak,
    gurultu_yasak: gurultuYasak,
    spotter_yok: (metin(cevaplar, 'E8') ?? 'Hayır') === 'Hayır',
    kalabalik_salon: kalabalik,
    teknik_guveni: teknikGuveni(cevaplar),
    eksenel_yuk_yasak: bayraklar.eksenel_yuk_yasak,
  };

  const dumbbellMax = alan(cevaplar, 'E7', 'max_kg');
  if (dumbbellMax !== undefined) kisitlar.dumbbell_max_kg = dumbbellMax;

  return kisitlar;
}

function ekipmaniDerle(cevaplar: Cevaplar): Ekipman[] {
  const set = new Set<Ekipman>();
  for (const secim of dizi(cevaplar, 'E3')) {
    for (const kod of EKIPMAN_HARITA[secim] ?? []) set.add(kod);
  }

  /**
   * E3 boşsa ve kullanıcı salonda çalışıyorsa standart donanım varsayılır.
   *
   * Boş ekipman listesi boş havuz demek: `ekipman_yok` kuralı KATALOĞUN TAMAMINI eliyor
   * ve program hiç üretilemiyor. Arayüz E3'ü salon seçildiğinde ön işaretliyor, ama
   * ön işaretleme bir arayüz kolaylığı; kullanıcı hepsini kaldırırsa ya da cevap eski
   * bir kayıttan gelirse çekirdek yine boş liste görüyordu.
   *
   * Ev ve açık havada yedek YOK — orada ekipman gerçekten olmayabilir ve vücut ağırlığı
   * havuzu zaten çalışıyor. Varsayım yalnızca doğru olduğu yerde yapılıyor.
   */
  if (set.size === 0) {
    const yer = metin(cevaplar, 'E1');
    if (yer === 'Spor salonu' || yer === 'Karma') return salonOnDoldurma(yer);
  }

  return [...set].sort();
}

interface SakatlikDerleme {
  sakatliklar: Sakatlik[];
  kontrendikasyonlar: Set<Kontrendikasyon>;
  kisitli_hacim_gruplari: Set<HacimGrubu>;
  kisitli_paternler: Set<Patern>;
  bayraklar: { bas_ustu_yasak: boolean; eksenel_yuk_yasak: boolean; zipla_yasak: boolean };
}

function sakatlikDerle(cevaplar: Cevaplar): SakatlikDerleme {
  const kontrendikasyonlar = new Set<Kontrendikasyon>();
  const kisitli_hacim_gruplari = new Set<HacimGrubu>();
  const kisitli_paternler = new Set<Patern>();
  const bayraklar = { bas_ustu_yasak: false, eksenel_yuk_yasak: false, zipla_yasak: false };
  const sakatliklar: Sakatlik[] = [];

  for (const bolge of dizi(cevaplar, 'S8')) {
    const kodlar = BOLGE_KONTRENDIKASYON[bolge] ?? [];
    kodlar.forEach((k) => kontrendikasyonlar.add(k));

    // Ağrı seviyesi bilinmiyorsa muhafazakâr davran: aktif say.
    const agri = sayi(cevaplar, `S11:${bolge}`) ?? sayi(cevaplar, 'S11') ?? AKTIF_AGRI_ESIGI;
    const aktif = agri >= AKTIF_AGRI_ESIGI;

    sakatliklar.push({ bolge, kontrendikasyonlar: kodlar, agri_seviyesi: agri, aktif });

    if (aktif) {
      for (const grup of BOLGE_HACIM_GRUBU[bolge] ?? []) kisitli_hacim_gruplari.add(grup);
      if (bolge === 'bel' || bolge === 'ust_sirt' || bolge === 'boyun') {
        bayraklar.eksenel_yuk_yasak = true;
      }
      if (bolge === 'boyun') bayraklar.bas_ustu_yasak = true;
    }

    for (const tetik of dizi(cevaplar, `S12:${bolge}`)) {
      for (const patern of S12_PATERN[tetik] ?? []) kisitli_paternler.add(patern);
      if (tetik === 'Baş üstü hareket') bayraklar.bas_ustu_yasak = true;
      if (tetik === 'Ağırlık kaldırma') bayraklar.eksenel_yuk_yasak = true;
      if (tetik === 'Koşma / zıplama') bayraklar.zipla_yasak = true;
    }
  }

  for (const fitik of dizi(cevaplar, 'S17')) {
    if (fitik === 'Bel fıtığı') {
      kontrendikasyonlar.add('bel_fitigi');
      bayraklar.eksenel_yuk_yasak = true;
    }
    /**
     * Osteoporoz uzun süre SORULUYOR ama HİÇBİR ŞEY YAPMIYORDU.
     *
     * Eski S4'te bir şıktı, `drives: durum_bazli_dallanma` yazıyordu ve öyle bir
     * dallanma yoktu: kullanıcı işaretliyor, program değişmiyordu. Oysa kemik
     * yoğunluğu düşükken omurgaya dikey yük ve yüklü fleksiyon vertebral kompresyon
     * kırığı riskidir — bel fıtığından daha sert bir kısıt, daha yumuşak değil.
     *
     * Soru silinmedi, S17'ye taşındı ve bağlandı. Kural yazmadan sormak, kullanıcıya
     * dinlendiği yanılgısını veriyor.
     */
    if (fitik === 'Osteoporoz / kemik erimesi') {
      kontrendikasyonlar.add('bel_fitigi');
      bayraklar.eksenel_yuk_yasak = true;
      kisitli_paternler.add('kalca_baskin');
    }
    if (fitik === 'Boyun fıtığı') {
      kontrendikasyonlar.add('boyun_fitigi');
      bayraklar.eksenel_yuk_yasak = true;
      bayraklar.bas_ustu_yasak = true;
    }
    if (fitik === 'Kasık fıtığı') {
      kontrendikasyonlar.add('kalca_impingement');
      bayraklar.eksenel_yuk_yasak = true;
    }
  }

  return { sakatliklar, kontrendikasyonlar, kisitli_hacim_gruplari, kisitli_paternler, bayraklar };
}

/**
 * Teknik güveni (1-5).
 *
 * A8 artık beş ayrı 1-5 skalası değil, tek çoklu seçim: "bu hareketleri tekniğine
 * güvenerek yapabiliyor musun?". Beş skala beş ayrı ekran demekti ve `CLAUDE.md`'nin
 * "ekran başına tek ölçek" kuralını tek soruda beş kez kullanıyordu.
 *
 * A8 CEVAPSIZ ise varsayılan antrenman yaşından türer — eskiden sabit 2.5'ti ve
 * `DUSUK_GUVEN_ESIGI` de tam 2.5, karşılaştırma `<=`. Sonuç: A8'i görmeyen HERKES
 * teknik zorluk tavanı 3'e düşüyordu; barbell squat (4), omuz presi (4) ve deadlift (5)
 * havuzdan siliniyordu. A8 değerlendirme akışından çıkınca bu, beş yıllık kullanıcıya
 * yeni başlayan programı çıkarmak anlamına gelirdi.
 *
 * Deadlift hiçbir varsayılanla açılmıyor: zorluk 5 yalnızca açık beyanla geliyor.
 * "Sağlıkta muhafazakâr ol" korunuyor, ama deneyim yok sayılmıyor.
 */
const A8_ESKI_HAREKETLER = ['Squat', 'Deadlift', 'Bench press', 'Omuz presi', 'Barfiks'];
const A8_HAREKET_SAYISI = 5;

const YASA_GORE_GUVEN: Record<AntrenmanYasi, number> = {
  yeni: 2,
  erken: 2.5,
  orta: 2.5,
  ileri: 3.5,
  kidemli: 3.5,
};

function teknikGuveni(cevaplar: Cevaplar): number {
  const secilenler = dizi(cevaplar, 'A8').filter((s) => s !== 'Hiçbiri');
  if (secilenler.length > 0) {
    const oran = Math.min(secilenler.length, A8_HAREKET_SAYISI) / A8_HAREKET_SAYISI;
    return Math.round((1 + 4 * oran) * 100) / 100;
  }
  if (dizi(cevaplar, 'A8').includes('Hiçbiri')) return 1;

  // Eski kayıtlar: A8 beş ayrı skala olarak cevaplanmış olabilir.
  const puanlar = A8_ESKI_HAREKETLER.map((h) => sayi(cevaplar, `A8:${h}`)).filter(
    (p): p is number => p !== undefined,
  );
  if (puanlar.length > 0) {
    return Math.round((puanlar.reduce((a, b) => a + b, 0) / puanlar.length) * 100) / 100;
  }
  const tek = sayi(cevaplar, 'A8');
  if (typeof tek === 'number') return tek;

  return YASA_GORE_GUVEN[antrenmanYasiBelirle(cevaplar)];
}
