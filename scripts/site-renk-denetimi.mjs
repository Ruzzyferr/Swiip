/**
 * Marka rengi denetimi: neon ve turuncu yok.
 *
 * `CLAUDE.md` kilitli kararı: *"Neon veya turuncu kullanma — kategorinin tamamı orada."*
 * Bu kural bugüne kadar yalnızca yazılıydı; hiçbir şey uygulanmasını denetlemiyordu.
 * Yeni bir vurgu rengi eklenmesi ya da bir kütüphane rengi sızması sessiz kalırdı.
 *
 * Sayfadaki her ögenin GERÇEKTEN hesaplanan metin, arka plan ve kenarlık rengi
 * okunuyor ve HSL'e çevrilip iki kurala karşı sınanıyor:
 *
 *   - Turuncu: ton 15°-50° arası ve doygunluk yüksekse.
 *   - Neon: doygunluk çok yüksek (>%85) ve parlaklık orta-üstüyse — kategorinin
 *     her yerinde olan o "spor salonu yeşili/sarısı" bandı.
 *
 * Marka çamı (#14615A) ton ~172°, doygunluk ~%65: iki kurala da girmez.
 *
 * Çalıştırma:
 *   npx serve -l 8090 -s apps/site
 *   node scripts/site-renk-denetimi.mjs [adres]
 */
import { chromium } from 'playwright-core';

const ADRES = process.argv[2] ?? 'http://127.0.0.1:8090';
const CDP = process.env.KONTRAST_CDP ?? 'http://127.0.0.1:9333';
const SAYFALAR = ['index.html', 'gizlilik.html', 'hesap-silme.html'];
const TEMALAR = ['light', 'dark'];

const TARAYICI = () => {
  const hsl = (r, g, b) => {
    const [R, G, B] = [r / 255, g / 255, b / 255];
    const enBuyuk = Math.max(R, G, B);
    const enKucuk = Math.min(R, G, B);
    const fark = enBuyuk - enKucuk;
    const l = (enBuyuk + enKucuk) / 2;
    if (fark === 0) return { h: 0, s: 0, l };
    const s = fark / (1 - Math.abs(2 * l - 1));
    let h;
    if (enBuyuk === R) h = 60 * (((G - B) / fark) % 6);
    else if (enBuyuk === G) h = 60 * ((B - R) / fark + 2);
    else h = 60 * ((R - G) / fark + 4);
    return { h: (h + 360) % 360, s, l };
  };

  const ayristir = (deger) => {
    const m = (deger.match(/[\d.]+/g) || []).map(Number);
    if (m.length < 3) return null;
    const olcek = deger.startsWith('color(') ? 255 : 1;
    const alfa = m[3] ?? 1;
    if (alfa < 0.05) return null;
    return hsl(m[0] * olcek, m[1] * olcek, m[2] * olcek);
  };

  const bulgular = [];
  const gorulen = new Set();

  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    for (const alan of ['color', 'backgroundColor', 'borderTopColor', 'outlineColor']) {
      const ham = s[alan];
      if (!ham || ham === 'none') continue;

      /**
       * Kenarlık ve odak halkası varsayılan olarak `currentColor`; ayarlanmamışsa
       * metin rengini yansıtır ve aynı ihlal üç kez raporlanır. Görünür genişliği
       * olmayan kenarlık zaten ekranda yok.
       */
      if (alan === 'borderTopColor' && parseFloat(s.borderTopWidth) === 0) continue;
      if (alan === 'outlineColor' && parseFloat(s.outlineWidth) === 0) continue;
      const renk = ayristir(ham);
      if (!renk) continue;

      const anahtar = `${alan}:${ham}`;
      if (gorulen.has(anahtar)) continue;

      // Doygunluğu çok düşük renkler nötr: mürekkep, zemin, çizgi.
      if (renk.s < 0.2) continue;

      const turuncu = renk.h >= 15 && renk.h <= 50 && renk.s > 0.35;
      const neon = renk.s > 0.85 && renk.l > 0.45;

      if (turuncu || neon) {
        gorulen.add(anahtar);
        bulgular.push({
          sebep: turuncu ? 'turuncu' : 'neon',
          alan,
          renk: ham,
          ton: Math.round(renk.h),
          doygunluk: Math.round(renk.s * 100),
          parlaklik: Math.round(renk.l * 100),
          etiket: el.tagName.toLowerCase(),
          sinif: el.className?.toString?.().slice(0, 40) ?? '',
        });
      }
    }
  }
  return bulgular;
};

const tarayici = await chromium.connectOverCDP(CDP);
const baglam = tarayici.contexts()[0] ?? (await tarayici.newContext());
const sayfa = await baglam.newPage();
const cdp = await baglam.newCDPSession(sayfa);
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

let toplam = 0;

for (const tema of TEMALAR) {
  await sayfa.emulateMedia({ colorScheme: tema });
  for (const yol of SAYFALAR) {
    await sayfa.setViewportSize({ width: 1440, height: 900 });
    await sayfa.goto(`${ADRES}/${yol}`, { waitUntil: 'load' });
    await sayfa.waitForTimeout(250);

    const bulgular = await sayfa.evaluate(TARAYICI);
    if (bulgular.length === 0) {
      console.log(`${tema} / ${yol}: temiz`);
    } else {
      toplam += bulgular.length;
      console.log(`${tema} / ${yol}: ${bulgular.length} bulgu`);
      for (const b of bulgular) {
        console.log(
          `  ${b.sebep.toUpperCase()} ${b.renk} (ton ${b.ton}°, doygunluk %${b.doygunluk}, ` +
            `parlaklık %${b.parlaklik}) · ${b.etiket}.${b.sinif} · ${b.alan}`,
        );
      }
    }
  }
}

await tarayici.close();

console.log('');
if (toplam === 0) {
  console.log('Neon ve turuncu yok — marka kuralı tutuyor.');
} else {
  console.log(`${toplam} renk kuralı ihlali.`);
  process.exitCode = 1;
}
