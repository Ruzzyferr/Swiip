/**
 * Site kontrast denetimi.
 *
 * Her sayfadaki her metin ögesini, altında **gerçekten boyanan** renge karşı ölçer ve
 * WCAG AA eşiğini (normal metin 4.5:1, büyük metin 3:1) tutturmayanları listeler.
 * Açık ve koyu temayı ayrı ayrı gezer.
 *
 * Neden var: koyu tema hiç ekrana bakılmadan yazılmıştı ve Motor bandının tamamı siyah
 * üstüne siyahtı (1.08:1). Göz taraması bunu kaçırır, ölçüm kaçırmaz.
 *
 * Bu betik tarayıcı ister, o yüzden `npm run verify` içinde değil. Statik tarafı
 * `packages/shared/src/siteTema.test.ts` koruyor; bu ise gerçek boyanan pikseli ölçüyor.
 *
 * Çalıştırma:
 *   npx serve -l 8090 -s apps/site        # başka bir kabukta
 *   node scripts/site-kontrast.mjs [adres]
 *
 * Hazır bir hata ayıklama tarayıcısı varsa CDP adresini `KONTRAST_CDP` ile verebilirsin.
 */
import { chromium } from 'playwright-core';

const ADRES = process.argv[2] ?? 'http://127.0.0.1:8090';
const CDP = process.env.KONTRAST_CDP ?? '';
const SAYFALAR = ['index.html', 'gizlilik.html', 'hesap-silme.html'];

const TARAYICI = () => {
  const coz = (c) => {
    const d = document.createElement('div');
    d.style.color = c;
    document.body.appendChild(d);
    const s = getComputedStyle(d).color;
    d.remove();
    const m = (s.match(/[\d.]+/g) || ['0', '0', '0']).map(Number);
    const olcek = s.startsWith('color(') ? 255 : 1;
    return { rgb: m.slice(0, 3).map((v) => v * olcek), a: m[3] ?? 1 };
  };

  /** Elemanın altında gerçekten boyanan rengi bul: saydam olanları geçip üst üste bindir. */
  const altZemin = (el) => {
    const katman = [];
    for (let e = el; e; e = e.parentElement) {
      const { rgb, a } = coz(getComputedStyle(e).backgroundColor);
      if (a > 0) katman.push({ rgb, a });
      if (a >= 0.999) break;
    }
    katman.push({ rgb: [255, 255, 255], a: 1 });
    let s = katman[katman.length - 1].rgb;
    for (let i = katman.length - 2; i >= 0; i -= 1) {
      const k = katman[i];
      s = k.rgb.map((v, j) => v * k.a + s[j] * (1 - k.a));
    }
    return s;
  };

  const kanal = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const parlak = ([r, g, b]) =>
    0.2126 * kanal(r / 255) + 0.7152 * kanal(g / 255) + 0.0722 * kanal(b / 255);
  const oran = (a, b) => {
    const x = parlak(a),
      y = parlak(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };

  const yol = (el) => {
    const p = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      p.unshift(
        e.tagName.toLowerCase() +
          (e.className ? '.' + e.className.toString().trim().split(/\s+/)[0] : ''),
      );
      if (p.length >= 3) break;
    }
    return p.join('>');
  };

  const zayif = [];
  for (const el of document.querySelectorAll('body *')) {
    const dogrudan = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 1,
    );
    if (!dogrudan) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) < 0.1) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.left < -1000) continue; // ekran dışına alınmış atlama bağlantısı

    const { rgb, a } = coz(s.color);
    const zem = altZemin(el);
    const renk = rgb.map((v, i) => v * a + zem[i] * (1 - a));
    const k = oran(renk, zem);

    const boy = parseFloat(s.fontSize);
    const kalin = parseInt(s.fontWeight, 10) >= 700;
    const buyukMetin = boy >= 24 || (boy >= 18.66 && kalin);
    const esik = buyukMetin ? 3 : 4.5;

    if (k < esik) {
      zayif.push({
        yol: yol(el),
        metin: el.textContent.trim().slice(0, 34),
        k: Math.round(k * 100) / 100,
        esik,
        boy: Math.round(boy),
      });
    }
  }
  return zayif;
};

const tarayici = CDP ? await chromium.connectOverCDP(CDP) : await chromium.launch();
let toplamZayif = 0;

for (const sema of ['light', 'dark']) {
  const ctx = await tarayici.newContext({
    colorScheme: sema,
    viewport: { width: 1440, height: 900 },
  });
  const p = await ctx.newPage();

  for (const sayfa of SAYFALAR) {
    await p.goto(`${ADRES}/${sayfa}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(900);
    // Sayfayı baştan sona gez ki gecikmeli görünen her şey boyansın.
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await p.waitForTimeout(400);

    const zayif = await p.evaluate(TARAYICI);
    toplamZayif += zayif.length;
    console.log(`${sema} / ${sayfa}: ${zayif.length ? `${zayif.length} ZAYIF` : 'temiz'}`);
    for (const x of zayif) {
      console.log(`   ${x.k}:1 (eşik ${x.esik}) ${x.boy}px  ${x.yol}  "${x.metin}"`);
    }
  }
  await ctx.close();
}

await tarayici.close();

if (toplamZayif > 0) {
  console.error(`\n${toplamZayif} öge WCAG AA eşiğinin altında.`);
  process.exit(1);
}
console.log('\nTüm metinler eşiği geçiyor.');
