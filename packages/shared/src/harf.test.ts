import { describe, expect, it } from 'vitest';
import { buyukHarf, cumleBasiHarfi } from './harf';

/**
 * Dile bağlı harf dönüşümü (F10.1, F10.3).
 *
 * Türkçe, Unicode'un büyük/küçük harf dönüşümünde özel davranan iki dilinden biri:
 * `i` → `İ` ve `I` → `ı`. Bu yüzden arayüzde `toLocaleUpperCase('tr-TR')` sabiti vardı.
 *
 * Doğru olan Türkçe'ye çivilemek değil, **kullanıcının diline** bakmak. İngilizce
 * kullanıcıda `'tr-TR'` ile büyütmek "high protein" etiketini "HİGH PROTEİN" yapar:
 * yanlış görünür ve ekran okuyucu yanlış okur.
 */

describe('buyukHarf', () => {
  it('Türkçede i harfi noktalı büyür', () => {
    expect(buyukHarf('iyi', 'tr')).toBe('İYİ');
  });

  it('İngilizcede i harfi noktasız büyür', () => {
    expect(buyukHarf('high', 'en')).toBe('HIGH');
  });

  it('aynı metin iki dilde farklı büyür — yerel ayar gerçekten uygulanıyor', () => {
    expect(buyukHarf('protein', 'tr')).not.toBe(buyukHarf('protein', 'en'));
  });

  it('Türkçeye özgü harfler korunuyor', () => {
    expect(buyukHarf('çğşöü', 'tr')).toBe('ÇĞŞÖÜ');
  });
});

describe('cumleBasiHarfi', () => {
  it('Türkçede ilk harf dile göre büyür', () => {
    expect(cumleBasiHarfi('istirahat gerekiyor', 'tr')).toBe('İstirahat gerekiyor');
  });

  it('İngilizcede ilk harf noktasız büyür', () => {
    expect(cumleBasiHarfi('it needs rest', 'en')).toBe('It needs rest');
  });

  it('boş metin çökmez', () => {
    expect(cumleBasiHarfi('', 'tr')).toBe('');
  });

  it('metnin geri kalanına dokunmaz', () => {
    expect(cumleBasiHarfi('ağrı VAR', 'tr')).toBe('Ağrı VAR');
  });
});
