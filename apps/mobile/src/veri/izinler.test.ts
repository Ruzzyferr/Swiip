import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Android izinleri — istemediğimiz izinler manifest birleşmesiyle sızmasın.
 *
 * `app.json` yalnızca CAMERA ve POST_NOTIFICATIONS istiyordu, ama üretilen manifestte
 * dört izin daha vardı: bağımlılıkların kendi manifestleri birleşme sırasında ekliyor.
 * Bu sessiz bir süreç — derleme uyarı üretmiyor, kod incelemesinde de görünmüyor.
 *
 * Somut bedeli Play Console'da görüldü:
 *
 *   "Your app uses the android.permission.ACTIVITY_RECOGNITION permission and must
 *    meet Health apps policy requirements."
 *
 * İzni `expo-sensors` ekliyor çünkü paket adım sayarı da içeriyor. Biz yalnızca
 * `Accelerometer` kullanıyoruz (`app/fotograf/cekim.tsx`, telefon dik mi kontrolü) ve
 * ivmeölçer bu izni GEREKTİRMİYOR — izin yalnızca adım sayar/etkinlik tanıma sensörleri
 * için. Yani hiç kullanmadığımız bir yetenek yüzünden bütün bir politika yükümlülüğü
 * doğuyordu.
 *
 * Diğer üçü de gereksiz:
 *  - `SYSTEM_ALERT_WINDOW` React Native'in geliştirici katmanından geliyor. "Diğer
 *    uygulamaların üzerine çiz" izni, gizlilikle pazarlanan bir sağlık uygulamasının
 *    mağaza listesinde görünmesi en kötü izinlerden biri. Zaten kullanıcı elle
 *    vermeden çalışmıyor, yani engellemek hiçbir işlevi bozmuyor.
 *  - `READ/WRITE_EXTERNAL_STORAGE` targetSdk 30'dan itibaren etkisiz; dışa aktarma
 *    kendi kapsamlı depomuza yazıyor. Yalnızca izin listesini şişiriyorlar ve
 *    Play veri güvenliği formunu yanlış tarafa çekiyorlar.
 *
 * Kalıcı yer `app.json`: `android/` bir çıktı klasörü ve her `expo prebuild` sıfırlıyor.
 */

const buradan = dirname(fileURLToPath(import.meta.url));
const uygulamaJson = resolve(buradan, '../../app.json');

/** Manifeste sızmaması gereken izinler. Yenisi görülürse buraya eklenir. */
const ENGELLENMESI_GEREKENLER = [
  'android.permission.ACTIVITY_RECOGNITION',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

/** Gerçekten kullandığımız izinler. Listeye ekleme yapmadan önce nedenini yaz. */
const BEKLENEN_IZINLER = ['android.permission.CAMERA', 'android.permission.POST_NOTIFICATIONS'];

describe('Android izinleri', () => {
  const yapilandirma = JSON.parse(readFileSync(uygulamaJson, 'utf8')) as {
    expo: { android?: { permissions?: string[]; blockedPermissions?: string[] } };
  };
  const android = yapilandirma.expo.android ?? {};

  it('yalnızca gerçekten kullandığımız izinler isteniyor', () => {
    expect(android.permissions).toEqual(BEKLENEN_IZINLER);
  });

  it('bağımlılıkların eklediği izinler engelleniyor', () => {
    for (const izin of ENGELLENMESI_GEREKENLER) {
      expect(android.blockedPermissions ?? [], `${izin} engellenmiş olmalı`).toContain(izin);
    }
  });

  it('istenen ve engellenen listeler çelişmiyor', () => {
    const kesisim = (android.permissions ?? []).filter((i) =>
      (android.blockedPermissions ?? []).includes(i),
    );
    expect(kesisim, 'aynı izin hem istenip hem engellenemez').toEqual([]);
  });
});
