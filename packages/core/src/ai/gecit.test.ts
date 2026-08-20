import { describe, expect, it, vi } from 'vitest';
import type { Karar } from '@made2fit/shared';
import {
  AI_ISLERI,
  aylikMaliyetTahmini,
  gerekceAnlat,
  maliyetHesapla,
  modelSec,
  sayilariDogrula,
} from './gecit';

const kararlar: Karar[] = [
  {
    id: 'k1',
    entity_tipi: 'hareket',
    entity_id: 'hip-thrust',
    kurallar: ['eksenel_yuk_yasak', 'oncelikli_bolge'],
    girdiler: [
      { soru_id: 'S17', deger: 'Bel fıtığı' },
      { soru_id: 'H6', deger: 'kalca' },
    ],
    aciklama_tr:
      'Hip thrust seçildi: kalça bölgesini öncelik olarak seçtin, bele dikey yük binmiyor.',
  },
];

describe('sayilariDogrula', () => {
  it('kaynakta olmayan sayı üretilirse reddeder', () => {
    const sonuc = sayilariDogrula('Bench 50 kg, 4 set', 'Bench 50 kg, 4 set, 12 tekrar yap');

    expect(sonuc.gecerli).toBe(false);
    expect(sonuc.uydurulan).toContain('12');
  });

  it('kaynaktaki sayıları kullanan metni kabul eder', () => {
    const sonuc = sayilariDogrula('Bench 50 kg, 4 set', '4 set bench press, 50 kg ile başla');

    expect(sonuc.gecerli).toBe(true);
    expect(sonuc.uydurulan).toEqual([]);
  });

  it('hiç sayı içermeyen çıktıyı kabul eder', () => {
    expect(sayilariDogrula('Bench 50 kg', 'Bu hareketi programına ekledim').gecerli).toBe(true);
  });

  it('ondalık sayıları da karşılaştırır', () => {
    expect(sayilariDogrula('52,5 kg', 'Ağırlığın 52,5 kg').gecerli).toBe(true);
    expect(sayilariDogrula('52,5 kg', 'Ağırlığın 57,5 kg').gecerli).toBe(false);
  });

  it('yüzde işareti sayıyı gizlemez', () => {
    expect(sayilariDogrula('%18-21 aralığı', 'Yağ oranın %18-21').gecerli).toBe(true);
    expect(sayilariDogrula('%18-21 aralığı', 'Yağ oranın %14').gecerli).toBe(false);
  });
});

describe('gerekceAnlat', () => {
  it('AI yoksa deterministik açıklamayı olduğu gibi döner', async () => {
    const sonuc = await gerekceAnlat(kararlar, undefined);

    expect(sonuc.metinler['hip-thrust']).toBe(kararlar[0]!.aciklama_tr);
    expect(sonuc.ai_kullanildi).toBe(false);
  });

  it('AI çıktısı sayı uydurursa deterministik metne düşer', async () => {
    const istemci = {
      metinUret: vi.fn().mockResolvedValue({
        metin: 'Hip thrust seçildi çünkü 3 hafta içinde kalçanı %40 büyütecek.',
        girdi_token: 100,
        cikti_token: 30,
        model: 'test',
      }),
    };

    const sonuc = await gerekceAnlat(kararlar, istemci);

    expect(sonuc.metinler['hip-thrust']).toBe(kararlar[0]!.aciklama_tr);
    expect(sonuc.dusulen_sayisi).toBe(1);
  });

  it('AI çıktısı geçerliyse kullanılır', async () => {
    const istemci = {
      metinUret: vi.fn().mockResolvedValue({
        metin: 'Bel fıtığın olduğu için yerden çekiş yerine hip thrust koydum.',
        girdi_token: 100,
        cikti_token: 30,
        model: 'test',
      }),
    };

    const sonuc = await gerekceAnlat(kararlar, istemci);

    expect(sonuc.metinler['hip-thrust']).toContain('hip thrust');
    expect(sonuc.ai_kullanildi).toBe(true);
  });

  it('AI hata verirse program yine de teslim edilir', async () => {
    const istemci = { metinUret: vi.fn().mockRejectedValue(new Error('gateway 503')) };

    const sonuc = await gerekceAnlat(kararlar, istemci);

    expect(sonuc.metinler['hip-thrust']).toBe(kararlar[0]!.aciklama_tr);
    expect(sonuc.hata).toBeDefined();
  });

  it('token kullanımı raporlanır', async () => {
    const istemci = {
      metinUret: vi.fn().mockResolvedValue({
        metin: 'Bel fıtığın olduğu için hip thrust koydum.',
        girdi_token: 120,
        cikti_token: 40,
        model: 'test',
      }),
    };

    const sonuc = await gerekceAnlat(kararlar, istemci);

    expect(sonuc.girdi_token).toBe(120);
    expect(sonuc.cikti_token).toBe(40);
  });

  it('boş karar listesinde AI çağrılmaz', async () => {
    const istemci = { metinUret: vi.fn() };

    await gerekceAnlat([], istemci);

    expect(istemci.metinUret).not.toHaveBeenCalled();
  });
});

describe('modelSec', () => {
  it('her AI işi için bir model seviyesi tanımlıdır', () => {
    for (const is of AI_ISLERI) {
      expect(modelSec(is).seviye).toBeTruthy();
    }
  });

  it('değerlendirme yorumlama en güçlü modeli kullanır', () => {
    expect(modelSec('degerlendirme_yorumlama').seviye).toBe('guclu');
  });

  it('yemek tanıma ucuz görsel modeli kullanır — hacim burada', () => {
    const secim = modelSec('yemek_tanima');

    expect(secim.seviye).toBe('ucuz_gorsel');
    expect(secim.gorsel).toBe(true);
  });

  it('koç sohbeti orta seviyede kalır', () => {
    expect(modelSec('koc_sohbeti').seviye).toBe('orta');
  });
});

describe('maliyetHesapla', () => {
  it('token sayısından dolar maliyeti çıkarır', () => {
    const maliyet = maliyetHesapla('orta', { girdi_token: 1_000_000, cikti_token: 0 });

    expect(maliyet).toBeGreaterThan(0);
  });

  it('çıktı tokenı girdiden pahalıdır', () => {
    const girdi = maliyetHesapla('orta', { girdi_token: 100_000, cikti_token: 0 });
    const cikti = maliyetHesapla('orta', { girdi_token: 0, cikti_token: 100_000 });

    expect(cikti).toBeGreaterThan(girdi);
  });

  it('güçlü model ucuz modelden pahalıdır', () => {
    const ucuz = maliyetHesapla('ucuz_gorsel', { girdi_token: 100_000, cikti_token: 10_000 });
    const guclu = maliyetHesapla('guclu', { girdi_token: 100_000, cikti_token: 10_000 });

    expect(guclu).toBeGreaterThan(ucuz);
  });
});

describe('aylikMaliyetTahmini', () => {
  it('aktif Pro kullanıcı spec bütçesinin içinde kalır', () => {
    const maliyet = aylikMaliyetTahmini({
      yemek_tanima: 90,
      vucut_analizi: 1,
      koc_sohbeti: 80,
      degerlendirme_yorumlama: 0,
      ogun_plani: 4,
    });

    // spec bölüm 12: aktif Pro kullanıcı ~$0,70-1,40
    expect(maliyet.toplam_usd).toBeLessThanOrEqual(1.6);
  });

  it('kota aşımı maliyeti doğrusal artırır', () => {
    const normal = aylikMaliyetTahmini({ yemek_tanima: 90 });
    const asiri = aylikMaliyetTahmini({ yemek_tanima: 250 });

    expect(asiri.toplam_usd).toBeGreaterThan(normal.toplam_usd);
  });

  it('kalem bazlı döküm verir', () => {
    const maliyet = aylikMaliyetTahmini({ yemek_tanima: 90, koc_sohbeti: 80 });

    expect(maliyet.kalemler.yemek_tanima).toBeGreaterThan(0);
    expect(maliyet.kalemler.koc_sohbeti).toBeGreaterThan(0);
  });
});
