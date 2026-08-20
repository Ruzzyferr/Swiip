import { describe, expect, it } from 'vitest';
import { kendiVerisiMi, VARSAYILAN_VERI_YERELI, veriYereli, VERI_YERELLERI } from './veriYereli';

/**
 * Besin ve tarif verisinin yereli (F10.2, F10.4).
 *
 * Şema `foods.locale` ve `recipes.locale` sütunlarını ilk günden taşıyordu ve
 * `(locale, name_tr)` indeksi bile vardı — ama hiçbir sorgu bu sütunu okumuyordu.
 * İkinci pazarın verisi eklendiği an iki dil karışacaktı.
 */

describe('veriYereli', () => {
  it('Türkçe kullanıcı Türkçe veriyi görür', () => {
    expect(veriYereli('tr-TR')).toBe('tr-TR');
    expect(veriYereli('tr')).toBe('tr-TR');
  });

  it('bölge farkı kullanıcıyı verisiz bırakmıyor', () => {
    expect(veriYereli('tr-CY')).toBe('tr-TR');
  });

  it('veri kümesi olmayan dil varsayılana düşer', () => {
    expect(veriYereli('en-US')).toBe(VARSAYILAN_VERI_YERELI);
    expect(veriYereli('de-DE')).toBe(VARSAYILAN_VERI_YERELI);
  });

  it('boş ya da bozuk değer çökmez', () => {
    expect(veriYereli(null)).toBe(VARSAYILAN_VERI_YERELI);
    expect(veriYereli(undefined)).toBe(VARSAYILAN_VERI_YERELI);
    expect(veriYereli('')).toBe(VARSAYILAN_VERI_YERELI);
    expect(veriYereli('   ')).toBe(VARSAYILAN_VERI_YERELI);
  });

  it('sonuç her zaman gerçek bir veri yereli', () => {
    for (const girdi of ['tr-TR', 'en-US', 'zz', '', null]) {
      expect(VERI_YERELLERI).toContain(veriYereli(girdi));
    }
  });
});

describe('kendiVerisiMi', () => {
  it('Türkçe kullanıcı kendi verisini görüyor', () => {
    expect(kendiVerisiMi('tr-TR')).toBe(true);
  });

  /**
   * İngilizce kullanıcı Türkçe içeriğe düşüyor ve arayüz bunu söylüyor. Sessizce
   * yedeğe düşmek, kullanıcının neden Türkçe tarif gördüğünü anlamamasına yol açar.
   */
  it('İngilizce kullanıcı yedeğe düştüğünü bilebiliyor', () => {
    expect(kendiVerisiMi('en-US')).toBe(false);
  });
});
