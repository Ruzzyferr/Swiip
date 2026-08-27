/**
 * App Store ekran görüntülerini değiştirir.
 *
 * NEDEN: Apple 2026-08-27'de Guideline 2.3.10 ile reddetti — yüklü altı görüntü
 * Android emülatöründe çekilmişti ve üst şeritte Android durum çubuğu vardı.
 * Temizlenmiş sürümü `scripts/appstore-ekranlari-uret.py` üretiyor.
 *
 *   node scripts/apple-ekranlari-yukle.mjs           # ne yapacağını yazar
 *   node scripts/apple-ekranlari-yukle.mjs --yaz
 *
 * Yükleme üç adımlı ve her adımı Apple ayrı doğruluyor:
 *   1. POST /appScreenshots        → yükleme adresleri (upload operations) döner
 *   2. PUT  her parça              → dosyayı parça parça gönder
 *   3. PATCH uploaded:true + md5   → Apple sağlamayı kendisi kontrol eder
 *
 * Eski görüntüler ÖNCE siliniyor: aynı sette hem eskisi hem yenisi kalırsa
 * inceleyici hangisinin geçerli olduğunu bilemez ve sıra da garanti değildir.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createSign } from 'node:crypto';

const APP = '6803979374';
const KLASOR = join(import.meta.dirname, '..', 'magaza', 'appstore', 'ekranlar');
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

const sv = await cagir(`/apps/${APP}/appStoreVersions?limit=1`);
const surum = sv.d.data[0];
console.log('sürüm:', surum.attributes.versionString, '|', surum.attributes.appStoreState);

const loc = await cagir(`/appStoreVersions/${surum.id}/appStoreVersionLocalizations`);
const yerel = loc.d.data[0];
console.log('dil  :', yerel.attributes.locale);

const setler = await cagir(`/appStoreVersionLocalizations/${yerel.id}/appScreenshotSets`);
if (!setler.d.data?.length) {
  console.error('Ekran görüntüsü seti yok.');
  process.exit(1);
}

const dosyalar = readdirSync(KLASOR)
  .filter((f) => f.toLowerCase().endsWith('.png'))
  .sort();
console.log('yerel dosya:', dosyalar.length, '→', KLASOR);

for (const set of setler.d.data) {
  const tur = set.attributes.screenshotDisplayType;
  const mevcut = await cagir(`/appScreenshotSets/${set.id}/appScreenshots?limit=20`);
  console.log(`\nset ${tur}: ${(mevcut.d.data || []).length} mevcut görüntü`);

  if (!YAZ) {
    console.log(`  silinecek: ${(mevcut.d.data || []).length}, yüklenecek: ${dosyalar.length}`);
    continue;
  }

  for (const g of mevcut.d.data || []) {
    const y = await cagir(`/appScreenshots/${g.id}`, { method: 'DELETE' });
    console.log('  silindi:', g.attributes.fileName, y.k);
  }

  for (const ad of dosyalar) {
    const veri = readFileSync(join(KLASOR, ad));

    const olustur = await cagir('/appScreenshots', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'appScreenshots',
          attributes: { fileName: basename(ad), fileSize: veri.length },
          relationships: {
            appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } },
          },
        },
      }),
    });
    if (olustur.k >= 400) {
      console.error('  OLUŞTURULAMADI:', ad, olustur.k, JSON.stringify(olustur.d).slice(0, 250));
      continue;
    }

    const kimlik = olustur.d.data.id;
    const parcalar = olustur.d.data.attributes.uploadOperations || [];

    for (const p of parcalar) {
      const dilim = veri.subarray(p.offset, p.offset + p.length);
      const basliklar = {};
      for (const h of p.requestHeaders || []) basliklar[h.name] = h.value;
      const r = await fetch(p.url, { method: p.method, headers: basliklar, body: dilim });
      if (!r.ok) console.error('  parça hatası:', ad, r.status);
    }

    const md5 = createHash('md5').update(veri).digest('hex');
    const bitir = await cagir(`/appScreenshots/${kimlik}`, {
      method: 'PATCH',
      body: JSON.stringify({
        data: {
          type: 'appScreenshots',
          id: kimlik,
          attributes: { uploaded: true, sourceFileChecksum: md5 },
        },
      }),
    });
    console.log(`  yüklendi: ${ad}  ${bitir.k}`);
  }
}

if (YAZ) {
  const son = await cagir(`/appScreenshotSets/${setler.d.data[0].id}/appScreenshots?limit=20`);
  console.log('\nsette şimdi:', (son.d.data || []).length, 'görüntü');
  for (const g of son.d.data || []) {
    console.log('  ', g.attributes.fileName, '|', g.attributes.assetDeliveryState?.state ?? '?');
  }
} else {
  console.log('\n(deneme modu — hiçbir şey değişmedi; --yaz ile uygula)');
}
