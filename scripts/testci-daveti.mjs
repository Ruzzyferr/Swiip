/**
 * Kapalı test davetini testçilere gönderir.
 *
 * Neden gerekli: Play'in "12 testçi × 14 gün" şartında sayılan şey **davet değil
 * katılım**. Konsoldaki e-posta listesine eklenmek bir testçiyi saydırmıyor; kişinin
 * opt-in bağlantısını açıp teste katılması gerekiyor.
 *
 * 2026-08-26'da ölçüldü: listede 16 kişi vardı ve konsol "1 tester currently
 * opted-in" diyordu. Yani 14 günlük sayaç hiç çalışmaya başlamamıştı ve bunu hiçbir
 * uyarı söylemiyordu — liste dolu göründüğü için iş bitmiş sanılıyordu.
 *
 * Posta yolu ürünün zaten kullandığı yol (Resend, `bilgi@send.swiip.app`); yeni bir
 * servis eklenmiyor.
 *
 *   POSTA_API_KEY=... node scripts/testci-daveti.mjs --dene    # kime gideceğini yazar, göndermez
 *   POSTA_API_KEY=... node scripts/testci-daveti.mjs           # gönderir
 *
 * Alıcı listesi `magaza/play/testciler.txt` dosyasından okunuyor: konsoldaki listeyle
 * aynı olmalı. Kimin katıldığını Play Console söylüyor, bu betik değil — gönderdikten
 * sonra sayaç dashboard'dan takip edilir.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const LISTE = join(KOK, 'magaza', 'play', 'testciler.txt');

const DENE = process.argv.includes('--dene');
const {
  POSTA_API_KEY,
  POSTA_API_URL = 'https://api.resend.com/emails',
  POSTA_GONDEREN = 'Swiip <bilgi@send.swiip.app>',
} = process.env;

/** Web bağlantısı Android'de de çalışıyor; tek bağlantı vermek yönergeyi kısaltıyor. */
const KATIL_WEB = 'https://play.google.com/apps/testing/app.swiip';
const MAGAZA = 'https://play.google.com/store/apps/details?id=app.swiip';

const KONU = 'Swiip kapalı testi — katılman için tek bir adım kaldı';

const GOVDE = `Merhaba,

Swiip'in Android kapalı testine seni ekledim. Ama Google'ın saydığı şey davet değil
katılım: aşağıdaki bağlantıyı açıp "Testçi ol" demeden hesabın teste dahil olmuyor
ve uygulamayı Play'den kuramıyorsun.

1) Bu bağlantıyı aç ve "Testçi ol" / "Become a tester" düğmesine bas:
   ${KATIL_WEB}

2) Aynı sayfadaki Play bağlantısından uygulamayı kur:
   ${MAGAZA}

Önemli: 1. adımdaki Google hesabının, telefonundaki Play Store hesabıyla AYNI olması
gerekiyor. Farklıysa uygulama "bulunamadı" der.

Kurduktan sonra uygulamayı bir kez açman yeterli. Bir sorun görürsen ya da bir yer
kafanı karıştırırsa bu adrese yazabilirsin: info@swiip.app

Teşekkürler,
Rüzgar
`;

function aliciları() {
  const ham = readFileSync(LISTE, 'utf8');
  return ham
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#'))
    .filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
}

const alicilar = aliciları();

if (alicilar.length === 0) {
  console.error(`${LISTE} içinde geçerli e-posta yok.`);
  process.exit(2);
}

console.log(`${alicilar.length} testçi:`);
for (const a of alicilar) console.log('  ', a);

if (DENE) {
  console.log('\n--- KONU ---');
  console.log(KONU);
  console.log('--- GÖVDE ---');
  console.log(GOVDE);
  console.log('(deneme modu — hiçbir posta gönderilmedi)');
  process.exit(0);
}

if (!POSTA_API_KEY) {
  console.error('POSTA_API_KEY tanımlı olmalı.');
  process.exit(2);
}

/**
 * Her alıcıya AYRI posta gidiyor, toplu `to` alanına değil.
 *
 * Toplu gönderim herkesin adresini birbirine gösterir; testçiler birbirini tanımak
 * zorunda değil ve adresleri bizim paylaşacağımız bir veri değil.
 */
let basarili = 0;
const basarisiz = [];

for (const alici of alicilar) {
  const yanit = await fetch(POSTA_API_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${POSTA_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: POSTA_GONDEREN, to: alici, subject: KONU, text: GOVDE }),
  });

  if (yanit.ok) {
    basarili += 1;
    console.log('gönderildi:', alici);
  } else {
    const govde = await yanit.text();
    basarisiz.push({ alici, kod: yanit.status, govde: govde.slice(0, 200) });
    console.error('BAŞARISIZ:', alici, yanit.status, govde.slice(0, 200));
  }
}

console.log(`\n${basarili}/${alicilar.length} gönderildi.`);

if (basarisiz.length > 0) {
  console.error(`${basarisiz.length} adrese ulaşılamadı; yukarıdaki hatalara bak.`);
  process.exit(1);
}

console.log(
  '\nSayaç KATILIMLA başlıyor, gönderimle değil. Kaç kişinin opt-in yaptığını\n' +
    'Play Console → Dashboard satırından say: "N testers currently opted-in".',
);
