import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Bölgesel fiyatlandırma (F10.3).
 *
 * Fiyatın tek doğruluk kaynağı mağazadır. `magaza.fiyatlariGetir()` RevenueCat'ten
 * kullanıcının ülkesine göre yerelleştirilmiş fiyat dizesini alıyor — ve bu fonksiyon
 * yazılıydı, testi vardı, **ama hiçbir yerden çağrılmıyordu.** Paywall sabit
 * `{fiyat}₺` yazıyordu.
 *
 * Sonucu yalnızca kötü çeviri değil: mağaza dolar tahsil ederken ekranda lira yazması,
 * mağaza kurallarına aykırı bir fiyat beyanı. Ve bu ürünün "ödeme ekranında hiçbir şey
 * gizlenmez" duruşunun tam tersi.
 *
 * Bu, projenin başka yerlerde de avladığı sınıfın aynısı: **tanımlı ama erişilemeyen.**
 * Koç aracında sonucu kötü bir cevaptı; burada yanlış fiyat.
 */

const PAYWALL = join(import.meta.dirname, '..', '..', 'app', 'odeme', 'paywall.tsx');

/**
 * Yorumlar çıkarılır: bu test **kodu** sınıyor, düzyazıyı değil.
 *
 * Yoksa "sabit ₺ ile yazıyordu" diye durumu anlatan bir yorum, testi kendi anlattığı
 * hatayla düşürür — ve bir sonraki kişi yorumu siler, açıklamayı kaybederiz.
 */
const yorumsuz = (metin: string) =>
  metin.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const kaynak = () => yorumsuz(readFileSync(PAYWALL, 'utf8'));

describe('paywall fiyat kaynağı', () => {
  it('plan adı sözlükten geliyor — İngilizce başlık "Basic" derken kart "Temel" diyemez', () => {
    expect(kaynak()).toMatch(/planAdlari\[/);
  });

  it('yenileme tarihi kullanıcının dilinde biçimleniyor', () => {
    expect(kaynak(), "toLocaleDateString('tr-TR') dili yok sayar.").not.toContain('tr-TR');
    expect(kaynak()).toMatch(/tarihMetni\(/);
  });

  it('mağazadan yerelleştirilmiş fiyatları çekiyor', () => {
    expect(
      kaynak(),
      'magaza.fiyatlar() çağrılmıyorsa mağazanın yerelleştirilmiş fiyatı hiç kullanılmaz.',
    ).toMatch(/magaza\.fiyatlar\(\)/);
  });

  it('sabit lira simgesi yazmıyor', () => {
    expect(
      kaynak(),
      'Paywall içinde düz "₺" geçmemeli: fiyat ya mağazadan gelir ya fiyatMetni() ile biçimlenir.',
    ).not.toContain('₺');
  });

  it('yedek fiyatı ortak biçimlendiriciyle yazıyor', () => {
    expect(kaynak()).toMatch(/fiyatMetni\(/);
  });
});

/**
 * Bütçe kademesi göstergesi para simgesi olamaz.
 *
 * Tarif kartlarında maliyet kademesi `'₺'.repeat(kademe)` ile çiziliyordu. Kademe bir
 * fiyat değil, göreli bir pahalılık işareti; lira simgesiyle çizmek onu Türkiye'ye
 * çiviler ve dolarla ödeyen kullanıcıya yanlış para birimi gösterir.
 */
describe('bütçe kademesi göstergesi', () => {
  const ekranlar = ['deste.tsx', 'tarif.tsx', 'plan.tsx'];

  it.each(ekranlar)('%s içinde para simgesi tekrarlanmıyor', (dosya) => {
    const yol = join(import.meta.dirname, '..', '..', 'app', 'ogun', dosya);
    expect(readFileSync(yol, 'utf8')).not.toMatch(/'[₺$€]'\.repeat/);
  });
});
