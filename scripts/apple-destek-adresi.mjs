/**
 * App Store'daki Support URL'i destek sayfasına çevirir.
 *
 * Apple 2026-08-27'de Guideline 1.5 ile reddetti:
 *
 *   "The Support URL provided in App Store Connect, https://swiip.app, does not
 *    direct to a website with information users can use to ask questions and
 *    request support."
 *
 * Doğru teşhis: alan adı çalışıyordu ama ana sayfa bir DESTEK sayfası değil —
 * pazarlama sayfası. Apple'ın istediği, kullanıcının soru sorabileceği ve yardım
 * isteyebileceği bir sayfa.
 *
 *   node scripts/apple-destek-adresi.mjs           # ne yazacağını gösterir
 *   node scripts/apple-destek-adresi.mjs --yaz
 *
 * Yazdıktan sonra alanı geri okuyup doğruluyor ve adresin gerçekten 200 döndüğünü
 * ağdan sınıyor — "girdim" demek yetmiyor, Apple tıklıyor.
 */
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const APP = '6803979374';
const DESTEK = 'https://swiip.app/destek.html';
const YAZ = process.argv.includes('--yaz');

const b = (g) =>
  Buffer.from(g).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const n = Math.floor(Date.now() / 1000);
const v =
  `${b(JSON.stringify({ alg: 'ES256', kid: process.env.EXPO_ASC_KEY_ID, typ: 'JWT' }))}.` +
  `${b(JSON.stringify({ iss: process.env.EXPO_ASC_ISSUER_ID, iat: n, exp: n + 1200, aud: 'appstoreconnect-v1' }))}`;
const sig = createSign('SHA256')
  .update(v)
  .sign({ key: readFileSync(process.env.EXPO_ASC_API_KEY_PATH), dsaEncoding: 'ieee-p1363' });
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
    return { k: r.status, d: t ? JSON.parse(t) : null };
  } catch {
    return { k: r.status, d: t.slice(0, 400) };
  }
};

// Adres gerçekten yayında mı? Apple bunu tıklıyor.
const yanit = await fetch(DESTEK, { redirect: 'follow' }).catch(() => null);
console.log('destek sayfası :', yanit ? yanit.status : 'ULAŞILAMADI', DESTEK);
if (!yanit || !yanit.ok) {
  console.error('Sayfa 200 dönmüyor. Önce dağıt, sonra bu betiği çalıştır.');
  process.exit(1);
}

const sv = await cagir(`/apps/${APP}/appStoreVersions?limit=1`);
const surum = sv.d.data[0];
const loc = await cagir(`/appStoreVersions/${surum.id}/appStoreVersionLocalizations`);

console.log('sürüm durumu   :', surum.attributes.appStoreState);

for (const l of loc.d.data || []) {
  const mevcut = l.attributes.supportUrl;
  console.log(`\n[${l.attributes.locale}] supportUrl: ${mevcut}`);

  if (mevcut === DESTEK) {
    console.log('  zaten doğru — dokunulmadı.');
    continue;
  }
  if (!YAZ) {
    console.log(`  yazılacak: ${DESTEK}   (deneme modu)`);
    continue;
  }

  const y = await cagir(`/appStoreVersionLocalizations/${l.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: {
        type: 'appStoreVersionLocalizations',
        id: l.id,
        attributes: { supportUrl: DESTEK },
      },
    }),
  });
  console.log('  PATCH:', y.k, y.k >= 400 ? JSON.stringify(y.d).slice(0, 300) : 'OK');

  const kontrol = await cagir(`/appStoreVersionLocalizations/${l.id}`);
  console.log('  geri okundu:', kontrol.d?.data?.attributes?.supportUrl);
}
