import type { Profil } from '@swiip/shared';

/**
 * Kesirli set hatasini ureten GERCEK profil (persona kosusu, Burak).
 *
 * 41 yas, 5-6 saat uyku, 8/10 stres — toparlanma 0,46. Sentetik profillerle 16 bin
 * kombinasyon denendi ve hicbiri kesir uretmedi: kesir yalnizca butcesi tek sayiya
 * denk gelen bir grubun ikincil kas dusumuyle yarimlandigi ve havuzun daralttigi
 * durumda doguyor. Bu yuzden profil oldugu gibi saklaniyor.
 */
export const TOPARLANMASI_DUSUK_PROFIL = {
  yas: 41,
  ortam: 'ev_ve_salon',
  boy_cm: 183,
  locale: 'tr-TR',
  ed_modu: false,
  kilo_kg: 96,
  user_id: 'ornek-toparlanmasi-dusuk',
  cinsiyet: 'erkek',
  kisitlar: {
    ekipman: [
      'ayarlanabilir_bench',
      'barbell',
      'barfiks_bari',
      'dip_bari',
      'direnc_bandi',
      'dumbbell',
      'duz_bench',
      'egimli_bench',
      'kablo_makinesi',
      'kettlebell',
      'kosu_bandi',
      'lat_pulldown',
      'leg_press',
      'makine_hamstring',
      'makine_quadriceps',
      'sabit_bisiklet',
      'squat_rack',
      'trx',
    ],
    sakatliklar: [
      {
        aktif: true,
        bolge: 'omuz_sol',
        agri_seviyesi: 5,
        kontrendikasyonlar: ['omuz_sikismasi', 'omuz_instabilite'],
      },
    ],
    spotter_yok: true,
    zipla_yasak: false,
    gurultu_yasak: false,
    teknik_guveni: 3,
    bas_ustu_yasak: false,
    dumbbell_max_kg: 30,
    kalabalik_salon: false,
    eksenel_yuk_yasak: false,
    kisitli_paternler: ['kalca_baskin'],
    kontrendikasyonlar: ['omuz_instabilite', 'omuz_sikismasi'],
    reddedilen_anahtarlar: [],
    kisitli_hacim_gruplari: ['gogus', 'omuz'],
  },
  gun_sayisi: 4,
  uyku_saati: 5.5,
  kapi_durumu: {
    kapilar: [],
    eksik_tarama: [],
    kayit_engelli: false,
    sayilar_gizli: false,
    program_engelli: false,
  },
  seans_dakika: 60,
  uygun_gunler: [1, 3, 5, 6],
  hedef_vektoru: {
    ikincil: 'guc_artisi',
    birincil: 'yag_kaybi',
    hedef_tarih: '2026-12-20',
    hedef_kilo_kg: 86,
    memnun_bolgeler: ['quadriceps'],
    aylik_beklenti_kg: 2,
    oncelikli_bolgeler: ['gogus', 'karin', 'sirt'],
  },
  antrenman_yasi: 'orta',
  bilinen_yukler: {},
  stres_seviyesi: 8,
  vucut_yag_orani: 27,
  aktivite_carpani: 1.51,
  toparlanma_skoru: 0.461,
  vucut_agirligi_kapasitesi: {
    sinav: 20,
    barfiks: 4,
    plank_saniye: 90,
  },
} as unknown as Profil;
