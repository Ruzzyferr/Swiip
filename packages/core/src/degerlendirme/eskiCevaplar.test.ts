import { describe, expect, it } from 'vitest';
import { ATLANDI } from '../cevaplar';
import { profilDerle } from '../profil/profil';
import { programUret } from '../program/program';
import { beslenmeHedefiHesapla } from '../beslenme/beslenme';
import { blokIlerlemesi, gorunurSorular, sonrakiSoru } from './motor';
import type { Cevaplar } from '../cevaplar';

/**
 * Bankadan 83 soru çıktı — eski kayıtlar bozulmamalı.
 *
 * Veri göçü YOK ve olmasına gerek de yok: her okuyucu cevaplara **ID ile** bakıyor,
 * listeyle değil. `answers_jsonb` içinde artık sorulmayan soruların cevabı dursa da
 * kimse bakmıyor, eksik ID `undefined` dönüyor ve her okuyucunun bir varsayılanı var.
 *
 * Ama "gerek yok" bir iddia; bu dosya onu kanıtlıyor. Üretimde dokuz kullanıcı ve beş
 * tamamlanmış değerlendirme var — hepsi iç test ve inceleme hesabı, ama Apple'ın
 * inceleme hesabı da onların içinde.
 */

const BUGUN = new Date('2026-08-25T00:00:00Z');

/**
 * Eski akışın ürettiği cevap kümesi.
 *
 * Silinen sorular (`K5 K9 K10 K12 H4 A2 A3 T1 T3 E2 S4 S5`), eski `A8` biçimi
 * (`A8:Squat` beş ayrı skala) ve eski `A5` yük beyanı bilerek duruyor.
 */
const ESKI_KAYIT: Cevaplar = {
  K1: '1994-03-15',
  K2: 'Erkek',
  K3: 178,
  K4: 82,
  K5: 'Bugün',
  K7: 'Evet',
  K8: 'Hayır',
  K9: 'İstanbul',
  K10: 'Değişmedi',
  K12: { en_yuksek_kg: 88, en_dusuk_kg: 74 },
  H1: 'Kas kazanımı',
  H4: 'Yok',
  H6: ['sirt', 'gogus'],
  H10: 1,
  A1: '1-3 yıl',
  A2: 3,
  A3: 10,
  'A5:Squat': { kg: 100, tekrar: 5 },
  'A5:Bench press': { kg: 80, tekrar: 6 },
  'A8:Squat': 4,
  'A8:Bench press': 4,
  'A8:Deadlift': 3,
  'A8:Omuz presi': 4,
  'A8:Barfiks': 3,
  S1: 'Hayır',
  S2: 'Hayır',
  S3: 'Hayır',
  S4: ['Yok'],
  S5: 'Hayır',
  S6: 'Hayır',
  S7: 'Hayır',
  S17: ['Bel fıtığı'],
  S18: 'Hayır',
  E1: 'Spor salonu',
  E2: 'MACFit',
  E3: ['Barbell ve plaka', 'Dumbbell', 'Düz bench', 'Squat rack', 'Lat pulldown'],
  E4: 'Bazen beklerim',
  E8: 'Hayır',
  Z1: '4 gün',
  Z2: '60 dakika',
  Z3: ['Pazartesi', 'Salı', 'Perşembe', 'Cumartesi'],
  Y1: '7-8 saat',
  Y2: 7,
  Y4: 'Masa başı, çoğunlukla oturarak',
  Y6: 4,
  T1: 'Bodybuilding / estetik',
  T2: ['Yok'],
  T3: 'Katlanırım',
  B5: 'Kendim',
  B7: '30 dakikaya kadar',
  B8: 'Orta',
  B9: ['Yok'],
  B11: ['Helal'],
  /**
   * Eski istemci boş bırakılan isteğe bağlı soruları `ATLANDI` işaretliyordu
   * (`atlananlariIsaretle`). Gerçek kayıtlar böyle görünüyor, boş değil.
   */
  H3: ATLANDI,
  B10: ATLANDI,
  B13: ATLANDI,
  B14: ATLANDI,
};

const profil = () => profilDerle(ESKI_KAYIT, { bugun: BUGUN, userId: 'eski' });

describe('bankadan çıkan sorular eski kayıtları bozmuyor', () => {
  it('profil derlenir ve kısıtlar yerinde kalır', () => {
    const p = profil();

    expect(p.antrenman_yasi).toBe('orta');
    expect(p.kisitlar.kontrendikasyonlar).toContain('bel_fitigi');
    expect(p.kisitlar.eksenel_yuk_yasak).toBe(true);
    expect(p.kisitlar.ekipman).toContain('barbell');
  });

  /** Eski beş skalalı A8 hâlâ okunuyor; kullanıcı cevabını iki kez vermek zorunda değil. */
  it('eski A8 biçimi teknik güvenine çevrilmeye devam ediyor', () => {
    expect(profil().kisitlar.teknik_guveni).toBeCloseTo(3.6, 1);
  });

  /** Eski A5 yük beyanı da duruyor: e1RM tahmine düşmüyor. */
  it('eski yük beyanı korunuyor', () => {
    expect(profil().bilinen_yukler['barbell-squat']).toBeGreaterThan(100);
  });

  it('program üretilir', () => {
    const sonuc = programUret(profil());

    expect(sonuc.durum).toBe('uretildi');
    if (sonuc.durum !== 'uretildi') return;
    expect(sonuc.program.seanslar).toHaveLength(4);
  });

  it('kalori ve makro hedefi hesaplanır', () => {
    expect(beslenmeHedefiHesapla(profil()).protein_g).toBeGreaterThan(50);
  });

  /**
   * Silinen soruların cevapları akışı KİLİTLEMİYOR.
   *
   * Bu, sessizce yanlış gidebilecek yerdi: `sonrakiSoru` artık var olmayan bir soruyu
   * gösterseydi kullanıcı değerlendirmeyi asla bitiremezdi.
   */
  it('yeni akışta artık sorulmayan sorular sıraya girmiyor', () => {
    const gorunur = gorunurSorular(ESKI_KAYIT).map((s) => s.id);

    for (const silinen of ['K5', 'K9', 'K10', 'K12', 'H4', 'A2', 'A3', 'T1', 'T3', 'E2', 'S4']) {
      expect(gorunur, `${silinen} bankadan çıktı`).not.toContain(silinen);
    }
  });

  it('eski kayıt yeni akışta da tamamlanmış sayılıyor', () => {
    const ilerleme = blokIlerlemesi(ESKI_KAYIT);

    expect(sonrakiSoru(ESKI_KAYIT), 'kalan soru: ' + sonrakiSoru(ESKI_KAYIT)?.id).toBeUndefined();
    expect(ilerleme.tamamlandi).toBe(true);
    expect(ilerleme.tamamlanan_bloklar).toHaveLength(8);
  });

  /**
   * İSTEĞE BAĞLI bir soruyu zorunlu yapmak mevcut kullanıcıyı akışa geri düşürür.
   *
   * Bu tam olarak oldu: H3 ("hedef kilon") kart birleştirmesi sırasında zorunlu
   * yapılmıştı. Atlanmış cevap zorunlu soruda geçersiz sayılıyor, yani değerlendirmesi
   * bitmiş HERKES — Apple'ın inceleme hesabı dahil — değerlendirmeye geri dönüyordu.
   * Hiçbir şey hata vermiyordu; yalnızca `tamamlandi` sessizce `false` oluyordu.
   *
   * Kural: bankada `required` bayrağını sonradan açmak bir GÖÇTÜR, bayrak değişikliği
   * değil. Açılacaksa mevcut kayıtların o soruya cevabı olmalı.
   */
  it('atlanmış cevabı olan sorular isteğe bağlı kalmalı', () => {
    const atlanmislar = Object.entries(ESKI_KAYIT)
      .filter(([, deger]) => deger === ATLANDI)
      .map(([id]) => id);

    const zorunluOlmus = gorunurSorular(ESKI_KAYIT)
      .filter((s) => s.required && atlanmislar.includes(s.id))
      .map((s) => s.id);

    expect(zorunluOlmus, 'bu sorular eski kullanıcıları akışa geri düşürür').toEqual([]);
  });
});
