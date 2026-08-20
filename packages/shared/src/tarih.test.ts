import { describe, expect, it } from 'vitest';
import { gunAyMetni, kisaTarihMetni, tarihMetni } from './tarih';

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
