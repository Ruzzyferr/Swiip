import type { Cinsiyet, HacimGrubu, Hedef, HedefVektoru, Ortam, Profil } from '@swiip/shared';
import { alan, dizi, metin, sayi, type Cevaplar } from '../cevaplar';
import { kapilariDegerlendir, yasHesapla, type KapiSecenekleri } from '../kapilar/kapilar';
import { epley1rm } from '../yuk/tahmin';
import { kisitlariDerle } from './kisitlar';
import { aktiviteCarpani, antrenmanYasiBelirle, toparlanmaSkoru } from './olcumler';
import { uygunGunler } from '../takvim/takvim';

/**
 * Değerlendirme cevaplarını yapılandırılmış profile çevirir (F2.10).
 * Motorun tek girdisi budur; cevaplara motorun başka hiçbir yeri dokunmaz.
 */

export interface ProfilSecenekleri extends Omit<KapiSecenekleri, 'bugun'> {
  bugun: Date;
  userId: string;
  locale?: string;
}

const HEDEF_HARITA: Record<string, Hedef> = {
  'Yağ kaybı': 'yag_kaybi',
  'Kas kazanımı': 'kas_kazanimi',
  'Güç artışı': 'guc_artisi',
  Dayanıklılık: 'dayaniklilik',
  'Genel sağlık': 'genel_saglik',
  'Sakatlık sonrası dönüş': 'sakatlik_donusu',
  'Spora özel performans': 'spora_ozel',
  'Duruş ve ağrı': 'durus_agri',
};

const ORTAM_HARITA: Record<string, Ortam> = {
  'Spor salonu': 'salon',
  Ev: 'ev',
  'Açık hava': 'acik_alan',
  Karma: 'ev_ve_salon',
};

/** H6/H7 vücut haritası bölgesi -> hacim grupları. */
const BOLGE_HACIM: Record<string, HacimGrubu[]> = {
  gogus: ['gogus'],
  sirt: ['sirt'],
  omuz: ['omuz'],
  kol: ['biceps', 'triceps'],
  karin: ['karin'],
  kalca: ['kalca'],
  bacak_on: ['quadriceps'],
  bacak_arka: ['hamstring'],
  baldir: ['baldir'],
};

const UYKU_SAATI: Record<string, number> = {
  '5 saatten az': 4.5,
  '5-6 saat': 5.5,
  '6-7 saat': 6.5,
  '7-8 saat': 7.5,
  '8 saatten fazla': 8.5,
};

/** A5/A6 lift adı -> kanonik hareket id'si. */
const LIFT_HAREKET: Record<string, string> = {
  Squat: 'barbell-squat',
  'Bench press': 'barbell-bench-press',
  Deadlift: 'barbell-deadlift',
  'Omuz presi': 'barbell-omuz-presi',
};

export function profilDerle(cevaplar: Cevaplar, secenekler: ProfilSecenekleri): Profil {
  const kapiSecenekleri: KapiSecenekleri = { bugun: secenekler.bugun };
  if (secenekler.doktorOnayiVar !== undefined) {
    kapiSecenekleri.doktorOnayiVar = secenekler.doktorOnayiVar;
  }
  if (secenekler.kullaniciSayilariActi !== undefined) {
    kapiSecenekleri.kullaniciSayilariActi = secenekler.kullaniciSayilariActi;
  }
  const kapi_durumu = kapilariDegerlendir(cevaplar, kapiSecenekleri);

  const yas = yasHesapla(metin(cevaplar, 'K1'), secenekler.bugun) ?? 30;
  const gun_sayisi = gunSayisi(cevaplar);
  const antrenman_yasi = antrenmanYasiBelirle(cevaplar);

  const profil: Profil = {
    user_id: secenekler.userId,
    locale: secenekler.locale ?? 'tr-TR',
    cinsiyet: cinsiyetBelirle(cevaplar),
    yas,
    boy_cm: sayi(cevaplar, 'K3') ?? 170,
    kilo_kg: sayi(cevaplar, 'K4') ?? 70,
    antrenman_yasi,
    toparlanma_skoru: toparlanmaSkoru(cevaplar, yas),
    uyku_saati: UYKU_SAATI[metin(cevaplar, 'Y1') ?? ''] ?? 6.5,
    stres_seviyesi: sayi(cevaplar, 'Y6') ?? 5,
    aktivite_carpani: aktiviteCarpani(cevaplar, gun_sayisi),
    gun_sayisi,
    seans_dakika: seansDakika(cevaplar),
    uygun_gunler: uygunGunler(cevaplar),
    ortam: ORTAM_HARITA[metin(cevaplar, 'E1') ?? ''] ?? 'salon',
    kisitlar: kisitlariDerle(cevaplar),
    hedef_vektoru: hedefVektoruDerle(cevaplar),
    ed_modu: kapi_durumu.sayilar_gizli,
    kapi_durumu,
    bilinen_yukler: bilinenYukleriDerle(cevaplar),
    vucut_agirligi_kapasitesi: vucutAgirligiKapasitesi(cevaplar),
  };

  const yagOrani = sayi(cevaplar, 'F2');
  if (yagOrani !== undefined) profil.vucut_yag_orani = yagOrani;

  return profil;
}

function cinsiyetBelirle(cevaplar: Cevaplar): Cinsiyet {
  return metin(cevaplar, 'K2') === 'Kadın' ? 'kadin' : 'erkek';
}

/** "4 gün" -> 4. Cevapsızsa muhafazakâr 3 gün. */
function gunSayisi(cevaplar: Cevaplar): number {
  const ham = metin(cevaplar, 'Z1');
  const eslesme = ham?.match(/\d+/);
  return eslesme ? Number(eslesme[0]) : 3;
}

/** "90 dakika ve üzeri" -> 90. Cevapsızsa 45 dakika. */
function seansDakika(cevaplar: Cevaplar): number {
  const ham = metin(cevaplar, 'Z2');
  const eslesme = ham?.match(/\d+/);
  return eslesme ? Number(eslesme[0]) : 45;
}

function bolgeleriHacimGrubunaCevir(bolgeler: string[]): HacimGrubu[] {
  const set = new Set<HacimGrubu>();
  for (const bolge of bolgeler) {
    for (const grup of BOLGE_HACIM[bolge] ?? []) set.add(grup);
  }
  return [...set].sort();
}

function hedefVektoruDerle(cevaplar: Cevaplar): HedefVektoru {
  const vektor: HedefVektoru = {
    birincil: HEDEF_HARITA[metin(cevaplar, 'H1') ?? ''] ?? 'genel_saglik',
    oncelikli_bolgeler: bolgeleriHacimGrubunaCevir(dizi(cevaplar, 'H6')),
    memnun_bolgeler: bolgeleriHacimGrubunaCevir(dizi(cevaplar, 'H7')),
  };

  const ikincil = HEDEF_HARITA[metin(cevaplar, 'H2') ?? ''];
  if (ikincil) vektor.ikincil = ikincil;

  const hedefKilo = sayi(cevaplar, 'H3');
  if (hedefKilo !== undefined) vektor.hedef_kilo_kg = hedefKilo;

  const hedefTarih = metin(cevaplar, 'H4a');
  if (hedefTarih) vektor.hedef_tarih = hedefTarih;

  const aylik = sayi(cevaplar, 'H10');
  if (aylik !== undefined) vektor.aylik_beklenti_kg = aylik;

  return vektor;
}

function bilinenYukleriDerle(cevaplar: Cevaplar): Record<string, number> {
  const yukler: Record<string, number> = {};

  for (const lift of Object.keys(LIFT_HAREKET).sort()) {
    const hareketId = LIFT_HAREKET[lift]!;
    for (const soru of ['A5', 'A6']) {
      const kg = alan(cevaplar, `${soru}:${lift}`, 'kg');
      const tekrar = alan(cevaplar, `${soru}:${lift}`, 'tekrar');
      if (kg !== undefined && tekrar !== undefined) {
        const e1rm = epley1rm(kg, tekrar);
        if (e1rm > 0) {
          yukler[hareketId] = e1rm;
          break; // A5 varsa A6'ya bakılmaz
        }
      }
    }
  }
  return yukler;
}

function vucutAgirligiKapasitesi(cevaplar: Cevaplar): Profil['vucut_agirligi_kapasitesi'] {
  const kapasite: Profil['vucut_agirligi_kapasitesi'] = {};
  const sinav = alan(cevaplar, 'A7', 'sinav_adet');
  const barfiks = alan(cevaplar, 'A7', 'barfiks_adet');
  const plank = alan(cevaplar, 'A7', 'plank_saniye');
  if (sinav !== undefined) kapasite.sinav = sinav;
  if (barfiks !== undefined) kapasite.barfiks = barfiks;
  if (plank !== undefined) kapasite.plank_saniye = plank;
  return kapasite;
}
