/**
 * Besin veritabanı içe aktarıcı (F5.4, F5.5).
 *
 * İki kaynak, iki farklı hukuki durum:
 *
 *   openfoodfacts  ODbL — kullanımı serbest, atıf ve "share-alike" yükümlülüğü var.
 *                  Barkodlu ürünler buradan gelir. 200+ ülke, yeni pazarda aynı kaynak.
 *
 *   turkomp        TÜBİTAK + Tarım Bakanlığı. Ham gıda bileşimi burada.
 *                  KULLANIM KOŞULLARI YAZILI TEYİT EDİLMEDEN İÇE AKTARILMAZ.
 *                  Betik bunu `--turkomp-onayi-var` bayrağı olmadan çalıştırmaz.
 *
 * Kullanım:
 *   node scripts/besin-ice-aktar.mjs --kaynak=openfoodfacts --ulke=turkey --limit=2000
 *   node scripts/besin-ice-aktar.mjs --kaynak=turkomp --dosya=turkomp.csv --turkomp-onayi-var
 *   node scripts/besin-ice-aktar.mjs --kaynak=openfoodfacts --kuru        # yazmadan dener
 *
 * Çıktı doğrudan veritabanına yazılır; `DATABASE_URL` gerekir.
 */
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const argv = process.argv.slice(2);
const bayrak = (ad) => argv.includes(`--${ad}`);
const deger = (ad, varsayilan) => {
  const eslesme = argv.find((a) => a.startsWith(`--${ad}=`));
  return eslesme ? eslesme.slice(ad.length + 3) : varsayilan;
};

const KAYNAK = deger('kaynak', 'openfoodfacts');
const ULKE = deger('ulke', 'turkey');
const LIMIT = Number(deger('limit', '1000'));
const DOSYA = deger('dosya', '');
const KURU = bayrak('kuru');

/** Bu değerlerin dışındaki kayıtlar veri hatasıdır; alınmaz. */
const MAKUL = {
  kalori: [0, 900],
  protein_g: [0, 100],
  yag_g: [0, 100],
  karbonhidrat_g: [0, 100],
  lif_g: [0, 80],
};

function makulMu(besin) {
  for (const [alan, [alt, ust]] of Object.entries(MAKUL)) {
    const v = besin.per_100g[alan];
    if (typeof v !== 'number' || Number.isNaN(v) || v < alt || v > ust) return false;
  }
  // Makro toplamı 100 g'ı aşamaz; aşıyorsa kayıt bozuktur.
  const { protein_g, yag_g, karbonhidrat_g } = besin.per_100g;
  return protein_g + yag_g + karbonhidrat_g <= 105;
}

// ---------------------------------------------------------------------------
// Open Food Facts
// ---------------------------------------------------------------------------

/** OFF'un istediği alanlar; tam ürün gövdesi gereksiz yere kat kat büyük geliyor. */
const OFF_ALANLARI = [
  'code',
  'product_name',
  'product_name_tr',
  'brands',
  'serving_size',
  'serving_quantity',
  'categories_tags',
  'nutriments',
].join(',');

/**
 * Geçici sunucu hatasında yeniden dener.
 *
 * OFF halka açık ve ücretsiz bir servis; 503 nadir değil. Tek bir 503'te saatler sürebilen
 * bir içe aktarımı baştan başlatmak makul değil.
 */
async function dayanikliGetir(url, deneme = 0) {
  const yanit = await fetch(url, {
    headers: { 'user-agent': 'Made2Fit/0.1 (made2fit.io)' },
  });

  if (yanit.ok) return yanit.json();
  if (deneme >= 4) throw new Error(`OFF ${yanit.status} (${deneme + 1} deneme sonrası)`);

  // Üstel bekleme: 3, 6, 12, 24 saniye.
  const bekleme = 3000 * 2 ** deneme;
  process.stdout.write(`\n  ${yanit.status} — ${bekleme / 1000} sn sonra tekrar denenecek\n`);
  await new Promise((coz) => setTimeout(coz, bekleme));
  return dayanikliGetir(url, deneme + 1);
}

/**
 * OFF arama API'si (v2). Sayfa sayfa çeker; hız sınırına takılmamak için aralık bırakır.
 *
 * Eski `cgi/search.pl` ucu kullanımdan kalkıyor ve düzenli 503 veriyor. v2 desteklenen uç
 * ve `fields` ile yalnızca ihtiyacımız olan alanları istiyoruz — hem hızlı hem nazik.
 *
 * Atıf yükümlülüğü: kaynak alanına `openfoodfacts` yazılır, uygulamada gösterilir.
 */
async function openFoodFactsCek(ulke, limit) {
  const besinler = [];
  const sayfaBoyu = 50;
  const sayfaSayisi = Math.ceil(limit / sayfaBoyu);

  for (let sayfa = 1; sayfa <= sayfaSayisi; sayfa++) {
    const url =
      `https://world.openfoodfacts.org/api/v2/search` +
      `?countries_tags_en=${encodeURIComponent(ulke)}` +
      `&fields=${OFF_ALANLARI}&sort_by=unique_scans_n` +
      `&page_size=${sayfaBoyu}&page=${sayfa}`;

    process.stdout.write(`  sayfa ${sayfa}/${sayfaSayisi}\r`);

    const govde = await dayanikliGetir(url);
    const urunler = govde.products ?? [];
    // Sayfa boşsa kaynak tükenmiştir; boşuna istek atmayız.
    if (urunler.length === 0) break;

    for (const urun of urunler) {
      const besin = offCevir(urun);
      if (besin && makulMu(besin)) besinler.push(besin);
    }

    // Hız sınırı: OFF saniyede birden fazla arama isteği istemiyor.
    await new Promise((coz) => setTimeout(coz, 1500));
  }

  process.stdout.write('\n');
  return besinler;
}

function offCevir(urun) {
  const ad = (urun.product_name_tr || urun.product_name || '').trim();
  const n = urun.nutriments ?? {};
  if (ad === '' || ad.length > 120) return null;

  const kalori =
    typeof n['energy-kcal_100g'] === 'number'
      ? n['energy-kcal_100g']
      : typeof n.energy_100g === 'number'
        ? n.energy_100g / 4.184
        : null;
  if (kalori === null) return null;

  return {
    name_tr: ad,
    name_en: urun.product_name || null,
    per_100g: {
      kalori: Math.round(kalori),
      protein_g: sayi(n.proteins_100g),
      yag_g: sayi(n.fat_100g),
      karbonhidrat_g: sayi(n.carbohydrates_100g),
      lif_g: sayi(n.fiber_100g),
    },
    // Ambalajlı üründe porsiyon genelde paketin kendisidir.
    portions: urun.serving_quantity
      ? [
          {
            id: 'porsiyon',
            ad: urun.serving_size || '1 porsiyon',
            gram: Number(urun.serving_quantity),
          },
        ]
      : [],
    barcode: urun.code || null,
    brand: (urun.brands || '').split(',')[0]?.trim() || null,
    source: 'openfoodfacts',
    // Otomatik içe aktarılan kayıt doğrulanmış sayılmaz; kullanıcı düzeltmesiyle doğrulanır.
    verified: false,
  };
}

const sayi = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10) / 10 : 0);

// ---------------------------------------------------------------------------
// TürKomp
// ---------------------------------------------------------------------------

/**
 * TürKomp CSV içe aktarımı.
 *
 * Beklenen sütunlar: ad, enerji_kcal, protein_g, yag_g, karbonhidrat_g, lif_g
 * Ham gıda olduğu için barkod yok; ev ölçüsü elle eklenir (F5.7).
 */
async function turkompOku(dosya) {
  if (!bayrak('turkomp-onayi-var')) {
    throw new Error(
      'TürKomp kullanım koşulları yazılı teyit edilmeden içe aktarılamaz.\n' +
        'Teyit alındıktan sonra --turkomp-onayi-var bayrağıyla çalıştır.\n' +
        'Bkz. docs/uygulama-plani.md — "Yapılacak dış işler".',
    );
  }
  if (!dosya) throw new Error('--dosya=turkomp.csv gerekli');

  const ham = await readFile(dosya, 'utf8');
  const satirlar = ham.split('\n').filter((s) => s.trim() !== '');
  const basliklar = satirlar[0].split(';').map((b) => b.trim().toLowerCase());

  const besinler = [];
  for (const satir of satirlar.slice(1)) {
    const hucreler = satir.split(';');
    const al = (ad) => {
      const i = basliklar.indexOf(ad);
      return i === -1 ? 0 : Number(String(hucreler[i]).replace(',', '.')) || 0;
    };
    const ad = String(hucreler[basliklar.indexOf('ad')] ?? '').trim();
    if (ad === '') continue;

    const besin = {
      name_tr: ad,
      name_en: null,
      per_100g: {
        kalori: Math.round(al('enerji_kcal')),
        protein_g: al('protein_g'),
        yag_g: al('yag_g'),
        karbonhidrat_g: al('karbonhidrat_g'),
        lif_g: al('lif_g'),
      },
      portions: [],
      barcode: null,
      brand: null,
      source: 'turkomp',
      // Ulusal bileşim tablosu; kaynağı gereği doğrulanmış sayılır.
      verified: true,
    };

    if (makulMu(besin)) besinler.push(besin);
  }

  return besinler;
}

// ---------------------------------------------------------------------------
// Yazma
// ---------------------------------------------------------------------------

async function yaz(besinler) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL tanımlı değil');

  const istemci = new pg.Client({ connectionString: url });
  await istemci.connect();

  let eklenen = 0;
  let guncellenen = 0;

  try {
    for (const besin of besinler) {
      // Barkod varsa ona göre, yoksa ada göre tekilleştir.
      const { rows } = besin.barcode
        ? await istemci.query('select id from foods where barcode = $1', [besin.barcode])
        : await istemci.query('select id from foods where lower(name_tr) = lower($1)', [
            besin.name_tr,
          ]);

      if (rows.length > 0) {
        // Elle doğrulanmış kaydın üzerine otomatik veri yazılmaz.
        await istemci.query(
          `update foods set per_100g_jsonb = $1, brand = coalesce(brand, $2)
           where id = $3 and verified = false`,
          [JSON.stringify(besin.per_100g), besin.brand, rows[0].id],
        );
        guncellenen += 1;
      } else {
        await istemci.query(
          `insert into foods
             (name_tr, name_en, per_100g_jsonb, portions_jsonb, barcode, brand, source, verified, locale)
           values ($1, $2, $3, $4, $5, $6, $7, $8, 'tr-TR')`,
          [
            besin.name_tr,
            besin.name_en,
            JSON.stringify(besin.per_100g),
            JSON.stringify(besin.portions),
            besin.barcode,
            besin.brand,
            besin.source,
            besin.verified,
          ],
        );
        eklenen += 1;
      }
    }
  } finally {
    await istemci.end();
  }

  return { eklenen, guncellenen };
}

// ---------------------------------------------------------------------------

async function calistir() {
  console.log(`Kaynak: ${KAYNAK}${KURU ? ' (kuru çalışma — yazılmayacak)' : ''}`);

  const besinler =
    KAYNAK === 'turkomp' ? await turkompOku(DOSYA) : await openFoodFactsCek(ULKE, LIMIT);

  console.log(`${besinler.length} makul kayıt bulundu.`);

  if (besinler.length > 0) {
    console.log('Örnek:', JSON.stringify(besinler[0], null, 2).slice(0, 400));
  }

  if (KURU) {
    console.log('Kuru çalışma: veritabanına yazılmadı.');
    return;
  }

  const { eklenen, guncellenen } = await yaz(besinler);
  console.log(`${eklenen} yeni kayıt eklendi, ${guncellenen} kayıt güncellendi.`);
  console.log(
    KAYNAK === 'openfoodfacts'
      ? 'ODbL atıf yükümlülüğü: uygulamada "Barkod verisi Open Food Facts (ODbL)" görünmeli.'
      : 'TürKomp atıfı uygulamada görünmeli.',
  );
}

calistir().catch((hata) => {
  console.error('\n' + (hata instanceof Error ? hata.message : String(hata)));
  process.exit(1);
});
