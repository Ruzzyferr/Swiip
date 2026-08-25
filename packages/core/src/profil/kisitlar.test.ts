import { describe, expect, it } from 'vitest';
import { kisitlariDerle, salonOnDoldurma } from './kisitlar';
import type { Cevaplar } from '../cevaplar';

const salonKullanicisi: Cevaplar = {
  E1: 'Spor salonu',
  E3: ['Barbell ve plaka', 'Dumbbell', 'Düz bench', 'Squat rack', 'Lat pulldown'],
  E4: 'Bazen beklerim',
  E8: 'Hayır',
  A8: 4,
};

describe('kisitlariDerle — ekipman', () => {
  it('E3 seçimlerini ekipman koduna çevirir', () => {
    const k = kisitlariDerle(salonKullanicisi);

    expect(k.ekipman).toContain('barbell');
    expect(k.ekipman).toContain('dumbbell');
    expect(k.ekipman).toContain('duz_bench');
    expect(k.ekipman).toContain('squat_rack');
    expect(k.ekipman).toContain('lat_pulldown');
  });

  it('seçilmeyen ekipman listeye girmez', () => {
    expect(kisitlariDerle(salonKullanicisi).ekipman).not.toContain('leg_press');
  });

  it('ayarlanabilir bench düz ve eğimli bench yerine geçer', () => {
    const k = kisitlariDerle({ E1: 'Ev', E3: ['Ayarlanabilir bench', 'Dumbbell'] });

    expect(k.ekipman).toContain('duz_bench');
    expect(k.ekipman).toContain('egimli_bench');
  });

  it('vücut ağırlığı seçimi ekipman listesini boş bırakır', () => {
    expect(kisitlariDerle({ E1: 'Ev', E3: ['Hiçbiri, vücut ağırlığı'] }).ekipman).toEqual([]);
  });

  it('ekipman listesi sıralı ve tekrarsızdır', () => {
    const k = kisitlariDerle({ E1: 'Ev', E3: ['Dumbbell', 'Dumbbell', 'Ayarlanabilir bench'] });

    expect(k.ekipman).toEqual([...new Set(k.ekipman)].sort());
  });

  it('E7 dumbbell tavanını taşır', () => {
    const k = kisitlariDerle({ E1: 'Ev', E3: ['Dumbbell'], E7: { min_kg: 2, max_kg: 12 } });

    expect(k.dumbbell_max_kg).toBe(12);
  });
});

describe('salonOnDoldurma', () => {
  it('zincir salonu makine setiyle ön doldurur', () => {
    const set = salonOnDoldurma('MACFit');

    expect(set).toContain('makine_gogus');
    expect(set).toContain('leg_press');
    expect(set).toContain('kablo_makinesi');
  });

  it('bağımsız salon daha dar bir set verir', () => {
    const zincir = salonOnDoldurma('MACFit');
    const mahalle = salonOnDoldurma('Bağımsız salon');

    expect(mahalle.length).toBeLessThan(zincir.length);
    expect(mahalle).toContain('barbell');
  });

  it('bilinmeyen salonda güvenli çekirdek set verir', () => {
    expect(salonOnDoldurma('Diğer')).toContain('dumbbell');
  });
});

describe('kisitlariDerle — sakatlık', () => {
  it('bel bölgesi işaretlenince bel kontrendikasyonu doğar', () => {
    const k = kisitlariDerle({ ...salonKullanicisi, S8: ['bel'], 'S11:bel': 6 });

    expect(k.kontrendikasyonlar).toContain('bel_fitigi');
    expect(k.sakatliklar[0]!.bolge).toBe('bel');
    expect(k.sakatliklar[0]!.aktif).toBe(true);
  });

  it('S17 bel fıtığı eksenel yüklenmeyi yasaklar', () => {
    const k = kisitlariDerle({ ...salonKullanicisi, S17: ['Bel fıtığı'] });

    expect(k.kontrendikasyonlar).toContain('bel_fitigi');
    expect(k.eksenel_yuk_yasak).toBe(true);
  });

  it('boyun fıtığı baş üstü ve eksenel yükü yasaklar', () => {
    const k = kisitlariDerle({ ...salonKullanicisi, S17: ['Boyun fıtığı'] });

    expect(k.kontrendikasyonlar).toContain('boyun_fitigi');
    expect(k.bas_ustu_yasak).toBe(true);
    expect(k.eksenel_yuk_yasak).toBe(true);
  });

  /**
   * Osteoporoz uzun süre soruluyor ama hiçbir şey yapmıyordu: eski S4'te bir şıktı,
   * `drives: durum_bazli_dallanma` yazıyordu ve öyle bir dallanma yoktu.
   * Kemik yoğunluğu düşükken omurgaya dikey yük ve yüklü fleksiyon vertebral
   * kompresyon kırığı riskidir.
   */
  it('osteoporoz eksenel yükü ve yüklü fleksiyonu kısıtlar', () => {
    const k = kisitlariDerle({ ...salonKullanicisi, S17: ['Osteoporoz / kemik erimesi'] });

    expect(k.eksenel_yuk_yasak).toBe(true);
    expect(k.kontrendikasyonlar).toContain('bel_fitigi');
    expect(k.kisitli_paternler).toContain('kalca_baskin');
  });

  it('S17 = Hayır hiçbir kontrendikasyon üretmez', () => {
    expect(kisitlariDerle({ ...salonKullanicisi, S17: ['Hayır'] }).kontrendikasyonlar).toEqual([]);
  });

  it('omuz bölgesi hem sıkışma hem instabilite kısıtı doğurur', () => {
    const k = kisitlariDerle({ ...salonKullanicisi, S8: ['omuz_sag'], 'S11:omuz_sag': 5 });

    expect(k.kontrendikasyonlar).toContain('omuz_sikismasi');
    expect(k.kontrendikasyonlar).toContain('omuz_instabilite');
  });

  it('düşük ağrı bildiren bölge kısıt üretir ama aktif sayılmaz', () => {
    const k = kisitlariDerle({ ...salonKullanicisi, S8: ['diz_sol'], 'S11:diz_sol': 2 });

    expect(k.sakatliklar[0]!.aktif).toBe(false);
    expect(k.kontrendikasyonlar).toContain('diz_menisküs');
    expect(k.kisitli_hacim_gruplari).toEqual([]);
  });

  it('ağrı seviyesi bilinmiyorsa muhafazakâr davranır ve aktif sayar', () => {
    const k = kisitlariDerle({ ...salonKullanicisi, S8: ['diz_sol'] });

    expect(k.sakatliklar[0]!.aktif).toBe(true);
  });

  it('aktif diz sakatlığı bacak hacim gruplarını kısıtlar', () => {
    const k = kisitlariDerle({ ...salonKullanicisi, S8: ['diz_sag'], 'S11:diz_sag': 7 });

    expect(k.kisitli_hacim_gruplari).toContain('quadriceps');
  });

  it('kontrolsüz tansiyon kısıt listesine girer', () => {
    const k = kisitlariDerle({ ...salonKullanicisi, S15: 'Kontrolsüz / bilmiyorum' });

    expect(k.kontrendikasyonlar).toContain('tansiyon_kontrolsuz');
  });

  it('kontrendikasyon listesi sıralı ve tekrarsızdır', () => {
    const k = kisitlariDerle({
      ...salonKullanicisi,
      S8: ['bel', 'diz_sag', 'diz_sol'],
      S17: ['Bel fıtığı'],
    });

    expect(k.kontrendikasyonlar).toEqual([...new Set(k.kontrendikasyonlar)].sort());
  });
});

describe('kisitlariDerle — ortam ve tercih', () => {
  it('düşük tavan baş üstü hareketleri yasaklar', () => {
    expect(kisitlariDerle({ E1: 'Ev', E5a: 'Hayır' }).bas_ustu_yasak).toBe(true);
  });

  it('zıplama yasağı ile ağırlık bırakma yasağı ayrı tutulur', () => {
    const zipla = kisitlariDerle({ E1: 'Ev', E6: 'Var, zıplayamam' });
    const agirlik = kisitlariDerle({ E1: 'Ev', E6: 'Var, ağırlık bırakamam' });

    expect(zipla.zipla_yasak).toBe(true);
    expect(zipla.gurultu_yasak).toBe(false);
    expect(agirlik.gurultu_yasak).toBe(true);
    expect(agirlik.zipla_yasak).toBe(false);
  });

  it('ikisi de seçilirse her iki yasak da açılır', () => {
    const k = kisitlariDerle({ E1: 'Ev', E6: 'İkisi de' });

    expect(k.zipla_yasak).toBe(true);
    expect(k.gurultu_yasak).toBe(true);
  });

  it('partneri olmayan kullanıcıda spotter gerektiren hareketler işaretlenir', () => {
    expect(kisitlariDerle({ ...salonKullanicisi, E8: 'Hayır' }).spotter_yok).toBe(true);
    expect(kisitlariDerle({ ...salonKullanicisi, E8: 'Evet, düzenli' }).spotter_yok).toBe(false);
  });

  it('sık bekleyen kullanıcının salonu kalabalık sayılır', () => {
    expect(kisitlariDerle({ ...salonKullanicisi, E4: 'Sürekli kalabalık' }).kalabalik_salon).toBe(
      true,
    );
    expect(kisitlariDerle({ ...salonKullanicisi, E4: 'Hiç beklemem' }).kalabalik_salon).toBe(false);
  });

  it('T2 reddedilen hareketleri anahtar kelimeye çevirir', () => {
    const k = kisitlariDerle({ ...salonKullanicisi, T2: ['Deadlift', 'Burpee'] });

    expect(k.reddedilen_anahtarlar).toContain('deadlift');
    expect(k.reddedilen_anahtarlar).toContain('burpee');
  });

  it('T2 = Yok hiçbir şey reddetmez', () => {
    expect(kisitlariDerle({ ...salonKullanicisi, T2: ['Yok'] }).reddedilen_anahtarlar).toEqual([]);
  });

  it('A8 teknik güveni ortalaması alınır', () => {
    const k = kisitlariDerle({
      ...salonKullanicisi,
      'A8:Squat': 2,
      'A8:Deadlift': 1,
      'A8:Bench press': 3,
      'A8:Omuz presi': 3,
      'A8:Barfiks': 1,
    });

    expect(k.teknik_guveni).toBeCloseTo(2, 1);
  });

  /**
   * Yeni A8 tek çoklu seçim: seçilen hareket sayısı güvene çevriliyor.
   * Beş skala beş ekran demekti; "ekran başına tek ölçek" kuralını tek soruda beş kez
   * kullanıyordu.
   */
  it('A8 çoklu seçimi seçim oranına göre güvene çevrilir', () => {
    const hepsi = kisitlariDerle({
      ...salonKullanicisi,
      A8: [
        'Barbell squat',
        'Barbell deadlift',
        'Barbell bench press',
        'Barbell omuz presi',
        'Barfiks',
      ],
    });
    const biri = kisitlariDerle({ ...salonKullanicisi, A8: ['Barbell squat'] });
    const hicbiri = kisitlariDerle({ ...salonKullanicisi, A8: ['Hiçbiri'] });

    expect(hepsi.teknik_guveni).toBe(5);
    expect(biri.teknik_guveni).toBeCloseTo(1.8, 1);
    expect(hicbiri.teknik_guveni).toBe(1);
  });

  /**
   * A8 CEVAPSIZ ise varsayılan antrenman yaşından türer.
   *
   * Eskiden sabit 2.5'ti ve `DUSUK_GUVEN_ESIGI` de tam 2.5, karşılaştırma `<=`: A8'i
   * görmeyen HERKES teknik zorluk tavanı 3'e düşüyor, barbell squat (4), omuz presi (4)
   * ve deadlift (5) havuzdan siliniyordu. A8 değerlendirme akışından çıkınca bu, beş
   * yıllık kullanıcıya yeni başlayan programı çıkarmak olurdu.
   */
  it('A8 cevapsızsa varsayılan antrenman yaşından gelir', () => {
    expect(kisitlariDerle({ E1: 'Ev', A1: 'Hiç yapmadım' }).teknik_guveni).toBe(2);
    expect(kisitlariDerle({ E1: 'Ev', A1: '1-3 yıl' }).teknik_guveni).toBe(2.5);
    expect(kisitlariDerle({ E1: 'Ev', A1: '5 yıldan fazla' }).teknik_guveni).toBe(3.5);
  });
});

describe('kisitlariDerle — S12 ağrıyı artıran hareket paterni', () => {
  it('öne eğilmede artan ağrı kalça baskın paterni kısıtlar', () => {
    const k = kisitlariDerle({
      ...salonKullanicisi,
      S8: ['bel'],
      'S12:bel': ['Öne eğilme'],
    });

    expect(k.kisitli_paternler).toContain('kalca_baskin');
  });

  it('baş üstü hareketde artan ağrı baş üstü yasağı doğurur', () => {
    const k = kisitlariDerle({
      ...salonKullanicisi,
      S8: ['omuz_sol'],
      'S12:omuz_sol': ['Baş üstü hareket'],
    });

    expect(k.bas_ustu_yasak).toBe(true);
    expect(k.kisitli_paternler).toContain('itme_dikey');
  });

  it('çömelmede artan ağrı diz baskın paterni kısıtlar', () => {
    const k = kisitlariDerle({
      ...salonKullanicisi,
      S8: ['diz_sag'],
      'S12:diz_sag': ['Çömelme'],
    });

    expect(k.kisitli_paternler).toContain('diz_baskin');
  });

  it('ağırlık kaldırmada artan ağrı eksenel yükü yasaklar', () => {
    const k = kisitlariDerle({
      ...salonKullanicisi,
      S8: ['bel'],
      'S12:bel': ['Ağırlık kaldırma'],
    });

    expect(k.eksenel_yuk_yasak).toBe(true);
  });

  it('koşma ve zıplamada artan ağrı pliometriği yasaklar', () => {
    const k = kisitlariDerle({
      ...salonKullanicisi,
      S8: ['diz_sol'],
      'S12:diz_sol': ['Koşma / zıplama'],
    });

    expect(k.zipla_yasak).toBe(true);
  });

  it('belli değil cevabı ek kısıt üretmez', () => {
    const k = kisitlariDerle({
      ...salonKullanicisi,
      S8: ['bel'],
      'S12:bel': ['Belli değil'],
    });

    expect(k.kisitli_paternler).toEqual([]);
  });
});
