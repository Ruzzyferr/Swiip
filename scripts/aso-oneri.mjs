/**
 * App Store arama önerileri — bir ülkede insanların GERÇEKTEN ne yazdığı (talep).
 *
 * 2026-08-31'de rekabete bakılarak "boş alan" terimler seçildi ve yanlış çıktı: rakip
 * olmamasının en yaygın sebebi o aramanın yapılmaması. Bu araç talebi ölçüyor: App
 * Store'un arama kutusunun öneri listesi, o mağazada sık yazılan ifadelerden geliyor.
 *
 *     node scripts/aso-oneri.mjs tr "kalori " "diyet "
 *     node scripts/aso-oneri.mjs jp "カロリー" "筋トレ"
 *
 * Öneri listesi popülerliği sıra olarak veriyor, sayı olarak değil. Boş liste "bu
 * önekle aranan bir şey yok" demek.
 */
export const MAGAZALAR = {
  us: 143441,
  gb: 143444,
  ca: 143455,
  au: 143460,
  nz: 143461,
  ie: 143449,
  de: 143443,
  at: 143445,
  ch: 143459,
  fr: 143442,
  be: 143446,
  it: 143450,
  es: 143454,
  pt: 143453,
  nl: 143452,
  se: 143456,
  no: 143457,
  dk: 143458,
  fi: 143447,
  pl: 143478,
  cz: 143489,
  sk: 143496,
  hu: 143482,
  ro: 143487,
  gr: 143448,
  hr: 143494,
  si: 143499,
  ru: 143469,
  ua: 143492,
  tr: 143480,
  il: 143491,
  sa: 143479,
  ae: 143481,
  eg: 143516,
  in: 143467,
  pk: 143477,
  bd: 143490,
  id: 143476,
  my: 143473,
  sg: 143464,
  ph: 143474,
  th: 143475,
  vn: 143471,
  cn: 143465,
  tw: 143470,
  hk: 143463,
  jp: 143462,
  kr: 143466,
  mx: 143468,
  br: 143503,
  ar: 143505,
  cl: 143483,
  co: 143501,
};

export async function oneriler(ulke, terim) {
  const kimlik = MAGAZALAR[ulke];
  if (!kimlik) throw new Error(`bilinmeyen ülke: ${ulke}`);
  const yanit = await fetch(
    `https://search.itunes.apple.com/WebObjects/MZSearchHints.woa/wa/hints?clientApplication=Software&term=${encodeURIComponent(terim)}`,
    {
      headers: {
        'X-Apple-Store-Front': `${kimlik}-1,29`,
        'User-Agent': 'AppStore/3.0 iOS/17.0 model/iPhone15,2',
      },
    },
  );
  const metin = await yanit.text();
  return [...metin.matchAll(/<key>term<\/key>\s*<string>([^<]+)<\/string>/g)].map((m) =>
    m[1].replace(/&amp;/g, '&'),
  );
}

if (process.argv[1]?.endsWith('aso-oneri.mjs')) {
  const [ulke, ...terimler] = process.argv.slice(2);
  for (const t of terimler) {
    console.log(`${t}: ${(await oneriler(ulke, t)).join(' · ') || '(öneri yok)'}`);
    await new Promise((c) => setTimeout(c, 300));
  }
}
