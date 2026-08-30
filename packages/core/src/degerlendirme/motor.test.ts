import { describe, expect, it } from 'vitest';
import { SORU_BANKASI } from '@swiip/shared';
import { ATLANDI, type Cevaplar } from '../cevaplar';
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
  it('8 kart içerir', () => {
    expect(SORU_BANKASI.blocks.map((b) => b.id)).toEqual(['K', 'G', 'A', 'H', 'E', 'Z', 'B', 'M']);
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
    expect(gorunur).not.toContain('S8');
    expect(gorunur).not.toContain('S15');
  });

  it('branch tetiklenince bağlı sorular görünür olur', () => {
    const gorunur = gorunurSorular({ S6: 'Evet' }).map((s) => s.id);

    expect(gorunur).toContain('S8');
  });

  it('branch geri alınınca soru tekrar gizlenir', () => {
    expect(gorunurSorular({ S6: 'Hayır' }).map((s) => s.id)).not.toContain('S8');
  });

  /**
   * Atlamak bir şık değil.
   *
   * `_notYok` "Yok" dışındaki her şeyi tetikliyordu ve `ATLANDI` de "Yok" değil: H4 boş
   * bırakılıp geçildiğinde H4a ("Hangi tarihe?") açılıyor, yani cevaplamayı reddettiğin
   * sorunun devamı soruluyordu. Aynı şey her `branch` anahtarı için geçerli.
   */
  it('atlanmış cevap dal açmaz', () => {
    expect(gorunurSorular({ S6: ATLANDI }).map((s) => s.id)).not.toContain('S8');
  });

  it('conditionalOn başka sorunun cevabına bakar', () => {
    expect(gorunurSorular({ K2: 'Kadın' }).map((s) => s.id)).toContain('K6');
    expect(gorunurSorular({ K2: 'Erkek' }).map((s) => s.id)).not.toContain('K6');
  });

  /** Tansiyon detayı yalnızca kalp/tansiyon beyanı olana sorulur. */
  it('S15 yalnızca S1 = Evet ise görünür', () => {
    expect(gorunurSorular({ S1: 'Evet' }).map((s) => s.id)).toContain('S15');
    expect(gorunurSorular({ S1: 'Hayır' }).map((s) => s.id)).not.toContain('S15');
  });

  it('ev seçildiğinde ev soruları, salonda hiçbiri', () => {
    const ev = gorunurSorular({ E1: 'Ev' }).map((s) => s.id);

    expect(ev).toContain('E5a');
    expect(ev).toContain('E6');

    const salon = gorunurSorular({ E1: 'Spor salonu' }).map((s) => s.id);
    expect(salon).not.toContain('E5a');
    expect(salon).not.toContain('E7');
  });

  it('karma seçiminde ev kısıtları da sorulur', () => {
    const karma = gorunurSorular({ E1: 'Karma' }).map((s) => s.id);

    expect(karma).toContain('E5a');
  });

  /**
   * Dumbbell aralığı, dumbbell'ı OLANA sorulur.
   *
   * Önce yalnızca E1'in dalıydı: "Ev" ya da "Karma" diyen herkese soruluyordu —
   * ekipman listesinde dumbbell işaretlememiş olsa bile. Koşul artık iki parçalı:
   * (evde ya da karma) VE listede dumbbell var. Salonda hiç sorulmuyor; orada rack
   * tam kabul ediliyor.
   */
  it('E7 hem konuma hem dumbbell işaretine bağlı', () => {
    const kes = (c: Parameters<typeof gorunurSorular>[0]) => gorunurSorular(c).map((s) => s.id);

    expect(kes({ E1: 'Ev', E3: ['Dumbbell', 'Direnç bandı'] })).toContain('E7');
    expect(kes({ E1: 'Karma', E3: ['Dumbbell'] })).toContain('E7');

    // Evde ama dumbbell yok.
    expect(kes({ E1: 'Ev', E3: ['Direnç bandı'] })).not.toContain('E7');
    // Dumbbell var ama salonda — orada rack tam sayılıyor.
    expect(kes({ E1: 'Spor salonu', E3: ['Dumbbell'] })).not.toContain('E7');
  });

  /**
   * Pişirme süresi, yemeği KENDİ pişirene sorulur.
   *
   * Koşulsuzdu: "yemeğimi ailem yapıyor" diyen kullanıcıya bir alt satırda "yemeğe
   * günde kaç dakika ayırabilirsin" soruluyordu. Kullanıcı bunu bir mantık hatası
   * olarak bildirdi ve haklıydı — tarif karmaşıklığı tavanı yalnızca kendisi
   * pişiriyorsa anlamlı.
   */
  it('B7 yalnızca yemeği kendi hazırlayana sorulur', () => {
    const kes = (b5: string) => gorunurSorular({ B5: b5 }).map((s) => s.id);

    expect(kes('Kendim')).toContain('B7');
    expect(kes('Karışık')).toContain('B7');
    expect(kes('Ailem')).not.toContain('B7');
    expect(kes('Dışarıdan alıyorum')).not.toContain('B7');
  });

  it('vücut haritasında işaretlenen her bölge için soru seti tekrarlanır', () => {
    const gorunur = gorunurSorular({ S6: 'Evet', S8: ['bel', 'diz_sag'] }).map((s) => s.id);

    expect(gorunur).toContain('S11:bel');
    expect(gorunur).toContain('S12:bel');
    expect(gorunur).toContain('S11:diz_sag');
    expect(gorunur).toContain('S12:diz_sag');
  });

  it('bölge işaretlenmezse tekrar soruları çıkmaz', () => {
    const gorunur = gorunurSorular({ S6: 'Evet', S8: [] }).map((s) => s.id);

    expect(gorunur.some((id) => id.startsWith('S11:'))).toBe(false);
  });

  /**
   * Keskinleştirme ve periyodik sorular değerlendirme akışında YOK.
   *
   * A8 (teknik güveni) programın karar izinden, Y6 (stres) haftalık check-in'den
   * çağrılıyor. Akışta görünseler değerlendirme yine 50 soruya çıkardı.
   */
  it('temel olmayan sorular akışta görünmez', () => {
    const gorunur = gorunurSorular({}).map((s) => s.id);

    expect(gorunur).not.toContain('A8');
    expect(gorunur).not.toContain('A5');
    expect(gorunur).not.toContain('Y6');
    expect(gorunur).not.toContain('B12');
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
      if (soru.id === 'S6') break;
      cevaplar[soru.id] = ornekCevap(soru);
    }
    cevaplar['S6'] = 'Evet';
    cevaplar['S7'] = 'Hayır';
    cevaplar['S18'] = 'Hayır';
    cevaplar['S17'] = ['Hayır'];

    expect(sonrakiSoru(cevaplar)?.id).toBe('S8');
  });

  it('cevaplandıkça açılan dallarla birlikte akış sonlanır', () => {
    const { cevaplar, adim } = akisiTamamla();

    expect(sonrakiSoru(cevaplar)).toBeUndefined();
    // Dallanma yakınsamalı: sonsuz döngü olmamalı.
    expect(adim).toBeLessThan(400);
  });

  it('cevap vermek yeni dal açtığında akış uzar', () => {
    const kisa = gorunurSorular({ S6: 'Hayır' }).length;
    const uzun = gorunurSorular({ S6: 'Evet' }).length;

    expect(uzun).toBeGreaterThan(kisa);
  });

  it('isteğe bağlı soru atlanabilir ve akış durmaz', () => {
    // Değerler gerçekçi: geçersiz bir cevap artık cevap sayılmıyor ve soru geri geliyor.
    const cevaplar: Cevaplar = {
      K1: '1990-05-10',
      K2: 'Erkek',
      K3: 178,
      K4: 82,
    };

    // K6 (gebelik) erkek beyan edene sorulmuyor; sıradaki soru K7.
    expect(sonrakiSoru(cevaplar)?.id).toBe('K7');
  });

  /**
   * Aynı noktada kadın kullanıcıya K6 soruluyor. İki testi birlikte tutmak, gizleme
   * kuralının yanlışlıkla herkese uygulanmasını yakalar.
   */
  it('kadın kullanıcıda gebelik sorusu sorulur', () => {
    const cevaplar: Cevaplar = {
      K1: '1990-05-10',
      K2: 'Kadın',
      K3: 165,
      K4: 61,
      K7: 'Evet',
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

    expect(blokIlerlemesi(cevaplar).blok_id).toBe('G');
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
    expect(ilerleme.tamamlanan_bloklar).toHaveLength(8);
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
    expect(cevabiDogrula(soruBul('Z3'), null).gecerli).toBe(true);
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

  /**
   * Değerlendirmenin uzunluğu bir tasarım kararı; sessizce büyümesin.
   *
   * 136 soruluk bankanın 73'ü hiçbir çıktıyı değiştirmiyordu. Kalanların bir kısmı da
   * ilk gün sorulmak zorunda değildi: yük ve teknik güveni seans geri bildiriminden,
   * uyku kalitesi ve stres haftalık check-in'den geliyor. Sağlıklı bir erkek kullanıcı
   * artık 32 girdi dolduruyor; sakatlığı ve ev salonu olan ~40.
   *
   * Üst sınır bilerek dar: bir sonraki "şunu da soralım" bu testi kırsın ve tartışma
   * kod incelemesinde yapılsın.
   */
  it('temel akış kısa kalıyor', () => {
    const sade = toplamSoruSayisi({ K2: 'Erkek', S6: 'Hayır', E1: 'Spor salonu' });

    expect(sade).toBeLessThanOrEqual(34);
    expect(sade).toBeGreaterThanOrEqual(25);
  });
});
