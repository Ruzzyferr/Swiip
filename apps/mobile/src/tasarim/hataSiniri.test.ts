import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Hata sınırı — "uygulama çökmez" kuralının altındaki ağ.
 *
 * `CLAUDE.md`'nin en üst sıradaki kuralı bu ve gerekçesi ölçülmüş (Diyetkolik
 * negatiflerinin %34'ü teknik hataydı). Buna rağmen depoda tek bir hata sınırı yoktu:
 * herhangi bir bileşenin çizim sırasında fırlattığı hata React ağacını söküyor,
 * kullanıcı beyaz ekranla kalıyordu — kapatıp açmaktan başka yolu olmadan.
 *
 * Bileşen doğrudan içe aktarılamıyor: `react-native` çekiyor ve Node altında
 * ayrıştırılamıyor. `tabanAdresi.test.ts` aynı sınırla karşılaşmış ve aynı yolu
 * seçmiş — davranışı belirleyen şeyi KAYNAKTAN doğrulamak. Burada korunan şey
 * sınırın var olması ve doğru yere bağlı olması; bir gün biri sarmalayıcıyı
 * kaldırırsa bu test düşer.
 */

const buradan = dirname(fileURLToPath(import.meta.url));
const sinir = readFileSync(resolve(buradan, 'HataSiniri.tsx'), 'utf8');
const kokDuzen = readFileSync(resolve(buradan, '../../app/_layout.tsx'), 'utf8');

describe('HataSiniri bileşeni', () => {
  it("React'in hata yakalama sözleşmesini uyguluyor", () => {
    // İkisi de gerekli: biri ekranı değiştirir, diğeri raporlamaya kapı bırakır.
    // Adları React tarafından belirleniyor; yazım hatası sınırı sessizce etkisiz kılar.
    expect(sinir).toContain('static getDerivedStateFromError');
    expect(sinir).toContain('componentDidCatch');
  });

  it('sınıf bileşeni — kancayla hata yakalanamaz', () => {
    expect(sinir).toMatch(/class HataSiniri extends Component/);
  });

  it('kullanıcıya tekrar deneme yolu bırakıyor', () => {
    expect(sinir).toContain('yeniden');
    expect(sinir).toContain('<Dugme');
  });

  /**
   * Hata ekranı temayı KULLANIYOR ama sınıfın içinden değil.
   *
   * Tema bir kanca; sınıf bileşeninde çağrılamaz. Ekranı ayrı bir işlev bileşenine
   * almak hem bunu çözüyor hem de hata ekranının koyu temada koyu kalmasını
   * sağlıyor — sabit renk yazılsaydı koyu temada beyaz bir sayfa patlardı.
   */
  it('hata ekranı ayrı bir işlev bileşeni ve temayı oradan okuyor', () => {
    expect(sinir).toMatch(/function HataEkrani\(/);
    expect(sinir).toContain('useTema()');
    // Sınıfın kendisi kanca çağırmıyor.
    expect(sinir).not.toMatch(/class HataSiniri[\s\S]*useTema\(/);
  });
});

describe('kök düzen', () => {
  it('gezinme yığınını hata sınırıyla sarmalıyor', () => {
    expect(kokDuzen).toContain('HataSiniri');
    expect(kokDuzen, 'sınır yığını gerçekten sarmalamalı').toMatch(
      /<HataSiniri[^>]*>[\s\S]*<Yigin\s*\/>[\s\S]*<\/HataSiniri>/,
    );
  });

  it('sınır oturum sağlayıcısının içinde — metinler kullanıcının dilinde çıksın', () => {
    const saglayici = kokDuzen.indexOf('<OturumSaglayici>');
    const kullanim = kokDuzen.indexOf('<HataSiniri', saglayici);
    expect(saglayici).toBeGreaterThan(-1);
    expect(kullanim).toBeGreaterThan(saglayici);
  });
});
