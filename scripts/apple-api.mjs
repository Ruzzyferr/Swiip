/**
 * App Store Connect API istemcisi.
 *
 * Neden var: `eas build --platform ios` ilk kez çalışırken dağıtım sertifikasını ve
 * profilini kurmak için **etkileşimli onay** istiyor; `--non-interactive` ve
 * `--freeze-credentials` ile de vazgeçmiyor. Bu ortamda etkileşimli komut
 * çalıştırılamıyor. Çözüm: kimlik bilgilerini Apple'ın API'siyle burada üretip EAS'e
 * `credentials.json` üzerinden dosya olarak vermek.
 *
 * Kimlik: .p8 özel anahtarıyla imzalanan ES256 JWT. Anahtar üçlüsü ortamdan okunur —
 * depoya girmez.
 *
 *   EXPO_ASC_API_KEY_PATH  .p8 dosyasının yolu
 *   EXPO_ASC_KEY_ID        anahtar kimliği
 *   EXPO_ASC_ISSUER_ID     yayıncı kimliği
 *
 * Kullanım:
 *   node scripts/apple-api.mjs listele <kaynak>          ör: bundleIds, certificates, profiles
 *   node scripts/apple-api.mjs kimlik-ekle <bundle-id> <ad>
 */
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const ANAHTAR_YOLU = process.env.EXPO_ASC_API_KEY_PATH;
const ANAHTAR_ID = process.env.EXPO_ASC_KEY_ID;
const YAYINCI_ID = process.env.EXPO_ASC_ISSUER_ID;

if (!ANAHTAR_YOLU || !ANAHTAR_ID || !YAYINCI_ID) {
  console.error('EXPO_ASC_API_KEY_PATH, EXPO_ASC_KEY_ID ve EXPO_ASC_ISSUER_ID tanımlı olmalı.');
  process.exit(2);
}

const b64url = (girdi) =>
  Buffer.from(girdi).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * ES256 JWT.
 *
 * Node'un imzası DER biçiminde çıkıyor; JWT ise ham R||S (64 bayt) bekliyor.
 * `dsaEncoding: 'ieee-p1363'` bu dönüşümü yapıyor — atlanırsa Apple 401 döner ve
 * sebebi hiçbir yerde yazmaz.
 */
export function jwtUret() {
  const simdi = Math.floor(Date.now() / 1000);
  const bas = { alg: 'ES256', kid: ANAHTAR_ID, typ: 'JWT' };
  const govde = {
    iss: YAYINCI_ID,
    iat: simdi,
    exp: simdi + 19 * 60, // Apple üst sınırı 20 dakika
    aud: 'appstoreconnect-v1',
  };
  const veri = `${b64url(JSON.stringify(bas))}.${b64url(JSON.stringify(govde))}`;
  const imzalayici = createSign('SHA256');
  imzalayici.update(veri);
  const imza = imzalayici.sign({
    key: readFileSync(ANAHTAR_YOLU, 'utf8'),
    dsaEncoding: 'ieee-p1363',
  });
  return `${veri}.${b64url(imza)}`;
}

const TABAN = 'https://api.appstoreconnect.apple.com/v1';

export async function apple(yol, secenekler = {}) {
  const yanit = await fetch(`${TABAN}${yol}`, {
    ...secenekler,
    headers: {
      Authorization: `Bearer ${jwtUret()}`,
      'Content-Type': 'application/json',
      ...(secenekler.headers ?? {}),
    },
  });
  const metin = await yanit.text();
  let govde;
  try {
    govde = metin ? JSON.parse(metin) : {};
  } catch {
    govde = { hamYanit: metin.slice(0, 400) };
  }
  if (!yanit.ok) {
    const hatalar = (govde.errors ?? [])
      .map((h) => `${h.status} ${h.code}: ${h.title} — ${h.detail ?? ''}`)
      .join('\n  ');
    throw new Error(`${yanit.status} ${yol}\n  ${hatalar || JSON.stringify(govde).slice(0, 300)}`);
  }
  return govde;
}

// --- komut satırı ---
const [, , komut, arg1, arg2] = process.argv;

if (komut === 'listele') {
  const kaynak = arg1 ?? 'bundleIds';
  const d = await apple(`/${kaynak}?limit=200`);
  console.log(`${kaynak}: ${d.data?.length ?? 0} kayıt`);
  for (const k of d.data ?? []) {
    const a = k.attributes ?? {};
    console.log(
      `  ${k.id}  ${a.identifier ?? a.name ?? ''}  ${a.certificateType ?? a.profileType ?? ''} ${a.expirationDate ?? ''}`,
    );
  }
} else if (komut === 'kimlik-ekle') {
  const d = await apple('/bundleIds', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'bundleIds',
        attributes: { identifier: arg1, name: arg2 ?? arg1, platform: 'IOS' },
      },
    }),
  });
  console.log('eklendi:', d.data.id, d.data.attributes.identifier);
} else {
  console.log('komut: listele <kaynak> | kimlik-ekle <bundle-id> <ad>');
}
