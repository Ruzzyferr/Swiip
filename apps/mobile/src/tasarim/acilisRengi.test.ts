import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renkler } from '@swiip/shared';

/**
 * Açılış ekranı ve durum çubuğu, paletin zemin rengiyle aynı olmalı.
 *
 * `app.json` renkleri elle yazılıyor; `tokens.ts` ise tek doğruluk kaynağı. İkisi
 * 2026-08-31'de ayrışmış hâlde bulundu: palet `#F6F7F5` → `#ECEEED` soğutulurken
 * `app.json` eski değerde kalmıştı.
 *
 * Sonucu sessiz ve yalnızca CİHAZDA görülüyor: uygulama açılırken bir ton sıcak
 * zeminle beliriyor, ilk kare çizildiğinde soğuk zemine atlıyor. Android'de durum
 * çubuğu da açılış renginden türediği için o şerit kalıcı olarak yanlış tonda
 * kalıyor. Hiçbir test, hiçbir lint bunu görmüyordu.
 *
 * `androidStatusBar` ayrıca yazılmıyor; Expo onu açılış renginden türetiyor.
 */

const APP_JSON = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', '..', 'app.json'), 'utf8'),
) as { expo: { splash?: { backgroundColor?: string } } };

describe('açılış rengi paletle aynı', () => {
  it('app.json açılış zemini `renkler.zemin` ile eşleşiyor', () => {
    const acilis = APP_JSON.expo.splash?.backgroundColor?.toUpperCase();
    expect(acilis, 'app.json içinde splash.backgroundColor yok').toBeDefined();
    expect(
      acilis,
      'Açılış ekranı paletten ayrıştı: uygulama bir tonda açılıp ilk karede başka ' +
        'bir tona atlar ve Android durum çubuğu kalıcı olarak yanlış kalır.',
    ).toBe(renkler.zemin.toUpperCase());
  });
});
