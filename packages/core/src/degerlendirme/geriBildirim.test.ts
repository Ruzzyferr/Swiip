import { describe, expect, it } from 'vitest';
import type { Cevaplar } from '../cevaplar';
import { blokGeriBildirimi } from './geriBildirim';

const kimlikCevaplari: Cevaplar = {
  K1: '1994-03-15',
  K2: 'Erkek',
  K3: 178,
  K4: 82,
  Y4: 'Masa başı, çoğunlukla oturarak',
};

describe('blokGeriBildirimi', () => {
  it('kimlik bloğu sonunda bakım kalorisini söyler', () => {
    const geri = blokGeriBildirimi('K', kimlikCevaplari);

    expect(geri).toBeDefined();
    expect(geri!.metin).toMatch(/\d{4}/);
    expect(geri!.metin).toContain('kcal');
  });

  it('antrenman bloğu sonunda seviye ve hacim aralığı söyler', () => {
    const geri = blokGeriBildirimi('A', { ...kimlikCevaplari, A1: '1-3 yıl', A3: 10 });

    expect(geri!.metin.toLowerCase()).toContain('seviye');
    expect(geri!.metin).toMatch(/\d+-\d+ set/);
  });

  it('sağlık bloğu sonunda kaç hareket çıkarıldığını söyler', () => {
    const geri = blokGeriBildirimi('S', {
      ...kimlikCevaplari,
      S17: ['Bel fıtığı'],
      E3: ['Barbell ve plaka', 'Dumbbell', 'Düz bench', 'Squat rack'],
    });

    expect(geri!.metin).toMatch(/\d+ hareket/);
  });

  it('kısıt yoksa sağlık bloğu olumlu ve sayısız konuşur', () => {
    const geri = blokGeriBildirimi('S', { ...kimlikCevaplari, S17: ['Hayır'] });

    expect(geri!.metin.length).toBeGreaterThan(20);
  });

  it('ekipman bloğu sonunda kaç hareket yapılabileceğini söyler', () => {
    const geri = blokGeriBildirimi('E', {
      ...kimlikCevaplari,
      E1: 'Spor salonu',
      E3: ['Barbell ve plaka', 'Dumbbell', 'Düz bench', 'Squat rack', 'Lat pulldown'],
    });

    expect(geri!.metin).toMatch(/\d+ hareket/);
  });

  it('zaman bloğu sonunda seçilen splitı söyler', () => {
    const geri = blokGeriBildirimi('Z', { ...kimlikCevaplari, Z1: '4 gün', Z2: '60 dakika' });

    expect(geri!.metin.toLowerCase()).toContain('gün');
  });

  it('yaşam bloğu sonunda hacim ayarını söyler', () => {
    const geri = blokGeriBildirimi('Y', { ...kimlikCevaplari, Y1: '5 saatten az', Y6: 9 });

    expect(geri!.metin).toContain('%');
  });

  it('beslenme bloğu sonunda protein hedefini gram olarak söyler', () => {
    const geri = blokGeriBildirimi('B', kimlikCevaplari);

    expect(geri!.metin).toMatch(/\d+ g/);
  });

  it('ED modunda beslenme geri bildiriminde sayı geçmez', () => {
    const geri = blokGeriBildirimi('B', { ...kimlikCevaplari, S18: 'Evet' });

    expect(geri!.metin).not.toMatch(/\d/);
  });

  it('ED modunda kimlik bloğunda da kalori sayısı gösterilmez', () => {
    const geri = blokGeriBildirimi('K', { ...kimlikCevaplari, S18: 'Evet' });

    expect(geri!.metin).not.toMatch(/\d{3,}/);
  });

  it('tercih bloğu kardiyo tercihini yansıtır', () => {
    const sever = blokGeriBildirimi('T', { ...kimlikCevaplari, T3: 'Severim' });
    const sevmez = blokGeriBildirimi('T', { ...kimlikCevaplari, T3: 'Nefret ederim' });

    expect(sever!.metin).not.toBe(sevmez!.metin);
  });

  it('bilinmeyen blok için geri bildirim üretmez', () => {
    expect(blokGeriBildirimi('X', kimlikCevaplari)).toBeUndefined();
  });

  it('eksik cevapla çökmez', () => {
    expect(() => blokGeriBildirimi('K', {})).not.toThrow();
  });

  it('aynı cevaplar aynı metni üretir', () => {
    expect(blokGeriBildirimi('K', kimlikCevaplari)!.metin).toBe(
      blokGeriBildirimi('K', kimlikCevaplari)!.metin,
    );
  });
});

/**
 * Blok geri bildiriminin dilden bağımsız izi.
 *
 * Değerlendirmenin her bloğunun sonunda "ne öğrendik, programını nasıl değiştirdi"
 * cümlesi çıkıyor. 134 soruyu bitirten şey bu geri bildirim; onsuz kullanıcı on bloğu
 * karanlıkta doldurur.
 *
 * Diğer katmanlarda olduğu gibi: motor **anahtar ve parametre** üretir, cümle sözlükte
 * kurulur. Türkçe metin yerinde kalıyor — iz o ve çeviremediğimiz yerde yedek o.
 */
/** On bloğun hepsini üretebilecek kadar dolu cevap kümesi. */
const TAM_CEVAPLAR: Cevaplar = {
  ...kimlikCevaplari,
  A1: '1-3 yıl',
  A3: 10,
  H3: 78,
  H10: 2,
  E1: 'Ev',
  Z1: '3 gün',
  Z2: '45 dakika',
  Y1: '7-8 saat',
  Y6: 4,
  T3: 'İdare ederim',
};

describe('blok geri bildirimi dilden bağımsız', () => {
  it('her blok bir metin anahtarı taşıyor', () => {
    for (const blok of ['K', 'H', 'A', 'S', 'E', 'Z', 'Y', 'B', 'T', 'F']) {
      const sonuc = blokGeriBildirimi(blok, TAM_CEVAPLAR);

      expect(sonuc?.anahtar, blok).toBeTruthy();
    }
  });

  it('sayı içeren geri bildirim parametrelerini taşıyor', () => {
    const sonuc = blokGeriBildirimi('K', TAM_CEVAPLAR);

    expect(sonuc?.anahtar).toBe('bakimKalorisi');
    expect(Number(sonuc?.degerler?.tdee)).toBeGreaterThan(1000);
  });

  it('ED modunda ayrı anahtar üretiliyor', () => {
    const normal = blokGeriBildirimi('B', TAM_CEVAPLAR);
    const ed = blokGeriBildirimi('B', { ...TAM_CEVAPLAR, S18: 'Evet' });

    expect(ed?.anahtar).not.toBe(normal?.anahtar);
  });

  /** Türkçe metin kayboluyor değil: iz o ve çeviremediğimiz yerde yedek o. */
  it('Türkçe metin korunuyor', () => {
    for (const blok of ['K', 'H', 'A', 'S', 'E', 'Z', 'Y', 'B', 'T', 'F']) {
      expect(blokGeriBildirimi(blok, TAM_CEVAPLAR)?.metin.length, blok).toBeGreaterThan(15);
    }
  });
});
