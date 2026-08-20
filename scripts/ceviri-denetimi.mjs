/**
 * Çeviri denetimi (F10.1).
 *
 * Ekranlarda satır içi Türkçe metin bırakılmadığını doğrular. Sözlük altyapısı tek
 * başına yetmez: bir ekrana elle yazılmış tek bir Türkçe cümle, İngilizceye geçen
 * kullanıcının karşısına yarı çevrilmiş bir sayfa çıkarır.
 *
 * Neden ayrı bir betik, ESLint kuralı değil: kural yazmak yeni bir eklenti bağımlılığı
 * demekti. Burada aradığımız şey dar ve iyi tanımlı — görünen metin taşıyan JSX düğümleri
 * ve gösterim propları.
 *
 * Kapsam dışı olanlar bilinçli:
 *  - Türkçe yorumlar. Kod tabanı Türkçe yazılıyor, bu bir tercih.
 *  - Veri listeleri (ekipman adları, malzeme adları). Bunlar soru bankasından ve
 *    tarif veritabanından geliyor; çevirileri veri katmanının işi.
 *
 * Tespit **Türkçe karakter aramıyor.** Aramak, "Geri", "Devam", "Plan" gibi yalnızca ASCII
 * harf içeren Türkçe metinleri ağdan kaçırırdı — nitekim bu betiğin ilk hâli ayarlar
 * ekranındaki satır içi "Plan" yazısını görmedi.
 *
 * Kural bunun yerine biçimsel: **gösterim propuna düz dize yazılamaz, JSX metin düğümü
 * harf içeremez.** Metin sözlükten gelir. Böylece dilden bağımsız çalışır ve İngilizce
 * bırakılmış bir metin de yakalanır.
 *
 * Yanlış pozitif riski tek yerde: `>` ve `<` karakterleri TypeScript jeneriklerinde ve
 * karşılaştırmalarda da geçiyor. Metin düğümü sayılması için parçanın tek satırda kalması
 * ve kod noktalama işareti taşımaması aranıyor.
 *
 * Kullanım: node scripts/ceviri-denetimi.mjs
 */
import { readFile } from 'node:fs/promises';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');

const TARANAN_KLASORLER = ['apps/mobile/app', 'apps/mobile/src'];

/** Kullanıcıya metin gösteren proplar. */
const GOSTERIM_PROPLARI = [
  'baslik',
  'govde',
  'metin',
  'aciklama',
  'mesaj',
  'title',
  'placeholder',
  'accessibilityLabel',
  'accessibilityHint',
  'headerBackTitle',
  'erisimIpucu',
  'label',
];

const HARF = /[A-Za-zçğıöşüÇĞİÖŞÜ]/;

/**
 * Gösterim propunda düz dize olarak durmasına izin verilenler: çeviriye konu olmayan
 * simge ve birimler. Liste bilinçli olarak kısa — büyüdüğü an kural anlamını yitirir.
 */
const SERBEST = new Set(['•', '–', '—', '·', '%', '+', '-', '/', 'kg', 'cm', 'g', 'ml', 'kcal']);

/** Metin düğümü değil, kod parçası olduğunu ele veren işaretler. */
const KOD_ISARETI = /[=;(){}[\]`$]|=>|\.\.\./;

/**
 * Şablon dizesindeki `${...}` parçaları çıkarır.
 *
 * `` `${ad}: ${deger}` `` çevrilecek bir şey içermiyor; `` `${dakika} DK` `` içeriyor.
 * Ayrımı yapmadan ikisini de işaretlemek, betiği gürültüden dolayı kapattırırdı.
 */
const ifadeleriSil = (deger) => deger.replace(/\$\{[^}]*\}/g, ' ');

function dosyalariTopla(klasor, biriktir = []) {
  for (const ad of readdirSync(klasor)) {
    const yol = join(klasor, ad);
    if (statSync(yol).isDirectory()) dosyalariTopla(yol, biriktir);
    else if (ad.endsWith('.tsx')) biriktir.push(yol);
  }
  return biriktir;
}

/** Yorumları boşlukla değiştirir; satır numaraları korunur. */
function yorumlariSil(kaynak) {
  return kaynak
    .replace(/\/\*[\s\S]*?\*\//g, (eslesme) => eslesme.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (eslesme) => ' '.repeat(eslesme.length));
}

function bulgular(kaynak) {
  const temiz = yorumlariSil(kaynak);
  const satirlar = temiz.split('\n');
  const sonuc = [];

  // 1) Gösterim proplarına doğrudan yazılmış dizeler.
  const propKalibi = new RegExp(
    `\\b(${GOSTERIM_PROPLARI.join('|')})=(?:"([^"]*)"|'([^']*)'|\\{\`([^\`]*)\`\\})`,
    'g',
  );

  satirlar.forEach((satir, i) => {
    for (const eslesme of satir.matchAll(propKalibi)) {
      const deger = (eslesme[2] ?? eslesme[3] ?? eslesme[4] ?? '').trim();
      const sabit = ifadeleriSil(deger).trim();
      if (HARF.test(sabit) && !SERBEST.has(sabit)) sonuc.push({ satir: i + 1, metin: deger });
    }
  });

  // 2) Nesne alanı olarak yazılmış gösterim propları: `title: 'Program'`.
  //    JSX propları `=` ile, seçenek nesneleri `:` ile yazılıyor; ikisi de metin taşıyor.
  const nesneKalibi = new RegExp(
    `\\b(${GOSTERIM_PROPLARI.join('|')}): *(?:"([^"]*)"|'([^']*)')`,
    'g',
  );

  satirlar.forEach((satir, i) => {
    for (const eslesme of satir.matchAll(nesneKalibi)) {
      const deger = (eslesme[2] ?? eslesme[3] ?? '').trim();
      if (HARF.test(deger) && !SERBEST.has(deger)) sonuc.push({ satir: i + 1, metin: deger });
    }
  });

  // 3) JSX metin düğümleri: > ile < arasında kalan, ifade içermeyen düz metin.
  //
  //    Kural DİLDEN BAĞIMSIZ. Önceki hâli yalnızca Türkçe'ye özgü harf arıyordu
  //    (`[çğıöşü...]`); "Devam", "Plan", "Save" gibi yalnızca ASCII harf taşıyan metinler
  //    ağdan geçiyordu. Props tarafında kural genelleştirilmişti ama metin düğümü
  //    tarafında yarım kalmıştı — `KOD_ISARETI` de bu yüzden hiç kullanılmıyordu.
  //    `(?<![=-])` : `=> Promise<void>` gibi tip imzalarını dışarıda bırakır. Oradaki
  //    `>` bir etiket kapanışı değil, okun parçası.
  for (const eslesme of temiz.matchAll(/(?<![=-])>([^<>{}]*)</g)) {
    const metin = eslesme[1].trim();
    if (metin.length === 0) continue;

    // Tek satırda kalmalı: satır sonu, metin düğümü değil biçimlendirme demek.
    if (/\n/.test(metin)) continue;
    if (!HARF.test(metin)) continue;
    if (SERBEST.has(metin)) continue;

    // Kod parçası mı? JSX arasında kalan tip parametreleri ve ifadeler böyle ayrılıyor.
    if (KOD_ISARETI.test(metin)) continue;

    const satir = temiz.slice(0, eslesme.index).split('\n').length;
    sonuc.push({ satir, metin });
  }

  return sonuc;
}

const dosyalar = TARANAN_KLASORLER.flatMap((klasor) => dosyalariTopla(join(KOK, klasor)));
const hatalar = [];

for (const dosya of dosyalar) {
  const kaynak = await readFile(dosya, 'utf8');
  for (const bulgu of bulgular(kaynak)) {
    hatalar.push(`${relative(KOK, dosya)}:${bulgu.satir}  ${bulgu.metin}`);
  }
}

if (hatalar.length > 0) {
  console.error(
    `Ekranlarda ${hatalar.length} satır içi Türkçe metin kaldı.\n` +
      'Bunları packages/shared/src/metinler.tr.ts ve metinler.en.ts içine taşı,\n' +
      'ekranda useMetinler() ile oku.\n',
  );
  for (const hata of hatalar) console.error('  ' + hata);
  process.exit(1);
}

console.log(`Çeviri denetimi temiz — ${dosyalar.length} ekran tarandı.`);
