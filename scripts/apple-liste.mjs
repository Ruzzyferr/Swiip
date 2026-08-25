/**
 * App Store listesini (ad, altbaşlık, anahtar kelimeler, açıklama) API ile yükler.
 *
 * Neden bu betik var: App Store metni uzun süre **yalnızca konsolda** duruyordu ve
 * sürüklendi. Play listesi depodan yönetildiği için güncelleniyor, App Store'unki
 * unutuluyordu. 2026-08-26'da iki sonucu birden görüldü — açıklama hâlâ eski
 * değerlendirmeyi anlatıyordu VE "Ödeme Google Play hesabından tahsil edilir" diyordu.
 * İkincisi başka bir mağazanın adı ve yanlış faturalandırma yönergesi: tek başına
 * metadata reddi sebebi.
 *
 * Kaynak `magaza/appstore/liste-tr.md` içindeki ``` blokları, sırayla:
 * 0=ad, 1=altbaşlık, 2=anahtar kelimeler, 3=açıklama.
 *
 *   source ~/.asc-keys/asc.env && node scripts/apple-liste.mjs [--dene]
 *
 * `--dene` yalnızca ölçer ve karşılaştırır; hiçbir şey yazmaz.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apple } from './apple-api.mjs';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const KAYNAK = join(KOK, 'magaza/appstore/liste-tr.md');
const UYGULAMA = process.env.ASC_APP_ID ?? '6803979374';
const DIL = 'tr';
const DENE = process.argv.includes('--dene');

/**
 * Alan sınırları. Konsol sınırı aşan metni sessizce kırpıyor; API 400 döndürüyor ama
 * hangi alanın taştığını söylemiyor. Yazmadan ÖNCE kontrol etmek tek güvenli yol.
 */
const SINIRLAR = { ad: 30, altbaslik: 30, anahtar: 100, aciklama: 4000 };

const ham = readFileSync(KAYNAK, 'utf8').replace(/\r\n/g, '\n');
const bloklar = [...ham.matchAll(/```\n([\s\S]*?)\n```/g)].map((m) => m[1].trim());
if (bloklar.length < 4) {
  console.error(`${KAYNAK} içinde 4 blok bekleniyordu, ${bloklar.length} bulundu.`);
  process.exit(2);
}
const [ad, altbaslik, anahtar, aciklama] = bloklar;

const olculer = { ad, altbaslik, anahtar, aciklama };
let tasan = false;
for (const [alan, deger] of Object.entries(olculer)) {
  const sinir = SINIRLAR[alan];
  const ok = deger.length <= sinir;
  if (!ok) tasan = true;
  console.log(
    `  ${alan.padEnd(9)} ${String(deger.length).padStart(4)}/${sinir} ${ok ? '' : '← SINIR AŞILDI'}`,
  );
}
if (tasan) {
  console.error('Sınır aşıldı; hiçbir şey yazılmadı.');
  process.exit(1);
}

/** Başka bir mağazanın adı Apple listesinde geçmemeli — ölçülmüş bir kusur. */
const YASAK = ['Google Play', 'Play Store', 'Android', 'Google Hesab'];
const bulunan = YASAK.filter((k) => aciklama.includes(k) || altbaslik.includes(k));
if (bulunan.length > 0) {
  console.error(`Açıklamada başka mağaza adı geçiyor: ${bulunan.join(', ')}. Yazılmadı.`);
  process.exit(1);
}

// --- Sürüm ve appInfo yerelleştirmelerini bul ---
const surumler = await apple(
  `/apps/${UYGULAMA}/appStoreVersions?fields[appStoreVersions]=versionString,appStoreState&limit=5`,
);
const surum = (surumler.data ?? []).find((v) =>
  ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'].includes(
    v.attributes.appStoreState,
  ),
);
if (!surum) {
  console.error(
    'Düzenlenebilir sürüm yok. Bulunanlar: ' +
      JSON.stringify(
        (surumler.data ?? []).map((v) => [v.attributes.versionString, v.attributes.appStoreState]),
      ),
  );
  process.exit(1);
}
console.log(`sürüm ${surum.attributes.versionString} (${surum.attributes.appStoreState})`);

const svl = await apple(
  `/appStoreVersions/${surum.id}/appStoreVersionLocalizations?fields[appStoreVersionLocalizations]=locale,description,keywords&limit=20`,
);
const yerel = (svl.data ?? []).find((x) => x.attributes.locale === DIL);
if (!yerel) {
  console.error(
    `"${DIL}" yerelleştirmesi yok. Bulunanlar: ` +
      (svl.data ?? []).map((x) => x.attributes.locale).join(', '),
  );
  process.exit(1);
}

const infos = await apple(`/apps/${UYGULAMA}/appInfos?limit=5`);
let bilgiYerel = null;
for (const i of infos.data ?? []) {
  const l = await apple(
    `/appInfos/${i.id}/appInfoLocalizations?fields[appInfoLocalizations]=locale,name,subtitle&limit=20`,
  );
  const y = (l.data ?? []).find((x) => x.attributes.locale === DIL);
  if (y) {
    bilgiYerel = y;
    break;
  }
}
if (!bilgiYerel) {
  console.error('appInfo yerelleştirmesi bulunamadı.');
  process.exit(1);
}

if (DENE) {
  console.log('\n--- şu an canlıda ---');
  console.log('  ad       :', bilgiYerel.attributes.name);
  console.log('  altbaşlık:', bilgiYerel.attributes.subtitle);
  console.log('  anahtar  :', yerel.attributes.keywords);
  console.log('  açıklama :', (yerel.attributes.description ?? '').length, 'karakter');
  console.log('\n--dene; hiçbir şey yazılmadı.');
  process.exit(0);
}

await apple(`/appStoreVersionLocalizations/${yerel.id}`, {
  method: 'PATCH',
  body: JSON.stringify({
    data: {
      type: 'appStoreVersionLocalizations',
      id: yerel.id,
      attributes: { description: aciklama, keywords: anahtar },
    },
  }),
});

await apple(`/appInfoLocalizations/${bilgiYerel.id}`, {
  method: 'PATCH',
  body: JSON.stringify({
    data: {
      type: 'appInfoLocalizations',
      id: bilgiYerel.id,
      attributes: { name: ad, subtitle: altbaslik },
    },
  }),
});

// Geri okuma: yazma isteğinin 2xx dönmesi, alanların metni tuttuğu anlamına gelmiyor.
const sonraSvl = await apple(
  `/appStoreVersionLocalizations/${yerel.id}?fields[appStoreVersionLocalizations]=description,keywords`,
);
const sonraInfo = await apple(
  `/appInfoLocalizations/${bilgiYerel.id}?fields[appInfoLocalizations]=name,subtitle`,
);

const kontroller = [
  ['açıklama', sonraSvl.data.attributes.description, aciklama],
  ['anahtar', sonraSvl.data.attributes.keywords, anahtar],
  ['ad', sonraInfo.data.attributes.name, ad],
  ['altbaşlık', sonraInfo.data.attributes.subtitle, altbaslik],
];
let hata = false;
for (const [alan, canli, beklenen] of kontroller) {
  const ok = (canli ?? '').trim() === beklenen;
  if (!ok) hata = true;
  console.log(`  ${alan.padEnd(9)} ${ok ? 'doğrulandı' : 'UYUŞMUYOR'}`);
}
process.exit(hata ? 1 : 0);
