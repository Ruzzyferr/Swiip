import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KAYNAKLAR } from './kaynaklar';
import { tr } from './metinler.tr';
import { en } from './metinler.en';

/**
 * Sağlık hesaplarının kaynağı görünür kalsın.
 *
 * Apple 2026-08-27'de Guideline 1.4.1 ile reddetti: uygulama kalori, makro ve yük
 * hesapları sunuyor ama hiçbirinin kaynağını göstermiyordu. Şart iki parçalı —
 * atıf UYGULAMANIN İÇİNDE olacak ve kolay bulunacak.
 *
 * Bu dosya o şartın sessizce çürümesini engelliyor. En kolay çürüme yolu şu: yeni
 * bir denklem eklenir, künyesi yazılmaz; ya da bir kaynak eklenir, açıklaması
 * sözlüğe girmez ve ekranda boş bir başlık çıkar.
 */

const MOBIL = join(import.meta.dirname, '..', '..', '..', 'apps', 'mobile');
const oku = (...yol: string[]) => readFileSync(join(MOBIL, ...yol), 'utf8');

describe('kaynak künyeleri', () => {
  it('liste boş değil', () => {
    expect(KAYNAKLAR.length).toBeGreaterThan(0);
  });

  it('her kaynağın künyesi dolu ve bir yıl içeriyor', () => {
    for (const k of KAYNAKLAR) {
      expect(k.kunye.length, `${k.anahtar} künyesi çok kısa`).toBeGreaterThan(40);
      expect(k.kunye, `${k.anahtar} künyesinde yayın yılı yok`).toMatch(/\b(19|20)\d{2}\b/);
    }
  });

  it('anahtarlar benzersiz', () => {
    const anahtarlar = KAYNAKLAR.map((k) => k.anahtar);
    expect(new Set(anahtarlar).size, 'yinelenen anahtar var').toBe(anahtarlar.length);
  });

  it('verilen her bağlantı https', () => {
    for (const k of KAYNAKLAR) {
      if (k.baglanti === undefined) continue;
      expect(k.baglanti, `${k.anahtar} bağlantısı https değil`).toMatch(/^https:\/\//);
    }
  });
});

describe('sözlük karşılıkları', () => {
  it.each([
    ['tr', tr],
    ['en', en],
  ])('%s: her kaynağın açıklaması var', (_dil, sozluk) => {
    for (const k of KAYNAKLAR) {
      const a =
        sozluk.kaynaklar.aciklamalar[k.anahtar as keyof typeof sozluk.kaynaklar.aciklamalar];
      expect(a, `${k.anahtar} açıklaması yok — ekranda boş başlık çıkar`).toBeTruthy();
      expect(String(a).length).toBeGreaterThan(10);
    }
  });

  it.each([
    ['tr', tr],
    ['en', en],
  ])('%s: fazladan açıklama yok', (_dil, sozluk) => {
    const anahtarlar = new Set(KAYNAKLAR.map((k) => k.anahtar));
    for (const a of Object.keys(sozluk.kaynaklar.aciklamalar)) {
      expect(anahtarlar.has(a), `${a} açıklaması var ama böyle bir kaynak yok`).toBe(true);
    }
  });
});

/**
 * Ekranın kendisi. Apple "in the app" ve "easy to find" diyor; bir sözlük girdisi
 * tek başına ikisini de karşılamıyor.
 */
describe('uygulamadaki yeri', () => {
  it('kaynaklar ekranı var ve listeyi geziyor', () => {
    const ekran = oku('app', 'ayarlar', 'kaynaklar.tsx');
    expect(ekran).toMatch(/KAYNAKLAR\.map/);
    expect(ekran, 'künye basılmıyor').toMatch(/kaynak\.kunye/);
  });

  it('ayarlardan tek dokunuşla açılıyor', () => {
    const ayarlar = oku('app', '(sekme)', 'ayarlar.tsx');
    expect(ayarlar, 'ayarlarda kaynaklara giden bir yol yok — atıf "kolay bulunur" olmaz').toMatch(
      /router\.push\('\/ayarlar\/kaynaklar'\)/,
    );
  });

  it('ekran gezinme düzenine kayıtlı', () => {
    expect(oku('app', 'ayarlar', '_layout.tsx')).toMatch(/name="kaynaklar"/);
  });

  it('tahmin uyarısı ekranda gösteriliyor', () => {
    // Kaynak listesi okuyan biri "bunlar kesin" izlenimiyle ayrılmamalı.
    expect(oku('app', 'ayarlar', 'kaynaklar.tsx')).toMatch(/tahminUyarisi/);
  });
});
