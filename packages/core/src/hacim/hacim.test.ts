import { describe, expect, it } from 'vitest';
import { HACIM_GRUPLARI, tr, type Profil } from '@made2fit/shared';
import { hacimButcesiHesapla, seansBasinaSet, TABAN_HACIM } from './hacim';

function profilKur(uzat: Partial<Profil> = {}): Profil {
  const temel: Profil = {
    user_id: 'u1',
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
      ekipman: ['barbell', 'dumbbell'],
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

describe('seansBasinaSet', () => {
  it('60 dakikalık seansta yaklaşık 19 çalışma seti sığar', () => {
    expect(seansBasinaSet(60)).toBe(19);
  });

  it('süre uzadıkça set sayısı artar', () => {
    expect(seansBasinaSet(90)).toBeGreaterThan(seansBasinaSet(60));
    expect(seansBasinaSet(45)).toBeLessThan(seansBasinaSet(60));
  });

  it('çok kısa seansta bile en az 6 set planlanır', () => {
    expect(seansBasinaSet(20)).toBeGreaterThanOrEqual(6);
  });
});

describe('hacimButcesiHesapla — taban', () => {
  it.each([
    ['yeni', 8],
    ['erken', 10],
    ['orta', 12],
    ['ileri', 14],
    ['kidemli', 14],
  ] as const)('%s seviyesi %i setten başlar', (yas, beklenen) => {
    expect(TABAN_HACIM[yas].baslangic).toBe(beklenen);
  });

  it('her hacim grubu için bir bütçe üretir', () => {
    const { butce } = hacimButcesiHesapla(profilKur());

    for (const grup of HACIM_GRUPLARI) {
      expect(butce[grup]).toBeGreaterThan(0);
    }
  });

  it('hiçbir grup seviyenin tavanını aşmaz', () => {
    const { butce } = hacimButcesiHesapla(
      profilKur({
        hedef_vektoru: {
          birincil: 'kas_kazanimi',
          oncelikli_bolgeler: ['gogus'],
          memnun_bolgeler: [],
        },
      }),
    );

    expect(butce.gogus).toBeLessThanOrEqual(TABAN_HACIM.orta.tavan);
  });
});

describe('hacimButcesiHesapla — çarpımsal düzeltmeler', () => {
  it('6 saatten az uyuyanda hacim düşer', () => {
    const normal = hacimButcesiHesapla(profilKur()).butce.gogus;
    const azUyku = hacimButcesiHesapla(profilKur({ uyku_saati: 5.5 })).butce.gogus;

    expect(azUyku).toBeLessThan(normal);
  });

  it('yüksek streste hacim düşer', () => {
    const normal = hacimButcesiHesapla(profilKur()).butce.gogus;
    const stresli = hacimButcesiHesapla(profilKur({ stres_seviyesi: 9 })).butce.gogus;

    expect(stresli).toBeLessThan(normal);
  });

  it('50 yaş üstünde hacim düşer', () => {
    const genc = hacimButcesiHesapla(profilKur({ yas: 30 })).butce.gogus;
    const olgun = hacimButcesiHesapla(profilKur({ yas: 55 })).butce.gogus;

    expect(olgun).toBeLessThan(genc);
  });

  it('öncelikli bölge diğerlerinden daha fazla set alır', () => {
    const { butce } = hacimButcesiHesapla(
      profilKur({
        hedef_vektoru: {
          birincil: 'kas_kazanimi',
          oncelikli_bolgeler: ['gogus'],
          memnun_bolgeler: [],
        },
      }),
    );

    expect(butce.gogus).toBeGreaterThan(butce.sirt);
  });

  it('aktif sakatlık bölgesinin hacmi belirgin şekilde kısılır', () => {
    const { butce } = hacimButcesiHesapla(
      profilKur({
        kisitlar: { ...profilKur().kisitlar, kisitli_hacim_gruplari: ['quadriceps'] },
      }),
    );

    expect(butce.quadriceps).toBeLessThan(butce.gogus * 0.7);
  });

  it('yüzde 20 üstü kalori açığında hacim düşer', () => {
    const normal = hacimButcesiHesapla(profilKur()).butce.gogus;
    const acikta = hacimButcesiHesapla(profilKur(), { kaloriAcigiYuzdesi: 25 }).butce.gogus;

    expect(acikta).toBeLessThan(normal);
  });

  it('düzeltmeler çarpımsal birikir', () => {
    const tek = hacimButcesiHesapla(profilKur({ uyku_saati: 5 })).butce.gogus;
    const cift = hacimButcesiHesapla(profilKur({ uyku_saati: 5, stres_seviyesi: 9 })).butce.gogus;

    expect(cift).toBeLessThan(tek);
  });

  it('memnun olunan bölge koruma hacminde tutulur', () => {
    const { butce } = hacimButcesiHesapla(
      profilKur({
        hedef_vektoru: {
          birincil: 'kas_kazanimi',
          oncelikli_bolgeler: [],
          memnun_bolgeler: ['baldir'],
        },
      }),
    );

    expect(butce.baldir).toBeLessThan(butce.gogus);
  });
});

describe('hacimButcesiHesapla — kapasite sınırı', () => {
  it('haftalık toplam set, seans kapasitesini aşmaz', () => {
    const profil = profilKur({ gun_sayisi: 3, seans_dakika: 45 });
    const { butce, kapasite } = hacimButcesiHesapla(profil);

    const toplam = HACIM_GRUPLARI.reduce((t, g) => t + butce[g], 0);
    expect(toplam).toBeLessThanOrEqual(kapasite.sayilan_set);
  });

  it('gün sayısı arttıkça toplam hacim artar', () => {
    const uc = hacimButcesiHesapla(profilKur({ gun_sayisi: 3 }));
    const alti = hacimButcesiHesapla(profilKur({ gun_sayisi: 6 }));

    const toplamUc = HACIM_GRUPLARI.reduce((t, g) => t + uc.butce[g], 0);
    const toplamAlti = HACIM_GRUPLARI.reduce((t, g) => t + alti.butce[g], 0);
    expect(toplamAlti).toBeGreaterThan(toplamUc);
  });

  it('kapasite kısıtında bile hiçbir grup sıfırlanmaz', () => {
    const { butce } = hacimButcesiHesapla(profilKur({ gun_sayisi: 2, seans_dakika: 30 }));

    for (const grup of HACIM_GRUPLARI) {
      expect(butce[grup]).toBeGreaterThanOrEqual(2);
    }
  });

  it('kapasite daralınca öncelikli bölge önceliğini korur', () => {
    const { butce } = hacimButcesiHesapla(
      profilKur({
        gun_sayisi: 2,
        seans_dakika: 30,
        hedef_vektoru: {
          birincil: 'kas_kazanimi',
          oncelikli_bolgeler: ['sirt'],
          memnun_bolgeler: [],
        },
      }),
    );

    expect(butce.sirt).toBeGreaterThanOrEqual(butce.gogus);
  });
});

describe('hacimButcesiHesapla — karar izi', () => {
  it('her düzeltme için bir kural kaydeder', () => {
    const { kararlar } = hacimButcesiHesapla(
      profilKur({ uyku_saati: 5, stres_seviyesi: 9, yas: 55 }),
    );

    const kurallar = kararlar.flatMap((k) => k.kurallar);
    expect(kurallar).toContain('uyku_kisa');
    expect(kurallar).toContain('stres_yuksek');
    expect(kurallar).toContain('yas_50_ustu');
  });

  it('kararın girdisi hangi soruya dayandığını söyler', () => {
    const { kararlar } = hacimButcesiHesapla(profilKur({ uyku_saati: 5 }));
    const karar = kararlar.find((k) => k.kurallar.includes('uyku_kisa'))!;

    expect(karar.girdiler.map((g) => g.soru_id)).toContain('Y1');
    expect(karar.aciklama_tr.length).toBeGreaterThan(10);
  });

  it('düzeltme yoksa gereksiz karar üretmez', () => {
    const { kararlar } = hacimButcesiHesapla(profilKur());

    expect(kararlar.every((k) => k.kurallar.length > 0)).toBe(true);
  });

  it('aynı profil aynı bütçeyi üretir', () => {
    const p = profilKur({ uyku_saati: 5, stres_seviyesi: 9 });
    expect(JSON.stringify(hacimButcesiHesapla(p))).toBe(JSON.stringify(hacimButcesiHesapla(p)));
  });
});

/**
 * Motorun ürettiği her hacim kuralının sözlükte karşılığı olmalı.
 *
 * Yeni kural ekleyip sözlüğe yazmayan, sessizce Türkçe ize düşen bir gerekçe bırakır:
 * İngilizce kullanıcı listenin ortasında Türkçe bir cümle görür. Ayrışmayı burada
 * yakalamak, kullanıcıda görmekten ucuz.
 */
describe('hacim gerekçeleri sözlükle eşleşiyor', () => {
  it('üretilen her hacim kuralı sözlükte var', () => {
    const uretilen = new Set<string>();

    for (const profil of [
      profilKur(),
      profilKur({ uyku_saati: 5 }),
      profilKur({ stres_seviyesi: 9 }),
      profilKur({ yas: 55 }),
      profilKur({
        kisitlar: {
          ...profilKur().kisitlar,
          sakatliklar: [
            {
              bolge: 'omuz',
              kontrendikasyonlar: ['omuz_sikismasi'],
              agri_seviyesi: 6,
              aktif: true,
            },
          ],
        },
      }),
    ]) {
      for (const karar of hacimButcesiHesapla(profil).kararlar) {
        for (const kural of karar.kurallar) uretilen.add(kural);
      }
    }

    const sozlukte = new Set(Object.keys(tr.gerekce.hacim));

    expect([...uretilen].filter((k) => !sozlukte.has(k))).toEqual([]);
  });

  it('denetim gerçekten bir şey tarıyor', () => {
    expect(Object.keys(tr.gerekce.hacim).length).toBeGreaterThan(3);
  });
});
