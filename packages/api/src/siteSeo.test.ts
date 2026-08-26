import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sitenin arama motorunda bulunabilmesi için gereken asgari şeyler.
 *
 * 2026-08-26'da ölçüldü: `robots.txt` ve `sitemap.xml` **yoktu** (ikisi de 404) ve
 * hiçbir sayfada `canonical` ya da `og:image` yoktu. Alt sayfalarda hiç OG etiketi
 * yoktu — yani gizlilik ya da hesap silme bağlantısı paylaşıldığında önizleme çıplak
 * bir bağlantı olarak görünüyordu.
 *
 * Bunlar "yapıldı sanılan" işler değil; hiç yapılmamışlardı ve hiçbir şey uyarmıyordu.
 * Site 200 dönüyor, açılıyor, güzel görünüyor — yalnızca bulunamıyor.
 *
 * Bu test kapsamı bilerek dar: SEO'nun tamamını değil, **yokluğu sessiz kalan**
 * dosya ve etiketleri koruyor.
 */

const SITE = join(import.meta.dirname, '..', '..', '..', 'apps', 'site');

/** İndekslenmesi istenen sayfalar. `404.html` bilerek dışarıda. */
const INDEKSLENEN = ['index.html', 'gizlilik.html', 'hesap-silme.html'];

const oku = (dosya: string) => readFileSync(join(SITE, dosya), 'utf8');

describe('arama motoru dosyaları', () => {
  it('robots.txt var', () => {
    expect(existsSync(join(SITE, 'robots.txt')), 'robots.txt yok — üretimde 404 dönüyordu').toBe(
      true,
    );
  });

  it('robots.txt sitemap’i gösteriyor', () => {
    expect(oku('robots.txt')).toMatch(/Sitemap:\s*https:\/\/swiip\.app\/sitemap\.xml/);
  });

  it('robots.txt API yollarını tarama dışında tutuyor', () => {
    // Site ve API aynı origin'den sunuluyor; /v1/* taranacak bir içerik değil.
    const metin = oku('robots.txt');
    expect(metin).toMatch(/Disallow:\s*\/v1\//);
    expect(metin).toMatch(/Disallow:\s*\/saglik/);
  });

  it('sitemap.xml var ve geçerli kök etikete sahip', () => {
    expect(existsSync(join(SITE, 'sitemap.xml')), 'sitemap.xml yok').toBe(true);
    expect(oku('sitemap.xml')).toMatch(
      /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/,
    );
  });

  it('sitemap yalnızca GERÇEKTEN var olan sayfaları sayıyor', () => {
    const adresler = [...oku('sitemap.xml').matchAll(/<loc>https:\/\/swiip\.app\/([^<]*)<\/loc>/g)]
      .map((m) => m[1]!)
      .map((yol) => (yol === '' ? 'index.html' : yol));

    for (const yol of adresler) {
      expect(existsSync(join(SITE, yol)), `sitemap ${yol} diyor ama dosya yok`).toBe(true);
    }
  });

  it('indekslenen her sayfa sitemap’te', () => {
    const ham = oku('sitemap.xml');
    for (const sayfa of INDEKSLENEN) {
      const beklenen = sayfa === 'index.html' ? 'https://swiip.app/' : `https://swiip.app/${sayfa}`;
      expect(ham, `${sayfa} sitemap’te yok`).toContain(`<loc>${beklenen}</loc>`);
    }
  });

  it('hata sayfası sitemap’te DEĞİL', () => {
    // Yorumlar sayılmaz: aranan şey gerçek bir <loc> girdisi.
    const adresler = [...oku('sitemap.xml').matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]!);
    expect(
      adresler.filter((a) => a.includes('404')),
      '404 sayfasını indekslemek kullanıcıyı boşuna tıklatır',
    ).toEqual([]);
  });
});

describe.each(INDEKSLENEN)('%s meta etiketleri', (sayfa) => {
  const html = () => oku(sayfa);

  it('canonical adresi var', () => {
    expect(html(), 'canonical yoksa aynı içerik birden çok adresle indekslenebilir').toMatch(
      /<link rel="canonical" href="https:\/\/swiip\.app\//,
    );
  });

  it('meta description var ve boş değil', () => {
    const m = html().match(/name="description"\s*\n?\s*content="([^"]+)"/);
    expect(m, 'description yok').toBeTruthy();
    expect(m![1]!.length, 'description çok kısa').toBeGreaterThan(50);
  });

  it('paylaşım önizlemesi tam: og:title, og:url, og:image', () => {
    const h = html();
    for (const etiket of ['og:title', 'og:description', 'og:url', 'og:image', 'og:site_name']) {
      expect(h, `${etiket} yok — paylaşılan bağlantı çıplak görünür`).toContain(
        `property="${etiket}"`,
      );
    }
  });

  it('og:image gerçekten var olan bir dosyayı gösteriyor', () => {
    const m = html().match(/property="og:image" content="https:\/\/swiip\.app\/([^"]+)"/);
    expect(m, 'og:image yok').toBeTruthy();
    expect(existsSync(join(SITE, m![1]!)), `og:image ${m![1]} diyor ama dosya yok`).toBe(true);
  });

  it('og:url canonical ile aynı', () => {
    const h = html();
    const c = h.match(/<link rel="canonical" href="([^"]+)"/)![1];
    const o = h.match(/property="og:url" content="([^"]+)"/)![1];
    expect(o, 'og:url ile canonical ayrışırsa hangisinin doğru olduğu belirsizleşir').toBe(c);
  });
});

describe('404 sayfası', () => {
  it('indekslenmiyor', () => {
    expect(oku('404.html')).toMatch(/name="robots" content="noindex/);
  });

  it('canonical taşımıyor', () => {
    expect(oku('404.html'), 'hata sayfasının canonical’i olmaz').not.toContain('rel="canonical"');
  });
});
