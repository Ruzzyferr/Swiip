import { describe, expect, it } from 'vitest';
import type { Karar } from './domain';
import {
  apiHataMetni,
  blokGeriBildirimiMetni,
  kararCevrildiMi,
  kararMetni,
  raporMetinleri,
  type BlokGeriBildirimiIzi,
  type RaporIzi,
} from './gerekce';
import { en, tr } from './i18n';

/**
 * Gerekçenin iki dilde kurulması.
 *
 * Ürünün çekirdek vaadi "programın neden o program olduğunu da söyleriz". Cümle motorda
 * sabitliyken bu vaat yalnızca Türkçe kullanıcıya tutuluyordu; motor artık kural kimliği
 * ve parametre üretiyor, cümle burada kuruluyor.
 */

const hareketKarari = (uzat: Partial<Karar> = {}): Karar => ({
  id: 'gerekce-g0-barbell-squat',
  entity_tipi: 'hareket',
  entity_id: 'barbell-squat',
  kurallar: ['oncelikli_bolge', 'bilesik_cekirdek', 'sfr_yuksek'],
  girdiler: [{ soru_id: 'E3', deger: 'barbell' }],
  parametreler: { hareket_adi: 'Barbell squat', grup: 'quadriceps', patern: 'diz_baskin' },
  aciklama_tr: 'Barbell squat seçildi: motorun Türkçe izi.',
  ...uzat,
});

const havuzKarari = (uzat: Partial<Karar> = {}): Karar => ({
  id: 'havuz-eksenel_yuk_yasak',
  entity_tipi: 'havuz',
  entity_id: 'eksenel_yuk_yasak',
  kurallar: ['eksenel_yuk_yasak'],
  girdiler: [{ soru_id: 'S17', deger: '12 hareket' }],
  parametreler: { adet: 12 },
  aciklama_tr: 'Omurgana dikey yük bindiren hareketleri havuzdan çıkardım.',
  ...uzat,
});

describe('kararMetni — hareket', () => {
  it('Türkçe sözlükle Türkçe cümle kurar', () => {
    const metin = kararMetni(hareketKarari(), tr.gerekce);

    expect(metin).toContain('Ön bacak');
    expect(metin).toContain('Diz baskın');
  });

  /**
   * Hareket adı da İngilizce geliyor: ad katalog verisi (`ad_en`), sözlük verisi değil.
   * Cümleyi çevirip içine Türkçe hareket adı gömmek yarım çevrilmiş bir gerekçe olurdu.
   */
  it('İngilizce sözlükle İngilizce cümle kurar', () => {
    const metin = kararMetni(hareketKarari(), en.gerekce);

    expect(metin).toContain('Barbell Back Squat');
    expect(metin).toContain('Quads');
    expect(metin).toContain('Knee dominant');
  });

  it('Türkçede katalogtaki Türkçe ad kullanılıyor', () => {
    expect(kararMetni(hareketKarari(), tr.gerekce)).toContain('Barbell squat');
  });

  it('İngilizce cümlede Türkçe karakter kalmaz', () => {
    expect(/[çğıöşüÇĞİÖŞÜ]/.test(kararMetni(hareketKarari(), en.gerekce))).toBe(false);
  });

  it('her kural için bir gerekçe cümlesi var', () => {
    const karar = hareketKarari({
      kurallar: [
        'oncelikli_bolge',
        'izolasyon_tamamlayici',
        'sfr_yuksek',
        'kontrendikasyon_uyumlu',
        'kalabalik_salon_uyumlu',
      ],
    });

    const metin = kararMetni(karar, en.gerekce);

    // Beş kural, aralarında dört ayırıcı.
    expect(metin.split(',').length).toBe(5);
  });

  it('aynı girdi her zaman aynı cümleyi verir', () => {
    expect(kararMetni(hareketKarari(), tr.gerekce)).toBe(kararMetni(hareketKarari(), tr.gerekce));
  });
});

describe('kararMetni — havuz', () => {
  it('kural kimliğinden cümle kurar', () => {
    expect(kararMetni(havuzKarari(), en.gerekce)).toBe(en.gerekce.havuz.eksenel_yuk_yasak);
  });

  it('bilinmeyen kuralda adet cümlesine düşer', () => {
    const metin = kararMetni(
      havuzKarari({ kurallar: ['yeni_kural'], entity_id: 'yeni_kural' }),
      en.gerekce,
    );

    expect(metin).toBe(en.gerekce.havuz.varsayilan(12));
  });
});

describe('yedek davranışı', () => {
  /**
   * Çeviremediğimiz karar için cümle uydurmuyoruz; motorun Türkçe izini olduğu gibi
   * veriyoruz. Sağlık bağlamında yanlış bir gerekçe, yabancı dilde doğru bir gerekçeden
   * kötüdür.
   */
  it('parametresi olmayan karar Türkçe ize düşer', () => {
    const karar = hareketKarari({ parametreler: undefined });

    expect(kararMetni(karar, en.gerekce)).toBe(karar.aciklama_tr);
    expect(kararCevrildiMi(karar, en.gerekce)).toBe(false);
  });

  it('kapsam dışı karar türü Türkçe ize düşer', () => {
    const karar = hareketKarari({ entity_tipi: 'beslenme' });

    expect(kararMetni(karar, en.gerekce)).toBe(karar.aciklama_tr);
  });

  it('cümle hiçbir durumda boş dönmez', () => {
    for (const karar of [hareketKarari(), havuzKarari(), hareketKarari({ kurallar: [] })]) {
      expect(kararMetni(karar, en.gerekce).length).toBeGreaterThan(5);
    }
  });

  it('çevrilebilen kararda yedeğe düşmez', () => {
    expect(kararCevrildiMi(hareketKarari(), en.gerekce)).toBe(true);
    expect(kararCevrildiMi(havuzKarari(), en.gerekce)).toBe(true);
  });
});

describe('kararMetni — hacim', () => {
  const hacimKarari = (kural: string): Karar => ({
    id: `hacim-0-${kural}`,
    entity_tipi: 'hacim',
    entity_id: 'tum_gruplar',
    kurallar: [kural],
    girdiler: [{ soru_id: 'Y1', deger: '5 saat' }],
    aciklama_tr: 'Motorun Türkçe izi.',
  });

  it.each([
    'uyku_kisa',
    'stres_yuksek',
    'yas_50_ustu',
    'kalori_acigi_yuksek',
    'oncelikli_bolge',
    'memnun_bolge_koruma',
    'aktif_sakatlik',
  ])('%s kuralı iki dilde de cümleye çevriliyor', (kural) => {
    const karar = hacimKarari(kural);

    expect(kararCevrildiMi(karar, tr.gerekce)).toBe(true);
    expect(kararCevrildiMi(karar, en.gerekce)).toBe(true);
    expect(/[çğıöşüÇĞİÖŞÜ]/.test(kararMetni(karar, en.gerekce))).toBe(false);
  });

  /**
   * Motorun ürettiği her hacim kuralının burada bir karşılığı olmalı. Yeni kural ekleyip
   * sözlüğe yazmayan, sessizce Türkçe ize düşen bir gerekçe bırakır.
   */
  it('sözlükteki hacim kuralları motorunkilerle aynı', () => {
    const sozluk = Object.keys(tr.gerekce.hacim).sort();

    expect(Object.keys(en.gerekce.hacim).sort()).toEqual(sozluk);
  });
});

describe('kararMetni — ilerleme', () => {
  const ilerlemeKarari = (uzat: Partial<Karar> = {}): Karar => ({
    id: 'ilerleme-barbell-squat-h3',
    entity_tipi: 'ilerleme',
    entity_id: 'barbell-squat',
    kurallar: ['cift_ilerleme_basari'],
    girdiler: [{ soru_id: 'geri_bildirim', deger: 'kolaydi' }],
    parametreler: {
      hareket_adi: 'Barbell squat',
      kg: 82.5,
      tekrar: 8,
      artis: 2.5,
      vucut_agirligi: false,
    },
    aciklama_tr: 'Motorun Türkçe izi.',
    ...uzat,
  });

  it('yük artışını iki dilde de anlatır', () => {
    expect(kararMetni(ilerlemeKarari(), tr.gerekce)).toContain('82,5');
    expect(kararMetni(ilerlemeKarari(), en.gerekce)).toContain('82.5');
  });

  /**
   * Sayı biçimi de dile bağlı. "52,5 kg" yazıp İngilizce cümlenin içine koymak, çevrilmiş
   * görünen ama okunmayan bir metin üretir.
   */
  it('ondalık ayırıcı dile göre değişiyor', () => {
    expect(kararMetni(ilerlemeKarari(), tr.gerekce)).not.toContain('82.5');
    expect(kararMetni(ilerlemeKarari(), en.gerekce)).not.toContain('82,5');
  });

  it('vücut ağırlığı hareketinde tekrar cümlesi kurulur', () => {
    const karar = ilerlemeKarari({
      parametreler: { hareket_adi: 'Şınav', tekrar: 12, vucut_agirligi: true },
      entity_id: 'sinav',
    });

    expect(kararMetni(karar, en.gerekce)).toContain('12 reps');
  });

  it.each(['tekrar_tavani', 'cift_ilerleme_sabit', 'hacim_dusuruldu', 'agri_bildirimi', 'deload'])(
    '%s kuralı iki dilde de cümleye çevriliyor',
    (kural) => {
      const karar = ilerlemeKarari({ kurallar: [kural] });

      expect(kararCevrildiMi(karar, tr.gerekce)).toBe(true);
      expect(/[çğıöşüÇĞİÖŞÜ]/.test(kararMetni(karar, en.gerekce))).toBe(false);
    },
  );

  it('birden çok kural tek cümlede birleşir', () => {
    const karar = ilerlemeKarari({ kurallar: ['cift_ilerleme_sabit', 'hacim_dusuruldu'] });
    const metin = kararMetni(karar, en.gerekce);

    expect(metin).toContain('stays put');
    expect(metin).toContain('dropped one set');
  });
});

describe('raporMetinleri', () => {
  const iz = (uzat: Partial<RaporIzi> = {}): RaporIzi => ({
    durus_bayraklari: ['omuz_protraksiyonu', 'bas_one'],
    sinirlama_kodlari: ['fotograf_yok'],
    ozet_parametreleri: { kaynak: 'capraz', alt: 17, ust: 21, kiloKg: 82, boyCm: 178 },
    bel_boy: { uyari: true },
    ozet: 'Motorun Türkçe özeti.',
    durus: ['Türkçe duruş 1', 'Türkçe duruş 2'],
    sinirlamalar: ['Türkçe sınırlama'],
    feragat: 'Türkçe feragat.',
    ...uzat,
  });

  it('özet iki dilde de kuruluyor', () => {
    expect(raporMetinleri(iz(), tr.rapor.motor).ozet).toContain('17-21');
    expect(raporMetinleri(iz(), en.rapor.motor).ozet).toContain('17-21');
  });

  it('İngilizce raporda Türkçe karakter kalmıyor', () => {
    const sonuc = raporMetinleri(iz(), en.rapor.motor);
    const hepsi = [sonuc.ozet, ...sonuc.durus, ...sonuc.sinirlamalar, sonuc.feragat].join(' ');

    expect(/[çğıöşüÇĞİÖŞÜ]/.test(hepsi)).toBe(false);
  });

  it('bel/boy uyarısı iki dilde de kuruluyor', () => {
    expect(raporMetinleri(iz(), en.rapor.motor).belBoyMesaji).toBe(en.rapor.motor.belBoy.uyari);
    expect(raporMetinleri(iz({ bel_boy: { uyari: false } }), en.rapor.motor).belBoyMesaji).toBe(
      en.rapor.motor.belBoy.normal,
    );
  });

  it('veri yetersizse özet uydurulmuyor', () => {
    const sonuc = raporMetinleri(iz({ ozet_parametreleri: undefined }), en.rapor.motor);

    expect(sonuc.ozet).toBe(en.rapor.motor.ozet.veriYok);
  });

  /**
   * Kod çözülemezse motorun Türkçe metnine düşülür. Boş liste göstermek, kullanıcıya
   * "sende hiçbir duruş eğilimi yok" demek olurdu — yanlış bilgi.
   */
  it('bilinmeyen kodda Türkçe metne düşer, listeyi boşaltmaz', () => {
    const sonuc = raporMetinleri(iz({ durus_bayraklari: ['bilinmeyen_bayrak'] }), en.rapor.motor);

    expect(sonuc.durus).toEqual(['Türkçe duruş 1', 'Türkçe duruş 2']);
  });

  it('ölçüsü olmayan raporda bel/boy mesajı yok', () => {
    expect(raporMetinleri(iz({ bel_boy: undefined }), en.rapor.motor).belBoyMesaji).toBeUndefined();
  });
});

describe('blokGeriBildirimiMetni', () => {
  const iz = (uzat: Partial<BlokGeriBildirimiIzi> = {}): BlokGeriBildirimiIzi => ({
    anahtar: 'bakimKalorisi',
    degerler: { tdee: 2450 },
    metin: 'Motorun Türkçe metni.',
    ...uzat,
  });

  it('sayı taşıyan geri bildirim iki dilde de kuruluyor', () => {
    expect(blokGeriBildirimiMetni(iz(), tr.blokGeriBildirimi)).toContain('2450');
    expect(blokGeriBildirimiMetni(iz(), en.blokGeriBildirimi)).toContain('2450');
  });

  it('İngilizce geri bildirimde Türkçe karakter kalmıyor', () => {
    expect(/[çğıöşüÇĞİÖŞÜ]/.test(blokGeriBildirimiMetni(iz(), en.blokGeriBildirimi))).toBe(false);
  });

  /** Seviye adı sözlük verisi; motor yalnızca kodu taşır. */
  it('seviye kodu sözlükten ada çevriliyor', () => {
    const metin = blokGeriBildirimiMetni(
      iz({ anahtar: 'antrenmanYasi', degerler: { seviye: 'orta', alt: 12, ust: 18 } }),
      en.blokGeriBildirimi,
    );

    expect(metin).toContain('Intermediate');
    expect(metin).toContain('12-18');
  });

  it('toparlanma düzeltmesi sebepleri iki dilde de sıralıyor', () => {
    const metin = blokGeriBildirimiMetni(
      iz({ anahtar: 'toparlanmaDuzeltme', degerler: { oran: 22, uykuKisa: 1, stres: 1 } }),
      en.blokGeriBildirimi,
    );

    expect(metin).toContain('sleep is short');
    expect(metin).toContain('stress is high');
    expect(metin).toContain('22');
  });

  /** Bilinmeyen anahtarda cümle uydurmuyoruz. */
  it('bilinmeyen anahtar Türkçe metne düşer', () => {
    expect(
      blokGeriBildirimiMetni(iz({ anahtar: 'yok_boyle_bir_anahtar' }), en.blokGeriBildirimi),
    ).toBe('Motorun Türkçe metni.');
  });
});

describe('apiHataMetni', () => {
  it('kodu bilinen hata iki dilde de kuruluyor', () => {
    const hata = { kod: 'program_yok', mesaj: 'Henüz bir programın yok.' };

    expect(apiHataMetni(hata, tr.apiHatalari)).toBe(tr.apiHatalari.program_yok());
    expect(apiHataMetni(hata, en.apiHatalari)).toBe(en.apiHatalari.program_yok());
  });

  it('parametreli hata değerleri cümleye giriyor', () => {
    const metin = apiHataMetni(
      { kod: 'koc_kotasi_doldu', mesaj: 'tr', degerler: { hak: 60, yenilenme: '1 Eylül' } },
      en.apiHatalari,
    );

    expect(metin).toContain('60');
    expect(metin).toContain('1 Eylül');
  });

  /**
   * Kodu çözemezsek sunucunun Türkçe mesajına düşüyoruz. Genel bir cümleye düşmek
   * ("Bir şeyler ters gitti") bilgiyi atmak olurdu.
   */
  it('bilinmeyen kod sunucu mesajına düşer', () => {
    expect(apiHataMetni({ kod: 'yeni_kod', mesaj: 'Sunucunun mesajı.' }, en.apiHatalari)).toBe(
      'Sunucunun mesajı.',
    );
  });

  it('kodu olmayan hata da mesajına düşer', () => {
    expect(apiHataMetni({ mesaj: 'Sunucunun mesajı.' }, en.apiHatalari)).toBe('Sunucunun mesajı.');
  });

  it('İngilizce hata metinlerinde Türkçe karakter yok', () => {
    for (const [anahtar, uretici] of Object.entries(en.apiHatalari)) {
      const metin = (uretici as (d: Record<string, string | number>) => string)({
        hak: 1,
        yenilenme: '1 September',
      });

      expect(/[çğıöşüÇĞİÖŞÜ]/.test(metin), anahtar).toBe(false);
    }
  });

  /** İki sözlük aynı kod kümesini taşımalı; eksik kod sessizce Türkçeye düşer. */
  it('iki sözlükte aynı hata kodları var', () => {
    expect(Object.keys(en.apiHatalari).sort()).toEqual(Object.keys(tr.apiHatalari).sort());
  });
});
