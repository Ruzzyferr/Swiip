import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Yanlış bir yol ANA SAYFAYA düşmemeli.
 *
 * Caddy'de `try_files {path} {path}/ /index.html` yazıyordu — tek sayfalık uygulama
 * kalıbı. Ama `apps/site` bir SPA değil, birkaç statik sayfa. Sonucu şuydu: yanlış
 * yazılmış HER yol 200 ile ana sayfayı döndürüyordu. Üretimde ölçüldü (2026-08-26):
 *
 *   /gizlilik     -> 200, <title>Swiip — Ölçüne göre</title>
 *   /destek.html  -> 200, aynı
 *   /.env         -> 200, aynı
 *
 * Bu yalnızca estetik bir mesele değil: kırık bir gizlilik ya da destek bağlantısı
 * KIRIK GÖRÜNMÜYOR. Pazarlama sayfası açılıyor, kimse fark etmiyor — ve mağaza
 * incelemesinde tıklanan ilk şeylerden biri tam olarak o bağlantı.
 *
 * `apps/mobile/src/baglantilar.ts` bu tuzağı biliyor ve bağlantılara `.html` ekleyerek
 * kaçınmaya çalışıyordu; ölçüm gösterdi ki `.html` de kurtarmıyor.
 */

const KOK = join(import.meta.dirname, '..', '..', '..');
const CADDY = readFileSync(join(KOK, 'infra', 'Caddyfile'), 'utf8');
const SITE = join(KOK, 'apps', 'site');

/** Yorum satırları atılır: bu test yapılandırmayı sınıyor, hatanın anlatısını değil. */
// CRLF de olabilir; satır sonu biçimi bu testin konusu değil.
const yorumsuz = CADDY.replace(/\r/g, '')
  .split('\n')
  .filter((s) => !s.trim().startsWith('#'))
  .join('\n');

describe('site yönlendirmesi', () => {
  it('bilinmeyen yol index.html’e düşmüyor', () => {
    const satir = yorumsuz.split('\n').find((s) => s.trim().startsWith('try_files'));
    expect(satir, 'try_files satırı yok').toBeDefined();

    // `{path}/index.html` meşru bir dizin çözümü; yasak olan çıplak `/index.html` yedeği.
    const argumanlar = satir!.trim().split(/\s+/).slice(1);
    expect(
      argumanlar,
      'try_files argümanları arasında çıplak /index.html varsa her yanlış yol 200 ile ana sayfayı döndürür.',
    ).not.toContain('/index.html');
  });

  it('uzantısız yol karşılığı olan sayfaya çözülüyor', () => {
    expect(
      yorumsuz,
      '{path}.html denenmezse /gizlilik gibi uzantısız bağlantılar 404 olur.',
    ).toMatch(/try_files[^\n]*\{path\}\.html/);
  });

  it('bulunamayan sayfa için hata işleyicisi var', () => {
    expect(yorumsuz, 'handle_errors yoksa Caddy düz metin 404 döndürür.').toMatch(
      /handle_errors\s*\{/,
    );
    expect(yorumsuz).toMatch(/rewrite \* \/404\.html/);
  });

  it('404 sayfası gerçekten var', () => {
    expect(existsSync(join(SITE, '404.html')), 'infra 404.html’e yönlendiriyor ama dosya yok').toBe(
      true,
    );
  });

  it('404 sayfası kullanıcıyı çıkmaza bırakmıyor', () => {
    const sayfa = readFileSync(join(SITE, '404.html'), 'utf8');
    for (const hedef of ['index.html', 'gizlilik.html', 'hesap-silme.html']) {
      expect(sayfa, `404 sayfasında ${hedef} bağlantısı yok`).toContain(hedef);
    }
  });

  it('404 sayfası sitenin kendi stiline bağlı', () => {
    const sayfa = readFileSync(join(SITE, '404.html'), 'utf8');
    expect(sayfa).toContain('stil.css');
    expect(sayfa).toContain('belge.css');
  });

  it('yönlendirilen her sayfa gerçekten dosya olarak var', () => {
    for (const dosya of ['index.html', 'gizlilik.html', 'hesap-silme.html', '404.html']) {
      expect(existsSync(join(SITE, dosya)), `${dosya} yok`).toBe(true);
    }
  });
});

/**
 * `app-ads.txt` yerinde ve doğru.
 *
 * IAB Tech Lab'in yetkili satıcı beyanı: "Swiip'in reklam envanterini kimler
 * satabilir". Programatik alıcılar satın almadan önce bunu tarıyor; dosya yoksa
 * ya da satıcıyı listelemiyorsa envanter YETKİSİZ sayılıyor ve çoğu alıcı teklif
 * vermiyor.
 *
 * Eksikliği bu yüzden sessiz bir gelir kaybı: reklam gösterilir, hata görünmez,
 * yalnızca doluluk ve eCPM düşer. AdMob konsolu da uygulama doğrulamasını buna
 * bağlıyor — 2026-08-31'de iOS girdisi açılırken tam bu yüzden "Couldn't complete
 * app verification" alındı.
 *
 * Alan adı mağaza listesindeki geliştirici sitesiyle aynı olmalı; App Store'daki
 * pazarlama adresi `https://swiip.app` (ASC'den okundu).
 */
describe('app-ads.txt', () => {
  const YOL = join(SITE, 'app-ads.txt');

  it('dosya var', () => {
    expect(existsSync(YOL), 'app-ads.txt yok: envanter yetkisiz sayılır').toBe(true);
  });

  it('AdMob yayıncı kimliğini DIRECT olarak beyan ediyor', () => {
    const satirlar = readFileSync(YOL, 'utf8')
      .split(String.fromCharCode(10))
      .map((r) => r.trim())
      .filter((r) => r && !r.startsWith('#'));

    expect(satirlar.length, 'beyan satırı yok').toBeGreaterThan(0);

    const admob = satirlar.find((r) => r.startsWith('google.com,'));
    expect(admob, 'google.com satırı yok').toBeDefined();

    const parcalar = admob!.split(',').map((p) => p.trim());
    expect(parcalar[0]).toBe('google.com');
    expect(parcalar[1], 'yayıncı kimliği AdMob hesabıyla aynı olmalı').toBe('pub-2953141598487358');
    expect(parcalar[2]).toBe('DIRECT');
    // Google'ın sertifika yetkilisi kimliği; sabit ve zorunlu.
    expect(parcalar[3]).toBe('f08c47fec0942fa0');
  });

  /** Caddy `.txt` köküne servis ediyor mu — `robots.txt` zaten aynı yoldan çıkıyor. */
  it('site kökünden servis ediliyor', () => {
    expect(existsSync(join(SITE, 'robots.txt')), 'robots.txt yoksa kıyas bozulur').toBe(true);
  });
});
