/**
 * Hareket görselleri içe aktarıcı (F1.5).
 *
 * Kaynak: free-exercise-db — kamu malı (public domain), atıf zorunluluğu yok ama yazıyoruz.
 * wger KULLANILMAZ: CC-BY-SA share-alike, türettiğimiz Türkçe kütüphaneyi rakibe açar.
 *
 * Eşleme `ad_en` üzerinden yapılır ve **otomatik eşleşmeye körü körüne güvenilmez**:
 * skor eşiğinin altındaki eşleşmeler `elle-kontrol.json` dosyasına yazılır, kimse
 * onaylamadan katalog güncellenmez. Yanlış görsel, görselsizden kötüdür — kullanıcı
 * yanlış hareketi yapar.
 *
 * Kullanım:
 *   node scripts/hareket-medya-ice-aktar.mjs --kuru      # eşlemeyi dener, indirmez
 *   node scripts/hareket-medya-ice-aktar.mjs             # indirir ve katalogu günceller
 *
 * Elle onaylanan eşlemeler `data/medya-eslemeleri.json` içinde durur. Değeri `null` olan
 * hareket bilinçli olarak görselsiz kalır; listede hiç geçmeyen hareket ise "henüz
 * bakılmadı" demektir ve rapora düşer.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const kokDizin = join(dirname(fileURLToPath(import.meta.url)), '..');
const medyaDizini = join(kokDizin, 'apps', 'mobile', 'assets', 'hareketler');
const kaynakDizin = join(kokDizin, 'data', 'kaynak', 'hareketler');
const raporDosyasi = join(kokDizin, 'data', 'medya-elle-kontrol.json');
const onayDosyasi = join(kokDizin, 'data', 'medya-eslemeleri.json');

const KURU = process.argv.includes('--kuru');

const FREE_EXERCISE_DB =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const GORSEL_TABANI = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

/** Bu skorun altındaki eşleşme otomatik kabul edilmez. */
const GUVEN_ESIGI = 0.72;

function normalize(metin) {
  return metin
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Kelime kümesi örtüşmesi (Jaccard). Basit ama bu iş için yeterli ve öngörülebilir. */
function benzerlik(a, b) {
  const A = new Set(
    normalize(a)
      .split(' ')
      .filter((k) => k.length > 2),
  );
  const B = new Set(
    normalize(b)
      .split(' ')
      .filter((k) => k.length > 2),
  );
  if (A.size === 0 || B.size === 0) return 0;

  const kesisim = [...A].filter((k) => B.has(k)).length;
  const birlesim = new Set([...A, ...B]).size;
  return kesisim / birlesim;
}

async function kataloguOku() {
  const { readdir } = await import('node:fs/promises');
  const { pathToFileURL } = await import('node:url');

  const dosyalar = (await readdir(kaynakDizin)).filter((d) => d.endsWith('.mjs')).sort();
  const hareketler = [];

  for (const dosya of dosyalar) {
    const modul = await import(pathToFileURL(join(kaynakDizin, dosya)).href);
    for (const hareket of modul.default) {
      hareketler.push({ id: hareket.id, ad_tr: hareket.ad_tr, ad_en: hareket.ad_en });
    }
  }
  return hareketler;
}

async function onaylariOku() {
  try {
    const ham = await readFile(onayDosyasi, 'utf8');
    return JSON.parse(ham).eslemeler ?? {};
  } catch {
    // Onay dosyası yoksa akış durmaz; her şey elle kontrol listesine düşer.
    return {};
  }
}

async function calistir() {
  console.log('free-exercise-db indiriliyor (kamu malı)…');
  const yanit = await fetch(FREE_EXERCISE_DB);
  if (!yanit.ok) throw new Error(`free-exercise-db ${yanit.status}`);
  const disKaynak = await yanit.json();
  console.log(`${disKaynak.length} dış kayıt alındı.`);

  const katalog = await kataloguOku();
  console.log(`${katalog.length} kendi hareketimiz var.`);

  const onaylar = await onaylariOku();
  const adaGore = new Map(disKaynak.map((dis) => [dis.name, dis]));

  // Onay dosyası kaynakta olmayan bir ada işaret ediyorsa sessizce geçmeyiz:
  // kaynak veri değişmiş demektir ve eşleme yeniden gözden geçirilmelidir.
  const kirikOnaylar = Object.entries(onaylar).filter(([, ad]) => ad !== null && !adaGore.has(ad));
  if (kirikOnaylar.length > 0) {
    throw new Error(
      'Onay dosyasındaki şu adlar kaynakta yok, eşlemeyi güncelle:\n' +
        kirikOnaylar.map(([id, ad]) => `  ${id} -> ${ad}`).join('\n'),
    );
  }

  const otomatik = [];
  const elleKontrol = [];
  const bilerekBos = [];

  for (const hareket of katalog) {
    if (Object.prototype.hasOwnProperty.call(onaylar, hareket.id)) {
      const onayliAd = onaylar[hareket.id];
      if (onayliAd === null) {
        bilerekBos.push(hareket.id);
        continue;
      }

      const dis = adaGore.get(onayliAd);
      otomatik.push({
        id: hareket.id,
        ad_tr: hareket.ad_tr,
        eslesen: dis.name,
        skor: 'elle',
        gorseller: dis.images,
      });
      continue;
    }

    const adaylar = disKaynak
      .map((dis) => ({ dis, skor: benzerlik(hareket.ad_en, dis.name) }))
      .sort((a, b) => b.skor - a.skor);

    const enIyi = adaylar[0];

    if (enIyi && enIyi.skor >= GUVEN_ESIGI && (enIyi.dis.images ?? []).length > 0) {
      otomatik.push({
        id: hareket.id,
        ad_tr: hareket.ad_tr,
        eslesen: enIyi.dis.name,
        skor: Math.round(enIyi.skor * 100) / 100,
        gorseller: enIyi.dis.images,
      });
    } else {
      elleKontrol.push({
        id: hareket.id,
        ad_tr: hareket.ad_tr,
        ad_en: hareket.ad_en,
        en_yakin_uc: adaylar.slice(0, 3).map((a) => ({
          ad: a.dis.name,
          skor: Math.round(a.skor * 100) / 100,
          gorsel_var: (a.dis.images ?? []).length > 0,
        })),
      });
    }
  }

  console.log(`\nOtomatik eşleşen: ${otomatik.length}`);
  console.log(`Elle kontrol gereken: ${elleKontrol.length}`);

  await writeFile(
    raporDosyasi,
    `${JSON.stringify(
      {
        uretildi: 'scripts/hareket-medya-ice-aktar.mjs',
        not:
          'Buradaki hareketler otomatik eşleşmedi. Yanlış görsel görselsizden kötüdür: ' +
          'kullanıcı yanlış hareketi yapar. Her birini elle eşle veya boş bırak.',
        guven_esigi: GUVEN_ESIGI,
        elle_kontrol: elleKontrol,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`Elle kontrol listesi yazıldı: ${raporDosyasi}`);

  if (KURU) {
    console.log('\nKuru çalışma: görsel indirilmedi.');
    console.log('Örnek eşleşmeler:');
    for (const e of otomatik.slice(0, 5)) {
      console.log(`  ${e.ad_tr}  ←  ${e.eslesen}  (${e.skor})`);
    }
    return;
  }

  await mkdir(medyaDizini, { recursive: true });
  const indirilenler = [];

  for (const eslesme of otomatik) {
    // Her hareket için ilk kare yeterli; hareketli medya v2'de.
    const gorsel = eslesme.gorseller[0];
    const url = `${GORSEL_TABANI}/${gorsel}`;

    const cevap = await fetch(url);
    if (!cevap.ok) {
      console.warn(`  atlandı (${cevap.status}): ${eslesme.id}`);
      continue;
    }

    const veri = Buffer.from(await cevap.arrayBuffer());
    await writeFile(join(medyaDizini, `${eslesme.id}.jpg`), veri);
    indirilenler.push(eslesme.id);
    process.stdout.write(`  ${indirilenler.length}/${otomatik.length}
`);
  }

  process.stdout.write('\n');
  console.log(`${indirilenler.length} görsel indirildi: ${medyaDizini}`);

  // Hangi hareketin görseli var: uygulama bunu okur, dosya sistemine bakmaz.
  await writeFile(
    join(kokDizin, 'data', 'medya-envanteri.json'),
    `${JSON.stringify(
      {
        uretildi: 'scripts/hareket-medya-ice-aktar.mjs',
        kaynak: 'free-exercise-db (kamu malı)',
        gorseli_olan: [...indirilenler].sort(),
      },
      null,
      2,
    )}
`,
    'utf8',
  );
  // React Native değişkenli require() çözemez; statik harita üretiyoruz.
  const haritaYolu = join(kokDizin, 'apps', 'mobile', 'src', 'veri', 'hareketMedyasi.uretilmis.ts');
  const satirlar = [...indirilenler]
    .sort()
    .map((id) => `  '${id}': require('../../assets/hareketler/${id}.jpg'),`);

  await writeFile(
    haritaYolu,
    [
      '/* eslint-disable @typescript-eslint/no-require-imports */',
      '/**',
      ' * ÜRETİLMİŞ DOSYA — elle düzenleme.',
      ' * Üreten: scripts/hareket-medya-ice-aktar.mjs',
      ' * Kaynak: free-exercise-db (kamu malı).',
      ' *',
      ' * React Native paketleyicisi değişkenli require() çözemediği için harita statik.',
      ' */',
      '',
      'export const HAREKET_GORSELLERI: Record<string, number> = {',
      ...satirlar,
      '};',
      '',
      '/** Görseli olmayan hareket için undefined döner; ekran bunu boş alanla karşılar. */',
      'export function hareketGorseli(id: string): number | undefined {',
      '  return HAREKET_GORSELLERI[id];',
      '}',
      '',
    ].join('\n'),
    'utf8',
  );
  console.log(`Görsel haritası yazıldı: ${haritaYolu}`);

  console.log(
    'Kaynak: free-exercise-db (kamu malı). Atıf zorunlu değil ama uygulamada belirtiyoruz.',
  );
}

calistir().catch((hata) => {
  console.error('\n' + (hata instanceof Error ? hata.message : String(hata)));
  process.exit(1);
});
