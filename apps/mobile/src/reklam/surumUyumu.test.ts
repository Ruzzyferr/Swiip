import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Reklam SDK'sı React Native sürümümüzle uyumlu kalmalı.
 *
 * 2026-08-31'de `npx expo install react-native-google-mobile-ads` **16.5.0** kurdu ve
 * Android derlemesi şu hatayla düştü:
 *
 *   UnsupportedGenericParserError: Module NativeAppModule:
 *     Unrecognized generic type 'undefined' in NativeModule spec.
 *   > Task :react-native-google-mobile-ads:generateCodegenSchemaFromJavaScript FAILED
 *
 * Sebep: v16 daha yeni bir React Native'in codegen'ini varsayıyor; biz RN 0.76.5
 * (Expo SDK 52) üzerindeyiz. `expo install` bu paket için uyumluluk kaydı
 * TUTMADIĞINDAN en sonuncuyu aldı — "expo install kullandım, o hâlde uyumludur"
 * varsayımı bu pakette geçerli değil.
 *
 * **Neden test:** kusur ne `tsc` ile ne `eslint` ile görünüyor. Tip denetimi geçiyor,
 * testler geçiyor, yalnızca NATIVE DERLEME patlıyor — yani ancak CI'da, üç dakikalık
 * bir Gradle turundan sonra. Bu depoda yayın hattı iki mağazaya birden derleme
 * gönderiyor; oradan dönmek pahalı.
 *
 * Sürüm hattı yükseltilecekse önce Expo SDK yükseltilmeli ve `assembleDebug` yerelde
 * çalıştırılmalı. Bu satırı gözü kapalı büyütmek, kusuru geri getirir.
 */

const KOK = join(import.meta.dirname, '..', '..');

function paket(yol: string): Record<string, unknown> {
  return JSON.parse(readFileSync(yol, 'utf8')) as Record<string, unknown>;
}

const MOBIL = paket(join(KOK, 'package.json'));
const BAGIMLILIKLAR = MOBIL.dependencies as Record<string, string>;

/** RN 0.76 / Expo SDK 52 ile çalışan son ana sürüm. */
const UYUMLU_ANA_SURUM = 14;

describe('reklam SDK sürümü', () => {
  it('paket kurulu', () => {
    expect(BAGIMLILIKLAR['react-native-google-mobile-ads']).toBeDefined();
  });

  it(`ana sürüm ${UYUMLU_ANA_SURUM} — codegen RN 0.76 ile uyumlu`, () => {
    const surum = BAGIMLILIKLAR['react-native-google-mobile-ads']!;
    const ana = Number(surum.replace(/^[^\d]*/, '').split('.')[0]);

    expect(
      ana,
      `react-native-google-mobile-ads@${surum} kurulu. v15+ daha yeni bir React ` +
        'Native codegen’i varsayıyor ve `generateCodegenSchemaFromJavaScript` ' +
        'görevinde derleme patlıyor. Yükseltmeden önce Expo SDK yükseltilmeli ve ' +
        '`cd apps/mobile/android && ./gradlew assembleDebug` yerelde koşturulmalı.',
    ).toBe(UYUMLU_ANA_SURUM);
  });

  /**
   * Sabit sürüm, aralık değil.
   *
   * `^14.11.0` yazılsaydı `npm install` bir gün 15'e atlamazdı ama 14.x içindeki bir
   * yayın da sessizce gelirdi. Native derlemeye giren bir paketin sürümü, derlemeyi
   * yapan makineye göre değişmemeli.
   */
  it('sürüm sabitlenmiş — aralık değil', () => {
    const surum = BAGIMLILIKLAR['react-native-google-mobile-ads']!;
    expect(
      /^\d+\.\d+\.\d+$/.test(surum),
      `"${surum}" bir aralık. Native derlemeye giren paket sabit sürümle kurulmalı.`,
    ).toBe(true);
  });
});

/**
 * Uygulama kimlikleri `app.json`'daki eklenti yapılandırmasıyla aynı olmalı.
 *
 * İkisi ayrı yerde yazılıyor: `kimlikler.ts` istemcinin reklam isteğinde kullandığı
 * birim kimliklerini, `app.json` ise native manifeste yazılan UYGULAMA kimliğini
 * taşıyor. Ayrışırlarsa SDK bir uygulamayla başlatılıp başka bir uygulamanın
 * birimlerinden reklam ister; AdMob bunu geçersiz trafik sayar.
 */
describe('uygulama kimlikleri tek yerde tutuluyor', () => {
  const APP_JSON = paket(join(KOK, 'app.json')) as {
    expo: { plugins: Array<string | [string, Record<string, string>]> };
  };
  const KIMLIKLER = readFileSync(join(KOK, 'src', 'reklam', 'kimlikler.ts'), 'utf8');

  const eklenti = APP_JSON.expo.plugins.find(
    (p): p is [string, Record<string, string>] =>
      Array.isArray(p) && p[0] === 'react-native-google-mobile-ads',
  );

  it('eklenti iki platformun da uygulama kimliğini taşıyor', () => {
    expect(eklenti, 'app.json içinde AdMob eklenti yapılandırması yok').toBeDefined();
    expect(eklenti![1].androidAppId).toMatch(/^ca-app-pub-\d+~\d+$/);
    expect(eklenti![1].iosAppId, 'iOS uygulama kimliği eksik').toMatch(/^ca-app-pub-\d+~\d+$/);
  });

  it.each(['androidAppId', 'iosAppId'])('%s `kimlikler.ts` ile aynı', (alan) => {
    const kimlik = eklenti![1][alan]!;
    expect(
      KIMLIKLER.includes(kimlik),
      `${alan} (${kimlik}) app.json'da var ama kimlikler.ts'te yok: SDK bir ` +
        'uygulamayla başlatılıp başka bir uygulamanın birimlerinden reklam ister.',
    ).toBe(true);
  });
});

/**
 * İkili ile App Privacy beyanı ÇELİŞMEZ.
 *
 * `expo-tracking-transparency` bir süre "ileride lazım olur" diye kuruluydu. Hiçbir
 * dosyadan çağrılmıyordu ama eklenti yapılandırması Info.plist'e
 * `NSUserTrackingUsageDescription` yazıyordu. App Store gönderimi tam bu yüzden
 * engellendi:
 *
 *   "Your app contains NSUserTrackingUsageDescription, indicating that it may request
 *    permission to track users. To submit for review, update your App Privacy response
 *    to indicate that data collected from this app will be used for tracking purposes,
 *    or update your app binary and upload a new build."
 *
 * İki yol vardı ve biri yalan olurdu: beyanı "izliyoruz" yapmak. İzlemiyoruz —
 * reklamlar kişiselleştirilmemiş (`requestNonPersonalizedAdsOnly`), IDFA hiç
 * istenmiyor. Doğrusu kullanılmayan anahtarı ikiliden çıkarmaktı.
 *
 * **Kusur SESSİZDİ ve pahalıydı:** API yalnızca "not in valid state" diyor, sebebi
 * söylemiyor; sebebi yalnızca konsol gösteriyor. Bir derleme turu buna gitti.
 *
 * Kural: ATT paketi ancak kod GERÇEKTEN izin isterse kurulur, ve o gün önce App
 * Privacy'de izleme beyan edilir.
 */
describe('izleme izni ile beyan çelişmiyor', () => {
  const KAYNAKLAR = [
    join(KOK, 'src', 'reklam', 'baslat.ts'),
    join(KOK, 'src', 'reklam', 'ReklamBanner.tsx'),
    join(KOK, 'src', 'reklam', 'gecisReklami.ts'),
  ]
    .map((y) => readFileSync(y, 'utf8'))
    .join(String.fromCharCode(10));

  it('ATT paketi bağımlılıklarda yok', () => {
    expect(
      BAGIMLILIKLAR['expo-tracking-transparency'],
      'Paket kurulu olduğunda eklentisi Info.plist’e NSUserTrackingUsageDescription ' +
        'yazıyor ve App Store gönderimi "izleme beyan et ya da ikiliyi değiştir" ' +
        'diyerek engelliyor.',
    ).toBeUndefined();
  });

  it('app.json izleme izni metni taşımıyor', () => {
    const ham = readFileSync(join(KOK, 'app.json'), 'utf8');
    expect(ham.includes('NSUserTrackingUsageDescription')).toBe(false);
    expect(ham.includes('userTrackingPermission')).toBe(false);
    expect(
      ham.includes('userTrackingUsageDescription'),
      'AdMob eklentisi de bu alanı kabul ediyor ve aynı anahtarı yazar.',
    ).toBe(false);
  });

  it('kod izin istemiyor — kişiselleştirme kapalı', () => {
    expect(KAYNAKLAR.includes('requestTrackingPermissionsAsync')).toBe(false);
    expect(
      KAYNAKLAR.includes('requestNonPersonalizedAdsOnly: true'),
      'İzin istenmiyorsa reklam da kişiselleştirilmemiş olmalı; aksi hâlde beyan ' +
        'ile davranış ayrışır.',
    ).toBe(true);
  });
});
