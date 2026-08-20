import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Parola saklama.
 *
 * scrypt seçildi: Node'un içinde, yerel derleme gerektirmiyor ve bellek-zor bir
 * fonksiyon. Yerel bağımlılık gerektiren argon2/bcrypt paketleri tek geliştiricili
 * bir projede dağıtımı kırılgan hâle getiriyor; scrypt doğru parametrelerle yeterli.
 *
 * Parametreler hash'in içine yazılır: ileride maliyeti artırırsak eski hash'ler
 * doğrulanmaya devam eder.
 */

function scryptAsync(
  parola: string,
  tuz: Buffer,
  uzunluk: number,
  secenekler: ScryptOptions,
): Promise<Buffer> {
  return new Promise((coz, reddet) => {
    scrypt(parola, tuz, uzunluk, secenekler, (hata, anahtar) => {
      if (hata) reddet(hata);
      else coz(anahtar);
    });
  });
}

const ALGORITMA = 'scrypt';
/** OWASP önerisi: N=2^17, r=8, p=1 (yaklaşık 128 MB bellek). */
const N = 2 ** 17;
const R = 8;
const P = 1;
const ANAHTAR_UZUNLUGU = 64;
const TUZ_UZUNLUGU = 16;
/** scrypt varsayılan bellek sınırı N=2^17 için yetmez. */
const MAX_BELLEK = 256 * 1024 * 1024;

export async function parolaHashle(parola: string): Promise<string> {
  const tuz = randomBytes(TUZ_UZUNLUGU);
  const anahtar = await scryptAsync(parola, tuz, ANAHTAR_UZUNLUGU, {
    N,
    r: R,
    p: P,
    maxmem: MAX_BELLEK,
  });

  return [ALGORITMA, N, R, P, tuz.toString('base64'), anahtar.toString('base64')].join('$');
}

export async function parolaKarsilastir(parola: string, hash: string): Promise<boolean> {
  if (!parola || !hash) return false;

  const parcalar = hash.split('$');
  if (parcalar.length !== 6 || parcalar[0] !== ALGORITMA) return false;

  const [, nMetin, rMetin, pMetin, tuzB64, anahtarB64] = parcalar;
  const n = Number(nMetin);
  const r = Number(rMetin);
  const p = Number(pMetin);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  try {
    const tuz = Buffer.from(tuzB64!, 'base64');
    const beklenen = Buffer.from(anahtarB64!, 'base64');
    const hesaplanan = await scryptAsync(parola, tuz, beklenen.length, {
      N: n,
      r,
      p,
      maxmem: MAX_BELLEK,
    });

    // Sabit zamanlı karşılaştırma: yanıt süresinden bilgi sızmasın.
    return hesaplanan.length === beklenen.length && timingSafeEqual(hesaplanan, beklenen);
  } catch {
    return false;
  }
}

export interface ParolaGucSonucu {
  gecerli: boolean;
  mesaj?: string;
}

const ASGARI_UZUNLUK = 10;

/** Türkiye'de en sık kullanılan parolalar ve klavye dizileri. */
const YAYGIN_PAROLALAR = [
  '12345678901',
  '123456789',
  '1234567890',
  'parola12345',
  'password',
  'qwerty123',
  'asdasd123',
  'made2fit',
  'iloveyou',
  'sifre123',
];

export function parolaGucKontrolu(parola: string): ParolaGucSonucu {
  if (parola.length < ASGARI_UZUNLUK) {
    return {
      gecerli: false,
      mesaj: `Parolan en az ${ASGARI_UZUNLUK} karakter olmalı. Uzunluk, karmaşıklıktan daha çok işe yarar.`,
    };
  }

  const kucuk = parola.toLocaleLowerCase('tr-TR');
  if (YAYGIN_PAROLALAR.some((y) => kucuk.includes(y))) {
    return {
      gecerli: false,
      mesaj:
        'Bu parola çok yaygın kullanılıyor. Aklında kalacak ama tahmin edilmeyecek bir şey seç.',
    };
  }

  const cesitlilik = [/[a-zçğıöşü]/, /[A-ZÇĞİÖŞÜ]/, /\d/, /[^\wçğıöşüÇĞİÖŞÜ]/].filter((d) =>
    d.test(parola),
  ).length;

  if (cesitlilik < 2) {
    return {
      gecerli: false,
      mesaj:
        'Parolanda en az iki farklı karakter türü olsun: küçük harf, büyük harf, rakam veya işaret.',
    };
  }

  return { gecerli: true };
}

/** Yenileme tokenları veritabanında ham hâlde saklanmaz. */
export function tokenOzeti(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenUret(): string {
  return randomBytes(32).toString('base64url');
}
