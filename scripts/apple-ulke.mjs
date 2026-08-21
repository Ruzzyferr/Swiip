/**
 * App Store'da uygulamanın satılacağı ülkeleri ayarlar.
 *
 * Neden gerekli: kullanılabilirlik hiç ayarlanmazsa uygulama 175 ülkeye açık sayılıyor,
 * abonelikler ise yalnızca Türkiye'de fiyatlı. Bu uyuşmazlıkta App Store Connect
 * aboneliği incelemeye almıyor ve sebep olarak yanıltıcı biçimde
 * "You must add a subscription price" diyor — fiyat aslında var, kapsam tutmuyor.
 *
 * Karar CLAUDE.md'de kilitli: **Türkiye önce.** Mağaza metni yalnızca Türkçe, fiyatlar
 * yalnızca TRY. Başka ülkelere açmak, satın alması çalışmayan bir vitrin demek.
 *
 * Apple'ın v2 ucu kısmi liste kabul etmiyor: 175 ülkenin HEPSİ tek tek, açık/kapalı
 * olarak gönderilmeli. Eksik bırakılan her ülke için ayrı hata dönüyor.
 *
 *   node scripts/apple-ulke.mjs [ULKE ...]     varsayılan: TUR
 */
import { apple } from './apple-api.mjs';

const UYGULAMA = '6803979374';
const ACIK = new Set(process.argv.slice(2).length ? process.argv.slice(2) : ['TUR']);

const ulkeler = await apple('/territories?limit=200');
console.log(`  ${ulkeler.data.length} ülke, açık olacak: ${[...ACIK].join(', ')}`);

const yerel = (kod) => `\${u-${kod}}`;

const govde = {
  data: {
    type: 'appAvailabilities',
    // Yeni ülke eklendiğinde kendiliğinden açılmasın: fiyatı olmayan ülkeye
    // açılmak tam da kaçındığımız uyuşmazlığı geri getirir.
    attributes: { availableInNewTerritories: false },
    relationships: {
      app: { data: { id: UYGULAMA, type: 'apps' } },
      territoryAvailabilities: {
        data: ulkeler.data.map((u) => ({ id: yerel(u.id), type: 'territoryAvailabilities' })),
      },
    },
  },
  included: ulkeler.data.map((u) => ({
    type: 'territoryAvailabilities',
    id: yerel(u.id),
    attributes: { available: ACIK.has(u.id) },
    relationships: { territory: { data: { id: u.id, type: 'territories' } } },
  })),
};

const sonuc = await apple('/v2/appAvailabilities', {
  method: 'POST',
  body: JSON.stringify(govde),
});
console.log(`  kullanılabilirlik yazıldı: ${sonuc.data.id}`);

const dogrula = await apple(
  `/appAvailabilities/${UYGULAMA}/territoryAvailabilities?limit=200`,
).catch(() => null);
if (dogrula) {
  const acik = dogrula.data.filter((t) => t.attributes.available);
  console.log(`  doğrulama: ${acik.length} ülkede satışta`);
}
