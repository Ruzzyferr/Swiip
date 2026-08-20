import type { Profil } from '@made2fit/shared';

/**
 * Test veri kurucusu. Yalnızca testlerden kullanılır, üretim kodundan içe aktarılmaz.
 * Varsayılan: 30 yaşında, orta seviye, salonda haftada 4 gün çalışan bir kullanıcı.
 */
export function profilKur(uzat: Partial<Profil> = {}): Profil {
  const temel: Profil = {
    user_id: 'test-kullanici',
    locale: 'tr-TR',
    cinsiyet: 'erkek',
    yas: 30,
    boy_cm: 178,
    kilo_kg: 82,
    antrenman_yasi: 'orta',
    toparlanma_skoru: 0.8,
    uyku_saati: 7.5,
    stres_seviyesi: 4,
    aktivite_carpani: 1.37,
    gun_sayisi: 4,
    seans_dakika: 60,
    uygun_gunler: [],
    ortam: 'salon',
    kisitlar: {
      ekipman: [
        'barbell',
        'dumbbell',
        'duz_bench',
        'egimli_bench',
        'ayarlanabilir_bench',
        'squat_rack',
        'lat_pulldown',
        'kablo_makinesi',
        'leg_press',
        'barfiks_bari',
        'makine_gogus',
        'makine_hamstring',
        'makine_quadriceps',
        'makine_sirt',
        'makine_omuz',
        'makine_baldir',
      ],
      sakatliklar: [],
      kontrendikasyonlar: [],
      reddedilen_anahtarlar: [],
      kisitli_hacim_gruplari: [],
      kisitli_paternler: [],
      bas_ustu_yasak: false,
      zipla_yasak: false,
      gurultu_yasak: false,
      spotter_yok: true,
      kalabalik_salon: false,
      teknik_guveni: 4,
      eksenel_yuk_yasak: false,
    },
    hedef_vektoru: {
      birincil: 'kas_kazanimi',
      oncelikli_bolgeler: [],
      memnun_bolgeler: [],
    },
    ed_modu: false,
    kapi_durumu: {
      kapilar: [],
      kayit_engelli: false,
      program_engelli: false,
      sayilar_gizli: false,
      eksik_tarama: [],
    },
    bilinen_yukler: {},
    vucut_agirligi_kapasitesi: {},
  };

  return { ...temel, ...uzat };
}
