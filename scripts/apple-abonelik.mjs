/**
 * App Store abonelik ürünlerini oluşturur/günceller.
 *
 * `play-abonelik.mjs`'in ikizi ve aynı kaynaktan besleniyor: ürün kimlikleri
 * `apps/mobile/src/odeme/magaza.ts` ile `packages/api/src/rotalar/abonelik.ts`'ten
 * okunuyor, burada elle yazılmıyor. İki mağazanın ürün kimliği ayrışırsa RevenueCat
 * hakları tek platformda çalışır ve bunu ancak kullanıcı fark eder.
 *
 * Apple tarafı Play'den daha çok adımlı ve SIRASI önemli; hiçbiri atlanamaz:
 *   grup → grup yerelleştirmesi → abonelik → abonelik yerelleştirmesi →
 *   ülke kullanılabilirliği → Türkiye fiyatı → diğer 174 ülkenin fiyatı →
 *   inceleme ekran görüntüsü
 *
 * Fiyat doğrudan yazılamıyor: Apple'ın kendi **fiyat noktası** listesinden
 * seçiliyor. Türkiye için 99₺'ye en yakın nokta neyse o. Yakın nokta yoksa betik
 * sessizce başka bir fiyata düşmüyor, hata veriyor.
 *
 *   node scripts/apple-abonelik.mjs [inceleme-gorseli.png]
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apple } from './apple-api.mjs';

const kok = join(dirname(fileURLToPath(import.meta.url)), '..');
const UYGULAMA = '6803979374';
const DIL = 'tr';
const ULKE = 'TUR';
const GRUP_ADI = 'Swiip Üyelik';

/** CLAUDE.md'de kilitli fiyatlar. Değiştirmek ürün kararını değiştirmektir. */
const FIYAT = {
  temel: { aylik: 99, yillik: 690 },
  pro: { aylik: 169, yillik: 1190 },
};

const BASLIK = { temel: 'Swiip Temel', pro: 'Swiip Pro' };
const ACIKLAMA = {
  temel: 'Sınırsız program, öğün planı ve ilerleme takibi.',
  pro: 'Temel’in her şeyi, üstüne fotoğraftan yemek tanıma.',
};
const DONEM = { aylik: 'ONE_MONTH', yillik: 'ONE_YEAR' };

/** Ürün kimliklerini koddan oku — iki tarafın ayrışmadığını da doğrular. */
function urunler() {
  const mobil = readFileSync(join(kok, 'apps/mobile/src/odeme/magaza.ts'), 'utf8');
  const api = readFileSync(join(kok, 'packages/api/src/rotalar/abonelik.ts'), 'utf8');

  const satirlar = [
    ...mobil.matchAll(/kod:\s*'(\w+)'\s*,\s*donem:\s*'(\w+)'\s*,\s*urun_id:\s*'([\w_]+)'/g),
  ];
  if (satirlar.length === 0) throw new Error('magaza.ts içinde ürün satırı bulunamadı.');

  return satirlar.map(([, kod, donem, urunId]) => {
    if (!api.includes(urunId)) {
      throw new Error(`"${urunId}" mobilde var ama abonelik.ts'te yok — iki taraf ayrışmış.`);
    }
    return { kod, donem, urunId };
  });
}

/**
 * Sayfalı listeyi sonuna kadar okur.
 *
 * Fiyat noktaları artan sırada ve tek sayfaya sığmıyor: ilk 200 kayıt 200₺'nin
 * altında bitiyor. Sayfalamadan "en yakın nokta"yı seçmek, yıllık planı 690₺ yerine
 * 199,99₺'ye yerleştirmek demekti.
 */
async function tumSayfalar(yol) {
  const hepsi = [];
  let sonraki = yol;
  while (sonraki) {
    const s = await apple(sonraki);
    hepsi.push(...(s.data ?? []));
    sonraki = s.links?.next ?? null;
  }
  return hepsi;
}

/** Var olanı bulur, yoksa oluşturur. Betik tekrar çalıştırılabilir olmalı. */
async function bulVeyaOlustur(listeYolu, esles, olustur) {
  const liste = await apple(listeYolu);
  const mevcut = (liste.data ?? []).find(esles);
  if (mevcut) return { kayit: mevcut, yeni: false };
  const olusan = await apple(olustur.yol, { method: 'POST', body: JSON.stringify(olustur.govde) });
  return { kayit: olusan.data, yeni: true };
}

// --- Grup ---
const grup = await bulVeyaOlustur(
  `/apps/${UYGULAMA}/subscriptionGroups?limit=20`,
  (g) => g.attributes.referenceName === GRUP_ADI,
  {
    yol: '/subscriptionGroups',
    govde: {
      data: {
        type: 'subscriptionGroups',
        attributes: { referenceName: GRUP_ADI },
        relationships: { app: { data: { id: UYGULAMA, type: 'apps' } } },
      },
    },
  },
);
console.log(`  grup ${grup.yeni ? 'oluşturuldu' : 'mevcut'}: ${GRUP_ADI}`);

// Grup yerelleştirmesi olmadan abonelik gönderilemiyor; kullanıcı iptal ekranında
// gördüğü isim burası.
const grupYerel = await bulVeyaOlustur(
  `/subscriptionGroups/${grup.kayit.id}/subscriptionGroupLocalizations?limit=20`,
  (y) => y.attributes.locale === DIL,
  {
    yol: '/subscriptionGroupLocalizations',
    govde: {
      data: {
        type: 'subscriptionGroupLocalizations',
        attributes: { name: 'Swiip', customAppName: 'Swiip', locale: DIL },
        relationships: {
          subscriptionGroup: { data: { id: grup.kayit.id, type: 'subscriptionGroups' } },
        },
      },
    },
  },
);
console.log(`  grup yerelleştirmesi ${grupYerel.yeni ? 'eklendi' : 'mevcut'}: ${DIL}`);

const gorselYolu = process.argv[2];

for (const { kod, donem, urunId } of urunler()) {
  const hedef = FIYAT[kod]?.[donem];
  if (!hedef) throw new Error(`Fiyat tanımsız: ${kod}/${donem}`);
  const ad = `${BASLIK[kod]} (${donem === 'aylik' ? 'aylık' : 'yıllık'})`;

  const abone = await bulVeyaOlustur(
    `/subscriptionGroups/${grup.kayit.id}/subscriptions?limit=50`,
    (s) => s.attributes.productId === urunId,
    {
      yol: '/subscriptions',
      govde: {
        data: {
          type: 'subscriptions',
          attributes: {
            name: ad,
            productId: urunId,
            subscriptionPeriod: DONEM[donem],
            // Aynı gruptaki tüm planlar aynı seviyede: kullanıcı Temel↔Pro arasında
            // yükseltme/düşürme yapabilsin diye seviye farkı Pro'ya veriliyor.
            groupLevel: kod === 'pro' ? 1 : 2,
            familySharable: false,
            reviewNote:
              'Abonelik uygulama içindeki Ayarlar > Üyelik ekranından açılır. Demo hesapla giriş yapıldığında paywall görülebilir.',
          },
          relationships: {
            group: { data: { id: grup.kayit.id, type: 'subscriptionGroups' } },
          },
        },
      },
    },
  );
  const abonelikId = abone.kayit.id;
  console.log(`\n  ${urunId} — ${abone.yeni ? 'oluşturuldu' : 'mevcut'}`);

  // Yerelleştirme
  const yerel = await bulVeyaOlustur(
    `/subscriptions/${abonelikId}/subscriptionLocalizations?limit=20`,
    (y) => y.attributes.locale === DIL,
    {
      yol: '/subscriptionLocalizations',
      govde: {
        data: {
          type: 'subscriptionLocalizations',
          attributes: { name: ad, description: ACIKLAMA[kod], locale: DIL },
          relationships: { subscription: { data: { id: abonelikId, type: 'subscriptions' } } },
        },
      },
    },
  );
  console.log(`    yerelleştirme ${yerel.yeni ? 'eklendi' : 'mevcut'}`);

  // --- Ülke kullanılabilirliği ---
  //
  // Fiyattan ÖNCE gelmeli. Ayarlanmadan fiyat yazmaya çalışınca Apple
  // "An error occurred while processing the pricing information" diyor ve sebebi
  // söylemiyor: ürün o ülkede satılmıyorken o ülke için fiyat kabul edilmiyor.
  // Ayrıca hiç ayarlanmazsa ürün hiçbir yerde satılamaz ve paywall boş açılır.
  try {
    await apple(`/subscriptions/${abonelikId}/subscriptionAvailability`);
    console.log(`    kullanılabilirlik mevcut`);
  } catch {
    await apple('/subscriptionAvailabilities', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'subscriptionAvailabilities',
          attributes: { availableInNewTerritories: false },
          relationships: {
            subscription: { data: { id: abonelikId, type: 'subscriptions' } },
            availableTerritories: { data: [{ id: ULKE, type: 'territories' }] },
          },
        },
      }),
    });
    console.log(`    kullanılabilirlik: ${ULKE}`);
  }

  // --- Fiyat ---
  //
  // Apple fiyatı serbest yazdırmıyor; ülkeye göre sabit bir fiyat noktası listesi var.
  // Hedefe en yakın noktayı seçiyoruz. Sapma büyükse durup haber veriyoruz: sessizce
  // 149₺'ye yerleşmek, kilitli fiyat kararını fark ettirmeden bozmak olurdu.
  const mevcutFiyat = await apple(
    `/subscriptions/${abonelikId}/prices?filter[territory]=${ULKE}&limit=10`,
  );
  let tabanNokta = null;
  if ((mevcutFiyat.data ?? []).length > 0) {
    console.log(`    ${ULKE} fiyatı zaten tanımlı`);
  } else {
    const noktalar = await tumSayfalar(
      `/subscriptions/${abonelikId}/pricePoints?filter[territory]=${ULKE}&limit=200`,
    );
    if (!noktalar.length) throw new Error(`${urunId}: ${ULKE} için fiyat noktası gelmedi.`);

    const enYakin = noktalar.reduce((a, b) =>
      Math.abs(Number(b.attributes.customerPrice) - hedef) <
      Math.abs(Number(a.attributes.customerPrice) - hedef)
        ? b
        : a,
    );
    const secilen = Number(enYakin.attributes.customerPrice);
    const sapma = Math.abs(secilen - hedef) / hedef;
    if (sapma > 0.12) {
      throw new Error(
        `${urunId}: hedef ${hedef}₺ ama en yakın nokta ${secilen}₺ (%${(sapma * 100).toFixed(0)} sapma). Elle karar verilmeli.`,
      );
    }

    await apple('/subscriptionPrices', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'subscriptionPrices',
          attributes: { startDate: null, preserveCurrentPrice: false },
          relationships: {
            subscription: { data: { id: abonelikId, type: 'subscriptions' } },
            subscriptionPricePoint: {
              data: { id: enYakin.id, type: 'subscriptionPricePoints' },
            },
          },
        },
      }),
    });
    tabanNokta = enYakin;
    console.log(`    fiyat: ${secilen} TRY (hedef ${hedef})`);
  }

  // --- Diğer ülkelerin fiyatı ---
  //
  // Yalnızca Türkiye fiyatlanınca App Store Connect aboneliği incelemeye almıyor ve
  // "You must add a subscription price" diyor — fiyat aslında var, ama Apple ürünün
  // 175 ülkenin HEPSİNDE fiyatlı olmasını istiyor; satışa açık olmasını değil.
  //
  // Kur çevirisini elle yapmıyoruz: Apple'ın `equalizations` ucu taban fiyat
  // noktasının her ülkedeki karşılığını veriyor. "Otomatik hesapla" düğmesinin
  // API karşılığı bu.
  const hepsi = await apple(`/subscriptions/${abonelikId}/prices?limit=200`);
  if (hepsi.data.length >= 175) {
    console.log(`    ${hepsi.data.length} ülke fiyatlı, atlandı`);
  } else {
    if (!tabanNokta) {
      const noktalar = await tumSayfalar(
        `/subscriptions/${abonelikId}/pricePoints?filter[territory]=${ULKE}&limit=200`,
      );
      tabanNokta = noktalar.reduce((a, b) =>
        Math.abs(Number(b.attributes.customerPrice) - hedef) <
        Math.abs(Number(a.attributes.customerPrice) - hedef)
          ? b
          : a,
      );
    }
    const esit = await tumSayfalar(
      `/subscriptionPricePoints/${tabanNokta.id}/equalizations?limit=200`,
    );
    let eklenen = 0;
    for (const nokta of esit) {
      try {
        await apple('/subscriptionPrices', {
          method: 'POST',
          body: JSON.stringify({
            data: {
              type: 'subscriptionPrices',
              attributes: { startDate: null, preserveCurrentPrice: false },
              relationships: {
                subscription: { data: { id: abonelikId, type: 'subscriptions' } },
                subscriptionPricePoint: { data: { id: nokta.id, type: 'subscriptionPricePoints' } },
              },
            },
          }),
        });
        eklenen++;
      } catch {
        // Zaten fiyatlı ülkeler hata döner; betik tekrar çalıştırılabilir olmalı.
      }
    }
    console.log(`    ${eklenen} ülke daha fiyatlandı`);
  }

  // --- İnceleme ekran görüntüsü ---
  //
  // Apple her abonelik için ödeme duvarının görüntüsünü istiyor; olmadan ürün
  // "Missing Metadata" durumunda kalır ve sürümle birlikte incelemeye giremez.
  if (gorselYolu) {
    const varOlan = await apple(`/subscriptions/${abonelikId}/appStoreReviewScreenshot`).catch(
      () => ({ data: null }),
    );
    if (varOlan.data) {
      console.log(`    inceleme görseli mevcut`);
    } else {
      const veri = readFileSync(gorselYolu);
      const dosya = basename(gorselYolu);
      const kayit = await apple('/subscriptionAppStoreReviewScreenshots', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'subscriptionAppStoreReviewScreenshots',
            attributes: { fileSize: veri.length, fileName: dosya },
            relationships: { subscription: { data: { id: abonelikId, type: 'subscriptions' } } },
          },
        }),
      });
      for (const islem of kayit.data.attributes.uploadOperations ?? []) {
        const basliklar = Object.fromEntries(
          (islem.requestHeaders ?? []).map((h) => [h.name, h.value]),
        );
        const parca = veri.subarray(islem.offset, islem.offset + islem.length);
        const y = await fetch(islem.url, { method: islem.method, headers: basliklar, body: parca });
        if (!y.ok) throw new Error(`${dosya} parça yüklenemedi: ${y.status}`);
      }
      await apple(`/subscriptionAppStoreReviewScreenshots/${kayit.data.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            type: 'subscriptionAppStoreReviewScreenshots',
            id: kayit.data.id,
            attributes: {
              uploaded: true,
              sourceFileChecksum: createHash('md5').update(veri).digest('hex'),
            },
          },
        }),
      });
      console.log(`    inceleme görseli yüklendi: ${dosya}`);
    }
  }
}

console.log('\nDoğrulama:');
const son = await apple(`/subscriptionGroups/${grup.kayit.id}/subscriptions?limit=50`);
for (const s of son.data) {
  const f = await apple(
    `/subscriptions/${s.id}/prices?filter[territory]=${ULKE}&limit=5&include=subscriptionPricePoint`,
  );
  const nokta = (f.included ?? []).find((i) => i.type === 'subscriptionPricePoints');
  console.log(
    `  ${s.attributes.productId.padEnd(20)} ${String(s.attributes.subscriptionPeriod).padEnd(10)} ${nokta ? nokta.attributes.customerPrice + ' TRY' : 'fiyat yok'} durum=${s.attributes.state}`,
  );
}
