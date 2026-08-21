import { describe, expect, it } from 'vitest';
import { SORU_BANKASI } from '@swiip/shared';
import type { Cevaplar } from '../cevaplar';
import {
  blokIlerlemesi,
  cevabiDogrula,
  gorunurSorular,
  sonrakiSoru,
  tekrarAnahtari,
  toplamSoruSayisi,
} from './motor';

/** Sıradaki soruyu cevaplayarak akışı sonuna kadar yürütür. */
/**
 * Bir bloğun tüm sorularını GEÇERLİ cevaplarla doldurur.
 *
 * Daha önce her soruya `'x'` yazılıyordu ve motor bunu kabul ediyordu. Artık geçersiz
 * cevap, cevap sayılmıyor: yer tutucu değerler bloğu tamamlanmış göstermiyor. Testin
 * ölçtüğü şey değişmedi, verisi gerçekçi oldu.
 */
function blogunuDoldur(blokId: string): Cevaplar {
  const cevaplar: Cevaplar = {};
  for (const soru of gorunurSorular({})) {
    if (soru.blok_id === blokId) cevaplar[soru.id] = ornekCevap(soru);
  }
  return cevaplar;
}

function akisiTamamla(): { cevaplar: Cevaplar; adim: number } {
  const cevaplar: Cevaplar = {};
  let adim = 0;

  for (let soru = sonrakiSoru(cevaplar); soru !== undefined; soru = sonrakiSoru(cevaplar)) {
    cevaplar[soru.id] = ornekCevap(soru);
    adim += 1;
    if (adim > 500) throw new Error(`akış sonlanmadı, takıldığı soru: ${soru.id}`);
  }

  return { cevaplar, adim };
}

function ornekCevap(soru: { type: string; options?: string[]; regions?: string[]; min?: number }) {
  if (soru.options && soru.options.length > 0) return soru.options[0]!;
  if (soru.regions && soru.regions.length > 0) return [soru.regions[0]!];
  switch (soru.type) {
    case 'number':
    case 'scale':
      return soru.min ?? 1;
    case 'date':
      return '1990-05-10';
    case 'consent':
      return true;
    case 'multi':
      return ['x'];
    default:
      return 'x';
  }
}

describe('soru bankası bütünlüğü', () => {
  it('10 blok içerir', () => {
    expect(SORU_BANKASI.blocks).toHaveLength(10);
  });

  it('her sorunun bir sürücüsü vardır', () => {
    for (const blok of SORU_BANKASI.blocks) {
      for (const soru of blok.questions) {
        expect(soru.drives.length, `${soru.id} sürücüsüz`).toBeGreaterThan(0);
      }
    }
  });

  it('bloklar sıra numarasıyla gelir', () => {
    const siralar = SORU_BANKASI.blocks.map((b) => b.order);
    expect(siralar).toEqual([...siralar].sort((a, b) => a - b));
  });
});

describe('gorunurSorular — dallanma', () => {
  it('cevap yokken yalnızca koşulsuz sorular görünür', () => {
    const gorunur = gorunurSorular({}).map((s) => s.id);

    expect(gorunur).toContain('K1');
    expect(gorunur).not.toContain('K8a');
    expect(gorunur).not.toContain('S1a');
  });

  it('branch tetiklenince bağlı sorular görünür olur', () => {
    const gorunur = gorunurSorular({ K8: 'Evet' }).map((s) => s.id);

    expect(gorunur).toContain('K8a');
  });

  it('branch geri alınınca soru tekrar gizlenir', () => {
    expect(gorunurSorular({ K8: 'Hayır' }).map((s) => s.id)).not.toContain('K8a');
  });

  it('_notYok anahtarı "Yok" dışındaki her cevapta tetiklenir', () => {
    expect(gorunurSorular({ H4: 'Düğün' }).map((s) => s.id)).toContain('H4a');
    expect(gorunurSorular({ H4: 'Yok' }).map((s) => s.id)).not.toContain('H4a');
  });

  it('çoklu seçimde her seçim kendi dalını açar', () => {
    const gorunur = gorunurSorular({ S4: ['Diyabet', 'Astım / KOAH'] }).map((s) => s.id);

    expect(gorunur).toContain('S14');
    expect(gorunur).toContain('S16');
  });

  it('conditionalOn başka sorunun cevabına bakar', () => {
    expect(gorunurSorular({ K2: 'Kadın' }).map((s) => s.id)).toContain('S20');
    expect(gorunurSorular({ K2: 'Erkek' }).map((s) => s.id)).not.toContain('S20');
  });

  it('_bos koşulu cevap verilmediğinde tetiklenir', () => {
    expect(gorunurSorular({}).map((s) => s.id)).toContain('A6');
    expect(gorunurSorular({ 'A5:Squat': { kg: 100, tekrar: 5 } }).map((s) => s.id)).not.toContain(
      'A6',
    );
  });

  it('ev seçildiğinde ev soruları, salon soruları değil', () => {
    const ev = gorunurSorular({ E1: 'Ev' }).map((s) => s.id);

    expect(ev).toContain('E5');
    expect(ev).toContain('E5a');
    expect(ev).toContain('E6');
    expect(ev).not.toContain('E2');
  });

  it('karma seçiminde hem ev hem salon soruları görünür', () => {
    const karma = gorunurSorular({ E1: 'Karma' }).map((s) => s.id);

    expect(karma).toContain('E2');
    expect(karma).toContain('E5');
  });

  it('vücut haritasında işaretlenen her bölge için soru seti tekrarlanır', () => {
    const gorunur = gorunurSorular({ S6: 'Evet', S8: ['bel', 'diz_sag'] }).map((s) => s.id);

    expect(gorunur).toContain('S9:bel');
    expect(gorunur).toContain('S11:bel');
    expect(gorunur).toContain('S9:diz_sag');
    expect(gorunur).toContain('S11:diz_sag');
  });

  it('bölge işaretlenmezse tekrar soruları çıkmaz', () => {
    const gorunur = gorunurSorular({ S6: 'Evet', S8: [] }).map((s) => s.id);

    expect(gorunur.some((id) => id.startsWith('S9:'))).toBe(false);
  });

  it('repeatFor her kalem için ayrı soru üretir', () => {
    const gorunur = gorunurSorular({}).map((s) => s.id);

    expect(gorunur).toContain('A8:Squat');
    expect(gorunur).toContain('A8:Barfiks');
    expect(gorunur).not.toContain('A8');
  });

  it('görünür soru listesi deterministiktir', () => {
    const cevaplar: Cevaplar = { E1: 'Karma', S6: 'Evet', S8: ['bel'] };
    expect(gorunurSorular(cevaplar).map((s) => s.id)).toEqual(
      gorunurSorular(cevaplar).map((s) => s.id),
    );
  });
});

describe('sonrakiSoru', () => {
  it('hiç cevap yokken ilk soruyu verir', () => {
    expect(sonrakiSoru({})?.id).toBe('K1');
  });

  it('cevaplanan soruyu atlar', () => {
    expect(sonrakiSoru({ K1: '1990-01-01' })?.id).toBe('K2');
  });

  it('yeni açılan koşullu soruyu sırasında verir', () => {
    const cevaplar: Cevaplar = {};
    for (const soru of gorunurSorular({})) {
      if (soru.id === 'K8') break;
      cevaplar[soru.id] = ornekCevap(soru);
    }
    cevaplar['K8'] = 'Evet';

    expect(sonrakiSoru(cevaplar)?.id).toBe('K8a');
  });

  it('cevaplandıkça açılan dallarla birlikte akış sonlanır', () => {
    const { cevaplar, adim } = akisiTamamla();

    expect(sonrakiSoru(cevaplar)).toBeUndefined();
    // Dallanma yakınsamalı: sonsuz döngü olmamalı.
    expect(adim).toBeLessThan(400);
  });

  it('cevap vermek yeni dal açtığında akış uzar', () => {
    const kisa = gorunurSorular({ H4: 'Yok' }).length;
    const uzun = gorunurSorular({ H4: 'Düğün' }).length;

    expect(uzun).toBeGreaterThan(kisa);
  });

  it('isteğe bağlı soru atlanabilir ve akış durmaz', () => {
    // Değerler gerçekçi: geçersiz bir cevap artık cevap sayılmıyor ve soru geri geliyor.
    const cevaplar: Cevaplar = {
      K1: '1990-05-10',
      K2: 'Erkek',
      K3: 178,
      K4: 82,
      K5: 'Bugün',
    };

    expect(sonrakiSoru(cevaplar)?.id).toBe('K6');
  });
});

describe('blokIlerlemesi', () => {
  it('cevap yokken ilk blokta ve sıfır ilerlemededir', () => {
    const ilerleme = blokIlerlemesi({});

    expect(ilerleme.blok_id).toBe('K');
    expect(ilerleme.cevaplanan).toBe(0);
    expect(ilerleme.toplam).toBeGreaterThan(0);
  });

  it('bir blok bitince sonraki bloğa geçer', () => {
    const cevaplar = blogunuDoldur('K');

    expect(blokIlerlemesi(cevaplar).blok_id).toBe('H');
  });

  it('yüzde ilerleme 0 ile 100 arasındadır', () => {
    const ilerleme = blokIlerlemesi({ K1: '1990-05-10' });

    expect(ilerleme.yuzde).toBeGreaterThanOrEqual(0);
    expect(ilerleme.yuzde).toBeLessThanOrEqual(100);
  });

  it('tamamlanan blokları listeler', () => {
    const cevaplar = blogunuDoldur('K');

    expect(blokIlerlemesi(cevaplar).tamamlanan_bloklar).toContain('K');
  });

  it('akış bitince tamamlandı olur ve tüm bloklar işaretlenir', () => {
    const { cevaplar } = akisiTamamla();
    const ilerleme = blokIlerlemesi(cevaplar);

    expect(ilerleme.tamamlandi).toBe(true);
    expect(ilerleme.yuzde).toBe(100);
    expect(ilerleme.tamamlanan_bloklar).toHaveLength(10);
  });
});

describe('cevabiDogrula', () => {
  const soruBul = (id: string) =>
    SORU_BANKASI.blocks.flatMap((b) => b.questions).find((q) => q.id === id)!;

  it('sayı sınırlarının dışını reddeder', () => {
    expect(cevabiDogrula(soruBul('K3'), 250).gecerli).toBe(false);
    expect(cevabiDogrula(soruBul('K3'), 178).gecerli).toBe(true);
  });

  it('seçenek dışı cevabı reddeder', () => {
    expect(cevabiDogrula(soruBul('K2'), 'Belirtmek istemiyorum').gecerli).toBe(false);
    expect(cevabiDogrula(soruBul('K2'), 'Kadın').gecerli).toBe(true);
  });

  it('çoklu seçimde her kalemi kontrol eder', () => {
    expect(cevabiDogrula(soruBul('S17'), ['Bel fıtığı', 'Uydurma']).gecerli).toBe(false);
    expect(cevabiDogrula(soruBul('S17'), ['Bel fıtığı']).gecerli).toBe(true);
  });

  it('zorunlu soruda boş cevabı reddeder', () => {
    expect(cevabiDogrula(soruBul('K7'), null).gecerli).toBe(false);
  });

  it('isteğe bağlı soruda boş cevabı kabul eder', () => {
    expect(cevabiDogrula(soruBul('H3'), null).gecerli).toBe(true);
  });

  it('ölçek sınırlarını uygular', () => {
    expect(cevabiDogrula(soruBul('Y6'), 11).gecerli).toBe(false);
    expect(cevabiDogrula(soruBul('Y6'), 7).gecerli).toBe(true);
  });

  it('geçersiz tarihi reddeder', () => {
    expect(cevabiDogrula(soruBul('K1'), '32-13-1990').gecerli).toBe(false);
    expect(cevabiDogrula(soruBul('K1'), '1990-05-10').gecerli).toBe(true);
  });

  it('gelecek doğum tarihini reddeder', () => {
    expect(cevabiDogrula(soruBul('K1'), '2099-01-01').gecerli).toBe(false);
  });

  it('hata mesajı Türkçe ve açıklayıcıdır', () => {
    const sonuc = cevabiDogrula(soruBul('K3'), 250);

    expect(sonuc.mesaj).toBeDefined();
    expect(sonuc.mesaj!.length).toBeGreaterThan(10);
  });

  it('bodymap seçim sınırını uygular', () => {
    expect(cevabiDogrula(soruBul('H6'), ['gogus', 'sirt', 'omuz', 'kol']).gecerli).toBe(false);
    expect(cevabiDogrula(soruBul('H6'), ['gogus', 'sirt']).gecerli).toBe(true);
  });

  it('bodymap bölge listesini doğrular', () => {
    expect(cevabiDogrula(soruBul('H6'), ['kuyruk']).gecerli).toBe(false);
  });
});

describe('tekrarAnahtari', () => {
  it('soru ve kalem birleştirir', () => {
    expect(tekrarAnahtari('A8', 'Squat')).toBe('A8:Squat');
  });
});

describe('toplamSoruSayisi', () => {
  it('görünür soru sayısını cevaplara göre hesaplar', () => {
    const az = toplamSoruSayisi({ S6: 'Hayır' });
    const cok = toplamSoruSayisi({ S6: 'Evet', S8: ['bel', 'diz_sag', 'omuz_sol'] });

    expect(cok).toBeGreaterThan(az);
  });

  it('temel soru sayısı spec ile uyumludur', () => {
    expect(toplamSoruSayisi({})).toBeGreaterThanOrEqual(100);
  });
});
