/**
 * Marka işaretini üretir.
 *
 * Neden üreteç: işaretin tamamı ölçüye dayanıyor — yayların üzerindeki taksimat
 * çizikleri eşit açı aralıklarıyla yerleşmeli. Elle yazılan koordinatlar bir kez
 * kaydığında kimse fark etmez; hesapla üretilince kaymaz ve değiştirmek kolay olur.
 *
 * Fikir Made2Fit'ten devralındı ve korundu: **işaretin kendisi bir ölçü aleti.**
 * Orada 2 rakamı, üst kavisi çentikli açıölçer + tabanı taksimatlı cetveldi. Swiip'te
 * 2 yok; onun yerine harfin kendisi iki taksimatlı yaydan kuruluyor.
 *
 *   node scripts/marka-uret.mjs
 */
import { writeFileSync } from 'node:fs';

const R = 19; // yay yarıçapı
const KALINLIK = 13; // gövde kalınlığı
const UST = { cx: 50, cy: 33 };
const ALT = { cx: 50, cy: 67 };

const rad = (derece) => (derece * Math.PI) / 180;
const nokta = (m, yaricap, derece) => [
  m.cx + yaricap * Math.cos(rad(derece)),
  m.cy + yaricap * Math.sin(rad(derece)),
];
const yuvarla = (n) => Number(n.toFixed(2));

/**
 * Bir yayın dış kenarına taksimat çizikleri.
 *
 * Çizikler maskede siyah çizilir, yani gövdeden **oyulur**. Beşte bir büyük, kalanı
 * küçük: gerçek bir açıölçerin okunuşu bu.
 */
function taksimat(merkez, baslangic, bitis, adet) {
  const cizgiler = [];
  for (let i = 0; i <= adet; i++) {
    const t = i / adet;
    const aci = baslangic + (bitis - baslangic) * t;
    const buyuk = i % 5 === 0;
    const derinlik = buyuk ? 4.6 : 2.9;
    const kalem = buyuk ? 1.9 : 1.5;
    const dis = R + KALINLIK / 2 + 0.8;
    const [x1, y1] = nokta(merkez, dis - derinlik, aci);
    const [x2, y2] = nokta(merkez, dis, aci);
    cizgiler.push(
      `      <line x1="${yuvarla(x1)}" y1="${yuvarla(y1)}" x2="${yuvarla(x2)}" y2="${yuvarla(y2)}" stroke-width="${kalem}"/>`,
    );
  }
  return cizgiler;
}

// S, iki yarım yaydan kuruluyor: üstte sağdan başlayıp tepeden sola,
// altta soldan başlayıp dipten sağa. Ortada ikisi birleşiyor.
const UST_BAS = -25;
const UST_BIT = -205; // tepeden geçerek sola
const ALT_BAS = 155;
const ALT_BIT = -25; // dipten geçerek sağa

const [ux1, uy1] = nokta(UST, R, UST_BAS);
const [ux2, uy2] = nokta(UST, R, UST_BIT);
const [ax1, ay1] = nokta(ALT, R, ALT_BAS);
const [ax2, ay2] = nokta(ALT, R, ALT_BIT);

const maskeCizgileri = [
  ...taksimat(UST, UST_BAS - 4, UST_BIT + 4, 20),
  ...taksimat(ALT, ALT_BAS - 4, ALT_BIT + 4, 20),
].join('\n');

function govde(maskeId) {
  return `  <mask id="${maskeId}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
    <rect x="0" y="0" width="100" height="100" fill="white"/>
    <g stroke="black" stroke-linecap="butt">
${maskeCizgileri}
    </g>
  </mask>
  <g mask="url(#${maskeId})" fill="none" stroke="currentColor" stroke-width="${KALINLIK}" stroke-linecap="butt">
    <path d="M ${yuvarla(ux1)} ${yuvarla(uy1)} A ${R} ${R} 0 1 0 ${yuvarla(ux2)} ${yuvarla(uy2)}"/>
    <path d="M ${yuvarla(ax1)} ${yuvarla(ay1)} A ${R} ${R} 0 1 0 ${yuvarla(ax2)} ${yuvarla(ay2)}"/>
  </g>`;
}

const mark = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Swiip">
${govde('swiipMark')}
</svg>
`;

// İkon: aynı işaret, dolu zemin üstünde. Mağaza ikonu şeffaflık kabul etmiyor.
const icon = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Swiip">
  <rect width="100" height="100" rx="22" fill="#131614"/>
  <g color="#F6F7F5" transform="translate(50 50) scale(0.78) translate(-50 -50)">
${govde('swiipIcon')}
  </g>
</svg>
`;

const lockup = `<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Swiip">
  <g transform="translate(0 6) scale(0.88)" color="currentColor">
${govde('swiipLockup')}
  </g>
  <text x="112" y="63" font-family="Archivo, Helvetica Neue, Arial, sans-serif"
        font-size="38" font-weight="700" letter-spacing="-1.2" fill="currentColor">Swiip</text>
</svg>
`;

writeFileSync('brand/mark.svg', mark);
writeFileSync('brand/icon.svg', icon);
writeFileSync('brand/lockup.svg', lockup);
console.log('brand/mark.svg, brand/icon.svg, brand/lockup.svg yazıldı.');
