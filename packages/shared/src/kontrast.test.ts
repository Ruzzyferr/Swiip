import { describe, expect, it } from 'vitest';
import { renkler } from './tokens';

/**
 * Metin okunabilir kalsın — her iki temada.
 *
 * Palet bu depoda birkaç kez elle ayarlandı (zemin `#F6F7F5` → `#ECEEED`,
 * aksan koyulaştırıldı, vurgu dolgudan kenar işaretine çevrildi). Her seferinde
 * gerekçe görsel bir yargıydı; kontrastın ölçüldüğü bir yer yoktu. Bir sonraki
 * ayar metni sessizce okunamaz yapabilirdi.
 *
 * Eşik WCAG AA: gövde metni 4.5, büyük metin 3.0. Ölçüldüğünde en zayıf çift
 * (açık temada `murekkepSilik` / `zemin`) 5.37 çıkıyor — yani paletin bugünkü
 * hâli eşiğin üstünde ve bu test onu orada tutuyor.
 *
 * Not: bu bir erişilebilirlik BEYANI değil, onun dayanağı. App Store'daki
 * "Sufficient Contrast" işareti ölçülmüş bir şeye dayanmalı.
 */

/** sRGB kanalını doğrusallaştırır (WCAG 2.x). */
function dogrusal(kanal: number): number {
  const o = kanal / 255;
  return o <= 0.03928 ? o / 12.92 : Math.pow((o + 0.055) / 1.055, 2.4);
}

function parlaklik(onaltilik: string): number {
  const s = onaltilik.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => dogrusal(parseInt(s.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function kontrastOrani(a: string, b: string): number {
  const [x, y] = [parlaklik(a), parlaklik(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const AA_GOVDE = 4.5;

const ACIK = renkler;
const KOYU = renkler.koyu;

/** [metin, zemin, ad] — kullanıcının gerçekten gördüğü eşleşmeler. */
const CIFTLER = (t: typeof ACIK | typeof KOYU) =>
  [
    [t.murekkep, t.zemin, 'gövde / zemin'],
    [t.murekkep, t.yuzey, 'gövde / yüzey'],
    [t.murekkepYumusak, t.zemin, 'yumuşak / zemin'],
    [t.murekkepYumusak, t.yuzey, 'yumuşak / yüzey'],
    [t.murekkepSilik, t.zemin, 'silik / zemin'],
    [t.murekkepSilik, t.yuzey, 'silik / yüzey'],
    [t.aksan, t.zemin, 'aksan / zemin'],
    [t.aksan, t.yuzey, 'aksan / yüzey'],
  ] as const;

describe('kontrast — açık tema', () => {
  it.each(CIFTLER(ACIK).map(([m, z, ad]) => [ad, m, z]))('%s WCAG AA', (_ad, metin, zemin) => {
    expect(kontrastOrani(metin, zemin)).toBeGreaterThanOrEqual(AA_GOVDE);
  });
});

describe('kontrast — koyu tema', () => {
  it.each(CIFTLER(KOYU).map(([m, z, ad]) => [ad, m, z]))('%s WCAG AA', (_ad, metin, zemin) => {
    expect(kontrastOrani(metin, zemin)).toBeGreaterThanOrEqual(AA_GOVDE);
  });
});

describe('ölçüm doğru', () => {
  it('siyah/beyaz 21:1', () => {
    expect(kontrastOrani('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('aynı renk 1:1', () => {
    expect(kontrastOrani('#14615A', '#14615A')).toBeCloseTo(1, 5);
  });
});
