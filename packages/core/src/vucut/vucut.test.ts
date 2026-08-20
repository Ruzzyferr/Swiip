import { describe, expect, it } from 'vitest';
import {
  belBoyOrani,
  DURUS_ETIKETLERI,
  navyYagOrani,
  vucutRaporuUret,
  yagOraniAralik,
} from './vucut';

describe('navyYagOrani', () => {
  it('erkek ölçülerinden yağ oranı hesaplar', () => {
    const oran = navyYagOrani({ cinsiyet: 'erkek', boyCm: 178, boyunCm: 38, belCm: 85 });

    expect(oran).toBeGreaterThan(12);
    expect(oran).toBeLessThan(24);
  });

  it('kadın formülü kalça ölçüsü ister', () => {
    const oran = navyYagOrani({
      cinsiyet: 'kadin',
      boyCm: 165,
      boyunCm: 32,
      belCm: 72,
      kalcaCm: 98,
    });

    expect(oran).toBeGreaterThan(18);
    expect(oran).toBeLessThan(35);
  });

  it('kadında kalça ölçüsü yoksa hesaplamaz', () => {
    expect(navyYagOrani({ cinsiyet: 'kadin', boyCm: 165, boyunCm: 32, belCm: 72 })).toBeUndefined();
  });

  it('bel boyundan büyük değilse hesaplamaz', () => {
    expect(navyYagOrani({ cinsiyet: 'erkek', boyCm: 178, boyunCm: 90, belCm: 85 })).toBeUndefined();
  });

  it('bel arttıkça yağ oranı artar', () => {
    const ince = navyYagOrani({ cinsiyet: 'erkek', boyCm: 178, boyunCm: 38, belCm: 78 })!;
    const kalin = navyYagOrani({ cinsiyet: 'erkek', boyCm: 178, boyunCm: 38, belCm: 100 })!;

    expect(kalin).toBeGreaterThan(ince);
  });

  it('fizyolojik sınırların dışına çıkmaz', () => {
    const uc = navyYagOrani({ cinsiyet: 'erkek', boyCm: 150, boyunCm: 30, belCm: 160 })!;

    expect(uc).toBeLessThanOrEqual(60);
    expect(uc).toBeGreaterThanOrEqual(3);
  });
});

describe('yagOraniAralik', () => {
  it('tek sayı değil aralık döner', () => {
    const aralik = yagOraniAralik({ gorselTahmin: 18 })!;

    expect(aralik.ust - aralik.alt).toBeGreaterThanOrEqual(6);
    expect(aralik.alt).toBeLessThan(18);
    expect(aralik.ust).toBeGreaterThan(18);
  });

  it('ölçüyle çapraz doğrulama aralığı daraltır', () => {
    const yalniz = yagOraniAralik({ gorselTahmin: 18 })!;
    const capraz = yagOraniAralik({ gorselTahmin: 18, navyTahmin: 18.5 })!;

    expect(capraz.ust - capraz.alt).toBeLessThan(yalniz.ust - yalniz.alt);
  });

  it('iki yöntem çeliştiğinde aralık genişler', () => {
    const uyumlu = yagOraniAralik({ gorselTahmin: 18, navyTahmin: 18.5 })!;
    const celiskili = yagOraniAralik({ gorselTahmin: 18, navyTahmin: 28 })!;

    expect(celiskili.ust - celiskili.alt).toBeGreaterThan(uyumlu.ust - uyumlu.alt);
  });

  it('yalnızca ölçüyle de aralık üretir', () => {
    const aralik = yagOraniAralik({ navyTahmin: 22 })!;

    expect(aralik.alt).toBeLessThan(22);
    expect(aralik.ust).toBeGreaterThan(22);
  });

  it('hiç veri yoksa aralık üretmez', () => {
    expect(yagOraniAralik({})).toBeUndefined();
  });

  it('negatif alt sınır üretmez', () => {
    const aralik = yagOraniAralik({ gorselTahmin: 4 })!;

    expect(aralik.alt).toBeGreaterThanOrEqual(3);
  });

  it('aralık tam sayıya yuvarlanır — sahte hassasiyet yok', () => {
    const aralik = yagOraniAralik({ gorselTahmin: 18.37, navyTahmin: 19.62 })!;

    expect(Number.isInteger(aralik.alt)).toBe(true);
    expect(Number.isInteger(aralik.ust)).toBe(true);
  });
});

describe('belBoyOrani', () => {
  it('oranı hesaplar', () => {
    expect(belBoyOrani(85, 170).oran).toBeCloseTo(0.5, 2);
  });

  it('0,5 üstünde uyarı verir', () => {
    expect(belBoyOrani(95, 170).uyari).toBe(true);
  });

  it('0,5 altında uyarı vermez', () => {
    expect(belBoyOrani(78, 178).uyari).toBe(false);
  });

  it('uyarı metni tanı dili kullanmaz', () => {
    const sonuc = belBoyOrani(100, 170);

    expect(sonuc.mesaj.toLowerCase()).not.toContain('obez');
    expect(sonuc.mesaj.toLowerCase()).not.toContain('hasta');
    expect(sonuc.mesaj.length).toBeGreaterThan(30);
  });
});

describe('vucutRaporuUret', () => {
  const temelGirdi = {
    cinsiyet: 'erkek' as const,
    yas: 30,
    boyCm: 178,
    kiloKg: 82,
    olculer: { bel_cm: 85, boyun_cm: 38, kalca_cm: 98 },
  };

  it('fotoğraf olmadan ölçülerle rapor üretir', () => {
    const rapor = vucutRaporuUret(temelGirdi);

    expect(rapor.yag_orani).toBeDefined();
    expect(rapor.yontem).toBe('olcu');
  });

  it('görsel analizle birlikte yöntem çapraz olur', () => {
    const rapor = vucutRaporuUret({
      ...temelGirdi,
      gorsel: { yagOrani: 19, kasDagilimi: { gogus: 3, sirt: 2 }, durusBayraklari: [] },
    });

    expect(rapor.yontem).toBe('capraz');
  });

  it('hiçbir çıktıda tek sayı olarak yağ oranı sunulmaz', () => {
    const rapor = vucutRaporuUret(temelGirdi);

    expect(rapor.ozet).toMatch(/%\d+-\d+/);
  });

  it('duruş bulguları eğilim dilinde yazılır', () => {
    const rapor = vucutRaporuUret({
      ...temelGirdi,
      gorsel: {
        yagOrani: 19,
        kasDagilimi: {},
        durusBayraklari: ['omuz_protraksiyonu', 'bas_one'],
      },
    });

    for (const satir of rapor.durus) {
      expect(satir).toMatch(/eğilim|görünüyor|olabilir/);
    }
  });

  it('duruş bulgusunda tanı kelimesi geçmez', () => {
    const rapor = vucutRaporuUret({
      ...temelGirdi,
      gorsel: { yagOrani: 19, kasDagilimi: {}, durusBayraklari: ['pelvik_egim'] },
    });

    const metin = rapor.durus.join(' ').toLowerCase();
    for (const yasak of ['kifoz', 'lordoz', 'skolyoz', 'tanı', 'hastalık', 'bozukluk']) {
      expect(metin).not.toContain(yasak);
    }
  });

  it('her duruş bayrağının Türkçe eğilim karşılığı vardır', () => {
    for (const bayrak of Object.keys(DURUS_ETIKETLERI)) {
      expect(DURUS_ETIKETLERI[bayrak]!.length).toBeGreaterThan(20);
    }
  });

  it('rapor tıbbi cihaz olmadığını belirtir', () => {
    expect(vucutRaporuUret(temelGirdi).feragat).toContain('tıbbi cihaz');
  });

  it('ölçü de fotoğraf da yoksa rapor yine üretilir ama sınırlı olur', () => {
    const rapor = vucutRaporuUret({ cinsiyet: 'erkek', yas: 30, boyCm: 178, kiloKg: 82 });

    expect(rapor.yag_orani).toBeUndefined();
    expect(rapor.sinirlamalar.length).toBeGreaterThan(0);
  });

  it('fotoğrafsız akışta kullanıcı bilgilendirilir', () => {
    const rapor = vucutRaporuUret(temelGirdi);

    expect(rapor.sinirlamalar.join(' ')).toContain('fotoğraf');
  });

  it('aynı girdi aynı raporu üretir', () => {
    expect(JSON.stringify(vucutRaporuUret(temelGirdi))).toBe(
      JSON.stringify(vucutRaporuUret(temelGirdi)),
    );
  });

  it('rapor hiçbir yerde fotoğrafın kendisini taşımaz', () => {
    const rapor = vucutRaporuUret({
      ...temelGirdi,
      gorsel: { yagOrani: 19, kasDagilimi: {}, durusBayraklari: [] },
    });

    expect(JSON.stringify(rapor)).not.toMatch(/base64|data:image|photo|foto_veri/i);
  });
});

/**
 * Raporun dilden bağımsız izi.
 *
 * Vücut analizi raporu ücretsiz planın teslim ettiği tek çıktı, yani ürünün ilk izlenimi.
 * Cümleler motorda sabitken bu izlenim yalnızca Türkçe kullanıcıya veriliyordu.
 *
 * Gerekçe katmanında olduğu gibi: motor **kod** üretir, cümle sözlükte kurulur. Türkçe
 * metinler yerinde kalıyor — karar izi onlar ve çeviremediğimiz yerde yedek onlar.
 */
describe('vücut raporu dilden bağımsız kodlar taşıyor', () => {
  const girdi = {
    cinsiyet: 'erkek' as const,
    yas: 30,
    boyCm: 178,
    kiloKg: 82,
    olculer: { bel_cm: 92, boyun_cm: 39 },
    gorsel: {
      yagOrani: 19,
      kasDagilimi: { gogus: 3, sirt: 4 },
      durusBayraklari: ['omuz_protraksiyonu', 'bas_one'],
    },
  };

  it('duruş bayrakları kod olarak taşınıyor', () => {
    const rapor = vucutRaporuUret(girdi);

    expect(rapor.durus_bayraklari).toEqual(['omuz_protraksiyonu', 'bas_one']);
  });

  it('sınırlama gerekçeleri kod olarak taşınıyor', () => {
    const rapor = vucutRaporuUret({ cinsiyet: 'kadin', yas: 28, boyCm: 165, kiloKg: 60 });

    expect(rapor.sinirlama_kodlari).toContain('fotograf_yok');
    expect(rapor.sinirlama_kodlari).toContain('olcu_yok');
  });

  it('özet, cümleyi kurmaya yetecek parametreleri taşıyor', () => {
    const rapor = vucutRaporuUret(girdi);

    expect(rapor.ozet_parametreleri).toBeDefined();
    expect(rapor.ozet_parametreleri!.kaynak).toBe('capraz');
    expect(rapor.ozet_parametreleri!.alt).toBeGreaterThan(0);
    expect(rapor.ozet_parametreleri!.ust).toBeGreaterThan(0);
    expect(rapor.ozet_parametreleri!.kiloKg).toBe(82);
  });

  it('veri yetersizse özet parametresi yok — cümle uydurulmaz', () => {
    const rapor = vucutRaporuUret({ cinsiyet: 'kadin', yas: 28, boyCm: 165, kiloKg: 60 });

    expect(rapor.ozet_parametreleri).toBeUndefined();
  });

  it('bel/boy uyarısı boolean olarak zaten taşınıyor', () => {
    const rapor = vucutRaporuUret(girdi);

    expect(typeof rapor.bel_boy!.uyari).toBe('boolean');
  });

  /** Türkçe metinler kaybolmuyor: kayıt onlar ve çeviremediğimiz yerde yedek onlar. */
  it('Türkçe metinler korunuyor', () => {
    const rapor = vucutRaporuUret(girdi);

    expect(rapor.ozet.length).toBeGreaterThan(20);
    expect(rapor.durus.length).toBe(2);
    expect(rapor.feragat.length).toBeGreaterThan(20);
  });
});
