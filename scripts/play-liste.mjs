/**
 * Play mağaza listesini ve görsellerini API ile yükler.
 *
 * Neden API: Play Console arayüzü Angular Material üstünde ve otomasyona dirençli —
 * sentetik tıklama bileşenin iç modelini güncellemiyor, kaydetme onay diyaloğu
 * çıkarıyor, alanlar görünür alanın altında kalıyor. Aynı işi API tek çağrıda ve
 * doğrulanabilir biçimde yapıyor.
 *
 * Metinlerin kaynağı `magaza/play/liste-tr.md`; orada üç kod bloğu var (ad, kısa
 * açıklama, tam açıklama). Görseller `magaza/play/` altından okunuyor.
 *
 *   PLAY_SERVIS_HESABI=<json yolu> node scripts/play-liste.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSign } from 'node:crypto';

const kok = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAKET = process.env.PLAY_PAKET_ADI ?? 'app.swiip';
const DIL = 'tr-TR';
const JSON_YOLU = process.env.PLAY_SERVIS_HESABI;

if (!JSON_YOLU) {
  console.error('PLAY_SERVIS_HESABI tanımlı olmalı.');
  process.exit(2);
}
const hesap = JSON.parse(readFileSync(JSON_YOLU, 'utf8'));

const b64url = (g) =>
  Buffer.from(g).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function jeton() {
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
  const s = createSign('RSA-SHA256');
  s.update(veri);
  const jwt = `${veri}.${b64url(s.sign(hesap.private_key))}`;
  const y = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const d = await y.json();
  if (!d.access_token) throw new Error('Jeton alınamadı: ' + JSON.stringify(d).slice(0, 200));
  return d.access_token;
}

const TABAN = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

async function cagir(t, yol, secenekler = {}) {
  const y = await fetch(`${TABAN}${yol}`, {
    ...secenekler,
    headers: { Authorization: `Bearer ${t}`, ...(secenekler.headers ?? {}) },
  });
  const metin = await y.text();
  const govde = metin ? JSON.parse(metin) : {};
  if (!y.ok)
    throw new Error(
      `${y.status} ${yol}\n  ${govde.error?.message ?? JSON.stringify(govde).slice(0, 300)}`,
    );
  return govde;
}

/** liste-tr.md içindeki ``` blokları: 0=ad, 1=kısa açıklama, 2=tam açıklama */
function metinler() {
  const ham = readFileSync(join(kok, 'magaza/play/liste-tr.md'), 'utf8');
  const bloklar = [...ham.matchAll(/```\r?\n([\s\S]*?)\r?\n```/g)].map((m) => m[1].trim());
  if (bloklar.length < 3)
    throw new Error(`liste-tr.md içinde 3 blok bekleniyordu, ${bloklar.length} bulundu.`);
  return { ad: bloklar[0], kisa: bloklar[1], tam: bloklar[2] };
}

const t = await jeton();
const { ad, kisa, tam } = metinler();
console.log(`  ad: "${ad}" | kısa: ${kisa.length} krk | tam: ${tam.length} krk`);

const duzenleme = await cagir(t, `/applications/${PAKET}/edits`, { method: 'POST' });
console.log(`  düzenleme: ${duzenleme.id}`);

// --- metinler ---
await cagir(t, `/applications/${PAKET}/edits/${duzenleme.id}/listings/${DIL}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ language: DIL, title: ad, shortDescription: kisa, fullDescription: tam }),
});
console.log('  metinler yazıldı');

// --- görseller ---
const gorseller = [
  { tur: 'icon', yol: 'magaza/play/ikon-512.png' },
  { tur: 'featureGraphic', yol: 'magaza/play/one-cikan-1024x500.png' },
];
const ekranlariEkle = (dizin, tur) => {
  const tam = join(kok, dizin);
  if (!existsSync(tam)) return;
  for (const dosya of readdirSync(tam)
    .filter((d) => /\.(png|jpg|jpeg)$/i.test(d))
    .sort()) {
    gorseller.push({ tur, yol: `${dizin}/${dosya}` });
  }
};

ekranlariEkle('magaza/play/ekranlar', 'phoneScreenshots');

/*
  Tablet görüntüleri.

  Play, büyük ekran yuvaları boşken uygulamayı tablet ve Chromebook
  koleksiyonlarında geri plana atıyor; telefon görüntüsünü tablet yuvasına
  koymak ise gerilmiş görünüyor ve mağaza kalite puanını düşürüyor.

  Kaynak `magaza/tablet/ekranlar/` — iPad seti için çekilen HAM kopya. Orada
  Android durum çubuğu duruyor ve Play için DOĞRU olan bu; App Store kopyasında
  şerit siliniyor (`scripts/appstore-ekranlari-uret.py`).

  Aynı görüntü iki yuvaya da giriyor: 2048x2732 hem 7 hem 10 inç için geçerli.
*/
ekranlariEkle('magaza/tablet/ekranlar', 'sevenInchScreenshots');
ekranlariEkle('magaza/tablet/ekranlar', 'tenInchScreenshots');

// Aynı türü ikinci kez yüklerken önce mevcutları silmek gerekiyor, yoksa birikiyorlar.
const silinen = new Set();
for (const g of gorseller) {
  if (!silinen.has(g.tur)) {
    await cagir(t, `/applications/${PAKET}/edits/${duzenleme.id}/listings/${DIL}/${g.tur}`, {
      method: 'DELETE',
    }).catch(() => {});
    silinen.add(g.tur);
  }
  const tamYol = join(kok, g.yol);
  const y = await fetch(
    `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PAKET}/edits/${duzenleme.id}/listings/${DIL}/${g.tur}?uploadType=media`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'image/png' },
      body: readFileSync(tamYol),
    },
  );
  const d = await y.json();
  if (!y.ok) throw new Error(`${g.yol} yüklenemedi: ${JSON.stringify(d).slice(0, 300)}`);
  console.log(`  ${g.tur.padEnd(17)} ${g.yol.split('/').pop()}`);
}

const sonuc = await cagir(t, `/applications/${PAKET}/edits/${duzenleme.id}:commit`, {
  method: 'POST',
});
console.log(`  işlendi: ${sonuc.id}`);
