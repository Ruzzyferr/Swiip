/**
 * Google Play mağaza listesini her dilde yazar — kaynak `magaza/appstore/yereller/*.json`
 * içindeki `play` alanı (App Store metniyle aynı dosya, aynı ölçüm).
 *
 * Play listesi 2026-10-06'ya kadar yalnızca tr-TR idi: Play'de başka dilde arayan biri
 * uygulamayı hiç bulamazdı. Play adı, kısa açıklamayı VE tam açıklamayı tarıyor; terimler
 * dil başına arama önerilerinden ölçüldü (`scripts/aso-oneri.mjs`).
 *
 * Görsellere dokunmuyor: dil başına görsel yoksa Play varsayılan dilin (tr-TR) görsellerini
 * gösteriyor. Görseller `play-liste.mjs` ile yönetiliyor.
 *
 *     PLAY_SERVIS_HESABI=… node scripts/play-yereller.mjs          # yalnız denetler
 *     PLAY_SERVIS_HESABI=… node scripts/play-yereller.mjs --yaz    # YAZAR ve işler
 */
import { createSign } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAKET = process.env.PLAY_PAKET_ADI ?? 'app.swiip';
const YAZ = process.argv.includes('--yaz');
const DIZIN = 'magaza/appstore/yereller';
const uzunluk = (s) => [...(s ?? '')].length;

const listeler = readdirSync(DIZIN)
  .filter((d) => d.endsWith('.json'))
  .map((d) => JSON.parse(readFileSync(join(DIZIN, d), 'utf8')))
  .filter((y) => y.play)
  .map((y) => y.play);

const hatalar = [];
const goruldu = new Set();
for (const p of listeler) {
  if (goruldu.has(p.dil)) hatalar.push(`${p.dil}: iki kez`);
  goruldu.add(p.dil);
  if (!p.title || uzunluk(p.title) > 30) hatalar.push(`${p.dil}: title ${uzunluk(p.title)}`);
  if (!p.shortDescription || uzunluk(p.shortDescription) > 80)
    hatalar.push(`${p.dil}: kısa ${uzunluk(p.shortDescription)}`);
  if (!p.fullDescription || uzunluk(p.fullDescription) > 4000)
    hatalar.push(`${p.dil}: tam ${uzunluk(p.fullDescription)}`);
}
if (hatalar.length) {
  console.error(`Sınır hatası:\n  ${hatalar.join('\n  ')}`);
  process.exit(1);
}
console.log(`${listeler.length} dil: ${listeler.map((p) => p.dil).join(' ')}`);
if (!YAZ) process.exit(0);

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
const imza = createSign('RSA-SHA256');
imza.update(veri);
const { access_token: t } = await (
  await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${veri}.${b64url(imza.sign(hesap.private_key))}`,
    }),
  })
).json();

const TABAN = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PAKET}`;
async function cagir(yol, secenekler = {}) {
  const y = await fetch(`${TABAN}${yol}`, {
    ...secenekler,
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
  });
  const metin = await y.text();
  const govde = metin ? JSON.parse(metin) : {};
  if (!y.ok) throw new Error(`${y.status} ${yol}: ${govde.error?.message ?? metin.slice(0, 200)}`);
  return govde;
}

const duzenleme = await cagir('/edits', { method: 'POST' });
const reddedilen = [];
for (const p of listeler) {
  try {
    await cagir(`/edits/${duzenleme.id}/listings/${p.dil}`, {
      method: 'PUT',
      body: JSON.stringify({
        language: p.dil,
        title: p.title,
        shortDescription: p.shortDescription,
        fullDescription: p.fullDescription,
      }),
    });
    console.log(`  yazıldı  ${p.dil}  "${p.title}"`);
  } catch (h) {
    reddedilen.push(`${p.dil}: ${h.message}`);
  }
}
if (reddedilen.length) {
  // Desteklenmeyen dil kodu tüm düzenlemeyi bozmasın: raporla, kalanları işle.
  console.error(`Reddedilen:\n  ${reddedilen.join('\n  ')}`);
}
await cagir(`/edits/${duzenleme.id}:commit`, { method: 'POST' });

// Geri okuma: yeni bir düzenleme açıp listeyi oku.
const okuma = await cagir('/edits', { method: 'POST' });
const { listings = [] } = await cagir(`/edits/${okuma.id}/listings`);
await cagir(`/edits/${okuma.id}`, { method: 'DELETE' }).catch(() => {});
const okunan = new Map(listings.map((l) => [l.language, l]));
const tutmayan = listeler.filter(
  (p) => !reddedilen.some((r) => r.startsWith(`${p.dil}:`)) && okunan.get(p.dil)?.title !== p.title,
);
console.log(
  `Play'de ${listings.length} dil var; tutmayan: ${tutmayan.map((p) => p.dil).join(' ') || 'yok'}`,
);
process.exit(tutmayan.length || reddedilen.length ? 1 : 0);
