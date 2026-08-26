/**
 * App Store aciklamasina Kullanim Kosullari (EULA) baglantisini ekler.
 *
 * Apple 2026-08-26'da 3.1.2 ile reddetti:
 *   "The submission offers auto-renewable subscriptions but does not include a
 *    functional link to the Terms of Use (EULA) in the app metadata that appears
 *    on the app's App Store product page."
 *
 * Cozum Apple'in kendi cumlesinde: "If you are using the standard Apple Terms of
 * Use (EULA), include a link to the Terms of Use in the App Description."
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const KEY = process.env.EXPO_ASC_API_KEY_PATH;
const KID = process.env.EXPO_ASC_KEY_ID;
const ISS = process.env.EXPO_ASC_ISSUER_ID;
const YAZ = process.argv.includes('--yaz');

const b = (g) =>
  Buffer.from(g).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const n = Math.floor(Date.now() / 1000);
const v = `${b(JSON.stringify({ alg: 'ES256', kid: KID, typ: 'JWT' }))}.${b(JSON.stringify({ iss: ISS, iat: n, exp: n + 1200, aud: 'appstoreconnect-v1' }))}`;
const sig = createSign('SHA256')
  .update(v)
  .sign({ key: readFileSync(KEY), dsaEncoding: 'ieee-p1363' });
const jwt = `${v}.${b(sig)}`;

const cagir = async (yol, secenek = {}) => {
  const r = await fetch('https://api.appstoreconnect.apple.com/v1' + yol, {
    ...secenek,
    headers: {
      authorization: `Bearer ${jwt}`,
      'content-type': 'application/json',
      ...(secenek.headers || {}),
    },
  });
  const t = await r.text();
  try {
    return { k: r.status, d: JSON.parse(t) };
  } catch {
    return { k: r.status, d: t.slice(0, 400) };
  }
};

const EK = `


KULLANIM KOŞULLARI VE GİZLİLİK

Kullanım koşulları (EULA):
https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

Gizlilik politikası:
https://swiip.app/gizlilik.html`;

const sv = await cagir('/apps/6803979374/appStoreVersions?limit=1');
const surumId = sv.d.data[0].id;
console.log('sürüm durumu :', sv.d.data[0].attributes.appStoreState);

const loc = await cagir(`/appStoreVersions/${surumId}/appStoreVersionLocalizations`);
const l = loc.d.data[0];
const mevcut = l.attributes.description || '';

console.log('loc id       :', l.id, '| dil:', l.attributes.locale);
console.log('mevcut uzunluk:', mevcut.length);

if (/stdeula/i.test(mevcut)) {
  console.log('\nEULA bağlantısı ZATEN VAR — dokunulmadı.');
  process.exit(0);
}

const yeni = mevcut.trimEnd() + EK;
console.log(
  'yeni uzunluk  :',
  yeni.length,
  yeni.length > 4000 ? '  <<< 4000 SINIRI AŞILDI' : '  (sınır 4000)',
);

if (yeni.length > 4000) {
  console.error('Açıklama sınırı aşıyor; ekleme yapılmadı.');
  process.exit(1);
}

writeFileSync(
  'C:/Users/ruzzy/AppData/Local/Temp/claude/C--dev-Swiip/8e5b1831-d873-4743-9ed3-fcf6e70b25e9/scratchpad/aciklama-yedek.txt',
  mevcut,
  'utf8',
);
console.log('yedek alındı  : aciklama-yedek.txt');

if (!YAZ) {
  console.log('\n--- EKLENECEK ---');
  console.log(EK);
  console.log('\n(deneme modu — yazılmadı; --yaz ile uygula)');
  process.exit(0);
}

const y = await cagir(`/appStoreVersionLocalizations/${l.id}`, {
  method: 'PATCH',
  body: JSON.stringify({
    data: { type: 'appStoreVersionLocalizations', id: l.id, attributes: { description: yeni } },
  }),
});
console.log('\nPATCH:', y.k);
if (y.k >= 400) {
  console.error(JSON.stringify(y.d).slice(0, 500));
  process.exit(1);
}

// Geri oku ve dogrula.
const kontrol = await cagir(`/appStoreVersionLocalizations/${l.id}`);
const son = kontrol.d.data.attributes.description || '';
console.log('geri okundu   :', son.length, 'karakter');
console.log('EULA var mı   :', /stdeula/i.test(son) ? 'EVET' : 'HAYIR');
console.log('gizlilik var mı:', /swiip\.app\/gizlilik/i.test(son) ? 'EVET' : 'HAYIR');
