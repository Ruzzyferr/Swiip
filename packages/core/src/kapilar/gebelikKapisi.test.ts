import { describe, expect, it } from 'vitest';
import { gorunurSorular, sonrakiSoru } from '../degerlendirme/motor';
import { kapilariDegerlendir } from './kapilar';
import type { Cevaplar } from '../cevaplar';

/**
 * Gebelik kapısı ve K6'nın kime sorulduğu.
 *
 * Emülatörde görüldü: 34 yaşındaki erkek kullanıcıya "Hamile misin veya emziriyor
 * musun?" soruluyordu. Ürünün tek cümlelik vaadi "134 soru soruyoruz, hepsinin bir
 * karşılığı var" — ve kullanıcının ilk on iki dakikasında karşılığı olmayan bir soru
 * görmesi, o cümleyi ilk anda yalanlıyor.
 *
 * Soruyu gizlemek tek başına yeterli değil: K6 dört sert kapıdan birinin tarama
 * sorusu. Yalnızca gizlenirse `eksik_tarama` hiç kapanmaz ve program HİÇ üretilemez.
 * Bu yüzden kapı da biliyor: biyolojik cinsiyet erkekse tarama karşılanmış sayılır.
 *
 * Gevşetme değil, aynı sonucun daha kısa yolu: "Erkek" cevabı zaten gebelik ve emzirme
 * ihtimalini dışarıda bırakıyor. Cinsiyet CEVAPLANMAMIŞSA K6 yine zorunlu.
 */

const BUGUN = new Date('2026-08-22T00:00:00.000Z');
const kapi = (cevaplar: Cevaplar) => kapilariDegerlendir(cevaplar, { bugun: BUGUN });

const TABAN: Cevaplar = {
  K1: '1992-03-14',
  K7: 'Evet',
  S2: 'Hayır',
  S3: 'Hayır',
  S7: 'Hayır',
  S18: 'Hayır',
};

describe('K6 görünürlüğü', () => {
  it('cinsiyet cevaplanmadan sorulmaz — önce K2 gelir', () => {
    const gorunur = gorunurSorular({}).map((s) => s.id);

    expect(gorunur).toContain('K2');
    expect(gorunur).not.toContain('K6');
  });

  it('kadına sorulur', () => {
    expect(gorunurSorular({ K2: 'Kadın' }).map((s) => s.id)).toContain('K6');
  });

  it('erkeğe sorulmaz', () => {
    expect(gorunurSorular({ K2: 'Erkek' }).map((s) => s.id)).not.toContain('K6');
  });

  it('cinsiyet kadına çevrilirse soru geri gelir', () => {
    const erkek: Cevaplar = { K2: 'Erkek' };
    const kadin: Cevaplar = { K2: 'Kadın' };

    expect(sonrakiSoru(erkek)?.id).not.toBe('K6');
    expect(gorunurSorular(kadin).map((s) => s.id)).toContain('K6');
  });
});

describe('gebelik kapısı taraması', () => {
  it('erkekte K6 olmadan da tarama tamamlanır — program üretilebilir', () => {
    const durum = kapi({ ...TABAN, K2: 'Erkek' });

    expect(durum.eksik_tarama).not.toContain('K6');
    expect(durum.program_engelli).toBe(false);
  });

  it('kadında K6 cevaplanmadan program üretilemez', () => {
    const durum = kapi({ ...TABAN, K2: 'Kadın' });

    expect(durum.eksik_tarama).toContain('K6');
    expect(durum.program_engelli).toBe(true);
  });

  /** Cinsiyet bilinmiyorsa gevşetme yok: kapı kapalı kalır. */
  it('cinsiyet cevaplanmamışsa K6 hâlâ zorunlu', () => {
    expect(kapi(TABAN).eksik_tarama).toContain('K6');
  });

  it('kadın cevaplayınca program açılır', () => {
    const durum = kapi({ ...TABAN, K2: 'Kadın', K6: 'Hayır' });

    expect(durum.eksik_tarama).toEqual([]);
    expect(durum.program_engelli).toBe(false);
  });

  /** Kapının kendisi değişmedi: gebelik beyanı hâlâ program üretimini durduruyor. */
  it('gebelik beyanı programı durdurmaya devam ediyor', () => {
    const durum = kapi({ ...TABAN, K2: 'Kadın', K6: 'Hamileyim' });

    expect(durum.kapilar.map((k) => k.tip)).toContain('gebelik');
    expect(durum.program_engelli).toBe(true);
  });

  it('emzirme beyanı da durduruyor', () => {
    expect(kapi({ ...TABAN, K2: 'Kadın', K6: 'Emziriyorum' }).program_engelli).toBe(true);
  });

  /**
   * Erkek beyan edip sonra gebelik yazan bir kayıt tutarsız. Kapı yine de kapanıyor:
   * güvenlikte son söz beyandır, tutarlılık denetimi değil.
   */
  it('erkek işaretliyken gelen gebelik beyanı yine de kapıyı kapatır', () => {
    expect(kapi({ ...TABAN, K2: 'Erkek', K6: 'Hamileyim' }).program_engelli).toBe(true);
  });
});
