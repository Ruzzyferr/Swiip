import { describe, expect, it } from 'vitest';
import { istekAnahtari } from './istekSiniri';

/**
 * İstek sınırının kime uygulandığı.
 *
 * Sınır IP başınaydı: dakikada 120 istek, kaynak IP'ye göre. Türkiye'de mobil
 * operatörlerin büyük kısmı CGNAT kullanıyor — binlerce abone aynı genel IP'den
 * çıkıyor. Aynı baz istasyonundaki otuz kullanıcı normal kullanımıyla bu sınırı
 * birlikte doldurabilir ve otuzu birden "Çok hızlı gidiyorsun" görür. Kimse hızlı
 * gitmemiştir; sadece aynı hücrededirler.
 *
 * Oturum açmış istekte kimlik zaten var: sınır kullanıcı başına uygulanıyor. Kimliksiz
 * uçlarda (kayıt, giriş, parola sıfırlama) IP kalmak zorunda — orada zaten korunmak
 * istediğimiz şey tek bir kaynaktan gelen deneme seli.
 */

describe('istekAnahtari', () => {
  it('oturum açmış istekte kullanıcıyı kullanır', () => {
    expect(istekAnahtari({ kullaniciId: 'kul-1', ip: '10.0.0.1' })).toBe('kul:kul-1');
  });

  it('aynı IP arkasındaki iki kullanıcı ayrı sayılır', () => {
    const a = istekAnahtari({ kullaniciId: 'kul-1', ip: '85.34.0.7' });
    const b = istekAnahtari({ kullaniciId: 'kul-2', ip: '85.34.0.7' });

    expect(a).not.toBe(b);
  });

  it('kimliksiz istekte IP kullanılır', () => {
    expect(istekAnahtari({ ip: '85.34.0.7' })).toBe('ip:85.34.0.7');
  });

  it('aynı kullanıcı farklı ağdan da aynı sayılır', () => {
    const evde = istekAnahtari({ kullaniciId: 'kul-1', ip: '192.168.1.5' });
    const disarida = istekAnahtari({ kullaniciId: 'kul-1', ip: '85.34.0.7' });

    expect(evde).toBe(disarida);
  });

  /** IP de yoksa tek bir kovaya düşmek, sınırı herkes için ortak yapardı. */
  it('IP okunamazsa ayrı bir kova kullanılır', () => {
    expect(istekAnahtari({})).toBe('ip:bilinmiyor');
  });
});
