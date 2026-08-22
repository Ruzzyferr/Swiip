import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
// js-yaml 5 varsayılan dışa aktarım vermiyor; adlandırılmış `load` kullanılmalı.
// Kendi tiplerini de getiriyor, bu yüzden @types/js-yaml kurulmaz (v4 şeklinde
// sahte bir varsayılan tanımlayıp gerçek tipleri gölgeliyor).
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

/**
 * Göçlerin dağıtımda gerçekten çalıştığı.
 *
 * 2026-08-21'de ilk kurulumdan sonra API sağlıklı göründü ama veritabanı **boştu**:
 * `\dt` "Did not find any relations" dedi. Compose'da göç adımı yoktu; şema elle
 * `goc.ts` çalıştırılarak kuruldu.
 *
 * Bu sessiz bir kusur: API açılıyor, /saglik 200 dönüyor, konteyner "healthy" diyor.
 * Yalnızca gerçek bir istek geldiğinde tablo bulunamıyor. Bir sonraki dağıtımda yeni
 * bir göç eklenirse aynı sessizlikle atlanır ve fark edilmesi daha da zor olur.
 *
 * Kural: API, göç adımı **başarıyla bitmeden** başlamamalı.
 */

type Servis = {
  command?: unknown;
  entrypoint?: unknown;
  depends_on?: Record<string, { condition?: string }>;
};
type Compose = { services?: Record<string, Servis> };

const buradan = dirname(fileURLToPath(import.meta.url));
const kok = resolve(buradan, '../../..');
const compose = load(readFileSync(resolve(kok, 'infra/docker-compose.yml'), 'utf8')) as Compose;
const servisler = compose.services ?? {};

/** Göç betiğini çalıştıran servisi, komutuna bakarak bulur. */
function gocServisiAdi(): string | undefined {
  return Object.keys(servisler).find((ad) => {
    const s = servisler[ad];
    const komut = JSON.stringify([s?.command, s?.entrypoint]);
    return komut.includes('goc.ts');
  });
}

describe('dağıtımda göç adımı', () => {
  it('göçleri çalıştıran bir servis var', () => {
    expect(
      gocServisiAdi(),
      'infra/docker-compose.yml içinde goc.ts çalıştıran servis yok',
    ).toBeDefined();
  });

  it('api, göç adımı başarıyla bitmeden başlamıyor', () => {
    const gocmen = gocServisiAdi();
    const bagimlilik = servisler.api?.depends_on ?? {};

    expect(
      gocmen && bagimlilik[gocmen]?.condition,
      `api servisi "${gocmen}" adımını service_completed_successfully koşuluyla beklemeli; ` +
        `aksi hâlde şema güncellenmeden açılır ve kusur sessiz kalır`,
    ).toBe('service_completed_successfully');
  });

  it('api hâlâ veritabanının sağlıklı olmasını da bekliyor', () => {
    // Göç adımını eklerken mevcut postgres beklemesi düşürülmemeli.
    expect(servisler.api?.depends_on?.postgres?.condition).toBe('service_healthy');
  });
});

/**
 * Tohumlamanın dağıtımda gerçekten çalıştığı.
 *
 * Göç adımı eklendi ama tohumlama unutuldu ve aynı sessizlik bir kez daha yaşandı:
 * üretimde 28 tablo vardı, **besin ve tarif tabloları boştu.** API sağlıklı, /saglik
 * 200, konteyner "healthy". Ama:
 *
 *  - Besin araması boş dönüyordu — ücretsiz planın teslim ettiği ana özellik.
 *  - Öğün planı kurulamıyordu — tarif kütüphanesi yok.
 *  - Fotoğraftan tanıma eşleşemiyordu — Pro'nun tek farkı.
 *
 * Hiçbiri hata vermiyordu; hepsi "sonuç yok" diyordu. Kusur ancak bir yedek geri
 * yüklenip içine bakılınca görüldü.
 *
 * Tohumlama tekrar çalıştırılabilir (aynı ad tekrar eklenmez, değerler güncellenir),
 * bu yüzden her dağıtımda çalışması hem güvenli hem doğru.
 */
function tohumServisiAdi(): string | undefined {
  return Object.keys(servisler).find((ad) => {
    const s = servisler[ad];
    return JSON.stringify([s?.command, s?.entrypoint]).includes('tohum.ts');
  });
}

describe('dağıtımda tohumlama adımı', () => {
  it('tohumlamayı çalıştıran bir servis var', () => {
    expect(
      tohumServisiAdi(),
      'infra/docker-compose.yml içinde tohum.ts çalıştıran servis yok: şema kurulur, ' +
        'katalog boş kalır ve besin araması sessizce hiçbir şey döndürmez',
    ).toBeDefined();
  });

  it('tohumlama göçten sonra çalışıyor', () => {
    const gocmen = gocServisiAdi();
    const tohumcu = tohumServisiAdi();
    const bagimlilik = tohumcu ? (servisler[tohumcu]?.depends_on ?? {}) : {};

    expect(
      gocmen && bagimlilik[gocmen]?.condition,
      'tohumlama, göç adımını service_completed_successfully ile beklemeli',
    ).toBe('service_completed_successfully');
  });

  it('api, tohumlama bitmeden başlamıyor', () => {
    const tohumcu = tohumServisiAdi();
    const bagimlilik = servisler.api?.depends_on ?? {};

    expect(
      tohumcu && bagimlilik[tohumcu]?.condition,
      'api servisi tohumlamayı beklemeli; aksi hâlde katalog dolmadan istek almaya başlar',
    ).toBe('service_completed_successfully');
  });
});
