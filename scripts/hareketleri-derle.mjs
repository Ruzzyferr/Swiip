/**
 * data/kaynak/hareketler/*.mjs dosyalarını tek bir data/hareketler.json'a derler.
 * Derleme sırasında doğrular: bilinmeyen kod, kırık muadil zinciri, tekrar eden id.
 *
 * Çalıştırma:  node scripts/hareketleri-derle.mjs [--kontrol]
 * --kontrol    dosyayı yazmaz, yalnızca doğrular (CI için)
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const kokDizin = join(dirname(fileURLToPath(import.meta.url)), '..');
const kaynakDizin = join(kokDizin, 'data', 'kaynak', 'hareketler');
const hedefDosya = join(kokDizin, 'data', 'hareketler.json');
const tsHedefi = join(kokDizin, 'packages', 'shared', 'src', 'hareketler.uretilmis.ts');

const KAS_GRUPLARI = new Set([
  'gogus',
  'sirt',
  'trapez',
  'on_omuz',
  'yan_omuz',
  'arka_omuz',
  'omuz',
  'biceps',
  'triceps',
  'onkol',
  'karin',
  'bel',
  'kalca',
  'quadriceps',
  'hamstring',
  'baldir',
]);

const PATERNLER = new Set([
  'itme_yatay',
  'itme_dikey',
  'cekme_yatay',
  'cekme_dikey',
  'diz_baskin',
  'kalca_baskin',
  'tasima',
  'rotasyon',
  'izolasyon',
]);

const EKIPMANLAR = new Set([
  'barbell',
  'dumbbell',
  'kettlebell',
  'leg_press',
  'hack_squat',
  'lat_pulldown',
  'kablo_makinesi',
  'smith_makinesi',
  'barfiks_bari',
  'dip_bari',
  'duz_bench',
  'egimli_bench',
  'ayarlanabilir_bench',
  'direnc_bandi',
  'kosu_bandi',
  'sabit_bisiklet',
  'kurek_makinesi',
  'merdiven',
  'trx',
  'squat_rack',
  'makine_gogus',
  'makine_hamstring',
  'makine_quadriceps',
  'makine_sirt',
  'makine_omuz',
  'makine_baldir',
  'makine_abduktor',
  'preacher_bench',
  'roman_chair',
  'plyo_box',
]);

const KONTRENDIKASYONLAR = new Set([
  'bel_fitigi',
  'boyun_fitigi',
  'omuz_sikismasi',
  'omuz_instabilite',
  'diz_menisküs',
  'diz_patellofemoral',
  'dirsek_tendinit',
  'bilek_agrisi',
  'kalca_impingement',
  'ayak_bilegi_kisitli',
  'tansiyon_kontrolsuz',
]);

const REFERANS_LIFTLER = new Set(['squat', 'bench', 'deadlift', 'ohp', 'row']);

const EKSENEL = new Set(['yok', 'dusuk', 'orta', 'yuksek']);

const hatalar = [];

function kontrol(kosul, mesaj) {
  if (!kosul) hatalar.push(mesaj);
}

async function kaynaklariOku() {
  const dosyalar = (await readdir(kaynakDizin)).filter((d) => d.endsWith('.mjs')).sort();
  const hareketler = [];
  for (const dosya of dosyalar) {
    const modul = await import(pathToFileURL(join(kaynakDizin, dosya)).href);
    for (const hareket of modul.default) {
      hareketler.push({ ...hareket, _kaynak: dosya });
    }
  }
  return hareketler;
}

function dogrula(hareketler) {
  const idler = new Set();

  for (const h of hareketler) {
    const yer = `${h._kaynak}:${h.id ?? '(id yok)'}`;

    kontrol(typeof h.id === 'string' && /^[a-z0-9-]+$/.test(h.id), `${yer} — id kebab-case olmalı`);
    kontrol(!idler.has(h.id), `${yer} — id tekrar ediyor`);
    idler.add(h.id);

    kontrol(typeof h.ad_tr === 'string' && h.ad_tr.length > 0, `${yer} — ad_tr eksik`);
    kontrol(typeof h.ad_en === 'string' && h.ad_en.length > 0, `${yer} — ad_en eksik`);

    kontrol(
      Array.isArray(h.birincil_kas) && h.birincil_kas.length > 0,
      `${yer} — birincil_kas boş`,
    );
    for (const kas of [...(h.birincil_kas ?? []), ...(h.ikincil_kas ?? [])]) {
      kontrol(KAS_GRUPLARI.has(kas), `${yer} — bilinmeyen kas: ${kas}`);
    }
    for (const ek of h.ekipman ?? []) {
      kontrol(EKIPMANLAR.has(ek), `${yer} — bilinmeyen ekipman: ${ek}`);
    }
    for (const kk of h.kontrendikasyon ?? []) {
      kontrol(KONTRENDIKASYONLAR.has(kk), `${yer} — bilinmeyen kontrendikasyon: ${kk}`);
    }
    kontrol(PATERNLER.has(h.patern), `${yer} — bilinmeyen patern: ${h.patern}`);
    kontrol(EKSENEL.has(h.eksenel_yuk), `${yer} — bilinmeyen eksenel_yuk: ${h.eksenel_yuk}`);

    kontrol(
      Number.isInteger(h.teknik_zorluk) && h.teknik_zorluk >= 1 && h.teknik_zorluk <= 5,
      `${yer} — teknik_zorluk 1-5 arası olmalı`,
    );
    kontrol(Number.isInteger(h.sfr) && h.sfr >= 1 && h.sfr <= 5, `${yer} — sfr 1-5 arası olmalı`);
    kontrol(typeof h.artis_kg === 'number' && h.artis_kg >= 0, `${yer} — artis_kg sayı olmalı`);

    kontrol(
      h.yuk_referansi && REFERANS_LIFTLER.has(h.yuk_referansi.lift),
      `${yer} — yuk_referansi.lift geçersiz`,
    );
    kontrol(
      typeof h.yuk_referansi?.katsayi === 'number' && h.yuk_referansi.katsayi >= 0,
      `${yer} — yuk_referansi.katsayi geçersiz`,
    );

    kontrol(
      Array.isArray(h.talimat_tr) && h.talimat_tr.length >= 4,
      `${yer} — talimat_tr en az 4 adım içermeli`,
    );
    for (const adim of h.talimat_tr ?? []) {
      kontrol(
        typeof adim === 'string' && adim.trim().length > 15,
        `${yer} — talimat adımı çok kısa: "${adim}"`,
      );
    }

    kontrol(
      Array.isArray(h.alternatifler) && h.alternatifler.length >= 2,
      `${yer} — en az 2 muadil gerekli (makine doluysa zinciri)`,
    );

    // Vücut ağırlığı hareketinde yük referansı sıfır olmalı; aksi hâlde yük atanır.
    if (h.vucut_agirligi) {
      kontrol(
        h.yuk_referansi?.katsayi === 0,
        `${yer} — vücut ağırlığı hareketinde katsayı 0 olmalı`,
      );
    }
  }

  // Muadil zincirleri var olan id'lere işaret etmeli.
  for (const h of hareketler) {
    for (const alt of h.alternatifler ?? []) {
      kontrol(idler.has(alt), `${h._kaynak}:${h.id} — muadil bulunamadı: ${alt}`);
      kontrol(alt !== h.id, `${h._kaynak}:${h.id} — kendini muadil göstermiş`);
    }
  }
}

const hareketler = await kaynaklariOku();
dogrula(hareketler);

if (hatalar.length > 0) {
  console.error(`\n${hatalar.length} doğrulama hatası:\n`);
  for (const hata of hatalar) console.error(`  • ${hata}`);
  process.exit(1);
}

const mevcut = JSON.parse(await readFile(hedefDosya, 'utf8'));

const cikti = {
  ...mevcut,
  version: 2,
  durum: `${hareketler.length} hareket. Kaynak: data/kaynak/hareketler/*.mjs — derleyici: scripts/hareketleri-derle.mjs`,
  alanlar: {
    ...mevcut.alanlar,
    yuk_referansi: 'başlangıç yükü tahmini için referans lift ve katsayı',
    sure_bazli: 'set/tekrar yerine süre ile planlanır',
    isinma: 'ısınma bloğunda kullanılır, hacim bütçesine girmez',
    pliometrik: 'zıplama içerir; gürültü ve eklem kısıtında elenir',
    tek_tarafli: 'yük tek tarafa yazılır',
    vucut_agirligi: 'yük ataması yapılmaz',
  },
  hareketler: hareketler
    .map(({ _kaynak, ...h }) => h)
    .sort((a, b) => a.id.localeCompare(b.id, 'tr')),
};

const kontrolModu = process.argv.includes('--kontrol');
if (!kontrolModu) {
  await writeFile(hedefDosya, `${JSON.stringify(cikti, null, 2)}\n`, 'utf8');

  // Paketler dosya sistemine erişemez (React Native dahil); katalog TS modülü olarak da yazılır.
  const ts = [
    '// ÜRETİLMİŞ DOSYA — elle düzenleme.',
    '// Kaynak: data/kaynak/hareketler/*.mjs · Derleyici: scripts/hareketleri-derle.mjs',
    "import type { Hareket } from './domain';",
    '',
    `export const HAREKET_KATALOGU: readonly Hareket[] = ${JSON.stringify(cikti.hareketler, null, 2)};`,
    '',
  ].join('\n');
  await writeFile(tsHedefi, ts, 'utf8');
}

console.log(`${hareketler.length} hareket doğrulandı${kontrolModu ? '' : ' ve yazıldı'}.`);
