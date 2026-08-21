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

/**
 * Yarıçap ve merkezler birbirine bağlı: merkezler arası mesafe tam 2R olmalı ki iki
 * çember **teğet** olsun ve S ortada gerçekten birleşsin. İlk denemede bu tutmuyordu
 * ve işaret iki ayrı C gibi okunuyordu.
 */
const R = 16;
const KALINLIK = 12;
const UST = { cx: 50, cy: 50 - R };
const ALT = { cx: 50, cy: 50 + R };

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
    const buyuk = i % 3 === 0;
    // Sığ ve seyrek: ilk denemede çentikler o kadar sık ve derindi ki işaret
    // ölçü aleti değil dişli çark okunuyordu.
    const derinlik = buyuk ? 6.8 : 4.2;
    const kalem = buyuk ? 1.9 : 1.4;
    const dis = R + KALINLIK / 2 + 0.8;
    const [x1, y1] = nokta(merkez, dis - derinlik, aci);
    const [x2, y2] = nokta(merkez, dis, aci);
    cizgiler.push(
      `      <line x1="${yuvarla(x1)}" y1="${yuvarla(y1)}" x2="${yuvarla(x2)}" y2="${yuvarla(y2)}" stroke-width="${kalem}"/>`,
    );
  }
  return cizgiler;
}

/**
 * S, teğet noktasında (50,50) birleşen iki 250°'lik yay.
 *
 * Üst yay sağ üstten başlar, ekranda saat yönünün TERSİNE (açı azalarak) tepeden ve
 * soldan dolanıp teğet noktasına iner. Alt yay aynı noktadan başlar, saat yönünde
 * sağdan ve dipten dolanıp sol alta çıkar. Açılar 180°'yi aştığı için her ikisinde de
 * large-arc bayrağı 1.
 */
const UST_BAS = -20;
// Alt yay teğet noktadan (50,50) başlıyor; yol tek `d` içinde orada birleşiyor.
const ALT_BIT = 160;

const [ux1, uy1] = nokta(UST, R, UST_BAS);
const [ax2, ay2] = nokta(ALT, R, ALT_BIT);

/**
 * Taksimat YALNIZCA üst yayın dış kenarında.
 *
 * İlk iki denemede çentikler her iki yayın çevresine dağıtılmıştı ve işaret ölçü aleti
 * değil testere okunuyordu. Made2Fit'in işaretine bakınca sebep görüldü: orada da
 * çentikler tek bir yerde, açıölçerin dış kavsinde, yelpaze gibi duruyor. Gövdenin geri
 * kalanı temiz. Aynı kompozisyon buraya taşındı.
 */
const maskeCizgileri = taksimat(UST, -30, -195, 11).join('\n');

function govde(maskeId) {
  return `  <mask id="${maskeId}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
    <rect x="0" y="0" width="100" height="100" fill="white"/>
    <g stroke="black" stroke-linecap="butt">
${maskeCizgileri}
    </g>
  </mask>
  <g mask="url(#${maskeId})" fill="none" stroke="currentColor" stroke-width="${KALINLIK}" stroke-linecap="butt">
    <path d="M ${yuvarla(ux1)} ${yuvarla(uy1)} A ${R} ${R} 0 1 0 50 50 A ${R} ${R} 0 1 1 ${yuvarla(ax2)} ${yuvarla(ay2)}"/>
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

/**
 * Uygulama içindeki işaret.
 *
 * Bu bileşen olmadan işaret İKİ YERDE ayrı yaşıyordu: `brand/mark.svg` ve
 * `apps/mobile/app/index.tsx` içinde elle çizilmiş yollar. İsim Swiip olduktan sonra
 * SVG güncellendi ama uygulama açılışı hâlâ eski 2 rakamını çiziyordu — metin araması
 * yakalamaz, çünkü fark metinde değil geometride.
 *
 * Artık ikisi de buradan üretiliyor.
 */
const rnBilesen = `import Svg, { G, Line, Mask, Path, Rect } from 'react-native-svg';

/**
 * Marka işareti — ÜRETİLMİŞ DOSYA, elle düzenleme.
 * Kaynak: scripts/marka-uret.mjs · yeniden üretmek için: npm run marka
 *
 * İşaretin kendisi bir ölçü aleti: S, teğet noktasında birleşen iki yaydan kuruluyor
 * ve üst yayın dış kenarında açıölçer taksimatı var.
 */
export function Isaret({ renk, boyut = 72 }: { renk: string; boyut?: number }) {
  return (
    <Svg width={boyut} height={boyut} viewBox="0 0 100 100">
      <Mask id="swiipMark" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
        <Rect x="0" y="0" width="100" height="100" fill="white" />
        <G stroke="black" strokeLinecap="butt">
${taksimat(UST, -30, -195, 11)
  .map((satir) => {
    const s = satir.trim().replace('<line ', '').replace('/>', '');
    const oz = Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]+)"/g)].map((m) => [m[1], m[2]]));
    return `          <Line x1={${oz.x1}} y1={${oz.y1}} x2={${oz.x2}} y2={${oz.y2}} strokeWidth={${oz['stroke-width']}} />`;
  })
  .join('\n')}
        </G>
      </Mask>
      <G mask="url(#swiipMark)" fill="none" stroke={renk} strokeWidth={${KALINLIK}} strokeLinecap="butt">
        <Path d="M ${yuvarla(ux1)} ${yuvarla(uy1)} A ${R} ${R} 0 1 0 50 50 A ${R} ${R} 0 1 1 ${yuvarla(ax2)} ${yuvarla(ay2)}" />
      </G>
    </Svg>
  );
}
`;

writeFileSync('brand/mark.svg', mark);
writeFileSync('brand/icon.svg', icon);
writeFileSync('brand/lockup.svg', lockup);
writeFileSync('apps/mobile/src/marka/Isaret.tsx', rnBilesen);
console.log(
  'brand/mark.svg, brand/icon.svg, brand/lockup.svg, apps/mobile/src/marka/Isaret.tsx yazıldı.',
);
