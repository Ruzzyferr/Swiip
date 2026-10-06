import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
vi.mock('expo-store-review', () => ({}));

const {
  BOS_PUAN_DURUMU,
  GEREKEN_IYI_SEANS,
  ILK_BEKLEME_GUN,
  TEKRAR_GUN,
  olumluSeansMi,
  olumluSeansSonrasi,
} = await import('./puanIste');

const GUN = 86_400_000;

describe('olumlu seans', () => {
  it('tamamlanan var, yapamadım yok, ağrı yok → olumlu', () => {
    expect(olumluSeansMi(['tamamladim', 'zorlandim'], false)).toBe(true);
  });
  it('ağrı bildiren kullanıcıya puan sorulmaz', () => {
    expect(olumluSeansMi(['tamamladim'], true)).toBe(false);
  });
  it('"yapamadım" diyen kullanıcıya sorulmaz', () => {
    expect(olumluSeansMi(['tamamladim', 'yapamadim'], false)).toBe(false);
  });
  it('hiç tamamlanan yoksa sorulmaz', () => {
    expect(olumluSeansMi(['zorlandim'], false)).toBe(false);
  });
});

describe('ne zaman sorulur', () => {
  const sirayla = (zamanlar: number[]) => {
    let durum = BOS_PUAN_DURUMU;
    const kararlar: boolean[] = [];
    for (const t of zamanlar) {
      const s = olumluSeansSonrasi(durum, t);
      durum = s.durum;
      kararlar.push(s.sor);
    }
    return kararlar;
  };

  it(`ilk ${GEREKEN_IYI_SEANS - 1} olumlu seansta sorulmaz`, () => {
    expect(sirayla([0, 3 * GUN]).some(Boolean)).toBe(false);
  });

  it(`ilk ${ILK_BEKLEME_GUN} gün içinde, seans sayısı dolsa da sorulmaz`, () => {
    expect(sirayla([0, 1000, 2000, 3000]).some(Boolean)).toBe(false);
  });

  it(`${GEREKEN_IYI_SEANS}. olumlu seansta, bekleme dolmuşsa BİR KEZ sorulur`, () => {
    expect(sirayla([0, 1 * GUN, 3 * GUN, 4 * GUN])).toEqual([false, false, true, false]);
  });

  it(`${TEKRAR_GUN} gün dolmadan tekrar sorulmaz, dolunca sorulur`, () => {
    const t = 3 * GUN;
    const k = sirayla([0, GUN, t, t + (TEKRAR_GUN - 1) * GUN, t + TEKRAR_GUN * GUN]);
    expect(k).toEqual([false, false, true, false, true]);
  });
});
