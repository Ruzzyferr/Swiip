import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Sitenin koyu tema tutarlılığı.
 *
 * Bulduğu gerçek kusur: Motor bandı koyu temada arka planını `--yuzey`e çeviriyor ama
 * metin rengi `--zemin` olarak kalıyordu. `--zemin` koyu temada koyu bir renge dönüyor,
 * yani bant siyah üstüne siyah yazıyordu — bölümün tamamı okunmuyordu. Aynı hata karar
 * ağacının kök yongasında da vardı.
 *
 * Kusur tek bir yanlış renkten değil, **çiftin yarısını değiştirmekten** doğuyor. Test de
 * onu arıyor: koyu blokta bir seçicinin arka planı değişiyorsa ve o seçici temel blokta
 * metin rengi de veriyorsa, metin rengi de değişmeli. Tersi de geçerli.
 */

const stil = readFileSync(
  join(import.meta.dirname, '..', '..', '..', 'apps', 'site', 'stil.css'),
  'utf8',
);

/** Tema ile yer değiştiren token'lar. Bunlar açık ve koyu temada farklı anlam taşıyor. */
const DONEN = ['--murekkep', '--zemin', '--yuzey', '--yuzey-ikincil', '--murekkep-yumusak'];

/** Yorumları atar; içindeki süslü parantezler ayrıştırmayı bozuyor. */
function yorumsuz(kaynak: string): string {
  return kaynak.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** `@media (prefers-color-scheme: dark)` bloklarının gövdesini çıkarır. */
function koyuBloklar(kaynak: string): string[] {
  const bloklar: string[] = [];
  const isaret = '@media (prefers-color-scheme: dark)';
  let yer = kaynak.indexOf(isaret);
  while (yer !== -1) {
    const bas = kaynak.indexOf('{', yer);
    let derinlik = 0;
    for (let i = bas; i < kaynak.length; i += 1) {
      if (kaynak[i] === '{') derinlik += 1;
      else if (kaynak[i] === '}') {
        derinlik -= 1;
        if (derinlik === 0) {
          bloklar.push(kaynak.slice(bas + 1, i));
          break;
        }
      }
    }
    yer = kaynak.indexOf(isaret, yer + 1);
  }
  return bloklar;
}

/** Seçici → o seçicinin verdiği özellikler. Aynı seçici birden çok kez geçebilir. */
function kurallar(govde: string): Map<string, Set<string>> {
  const harita = new Map<string, Set<string>>();
  for (const eslesme of govde.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const secici = (eslesme[1] ?? '').trim();
    if (secici === '' || secici.startsWith('@')) continue;
    const ozellikler = harita.get(secici) ?? new Set<string>();
    for (const satir of (eslesme[2] ?? '').split(';')) {
      const ad = satir.split(':')[0]?.trim();
      const deger = satir.slice(satir.indexOf(':') + 1);
      if (!ad) continue;
      // Yalnızca temayla dönen token'lardan gelen değerler ilgilendiriyor.
      if (DONEN.some((t) => deger.includes(`var(${t})`))) ozellikler.add(ad);
    }
    harita.set(secici, ozellikler);
  }
  return harita;
}

const temiz = yorumsuz(stil);
const koyu = koyuBloklar(temiz);
// Temel kurallar: koyu blokların dışında kalan her şey.
const temel = kurallar(koyu.reduce((k, b) => k.replace(b, ''), temiz));
const koyuKurallar = kurallar(koyu.join('\n'));

const ARKA = ['background', 'background-color'];

describe('koyu tema, renk çiftlerini birlikte değiştiriyor', () => {
  it('koyu blokta arka planı değişen seçici metin rengini de değiştiriyor', () => {
    const eksik: string[] = [];
    for (const [secici, ozellikler] of koyuKurallar) {
      const arkaDegisti = ARKA.some((a) => ozellikler.has(a));
      if (!arkaDegisti) continue;
      const temelMetin = temel.get(secici)?.has('color') ?? false;
      if (temelMetin && !ozellikler.has('color')) eksik.push(secici);
    }
    expect(eksik).toEqual([]);
  });

  it('koyu blokta metin rengi değişen seçici arka planı da değiştiriyor', () => {
    const eksik: string[] = [];
    for (const [secici, ozellikler] of koyuKurallar) {
      if (!ozellikler.has('color')) continue;
      const temelArka = ARKA.some((a) => temel.get(secici)?.has(a) ?? false);
      const koyuArka = ARKA.some((a) => ozellikler.has(a));
      if (temelArka && !koyuArka) eksik.push(secici);
    }
    expect(eksik).toEqual([]);
  });

  // Ters dönen yüzeyler tema token'ı kullanamaz; kendi çiftleri var.
  it('bant token’ları iki temada da tanımlı', () => {
    for (const token of ['--bant-zemin', '--bant-metin']) {
      expect(temiz).toContain(`${token}: `);
      expect(koyu.join('\n')).toContain(`${token}: `);
    }
  });

  it('ters zeminli yüzeyler bant token’larını kullanıyor', () => {
    for (const secici of ['.bolum-motor', '.motor-yan', '.dal-kok']) {
      const kural = new RegExp(`\\${secici}\\s*\\{([^}]*)\\}`).exec(temiz)?.[1] ?? '';
      expect(kural).toContain('var(--bant-zemin)');
      expect(kural).not.toContain('var(--zemin)');
    }
  });

  // Testin sessizce boşa dönmesi, koruduğunu sandığımız şeyi korumaması demek olurdu.
  it('gerçekten koyu tema kuralları taranıyor', () => {
    expect(koyu.length).toBeGreaterThan(0);
    expect(koyuKurallar.has(':root')).toBe(true);
    expect(temel.size).toBeGreaterThan(20);
  });
});
