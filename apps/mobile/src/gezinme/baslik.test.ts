import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Her ekranın başlığı klasör düzeninde tanımlı (F1.6).
 *
 * Ekranlar başlıklarını kendi gövdelerinde kuruyordu:
 *
 *     if (!hazir) return <Yukleniyor />;      // ← başlık henüz yok
 *     ...
 *     return (<><Stack.Screen options={{ title: m.sayfaBasligi }} /> ... </>);
 *
 * Yükleme ve hata dalları `<Stack.Screen>`den ÖNCE dönüyordu; o sürede expo-router
 * başlığa ham rota yolunu yazıyordu. Emülatörde görüldü: analiz hazırlanamadığında
 * ekranın başlığı **"rapor/index"** idi. On altı ekranda aynı durum vardı ve her yavaş
 * yüklemede görünüyordu.
 *
 * Başlık artık klasör düzeninde: veri gelmeden de doğru. Ekranlar dinamik başlıkları
 * (tarif adı, hareket adı) veri gelince üstüne yazmaya devam ediyor.
 */

const APP = join(import.meta.dirname, '..', '..', 'app');

/** Sekme grubu kendi başlıklarını `Tabs` üzerinden veriyor; kapsam dışı. */
const KAPSAM_DISI = new Set(['(sekme)']);

function ekranKlasorleri(): { klasor: string; ekranlar: string[] }[] {
  return readdirSync(APP, { withFileTypes: true })
    .filter((g) => g.isDirectory() && !KAPSAM_DISI.has(g.name))
    .map((g) => ({
      klasor: g.name,
      ekranlar: readdirSync(join(APP, g.name))
        .filter((ad) => ad.endsWith('.tsx') && ad !== '_layout.tsx')
        .map((ad) => ad.replace(/\.tsx$/, '')),
    }))
    .filter((k) => k.ekranlar.length > 0);
}

const KLASORLER = ekranKlasorleri();

describe('klasör düzenleri', () => {
  it('ekran klasörü bulundu — test boşa dönmüyor', () => {
    expect(KLASORLER.length).toBeGreaterThan(5);
  });

  it.each(KLASORLER.map((k) => [k.klasor, k]))('%s bir _layout.tsx taşıyor', (_ad, k) => {
    expect(
      existsSync(join(APP, k.klasor, '_layout.tsx')),
      `app/${k.klasor}/_layout.tsx yok: bu klasördeki ekranlar yüklenirken başlıkta ham ` +
        'rota yolu görünür.',
    ).toBe(true);
  });

  it.each(
    KLASORLER.flatMap((k) => k.ekranlar.map((e) => [`${k.klasor}/${e}`, k.klasor, e] as const)),
  )('%s için düzende bir tanım var', (_ad, klasor, ekran) => {
    const duzen = join(APP, klasor, '_layout.tsx');
    const kaynak = existsSync(duzen) ? readFileSync(duzen, 'utf8') : '';

    expect(
      kaynak.includes(`name="${ekran}"`),
      `app/${klasor}/_layout.tsx içinde "${ekran}" tanımlı değil: başlığı yükleme ` +
        'anında ham rota yolu olur.',
    ).toBe(true);
  });
});

/**
 * Paywall modal olarak açılıyor (F6.3).
 *
 * Spec bölüm 13: kapatma ilk saniyeden görünür. Modal sunum kapatmayı sistem düzeyinde
 * de mümkün kılıyor ve ekranın "akışın içinde bir adım" değil "araya giren bir teklif"
 * olduğunu görsel olarak söylüyor.
 */
describe('paywall sunumu', () => {
  it("ödeme düzeni presentation: 'modal' tanımlıyor", () => {
    const kaynak = readFileSync(join(APP, 'odeme', '_layout.tsx'), 'utf8');

    expect(kaynak).toMatch(/presentation:\s*'modal'/);
  });
});
