import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Android geri tuşu uygulamayı KAPATMIYOR.
 *
 * 2026-10-03'te Android 16 emülatöründe ölçüldü: `targetSdkVersion 36` ile tahmini geri
 * zorunlu ve React Native 0.76 `OnBackInvokedCallback`'i dinlemiyor; her "geri" basışı
 * uygulamayı kapatıyordu (ikincil sekmeden, ödeme ekranından, barkod ekranından).
 * `eklentiler/geriTusu.js` manifeste `enableOnBackInvokedCallback="false"` yazıyor.
 *
 * React Native tahmini geriyi desteklediğinde eklenti ve bu test birlikte kaldırılır.
 */
const MOBIL = join(import.meta.dirname, '..', '..');

describe('Android geri tuşu', () => {
  const app = JSON.parse(readFileSync(join(MOBIL, 'app.json'), 'utf8')) as {
    expo: { plugins: Array<string | [string, unknown]> };
  };
  const eklentiler = app.expo.plugins.map((p) => (typeof p === 'string' ? p : p[0]));

  it('eklenti app.json’da kayıtlı', () => {
    expect(eklentiler).toContain('./eklentiler/geriTusu');
  });

  it('eklenti tahmini geriyi kapatıyor', () => {
    const kaynak = readFileSync(join(MOBIL, 'eklentiler', 'geriTusu.js'), 'utf8');
    expect(kaynak).toMatch(/android:enableOnBackInvokedCallback'\] = 'false'/);
  });
});
