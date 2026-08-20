/**
 * Site görsel taraması: 14 genişlik x 2 tema x 6 bölüm.
 *
 * Ekran görüntüsü CDP `Page.captureScreenshot` ile alınıyor — `page.screenshot()`
 * "waiting for fonts to load" diye 30 sn'de düşebiliyor.
 *
 * `captureBeyondViewport` KULLANILMIYOR: sayfada `position: fixed` bir cetvel rayı var
 * ve tam sayfa çekiminde yanlış yere düşüyor. Onun yerine her bölüm görünüme
 * kaydırılıp normal görünüm çekimi alınıyor; ölçüm `getBoundingClientRect` ile.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const ADRES = process.argv[2] ?? 'http://127.0.0.1:8090';
const CIKTI = process.argv[3];
const GENISLIKLER = [320, 360, 390, 414, 480, 600, 768, 834, 1024, 1280, 1440, 1920, 2560, 3440];
const TEMALAR = ['light', 'dark'];

mkdirSync(CIKTI, { recursive: true });

const tarayici = await chromium.connectOverCDP('http://127.0.0.1:9333');
const baglam = tarayici.contexts()[0] ?? (await tarayici.newContext());

const bulgular = [];

const konsolHatalari = [];

for (const tema of TEMALAR) {
  const sayfa = await baglam.newPage();
  sayfa.on('console', (m) => {
    if (m.type() === 'error') konsolHatalari.push(`${tema}: ${m.text()}`);
  });
  sayfa.on('pageerror', (e) => konsolHatalari.push(`${tema}: ${e.message}`));

  await sayfa.emulateMedia({ colorScheme: tema });
  const cdp = await baglam.newCDPSession(sayfa);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

  for (const g of GENISLIKLER) {
    await sayfa.setViewportSize({ width: g, height: 900 });
    await sayfa.goto(`${ADRES}/index.html`, { waitUntil: 'load' });
    await sayfa.waitForTimeout(350);

    // 1. Yatay tasma
    const tasma = await sayfa.evaluate(() => {
      const kok = document.documentElement;
      const tasanlar = [];
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.right > kok.clientWidth + 1 || r.left < -1) {
          tasanlar.push({
            etiket: el.tagName.toLowerCase(),
            sinif: el.className?.toString?.().slice(0, 40) ?? '',
            sol: Math.round(r.left),
            sag: Math.round(r.right),
          });
        }
      }
      return {
        belgeGenisligi: kok.scrollWidth,
        gorunumGenisligi: kok.clientWidth,
        tasanlar: tasanlar.slice(0, 6),
      };
    });

    if (tasma.belgeGenisligi > tasma.gorunumGenisligi + 1) {
      bulgular.push(
        `TASMA ${tema} ${g}px: belge ${tasma.belgeGenisligi} > gorunum ${tasma.gorunumGenisligi} · ` +
          JSON.stringify(tasma.tasanlar),
      );
    }

    // 2. Sag/sol bosluk kurali: icerik gercekten tam genisligi kullaniyor mu
    const kenar = await sayfa.evaluate(() => {
      const kok = document.documentElement.clientWidth;
      let enSag = 0;
      let enSol = kok;
      for (const s of document.querySelectorAll('section')) {
        const r = s.getBoundingClientRect();
        enSag = Math.max(enSag, r.right);
        enSol = Math.min(enSol, r.left);
      }
      return { kok, enSol: Math.round(enSol), enSag: Math.round(enSag) };
    });
    /**
     * Soldaki bosluk cetvel RAYIDIR, kusur degil: markanin olcu aleti metaforu
     * sayfanin sol kenarina dikilmis durumda. Ilk hali bunu bulgu sayiyordu ve
     * her genis genislikte yanlis alarm veriyordu. Olculen sey ray disindaki
     * icerigin sag kenara ulasip ulasmadigi.
     */
    const rayGenisligi = await sayfa.evaluate(() => {
      const ray = document.querySelector('[class*="cetvel"], [class*="ray"]');
      return ray ? Math.round(ray.getBoundingClientRect().width) : 0;
    });
    if (kenar.enSol > rayGenisligi + 4 || kenar.enSag < kenar.kok - 4) {
      bulgular.push(
        `KENAR BOSLUGU ${tema} ${g}px: bolumler ${kenar.enSol}..${kenar.enSag}, ` +
          `gorunum 0..${kenar.kok}, ray ${rayGenisligi}px`,
      );
    }

    // 3. Her bolumun ekran goruntusu
    const bolumler = await sayfa.$$eval('section', (ler) =>
      ler.map((s) => ({ id: s.id, ad: s.dataset.bolum ?? s.id })),
    );

    for (const b of bolumler) {
      await sayfa.evaluate((id) => {
        document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
      }, b.id);
      await sayfa.waitForTimeout(200);

      const { data } = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      writeFileSync(
        `${CIKTI}/${tema}-${String(g).padStart(4, '0')}-${b.id}.png`,
        Buffer.from(data, 'base64'),
      );
    }

    // 4. Sabit ray gercekten aktif bolumu mu gosteriyor
    const ray = await sayfa.evaluate(() => {
      const agiz = document.querySelector('.kumpas-agzi, [class*="agiz"]');
      const etiketler = [...document.querySelectorAll('[class*="cetvel"] [class*="etiket"]')];
      if (!agiz || etiketler.length === 0) return null;
      const a = agiz.getBoundingClientRect();
      const yakin = etiketler
        .map((e) => {
          const r = e.getBoundingClientRect();
          return {
            metin: e.textContent?.trim() ?? '',
            sapma: Math.abs(r.top + r.height / 2 - (a.top + a.height / 2)),
          };
        })
        .sort((x, y) => x.sapma - y.sapma)[0];
      return yakin;
    });
    if (ray && ray.sapma > 12) {
      bulgular.push(
        `KUMPAS ${tema} ${g}px: agiz en yakin etiketten ${Math.round(ray.sapma)}px sapiyor (${ray.metin})`,
      );
    }
  }
  await sayfa.close();
}

await tarayici.close();

console.log(
  `Taranan: ${GENISLIKLER.length} genislik x ${TEMALAR.length} tema x 6 bolum = ${GENISLIKLER.length * TEMALAR.length * 6} goruntu`,
);
console.log('');
if (konsolHatalari.length) {
  console.log(`KONSOL HATALARI (${konsolHatalari.length}):`);
  for (const h of [...new Set(konsolHatalari)]) console.log('  ' + h);
} else {
  console.log('Konsol hatasi yok.');
}
console.log('');
if (bulgular.length) {
  console.log(`BULGULAR (${bulgular.length}):`);
  for (const b of bulgular) console.log('  ' + b);
} else {
  console.log('Tasma, kenar boslugu ve kumpas hizasi temiz.');
}
