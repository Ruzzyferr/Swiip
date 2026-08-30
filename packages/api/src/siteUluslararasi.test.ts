import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Site uluslararası kullanıcıya kapalı kalmasın.
 *
 * Uygulama 175 ülkeye açılıyor. Ölçüldü (2026-08-31): sitenin altı sayfası da
 * `<html lang="tr">` idi, İngilizce sürüm yoktu ve **hiçbir mağaza bağlantısı da
 * yoktu** — üstelik uygulama 29 Ağustos'tan beri App Store'da canlıyken ana sayfa
 * hâlâ "yayına çıkınca haber ver" diyip e-posta topluyordu.
 *
 * İkisi de sessiz kusur: site açılır, hata vermez. Yalnızca yabancı bir kullanıcı
 * anlamadığı bir sayfa görür, ve indirebileceği bir uygulama için "henüz yok" der.
 *
 * Apple'ın da doğrudan ilgisi var: inceleme sırasında Support URL ve Privacy Policy
 * URL tıklanıyor (1.0 bir kez 1.5'ten reddedildi). 175 ülkede yalnızca Türkçe bir
 * destek sayfası, aynı maddenin tekrar açılması demek.
 */

const BURASI = dirname(fileURLToPath(import.meta.url));
const SITE = join(BURASI, '..', '..', '..', 'apps', 'site');
const oku = (yol: string) => readFileSync(join(SITE, yol), 'utf8');

/** Türkçe sayfa → İngilizce karşılığı. */
const ESLEME: Array<[string, string]> = [
  ['index.html', 'en/index.html'],
  ['destek.html', 'en/support.html'],
  ['gizlilik.html', 'en/privacy.html'],
  ['hesap-silme.html', 'en/delete-account.html'],
  ['kaynaklar.html', 'en/sources.html'],
  ['404.html', 'en/404.html'],
];

const TURKCE_HARF = /[çğıöşüÇĞİÖŞÜ]/;

/** Etiketleri, SVG'yi ve yorumları atılmış görünür metin. */
function gorunurMetin(kaynak: string): string {
  return kaynak
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

describe('her sayfanın İngilizce karşılığı var', () => {
  it.each(ESLEME)('%s → %s', (_tr, en) => {
    expect(existsSync(join(SITE, en)), `${en} yok`).toBe(true);
  });

  it.each(ESLEME.map(([, en]) => en))('%s gerçekten İngilizce', (en) => {
    const metin = gorunurMetin(oku(en));
    const turkce = metin
      .split(/\s+/)
      .filter((k) => TURKCE_HARF.test(k))
      // Dil geçişi bağlantısı kendi dilinde yazılır; doğru olan bu.
      .filter((k) => !k.includes('Türkçe'));

    expect(
      turkce,
      `İngilizce sayfada Türkçe kelime kaldı: ${turkce.slice(0, 6).join(', ')}`,
    ).toEqual([]);
  });

  it.each(ESLEME.map(([, en]) => en))('%s lang="en" ile işaretli', (en) => {
    expect(oku(en)).toMatch(/<html lang="en">/);
  });
});

describe('iki sürüm birbirine bağlı', () => {
  it.each(ESLEME.flat())('%s hreflang taşıyor', (sayfa) => {
    const kaynak = oku(sayfa);
    expect(kaynak, 'hreflang="tr" yok').toMatch(/hreflang="tr"/);
    expect(kaynak, 'hreflang="en" yok').toMatch(/hreflang="en"/);
    expect(kaynak, 'x-default yok — dili eşleşmeyen ziyaretçi için gerekli').toMatch(
      /hreflang="x-default"/,
    );
  });

  it.each(ESLEME.flat())('%s diğer dile bir bağlantı veriyor', (sayfa) => {
    // `hreflang` arama motoruna yarar; kullanıcının tıklayacağı bir şey de olmalı.
    expect(oku(sayfa)).toMatch(/class="(belge-dil|alt-dil)"/);
  });

  it('sitemap iki dili de eşleyerek sayıyor', () => {
    const harita = oku('sitemap.xml');
    expect(harita).toMatch(/xmlns:xhtml=/);
    for (const [, en] of ESLEME) {
      if (en.endsWith('404.html')) continue;
      const url = `https://swiip.app/${en.replace('en/index.html', 'en/')}`;
      expect(harita, `${url} sitemap'te yok`).toContain(url);
    }
  });
});

/**
 * Site uygulamanın DURUMUNU doğru söylüyor.
 *
 * Ana sayfa uygulama canlıyken "yayına çıkınca haber ver" diyordu. Kazanılmış bir
 * kullanıcıyı kapıda çevirmek, en pahalı sessiz kusurlardan biri.
 */
describe('indirme bağlantısı var', () => {
  it.each(['index.html', 'en/index.html'])('%s App Store bağlantısı taşıyor', (sayfa) => {
    expect(oku(sayfa), 'App Store bağlantısı yok').toMatch(
      /https:\/\/apps\.apple\.com\/[^"]*id6803979374/,
    );
  });

  it('ana sayfa artık "yayına çıkınca haber ver" demiyor', () => {
    expect(oku('index.html')).not.toMatch(/Yayına çıkınca haber ver/);
  });
});
