import { describe, expect, it } from 'vitest';
import { egimDerecesi, telefonDikMi, EGIM_TOLERANSI } from './egim';

/**
 * Telefon eğim kontrolü (F4.2).
 *
 * İki fotoğraf farklı açılardan çekildiyse karşılaştırılamaz — omuz genişliği değişmiş
 * gibi görünür, oysa değişen tek şey telefonun eğimidir. Bu yüzden eğik telefonla çekim
 * düğmesi açılmaz.
 *
 * Girdi ivmeölçerden gelir: yerçekimi vektörü, g cinsinden. Telefon dikken yerçekimi
 * neredeyse tamamen -y ekseninde okunur.
 */

/** Portre modda dik tutulan telefon. */
const DIK = { x: 0, y: -1, z: 0 };

describe('egimDerecesi', () => {
  it('tam dik telefonda sıfır derece verir', () => {
    expect(egimDerecesi(DIK)).toBe(0);
  });

  it('öne doğru eğilen telefonda derece büyür', () => {
    // 45 derece öne eğik: yerçekimi y ve z arasında eşit paylaşılır.
    const yarim = Math.SQRT1_2;

    expect(egimDerecesi({ x: 0, y: -yarim, z: yarim })).toBeCloseTo(45, 0);
  });

  it('yana yatan telefonda da derece büyür', () => {
    const yarim = Math.SQRT1_2;

    expect(egimDerecesi({ x: yarim, y: -yarim, z: 0 })).toBeCloseTo(45, 0);
  });

  it('yatay tutulan telefon 90 dereceye yakındır', () => {
    expect(egimDerecesi({ x: 0, y: 0, z: 1 })).toBeCloseTo(90, 0);
  });

  it('baş aşağı tutulan telefonu dik saymaz', () => {
    expect(egimDerecesi({ x: 0, y: 1, z: 0 })).toBeCloseTo(180, 0);
  });

  it('ölçüm gürültüsünde vektör tam birim olmayabilir — yine de çalışır', () => {
    expect(egimDerecesi({ x: 0, y: -0.98, z: 0.02 })).toBeLessThan(3);
  });

  it('sıfır vektörde 90 derece varsayar — ölçüm yok, güvenli taraf', () => {
    expect(egimDerecesi({ x: 0, y: 0, z: 0 })).toBe(90);
  });
});

describe('telefonDikMi', () => {
  it('dik telefonu kabul eder', () => {
    expect(telefonDikMi(DIK)).toBe(true);
  });

  it('tolerans içindeki küçük eğimi kabul eder', () => {
    // Elde tutulan telefon hiçbir zaman tam dik değildir; katı olmak ekranı kilitler.
    const kucukEgim = { x: 0, y: -Math.cos(0.06), z: Math.sin(0.06) };

    expect(egimDerecesi(kucukEgim)).toBeLessThan(EGIM_TOLERANSI);
    expect(telefonDikMi(kucukEgim)).toBe(true);
  });

  it('toleransı aşan eğimi reddeder', () => {
    expect(telefonDikMi({ x: 0, y: -0.7, z: 0.7 })).toBe(false);
  });

  it('ölçüm yokken reddeder — bilinmeyen açıyı doğru saymayız', () => {
    expect(telefonDikMi({ x: 0, y: 0, z: 0 })).toBe(false);
  });

  it('tolerans makul bir aralıkta — ne kilitleyici ne anlamsız', () => {
    expect(EGIM_TOLERANSI).toBeGreaterThanOrEqual(5);
    expect(EGIM_TOLERANSI).toBeLessThanOrEqual(15);
  });
});
