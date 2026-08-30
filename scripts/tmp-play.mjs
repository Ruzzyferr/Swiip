import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const PAKET = 'app.swiip';
const hesap = JSON.parse(readFileSync(process.env.PLAY_SERVIS_HESABI, 'utf8'));
const b64url = (g) =>
  Buffer.from(g).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const simdi = Math.floor(Date.now() / 1000);
const veri = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(
  JSON.stringify({
    iss: hesap.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: simdi,
    exp: simdi + 3600,
  }),
)}`;
const imza = createSign('RSA-SHA256').update(veri).sign(hesap.private_key);
const jetonYanit = await (
  await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${veri}.${b64url(imza)}`,
    }),
  })
).json();
const jeton = jetonYanit.access_token;

const cagir = async (yol, secenek = {}) => {
  const y = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PAKET}${yol}`,
    { ...secenek, headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' } },
  );
  const g = await y.text();
  if (!y.ok) throw new Error(`${y.status} ${yol}\n${g.slice(0, 300)}`);
  return g ? JSON.parse(g) : {};
};

const { id } = await cagir('/edits', { method: 'POST' });
for (const iz of ['internal', 'alpha', 'beta', 'production']) {
  try {
    const t = await cagir(`/edits/${id}/tracks/${iz}`);
    const sr = (t.releases ?? []).map(
      (r) => `${r.status} vc=${(r.versionCodes ?? []).join(',')}${r.userFraction ? ` %${r.userFraction * 100}` : ''}`,
    );
    console.log(iz.padEnd(11), sr.length ? sr.join(' | ') : '(surum yok)');
  } catch (h) {
    console.log(iz.padEnd(11), 'HATA', String(h.message).split('\n')[0]);
  }
}
const b = await cagir(`/edits/${id}/bundles`);
console.log('Yuklu AAB versionCode:', (b.bundle ?? []).map((x) => x.versionCode).join(', '));
await cagir(`/edits/${id}`, { method: 'DELETE' });
