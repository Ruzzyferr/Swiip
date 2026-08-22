import { describe, expect, it } from 'vitest';
import { ramazanMi } from './ramazan';

/**
 * Ramazan penceresi.
 *
 * Persona koşusunda bulundu: Ağustos ayında bir kullanıcıya sahur / iftar / iftar sonrası
 * öğünlerinden kurulu bir haftalık plan çıkıyordu. Sebep, oruç bayrağının **takvime hiç
 * bakmamasıydı** — B12'ye "Bazı günler" diyen herkes yılın 12 ayı Ramazan'daydı.
 *
 * Soru bir tercih sorusu ("oruç tutar mısın"), bir durum sorusu değil ("bugün oruçlu
 * musun"). Tercihi duruma çeviren şey takvim.
 *
 * Hicri ay `Intl` üzerinden okunuyor; elle yazılmış bir tarih tablosu birkaç yıl sonra
 * sessizce yanlışa döner ve kimse fark etmez.
 */

const g = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe('ramazanMi', () => {
  it('Ağustos Ramazan değil — hatanın çıktığı gün', () => {
    expect(ramazanMi(g('2026-08-22'))).toBe(false);
  });

  it('2026 Ramazan ortası Ramazan', () => {
    expect(ramazanMi(g('2026-03-01'))).toBe(true);
  });

  it('2027 Ramazan ortası Ramazan — tablo değil, takvim', () => {
    expect(ramazanMi(g('2027-02-20'))).toBe(true);
  });

  it('2030 Ramazan ortası Ramazan — uzak yılda da çalışır', () => {
    expect(ramazanMi(g('2030-01-20'))).toBe(true);
  });

  it('Ramazan biter bitmez kapanır', () => {
    expect(ramazanMi(g('2026-04-15'))).toBe(false);
  });

  it('yılın hiçbir gününde 40 günden uzun sürmez', () => {
    let sayac = 0;
    for (let gun = 0; gun < 365; gun++) {
      const t = new Date(Date.UTC(2026, 0, 1 + gun, 12));
      if (ramazanMi(t)) sayac++;
    }

    expect(sayac).toBeGreaterThan(25);
    expect(sayac).toBeLessThan(40);
  });
});
