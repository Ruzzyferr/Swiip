/**
 * App Store sayfasını her dilde yazar — kaynak `magaza/appstore/yereller/<yerel>.json`.
 *
 * 2026-10-06'ya kadar 13 dil vardı ve çoğunun anahtar kelimeleri tahmindi. Apple 50 dil
 * destekliyor ve her ülke mağazası varsayılan diline ek olarak başka dilleri de tarıyor
 * (Türkiye'nin VARSAYILAN dili İngiltere İngilizcesi). Dosyalardaki ad, alt başlık ve
 * anahtar kelimeler o dilin ana mağazasındaki arama önerilerinden ölçüldü
 * (`scripts/aso-oneri.mjs`, gerekçe dosyanın `talep` alanında).
 *
 * Ad ve alt başlık App Information'da, gerisi sürümde; ikisi de yalnızca düzenlenebilir
 * bir sürüm varken değişiyor (`apple-surum-ac.mjs`). Eksik yerel oluşturuluyor; destek
 * ve gizlilik adresi Türkçe için Türkçe sayfadan, diğerleri için İngilizce sayfadan.
 *
 * Sınırlar yazmadan ÖNCE denetleniyor; yazdıktan sonra her alan geri okunuyor (bu uçlarda
 * yazma asenkron uygulanabiliyor, bkz. CLAUDE.md).
 *
 *     node scripts/apple-yereller.mjs          # denetler, ne değişeceğini gösterir
 *     node scripts/apple-yereller.mjs --yaz
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { apple } from './apple-api.mjs';

const UYG = '6803979374';
const YAZ = process.argv.includes('--yaz');
const DIZIN = 'magaza/appstore/yereller';
const SINIR = { name: 30, subtitle: 30, keywords: 100, promotionalText: 170, description: 4000 };
const uzunluk = (s) => [...(s ?? '')].length;

const yereller = readdirSync(DIZIN)
  .filter((d) => d.endsWith('.json'))
  .map((d) => JSON.parse(readFileSync(join(DIZIN, d), 'utf8')));

// --- denetim ---
const hatalar = [];
for (const y of yereller) {
  for (const [alan, sinir] of Object.entries(SINIR)) {
    if (alan !== 'promotionalText' && !y[alan]) hatalar.push(`${y.locale}.${alan} boş`);
    if (uzunluk(y[alan]) > sinir) hatalar.push(`${y.locale}.${alan} ${uzunluk(y[alan])}/${sinir}`);
  }
  if (!y.name?.startsWith('Swiip')) hatalar.push(`${y.locale}: ad "Swiip" ile başlamıyor`);
  if (/,\s/.test(y.keywords ?? '')) hatalar.push(`${y.locale}: virgülden sonra boşluk`);
  const adda = new Set(
    `${y.name} ${y.subtitle}`
      .toLocaleLowerCase(y.locale)
      .split(/[\s:,&·|\-–]+/)
      .filter(Boolean),
  );
  const tekrar = (y.keywords ?? '')
    .split(',')
    .filter((k) => adda.has(k.toLocaleLowerCase(y.locale)));
  if (tekrar.length) hatalar.push(`${y.locale}: ad/alt başlıkta zaten var: ${tekrar.join(',')}`);
}
if (hatalar.length) {
  console.error(`Denetim düştü:\n  ${hatalar.join('\n  ')}`);
  process.exit(1);
}
console.log(`${yereller.length} yerel denetimden geçti.`);

// --- hedef ---
const surum = (
  await apple(
    `/apps/${UYG}/appStoreVersions?filter[platform]=IOS&limit=10&fields[appStoreVersions]=versionString,appStoreState`,
  )
).data.find((v) =>
  ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'].includes(
    v.attributes.appStoreState,
  ),
);
if (!surum) throw new Error('Düzenlenebilir sürüm yok. Önce apple-surum-ac.mjs.');
const bilgi = (await apple(`/apps/${UYG}/appInfos`)).data.find(
  (b) => b.attributes.appStoreState !== 'READY_FOR_SALE',
);
if (!bilgi) throw new Error('Düzenlenebilir App Information yok.');
console.log(`Sürüm ${surum.attributes.versionString}`);

const bilgiYerelleri = async () =>
  new Map(
    (await apple(`/appInfos/${bilgi.id}/appInfoLocalizations?limit=200`)).data.map((y) => [
      y.attributes.locale,
      y,
    ]),
  );
const surumYerelleri = async () =>
  new Map(
    (await apple(`/appStoreVersions/${surum.id}/appStoreVersionLocalizations?limit=200`)).data.map(
      (y) => [y.attributes.locale, y],
    ),
  );

let bY = await bilgiYerelleri();
let sY = await surumYerelleri();
const adres = (yerel) => {
  const k = yerel === 'tr' ? 'tr' : 'en-US';
  return {
    privacyPolicyUrl: bY.get(k).attributes.privacyPolicyUrl,
    supportUrl: sY.get(k).attributes.supportUrl,
    marketingUrl: sY.get(k).attributes.marketingUrl,
  };
};
const ADRES = { tr: adres('tr'), diger: adres('en-US') };

if (!YAZ) {
  for (const y of yereller) {
    const durum = bY.has(y.locale) ? 'güncellenecek' : 'OLUŞTURULACAK';
    console.log(`  ${durum.padEnd(13)} ${y.locale.padEnd(7)} ${y.name} | ${y.subtitle}`);
  }
  process.exit(0);
}

const reddedilen = [];
for (const y of yereller) {
  const a = y.locale === 'tr' ? ADRES.tr : ADRES.diger;
  try {
    const b = bY.get(y.locale);
    if (b) {
      await apple(`/appInfoLocalizations/${b.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            type: 'appInfoLocalizations',
            id: b.id,
            attributes: { name: y.name, subtitle: y.subtitle },
          },
        }),
      });
    } else {
      await apple('/appInfoLocalizations', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'appInfoLocalizations',
            attributes: {
              locale: y.locale,
              name: y.name,
              subtitle: y.subtitle,
              privacyPolicyUrl: a.privacyPolicyUrl,
            },
            relationships: { appInfo: { data: { type: 'appInfos', id: bilgi.id } } },
          },
        }),
      });
      // Yeni App Information yereli, sürüm yerelini Apple'da BOŞ olarak açıyor.
      sY = await surumYerelleri();
    }

    const surumAlanlari = {
      keywords: y.keywords,
      description: y.description,
      whatsNew: y.whatsNew,
      ...(y.promotionalText ? { promotionalText: y.promotionalText } : {}),
      supportUrl: a.supportUrl,
      marketingUrl: a.marketingUrl,
    };
    const s = sY.get(y.locale);
    if (s) {
      await apple(`/appStoreVersionLocalizations/${s.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          data: { type: 'appStoreVersionLocalizations', id: s.id, attributes: surumAlanlari },
        }),
      });
    } else {
      await apple('/appStoreVersionLocalizations', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'appStoreVersionLocalizations',
            attributes: { locale: y.locale, ...surumAlanlari },
            relationships: {
              appStoreVersion: { data: { type: 'appStoreVersions', id: surum.id } },
            },
          },
        }),
      });
    }
    console.log(`  yazıldı  ${y.locale.padEnd(7)} ${y.name}`);
  } catch (h) {
    reddedilen.push(`${y.locale}: ${String(h.message).split('\n').slice(0, 2).join(' ')}`);
  }
}
if (reddedilen.length) console.error(`Reddedilen:\n  ${reddedilen.join('\n  ')}`);

// --- geri okuma ---
for (let deneme = 1; deneme <= 6; deneme++) {
  bY = await bilgiYerelleri();
  sY = await surumYerelleri();
  const tutmayan = yereller
    .filter((y) => !reddedilen.some((r) => r.startsWith(`${y.locale}:`)))
    .filter(
      (y) =>
        bY.get(y.locale)?.attributes.name !== y.name ||
        bY.get(y.locale)?.attributes.subtitle !== y.subtitle ||
        sY.get(y.locale)?.attributes.keywords !== y.keywords ||
        sY.get(y.locale)?.attributes.description !== y.description,
    )
    .map((y) => y.locale);
  if (tutmayan.length === 0) {
    console.log(
      `Doğrulandı: ${yereller.length - reddedilen.length} yerel geri okundu. Sürümde ${sY.size} yerel var.`,
    );
    process.exit(reddedilen.length ? 1 : 0);
  }
  console.log(`Okuma ${deneme}: tutmayan ${tutmayan.join(', ')}`);
  await new Promise((c) => setTimeout(c, 10_000));
}
console.error('YAZILAMADI');
process.exit(1);
