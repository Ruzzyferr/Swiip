import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Üretim imajının açılabilirliği.
 *
 * 2026-08-21'de ilk gerçek dağıtımda API konteyneri yeniden başlama döngüsüne girdi:
 * `Cannot find package 'tsx'`. Sebep, imajın iki yarısının birbiriyle çelişmesiydi —
 * çalıştırma katmanı `npm ci --omit=dev` ile kuruyor, ama başlatma komutu
 * `node --import tsx` diyor ve `tsx` devDependencies'te duruyordu.
 *
 * Bu, tip denetiminden de testlerden de geçen bir kusur: her ikisi de imajın içine
 * bakmıyor. Yalnızca konteyner çalıştırıldığında ortaya çıkıyor.
 *
 * Test, Dockerfile'ın kendisini okuyup çalışma anında çözülecek paketleri çıkarıyor
 * ve her birinin `dependencies` altında olmasını şart koşuyor.
 */

const buradan = dirname(fileURLToPath(import.meta.url));
const kok = resolve(buradan, '../../..');

const dockerfile = readFileSync(resolve(kok, 'infra/api.Dockerfile'), 'utf8');
const paketJson = JSON.parse(readFileSync(resolve(kok, 'packages/api/package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

/** Çalıştırma katmanı geliştirme bağımlılıklarını atıyor mu? */
function gelistirmeBagimliliklariAtiliyor(): boolean {
  return /npm ci[^\n]*--omit=dev/.test(dockerfile);
}

/**
 * Başlatma komutunda `--import <paket>` / `--loader <paket>` ile çözülen paketler.
 *
 * Yol (`./` veya `/` ile başlayan) olanlar elenir; onlar dosya, paket değil.
 */
function calismaAnindaCozulenPaketler(): string[] {
  const cmd = /CMD\s+\[([^\]]+)\]/.exec(dockerfile);
  const icerik = cmd?.[1];
  if (!icerik) return [];
  const parcalar = icerik.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
  const paketler: string[] = [];
  for (let i = 0; i < parcalar.length - 1; i++) {
    if (parcalar[i] === '--import' || parcalar[i] === '--loader' || parcalar[i] === '--require') {
      const sonraki = parcalar[i + 1];
      if (sonraki && !sonraki.startsWith('.') && !sonraki.startsWith('/')) paketler.push(sonraki);
    }
  }
  return paketler;
}

describe('üretim imajı', () => {
  it('başlatma komutunda çözülen her paket dependencies altında olmalı', () => {
    const paketler = calismaAnindaCozulenPaketler();

    // Komut hiç paket çözmüyorsa test anlamsızlaşır; bunu sessizce geçme.
    expect(paketler.length).toBeGreaterThan(0);

    for (const ad of paketler) {
      const uretimde = Boolean(paketJson.dependencies?.[ad]);
      const yalnizGelistirmede = Boolean(paketJson.devDependencies?.[ad]);

      expect(
        uretimde,
        `"${ad}" başlatma komutunda kullanılıyor ama packages/api/package.json ` +
          `dependencies altında değil${yalnizGelistirmede ? ' (devDependencies altında)' : ''}. ` +
          `Çalıştırma katmanı --omit=dev ile kurduğu için konteyner açılmaz.`,
      ).toBe(true);
    }
  });

  it('çalıştırma katmanı geliştirme bağımlılıklarını gerçekten atıyor', () => {
    // Üstteki testin gerekçesi buna dayanıyor. Dockerfile bir gün --omit=dev'i
    // bırakırsa kural gevşeyebilir; o zaman bu test kırmızıya düşüp haber versin.
    expect(gelistirmeBagimliliklariAtiliyor()).toBe(true);
  });
});

/**
 * Göçler sunucuya GERÇEKTEN ulaşıyor mu?
 *
 * Dağıtım betiği `docker compose build api` yazıyordu. `gocmen` ve `tohumcu` aynı
 * Dockerfile'ı kullanıyor ama ayrı servisler, yani ayrı imajları var: `api` her
 * dağıtımda yeniden derlenirken ötekiler ilk derlendikleri hâlde kalıyordu. `gocmen`
 * göç dosyalarını **imajdan** okuduğu için sonuç şuydu — o imaj derlendikten sonra
 * eklenen hiçbir göç veritabanına uygulanmadı.
 *
 * Kusur sessizdi: `gocmen` başarıyla çıkıyor (uygulayacak yeni dosya görmüyor), `api`
 * ayağa kalkıyor, sağlık ucu 200 dönüyor, dağıtım "başarılı" diyor. Ancak yeni tablo
 * ilk kez sorgulandığında 500 olarak görünüyor. Üretimde tam bu oldu: `kanca_olaylari`
 * tablosu yoktu ve abonelik kancası 42P01 ile patlıyordu — yani satın alma kancası,
 * hakkı açan tek yol, çalışmıyordu.
 */
describe('dağıtım: göçler imaja giriyor ve uygulanıyor', () => {
  const dagitim = readFileSync(resolve(kok, 'scripts/sunucu-dagit.sh'), 'utf8');
  const compose = readFileSync(resolve(kok, 'infra/docker-compose.yml'), 'utf8');

  it('dağıtım tek servisi değil TÜM servisleri derliyor', () => {
    const buildSatirlari = dagitim
      .split('\n')
      .filter((s) => s.includes('docker compose') && s.includes(' build'));

    expect(buildSatirlari.length, 'derleme satırı bulunamadı').toBeGreaterThan(0);
    for (const satir of buildSatirlari) {
      expect(
        satir.trim().endsWith('build'),
        `"build" tek bir servisle sınırlanmış: ${satir.trim()} — gocmen eski imajla kalır`,
      ).toBe(true);
    }
  });

  it('göç klasörü imaja kopyalanıyor', () => {
    expect(dockerfile).toMatch(/COPY .*packages\/api\/gocler packages\/api\/gocler/);
  });

  it('gocmen servisi api ile aynı Dockerfile’dan derleniyor', () => {
    // Aynı dosyadan derlendikleri için ikisinin de her dağıtımda tazelenmesi şart.
    const gocmenBlogu = compose.slice(compose.indexOf('gocmen:'));
    expect(gocmenBlogu).toContain('dockerfile: infra/api.Dockerfile');
  });

  it('api gocmen tamamlanmadan başlamıyor', () => {
    const apiBlogu = compose.slice(compose.indexOf('\n  api:'));
    expect(apiBlogu).toContain('service_completed_successfully');
  });
});

/**
 * Compose'un bağladığı her yol dağıtım paketinde OLMALI.
 *
 * `git archive` yalnızca `infra magaza packages scripts` gönderiyordu ve yorumu
 * "apps/ gönderilmiyor: mobil uygulama sunucuda derlenmiyor" diyordu. Doğru ama
 * eksik: aynı depodaki `docker-compose.yml` Caddy'ye `../apps/site:/site:ro`
 * bağlıyor, yani marka sitesi sunucudaki o klasörden servis ediliyor.
 *
 * Sonuç: site dosyaları HİÇBİR dağıtımda güncellenmiyordu. 2026-08-26'da ölçüldü —
 * sunucudaki kopya ilk kurulumdan (21 Ağustos) kalmıştı ve dört dosyadan üçünün
 * md5'i depodakinden farklıydı. Canlıdaki gizlilik politikası ve hesap silme
 * sayfası depodakiyle aynı değildi; ikisi de mağaza incelemesinde tıklanan
 * bağlantılar.
 *
 * Kusur sessizdi: dağıtım "başarılı" yazıyor, sağlık ucu 200 dönüyor, site
 * açılıyor — yalnızca içeriği eski. Hiçbir şey uyarmıyor.
 */
describe('dağıtım: sunucunun okuduğu her klasör pakete giriyor', () => {
  const dagitim = readFileSync(resolve(kok, 'scripts/sunucu-dagit.sh'), 'utf8');
  const compose = readFileSync(resolve(kok, 'infra/docker-compose.yml'), 'utf8');

  /** `git archive` satırında sayılan yollar. */
  const paketYollari = (() => {
    const satirlar = dagitim.split('\n');
    const bas = satirlar.findIndex((s) => s.startsWith('git archive'));
    if (bas < 0) return [];

    const parcalar: string[] = [];
    for (let i = bas; i < satirlar.length; i++) {
      const s = satirlar[i]!;
      parcalar.push(s.replace(/\\$/, ''));
      if (!s.trimEnd().endsWith('\\')) break;
    }
    return parcalar
      .join(' ')
      .split(/\s+/)
      .filter(
        (p) => p && !p.startsWith('-') && !p.startsWith('$') && p !== 'git' && p !== 'archive',
      );
  })();

  /** Compose'un ana makineden bağladığı `../<yol>` girdileri. */
  const baglananYollar = [...compose.matchAll(/^\s*-\s*\.\.\/([\w./-]+):/gm)].map((m) => m[1]!);

  it('git archive satırı okunabiliyor', () => {
    expect(paketYollari.length, 'git archive yolları ayrıştırılamadı').toBeGreaterThan(3);
  });

  it('compose ana makineden klasör bağlıyor', () => {
    expect(baglananYollar.length, 'bağlanan yol bulunamadı').toBeGreaterThan(0);
  });

  it.each(['apps/site'])('%s dağıtım paketinde', (yol) => {
    expect(
      paketYollari.some((p) => p === yol || yol.startsWith(`${p}/`)),
      `${yol} compose tarafından bağlanıyor ama git archive göndermiyor — ` +
        'sunucudaki kopya ilk kurulumdan kalır ve sessizce eskir.',
    ).toBe(true);
  });

  it('compose bağladığı halde pakete girmeyen klasör yok', () => {
    // `yedekler` ve `scripts` sunucunun kendi ürettiği ya da zaten gönderilen yollar.
    const muaf = ['yedekler'];
    const eksik = baglananYollar
      .filter((y) => !muaf.some((m) => y.startsWith(m)))
      .filter((y) => !paketYollari.some((p) => y === p || y.startsWith(`${p}/`)));

    expect(eksik, `compose bağlıyor ama dağıtım göndermiyor: ${eksik.join(', ')}`).toEqual([]);
  });
});

/**
 * Caddy yapılandırması dağıtımla GERÇEKTEN yenileniyor mu?
 *
 * `Caddyfile` konteynere tek dosya olarak bağlanıyor ve Docker tek dosya bağlantısını
 * inode'a bağlıyor. `tar -xzf` dosyayı yerinde değiştirmiyor: siliyor ve yenisini
 * oluşturuyor — yani yeni inode. Konteyner eski inode'u tutmaya devam ediyor.
 *
 * `docker compose up -d` de yardım etmiyor: compose dosyası değişmediği için caddy'yi
 * "Running" bırakıyor. Sonuç: Caddyfile'daki hiçbir değişiklik dağıtımla etkili
 * olmuyordu.
 *
 * 2026-08-26'da ölçüldü. Site yönlendirmesi düzeltildi, dağıtıldı, sunucudaki
 * `infra/Caddyfile` güncelken konteynerdeki dosyada `handle_errors` sayısı hâlâ 0'dı
 * ve yanlış yollar 200 ile ana sayfayı döndürüyordu. `caddy reload` bile yetmedi —
 * okuduğu dosyanın kendisi eskiydi.
 */
describe('dağıtım: Caddy yapılandırması gerçekten yenileniyor', () => {
  const dagitim = readFileSync(resolve(kok, 'scripts/sunucu-dagit.sh'), 'utf8');
  const compose = readFileSync(resolve(kok, 'infra/docker-compose.yml'), 'utf8');

  it('Caddyfile hâlâ tek dosya olarak bağlanıyor — bu testin varlık sebebi', () => {
    expect(compose, 'bağlantı biçimi değiştiyse bu testin gerekçesi de gözden geçirilmeli').toMatch(
      /\.\/Caddyfile:\/etc\/caddy\/Caddyfile/,
    );
  });

  it('dağıtım caddy konteynerini zorla yeniden oluşturuyor', () => {
    expect(
      dagitim,
      'force-recreate yoksa Caddyfile değişikliği konteynere hiç ulaşmaz: eski inode ' +
        'okunmaya devam eder ve dağıtım yine "başarılı" yazar.',
    ).toMatch(/up -d --force-recreate caddy/);
  });

  it('yeniden oluşturma normal up satırından SONRA geliyor', () => {
    const normal = dagitim.indexOf('up -d\n');
    const zorla = dagitim.indexOf('up -d --force-recreate caddy');
    expect(zorla, 'force-recreate satırı yok').toBeGreaterThan(-1);
    expect(zorla, 'force-recreate normal up’tan önce koşarsa etkisi kaybolur').toBeGreaterThan(
      normal,
    );
  });
});
