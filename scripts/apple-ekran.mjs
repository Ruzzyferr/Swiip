/**
 * App Store Connect'e ekran görüntüsü yükler.
 *
 * Apple'ın yükleme akışı üç adım ve hepsi zorunlu:
 *   1. `appScreenshots` POST  → dosya adı ve boyutu bildirilir, Apple yükleme
 *      talimatlarını (`uploadOperations`) döner
 *   2. Talimatlardaki her parça ayrı bir PUT ile yüklenir
 *   3. `PATCH ... {uploaded: true, sourceFileChecksum}` ile tamamlanır
 *
 * Tek adımda "dosyayı gönder" diye bir uç yok; ikinci adım atlanırsa görsel sessizce
 * boş kalır ve inceleme "screenshot missing" ile döner.
 *
 *   node scripts/apple-ekran.mjs <klasor>
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { apple } from './apple-api.mjs';

const UYGULAMA = '6803979374';
const DIL = 'tr';
/** iPhone 6.9" — 1320x2868. Emülatör bu ölçüye ayarlanarak yakalandı. */
const GORUNTU_TIPI = 'APP_IPHONE_67';

const klasor = process.argv[2];
if (!klasor) {
  console.error('Kullanım: node scripts/apple-ekran.mjs <klasor>');
  process.exit(2);
}

const surumler = await apple(`/apps/${UYGULAMA}/appStoreVersions?limit=5`);
const surum = surumler.data.find((s) => s.attributes.appStoreState === 'PREPARE_FOR_SUBMISSION');
if (!surum) throw new Error('Düzenlenebilir sürüm yok.');

const yereller = await apple(`/appStoreVersions/${surum.id}/appStoreVersionLocalizations?limit=20`);
const yerel = yereller.data.find((y) => y.attributes.locale === DIL);
if (!yerel) throw new Error(`${DIL} yerelleştirmesi yok.`);

// Aynı tipte mevcut küme varsa yeniden kullan; yoksa oluştur.
const kumeler = await apple(`/appStoreVersionLocalizations/${yerel.id}/appScreenshotSets?limit=20`);
let kume = kumeler.data.find((k) => k.attributes.screenshotDisplayType === GORUNTU_TIPI);

if (!kume) {
  const olusan = await apple('/appScreenshotSets', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'appScreenshotSets',
        attributes: { screenshotDisplayType: GORUNTU_TIPI },
        relationships: {
          appStoreVersionLocalization: {
            data: { id: yerel.id, type: 'appStoreVersionLocalizations' },
          },
        },
      },
    }),
  });
  kume = olusan.data;
  console.log(`  küme oluşturuldu: ${GORUNTU_TIPI}`);
} else {
  console.log(`  mevcut küme kullanılıyor: ${GORUNTU_TIPI}`);
  const eskiler = await apple(`/appScreenshotSets/${kume.id}/appScreenshots?limit=20`);
  for (const e of eskiler.data ?? []) {
    await apple(`/appScreenshots/${e.id}`, { method: 'DELETE' }).catch(() => {});
  }
  if (eskiler.data?.length) console.log(`  ${eskiler.data.length} eski görsel silindi`);
}

const dosyalar = readdirSync(klasor)
  .filter((d) => /\.png$/i.test(d))
  .sort();

for (const dosya of dosyalar) {
  const veri = readFileSync(join(klasor, dosya));

  const kayit = await apple('/appScreenshots', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'appScreenshots',
        attributes: { fileSize: veri.length, fileName: dosya },
        relationships: {
          appScreenshotSet: { data: { id: kume.id, type: 'appScreenshotSets' } },
        },
      },
    }),
  });

  const islemler = kayit.data.attributes.uploadOperations ?? [];
  for (const islem of islemler) {
    const basliklar = Object.fromEntries(
      (islem.requestHeaders ?? []).map((h) => [h.name, h.value]),
    );
    const parca = veri.subarray(islem.offset, islem.offset + islem.length);
    const y = await fetch(islem.url, { method: islem.method, headers: basliklar, body: parca });
    if (!y.ok) throw new Error(`${dosya} parça yüklenemedi: ${y.status}`);
  }

  await apple(`/appScreenshots/${kayit.data.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: {
        type: 'appScreenshots',
        id: kayit.data.id,
        attributes: {
          uploaded: true,
          sourceFileChecksum: createHash('md5').update(veri).digest('hex'),
        },
      },
    }),
  });

  console.log(`  ✓ ${dosya} (${(veri.length / 1024).toFixed(0)} KB)`);
}

const son = await apple(`/appScreenshotSets/${kume.id}/appScreenshots?limit=20`);
console.log(`\nKümede ${son.data.length} görsel:`);
for (const g of son.data) {
  const d = g.attributes.assetDeliveryState?.state ?? '?';
  console.log(`  ${g.attributes.fileName} — ${d}`);
}
