/**
 * TestFlight iç test grubuna testçi ekler.
 *
 * İki adımlı, ve ikinci adım atlanırsa kimse fark etmez: kişi App Store Connect
 * ekibine davet edilir, daveti kabul eder, **ama gruba eklenmedikçe derlemeyi
 * göremez.** Konsolda "kullanıcı var" görünürken TestFlight'ta uygulama çıkmaz.
 *
 * `betaTesters` ucu rastgele bir e-postayı iç gruba almıyor; 409 STATE_ERROR
 * dönüyor. İç testçi olmak için kişinin ekipte Admin / App Manager / Developer /
 * Marketing rolüyle bulunması şart. Dış grup bunu istemiyor ama karşılığında
 * derlemenin Beta App Review'dan geçmesini istiyor.
 *
 *   node scripts/testflight-testci.mjs davet <eposta> <ad> <soyad>
 *   node scripts/testflight-testci.mjs ekle  <eposta>
 *   node scripts/testflight-testci.mjs durum
 */
import { apple } from './apple-api.mjs';

const APP = '6803979374';
const GRUP = '10deec8d-1cbe-4220-8c06-a092e6323db3'; // "Ic test", iç grup

const [komut, eposta, ad, soyad] = process.argv.slice(2);

const gruptakiler = async () => {
  const y = await apple(
    `/betaGroups/${GRUP}/betaTesters?fields[betaTesters]=email,state&limit=100`,
  );
  return y.data ?? [];
};

async function durum() {
  const testciler = await gruptakiler();
  console.log(`İç test grubu (${testciler.length})`);
  for (const t of testciler) console.log('  ', t.attributes.email, '·', t.attributes.state);

  const ekip = await apple('/users?fields[users]=username,roles&limit=50');
  console.log('Ekip');
  for (const u of ekip.data ?? [])
    console.log('  ', u.attributes.username, '·', (u.attributes.roles ?? []).join(','));

  const davetler = await apple('/userInvitations?limit=50');
  console.log(`Bekleyen davet (${(davetler.data ?? []).length})`);
  for (const d of davetler.data ?? [])
    console.log('  ', d.attributes.email, '·', (d.attributes.roles ?? []).join(','));
}

async function davet() {
  if (!eposta) throw new Error('kullanım: davet <eposta> <ad> <soyad>');

  const ekip = await apple('/users?fields[users]=username&limit=50');
  if (
    (ekip.data ?? []).some((u) => u.attributes.username?.toLowerCase() === eposta.toLowerCase())
  ) {
    console.log('kişi zaten ekipte; sıradaki adım: ekle');
    return;
  }
  const davetler = await apple('/userInvitations?limit=50');
  if (
    (davetler.data ?? []).some((d) => d.attributes.email?.toLowerCase() === eposta.toLowerCase())
  ) {
    console.log('davet zaten bekliyor, yenisi gönderilmedi');
    return;
  }

  /**
   * Rol MARKETING: iç testçi olabilen roller arasındaki en dar olanı.
   * Sertifika ve profil yok (`provisioningAllowed: false`), finansal rapor yok,
   * ve `allAppsVisible: false` ile yalnızca Swiip görünüyor.
   */
  await apple('/userInvitations', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'userInvitations',
        attributes: {
          email: eposta,
          firstName: ad ?? '',
          lastName: soyad ?? '',
          roles: ['MARKETING'],
          allAppsVisible: false,
          provisioningAllowed: false,
        },
        relationships: { visibleApps: { data: [{ type: 'apps', id: APP }] } },
      },
    }),
  });
  console.log(`davet gönderildi: ${eposta}`);
  console.log('kabul edildikten SONRA: node scripts/testflight-testci.mjs ekle ' + eposta);
}

async function ekle() {
  if (!eposta) throw new Error('kullanım: ekle <eposta>');

  const once = await gruptakiler();
  if (once.some((t) => t.attributes.email?.toLowerCase() === eposta.toLowerCase())) {
    console.log('zaten grupta, dokunulmadı');
    return;
  }

  try {
    await apple('/betaTesters', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'betaTesters',
          attributes: { email: eposta, firstName: ad ?? '', lastName: soyad ?? '' },
          relationships: { betaGroups: { data: [{ type: 'betaGroups', id: GRUP }] } },
        },
      }),
    });
  } catch (hata) {
    if (String(hata.message).includes('409')) {
      console.error(
        'Apple 409 döndü: kişi henüz ekip üyesi değil.\n' +
          'İç gruba yalnızca daveti KABUL ETMİŞ ekip üyeleri eklenebilir.\n' +
          'Davet durumunu görmek için: node scripts/testflight-testci.mjs durum',
      );
      process.exit(1);
    }
    throw hata;
  }

  // Geri okuma: POST'un 201 dönmesi kişinin grupta göründüğü anlamına gelmiyor.
  const sonra = await gruptakiler();
  const eklendi = sonra.some((t) => t.attributes.email?.toLowerCase() === eposta.toLowerCase());
  console.log(`grup şimdi ${sonra.length} kişi`);
  if (!eklendi) {
    console.error('DOĞRULAMA BAŞARISIZ: kişi grupta görünmüyor.');
    process.exit(1);
  }
  console.log('doğrulandı: testçi iç test grubunda, derlemeyi görebilir.');
}

const komutlar = { davet, ekle, durum };
const calistir = komutlar[komut ?? 'durum'];
if (!calistir) {
  console.error('komut: davet | ekle | durum');
  process.exit(2);
}
await calistir();
