import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Android hedef SDK sürümü.
 *
 * 2026-08-21'de paket Play'e yüklendi ama ize alınamadı:
 *
 *   403 ... :commit — Target SDK of artifact is too low: 1
 *
 * Expo'nun ürettiği `android/build.gradle` varsayılanı `targetSdkVersion 34`'tü ve
 * Play yeni uygulamalarda daha yükseğini şart koşuyor. Kusur derlemede hiçbir uyarı
 * üretmiyor: paket sorunsuz derleniyor, imzalanıyor, hatta YÜKLENİYOR. Yalnızca ize
 * alma adımında reddediliyor.
 *
 * Değeri `android/` içine yazmak yetmez: o klasör üretilen bir çıktı ve her
 * `expo prebuild` sıfırlıyor. Kalıcı yer `app.json` içindeki `expo-build-properties`.
 */

const buradan = dirname(fileURLToPath(import.meta.url));
const uygulamaJson = resolve(buradan, '../../app.json');

type Eklenti = string | [string, Record<string, { targetSdkVersion?: number }>];

/** Play'in yeni uygulamalar için istediği taban. Yükseldikçe burası da yükselmeli. */
const EN_DUSUK_HEDEF_SDK = 35;

describe('Android hedef SDK', () => {
  const yapilandirma = JSON.parse(readFileSync(uygulamaJson, 'utf8')) as {
    expo: { plugins?: Eklenti[] };
  };

  const ozellikler = (yapilandirma.expo.plugins ?? []).find(
    (e): e is [string, Record<string, { targetSdkVersion?: number }>] =>
      Array.isArray(e) && e[0] === 'expo-build-properties',
  );

  it('app.json içinde expo-build-properties tanımlı', () => {
    expect(
      ozellikler,
      'targetSdkVersion yalnızca android/ içine yazılırsa bir sonraki prebuild siler',
    ).toBeDefined();
  });

  it('hedef SDK Play tabanının altında değil', () => {
    const hedef = ozellikler?.[1]?.android?.targetSdkVersion;

    expect(hedef, 'android.targetSdkVersion tanımlı değil').toBeTypeOf('number');
    expect(
      hedef,
      `Play yeni uygulamalarda en az ${EN_DUSUK_HEDEF_SDK} istiyor; ${hedef} ile paket ize alınamaz`,
    ).toBeGreaterThanOrEqual(EN_DUSUK_HEDEF_SDK);
  });

  it('derleme SDK hedeften düşük değil', () => {
    const android = ozellikler?.[1]?.android as
      { targetSdkVersion?: number; compileSdkVersion?: number } | undefined;
    expect(android?.compileSdkVersion).toBeGreaterThanOrEqual(android?.targetSdkVersion ?? 0);
  });
});
