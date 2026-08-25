/**
 * Play izindeki `draft` sürümü yayına alır.
 *
 * Neden ayrı bir betik: `eas submit` paketi yüklüyor ama sürümü **taslak** bırakıyor.
 * Taslak sürüm test cihazlarına inmiyor — konsolda "yüklendi" görünürken kimse
 * uygulamayı kuramıyor. Aradaki farkı yalnızca izin kendisini okumak gösteriyor,
 * o yüzden bu betik hem yayına alıyor hem de sonucu geri okuyup doğruluyor.
 *
 *   PLAY_SERVIS_HESABI=<json yolu> node scripts/play-yayinla.mjs <iz> <versionCode|en-yeni> [notlar]
 *
 * `notlar` verilmezse sürüm notu YAZILMIYOR. Uydurma bir cümle koymaktansa boş
 * bırakmak doğru; notu `scripts/surum-notlari.mjs` üretiyor.
 */
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const PAKET = process.env.PLAY_PAKET_ADI ?? 'app.swiip';
const [IZ, SURUM_KODU, NOTLAR] = process.argv.slice(2);
if (!IZ || !SURUM_KODU) {
  console.error('kullanım: play-yayinla.mjs <iz> <versionCode|en-yeni> [notlar]');
  process.exit(2);
}
if (!process.env.PLAY_SERVIS_HESABI) {
  console.error('PLAY_SERVIS_HESABI tanımlı olmalı.');
  process.exit(2);
}
const hesap = JSON.parse(readFileSync(process.env.PLAY_SERVIS_HESABI, 'utf8'));

const b64url = (g) =>
  Buffer.from(g).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function jetonAl() {
  const simdi = Math.floor(Date.now() / 1000);
  const veri = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(
    JSON.stringify({
      iss: hesap.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: simdi,
      exp: simdi + 3600,
    }),
  )}`;
  const imza = createSign('RSA-SHA256').update(veri).sign(hesap.private_key);
  const yanit = await (
    await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${veri}.${b64url(imza)}`,
      }),
    })
  ).json();
  if (!yanit.access_token) throw new Error(`jeton alınamadı: ${JSON.stringify(yanit)}`);
  return yanit.access_token;
}

const jeton = await jetonAl();
const cagir = async (yol, secenek = {}) => {
  const yanit = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PAKET}${yol}`,
    {
      ...secenek,
      headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' },
    },
  );
  const govde = await yanit.text();
  if (!yanit.ok) throw new Error(`${yanit.status} ${yol}\n${govde}`);
  return govde ? JSON.parse(govde) : {};
};

/** `en-yeni` cozuldukten sonraki gercek numara; dogrulama da bunu okuyor. */
let surumKodu = SURUM_KODU;

const { id } = await cagir('/edits', { method: 'POST' });
try {
  const once = await cagir(`/edits/${id}/tracks/${IZ}`);

  /**
   * `en-yeni`: izdeki en büyük versionCode'u seç.
   *
   * CI koşucuda derliyor (`eas build --local`), o yüzden `eas build:list` bu paketi
   * hiç görmüyor ve numarayı oradan okumak boş dönüyordu. İzin kendisi zaten tek
   * doğru kaynak: yükleme başarılıysa numara oradadır, değilse zaten durmalıyız.
   */
  if (SURUM_KODU === 'en-yeni') {
    const hepsi = (once.releases ?? []).flatMap((s) => (s.versionCodes ?? []).map(Number));
    if (!hepsi.length) throw new Error(`${IZ} izinde hiç sürüm yok; yükleme başarısız mı?`);
    surumKodu = String(Math.max(...hepsi));
    console.log(`en yeni versionCode: ${surumKodu}`);
  }

  const hedef = (once.releases ?? []).find((s) =>
    (s.versionCodes ?? []).map(String).includes(surumKodu),
  );
  if (!hedef) {
    throw new Error(
      `${IZ} izinde versionCode ${surumKodu} yok. Olanlar: ` +
        JSON.stringify((once.releases ?? []).map((s) => [s.versionCodes, s.status])),
    );
  }
  console.log(`önceki durum: ${hedef.status}`);
  if (hedef.status === 'completed') {
    console.log('zaten yayında, değişiklik yok.');
  } else {
    await cagir(`/edits/${id}/tracks/${IZ}`, {
      method: 'PUT',
      body: JSON.stringify({
        track: IZ,
        releases: [
          {
            name: hedef.name ?? surumKodu,
            versionCodes: [surumKodu],
            status: 'completed',
            ...(NOTLAR ? { releaseNotes: [{ language: 'tr-TR', text: NOTLAR }] } : {}),
          },
        ],
      }),
    });
    await cagir(`/edits/${id}:commit`, { method: 'POST' });
  }
} catch (hata) {
  await cagir(`/edits/${id}`, { method: 'DELETE' }).catch(() => {});

  /**
   * "Only releases with status draft may be created on draft app."
   *
   * Play uygulamayı hâlâ **taslak uygulama** sayıyor: hiç yayımlanmamış. Bu durumda
   * iç test izi `completed` sürümü kabul ediyor ama kapalı test (alpha) etmiyor.
   * Paket yüklenmiş olur, taslak olarak durur ve testçiye İNMEZ.
   *
   * Ham yığın izi bunu anlatmıyor; hata mesajı ne yapılacağını söylemeli, yoksa
   * bir sonraki kişi paketin neden görünmediğini saatlerce arar.
   */
  if (String(hata.message).includes('draft app')) {
    console.error(
      [
        '',
        `Play, "${IZ}" izinde yayına almayı reddetti: uygulama hâlâ TASLAK durumda.`,
        '',
        `Paket yüklendi ve ${IZ} izinde taslak olarak duruyor — ama testçilere inmiyor.`,
        '',
        'Uygulamanın taslaktan çıkması için Play Console tarafında kalan maddeler',
        'bitirilmeli (App content beyanları, veri güvenliği formunun incelemeye',
        'gönderilmesi, mağaza listesi). Bunlar API ile yapılamıyor.',
        '',
        'O bitene kadar iç test izi çalışıyor:',
        '  gh workflow run yayin.yml -f platform=android -f iz=internal',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }
  throw hata;
}

// Taahhütten SONRA yeni bir düzenlemeyle geri oku: kaydedildiğine dair tek kanıt bu.
const { id: kontrol } = await cagir('/edits', { method: 'POST' });
const sonra = await cagir(`/edits/${kontrol}/tracks/${IZ}`);
await cagir(`/edits/${kontrol}`, { method: 'DELETE' }).catch(() => {});
for (const s of sonra.releases ?? []) {
  console.log(`${IZ}: versionCode ${s.versionCodes} → ${s.status}`);
}
const yayinda = (sonra.releases ?? []).some(
  (s) => s.status === 'completed' && (s.versionCodes ?? []).map(String).includes(surumKodu),
);
if (!yayinda) {
  console.error(`DOĞRULAMA BAŞARISIZ: ${surumKodu} hâlâ yayında değil.`);
  process.exit(1);
}
console.log('doğrulandı: yayında.');
