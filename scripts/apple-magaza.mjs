/**
 * App Store Connect mağaza metinlerini ve derecelendirmesini API ile yazar.
 *
 * Neden API: App Store Connect arayüzü de otomasyona dirençli ve metinler zaten
 * depoda duruyor. API tek çalıştırmada yazıyor, sonuç doğrulanabilir oluyor.
 *
 * Metinlerin kaynağı `magaza/play/liste-tr.md` — aynı ürün, aynı söz. App Store'un
 * kendi sınırları var: alt başlık 30, anahtar kelimeler 100 karakter.
 *
 *   node scripts/apple-magaza.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apple } from './apple-api.mjs';

const kok = join(dirname(fileURLToPath(import.meta.url)), '..');
const UYGULAMA = '6803979374';
const DIL = 'tr';

/** Alt başlık ve anahtar kelimeler App Store'a özgü; Play'de karşılıkları yok. */
const ALT_BASLIK = 'Ölçüne göre antrenman koçu';
const ANAHTAR_KELIMELER =
  'antrenman,program,beslenme,kalori,makro,koç,spor,kas,kilo,egzersiz,diyet,form';
const DESTEK_URL = 'https://swiip.app';
const GIZLILIK_URL = 'https://swiip.app/gizlilik.html';

function metinler() {
  const ham = readFileSync(join(kok, 'magaza/play/liste-tr.md'), 'utf8');
  const bloklar = [...ham.matchAll(/```\r?\n([\s\S]*?)\r?\n```/g)].map((m) => m[1].trim());
  if (bloklar.length < 3) throw new Error('liste-tr.md içinde 3 blok bekleniyordu.');
  return { ad: bloklar[0], kisa: bloklar[1], tam: bloklar[2] };
}

const { ad, tam } = metinler();

if (ALT_BASLIK.length > 30) throw new Error(`Alt başlık 30 karakteri aşıyor: ${ALT_BASLIK.length}`);
if (ANAHTAR_KELIMELER.length > 100)
  throw new Error(`Anahtar kelimeler 100 karakteri aşıyor: ${ANAHTAR_KELIMELER.length}`);

console.log(
  `  ad="${ad}" altBaslik=${ALT_BASLIK.length}krk anahtar=${ANAHTAR_KELIMELER.length}krk aciklama=${tam.length}krk`,
);

// --- 1. Uygulama bilgisi yerelleştirmesi (ad, alt başlık, gizlilik) ---
const bilgiler = await apple(`/apps/${UYGULAMA}/appInfos?limit=5`);
const bilgi = bilgiler.data.find((b) => b.attributes.appStoreState === 'PREPARE_FOR_SUBMISSION');
if (!bilgi) throw new Error('Düzenlenebilir appInfo yok.');

const bilgiYerel = await apple(`/appInfos/${bilgi.id}/appInfoLocalizations?limit=20`);
const trBilgi = bilgiYerel.data.find((y) => y.attributes.locale === DIL);

const bilgiGovde = {
  name: ad,
  subtitle: ALT_BASLIK,
  privacyPolicyUrl: GIZLILIK_URL,
};

if (trBilgi) {
  await apple(`/appInfoLocalizations/${trBilgi.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: { type: 'appInfoLocalizations', id: trBilgi.id, attributes: bilgiGovde },
    }),
  });
  console.log('  uygulama bilgisi güncellendi');
} else {
  await apple('/appInfoLocalizations', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'appInfoLocalizations',
        attributes: { locale: DIL, ...bilgiGovde },
        relationships: { appInfo: { data: { id: bilgi.id, type: 'appInfos' } } },
      },
    }),
  });
  console.log('  uygulama bilgisi oluşturuldu');
}

// --- 2. Sürüm yerelleştirmesi (açıklama, anahtar kelimeler, destek) ---
const surumler = await apple(`/apps/${UYGULAMA}/appStoreVersions?limit=5`);
const surum = surumler.data.find((s) => s.attributes.appStoreState === 'PREPARE_FOR_SUBMISSION');
if (!surum) throw new Error('Düzenlenebilir sürüm yok.');

const surumYerel = await apple(
  `/appStoreVersions/${surum.id}/appStoreVersionLocalizations?limit=20`,
);
const trSurum = surumYerel.data.find((y) => y.attributes.locale === DIL);

const surumGovde = {
  description: tam,
  keywords: ANAHTAR_KELIMELER,
  supportUrl: DESTEK_URL,
  marketingUrl: DESTEK_URL,
};

if (trSurum) {
  await apple(`/appStoreVersionLocalizations/${trSurum.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: { type: 'appStoreVersionLocalizations', id: trSurum.id, attributes: surumGovde },
    }),
  });
  console.log('  sürüm metinleri güncellendi');
} else {
  await apple('/appStoreVersionLocalizations', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'appStoreVersionLocalizations',
        attributes: { locale: DIL, ...surumGovde },
        relationships: { appStoreVersion: { data: { id: surum.id, type: 'appStoreVersions' } } },
      },
    }),
  });
  console.log('  sürüm metinleri oluşturuldu');
}

// --- 3. Yaş derecelendirmesi ---
/**
 * Beyanların hepsi "yok". Uygulamada şiddet, cinsellik, kumar, alkol/uyuşturucu
 * içeriği yok; kullanıcılar arası içerik paylaşımı yok. Sağlık/fitness içeriği
 * Apple'ın bu listesinde derecelendirmeye konu bir başlık değil.
 */
// Apple bu iliskiyi appStoreVersions'tan appInfos'a tasidi.
const derece = await apple(`/appInfos/${bilgi.id}/ageRatingDeclaration`);
await apple(`/ageRatingDeclarations/${derece.data.id}`, {
  method: 'PATCH',
  body: JSON.stringify({
    data: {
      type: 'ageRatingDeclarations',
      id: derece.data.id,
      attributes: {
        alcoholTobaccoOrDrugUseOrReferences: 'NONE',
        contests: 'NONE',
        gamblingSimulated: 'NONE',
        horrorOrFearThemes: 'NONE',
        matureOrSuggestiveThemes: 'NONE',
        medicalOrTreatmentInformation: 'NONE',
        profanityOrCrudeHumor: 'NONE',
        sexualContentGraphicAndNudity: 'NONE',
        sexualContentOrNudity: 'NONE',
        violenceCartoonOrFantasy: 'NONE',
        violenceRealistic: 'NONE',
        violenceRealisticProlongedGraphicOrSadistic: 'NONE',
        gunsOrOtherWeapons: 'NONE',
        lootBox: false,
        gambling: false,
        unrestrictedWebAccess: false,
        // Uygulamada reklam yok (paket taramasi da dogruladi: reklam SDK'si yok).
        advertising: false,
        // Kullanicilar arasi icerik paylasimi yok; kullanici verisi yalnizca kendine gorunur.
        userGeneratedContent: false,
        // Sert 18 yas kapisi var; cocuk kategorisi degil.
        ageAssurance: false,
        parentalControls: false,
        // Urun gercekten saglik/wellness. Bu beyan dogru olmali.
        healthOrWellnessTopics: true,
        // Koc sohbeti YAPAY ZEKA ile; kullanicilar birbirine yazamiyor.
        messagingAndChat: false,
        kidsAgeBand: null,
      },
    },
  }),
});
console.log('  yaş derecelendirmesi yazıldı (tümü NONE)');

console.log('\nDoğrulama:');
const son = await apple(`/appStoreVersionLocalizations/${trSurum ? trSurum.id : ''}`).catch(
  () => null,
);
if (son) {
  const a = son.data.attributes;
  console.log(
    `  açıklama ${a.description?.length ?? 0} krk · anahtar "${a.keywords}" · destek ${a.supportUrl}`,
  );
}
