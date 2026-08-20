import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { HAREKET_KATALOGU, HACIM_GRUPLARI } from '@made2fit/shared';
import { hacimGrubu, hareketAdaGoreBul, hareketBul, katalogDizini, muadilZinciri } from './katalog';

describe('hareket kataloğu — veri sözleşmesi', () => {
  it('en az 120 hareket içerir', () => {
    expect(HAREKET_KATALOGU.length).toBeGreaterThanOrEqual(120);
  });

  it('her hacim grubunda en az üç seçenek vardır', () => {
    for (const grup of HACIM_GRUPLARI) {
      const sayi = HAREKET_KATALOGU.filter((h) =>
        h.birincil_kas.some((k) => hacimGrubu(k) === grup),
      ).length;
      expect(sayi, `${grup} için yeterli hareket yok`).toBeGreaterThanOrEqual(3);
    }
  });

  it('her hacim grubunda ekipmansız en az bir seçenek vardır', () => {
    const eksik = HACIM_GRUPLARI.filter(
      (grup) =>
        !HAREKET_KATALOGU.some(
          (h) => h.ekipman.length === 0 && h.birincil_kas.some((k) => hacimGrubu(k) === grup),
        ),
    );

    expect(eksik).toEqual([]);
  });

  it('her hareketin Türkçe talimatı vardır', () => {
    const talimatsiz = HAREKET_KATALOGU.filter((h) => h.talimat_tr.length < 4);
    expect(talimatsiz.map((h) => h.id)).toEqual([]);
  });

  it('her hareketin muadil zinciri kataloğa çözülür', () => {
    for (const hareket of HAREKET_KATALOGU) {
      for (const alt of hareket.alternatifler) {
        expect(hareketBul(alt), `${hareket.id} -> ${alt}`).toBeDefined();
      }
    }
  });

  it('id çakışması yoktur', () => {
    const idler = HAREKET_KATALOGU.map((h) => h.id);
    expect(new Set(idler).size).toBe(idler.length);
  });
});

describe('hacimGrubu', () => {
  it('omuz başlarını tek hacim grubunda toplar', () => {
    expect(hacimGrubu('on_omuz')).toBe('omuz');
    expect(hacimGrubu('yan_omuz')).toBe('omuz');
    expect(hacimGrubu('arka_omuz')).toBe('omuz');
  });

  it('bel ve trapezi sırt bütçesine yazar', () => {
    expect(hacimGrubu('bel')).toBe('sirt');
    expect(hacimGrubu('trapez')).toBe('sirt');
  });

  it('önkolu biceps bütçesine yazar', () => {
    expect(hacimGrubu('onkol')).toBe('biceps');
  });

  it('doğrudan eşleşen grupları olduğu gibi bırakır', () => {
    expect(hacimGrubu('gogus')).toBe('gogus');
    expect(hacimGrubu('quadriceps')).toBe('quadriceps');
  });
});

describe('hareketBul', () => {
  it('bilinen id için hareketi döner', () => {
    expect(hareketBul('barbell-bench-press')?.ad_tr).toBe('Barbell bench press');
  });

  it('bilinmeyen id için undefined döner', () => {
    expect(hareketBul('olmayan-hareket')).toBeUndefined();
  });
});

describe('muadilZinciri', () => {
  it('yalnızca kullanılabilir ekipmanla yapılabilen muadilleri döner', () => {
    const zincir = muadilZinciri('barbell-bench-press', {
      ekipman: ['dumbbell', 'duz_bench'],
    });

    expect(zincir.map((h) => h.id)).toContain('dumbbell-bench-press');
    expect(zincir.map((h) => h.id)).not.toContain('makine-gogus-presi');
  });

  it('vücut ağırlığı muadili her zaman erişilebilirdir', () => {
    const zincir = muadilZinciri('barbell-bench-press', { ekipman: [] });

    expect(zincir.map((h) => h.id)).toContain('sinav');
  });

  it('bilinmeyen hareket için boş zincir döner', () => {
    expect(muadilZinciri('olmayan-hareket', { ekipman: [] })).toEqual([]);
  });

  it('kontrendikasyonu olan muadili zincirden çıkarır', () => {
    const zincir = muadilZinciri('barbell-squat', {
      ekipman: ['dumbbell', 'leg_press', 'hack_squat'],
      kontrendikasyonlar: ['diz_menisküs'],
    });

    expect(zincir.map((h) => h.id)).not.toContain('leg-press');
  });
});

describe('katalogDizini', () => {
  it('id üzerinden sabit zamanlı erişim verir', () => {
    const dizin = katalogDizini();

    expect(dizin.get('plank')?.ad_tr).toBe('Plank');
    expect(dizin.size).toBe(HAREKET_KATALOGU.length);
  });
});

describe('hareket medyası (F1.5)', () => {
  const envanter = JSON.parse(
    readFileSync(new URL('../../../../data/medya-envanteri.json', import.meta.url), 'utf8'),
  ) as { gorseli_olan: string[] };

  const onaylar = JSON.parse(
    readFileSync(new URL('../../../../data/medya-eslemeleri.json', import.meta.url), 'utf8'),
  ) as { eslemeler: Record<string, string | null> };

  it('envanterdeki her id gerçek bir harekettir', () => {
    const dizin = katalogDizini();
    const hayalet = envanter.gorseli_olan.filter((id) => !dizin.has(id));

    expect(hayalet).toEqual([]);
  });

  it('envanterde tekrar eden id yoktur', () => {
    expect(new Set(envanter.gorseli_olan).size).toBe(envanter.gorseli_olan.length);
  });

  it('elle eşleme dosyasındaki her id gerçek bir harekettir', () => {
    const dizin = katalogDizini();
    const hayalet = Object.keys(onaylar.eslemeler).filter((id) => !dizin.has(id));

    expect(hayalet).toEqual([]);
  });

  /**
   * Görselsiz bırakılan hareket bir eksiklik değil, bir karar olmalı.
   *
   * Kimsenin bakmadığı bir hareketin görselsiz kalması ile "buna uygun görsel yok"
   * denmesi farklı şeyler; ikincisi dosyada yazılı durur.
   */
  it('görseli olmayan her hareket ya bilerek boş bırakılmış ya da otomatik eşleşmemiştir', () => {
    const gorselli = new Set(envanter.gorseli_olan);
    const kararVerilen = new Set(Object.keys(onaylar.eslemeler));

    const bakilmayan = HAREKET_KATALOGU.filter(
      (h) => !gorselli.has(h.id) && !kararVerilen.has(h.id),
    );

    expect(bakilmayan.map((h) => h.id)).toEqual([]);
  });

  it('kataloğun en az yarısında görsel vardır', () => {
    expect(envanter.gorseli_olan.length).toBeGreaterThanOrEqual(HAREKET_KATALOGU.length / 2);
  });
});

/**
 * Ada göre hareket arama.
 *
 * Kullanıcı koça "mekik hareketi nasıl yapılır" diye yazar; katalog kimlikleri ise
 * İngilizce slug ("ab-wheel"). Kimliğe bakan bir arama bu soruyu **hiçbir zaman**
 * karşılamaz — kod yazılı olur ama çalışmaz.
 */
describe('hareketAdaGoreBul', () => {
  it('Türkçe adıyla bulur', () => {
    const hareket = hareketAdaGoreBul('karın tekerleği');

    expect(hareket?.id).toBe('ab-wheel');
  });

  it('şapkasız yazımı da bulur', () => {
    expect(hareketAdaGoreBul('karin tekerlegi')?.id).toBe('ab-wheel');
  });

  it('büyük-küçük harf farkını yutar', () => {
    expect(hareketAdaGoreBul('KARIN TEKERLEĞİ')?.id).toBe('ab-wheel');
  });

  it('İngilizce adıyla da bulur', () => {
    expect(hareketAdaGoreBul('Ab Wheel Rollout')?.id).toBe('ab-wheel');
  });

  it('kimlikle de çalışır — eski çağrı yerleri kırılmaz', () => {
    expect(hareketAdaGoreBul('ab-wheel')?.id).toBe('ab-wheel');
  });

  it('bilinmeyen ad için undefined döner', () => {
    expect(hareketAdaGoreBul('uçan halı')).toBeUndefined();
  });

  /** Kısmi eşleşme yok: "karın" pek çok harekete uyar, yanlışını göstermek kötüdür. */
  it('yarım ad eşleşmez', () => {
    expect(hareketAdaGoreBul('karın')).toBeUndefined();
  });
});
