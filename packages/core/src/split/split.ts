import type { AntrenmanYasi, GunTipi, SplitPlani } from '@swiip/shared';

/**
 * Split seçimi — spec bölüm 6, aşama 3.
 * Gün sayısı ana sürücü; seans süresi ve antrenman yaşı 3 gün sınırında karar verir.
 */

export interface SplitGirdisi {
  gunSayisi: number;
  antrenmanYasi: AntrenmanYasi;
  seansDakika: number;
}

/** Full body bir seansta tüm vücuda dokunur; bunun altında sığmaz. */
const FULL_BODY_ASGARI_DAKIKA = 45;

export function splitSec(girdi: SplitGirdisi): SplitPlani {
  const gun = Math.min(6, Math.max(1, Math.round(girdi.gunSayisi)));

  if (gun <= 2) {
    return plan(
      'full_body',
      dizile(['full_body'], gun),
      gun,
      gerekceFullBody(gun),
      gun <= 1 ? 'fullBodyTekGun' : 'fullBodyAzGun',
      { gun },
    );
  }

  if (gun === 3) {
    const fullBodyUygun =
      (girdi.antrenmanYasi === 'yeni' || girdi.antrenmanYasi === 'erken') &&
      girdi.seansDakika >= FULL_BODY_ASGARI_DAKIKA;

    if (fullBodyUygun) {
      return plan(
        'full_body',
        ['full_body', 'full_body', 'full_body'],
        gun,
        'Haftada 3 gün antrenman yapabildiğini ve yeni başladığını söyledin. Bu aşamada her ' +
          'seansta tüm vücuda dokunmak, hareketleri daha sık tekrarladığın için tekniği en hızlı ' +
          'oturtan yol.',
        'fullBodyYeni',
      );
    }
    return plan(
      'upper_lower_full',
      ['upper', 'lower', 'full_body'],
      gun,
      girdi.seansDakika < FULL_BODY_ASGARI_DAKIKA
        ? `Haftada 3 gün ve seans başına ${girdi.seansDakika} dakikan var. Tüm vücut bu süreye ` +
            'sığmayacağı için üst, alt ve bir toplayıcı gün olarak böldüm.'
        : 'Haftada 3 günün var ve artık yeni başlayan değilsin. Üst, alt ve bir toplayıcı gün, ' +
            'hem yeterli hacim hem yeterli dinlenme veriyor.',
      girdi.seansDakika < FULL_BODY_ASGARI_DAKIKA ? 'ucGunKisaSeans' : 'ucGunDeneyimli',
      { dakika: girdi.seansDakika },
    );
  }

  if (gun === 4) {
    return plan(
      'upper_lower',
      ['upper', 'lower', 'upper', 'lower'],
      gun,
      'Haftada 4 gün için üst/alt ikilisi iki kez dönüyor. Her kas grubu haftada iki kez uyaran ' +
        'alıyor, aralarda tam bir gün toparlanma kalıyor.',
      'dortGun',
    );
  }

  if (gun === 5) {
    return plan(
      'upper_lower_ppl',
      ['upper', 'lower', 'push', 'pull', 'legs'],
      gun,
      'Haftada 5 gün için iki genel gün ve üç odaklı gün kurdum. Bu yapı hacmi tek seansa ' +
        'yığmadan haftaya dağıtıyor.',
      'besGun',
    );
  }

  return plan(
    'ppl_x2',
    ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
    gun,
    'Haftada 6 gün için itme, çekme ve bacak günleri iki kez dönüyor. Her kas grubu haftada iki ' +
      'kez çalışıyor, seans süreleri kısa kalıyor.',
    'altiGun',
  );
}

function plan(
  tip: SplitPlani['tip'],
  gunler: GunTipi[],
  gunSayisi: number,
  gerekce: string,
  gerekce_anahtari: string,
  gerekce_degerleri?: Record<string, string | number>,
): SplitPlani {
  return {
    tip,
    gun_sayisi: gunSayisi,
    gunler,
    gerekce,
    gerekce_anahtari,
    ...(gerekce_degerleri ? { gerekce_degerleri } : {}),
  };
}

function dizile(desen: GunTipi[], uzunluk: number): GunTipi[] {
  return Array.from({ length: uzunluk }, (_, i) => desen[i % desen.length]!);
}

function gerekceFullBody(gun: number): string {
  return gun <= 1
    ? 'Haftada 1 güne tüm vücudu sığdırmak gerekiyor; bileşik hareketlerle en verimli kesiti aldım.'
    : `Haftada ${gun} gün antrenman yapabiliyorsun. Bu sıklıkta her kas grubuna haftada en az iki ` +
        'kez dokunmanın tek yolu her seansı tüm vücut yapmak.';
}
