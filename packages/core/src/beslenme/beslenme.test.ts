import { describe, expect, it } from 'vitest';
import { profilKur } from '../test/profilKur';
import {
  beslenmeHedefiHesapla,
  bmrHesapla,
  gercekcilikTesti,
  porsiyonRehberi,
  tdeeDuzelt,
  yagsizKutle,
} from './beslenme';

describe('bmrHesapla', () => {
  it('yağ oranı biliniyorsa Katch-McArdle kullanır', () => {
    const sonuc = bmrHesapla({ cinsiyet: 'erkek', yas: 30, boyCm: 178, kiloKg: 82, yagOrani: 18 });

    // Yağsız kütle 67,24 → 370 + 21,6 × 67,24 = 1822
    expect(sonuc.yontem).toBe('katch_mcardle');
    expect(sonuc.bmr).toBeCloseTo(1822, -1);
  });

  it('yağ oranı bilinmiyorsa Mifflin-St Jeor kullanır', () => {
    const sonuc = bmrHesapla({ cinsiyet: 'erkek', yas: 30, boyCm: 178, kiloKg: 82 });

    // 10×82 + 6,25×178 − 5×30 + 5 = 1787,5
    expect(sonuc.yontem).toBe('mifflin_st_jeor');
    expect(sonuc.bmr).toBeCloseTo(1788, -1);
  });

  it('kadınlarda Mifflin sabiti farklıdır', () => {
    const erkek = bmrHesapla({ cinsiyet: 'erkek', yas: 30, boyCm: 170, kiloKg: 70 });
    const kadin = bmrHesapla({ cinsiyet: 'kadin', yas: 30, boyCm: 170, kiloKg: 70 });

    expect(erkek.bmr - kadin.bmr).toBeCloseTo(166, 0);
  });

  it('yaş arttıkça BMR düşer', () => {
    const genc = bmrHesapla({ cinsiyet: 'erkek', yas: 25, boyCm: 178, kiloKg: 82 });
    const yasli = bmrHesapla({ cinsiyet: 'erkek', yas: 65, boyCm: 178, kiloKg: 82 });

    expect(yasli.bmr).toBeLessThan(genc.bmr);
  });

  it('fizyolojik alt sınırın altına inmez', () => {
    const sonuc = bmrHesapla({ cinsiyet: 'kadin', yas: 80, boyCm: 140, kiloKg: 36 });

    expect(sonuc.bmr).toBeGreaterThan(800);
  });
});

describe('yagsizKutle', () => {
  it('bilinen yağ oranından hesaplar', () => {
    expect(yagsizKutle(80, 20)).toBeCloseTo(64, 1);
  });

  it('yağ oranı bilinmiyorsa Deurenberg ile tahmin eder', () => {
    const tahmin = yagsizKutle(82, undefined, { cinsiyet: 'erkek', yas: 30, boyCm: 178 });

    expect(tahmin).toBeGreaterThan(55);
    expect(tahmin).toBeLessThan(75);
  });

  it('kadında aynı ölçülerde yağsız kütle daha düşük tahmin edilir', () => {
    const erkek = yagsizKutle(70, undefined, { cinsiyet: 'erkek', yas: 30, boyCm: 170 });
    const kadin = yagsizKutle(70, undefined, { cinsiyet: 'kadin', yas: 30, boyCm: 170 });

    expect(kadin).toBeLessThan(erkek);
  });
});

describe('beslenmeHedefiHesapla — yağ kaybı', () => {
  const profil = profilKur({
    hedef_vektoru: { birincil: 'yag_kaybi', oncelikli_bolgeler: [], memnun_bolgeler: [] },
  });

  it('TDEE altında kalori hedefi verir', () => {
    const hedef = beslenmeHedefiHesapla(profil);

    expect(hedef.kalori).toBeLessThan(hedef.tdee);
    expect(hedef.kalori_farki).toBeLessThan(0);
  });

  it('açık hiçbir zaman TDEE’nin dörtte birini geçmez', () => {
    const hedef = beslenmeHedefiHesapla(profil);

    expect(Math.abs(hedef.kalori_farki)).toBeLessThanOrEqual(hedef.tdee * 0.25);
  });

  it('açıkta protein yağsız kütle başına yüksek tutulur', () => {
    const hedef = beslenmeHedefiHesapla(profil);
    const lbm = yagsizKutle(profil.kilo_kg, profil.vucut_yag_orani, {
      cinsiyet: profil.cinsiyet,
      yas: profil.yas,
      boyCm: profil.boy_cm,
    });

    expect(hedef.protein_g / lbm).toBeGreaterThanOrEqual(2);
  });

  it('çok agresif hedefte uyarı döner', () => {
    const hedef = beslenmeHedefiHesapla(
      profilKur({
        hedef_vektoru: {
          birincil: 'yag_kaybi',
          oncelikli_bolgeler: [],
          memnun_bolgeler: [],
          aylik_beklenti_kg: 8,
        },
      }),
    );

    expect(hedef.uyari).toBeDefined();
  });
});

describe('beslenmeHedefiHesapla — kas kazanımı ve koruma', () => {
  it('kas kazanımında TDEE üstünde ölçülü bir fazla verir', () => {
    const hedef = beslenmeHedefiHesapla(profilKur());

    expect(hedef.kalori).toBeGreaterThan(hedef.tdee);
    expect(hedef.kalori - hedef.tdee).toBeLessThanOrEqual(350);
  });

  it('genel sağlık hedefinde koruma kalorisi verir', () => {
    const hedef = beslenmeHedefiHesapla(
      profilKur({
        hedef_vektoru: { birincil: 'genel_saglik', oncelikli_bolgeler: [], memnun_bolgeler: [] },
      }),
    );

    expect(Math.abs(hedef.kalori - hedef.tdee)).toBeLessThan(50);
  });
});

describe('beslenmeHedefiHesapla — makro tabanları', () => {
  const hedef = beslenmeHedefiHesapla(profilKur());

  it('yağ hormonal tabanın altına inmez', () => {
    expect(hedef.yag_g).toBeGreaterThanOrEqual(82 * 0.6);
  });

  it('karbonhidrat kalan kaloriden hesaplanır ve negatif olmaz', () => {
    expect(hedef.karbonhidrat_g).toBeGreaterThan(0);
  });

  it('makrolardan hesaplanan kalori hedef kaloriyle tutarlıdır', () => {
    const toplam = hedef.protein_g * 4 + hedef.karbonhidrat_g * 4 + hedef.yag_g * 9;

    expect(Math.abs(toplam - hedef.kalori)).toBeLessThanOrEqual(25);
  });

  it('lif 1000 kalori başına 14 gram hedeflenir', () => {
    expect(hedef.lif_g).toBeCloseTo((hedef.kalori / 1000) * 14, 0);
  });

  it('su vücut ağırlığı ve antrenman gününe göre hesaplanır', () => {
    expect(hedef.su_ml).toBeGreaterThanOrEqual(82 * 35);
  });

  it('aynı profil aynı hedefi üretir', () => {
    expect(JSON.stringify(beslenmeHedefiHesapla(profilKur()))).toBe(
      JSON.stringify(beslenmeHedefiHesapla(profilKur())),
    );
  });
});

describe('tdeeDuzelt — uyum döngüsü', () => {
  it('beklenenden az kilo verende TDEE aşağı çekilir', () => {
    const yeni = tdeeDuzelt({
      mevcutTdee: 2800,
      ortalamaAlim: 2300,
      kiloDegisimiKg: -0.2,
      gunSayisi: 14,
    });

    expect(yeni.tdee).toBeLessThan(2800);
  });

  it('beklenenden fazla kilo verende TDEE yukarı çekilir', () => {
    const yeni = tdeeDuzelt({
      mevcutTdee: 2800,
      ortalamaAlim: 2300,
      kiloDegisimiKg: -1.6,
      gunSayisi: 14,
    });

    expect(yeni.tdee).toBeGreaterThan(2800);
  });

  it('tek seferde yüzde 15’ten fazla oynamaz', () => {
    const yeni = tdeeDuzelt({
      mevcutTdee: 2800,
      ortalamaAlim: 1200,
      kiloDegisimiKg: 0,
      gunSayisi: 14,
    });

    expect(yeni.tdee).toBeGreaterThanOrEqual(2800 * 0.85);
    expect(yeni.tdee).toBeLessThanOrEqual(2800 * 1.15);
  });

  it('iki haftadan kısa veride düzeltme yapılmaz', () => {
    const yeni = tdeeDuzelt({
      mevcutTdee: 2800,
      ortalamaAlim: 2300,
      kiloDegisimiKg: -1,
      gunSayisi: 6,
    });

    expect(yeni.tdee).toBe(2800);
    expect(yeni.duzeltildi).toBe(false);
  });

  it('düzeltme kullanıcıya açıklanır', () => {
    const yeni = tdeeDuzelt({
      mevcutTdee: 2800,
      ortalamaAlim: 2300,
      kiloDegisimiKg: -0.2,
      gunSayisi: 14,
    });

    expect(yeni.mesaj).toContain('kcal');
    expect(yeni.duzeltildi).toBe(true);
  });
});

describe('gercekcilikTesti — H10', () => {
  it('ayda vücut ağırlığının %4’ünden fazlası gerçekçi bulunmaz', () => {
    const sonuc = gercekcilikTesti({ kiloKg: 80, aylikBeklentiKg: 6, hedef: 'yag_kaybi' });

    expect(sonuc.gercekci).toBe(false);
    expect(sonuc.onerilen_aralik).toMatch(/-/);
  });

  it('makul hedef onaylanır', () => {
    const sonuc = gercekcilikTesti({ kiloKg: 80, aylikBeklentiKg: 2.5, hedef: 'yag_kaybi' });

    expect(sonuc.gercekci).toBe(true);
  });

  it('kas kazanımında beklenti çok daha düşük olmalıdır', () => {
    const sonuc = gercekcilikTesti({ kiloKg: 80, aylikBeklentiKg: 2.5, hedef: 'kas_kazanimi' });

    expect(sonuc.gercekci).toBe(false);
  });

  it('itiraz metni suçlamaz, gerekçe verir', () => {
    const sonuc = gercekcilikTesti({ kiloKg: 80, aylikBeklentiKg: 8, hedef: 'yag_kaybi' });

    expect(sonuc.mesaj.length).toBeGreaterThan(40);
    expect(sonuc.mesaj.toLowerCase()).not.toContain('yanlış');
  });
});

describe('porsiyonRehberi — ED modu', () => {
  it('hiçbir sayı içermez', () => {
    const rehber = porsiyonRehberi(beslenmeHedefiHesapla(profilKur({ ed_modu: true })));

    for (const satir of rehber.ogunler) {
      expect(satir).not.toMatch(/\d/);
    }
  });

  it('porsiyon dili kullanır', () => {
    const rehber = porsiyonRehberi(beslenmeHedefiHesapla(profilKur({ ed_modu: true })));

    expect(rehber.ogunler.join(' ')).toContain('avuç');
  });

  it('öğün sayısı belirtilirken bile sayı yazılmaz', () => {
    const rehber = porsiyonRehberi(beslenmeHedefiHesapla(profilKur({ ed_modu: true })));

    expect(rehber.ozet).not.toMatch(/\d/);
  });
});
