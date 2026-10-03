/**
 * Dışarıdan nöbet: canlı sunucuyu bir YABANCININ gözünden yoklar.
 *
 * 2026-10-03 denetimine kadar hiçbir izleme yoktu. Sunucu çökse, sertifika yenilenmese
 * ya da bir dağıtım yanlışlıkla veritabanı portunu internete açsa kimse bilmezdi.
 * Bu depoda aynı sınıf kusur üç kez yakalandı (göçmen imajı, yedek görevi, Caddy):
 * bir şey yapıldığı sanılıyor ve hiçbir şey uyarmıyor.
 *
 * Yalnız 200'e bakmıyor — o, "ayakta ama yanlış" durumu kaçırır:
 *   - sağlık ucu gövdesi, site sayfaları, bilinmeyen yolun GERÇEKTEN 404 olması,
 *   - güvenlik başlıklarının yerinde olması (bir Caddyfile değişikliği sessizce silebilir),
 *   - sertifikanın en az 14 gün geçerli olması,
 *   - iç servis portlarının dışarıdan KAPALI olması (Docker yayınları ufw'yu atlar).
 *
 *     node scripts/nobet.mjs        # sorun varsa çıkış kodu 1, ayrıntı stdout'ta
 */
/* global AbortSignal */
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';

const ALAN = process.env.NOBET_ALAN ?? 'swiip.app';
const KOK = `https://${ALAN}`;
const sorunlar = [];

async function yokla(ad, fn) {
  try {
    const sonuc = await fn();
    if (sonuc !== true) sorunlar.push(`${ad}: ${sonuc}`);
    console.log(
      `${sonuc === true ? 'tamam' : 'SORUN'}  ${ad}${sonuc === true ? '' : ` — ${sonuc}`}`,
    );
  } catch (hata) {
    sorunlar.push(`${ad}: ${hata.message}`);
    console.log(`SORUN  ${ad} — ${hata.message}`);
  }
}

const getir = (yol, secenek = {}) =>
  fetch(`${KOK}${yol}`, { redirect: 'manual', signal: AbortSignal.timeout(15_000), ...secenek });

await yokla('sağlık ucu', async () => {
  const y = await getir('/saglik');
  const g = await y.json();
  return y.status === 200 && g.durum === 'iyi' ? true : `${y.status} ${JSON.stringify(g)}`;
});

// `/saglik` veritabanına dokunmuyor; bu istek dokunuyor (kullanıcı araması). Olmayan
// bir hesapla giriş 401 dönmeli — 500, API'nin ayakta ama veritabanının kopuk olduğu
// durumdur ve sağlık ucu onu görmez.
await yokla('API + veritabanı (olmayan hesapla giriş 401)', async () => {
  const y = await getir('/v1/kimlik/giris', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'nobet-yok@swiip.app', parola: 'nobet-yoklamasi-1' }),
  });
  return y.status === 401 ? true : `${y.status}`;
});

for (const yol of ['/', '/gizlilik.html', '/destek.html', '/en/']) {
  await yokla(`site ${yol}`, async () => {
    const y = await getir(yol);
    return y.status === 200 ? true : `${y.status}`;
  });
}

for (const yol of ['/.env', '/bulunmayan-sayfa', '/.git/config']) {
  await yokla(`${yol} 404`, async () => {
    const y = await getir(yol);
    return y.status === 404 ? true : `${y.status} (404 bekleniyordu)`;
  });
}

await yokla('güvenlik başlıkları', async () => {
  const y = await getir('/');
  const eksik = [
    'strict-transport-security',
    'content-security-policy',
    'x-content-type-options',
    'x-frame-options',
  ].filter((b) => !y.headers.get(b));
  if (y.headers.get('server')) eksik.push('server başlığı SIZIYOR');
  return eksik.length === 0 ? true : `eksik: ${eksik.join(', ')}`;
});

// fetch TRACE göndermeyi reddediyor; ham istek gerekiyor.
await yokla(
  'TRACE kapalı',
  () =>
    new Promise((coz, red) => {
      const i = https.request(`${KOK}/`, { method: 'TRACE', timeout: 15_000 }, (y) => {
        y.resume();
        coz(y.statusCode === 405 ? true : `${y.statusCode}`);
      });
      i.on('error', red);
      i.end();
    }),
);

await yokla(
  'sertifika ≥ 14 gün',
  () =>
    new Promise((coz, red) => {
      const s = tls.connect(443, ALAN, { servername: ALAN, timeout: 15_000 }, () => {
        const bitis = new Date(s.getPeerCertificate().valid_to);
        s.end();
        const gun = Math.floor((bitis - Date.now()) / 86_400_000);
        coz(gun >= 14 ? true : `${gun} gün kaldı (${bitis.toISOString()})`);
      });
      s.on('error', red);
      s.on('timeout', () => red(new Error('zaman aşımı')));
    }),
);

/** İnternete ASLA açık olmaması gereken portlar. */
const KAPALI = {
  5432: 'Postgres',
  3000: 'API',
  2019: 'Caddy yönetimi',
  2375: 'Docker API',
  2376: 'Docker API',
  6379: 'Redis',
  8080: 'HTTP alt',
  9000: 'yönetim',
};
for (const [port, ad] of Object.entries(KAPALI)) {
  await yokla(
    `${port} (${ad}) dışarıdan kapalı`,
    () =>
      new Promise((coz) => {
        const s = net.connect({ host: ALAN, port: Number(port) });
        const bitir = (sonuc) => {
          s.destroy();
          coz(sonuc);
        };
        s.setTimeout(5_000, () => bitir(true));
        s.on('connect', () => bitir('AÇIK — internete açık bir iç servis'));
        s.on('error', () => bitir(true));
      }),
  );
}

if (sorunlar.length > 0) {
  console.log(`\n${sorunlar.length} sorun:\n${sorunlar.join('\n')}`);
  process.exit(1);
}
console.log('\nHepsi yolunda.');
