import { describe, expect, it } from 'vitest';
import { parolaGucKontrolu, parolaHashle, parolaKarsilastir, tokenOzeti } from './parola';

describe('parolaHashle', () => {
  it('düz metni asla geri döndürmez', async () => {
    const hash = await parolaHashle('CokGizliParola1!');

    expect(hash).not.toContain('CokGizliParola1!');
    expect(hash.length).toBeGreaterThan(40);
  });

  it('aynı parola her seferinde farklı hash üretir — tuz rastgeledir', async () => {
    const a = await parolaHashle('CokGizliParola1!');
    const b = await parolaHashle('CokGizliParola1!');

    expect(a).not.toBe(b);
  });

  it('hash formatı algoritma ve parametreleri taşır', async () => {
    const hash = await parolaHashle('CokGizliParola1!');

    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(hash.split('$')).toHaveLength(6);
  });
});

describe('parolaKarsilastir', () => {
  it('doğru parolayı kabul eder', async () => {
    const hash = await parolaHashle('CokGizliParola1!');

    expect(await parolaKarsilastir('CokGizliParola1!', hash)).toBe(true);
  });

  it('yanlış parolayı reddeder', async () => {
    const hash = await parolaHashle('CokGizliParola1!');

    expect(await parolaKarsilastir('YanlisParola1!', hash)).toBe(false);
  });

  it('bozuk hash formatında çökmez, reddeder', async () => {
    expect(await parolaKarsilastir('herhangi', 'bozuk-hash')).toBe(false);
    expect(await parolaKarsilastir('herhangi', '')).toBe(false);
  });

  it('boş parolayı reddeder', async () => {
    const hash = await parolaHashle('CokGizliParola1!');

    expect(await parolaKarsilastir('', hash)).toBe(false);
  });
});

describe('parolaGucKontrolu', () => {
  it('kısa parolayı reddeder', () => {
    expect(parolaGucKontrolu('Kisa1!').gecerli).toBe(false);
  });

  it('yalnızca harften oluşan parolayı reddeder', () => {
    expect(parolaGucKontrolu('sadeceharflervar').gecerli).toBe(false);
  });

  it('yeterince güçlü parolayı kabul eder', () => {
    expect(parolaGucKontrolu('Kirmizi-Bisiklet-42').gecerli).toBe(true);
  });

  it('marka adını içeren parolayı reddeder — tahmin edilmesi kolay', () => {
    expect(parolaGucKontrolu('Swiip-guclu-parola').gecerli).toBe(false);
  });

  it('yaygın parolaları reddeder', () => {
    expect(parolaGucKontrolu('12345678901').gecerli).toBe(false);
    expect(parolaGucKontrolu('parola12345').gecerli).toBe(false);
  });

  it('hata mesajı Türkçe ve yol gösterir', () => {
    const sonuc = parolaGucKontrolu('kisa');

    expect(sonuc.mesaj).toBeDefined();
    expect(sonuc.mesaj!.length).toBeGreaterThan(15);
  });
});

describe('tokenOzeti', () => {
  it('aynı token aynı özeti verir', () => {
    expect(tokenOzeti('abc')).toBe(tokenOzeti('abc'));
  });

  it('farklı token farklı özet verir', () => {
    expect(tokenOzeti('abc')).not.toBe(tokenOzeti('abd'));
  });

  it('ham tokenı içermez', () => {
    expect(tokenOzeti('gizli-token')).not.toContain('gizli-token');
  });
});
