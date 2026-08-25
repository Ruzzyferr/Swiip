import { describe, expect, it } from 'vitest';
import {
  gunAyMetni,
  gunMetni,
  kisaTarihMetni,
  tarihMetni,
  yerelGun,
  yerelHaftaBasi,
} from './tarih';

/**
 * Tarih biçimi (F10.3).
 *
 * Yenileme tarihi paywall'ın en kritik iki bilgisinden biri. Sabit `'tr-TR'` ile
 * yazılıyordu: İngilizce kullanıcı "20 Ağustos 2026" görüyordu.
 */

const GUN = new Date(Date.UTC(2026, 7, 20, 12, 0, 0));

describe('tarihMetni', () => {
  it('Türkçede ay adı Türkçe', () => {
    expect(tarihMetni(GUN, 'tr')).toContain('Ağustos');
    expect(tarihMetni(GUN, 'tr')).toContain('2026');
  });

  it('İngilizcede ay adı İngilizce', () => {
    expect(tarihMetni(GUN, 'en')).toContain('August');
    expect(tarihMetni(GUN, 'en')).toContain('2026');
  });

  it('iki dil farklı sonuç üretiyor — yerel ayar gerçekten uygulanıyor', () => {
    expect(tarihMetni(GUN, 'tr')).not.toBe(tarihMetni(GUN, 'en'));
  });

  it('ayı rakamla yazmıyor — 03.04 hangi ay, belirsiz kalmasın', () => {
    expect(tarihMetni(GUN, 'tr')).not.toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('kisaTarihMetni', () => {
  it('Türkçede gün.ay.yıl sırası', () => {
    expect(kisaTarihMetni(GUN, 'tr')).toMatch(/^20[./]0?8[./]2026$/);
  });

  it('İngilizcede ay/gün/yıl sırası', () => {
    expect(kisaTarihMetni(GUN, 'en')).toMatch(/^0?8\/20\/2026$/);
  });
});

describe('gunAyMetni', () => {
  it('Türkçede ay kısaltması Türkçe', () => {
    expect(gunAyMetni(GUN, 'tr')).toMatch(/Ağu/);
  });

  it('İngilizcede ay kısaltması İngilizce', () => {
    expect(gunAyMetni(GUN, 'en')).toMatch(/Aug/);
  });

  it('yıl göstermiyor — karşılaştırma kartı dar', () => {
    expect(gunAyMetni(GUN, 'tr')).not.toContain('2026');
  });
});

/**
 * Sunucudan gelen ISO tarih (F10.1).
 *
 * API kota yenilenme tarihini `2026-09-01` gibi gönderiyor ve sözlük onu doğrudan cümleye
 * koyuyordu: kullanıcı ayarlar ekranında **"2026-09-01 tarihinde sıfırlanır"** okuyordu.
 * Emülatörde görüldü.
 */
describe('gunMetni', () => {
  it('ISO tarihi kullanıcının dilinde yazar', () => {
    expect(gunMetni('2026-09-01', 'tr')).toContain('Eylül');
    expect(gunMetni('2026-09-01', 'en')).toContain('September');
  });

  it('makine biçimi kalmıyor', () => {
    expect(gunMetni('2026-09-01', 'tr')).not.toContain('2026-09-01');
  });

  it('tam zaman damgası da kabul ediliyor', () => {
    expect(gunMetni('2026-09-01T10:30:00.000Z', 'tr')).toContain('Eylül');
  });

  /** Bozuk değer gelirse mesajı hiç göstermemektense olduğu gibi geçiriyoruz. */
  it('bozuk değer çökmez, olduğu gibi geçer', () => {
    expect(gunMetni('bilinmeyen', 'tr')).toBe('bilinmeyen');
    expect(gunMetni(undefined, 'tr')).toBe('');
  });
});

describe('yerelGun', () => {
  /**
   * Asıl kusur bu pencerede: UTC+3'te gece 01:30, UTC'de hâlâ önceki gün.
   * `toISOString()` o yüzden bir gün geri veriyordu ve yemek düne yazılıyordu.
   */
  it('gece yarısından sonra yerel günü veriyor, UTC gününü değil', () => {
    // 2026-08-25 01:30 yerel (UTC+3) → UTC'de 2026-08-24 22:30
    const gece = new Date(2026, 7, 25, 1, 30);
    expect(yerelGun(gece)).toBe('2026-08-25');
  });

  it('gün, ay ve yıl sınırlarında iki haneli biçim koruyor', () => {
    expect(yerelGun(new Date(2026, 0, 1, 12))).toBe('2026-01-01');
    expect(yerelGun(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});

describe('yerelHaftaBasi', () => {
  it('pazartesi haftanın başı', () => {
    // 2026-08-25 salı
    expect(yerelHaftaBasi(new Date(2026, 7, 25, 12))).toBe('2026-08-24');
  });

  it('pazar bir önceki pazartesiye bağlanıyor', () => {
    // 2026-08-30 pazar
    expect(yerelHaftaBasi(new Date(2026, 7, 30, 12))).toBe('2026-08-24');
  });

  it('pazartesi kendisi', () => {
    expect(yerelHaftaBasi(new Date(2026, 7, 24, 6))).toBe('2026-08-24');
  });
});
