/**
 * App Store adı, alt başlık ve anahtar kelimeleri `magaza/appstore/aso.json`'dan yazar.
 *
 * Ad ve alt başlık "App Information" düzeyinde, anahtar kelimeler sürüm düzeyinde; ikisi de
 * yalnızca DÜZENLENEBİLİR bir sürüm varken değişiyor (yeni sürüm açılmış olmalı:
 * `apple-surum-ac.mjs`). Kaynakta olup sürümde olmayan bir yerel (en-GB, es-MX) için
 * yerelleştirme `kaynak` yerelden kopyalanarak OLUŞTURULUYOR: açıklama, sürüm notu,
 * destek ve gizlilik adresi aynı, değişen yalnız aranma alanları.
 *
 * Sınırlar yazmadan ÖNCE kontrol ediliyor; yazdıktan sonra her alan geri okunuyor
 * (bu uçlarda yazma asenkron uygulanabiliyor, bkz. CLAUDE.md).
 *
 *     node scripts/apple-aso.mjs          # ne değişeceğini gösterir
 *     node scripts/apple-aso.mjs --yaz
 */
import { readFileSync } from 'node:fs';
import { apple } from './apple-api.mjs';

const UYG = '6803979374';
const YAZ = process.argv.includes('--yaz');
const { yereller } = JSON.parse(readFileSync('magaza/appstore/aso.json', 'utf8'));
const SINIR = { name: 30, subtitle: 30, keywords: 100 };

for (const [yerel, alanlar] of Object.entries(yereller)) {
  for (const [alan, sinir] of Object.entries(SINIR)) {
    const deger = alanlar[alan];
    if (!deger || [...deger].length > sinir) {
      throw new Error(
        `${yerel}.${alan}: ${deger ? [...deger].length : 0} karakter (sınır ${sinir})`,
      );
    }
  }
  if (/,\s/.test(alanlar.keywords)) throw new Error(`${yerel}: virgülden sonra boşluk yer yer`);
  const kelimeler = alanlar.keywords.split(',');
  const adda = `${alanlar.name} ${alanlar.subtitle}`.toLocaleLowerCase(yerel);
  const tekrar = kelimeler.filter((k) =>
    adda.split(/[\s:,&]+/).includes(k.toLocaleLowerCase(yerel)),
  );
  if (tekrar.length) throw new Error(`${yerel}: ad/alt başlıkta zaten var: ${tekrar.join(', ')}`);
}

const surumler = await apple(
  `/apps/${UYG}/appStoreVersions?filter[platform]=IOS&limit=10&fields[appStoreVersions]=versionString,appStoreState`,
);
const surum = surumler.data.find((v) =>
  ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'].includes(
    v.attributes.appStoreState,
  ),
);
if (!surum) throw new Error('Düzenlenebilir sürüm yok. Önce apple-surum-ac.mjs ile yeni sürüm aç.');
const bilgiler = await apple(`/apps/${UYG}/appInfos`);
const bilgi = bilgiler.data.find((b) => b.attributes.appStoreState !== 'READY_FOR_SALE');
if (!bilgi) throw new Error('Düzenlenebilir App Information yok.');
console.log(`Sürüm ${surum.attributes.versionString} · appInfo ${bilgi.attributes.appStoreState}`);

const bilgiYerelleri = async () =>
  new Map(
    (await apple(`/appInfos/${bilgi.id}/appInfoLocalizations?limit=50`)).data.map((y) => [
      y.attributes.locale,
      y,
    ]),
  );
const surumYerelleri = async () =>
  new Map(
    (await apple(`/appStoreVersions/${surum.id}/appStoreVersionLocalizations?limit=50`)).data.map(
      (y) => [y.attributes.locale, y],
    ),
  );

const bY = await bilgiYerelleri();
const sY = await surumYerelleri();

for (const [yerel, a] of Object.entries(yereller)) {
  const kaynak = a.kaynak ?? yerel;
  const bMevcut = bY.get(yerel);
  const sMevcut = sY.get(yerel);
  const bKaynak = bY.get(kaynak);
  const sKaynak = sY.get(kaynak);
  if (!bKaynak || !sKaynak) throw new Error(`${yerel}: kaynak yerel ${kaynak} sürümde yok`);

  const ozet = `${yerel}: "${a.name}" | "${a.subtitle}" | ${a.keywords.length} kr`;
  if (!YAZ) {
    console.log(`  ${bMevcut ? 'güncellenecek' : 'OLUŞTURULACAK'}  ${ozet}`);
    continue;
  }

  if (bMevcut) {
    await apple(`/appInfoLocalizations/${bMevcut.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        data: {
          type: 'appInfoLocalizations',
          id: bMevcut.id,
          attributes: { name: a.name, subtitle: a.subtitle },
        },
      }),
    });
  } else {
    await apple('/appInfoLocalizations', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'appInfoLocalizations',
          attributes: {
            locale: yerel,
            name: a.name,
            subtitle: a.subtitle,
            privacyPolicyUrl: bKaynak.attributes.privacyPolicyUrl,
          },
          relationships: { appInfo: { data: { type: 'appInfos', id: bilgi.id } } },
        },
      }),
    });
  }

  // Yeni bir App Information yereli, aynı dilin sürüm yerelini Apple'da KENDİLİĞİNDEN
  // açıyor (boş): oluşturmadan önce yeniden okunmalı, yoksa 409 DUPLICATE.
  const sGuncel = sMevcut ?? (await surumYerelleri()).get(yerel);
  if (sGuncel) {
    await apple(`/appStoreVersionLocalizations/${sGuncel.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        data: {
          type: 'appStoreVersionLocalizations',
          id: sGuncel.id,
          // Boş yerel (Apple'ın kendiliğinden açtığı ya da yarım kalan) kaynaktan doluyor.
          attributes: sGuncel.attributes.description
            ? { keywords: a.keywords }
            : {
                keywords: a.keywords,
                description: sKaynak.attributes.description,
                whatsNew: sKaynak.attributes.whatsNew,
                promotionalText: sKaynak.attributes.promotionalText,
                supportUrl: sKaynak.attributes.supportUrl,
                marketingUrl: sKaynak.attributes.marketingUrl,
              },
        },
      }),
    });
  } else {
    const k = sKaynak.attributes;
    await apple('/appStoreVersionLocalizations', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'appStoreVersionLocalizations',
          attributes: {
            locale: yerel,
            keywords: a.keywords,
            description: k.description,
            whatsNew: k.whatsNew,
            promotionalText: k.promotionalText,
            supportUrl: k.supportUrl,
            marketingUrl: k.marketingUrl,
          },
          relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: surum.id } } },
        },
      }),
    });
  }
  console.log(`  yazıldı  ${ozet}`);
}

if (!YAZ) process.exit(0);

// Geri okuma: yazma asenkron uygulanabiliyor.
for (let deneme = 1; deneme <= 6; deneme++) {
  const b = await bilgiYerelleri();
  const s = await surumYerelleri();
  const tutmayan = Object.entries(yereller)
    .filter(
      ([yerel, a]) =>
        b.get(yerel)?.attributes.name !== a.name ||
        b.get(yerel)?.attributes.subtitle !== a.subtitle ||
        s.get(yerel)?.attributes.keywords !== a.keywords,
    )
    .map(([y]) => y);
  if (tutmayan.length === 0) {
    console.log(`Doğrulandı: ${Object.keys(yereller).length} yerel geri okundu.`);
    process.exit(0);
  }
  console.log(`Okuma ${deneme}: tutmayan ${tutmayan.join(', ')}`);
  await new Promise((c) => setTimeout(c, 10_000));
}
console.error('YAZILAMADI');
process.exit(1);
