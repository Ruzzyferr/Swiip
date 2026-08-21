/**
 * Play abonelik ürünlerini oluşturur/günceller.
 *
 * Ürün kimlikleri koddan geliyor (`apps/mobile/src/odeme/magaza.ts` ve
 * `packages/api/src/rotalar/abonelik.ts`); burada elle yazılmıyor ki ikisi ayrışmasın.
 * Fiyatlar CLAUDE.md'de kilitli: Temel 99₺/690₺, Pro 169₺/1.190₺.
 *
 * Konsolda dört ürünü elle kurmak yerine API: tekrarlanabilir, doğrulanabilir ve
 * fiyat/kimlik yanlışı sessizce geçmiyor.
 *
 *   PLAY_SERVIS_HESABI=<json> node scripts/play-abonelik.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSign } from 'node:crypto';

const kok = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAKET = process.env.PLAY_PAKET_ADI ?? 'app.swiip';
const hesap = JSON.parse(readFileSync(process.env.PLAY_SERVIS_HESABI, 'utf8'));

const b64 = (g) =>
  Buffer.from(g).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function jeton() {
  const simdi = Math.floor(Date.now() / 1000);
  const veri = `${b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64(
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
  const y = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${veri}.${b64(s.sign(hesap.private_key))}`,
    }),
  });
  const d = await y.json();
  if (!d.access_token) throw new Error('Jeton alınamadı: ' + JSON.stringify(d).slice(0, 200));
  return d.access_token;
}

const T = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
let jetonDegeri;

async function cagir(yol, secenekler = {}) {
  const y = await fetch(T + yol, {
    ...secenekler,
    headers: {
      Authorization: `Bearer ${jetonDegeri}`,
      'Content-Type': 'application/json',
      ...(secenekler.headers ?? {}),
    },
  });
  const m = await y.text();
  const b = m ? JSON.parse(m) : {};
  if (!y.ok) throw new Error(`${y.status} ${yol} :: ${(b.error?.message ?? m).slice(0, 300)}`);
  return b;
}

/** Ürün kimliklerini koddan oku — iki yerin ayrışmadığını da doğrular. */
function urunler() {
  const mobil = readFileSync(join(kok, 'apps/mobile/src/odeme/magaza.ts'), 'utf8');
  const api = readFileSync(join(kok, 'packages/api/src/rotalar/abonelik.ts'), 'utf8');

  const satirlar = [
    ...mobil.matchAll(/kod:\s*'(\w+)'\s*,\s*donem:\s*'(\w+)'\s*,\s*urun_id:\s*'([\w_]+)'/g),
  ];
  if (satirlar.length === 0) throw new Error('magaza.ts içinde ürün satırı bulunamadı.');

  return satirlar.map(([, kod, donem, urunId]) => {
    if (!api.includes(urunId)) {
      throw new Error(`"${urunId}" mobilde var ama abonelik.ts'te yok — iki taraf ayrışmış.`);
    }
    return { kod, donem, urunId };
  });
}

/** CLAUDE.md'de kilitli fiyatlar. Değiştirmek ürün kararını değiştirmektir. */
const FIYAT = {
  temel: { aylik: 99, yillik: 690 },
  pro: { aylik: 169, yillik: 1190 },
};

const BASLIK = {
  temel: 'Swiip Temel',
  pro: 'Swiip Pro',
};

const ACIKLAMA = {
  temel: 'Sınırsız program, öğün planı ve ilerleme takibi.',
  pro: 'Temel’in her şeyi, üstüne fotoğraftan yemek tanıma.',
};

const DONEM = { aylik: 'P1M', yillik: 'P1Y' };

jetonDegeri = await jeton();
console.log(`  ${hesap.client_email}`);

const mevcut = await cagir(`/applications/${PAKET}/subscriptions?pageSize=50`).catch(() => ({}));
const mevcutKimlikler = new Set((mevcut.subscriptions ?? []).map((s) => s.productId));
console.log(`  mevcut abonelik: ${mevcutKimlikler.size ? [...mevcutKimlikler].join(', ') : 'yok'}`);

for (const { kod, donem, urunId } of urunler()) {
  const fiyat = FIYAT[kod]?.[donem];
  if (!fiyat) throw new Error(`Fiyat tanımsız: ${kod}/${donem}`);

  const govde = {
    productId: urunId,
    listings: [
      {
        languageCode: 'tr-TR',
        title: `${BASLIK[kod]} (${donem === 'aylik' ? 'aylık' : 'yıllık'})`,
        description: ACIKLAMA[kod],
      },
    ],
    basePlans: [
      {
        basePlanId: donem === 'aylik' ? 'aylik' : 'yillik',
        state: 'DRAFT',
        autoRenewingBasePlanType: {
          billingPeriodDuration: DONEM[donem],
          gracePeriodDuration: 'P7D',
          accountHoldDuration: 'P30D',
          resubscribeState: 'RESUBSCRIBE_STATE_ACTIVE',
          legacyCompatible: false,
        },
        regionalConfigs: [
          {
            regionCode: 'TR',
            newSubscriberAvailability: true,
            price: { currencyCode: 'TRY', units: String(fiyat), nanos: 0 },
          },
        ],
      },
    ],
  };

  if (mevcutKimlikler.has(urunId)) {
    console.log(`  = ${urunId} zaten var, atlandı`);
    continue;
  }

  // Bolgesel fiyat listesinin surumu SORGU parametresi; govdeye konursa
  // "Unknown name regionsVersion" hatasi doner, verilmezse "Regions Version must be specified".
  await cagir(
    `/applications/${PAKET}/subscriptions?productId=${urunId}&regionsVersion.version=2022%2F02`,
    {
      method: 'POST',
      body: JSON.stringify(govde),
    },
  );
  console.log(`  + ${urunId.padEnd(20)} ${fiyat} TRY / ${DONEM[donem]}`);
}

// --- Taban planları etkinleştir ---
//
// Yeni oluşturulan taban planı DRAFT geliyor ve DRAFT plan satın alınamaz. Ürünü
// oluşturup bırakmak, ödeme duvarı açılınca "ürün bulunamadı" demektir.
for (const { donem, urunId } of urunler()) {
  const planId = donem === 'aylik' ? 'aylik' : 'yillik';
  try {
    await cagir(`/applications/${PAKET}/subscriptions/${urunId}/basePlans/${planId}:activate`, {
      method: 'POST',
      body: JSON.stringify({ packageName: PAKET, productId: urunId, basePlanId: planId }),
    });
    console.log(`  * ${urunId} etkinleştirildi`);
  } catch (hata) {
    // Zaten etkinse Play hata döner; bu betik tekrar çalıştırılabilir olmalı.
    console.log(`  = ${urunId}: ${hata.message.slice(0, 90)}`);
  }
}

console.log('\nDoğrulama:');
const son = await cagir(`/applications/${PAKET}/subscriptions?pageSize=50`);
for (const s of son.subscriptions ?? []) {
  const bp = s.basePlans?.[0];
  const f = bp?.regionalConfigs?.[0]?.price;
  console.log(
    `  ${s.productId.padEnd(20)} ${bp?.basePlanId ?? '-'} ${f ? f.units + ' ' + f.currencyCode : '-'} durum=${bp?.state ?? '-'}`,
  );
}
