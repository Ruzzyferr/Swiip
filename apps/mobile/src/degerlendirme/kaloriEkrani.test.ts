import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bugunMu, gelecekMi, gunKaydir, yerelGun } from '@swiip/shared';

/**
 * Kalori ekranının YAZIO paritesi.
 *
 * Kullanıcı bu ekrandan dört şey bekliyor ve dördü de bir kalori takipçisinin varlık
 * sebebi: günlük hedef, bugün alınan kalori ve makrolar, hedefin nasıl hesaplandığı,
 * ve **geçmiş günlere bakabilmek**. Sonuncusu 2026-08-31'e kadar yoktu: ekran
 * yalnızca "Bugün"ü gösteriyor, dünkü kaydına bakmanın hiçbir yolu bulunmuyordu.
 *
 * DÜRÜST SINIR: burası statik tarama + saf mantık testi. Ekran `react-native`
 * çektiği için Node altında içe aktarılamıyor; bu depodaki diğer ekran testleri de
 * aynı sınırla karşılaşıp aynı yolu seçmiş. "Doğru hissettiriyor mu" sorusu
 * emülatörde yanıtlanır ve yanıtlandı.
 */

const EKRAN = join(import.meta.dirname, '..', '..', 'app', '(sekme)', 'beslenme.tsx');

function kod(yol: string): string {
  return readFileSync(yol, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, ' ');
}

const KAYNAK = kod(EKRAN);

describe('gün kaydırma yerel takvimde', () => {
  it('bir gün ileri ve geri', () => {
    expect(gunKaydir('2026-08-31', 1)).toBe('2026-09-01');
    expect(gunKaydir('2026-09-01', -1)).toBe('2026-08-31');
  });

  /** Ay ve yıl taşması: `setDate` bunu kendisi doğru yapıyor, elle hesap yapılmıyor. */
  it('ay ve yıl sınırını doğru geçiyor', () => {
    expect(gunKaydir('2026-12-31', 1)).toBe('2027-01-01');
    expect(gunKaydir('2027-01-01', -1)).toBe('2026-12-31');
    expect(gunKaydir('2028-02-28', 1), 'artık yıl').toBe('2028-02-29');
  });

  it('bugün ve gelecek doğru ayırt ediliyor', () => {
    const bugun = yerelGun();
    expect(bugunMu(bugun)).toBe(true);
    expect(bugunMu(gunKaydir(bugun, -1))).toBe(false);
    expect(gelecekMi(gunKaydir(bugun, 1))).toBe(true);
    expect(gelecekMi(bugun), 'bugün gelecek değil').toBe(false);
    expect(gelecekMi(gunKaydir(bugun, -1))).toBe(false);
  });
});

describe('ekran geçmiş günlere bakabiliyor', () => {
  it('seçili gün bir durum — sabit "bugün" değil', () => {
    expect(
      KAYNAK.includes('const [secilenGun, setSecilenGun] = useState(yerelGun())'),
      'Gün sabitse kullanıcı dünkü kaydına bakamaz; bir kalori defterinin en temel ' +
        'sorusu ("hangi gün ne kadar yedim") cevapsız kalır.',
    ).toBe(true);
  });

  it('ileri ve geri düğmeleri var', () => {
    expect(KAYNAK).toMatch(/gunKaydir\(g, -1\)/);
    expect(KAYNAK).toMatch(/gunKaydir\(g, 1\)/);
  });

  it('geleceğe gidilemiyor', () => {
    expect(
      KAYNAK.includes('disabled={gelecekMi(gunKaydir(secilenGun, 1))}'),
      'Henüz yenmemiş bir öğünü kaydetmek defterin anlamını bozar.',
    ).toBe(true);
  });

  it('bugüne tek dokunuşla dönülüyor', () => {
    expect(KAYNAK).toMatch(/onPress=\{\(\) => setSecilenGun\(yerelGun\(\)\)\}/);
  });
});

describe('kalan kalori gösteriliyor', () => {
  it('hedeften tüketilen çıkarılıyor', () => {
    expect(
      KAYNAK.includes('m.kalanKalori(h.kalori - gun.toplam.kalori)'),
      '"0 / 2231" yarım bir cevap: kullanıcının sorduğu şey "daha ne kadar ' +
        'yiyebilirim". Çıkarmayı kullanıcıya yaptırmak ölçüm gösteren bir arayüzde ' +
        'yapılacak en tuhaf şey.',
    ).toBe(true);
  });

  /** Aşımda sayı eksiye düşmüyor, cümle değişiyor. */
  it('hedef aşıldığında ayrı bir cümle var', () => {
    expect(KAYNAK).toMatch(/m\.asimKalori\(gun\.toplam\.kalori - h\.kalori\)/);
  });
});

describe('kayıtlar öğüne göre gruplanıyor', () => {
  it('gruplama yardımcısı kullanılıyor', () => {
    expect(KAYNAK).toMatch(/ogunGruplari\(gun\.kayitlar\)/);
  });

  it('sıra sabit — kayıt sırasına göre değil', () => {
    expect(
      KAYNAK.includes("const OGUN_SIRASI = ['kahvalti', 'ogle', 'aksam', 'ara'] as const"),
      'Sıra kayıt sırasına göre olursa kullanıcı gününe her baktığında farklı bir ' +
        'düzen görür.',
    ).toBe(true);
  });

  it('öğünsüz kayıtlar düşürülmüyor', () => {
    expect(
      KAYNAK.includes("if (kova.has('')) anahtarlar.push('')"),
      'Öğünü olmayan kayıt listeden düşerse kullanıcının girdiği bir kalori kaybolur.',
    ).toBe(true);
  });

  it('ekleme formunda öğün seçiliyor ve gövdeye giriyor', () => {
    expect(KAYNAK).toMatch(/const \[ogun, setOgun\] = useState<string>\(\(\) => ogunTahmini/);
    expect(
      /portion_id: porsiyon,\s*ogun,/.test(KAYNAK),
      'Öğün seçilip gövdeye konmazsa her kayıt "Öğün seçilmemiş" altına düşer.',
    ).toBe(true);
  });
});
