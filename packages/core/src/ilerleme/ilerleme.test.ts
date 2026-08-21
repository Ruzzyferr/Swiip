import { describe, expect, it } from 'vitest';
import type { IlerlemeDurumu } from '@swiip/shared';
import { hareketBul } from '../katalog/katalog';
import { deloadAraligi, deloadGerekli, ilerlemeUygula, TEKRAR_TAVANI } from './ilerleme';

const bench = hareketBul('barbell-bench-press')!;
const lat = hareketBul('lat-pulldown')!;

function durumKur(uzat: Partial<IlerlemeDurumu> = {}): IlerlemeDurumu {
  return {
    hareket_id: 'barbell-bench-press',
    mevcut_kg: 50,
    mevcut_tekrar: 12,
    ustuste_basari: 0,
    ustuste_zorlanma: 0,
    e1rm: 70,
    ...uzat,
  };
}

const temelGirdi = {
  durum: durumKur(),
  hareket: bench,
  agri: false,
  hafta: 2,
  toparlanmaSkoru: 0.8,
  tekrarAlt: 8,
  tekrarUst: 12,
  set: 4,
};

describe('ilerlemeUygula — tamamladım', () => {
  it('hedef tekrarı tamamlayan kullanıcıda ağırlık bir adım artar', () => {
    const sonuc = ilerlemeUygula({ ...temelGirdi, sonuc: 'tamamladim' });

    expect(sonuc.durum.mevcut_kg).toBe(52.5);
    expect(sonuc.durum.ustuste_basari).toBe(1);
    expect(sonuc.durum.ustuste_zorlanma).toBe(0);
  });

  it('artış adımı harekete göre değişir', () => {
    const squat = hareketBul('barbell-squat')!;
    const sonuc = ilerlemeUygula({
      ...temelGirdi,
      hareket: squat,
      durum: durumKur({ hareket_id: 'barbell-squat', mevcut_kg: 80 }),
      sonuc: 'tamamladim',
    });

    expect(sonuc.durum.mevcut_kg).toBe(85);
  });

  it('e1RM tahmini güncellenir', () => {
    const sonuc = ilerlemeUygula({ ...temelGirdi, sonuc: 'tamamladim' });

    expect(sonuc.durum.e1rm).toBeGreaterThan(temelGirdi.durum.e1rm);
  });

  it('kullanıcıya gösterilecek mesaj yeni ağırlığı söyler', () => {
    const sonuc = ilerlemeUygula({ ...temelGirdi, sonuc: 'tamamladim' });

    expect(sonuc.mesaj).toContain('52,5');
  });

  it('vücut ağırlığı hareketinde ağırlık değil tekrar hedefi artar', () => {
    const sinav = hareketBul('sinav')!;
    const sonuc = ilerlemeUygula({
      ...temelGirdi,
      hareket: sinav,
      durum: durumKur({ hareket_id: 'sinav', mevcut_kg: 0, mevcut_tekrar: 12 }),
      sonuc: 'tamamladim',
    });

    expect(sonuc.durum.mevcut_kg).toBe(0);
    expect(sonuc.durum.mevcut_tekrar).toBeGreaterThan(12);
  });
});

describe('ilerlemeUygula — zorlandım', () => {
  it('ağırlık sabit kalır', () => {
    const sonuc = ilerlemeUygula({ ...temelGirdi, sonuc: 'zorlandim' });

    expect(sonuc.durum.mevcut_kg).toBe(50);
    expect(sonuc.durum.ustuste_zorlanma).toBe(1);
    expect(sonuc.set_degisimi).toBe(0);
  });

  it('iki hafta üst üste zorlanmada hacim bir set düşer', () => {
    const sonuc = ilerlemeUygula({
      ...temelGirdi,
      hareket: lat,
      durum: durumKur({ hareket_id: 'lat-pulldown', ustuste_zorlanma: 1 }),
      sonuc: 'zorlandim',
    });

    expect(sonuc.set_degisimi).toBe(-1);
    expect(sonuc.mesaj).toContain('set');
  });

  it('bir kez başarı zorlanma sayacını sıfırlar', () => {
    const sonuc = ilerlemeUygula({
      ...temelGirdi,
      durum: durumKur({ ustuste_zorlanma: 1 }),
      sonuc: 'tamamladim',
    });

    expect(sonuc.durum.ustuste_zorlanma).toBe(0);
  });
});

describe('ilerlemeUygula — yapamadım', () => {
  it('ağırlık düşürülür', () => {
    const sonuc = ilerlemeUygula({ ...temelGirdi, sonuc: 'yapamadim' });

    expect(sonuc.durum.mevcut_kg).toBeLessThan(50);
    expect(sonuc.durum.ustuste_basari).toBe(0);
  });

  it('düşürülen ağırlık artış adımına yuvarlanır', () => {
    const sonuc = ilerlemeUygula({ ...temelGirdi, sonuc: 'yapamadim' });

    expect((sonuc.durum.mevcut_kg * 10) % 25).toBe(0);
  });

  it('boş barın altına inilmez', () => {
    const sonuc = ilerlemeUygula({
      ...temelGirdi,
      durum: durumKur({ mevcut_kg: 20 }),
      sonuc: 'yapamadim',
    });

    expect(sonuc.durum.mevcut_kg).toBe(20);
  });

  it('üst üste yapamamada deload tetiklenir', () => {
    const sonuc = ilerlemeUygula({
      ...temelGirdi,
      durum: durumKur({ ustuste_zorlanma: 2 }),
      sonuc: 'yapamadim',
    });

    expect(sonuc.deload).toBe(true);
  });
});

describe('ilerlemeUygula — ağrı bildirimi', () => {
  it('ağrı bildirildiğinde ağırlık artmaz, düşer', () => {
    const sonuc = ilerlemeUygula({ ...temelGirdi, sonuc: 'tamamladim', agri: true });

    expect(sonuc.durum.mevcut_kg).toBeLessThan(50);
  });

  it('ağrı hareket değişikliği önerisi doğurur', () => {
    const sonuc = ilerlemeUygula({ ...temelGirdi, sonuc: 'zorlandim', agri: true });

    expect(sonuc.hareket_degistir).toBe(true);
    expect(sonuc.mesaj.toLowerCase()).toContain('ağrı');
  });

  it('ağrı kararı izlenebilir kural bırakır', () => {
    const sonuc = ilerlemeUygula({ ...temelGirdi, sonuc: 'tamamladim', agri: true });

    expect(sonuc.karar.kurallar).toContain('agri_bildirimi');
    expect(sonuc.karar.entity_tipi).toBe('ilerleme');
  });

  it('ağrıda tanı dili kullanılmaz', () => {
    const sonuc = ilerlemeUygula({ ...temelGirdi, sonuc: 'zorlandim', agri: true });

    for (const yasak of ['fıtık', 'tendinit', 'yırtık', 'hastalık', 'teşhis']) {
      expect(sonuc.mesaj.toLowerCase()).not.toContain(yasak);
    }
  });
});

describe('deloadAraligi', () => {
  it('iyi toparlanan kullanıcıda aralık uzundur', () => {
    expect(deloadAraligi(0.85)).toBe(6);
  });

  it('kötü toparlanan kullanıcıda aralık kısalır', () => {
    expect(deloadAraligi(0.35)).toBe(4);
  });

  it('aralık her zaman 4 ile 6 hafta arasındadır', () => {
    for (const skor of [0, 0.25, 0.5, 0.75, 1]) {
      expect(deloadAraligi(skor)).toBeGreaterThanOrEqual(4);
      expect(deloadAraligi(skor)).toBeLessThanOrEqual(6);
    }
  });
});

describe('deloadGerekli', () => {
  it('aralık dolduğunda deload gerekir', () => {
    expect(
      deloadGerekli({ hafta: 7, sonDeloadHafta: 1, toparlanmaSkoru: 0.85, ustusteZorlanma: 0 }),
    ).toBe(true);
  });

  it('aralık dolmadıysa gerekmez', () => {
    expect(
      deloadGerekli({ hafta: 4, sonDeloadHafta: 1, toparlanmaSkoru: 0.85, ustusteZorlanma: 0 }),
    ).toBe(false);
  });

  it('yorgunluk sinyali aralığı beklemeden tetikler', () => {
    expect(
      deloadGerekli({ hafta: 3, sonDeloadHafta: 1, toparlanmaSkoru: 0.85, ustusteZorlanma: 3 }),
    ).toBe(true);
  });

  it('hiç deload yapılmamışsa ilk hafta referans alınır', () => {
    expect(deloadGerekli({ hafta: 6, toparlanmaSkoru: 0.5, ustusteZorlanma: 0 })).toBe(true);
    expect(deloadGerekli({ hafta: 3, toparlanmaSkoru: 0.5, ustusteZorlanma: 0 })).toBe(false);
  });
});

describe('ilerlemeUygula — deload uygulaması', () => {
  it('deload haftasında ağırlık ve hacim düşer', () => {
    const sonuc = ilerlemeUygula({
      ...temelGirdi,
      hafta: 7,
      durum: durumKur({ son_deload_hafta: 1 }),
      sonuc: 'tamamladim',
      toparlanmaSkoru: 0.85,
    });

    expect(sonuc.deload).toBe(true);
    expect(sonuc.durum.mevcut_kg).toBeLessThan(50);
    expect(sonuc.set_degisimi).toBeLessThan(0);
    expect(sonuc.durum.son_deload_hafta).toBe(7);
  });

  it('deload mesajı neden yapıldığını açıklar', () => {
    const sonuc = ilerlemeUygula({
      ...temelGirdi,
      hafta: 7,
      durum: durumKur({ son_deload_hafta: 1 }),
      sonuc: 'tamamladim',
    });

    expect(sonuc.mesaj.toLowerCase()).toContain('hafif');
    expect(sonuc.karar.kurallar).toContain('deload');
  });
});

describe('ilerlemeUygula — determinizm', () => {
  it('aynı girdi aynı sonucu verir', () => {
    const girdi = { ...temelGirdi, sonuc: 'zorlandim' as const };
    expect(JSON.stringify(ilerlemeUygula(girdi))).toBe(JSON.stringify(ilerlemeUygula(girdi)));
  });
});

describe('vücut ağırlığı hareketlerinde tekrar tavanı', () => {
  const sinav = {
    ...hareketBul('sinav')!,
    vucut_agirligi: true,
  };

  const durumKur = (tekrar: number): IlerlemeDurumu => ({
    hareket_id: 'sinav',
    mevcut_kg: 0,
    mevcut_tekrar: tekrar,
    e1rm: 0,
    ustuste_basari: 0,
    ustuste_zorlanma: 0,
  });

  const ilerle = (tekrar: number) =>
    ilerlemeUygula({
      durum: durumKur(tekrar),
      hareket: sinav,
      sonuc: 'tamamladim',
      agri: false,
      hafta: 3,
      toparlanmaSkoru: 0.8,
      tekrarAlt: 8,
      tekrarUst: 12,
      set: 3,
    });

  it('tavanın altında tekrar hedefi artar', () => {
    expect(ilerle(10).durum.mevcut_tekrar).toBe(12);
  });

  /**
   * Tekrar sınırsız artarsa program bir noktada dayanıklılık antrenmanına dönüşür:
   * kırk tekrar şınav kas kazandırmaz, zaman harcatır. Doğru cevap daha çok tekrar
   * değil, daha zor varyasyon.
   */
  it('tavana ulaşınca tekrar sonsuza kadar artmaz', () => {
    expect(ilerle(TEKRAR_TAVANI).durum.mevcut_tekrar).toBeLessThanOrEqual(TEKRAR_TAVANI);
  });

  it('tavana ulaşınca daha zor varyasyon öneriliyor', () => {
    const sonuc = ilerle(TEKRAR_TAVANI);

    expect(sonuc.hareket_degistir).toBe(true);
    expect(sonuc.karar.kurallar).toContain('tekrar_tavani');
  });

  it('öneri gerekçesiyle birlikte anlatılıyor', () => {
    const sonuc = ilerle(TEKRAR_TAVANI);

    expect(sonuc.mesaj.toLocaleLowerCase('tr-TR')).toContain('zor');
  });

  it('tavan makul bir aralıkta', () => {
    expect(TEKRAR_TAVANI).toBeGreaterThanOrEqual(15);
    expect(TEKRAR_TAVANI).toBeLessThanOrEqual(30);
  });

  it('yüklenebilen harekette tavan uygulanmaz', () => {
    const barbell = { ...hareketBul('barbell-squat')!, vucut_agirligi: false };

    const sonuc = ilerlemeUygula({
      durum: {
        hareket_id: 'barbell-squat',
        mevcut_kg: 100,
        mevcut_tekrar: TEKRAR_TAVANI,
        e1rm: 120,
        ustuste_basari: 0,
        ustuste_zorlanma: 0,
      },
      hareket: barbell,
      sonuc: 'tamamladim',
      agri: false,
      hafta: 3,
      toparlanmaSkoru: 0.8,
      tekrarAlt: 5,
      tekrarUst: 8,
      set: 3,
    });

    expect(sonuc.karar.kurallar).not.toContain('tekrar_tavani');
  });
});
