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
   *
   * Önce burada doğrudan `useTema()` aranıyordu. Ekran `Ekran` kabına alınınca
   * (2026-08-28, Apple Guideline 4) o çağrı gereksizleşti: zemini ve kenar
   * boşluklarını artık kap veriyor. Aranan şey çağrının kendisi değil, KURAL —
   * sabit renk yok, kanca sınıfın dışında.
   */
  it('hata ekranı ayrı bir işlev bileşeni ve temayı kaptan alıyor', () => {
    expect(sinir).toMatch(/function HataEkrani\(/);
    expect(sinir).toMatch(/<Ekran\b/);
    // Sınıfın kendisi kanca çağırmıyor.
    expect(sinir).not.toMatch(/class HataSiniri[\s\S]*useTema\(/);
  });

  /**
   * Son çıkış kırpılamaz.
   *
   * "Yeniden dene" düğmesi görünmezse kullanıcının uygulamayı silmekten başka yolu
   * kalmıyor. Ekran düz bir `View` idi; hata metni dile ve yazı tipi ölçeğine göre
   * uzuyor ve küçük tuvalde düğme dışarıda kalabiliyordu.
   */
  it('hata ekranı kaydırılabilir bir kapta', () => {
    expect(sinir).not.toMatch(/kaydirilabilir/);
    expect(sinir, 'başlık yok — üst boşluğu kap vermeli').toMatch(/<Ekran[^>]*ustGuvenliAlan/);
  });

  it('sabit renk yazılmamış', () => {
    expect(sinir, 'koyu temada beyaz sayfa patlar').not.toMatch(/#[0-9a-fA-F]{6}/);
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
