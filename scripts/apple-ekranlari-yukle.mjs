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
const YAZ = process.argv.includes('--yaz');

/** `--set APP_IPAD_PRO_3GEN_129` ile tek set islenir; verilmezse hepsi. */
const SECILEN = (process.argv.find((a) => a.startsWith('--set=')) || '').slice(6);

/**
 * Hangi ekran boyutu hangi klasorden beslenir.
 *
 * iPad seti 2026-08-28'de eklendi: `supportsTablet` acilinca App Store 13 inc
 * seti ZORUNLU kiliyor. Gecerli tur adi `APP_IPAD_PRO_3GEN_129` (2048x2732);
 * `APP_IPAD_13` diye bir deger YOK (API 409 ile reddediyor, denendi).
 *
 * Set yoksa olusturuluyor. Dikkat: surum INCELEMEDEYKEN set olusturulamiyor
 * ("Can't Create Screenshot Set while In Review") -- once gonderimi iptal et.
 */
const KLASORLER = {
  tr: {
    APP_IPHONE_67: join(import.meta.dirname, '..', 'magaza', 'appstore', 'ekranlar'),
    APP_IPAD_PRO_3GEN_129: join(import.meta.dirname, '..', 'magaza', 'appstore', 'ekranlar-ipad'),
  },
  'en-US': {
    APP_IPHONE_67: join(import.meta.dirname, '..', 'magaza', 'appstore', 'ekranlar-en'),
    APP_IPAD_PRO_3GEN_129: join(
      import.meta.dirname,
      '..',
      'magaza',
      'appstore',
      'ekranlar-ipad-en',
    ),
  },
};

/*
  Dil ARTIK SECILIYOR.

  Once `loc.d.data[0]` yaziliyordu: tek yerellestirme varken dogru, on bir dil
  eklendikten sonra hangi dile yazacagi sansa kalmis olurdu. Uygulama 175 ulkeye
  aciliyor ve her yerellestirmenin kendi ekran goruntusu var.
*/
const DIL = (process.argv.find((a) => a.startsWith('--dil=')) || '--dil=tr').split('=')[1];
const SETLER = Object.entries(KLASORLER[DIL] ?? {}).map(([tur, klasor]) => ({ tur, klasor }));
if (SETLER.length === 0) {
  console.error(`Bu dil icin klasor tanimli degil: ${DIL}`);
  process.exit(2);
}

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

const loc = await cagir(`/appStoreVersions/${surum.id}/appStoreVersionLocalizations?limit=50`);
const yerel = loc.d.data.find((x) => x.attributes.locale === DIL);
if (!yerel) {
  console.error(`Surumde ${DIL} yerellestirmesi yok. Once metinleri ekle.`);
  process.exit(2);
}
console.log('dil  :', yerel.attributes.locale);

const mevcutSetler = await cagir(`/appStoreVersionLocalizations/${yerel.id}/appScreenshotSets`);
const setEsleme = new Map(
  (mevcutSetler.d.data || []).map((x) => [x.attributes.screenshotDisplayType, x.id]),
);
console.log('mevcut setler:', [...setEsleme.keys()].join(', ') || '(yok)');

for (const { tur, klasor } of SETLER) {
  if (SECILEN && tur !== SECILEN) continue;
  const dosyalar = readdirSync(klasor)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort();
  console.log(`\n=== ${tur} — ${dosyalar.length} dosya (${klasor})`);

  let setId = setEsleme.get(tur);
  if (!setId) {
    if (!YAZ) {
      console.log('  set yok; --yaz ile oluşturulacak');
      continue;
    }
    const olustur = await cagir('/appScreenshotSets', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'appScreenshotSets',
          attributes: { screenshotDisplayType: tur },
          relationships: {
            appStoreVersionLocalization: {
              data: { type: 'appStoreVersionLocalizations', id: yerel.id },
            },
          },
        },
      }),
    });
    if (olustur.k >= 400) {
      console.error('  SET OLUŞTURULAMADI:', olustur.k, JSON.stringify(olustur.d).slice(0, 240));
      continue;
    }
    setId = olustur.d.data.id;
    console.log('  set oluşturuldu:', setId);
  }

  const mevcut = await cagir(`/appScreenshotSets/${setId}/appScreenshots?limit=20`);
  console.log(`  ${(mevcut.d.data || []).length} mevcut görüntü`);

  if (!YAZ) {
    console.log(`  silinecek: ${(mevcut.d.data || []).length}, yüklenecek: ${dosyalar.length}`);
    continue;
  }

  for (const g of mevcut.d.data || []) {
    const y = await cagir(`/appScreenshots/${g.id}`, { method: 'DELETE' });
    console.log('  silindi:', g.attributes.fileName, y.k);
  }

  for (const ad of dosyalar) {
    const veri = readFileSync(join(klasor, ad));

    const olustur = await cagir('/appScreenshots', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'appScreenshots',
          attributes: { fileName: basename(ad), fileSize: veri.length },
          relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } },
        },
      }),
    });
    if (olustur.k >= 400) {
      console.error('  OLUŞTURULAMADI:', ad, olustur.k, JSON.stringify(olustur.d).slice(0, 250));
      continue;
    }

    const kimlik = olustur.d.data.id;
    for (const p of olustur.d.data.attributes.uploadOperations || []) {
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

  const son = await cagir(`/appScreenshotSets/${setId}/appScreenshots?limit=20`);
  const durum = (son.d.data || []).map((g) => g.attributes.assetDeliveryState?.state ?? '?');
  console.log(`  sette şimdi: ${durum.length} görüntü — ${durum.join(', ')}`);
}

if (!YAZ) console.log('\n(deneme modu — hiçbir şey değişmedi; --yaz ile uygula)');
