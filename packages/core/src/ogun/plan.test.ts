import { describe, expect, it } from 'vitest';
import {
  alisverisListesi,
  desteHazirla,
  kaydirmaOgren,
  makroKilidi,
  ogunHedefleriniBol,
  porsiyonKatsayisi,
  tarifleriFiltrele,
  type OgunKisitlari,
  type Ogrenme,
  type Tarif,
} from './plan';

const tarifler: Tarif[] = [
  {
    id: 'mercimek-corbasi',
    ad: 'Mercimek çorbası',
    malzemeler: [
      { ad: 'kırmızı mercimek', gram: 60, reyon: 'kuru_gida' },
      { ad: 'soğan', gram: 50, reyon: 'manav' },
      { ad: 'zeytinyağı', gram: 10, reyon: 'kuru_gida' },
    ],
    makrolar: { kalori: 320, protein_g: 16, yag_g: 11, karbonhidrat_g: 40, lif_g: 8 },
    maliyet_kademesi: 1,
    hazirlik_dakika: 25,
    etiketler: ['vejetaryen', 'vegan', 'glutensiz', 'laktozsuz', 'corba'],
    adimlar_tr: ['Mercimeği yıka.', 'Soğanı kavur.', 'Kaynat ve blenderdan geçir.'],
    insan_kontrollu: true,
  },
  {
    id: 'tavuklu-bulgur-pilavi',
    ad: 'Tavuklu bulgur pilavı',
    malzemeler: [
      { ad: 'tavuk göğsü', gram: 150, reyon: 'kasap' },
      { ad: 'bulgur', gram: 80, reyon: 'kuru_gida' },
      { ad: 'domates', gram: 60, reyon: 'manav' },
    ],
    makrolar: { kalori: 520, protein_g: 45, yag_g: 12, karbonhidrat_g: 55, lif_g: 8 },
    maliyet_kademesi: 2,
    hazirlik_dakika: 30,
    etiketler: ['glutenli', 'laktozsuz', 'ana_yemek'],
    adimlar_tr: ['Tavuğu doğra.', 'Bulguru pişir.'],
    insan_kontrollu: true,
  },
  {
    id: 'yogurtlu-mantı',
    ad: 'Yoğurtlu mantı',
    malzemeler: [
      { ad: 'mantı', gram: 150, reyon: 'sarkuteri' },
      { ad: 'yoğurt', gram: 120, reyon: 'sarkuteri' },
    ],
    makrolar: { kalori: 540, protein_g: 22, yag_g: 18, karbonhidrat_g: 70, lif_g: 3 },
    maliyet_kademesi: 2,
    hazirlik_dakika: 20,
    etiketler: ['glutenli', 'laktozlu', 'ana_yemek'],
    adimlar_tr: ['Mantıyı haşla.', 'Yoğurdu üzerine gez.'],
    insan_kontrollu: true,
  },
  {
    id: 'somon-firinda',
    ad: 'Fırında somon',
    malzemeler: [
      { ad: 'somon', gram: 180, reyon: 'balikci' },
      { ad: 'brokoli', gram: 150, reyon: 'manav' },
    ],
    makrolar: { kalori: 510, protein_g: 42, yag_g: 28, karbonhidrat_g: 12, lif_g: 5 },
    maliyet_kademesi: 4,
    hazirlik_dakika: 35,
    etiketler: ['glutensiz', 'laktozsuz', 'ana_yemek', 'balik'],
    adimlar_tr: ['Somonu fırınla.', 'Brokoliyi buğula.'],
    insan_kontrollu: true,
  },
  {
    id: 'menemen',
    ad: 'Menemen',
    malzemeler: [
      { ad: 'yumurta', gram: 100, reyon: 'sarkuteri' },
      { ad: 'domates', gram: 120, reyon: 'manav' },
      { ad: 'biber', gram: 60, reyon: 'manav' },
    ],
    makrolar: { kalori: 300, protein_g: 18, yag_g: 21, karbonhidrat_g: 9, lif_g: 3 },
    maliyet_kademesi: 1,
    hazirlik_dakika: 12,
    etiketler: ['vejetaryen', 'glutensiz', 'laktozsuz', 'kahvalti'],
    adimlar_tr: ['Sebzeleri kavur.', 'Yumurtayı kır.'],
    insan_kontrollu: true,
  },
  {
    id: 'nohut-yemegi',
    ad: 'Nohut yemeği',
    malzemeler: [
      { ad: 'nohut', gram: 120, reyon: 'kuru_gida' },
      { ad: 'soğan', gram: 40, reyon: 'manav' },
    ],
    makrolar: { kalori: 480, protein_g: 24, yag_g: 14, karbonhidrat_g: 62, lif_g: 18 },
    maliyet_kademesi: 1,
    hazirlik_dakika: 40,
    etiketler: ['vejetaryen', 'vegan', 'glutensiz', 'laktozsuz', 'ana_yemek'],
    adimlar_tr: ['Nohutu haşla.', 'Sos hazırla.'],
    insan_kontrollu: true,
  },
];

const temelKisit: OgunKisitlari = {
  alerjiler: [],
  intoleranslar: [],
  dini_etik: [],
  sevmedikleri: [],
  vazgecemedikleri: [],
  butce_kademesi: 4,
  maks_hazirlik_dakika: 60,
  kim_pisiriyor: 'kendim',
  ramazan: false,
};

describe('tarifleriFiltrele — sert kısıtlar', () => {
  it('alerjisi olan malzeme hiçbir tarifte çıkmaz', () => {
    const sonuc = tarifleriFiltrele(tarifler, { ...temelKisit, alerjiler: ['yumurta'] });

    expect(sonuc.map((t) => t.id)).not.toContain('menemen');
  });

  it('alerji eşleşmesi malzeme adının içinde de aranır', () => {
    const sonuc = tarifleriFiltrele(tarifler, { ...temelKisit, alerjiler: ['balık'] });

    expect(sonuc.map((t) => t.id)).not.toContain('somon-firinda');
  });

  it('vegan kısıtı hayvansal ürün içeren tarifleri eler', () => {
    const sonuc = tarifleriFiltrele(tarifler, { ...temelKisit, dini_etik: ['vegan'] });

    expect(sonuc.every((t) => t.etiketler.includes('vegan'))).toBe(true);
  });

  it('vejetaryen kısıtı et ve balığı eler ama yumurtaya izin verir', () => {
    const sonuc = tarifleriFiltrele(tarifler, { ...temelKisit, dini_etik: ['vejetaryen'] });
    const idler = sonuc.map((t) => t.id);

    expect(idler).toContain('menemen');
    expect(idler).not.toContain('tavuklu-bulgur-pilavi');
  });

  it('laktoz intoleransı laktozlu tarifi eler', () => {
    const sonuc = tarifleriFiltrele(tarifler, { ...temelKisit, intoleranslar: ['laktoz'] });

    expect(sonuc.map((t) => t.id)).not.toContain('yogurtlu-mantı');
  });

  it('gluten intoleransı glutenli tarifi eler', () => {
    const sonuc = tarifleriFiltrele(tarifler, { ...temelKisit, intoleranslar: ['gluten'] });

    expect(sonuc.every((t) => !t.etiketler.includes('glutenli'))).toBe(true);
  });

  it('bütçe kısıtı pahalı protein önermez', () => {
    const sonuc = tarifleriFiltrele(tarifler, { ...temelKisit, butce_kademesi: 2 });

    expect(sonuc.map((t) => t.id)).not.toContain('somon-firinda');
  });

  it('pişirme süresi tavanı aşan tarif elenir', () => {
    const sonuc = tarifleriFiltrele(tarifler, { ...temelKisit, maks_hazirlik_dakika: 15 });

    expect(sonuc.map((t) => t.id)).toEqual(['menemen']);
  });

  it('sevmediği yiyecek yumuşak filtredir, listeyi boşaltmaz', () => {
    const sonuc = tarifleriFiltrele(tarifler, { ...temelKisit, sevmedikleri: ['nohut'] });

    expect(sonuc.map((t) => t.id)).not.toContain('nohut-yemegi');
    expect(sonuc.length).toBeGreaterThan(0);
  });

  it('insan kontrolünden geçmemiş et tarifi asla listeye girmez', () => {
    const kontrolsuz: Tarif = {
      ...tarifler[1]!,
      id: 'kontrolsuz-tavuk',
      insan_kontrollu: false,
    };
    const sonuc = tarifleriFiltrele([...tarifler, kontrolsuz], temelKisit);

    expect(sonuc.map((t) => t.id)).not.toContain('kontrolsuz-tavuk');
  });

  it('kısıt yoksa tüm tarifler kalır', () => {
    expect(tarifleriFiltrele(tarifler, temelKisit)).toHaveLength(tarifler.length);
  });
});

describe('ogunHedefleriniBol', () => {
  const gunluk = { kalori: 2400, protein_g: 160, yag_g: 70, karbonhidrat_g: 260, lif_g: 34 };

  it('öğün sayısına göre böler ve toplam korunur', () => {
    const ogunler = ogunHedefleriniBol(gunluk, 3, false);
    const toplam = ogunler.reduce((t, o) => t + o.hedef.kalori, 0);

    expect(ogunler).toHaveLength(3);
    expect(Math.abs(toplam - gunluk.kalori)).toBeLessThanOrEqual(3);
  });

  it('kahvaltı öğle ve akşamdan daha küçüktür', () => {
    const ogunler = ogunHedefleriniBol(gunluk, 3, false);

    expect(ogunler[0]!.hedef.kalori).toBeLessThan(ogunler[2]!.hedef.kalori);
  });

  it('Ramazan modunda öğün penceresi iftar ve sahura kayar', () => {
    const ogunler = ogunHedefleriniBol(gunluk, 3, true);

    expect(ogunler.map((o) => o.ad)).toEqual(['Sahur', 'İftar', 'İftar sonrası']);
  });

  it('Ramazan modunda iftar en büyük öğündür', () => {
    const ogunler = ogunHedefleriniBol(gunluk, 3, true);

    expect(ogunler[1]!.hedef.kalori).toBeGreaterThan(ogunler[0]!.hedef.kalori);
  });

  it('tek öğünde tüm hedef o öğüne yazılır', () => {
    expect(ogunHedefleriniBol(gunluk, 1, false)[0]!.hedef.kalori).toBe(2400);
  });
});

describe('makroKilidi', () => {
  const hedef = { kalori: 520, protein_g: 35, yag_g: 22, karbonhidrat_g: 45, lif_g: 8 };

  it('hedefin yüzde 8 içindeki tarifi kabul eder', () => {
    expect(makroKilidi(tarifler[1]!, hedef)).toBe(true);
  });

  it('kalorisi çok uzak tarifi reddeder', () => {
    expect(makroKilidi(tarifler[4]!, hedef)).toBe(false);
  });

  it('kalori tutsa bile protein çok düşükse reddeder', () => {
    const sahte: Tarif = {
      ...tarifler[0]!,
      makrolar: { kalori: 520, protein_g: 5, yag_g: 22, karbonhidrat_g: 90, lif_g: 4 },
    };

    expect(makroKilidi(sahte, hedef)).toBe(false);
  });
});

describe('desteHazirla — kaydırmalı öğün değiştirme', () => {
  const hedef = { kalori: 520, protein_g: 35, yag_g: 22, karbonhidrat_g: 45, lif_g: 8 };

  it('deste makro kilidini koruyan tariflerden oluşur', () => {
    const deste = desteHazirla({ tarifler, hedef, kisitlar: temelKisit });

    expect(deste.kartlar.every((k) => makroKilidi(k, hedef))).toBe(true);
  });

  it('deste sonsuz değildir', () => {
    const deste = desteHazirla({ tarifler, hedef, kisitlar: temelKisit });

    expect(deste.kartlar.length).toBeLessThanOrEqual(15);
  });

  it('dolap envanteri verilirse yalnızca yapılabilenler gelir', () => {
    const deste = desteHazirla({
      tarifler,
      hedef,
      kisitlar: temelKisit,
      envanter: ['tavuk göğsü', 'bulgur', 'domates'],
    });

    expect(deste.kartlar.map((k) => k.id)).toEqual(['tavuklu-bulgur-pilavi']);
  });

  it('boş destede eksik malzeme önerisi çıkar', () => {
    const deste = desteHazirla({
      tarifler,
      hedef,
      kisitlar: temelKisit,
      envanter: ['tuz'],
    });

    expect(deste.kartlar).toHaveLength(0);
    expect(deste.eksik_malzeme_onerisi.length).toBeGreaterThan(0);
    expect(deste.mesaj).toContain('eklersen');
  });

  it('boş deste önerisi en az malzemeyle en çok tarif açanı önerir', () => {
    const deste = desteHazirla({
      tarifler,
      hedef,
      kisitlar: temelKisit,
      envanter: [],
    });

    expect(deste.eksik_malzeme_onerisi[0]).toBeDefined();
  });

  it('vazgeçemediği yiyecek destede öncelikli görünür', () => {
    const deste = desteHazirla({
      tarifler,
      hedef: { kalori: 500, protein_g: 25, yag_g: 18, karbonhidrat_g: 60, lif_g: 10 },
      kisitlar: { ...temelKisit, vazgecemedikleri: ['nohut'] },
    });

    expect(deste.kartlar[0]?.id).toBe('nohut-yemegi');
  });

  it('deste AI çağrısı yapmaz — saf veritabanı sorgusu', () => {
    const deste = desteHazirla({ tarifler, hedef, kisitlar: temelKisit });

    expect(deste.ai_cagrisi).toBe(false);
  });

  it('aynı girdi aynı desteyi verir', () => {
    const girdi = { tarifler, hedef, kisitlar: temelKisit };

    expect(JSON.stringify(desteHazirla(girdi))).toBe(JSON.stringify(desteHazirla(girdi)));
  });
});

describe('kaydirmaOgren — tercih sinyali', () => {
  it('sağa kaydırma tercih edilen malzemeleri güçlendirir', () => {
    const ogrenme = kaydirmaOgren(
      { tarif: tarifler[1]!, yon: 'saga' },
      { sevilen: {}, sevilmeyen: {} },
    );

    expect(ogrenme.sevilen['tavuk göğsü']).toBe(1);
  });

  it('sola kaydırma malzemeyi sevilmeyenlere yazar', () => {
    const ogrenme = kaydirmaOgren(
      { tarif: tarifler[3]!, yon: 'sola' },
      { sevilen: {}, sevilmeyen: {} },
    );

    expect(ogrenme.sevilmeyen['somon']).toBe(1);
  });

  it('tekrarlanan sinyal birikir', () => {
    let ogrenme: Ogrenme = { sevilen: {}, sevilmeyen: {} };
    ogrenme = kaydirmaOgren({ tarif: tarifler[1]!, yon: 'saga' }, ogrenme);
    ogrenme = kaydirmaOgren({ tarif: tarifler[1]!, yon: 'saga' }, ogrenme);

    expect(ogrenme.sevilen['tavuk göğsü']).toBe(2);
  });

  it('üç kez sola kaydırılan malzeme sevmediklerine önerilir', () => {
    let ogrenme: Ogrenme = { sevilen: {}, sevilmeyen: {} };
    for (let i = 0; i < 3; i++) {
      ogrenme = kaydirmaOgren({ tarif: tarifler[3]!, yon: 'sola' }, ogrenme);
    }

    expect(ogrenme.sevmediklerine_ekle).toContain('somon');
  });
});

describe('alisverisListesi', () => {
  it('haftalık plandan malzeme toplar', () => {
    const liste = alisverisListesi([tarifler[0]!, tarifler[1]!]);

    expect(liste.kalemler.length).toBeGreaterThan(0);
  });

  it('aynı malzeme tek satırda toplanır', () => {
    const liste = alisverisListesi([tarifler[0]!, tarifler[5]!]);
    const sogan = liste.kalemler.find((k) => k.ad === 'soğan');

    expect(sogan?.gram).toBe(90);
  });

  it('reyona göre gruplanır', () => {
    const liste = alisverisListesi([tarifler[1]!, tarifler[3]!]);

    expect(Object.keys(liste.reyonlar)).toContain('kasap');
    expect(Object.keys(liste.reyonlar)).toContain('manav');
  });

  it('envanterde olan malzeme listeye girmez', () => {
    const liste = alisverisListesi([tarifler[0]!], ['kırmızı mercimek']);

    expect(liste.kalemler.map((k) => k.ad)).not.toContain('kırmızı mercimek');
  });

  it('boş planda boş liste döner', () => {
    expect(alisverisListesi([]).kalemler).toEqual([]);
  });
});

describe('B5 — yemeği kim pişiriyor', () => {
  it('ailem pişiriyorsa menü dayatılmaz, porsiyon önerilir', () => {
    const deste = desteHazirla({
      tarifler,
      hedef: { kalori: 520, protein_g: 35, yag_g: 22, karbonhidrat_g: 45, lif_g: 8 },
      kisitlar: { ...temelKisit, kim_pisiriyor: 'ailem' },
    });

    expect(deste.mod).toBe('porsiyon');
    expect(deste.mesaj).toContain('Bugün ne pişti');
  });

  it('kendim pişiriyorsa menü modu çalışır', () => {
    const deste = desteHazirla({
      tarifler,
      hedef: { kalori: 520, protein_g: 35, yag_g: 22, karbonhidrat_g: 45, lif_g: 8 },
      kisitlar: temelKisit,
    });

    expect(deste.mod).toBe('menu');
  });
});

describe('porsiyonKatsayisi — makro kilidi porsiyonla tutturulur', () => {
  it('küçük tarifi hedefe ölçeklendirir', () => {
    const hedef = { kalori: 640, protein_g: 32, yag_g: 22, karbonhidrat_g: 80, lif_g: 16 };
    const katsayi = porsiyonKatsayisi(tarifler[0]!, hedef);

    // 320 kcal × 2 = 640
    expect(katsayi).toBeCloseTo(2, 1);
  });

  it('makul porsiyon aralığının dışını reddeder', () => {
    const hedef = { kalori: 2000, protein_g: 100, yag_g: 60, karbonhidrat_g: 200, lif_g: 30 };

    expect(porsiyonKatsayisi(tarifler[0]!, hedef)).toBeNull();
  });

  it('ölçeklense bile protein yetmiyorsa reddeder', () => {
    const proteinsiz: Tarif = {
      ...tarifler[0]!,
      makrolar: { kalori: 320, protein_g: 2, yag_g: 11, karbonhidrat_g: 60, lif_g: 4 },
    };
    const hedef = { kalori: 640, protein_g: 45, yag_g: 22, karbonhidrat_g: 80, lif_g: 16 };

    expect(porsiyonKatsayisi(proteinsiz, hedef)).toBeNull();
  });

  it('yarım porsiyonun altına inmez', () => {
    const hedef = { kalori: 100, protein_g: 5, yag_g: 3, karbonhidrat_g: 12, lif_g: 2 };

    expect(porsiyonKatsayisi(tarifler[3]!, hedef)).toBeNull();
  });

  it('katsayı çeyrek porsiyona yuvarlanır — mutfakta ölçülebilir olsun', () => {
    const hedef = { kalori: 400, protein_g: 20, yag_g: 14, karbonhidrat_g: 50, lif_g: 10 };
    const katsayi = porsiyonKatsayisi(tarifler[0]!, hedef);

    expect(katsayi).not.toBeNull();
    expect((katsayi! * 4) % 1).toBe(0);
  });
});

describe('desteHazirla — porsiyon ölçekli kartlar', () => {
  it('büyük öğün hedefinde deste boş kalmaz', () => {
    const buyukHedef = { kalori: 950, protein_g: 55, yag_g: 30, karbonhidrat_g: 100, lif_g: 14 };
    const deste = desteHazirla({ tarifler, hedef: buyukHedef, kisitlar: temelKisit });

    expect(deste.kartlar.length).toBeGreaterThan(0);
  });

  it('ölçekli kartın porsiyon katsayısı ve makrosu birlikte döner', () => {
    const buyukHedef = { kalori: 950, protein_g: 55, yag_g: 30, karbonhidrat_g: 100, lif_g: 14 };
    const deste = desteHazirla({ tarifler, hedef: buyukHedef, kisitlar: temelKisit });
    const kart = deste.kartlar[0]!;

    expect(kart.porsiyon_katsayisi).toBeGreaterThan(1);
    expect(kart.makrolar.kalori).toBeGreaterThan(600);
  });

  it('ölçekli makro hedefin yüzde 8 içinde kalır', () => {
    const buyukHedef = { kalori: 950, protein_g: 55, yag_g: 30, karbonhidrat_g: 100, lif_g: 14 };
    const deste = desteHazirla({ tarifler, hedef: buyukHedef, kisitlar: temelKisit });

    for (const kart of deste.kartlar) {
      const fark = Math.abs(kart.makrolar.kalori - buyukHedef.kalori) / buyukHedef.kalori;
      expect(fark).toBeLessThanOrEqual(0.08);
    }
  });

  it('malzeme gramları da porsiyonla ölçeklenir', () => {
    const buyukHedef = { kalori: 950, protein_g: 55, yag_g: 30, karbonhidrat_g: 100, lif_g: 14 };
    const deste = desteHazirla({ tarifler, hedef: buyukHedef, kisitlar: temelKisit });
    const kart = deste.kartlar[0]!;
    const orijinal = tarifler.find((t) => t.id === kart.id)!;

    expect(kart.malzemeler[0]!.gram).toBeGreaterThan(orijinal.malzemeler[0]!.gram);
  });
});
