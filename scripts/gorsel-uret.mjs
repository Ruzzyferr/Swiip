/**
 * Marka görsellerini `brand/` SVG'lerinden üretir.
 *
 * Uygulama ikonu, uyarlanabilir ikon, açılış ekranı ve mağaza görselleri elle
 * çizilmişti. İsim değişince hepsi tek tek yeniden çizilmek zorunda kaldı — ve biri
 * unutulursa uygulamanın içinde eski marka kalır. Üretilince kaynak tek: `brand/`.
 *
 * Tarayıcı üzerinden çalışır (CDP, 9222). Ayrı bir görüntü kütüphanesi eklemek yerine
 * zaten kurulu olan tarayıcının SVG çizicisi kullanılıyor.
 *
 * **SIRA ÖNEMLİ — bu betik `expo prebuild`'DEN ÖNCE çalışmalı.**
 *
 * Android mipmap'lerini gradle değil `expo prebuild` üretiyor, kaynağı da
 * `apps/mobile/assets/ikon.png`. Önce prebuild çalışırsa ikonlar eski PNG'den üretilir;
 * sonradan PNG'yi değiştirip `gradlew bundleRelease` demek onları YENİLEMEZ ve paket
 * sessizce eski markayı taşır. 2026-08-21'de tam bu oldu: kaynak ağaçtaki webp'nin
 * zaman damgası tazeydi ama içeriği hâlâ eski "2" işaretiydi; ancak AAB'nin içinden
 * çıkarılıp bakılınca görüldü.
 *
 * Doğru sıra `npm run marka` ile tek komutta: üret → prebuild → imzayı geri koy.
 *
 *   node scripts/gorsel-uret.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const kok = join(dirname(fileURLToPath(import.meta.url)), '..');
const MUREKKEP = '#131614';
const ZEMIN = '#F6F7F5';

const mark = readFileSync(join(kok, 'brand/mark.svg'), 'utf8');

/** Tek bir işaret, istenen zeminde, istenen ölçüde. */
function sayfaIsaret({ genislik, yukseklik, zemin, renk, olcek, koseYaricapi = 0 }) {
  return `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0}
  body{width:${genislik}px;height:${yukseklik}px;background:${zemin};
       display:flex;align-items:center;justify-content:center;
       ${koseYaricapi ? `border-radius:${koseYaricapi}px;overflow:hidden;` : ''}}
  .isaret{width:${Math.round(Math.min(genislik, yukseklik) * olcek)}px;color:${renk};display:block}
  svg{display:block;width:100%;height:auto}
</style>
<div class="isaret">${mark}</div>`;
}

/** Öne çıkan görsel: işaret + söz. */
function sayfaOneCikan(genislik, yukseklik) {
  return `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;padding:0}
  body{width:${genislik}px;height:${yukseklik}px;background:${MUREKKEP};color:${ZEMIN};
       display:flex;align-items:center;gap:${Math.round(yukseklik * 0.1)}px;
       padding:0 ${Math.round(genislik * 0.08)}px;box-sizing:border-box;
       font-family:Archivo,Helvetica Neue,Arial,sans-serif}
  .isaret{width:${Math.round(yukseklik * 0.46)}px;color:${ZEMIN};flex:0 0 auto}
  svg{display:block;width:100%;height:auto}
  .ad{font-size:${Math.round(yukseklik * 0.19)}px;font-weight:700;letter-spacing:-.03em;line-height:1}
  .soz{font-size:${Math.round(yukseklik * 0.078)}px;font-weight:600;opacity:.72;margin-top:${Math.round(yukseklik * 0.035)}px;line-height:1.3}
</style>
<div class="isaret">${mark}</div>
<div>
  <div class="ad">Swiip</div>
  <div class="soz">Ölçüne göre.<br>Programın neden o program olduğunu da söyleriz.</div>
</div>`;
}

const isler = [
  {
    yol: 'apps/mobile/assets/ikon.png',
    g: 1024,
    y: 1024,
    html: sayfaIsaret({
      genislik: 1024,
      yukseklik: 1024,
      zemin: MUREKKEP,
      renk: ZEMIN,
      olcek: 0.72,
    }),
  },
  {
    // Uyarlanabilir ikon: Android kendi maskesini uyguluyor, zemin app.json'dan geliyor.
    // Güvenli alan dar; işaret bu yüzden daha küçük.
    yol: 'apps/mobile/assets/uyarlanabilir-ikon.png',
    g: 1024,
    y: 1024,
    html: sayfaIsaret({
      genislik: 1024,
      yukseklik: 1024,
      zemin: MUREKKEP,
      renk: ZEMIN,
      olcek: 0.44,
    }),
  },
  {
    yol: 'apps/mobile/assets/acilis.png',
    g: 1284,
    y: 2778,
    html: sayfaIsaret({
      genislik: 1284,
      yukseklik: 2778,
      zemin: ZEMIN,
      renk: MUREKKEP,
      olcek: 0.3,
    }),
  },
  {
    yol: 'magaza/play/ikon-512.png',
    g: 512,
    y: 512,
    html: sayfaIsaret({ genislik: 512, yukseklik: 512, zemin: MUREKKEP, renk: ZEMIN, olcek: 0.72 }),
  },
  { yol: 'magaza/play/one-cikan-1024x500.png', g: 1024, y: 500, html: sayfaOneCikan(1024, 500) },
];

const liste = await fetch('http://127.0.0.1:9222/json/list').then((r) => r.json());
const hedef = liste.find((t) => t.type === 'page' && !t.url.startsWith('devtools://'));
if (!hedef) {
  console.error('Tarayıcı sekmesi bulunamadı. Brave --remote-debugging-port=9222 ile açık olmalı.');
  process.exit(1);
}

const ws = new WebSocket(hedef.webSocketDebuggerUrl, { perMessageDeflate: false });
let sayac = 0;
const bekleyen = new Map();
const gonder = (yontem, params = {}) =>
  new Promise((coz) => {
    const id = ++sayac;
    bekleyen.set(id, coz);
    ws.send(JSON.stringify({ id, method: yontem, params }));
  });
ws.on('message', (ham) => {
  const m = JSON.parse(ham.toString());
  if (m.id && bekleyen.has(m.id)) {
    bekleyen.get(m.id)(m);
    bekleyen.delete(m.id);
  }
});
await new Promise((c, r) => {
  ws.on('open', c);
  ws.on('error', r);
});
const bekle = (ms) => new Promise((c) => setTimeout(c, ms));

for (const is of isler) {
  await gonder('Emulation.setDeviceMetricsOverride', {
    width: is.g,
    height: is.y,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await gonder('Page.navigate', {
    url: 'data:text/html;charset=utf-8,' + encodeURIComponent(is.html),
  });
  await bekle(1400);
  const r = await gonder('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  const veri = r.result?.data;
  if (!veri) {
    console.error(`  ✗ ${is.yol} — görüntü alınamadı`);
    continue;
  }
  writeFileSync(join(kok, is.yol), Buffer.from(veri, 'base64'));
  console.log(`  ✓ ${is.yol} (${is.g}x${is.y})`);
}

await gonder('Emulation.clearDeviceMetricsOverride');
ws.close();
process.exit(0);
