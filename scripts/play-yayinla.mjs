/**
 * Play izindeki `draft` sürümü yayına alır.
 *
 * Neden ayrı bir betik: `eas submit` paketi yüklüyor ama sürümü **taslak** bırakıyor.
 * Taslak sürüm test cihazlarına inmiyor — konsolda "yüklendi" görünürken kimse
 * uygulamayı kuramıyor. Aradaki farkı yalnızca izin kendisini okumak gösteriyor,
 * o yüzden bu betik hem yayına alıyor hem de sonucu geri okuyup doğruluyor.
 *
 *   PLAY_SERVIS_HESABI=<json yolu> node scripts/play-yayinla.mjs <iz> <versionCode>
 */
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const PAKET = process.env.PLAY_PAKET_ADI ?? 'app.swiip';
const [IZ, SURUM_KODU] = process.argv.slice(2);
if (!IZ || !SURUM_KODU) {
  console.error('kullanım: play-yayinla.mjs <iz> <versionCode>');
  process.exit(2);
}
if (!process.env.PLAY_SERVIS_HESABI) {
  console.error('PLAY_SERVIS_HESABI tanımlı olmalı.');
  process.exit(2);
}
const hesap = JSON.parse(readFileSync(process.env.PLAY_SERVIS_HESABI, 'utf8'));

const b64url = (g) =>
  Buffer.from(g).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function jetonAl() {
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
  const yanit = await (
    await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${veri}.${b64url(imza)}`,
      }),
    })
  ).json();
  if (!yanit.access_token) throw new Error(`jeton alınamadı: ${JSON.stringify(yanit)}`);
  return yanit.access_token;
}

const jeton = await jetonAl();
const cagir = async (yol, secenek = {}) => {
  const yanit = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PAKET}${yol}`,
    {
      ...secenek,
      headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' },
    },
  );
  const govde = await yanit.text();
  if (!yanit.ok) throw new Error(`${yanit.status} ${yol}\n${govde}`);
  return govde ? JSON.parse(govde) : {};
};

const NOTLAR = `Alerji filtresi düzeltildi: dokuz alerjenin dördü hiç eşleşmiyordu.
Değerlendirmedeki dört güvenlik kapısının ikisi açılmıyordu; artık açılıyor.
"Fotoğraf çek" gerçekten kamerayı açıyor.
"Aboneliği iptal et" mağazanın abonelik sayfasına götürüyor.
Günlükte yemek adı ve silme düğmesi var.
Kullanılmayan mikrofon izni paketten çıkarıldı.`;

const { id } = await cagir('/edits', { method: 'POST' });
try {
  const once = await cagir(`/edits/${id}/tracks/${IZ}`);
  const hedef = (once.releases ?? []).find((s) =>
    (s.versionCodes ?? []).map(String).includes(SURUM_KODU),
  );
  if (!hedef) {
    throw new Error(
      `${IZ} izinde versionCode ${SURUM_KODU} yok. Olanlar: ` +
        JSON.stringify((once.releases ?? []).map((s) => [s.versionCodes, s.status])),
    );
  }
  console.log(`önceki durum: ${hedef.status}`);
  if (hedef.status === 'completed') {
    console.log('zaten yayında, değişiklik yok.');
  } else {
    await cagir(`/edits/${id}/tracks/${IZ}`, {
      method: 'PUT',
      body: JSON.stringify({
        track: IZ,
        releases: [
          {
            name: hedef.name ?? SURUM_KODU,
            versionCodes: [SURUM_KODU],
            status: 'completed',
            releaseNotes: [{ language: 'tr-TR', text: NOTLAR }],
          },
        ],
      }),
    });
    await cagir(`/edits/${id}:commit`, { method: 'POST' });
  }
} catch (hata) {
  await cagir(`/edits/${id}`, { method: 'DELETE' }).catch(() => {});
  throw hata;
}

// Taahhütten SONRA yeni bir düzenlemeyle geri oku: kaydedildiğine dair tek kanıt bu.
const { id: kontrol } = await cagir('/edits', { method: 'POST' });
const sonra = await cagir(`/edits/${kontrol}/tracks/${IZ}`);
await cagir(`/edits/${kontrol}`, { method: 'DELETE' }).catch(() => {});
for (const s of sonra.releases ?? []) {
  console.log(`${IZ}: versionCode ${s.versionCodes} → ${s.status}`);
}
const yayinda = (sonra.releases ?? []).some(
  (s) => s.status === 'completed' && (s.versionCodes ?? []).map(String).includes(SURUM_KODU),
);
if (!yayinda) {
  console.error(`DOĞRULAMA BAŞARISIZ: ${SURUM_KODU} hâlâ yayında değil.`);
  process.exit(1);
}
console.log('doğrulandı: yayında.');
