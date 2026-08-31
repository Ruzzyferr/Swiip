/**
 * Play Console'a AAB yükler (Google Play Developer API).
 *
 * Neden API: paket 68 MB ve tarayıcı otomasyonuyla yükleme denendiğinde CDP kanalı
 * dosyayı taşıyamadı — sekme iki kez çöktü. API tarafında böyle bir sınır yok, ayrıca
 * yükleme tekrarlanabilir ve komut satırından çalışır.
 *
 * Kimlik: Google Cloud servis hesabı JSON'u. Hesabın Play Console'da
 * "Sürümler" yetkisi olmalı, yoksa 401/403 döner.
 *
 *   PLAY_SERVIS_HESABI=<json yolu> node scripts/play-yukle.mjs dene
 *   PLAY_SERVIS_HESABI=<json yolu> node scripts/play-yukle.mjs yukle <aab-yolu> [iz]
 *
 * `iz` varsayılanı `internal`.
 */
import { readFileSync, statSync } from 'node:fs';
import { createSign } from 'node:crypto';

const JSON_YOLU = process.env.PLAY_SERVIS_HESABI;
const PAKET = process.env.PLAY_PAKET_ADI ?? 'app.swiip';

if (!JSON_YOLU) {
  console.error('PLAY_SERVIS_HESABI tanımlı olmalı (servis hesabı JSON yolu).');
  process.exit(2);
}

const hesap = JSON.parse(readFileSync(JSON_YOLU, 'utf8'));

const b64url = (g) =>
  Buffer.from(g).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Servis hesabı JWT'siyle OAuth erişim jetonu alır. */
async function jeton() {
  const simdi = Math.floor(Date.now() / 1000);
  const bas = { alg: 'RS256', typ: 'JWT' };
  const govde = {
    iss: hesap.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: simdi,
    exp: simdi + 3600,
  };
  const veri = `${b64url(JSON.stringify(bas))}.${b64url(JSON.stringify(govde))}`;
  const imzalayici = createSign('RSA-SHA256');
  imzalayici.update(veri);
  const jwt = `${veri}.${b64url(imzalayici.sign(hesap.private_key))}`;

  const y = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const d = await y.json();
  if (!d.access_token) throw new Error('Jeton alınamadı: ' + JSON.stringify(d).slice(0, 300));
  return d.access_token;
}

const TABAN = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

async function cagir(jetonDegeri, yol, secenekler = {}) {
  const y = await fetch(`${TABAN}${yol}`, {
    ...secenekler,
    headers: {
      Authorization: `Bearer ${jetonDegeri}`,
      ...(secenekler.headers ?? {}),
    },
  });
  const metin = await y.text();
  let govde;
  try {
    govde = metin ? JSON.parse(metin) : {};
  } catch {
    govde = { ham: metin.slice(0, 300) };
  }
  if (!y.ok) {
    throw new Error(
      `${y.status} ${yol}\n  ${govde.error?.message ?? JSON.stringify(govde).slice(0, 400)}`,
    );
  }
  return govde;
}

const [, , komut, aabYolu, izArg] = process.argv;
const iz = izArg ?? 'internal';

const t = await jeton();
console.log(`  jeton alındı (${hesap.client_email})`);

if (komut === 'dene') {
  const d = await cagir(t, `/applications/${PAKET}/edits`, { method: 'POST' });
  console.log(`  ERİŞİM VAR — düzenleme açıldı: ${d.id}`);
  await cagir(t, `/applications/${PAKET}/edits/${d.id}`, { method: 'DELETE' });
  console.log('  düzenleme iptal edildi (deneme amaçlıydı)');
} else if (komut === 'yukle') {
  if (!aabYolu) throw new Error('AAB yolu gerekli.');
  const boyut = statSync(aabYolu).size;
  console.log(`  paket: ${aabYolu} (${(boyut / 1024 / 1024).toFixed(1)} MB)`);

  /**
   * Düzenleme ÇAKIŞMASINA dayanıklı yükleme.
   *
   * 2026-08-31'de CI şu hatayla düştü:
   *
   *   400 FAILED_PRECONDITION
   *   "This edit has expired, please create a new Edit."
   *
   * Düzenleme 21:26:05'te açıldı, 74,9 MB'lık paket yüklenirken 21:27:15'te
   * geçersizleşti — yani 70 saniyede. Süre dolmasından değil: Play'de aynı uygulama
   * için AÇILAN HER YENİ DÜZENLEME öncekini geçersiz kılıyor ve o sırada başka bir
   * yerden (yerel bir durum betiği) düzenleme açılmıştı.
   *
   * Ders: Play'de "okuma" gibi görünen bir iş bile düzenleme nesnesi yaratıyor;
   * yayın sırasında paralel bir sorgu yüklemeyi öldürebiliyor. Bunu tamamen
   * engellemek elimizde değil (başka bir makineden de gelebilir), o yüzden yükleme
   * yeniden deniyor: yeni düzenleme aç, paketi tekrar gönder.
   *
   * Yeniden deneme paketi İKİ KEZ yüklemez: ilk denemede yükleme tamamlanmadan
   * hata alınıyor, yani ortada yarım kalmış bir sürüm yok.
   */
  let duzenleme;
  let yuklemeGovde;

  for (let deneme = 1; deneme <= 3; deneme++) {
    duzenleme = await cagir(t, `/applications/${PAKET}/edits`, { method: 'POST' });
    console.log(`  düzenleme: ${duzenleme.id}${deneme > 1 ? ` (${deneme}. deneme)` : ''}`);

    const yukleme = await fetch(
      `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PAKET}/edits/${duzenleme.id}/bundles?uploadType=media`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(boyut),
        },
        body: readFileSync(aabYolu),
      },
    );
    yuklemeGovde = await yukleme.json();
    if (yukleme.ok) break;

    const metin = JSON.stringify(yuklemeGovde);
    const cakisma = yukleme.status === 400 && /expired|FAILED_PRECONDITION/i.test(metin);
    if (!cakisma || deneme === 3) {
      throw new Error(`Yükleme başarısız ${yukleme.status}: ${metin.slice(0, 400)}`);
    }
    console.log(`  düzenleme geçersizleşti (başka bir düzenleme açılmış) — yeniden deneniyor`);
  }
  const surumKodu = yuklemeGovde.versionCode;
  console.log(`  yüklendi — versionCode ${surumKodu}, sha1 ${yuklemeGovde.sha1}`);

  await cagir(t, `/applications/${PAKET}/edits/${duzenleme.id}/tracks/${iz}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      track: iz,
      releases: [{ versionCodes: [String(surumKodu)], status: 'draft' }],
    }),
  });
  console.log(`  "${iz}" izine taslak sürüm olarak atandı`);

  const sonuc = await cagir(t, `/applications/${PAKET}/edits/${duzenleme.id}:commit`, {
    method: 'POST',
  });
  console.log(`  işlendi: ${sonuc.id}`);
} else {
  console.log('komut: dene | yukle <aab-yolu> [iz]');
}
