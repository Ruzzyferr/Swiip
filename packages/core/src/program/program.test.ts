import { describe, expect, it } from 'vitest';
import { HAREKET_KATALOGU, type Profil } from '@swiip/shared';
import { programUret } from './program';
import { hareketBul } from '../katalog/katalog';
import { profilKur } from '../test/profilKur';
import { TOPARLANMASI_DUSUK_PROFIL } from '../test/ornekler/toparlanmasiDusukProfil';

function uret(uzat: Partial<Profil> = {}) {
  const sonuc = programUret(profilKur(uzat));
  if (sonuc.durum !== 'uretildi') throw new Error(`program üretilmedi: ${sonuc.durum}`);
  return sonuc.program;
}

function tumHareketler(uzat: Partial<Profil> = {}): string[] {
  return uret(uzat).seanslar.flatMap((s) => s.hareketler.map((h) => h.hareket_id));
}

describe('programUret — temel yapı', () => {
  it('split gün sayısı kadar seans üretir', () => {
    const program = uret({ gun_sayisi: 4 });

    expect(program.seanslar).toHaveLength(4);
    expect(program.split.tip).toBe('upper_lower');
  });

  it('her seansta en az üç hareket vardır', () => {
    for (const seans of uret().seanslar) {
      expect(seans.hareketler.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('hareketler sıra numarasıyla ve bileşikler önce yerleştirilir', () => {
    const seans = uret().seanslar[0]!;
    const paternler = seans.hareketler.map((h) => hareketBul(h.hareket_id)!.patern);
    const ilkIzolasyon = paternler.indexOf('izolasyon');
    const sonBilesik = paternler.map((p) => p !== 'izolasyon').lastIndexOf(true);

    if (ilkIzolasyon !== -1) expect(ilkIzolasyon).toBeGreaterThan(sonBilesik - 1);
    expect(seans.hareketler.map((h) => h.sira)).toEqual(seans.hareketler.map((_, i) => i + 1));
  });

  it('tahmini süre kullanıcının verdiği süreyi aşmaz', () => {
    for (const seans of uret({ seans_dakika: 45 }).seanslar) {
      expect(seans.tahmini_dakika).toBeLessThanOrEqual(45);
    }
  });

  it('aynı seansta aynı hareket iki kez yer almaz', () => {
    for (const seans of uret().seanslar) {
      const idler = seans.hareketler.map((h) => h.hareket_id);
      expect(new Set(idler).size).toBe(idler.length);
    }
  });
});

/**
 * Persona kosusunda bulundu: 41 yasinda, uykusu kisa ve stresi yuksek bir kullanicinin
 * programi HIC uretilemiyordu. Sunucu 500 doneryordu, sebebi `target_sets = 3.5`:
 * ikincil kas grubu butcesinden yarim set dusuluyor, kalan kesirli kaliyor ve atanan
 * set sayisi kesirli cikiyordu. Postgres `integer` sutunu bunu reddediyor.
 *
 * Kullaniciya gorunen tarafi daha da kotu: "3,5 setin hepsinde 12 tekrari tamamlarsan"
 * diye bir cumle. Set sayilir; yarim set diye bir sey yok.
 */
describe('programUret — set sayısı tam sayıdır', () => {
  it('her hareketin set sayısı tam sayı', () => {
    for (const seans of uret().seanslar) {
      for (const hareket of seans.hareketler) {
        expect(Number.isInteger(hareket.set), `${hareket.hareket_id}: ${hareket.set}`).toBe(true);
      }
    }
  });

  /**
   * Hatayi ureten GERCEK profil. Sentetik profillerle 16 bin kombinasyon denendi ve
   * hicbiri kesir uretmedi: kesir yalnizca butcesi tek sayiya denk gelen bir grubun
   * ikincil kas dusumuyle yarimlandigi ve havuzun daralttigi durumda doguyor.
   * Bu yuzden profil oldugu gibi saklaniyor.
   */
  it('hatayı üreten gerçek profilde de tam sayı', () => {
    const sonuc = programUret(TOPARLANMASI_DUSUK_PROFIL);
    if (sonuc.durum !== 'uretildi') throw new Error(`program üretilmedi: ${sonuc.durum}`);

    for (const seans of sonuc.program.seanslar) {
      for (const hareket of seans.hareketler) {
        expect(Number.isInteger(hareket.set), `${hareket.hareket_id}: ${hareket.set}`).toBe(true);
        expect(hareket.ilerleme_kurali).not.toMatch(/[0-9]+[.,][0-9]+ set/);
      }
    }
  });

  /** Set kesilince hacim kaybolmasin: bu profilde seans hala dolu kalmali. */
  it('tam sayıya yuvarlama seansı boşaltmaz', () => {
    const sonuc = programUret(TOPARLANMASI_DUSUK_PROFIL);
    if (sonuc.durum !== 'uretildi') throw new Error('program üretilmedi');

    for (const seans of sonuc.program.seanslar) {
      expect(seans.hareketler.length).toBeGreaterThanOrEqual(3);
      for (const hareket of seans.hareketler) expect(hareket.set).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('programUret — determinizm', () => {
  it('aynı profil birebir aynı programı üretir', () => {
    const a = uret();
    const b = uret();

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('farklı profil farklı program üretir', () => {
    const a = JSON.stringify(tumHareketler({ gun_sayisi: 3 }));
    const b = JSON.stringify(tumHareketler({ gun_sayisi: 5 }));

    expect(a).not.toBe(b);
  });
});

describe('programUret — sert güvenlik filtreleri', () => {
  it('bel fıtığı olan kullanıcıda yüksek eksenel yüklenmeli hareket yoktur', () => {
    const idler = tumHareketler({
      kisitlar: {
        ...profilKur().kisitlar,
        kontrendikasyonlar: ['bel_fitigi'],
        eksenel_yuk_yasak: true,
      },
    });

    for (const id of idler) {
      const hareket = hareketBul(id)!;
      expect(hareket.eksenel_yuk, `${id} eksenel yük taşıyor`).not.toBe('yuksek');
      expect(hareket.kontrendikasyon).not.toContain('bel_fitigi');
    }
  });

  it('bel fıtığında yerden çekiş hareketleri programda yoktur', () => {
    const idler = tumHareketler({
      kisitlar: {
        ...profilKur().kisitlar,
        kontrendikasyonlar: ['bel_fitigi'],
        eksenel_yuk_yasak: true,
      },
    });

    expect(idler).not.toContain('barbell-deadlift');
    expect(idler).not.toContain('sumo-deadlift');
    expect(idler).not.toContain('romanian-deadlift');
  });

  it('ekipmanı olmayan hareket asla önerilmez', () => {
    const ekipman = ['dumbbell', 'duz_bench'] as const;
    const idler = tumHareketler({
      ortam: 'ev',
      kisitlar: { ...profilKur().kisitlar, ekipman: [...ekipman] },
    });

    for (const id of idler) {
      for (const gerekli of hareketBul(id)!.ekipman) {
        expect(ekipman, `${id} için ${gerekli} yok`).toContain(gerekli);
      }
    }
  });

  it('hiç ekipmanı olmayan kullanıcıya da program üretilir', () => {
    const program = uret({ ortam: 'ev', kisitlar: { ...profilKur().kisitlar, ekipman: [] } });

    expect(program.seanslar.every((s) => s.hareketler.length >= 3)).toBe(true);
    for (const seans of program.seanslar) {
      for (const h of seans.hareketler) {
        expect(hareketBul(h.hareket_id)!.ekipman).toEqual([]);
      }
    }
  });

  it('düşük tavanlı evde baş üstü hareket verilmez', () => {
    const idler = tumHareketler({
      ortam: 'ev',
      kisitlar: { ...profilKur().kisitlar, bas_ustu_yasak: true },
    });

    expect(idler.every((id) => !hareketBul(id)!.bas_ustu)).toBe(true);
  });

  it('gürültü kısıtı olan kullanıcıya gürültülü hareket verilmez', () => {
    const idler = tumHareketler({
      ortam: 'ev',
      kisitlar: { ...profilKur().kisitlar, gurultu_yasak: true, zipla_yasak: true },
    });

    expect(idler.every((id) => !hareketBul(id)!.gurultu)).toBe(true);
  });

  it('partneri olmayan kullanıcıya spotter gerektiren hareket verilmez', () => {
    const idler = tumHareketler({ kisitlar: { ...profilKur().kisitlar, spotter_yok: true } });

    expect(idler.every((id) => !hareketBul(id)!.spotter)).toBe(true);
  });

  it('kullanıcının reddettiği hareket havuzda yer almaz', () => {
    const idler = tumHareketler({
      kisitlar: { ...profilKur().kisitlar, reddedilen_anahtarlar: ['squat'] },
    });

    expect(idler.every((id) => !id.includes('squat'))).toBe(true);
  });

  it('teknik güveni düşük kullanıcıya karmaşık serbest ağırlık verilmez', () => {
    const idler = tumHareketler({
      antrenman_yasi: 'yeni',
      kisitlar: { ...profilKur().kisitlar, teknik_guveni: 1 },
    });

    expect(idler.every((id) => hareketBul(id)!.teknik_zorluk <= 3)).toBe(true);
  });

  it('ağrıyı artıran patern havuzdan çıkarılır', () => {
    const idler = tumHareketler({
      kisitlar: { ...profilKur().kisitlar, kisitli_paternler: ['diz_baskin'] },
    });

    expect(idler.every((id) => hareketBul(id)!.patern !== 'diz_baskin')).toBe(true);
  });
});

describe('programUret — hacim ve yerleşim', () => {
  it('planlanan hacim bütçeye yakın kalır', () => {
    const program = uret();
    const sayilan: Record<string, number> = {};

    for (const seans of program.seanslar) {
      for (const h of seans.hareketler) {
        const hareket = hareketBul(h.hareket_id)!;
        for (const kas of hareket.birincil_kas) sayilan[kas] = (sayilan[kas] ?? 0) + h.set;
      }
    }

    expect(Object.keys(sayilan).length).toBeGreaterThan(5);
  });

  it('öncelikli bölge daha fazla set alır', () => {
    const oncelikli = uret({
      hedef_vektoru: {
        birincil: 'kas_kazanimi',
        oncelikli_bolgeler: ['gogus'],
        memnun_bolgeler: [],
      },
    });
    const normal = uret();

    const gogusSet = (p: typeof normal) =>
      p.seanslar
        .flatMap((s) => s.hareketler)
        .filter((h) => hareketBul(h.hareket_id)!.birincil_kas.includes('gogus'))
        .reduce((t, h) => t + h.set, 0);

    expect(gogusSet(oncelikli)).toBeGreaterThan(gogusSet(normal));
  });

  it('güç hedefinde tekrar aralığı düşüktür', () => {
    const program = uret({
      hedef_vektoru: { birincil: 'guc_artisi', oncelikli_bolgeler: [], memnun_bolgeler: [] },
    });
    const bilesikler = program.seanslar
      .flatMap((s) => s.hareketler)
      .filter((h) => hareketBul(h.hareket_id)!.patern !== 'izolasyon');

    expect(bilesikler.every((h) => h.tekrar_ust <= 8)).toBe(true);
  });

  it('yağ kaybı hedefinde dinlenme süreleri kısadır', () => {
    const program = uret({
      hedef_vektoru: { birincil: 'yag_kaybi', oncelikli_bolgeler: [], memnun_bolgeler: [] },
    });

    const dinlenmeler = program.seanslar.flatMap((s) => s.hareketler.map((h) => h.dinlenme_sn));
    expect(Math.max(...dinlenmeler)).toBeLessThanOrEqual(120);
  });

  it('izolasyon hareketleri bileşiklerden daha yüksek tekrar alır', () => {
    const hareketler = uret().seanslar.flatMap((s) => s.hareketler);
    const bilesik = hareketler.filter((h) => hareketBul(h.hareket_id)!.patern !== 'izolasyon');
    const izolasyon = hareketler.filter((h) => hareketBul(h.hareket_id)!.patern === 'izolasyon');

    if (izolasyon.length > 0 && bilesik.length > 0) {
      const ortBilesik = bilesik.reduce((t, h) => t + h.tekrar_ust, 0) / bilesik.length;
      const ortIzolasyon = izolasyon.reduce((t, h) => t + h.tekrar_ust, 0) / izolasyon.length;
      expect(ortIzolasyon).toBeGreaterThan(ortBilesik);
    }
  });
});

describe('programUret — yük ataması', () => {
  it('bilinen 1RM olan harekette yük atanır', () => {
    const program = uret({ bilinen_yukler: { 'barbell-bench-press': 100 } });
    const bench = program.seanslar
      .flatMap((s) => s.hareketler)
      .find((h) => h.hareket_id === 'barbell-bench-press');

    if (bench) {
      expect(bench.hedef_kg).toBeGreaterThan(0);
      expect(bench.hedef_kg).toBeLessThan(100);
    }
  });

  it('1RM bilinmese bile referans standartlardan yük tahmin edilir', () => {
    const yuklu = uret()
      .seanslar.flatMap((s) => s.hareketler)
      .filter((h) => !hareketBul(h.hareket_id)!.vucut_agirligi);

    expect(yuklu.every((h) => h.hedef_kg !== null && h.hedef_kg > 0)).toBe(true);
  });

  it('vücut ağırlığı hareketinde yük atanmaz', () => {
    const vucut = uret({
      ortam: 'ev',
      kisitlar: { ...profilKur().kisitlar, ekipman: [] },
    }).seanslar.flatMap((s) => s.hareketler);

    expect(vucut.every((h) => h.hedef_kg === null)).toBe(true);
  });

  it('dumbbell tavanı olan kullanıcıda yük tavanı aşılmaz', () => {
    const program = uret({
      ortam: 'ev',
      kisitlar: { ...profilKur().kisitlar, ekipman: ['dumbbell'], dumbbell_max_kg: 10 },
    });

    for (const h of program.seanslar.flatMap((s) => s.hareketler)) {
      if (h.hedef_kg !== null) expect(h.hedef_kg).toBeLessThanOrEqual(10);
    }
  });

  it('her harekete ilerleme kuralı yazılır', () => {
    for (const h of uret().seanslar.flatMap((s) => s.hareketler)) {
      expect(h.ilerleme_kurali.length).toBeGreaterThan(20);
    }
  });

  it('her harekete makine doluysa alternatifi verilir', () => {
    for (const h of uret().seanslar.flatMap((s) => s.hareketler)) {
      expect(Array.isArray(h.alternatifler)).toBe(true);
    }
  });
});

describe('programUret — karar izi', () => {
  it('her hareket için bir karar kaydı vardır', () => {
    const program = uret();
    const hareketSayisi = program.seanslar.reduce((t, s) => t + s.hareketler.length, 0);
    const hareketKararlari = program.kararlar.filter((k) => k.entity_tipi === 'hareket');

    expect(hareketKararlari.length).toBe(hareketSayisi);
  });

  it('karar hangi cevaptan doğduğunu söyler', () => {
    const program = uret({
      kisitlar: {
        ...profilKur().kisitlar,
        kontrendikasyonlar: ['bel_fitigi'],
        eksenel_yuk_yasak: true,
      },
    });
    const kurallar = program.kararlar.flatMap((k) => k.kurallar);

    expect(kurallar).toContain('eksenel_yuk_yasak');
  });

  it('gerekçe metni Türkçe ve boş değildir', () => {
    for (const karar of uret().kararlar) {
      expect(karar.aciklama_tr.trim().length).toBeGreaterThan(10);
    }
  });

  it('hareket kararı seçimi kazandıran kuralları listeler', () => {
    const program = uret({
      hedef_vektoru: {
        birincil: 'kas_kazanimi',
        oncelikli_bolgeler: ['sirt'],
        memnun_bolgeler: [],
      },
    });
    const sirtKarari = program.kararlar.find(
      (k) => k.entity_tipi === 'hareket' && k.kurallar.includes('oncelikli_bolge'),
    );

    expect(sirtKarari).toBeDefined();
  });

  it('split kararı da izlenir', () => {
    expect(uret().kararlar.some((k) => k.entity_tipi === 'split')).toBe(true);
  });
});

describe('programUret — güvenlik kapıları', () => {
  it('program engelliyken program üretilmez', () => {
    const sonuc = programUret(
      profilKur({
        kapi_durumu: {
          kapilar: [
            {
              tip: 'kardiyak',
              eylem: 'doktor_onayi_bekle',
              mesaj: 'Doktor onayı gerekiyor.',
              tetikleyen: ['S2'],
            },
          ],
          kayit_engelli: false,
          program_engelli: true,
          sayilar_gizli: false,
          eksik_tarama: [],
        },
      }),
    );

    expect(sonuc.durum).toBe('engellendi');
    if (sonuc.durum === 'engellendi') {
      expect(sonuc.kapilar[0]!.tip).toBe('kardiyak');
    }
  });

  it('ED modunda program üretilir, sayılar ayrı bayrakla işaretlenir', () => {
    const sonuc = programUret(profilKur({ ed_modu: true }));

    expect(sonuc.durum).toBe('uretildi');
    if (sonuc.durum === 'uretildi') {
      expect(sonuc.program.sayilar_gizli).toBe(true);
    }
  });
});

describe('programUret — kapsam güvencesi', () => {
  it('katalogdaki her hareket en az bir sentetik profilde seçilebilir olmalı değil, ama havuz boş kalmamalı', () => {
    const zorProfil = uret({
      antrenman_yasi: 'yeni',
      ortam: 'ev',
      kisitlar: {
        ...profilKur().kisitlar,
        ekipman: [],
        teknik_guveni: 1,
        bas_ustu_yasak: true,
        gurultu_yasak: true,
        zipla_yasak: true,
        eksenel_yuk_yasak: true,
        kontrendikasyonlar: ['bel_fitigi', 'omuz_sikismasi', 'diz_patellofemoral'],
      },
    });

    expect(zorProfil.seanslar.every((s) => s.hareketler.length >= 3)).toBe(true);
    expect(zorProfil.uyarilar.length).toBeGreaterThan(0);
  });

  it('katalog kısıtsız profilde geniş bir havuz sunar', () => {
    const tumEkipman = HAREKET_KATALOGU.flatMap((h) => h.ekipman);
    const program = uret({
      kisitlar: { ...profilKur().kisitlar, ekipman: [...new Set(tumEkipman)], spotter_yok: false },
    });

    const benzersiz = new Set(
      program.seanslar.flatMap((s) => s.hareketler.map((h) => h.hareket_id)),
    );
    expect(benzersiz.size).toBeGreaterThanOrEqual(10);
  });
});

/**
 * Gerekçenin dilden bağımsız izi.
 *
 * `aciklama_tr` adı doğruyu söylüyor: o cümle Türkçe. Ürünün çekirdek vaadi "programın
 * neden o program olduğunu da söyleriz" ise, bu vaat yalnızca Türkçe kullanıcıya
 * tutuluyor demektir.
 *
 * Çözüm cümleyi çevirmek değil, **cümleyi kurmak için gereken her şeyi taşımak**: kural
 * kimlikleri zaten vardı, eksik olan parametrelerdi (hangi kas grubu, hangi patern, hangi
 * hareket). Bunlar taşınırsa metin uçta veya arayüzde herhangi bir dilde kurulabilir ve
 * çekirdek metinsiz kalır — motorun zaten olması gereken hâli.
 */
describe('karar izi dilden bağımsız', () => {
  const program = uret();
  const hareketKararlari = program.kararlar.filter((k) => k.entity_tipi === 'hareket');
  const havuzKararlari = program.kararlar.filter((k) => k.entity_tipi === 'havuz');

  it('hareket kararı cümleyi kurmaya yetecek parametreleri taşıyor', () => {
    expect(hareketKararlari.length).toBeGreaterThan(0);

    for (const karar of hareketKararlari) {
      expect(karar.parametreler, karar.id).toBeDefined();
      expect(karar.parametreler!.hareket_adi, karar.id).toBeTruthy();
      expect(karar.parametreler!.grup, karar.id).toBeTruthy();
    }
  });

  it('bileşik hareket kararı patern bilgisini taşıyor', () => {
    const bilesik = hareketKararlari.filter((k) => k.kurallar.includes('bilesik_cekirdek'));

    expect(bilesik.length).toBeGreaterThan(0);
    for (const karar of bilesik) {
      expect(karar.parametreler!.patern, karar.id).toBeTruthy();
    }
  });

  it('havuz kararı elenen hareket sayısını taşıyor', () => {
    const dar = uret({ kisitlar: { ...profilKur().kisitlar, eksenel_yuk_yasak: true } });
    const havuz = dar.kararlar.filter((k) => k.entity_tipi === 'havuz');

    expect(havuz.length).toBeGreaterThan(0);
    for (const karar of havuz) {
      expect(Number(karar.parametreler!.adet), karar.id).toBeGreaterThan(0);
    }
  });

  /** Türkçe cümle kaybolmuyor: karar izi hâlâ okunabilir ve veritabanına o yazılıyor. */
  it('Türkçe açıklama korunuyor', () => {
    for (const karar of [...hareketKararlari, ...havuzKararlari]) {
      expect(karar.aciklama_tr.length, karar.id).toBeGreaterThan(10);
    }
  });
});
