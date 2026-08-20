import { describe, expect, it } from 'vitest';
import { profilDerle } from './profil';
import type { Cevaplar } from '../cevaplar';

const REFERANS_GUN = new Date('2026-08-19T00:00:00.000Z');

const tamCevaplar: Cevaplar = {
  K1: '1994-03-15',
  K2: 'Erkek',
  K3: 178,
  K4: 82,
  K6: 'Hayır',
  K7: 'Evet',
  H1: 'Kas kazanımı',
  H2: 'Güç artışı',
  H3: 86,
  H6: ['gogus', 'sirt', 'kol'],
  H7: ['bacak_on'],
  H10: 1,
  A1: '1-3 yıl',
  A3: 10,
  'A8:Squat': 4,
  'A8:Bench press': 4,
  'A5:Squat': { kg: 100, tekrar: 5 },
  'A5:Bench press': { kg: 80, tekrar: 6 },
  A7: { sinav_adet: 25, barfiks_adet: 8, plank_saniye: 90 },
  S2: 'Hayır',
  S3: 'Hayır',
  S7: 'Hayır',
  S18: 'Hayır',
  E1: 'Spor salonu',
  E3: ['Barbell ve plaka', 'Dumbbell', 'Düz bench', 'Squat rack', 'Lat pulldown'],
  E4: 'Bazen beklerim',
  E8: 'Hayır',
  Z1: '4 gün',
  Z2: '60 dakika',
  Y1: '7-8 saat',
  Y2: 7,
  Y4: 'Masa başı, çoğunlukla oturarak',
  Y6: 4,
  T1: 'Bodybuilding / estetik',
  T3: 'Katlanırım',
};

const secenekler = { bugun: REFERANS_GUN, userId: 'u1', locale: 'tr-TR' };

describe('profilDerle — kimlik', () => {
  it('temel ölçüleri taşır', () => {
    const p = profilDerle(tamCevaplar, secenekler);

    expect(p.user_id).toBe('u1');
    expect(p.cinsiyet).toBe('erkek');
    expect(p.yas).toBe(32);
    expect(p.boy_cm).toBe(178);
    expect(p.kilo_kg).toBe(82);
  });

  it('kadın cevabını doğru eşler', () => {
    expect(profilDerle({ ...tamCevaplar, K2: 'Kadın' }, secenekler).cinsiyet).toBe('kadin');
  });

  it('bilinen vücut yağ oranını taşır', () => {
    expect(profilDerle({ ...tamCevaplar, F2: 18 }, secenekler).vucut_yag_orani).toBe(18);
  });
});

describe('profilDerle — zaman ve ortam', () => {
  it('Z1 gün sayısını sayıya çevirir', () => {
    expect(profilDerle(tamCevaplar, secenekler).gun_sayisi).toBe(4);
  });

  it('Z2 seans süresini dakikaya çevirir', () => {
    expect(profilDerle(tamCevaplar, secenekler).seans_dakika).toBe(60);
    expect(profilDerle({ ...tamCevaplar, Z2: '90 dakika ve üzeri' }, secenekler).seans_dakika).toBe(
      90,
    );
  });

  it.each([
    ['Spor salonu', 'salon'],
    ['Ev', 'ev'],
    ['Açık hava', 'acik_alan'],
    ['Karma', 'ev_ve_salon'],
  ])('E1 = %s → %s', (e1, beklenen) => {
    expect(profilDerle({ ...tamCevaplar, E1: e1 }, secenekler).ortam).toBe(beklenen);
  });

  it('gün sayısı cevaplanmamışsa muhafazakâr 3 gün varsayar', () => {
    const cevaplar = { ...tamCevaplar };
    delete cevaplar.Z1;
    expect(profilDerle(cevaplar, secenekler).gun_sayisi).toBe(3);
  });
});

describe('profilDerle — hedef vektörü', () => {
  it('birincil ve ikincil hedefi eşler', () => {
    const p = profilDerle(tamCevaplar, secenekler);

    expect(p.hedef_vektoru.birincil).toBe('kas_kazanimi');
    expect(p.hedef_vektoru.ikincil).toBe('guc_artisi');
  });

  it('H6 bölgelerini hacim gruplarına çevirir ve kol iki gruba açılır', () => {
    const p = profilDerle(tamCevaplar, secenekler);

    expect(p.hedef_vektoru.oncelikli_bolgeler).toContain('gogus');
    expect(p.hedef_vektoru.oncelikli_bolgeler).toContain('sirt');
    expect(p.hedef_vektoru.oncelikli_bolgeler).toContain('biceps');
    expect(p.hedef_vektoru.oncelikli_bolgeler).toContain('triceps');
  });

  it('bacak bölgeleri ön ve arka olarak ayrılır', () => {
    const p = profilDerle({ ...tamCevaplar, H6: ['bacak_on', 'bacak_arka'] }, secenekler);

    expect(p.hedef_vektoru.oncelikli_bolgeler).toEqual(['hamstring', 'quadriceps']);
  });

  it('memnun olunan bölgeyi ayrı tutar', () => {
    expect(profilDerle(tamCevaplar, secenekler).hedef_vektoru.memnun_bolgeler).toEqual([
      'quadriceps',
    ]);
  });

  it('hedef kiloyu ve aylık beklentiyi taşır', () => {
    const p = profilDerle(tamCevaplar, secenekler);

    expect(p.hedef_vektoru.hedef_kilo_kg).toBe(86);
    expect(p.hedef_vektoru.aylik_beklenti_kg).toBe(1);
  });

  it('hedef cevaplanmamışsa genel sağlığa düşer', () => {
    const cevaplar = { ...tamCevaplar };
    delete cevaplar.H1;
    expect(profilDerle(cevaplar, secenekler).hedef_vektoru.birincil).toBe('genel_saglik');
  });
});

describe('profilDerle — bilinen yükler', () => {
  it('A5 girdilerini Epley ile e1RM olarak saklar', () => {
    const p = profilDerle(tamCevaplar, secenekler);

    // 100 × (1 + 5/30) = 116,67
    expect(p.bilinen_yukler['barbell-squat']).toBeCloseTo(116.67, 1);
    expect(p.bilinen_yukler['barbell-bench-press']).toBeCloseTo(96, 1);
  });

  it('A6 (8-10 tekrar tahmini) A5 yoksa kullanılır', () => {
    const cevaplar = { ...tamCevaplar };
    delete cevaplar['A5:Squat'];
    cevaplar['A6:Squat'] = { kg: 80, tekrar: 8 };

    expect(profilDerle(cevaplar, secenekler).bilinen_yukler['barbell-squat']).toBeCloseTo(
      101.33,
      1,
    );
  });

  it('A5 varsa A6 yok sayılır', () => {
    const cevaplar = { ...tamCevaplar, 'A6:Squat': { kg: 40, tekrar: 8 } };

    expect(profilDerle(cevaplar, secenekler).bilinen_yukler['barbell-squat']).toBeCloseTo(
      116.67,
      1,
    );
  });

  it('vücut ağırlığı kapasitesini taşır', () => {
    const p = profilDerle(tamCevaplar, secenekler);

    expect(p.vucut_agirligi_kapasitesi.sinav).toBe(25);
    expect(p.vucut_agirligi_kapasitesi.barfiks).toBe(8);
    expect(p.vucut_agirligi_kapasitesi.plank_saniye).toBe(90);
  });

  it('hiç yük bilgisi yoksa boş kalır', () => {
    const cevaplar = { ...tamCevaplar };
    delete cevaplar['A5:Squat'];
    delete cevaplar['A5:Bench press'];

    expect(profilDerle(cevaplar, secenekler).bilinen_yukler).toEqual({});
  });
});

describe('profilDerle — kapılar ve ED modu', () => {
  it('S18 = Evet ED modunu açar', () => {
    const p = profilDerle({ ...tamCevaplar, S18: 'Evet' }, secenekler);

    expect(p.ed_modu).toBe(true);
    expect(p.kapi_durumu.sayilar_gizli).toBe(true);
  });

  it('kardiyak bayrağı profilde görünür', () => {
    const p = profilDerle({ ...tamCevaplar, S2: 'Evet' }, secenekler);

    expect(p.kapi_durumu.program_engelli).toBe(true);
  });

  it('temiz profilde hiçbir kapı yoktur', () => {
    expect(profilDerle(tamCevaplar, secenekler).kapi_durumu.kapilar).toEqual([]);
  });
});

describe('profilDerle — determinizm', () => {
  it('aynı cevaplar birebir aynı profili üretir', () => {
    const a = profilDerle(tamCevaplar, secenekler);
    const b = profilDerle(tamCevaplar, secenekler);

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('cevap sırası profili değiştirmez', () => {
    const tersSirali = Object.fromEntries(Object.entries(tamCevaplar).reverse());
    const a = profilDerle(tamCevaplar, secenekler);
    const b = profilDerle(tersSirali, secenekler);

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('profilDerle — uygun günler (Z3)', () => {
  it('Z3 cevabını profile taşır', () => {
    const cevaplar = { ...tamCevaplar, Z3: ['Pazartesi', 'Çarşamba', 'Cuma'] };

    expect(profilDerle(cevaplar, secenekler).uygun_gunler).toEqual([1, 3, 5]);
  });

  it('Z3 cevaplanmadıysa boş kalır — biz gün uydurmayız', () => {
    const { Z3: _atilan, ...Z3suz } = tamCevaplar;

    expect(profilDerle(Z3suz, secenekler).uygun_gunler).toEqual([]);
  });
});
