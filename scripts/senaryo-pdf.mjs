/**
 * Testçiye verilecek çekim senaryosunu PDF'e basar.
 *
 * Kaynak `magaza/appstore/video-cekim-talimati.md`. PDF elle yazılmıyor: iki kopya
 * tutulsaydı biri güncellenip öteki unutulurdu ve testçinin elindeki yanlış olurdu.
 * Senaryoda zaten iki yanlış yönerge tam bu şekilde kalmıştı (eski build numarası ve
 * olmayan bir düğmeye "bas" diyen adım).
 *
 * Basım Chrome'un headless `--print-to-pdf` kipiyle. Ekstra bağımlılık yok; Brave
 * kullanıcının günlük tarayıcısı, ona dokunulmuyor.
 *
 *   node scripts/senaryo-pdf.mjs [cikti.pdf]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const KAYNAK = join(KOK, 'magaza/appstore/video-cekim-talimati.md');
const CIKTI = resolve(process.argv[2] ?? join(KOK, 'video-cekim-talimati.pdf'));

const TARAYICILAR = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const tarayici = TARAYICILAR.find((y) => existsSync(y));
if (!tarayici) {
  console.error('Chromium tabanlı tarayıcı bulunamadı; PDF basılamıyor.');
  process.exit(1);
}

const kacir = (m) => m.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Satır içi biçimlendirme. Sıra önemli: kod parçaları önce çıkarılıyor. */
/**
 * Kod parçalarının çeviri sırasında korunması için yer tutucu.
 *
 * Önce NUL (U+0000) kullanılmıştı ve lint haklı olarak düştü: düzenli ifadeye
 * kontrol karakteri koymak, gözle görülmeyen bir eşleşme demek. U+E000 özel
 * kullanım alanından, yani markdown kaynağında geçmesi mümkün değil — ama kaynağa
 * görünmez bir bayt gömmemek için burada ADIYLA duruyor.
 */
const YER_TUTUCU = '\uE000';
const YER_TUTUCU_DESENI = new RegExp(`${YER_TUTUCU}(\\d+)${YER_TUTUCU}`, 'g');

function satirIci(ham) {
  const kodlar = [];
  let m = ham.replace(/`([^`]+)`/g, (_, k) => {
    kodlar.push(k);
    return `${YER_TUTUCU}${kodlar.length - 1}${YER_TUTUCU}`;
  });
  m = kacir(m)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return m.replace(YER_TUTUCU_DESENI, (_, i) => `<code>${kacir(kodlar[Number(i)])}</code>`);
}

/**
 * Markdown'ın yalnızca bu dosyada kullanılan altkümesini çeviriyor: başlık, tablo,
 * sıralı/sırasız liste, alıntı, kod bloğu. Genel amaçlı bir çevirici değil.
 */
function cevir(md) {
  const satirlar = md.replace(/\r\n/g, '\n').split('\n');
  const cikti = [];
  const yigin = [];
  let i = 0;

  const listeKapat = () => {
    while (yigin.length) cikti.push(`</${yigin.pop()}>`);
  };

  while (i < satirlar.length) {
    const s = satirlar[i];

    if (/^```/.test(s)) {
      listeKapat();
      const govde = [];
      i++;
      while (i < satirlar.length && !/^```/.test(satirlar[i])) govde.push(satirlar[i++]);
      i++;
      cikti.push(`<pre>${kacir(govde.join('\n'))}</pre>`);
      continue;
    }

    if (/^\|/.test(s) && /^\|[\s:|-]+\|$/.test(satirlar[i + 1] ?? '')) {
      listeKapat();
      const hucre = (satir) =>
        satir
          .split('|')
          .slice(1, -1)
          .map((h) => h.trim());
      const baslik = hucre(s);
      i += 2;
      const govde = [];
      while (i < satirlar.length && /^\|/.test(satirlar[i])) govde.push(hucre(satirlar[i++]));
      cikti.push(
        `<table><thead><tr>${baslik.map((h) => `<th>${satirIci(h)}</th>`).join('')}</tr></thead>` +
          `<tbody>${govde
            .map((r) => `<tr>${r.map((h) => `<td>${satirIci(h)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table>`,
      );
      continue;
    }

    if (/^---+$/.test(s)) {
      listeKapat();
      i++;
      continue;
    }

    const basl = /^(#{1,4})\s+(.*)$/.exec(s);
    if (basl) {
      listeKapat();
      const n = basl[1].length;
      cikti.push(`<h${n}>${satirIci(basl[2])}</h${n}>`);
      i++;
      continue;
    }

    if (/^>\s?/.test(s)) {
      listeKapat();
      const govde = [];
      while (i < satirlar.length && /^>\s?/.test(satirlar[i])) {
        govde.push(satirlar[i].replace(/^>\s?/, ''));
        i++;
      }
      cikti.push(`<blockquote>${satirIci(govde.join(' '))}</blockquote>`);
      continue;
    }

    const sirali = /^(\d+)\.\s+(.*)$/.exec(s);
    const madde = /^\s*-\s+(.*)$/.exec(s);
    if (sirali || madde) {
      const tur = sirali ? 'ol' : 'ul';
      if (yigin[yigin.length - 1] !== tur) {
        listeKapat();
        yigin.push(tur);
        if (tur === 'ol') {
          /**
           * Numara `counter-reset` ile veriliyor, `start` özniteliğiyle değil.
           *
           * Liste `list-style: none` çünkü numaranın yanına işaretleme kutusu
           * koyuyoruz; o durumda numarayı CSS sayacı basıyor ve sayaç `start`'ı
           * GÖRMÜYOR. İlk basımda bu yüzden her bölüm 1'den başladı — oysa senaryo
           * baştan sona 18 adım ve testçi "6. adım" diye konuşacak.
           */
          cikti.push(`<ol style="counter-reset: adim ${Number(sirali[1]) - 1}">`);
        } else {
          cikti.push('<ul>');
        }
      }
      const parcalar = [sirali ? sirali[2] : madde[1]];
      const altMaddeler = [];
      i++;
      while (i < satirlar.length && /^\s{2,}\S/.test(satirlar[i])) {
        const satir = satirlar[i].trim();
        const alt = /^-\s+(.*)$/.exec(satir);
        if (alt) {
          altMaddeler.push([alt[1]]);
        } else if (altMaddeler.length) {
          // Alt maddenin devam satırı; sonuncusuna ekleniyor.
          altMaddeler[altMaddeler.length - 1].push(satir);
        } else {
          parcalar.push(satir);
        }
        i++;
      }
      const alt = altMaddeler.length
        ? `<ul class="alt">${altMaddeler.map((p) => `<li>${satirIci(p.join(' '))}</li>`).join('')}</ul>`
        : '';
      cikti.push(`<li>${satirIci(parcalar.join(' '))}${alt}</li>`);
      continue;
    }

    if (!s.trim()) {
      listeKapat();
      i++;
      continue;
    }

    listeKapat();
    const parcalar = [s];
    i++;
    while (
      i < satirlar.length &&
      satirlar[i].trim() &&
      !/^[#>|`]|^\d+\.\s|^\s*-\s/.test(satirlar[i])
    ) {
      parcalar.push(satirlar[i]);
      i++;
    }
    cikti.push(`<p>${satirIci(parcalar.join(' '))}</p>`);
  }
  listeKapat();
  return cikti.join('\n');
}

/**
 * Baskı stili. Renkler marka paletinden: mürekkep #131614, çam yeşili #14615A,
 * zemin #F6F7F5. Neon ve turuncu yok.
 *
 * Sıralı maddelerin soluna işaretleme kutusu konuyor: testçi adım adım gidiyor,
 * nerede kaldığını işaretleyebilsin. Kutular yalnızca burada, çünkü yalnızca burada
 * sırayla yapılan bir iş var.
 */
const STIL = `
  @page { size: A4; margin: 17mm 15mm 15mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Inter", "Segoe UI", system-ui, sans-serif;
    color: #131614; font-size: 10.5pt; line-height: 1.5; margin: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1 { font-size: 19pt; letter-spacing: -0.4pt; margin: 0 0 4mm; line-height: 1.2; }
  h2 {
    font-size: 12.5pt; margin: 8mm 0 3mm; padding-top: 2.5mm;
    border-top: 1px solid #131614; break-after: avoid; line-height: 1.3;
  }
  h3 { font-size: 11pt; margin: 5mm 0 2mm; break-after: avoid; }
  p { margin: 0 0 2.5mm; }
  code {
    font-family: "JetBrains Mono", Consolas, ui-monospace, monospace;
    font-size: 9pt; background: #F6F7F5; border: 1px solid #E2E5E0;
    border-radius: 2px; padding: 0.2mm 1mm;
  }
  pre {
    font-family: "JetBrains Mono", Consolas, ui-monospace, monospace;
    font-size: 8.5pt; background: #F6F7F5; border-left: 2px solid #14615A;
    padding: 3mm 4mm; margin: 3mm 0; white-space: pre-wrap; break-inside: avoid;
  }
  table { border-collapse: collapse; width: 100%; margin: 3mm 0 4mm; break-inside: avoid; }
  th, td { text-align: left; padding: 2mm 2.5mm; border-bottom: 1px solid #E2E5E0; vertical-align: top; }
  th {
    font-size: 8pt; text-transform: uppercase; letter-spacing: 0.6pt;
    color: #4A524D; border-bottom: 1px solid #131614;
  }
  td code { font-size: 8.5pt; }
  ul { margin: 0 0 3mm; padding-left: 4.5mm; }
  ul li { margin-bottom: 1.5mm; }
  ol { list-style: none; margin: 0 0 3mm; padding-left: 0; }
  ul.alt { margin: 1.5mm 0 0; padding-left: 4mm; list-style: none; }
  ul.alt > li {
    position: relative; padding-left: 3.5mm; margin-bottom: 1mm;
    counter-increment: none;
  }
  ul.alt > li::before {
    content: ""; position: absolute; left: 0; top: 1.7mm;
    width: 1.3mm; height: 1.3mm; background: #14615A; border-radius: 50%;
  }
  /* Yalnizca DOGRUDAN cocuklar. Alt maddeler kutu da numara da almamali ve sayaci
     artirmamali; ilk basimda torun secici kullanildi, alt maddeler de sayildi ve
     adim numaralari 6, 11, 12 diye sicradi. */
  ol > li {
    position: relative; padding-left: 13mm; margin-bottom: 2.5mm;
    break-inside: avoid; counter-increment: adim;
  }
  ol > li::before {
    content: ""; position: absolute; left: 0; top: 0.9mm;
    width: 3.8mm; height: 3.8mm; border: 1px solid #131614; border-radius: 1px;
  }
  ol > li::after {
    content: counter(adim) "."; position: absolute; left: 5.8mm; top: 0;
    font-family: "JetBrains Mono", Consolas, ui-monospace, monospace;
    font-size: 9.5pt; color: #14615A; font-variant-numeric: tabular-nums;
  }
  blockquote {
    margin: 3mm 0; padding: 3mm 4mm; background: #F6F7F5;
    border-left: 2px solid #14615A; break-inside: avoid;
  }
  blockquote p:last-child { margin-bottom: 0; }
  strong { font-weight: 650; }
`;

const govde = cevir(readFileSync(KAYNAK, 'utf8'));
const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<title>Swiip — video çekim senaryosu</title><style>${STIL}</style></head>
<body>${govde}</body></html>`;

const gecici = mkdtempSync(join(tmpdir(), 'swiip-pdf-'));
const htmlYolu = join(gecici, 'senaryo.html');
writeFileSync(htmlYolu, html, 'utf8');

execFileSync(
  tarayici,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${CIKTI}`,
    `file:///${htmlYolu.replace(/\\/g, '/')}`,
  ],
  { stdio: 'pipe' },
);

if (!existsSync(CIKTI)) {
  console.error('PDF üretilmedi.');
  process.exit(1);
}
console.log(`PDF   : ${CIKTI} (${(readFileSync(CIKTI).length / 1024).toFixed(0)} KB)`);
console.log(`HTML  : ${htmlYolu}`);
