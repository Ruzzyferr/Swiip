/**
 * Rakip farkı denetimi — `docs/rakip-analizi.md` bölüm F.
 *
 * Rakip analizi 15.000 yorumdan somut zaaflar çıkardı ve ürünün her kilitli kararı
 * bunlardan birine cevap. Ama "cevap verdik" bir beyandır; bu betik **canlı sunucuya
 * karşı** ölçüyor.
 *
 * Her satır bir rakip şikâyeti ve onun bizdeki karşılığı. Tutmuyorsa bu, tek tek
 * kusurlardan daha büyük bir bulgudur: ürünün var olma sebebi tutmuyor demektir.
 *
 * Çalıştırma:
 *   node scripts/rakip-farki-denetimi.mjs [adres]
 */
import { readFileSync } from 'node:fs';

const TABAN = process.argv[2] ?? 'http://127.0.0.1:3311';
const damga = String(Date.now()).slice(-7);

async function cagir(yol, { yontem = 'GET', govde, token } = {}) {
  const c = await fetch(`${TABAN}${yol}`, {
    method: yontem,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(govde ? { body: JSON.stringify(govde) } : {}),
  });
  const t = await c.text();
  let j = null;
  try {
    j = t ? JSON.parse(t) : null;
  } catch {
    j = { ham: t.slice(0, 200) };
  }
  return { durum: c.status, govde: j };
}

const CEVAPLAR = {
  K1: '1992-03-15',
  K2: 'Erkek',
  K3: 178,
  K4: 82,
  K6: 'Hayır',
  K7: 'Evet',
  H1: 'Kas kazanımı',
  H10: 1,
  A1: '1-3 yıl',
  A3: 10,
  S1: 'Hayır',
  S2: 'Hayır',
  S3: 'Hayır',
  S5: 'Hayır',
  S6: 'Hayır',
  S7: 'Hayır',
  S17: ['Bel fıtığı'],
  S18: 'Hayır',
  E1: 'Spor salonu',
  E3: ['Barbell ve plaka', 'Dumbbell', 'Düz bench', 'Squat rack'],
  Z1: '3 gün',
  Z2: '45 dakika',
  Y1: '7-8 saat',
  Y4: 'Masa başı, çoğunlukla oturarak',
  Y6: 4,
};

const bulgular = [];
const gecenler = [];

function sonuc(baslik, rakip, tamam, ayrinti) {
  if (tamam) gecenler.push(`${baslik} — ${ayrinti}`);
  else bulgular.push(`${baslik} (${rakip}): ${ayrinti}`);
}

// --- Kurulum: bir Pro kullanıcı ---
const kayit = await cagir('/v1/kimlik/kayit', {
  yontem: 'POST',
  govde: {
    email: `rakip-${damga}@swiip.app`,
    parola: 'Kirmizi-Bisiklet-42',
    saglik_onayi: true,
    olcum_onayi: true,
  },
});
if (kayit.durum !== 200 && kayit.durum !== 201) {
  console.error(`kurulum basarisiz: ${kayit.durum} ${JSON.stringify(kayit.govde)}`);
  process.exit(1);
}
const token = kayit.govde.erisim_token;
await cagir('/v1/degerlendirme/cevap', { yontem: 'POST', govde: { cevaplar: CEVAPLAR }, token });
await cagir('/v1/degerlendirme/tamamla', { yontem: 'POST', govde: {}, token });
await cagir('/v1/abonelik/guncelle', { yontem: 'POST', govde: { plan: 'pro' }, token });
await cagir('/v1/program/uret', { yontem: 'POST', govde: { hafta: 1 }, token });

// ---------------------------------------------------------------------------
// 1. EatBetter: "aynı şeyi eklediğimde yine farklı makrolar çıkarıyor" (1★, 11 beğeni)
// ---------------------------------------------------------------------------
{
  const ara = await cagir('/v1/beslenme/besin/ara?q=yumurta', { token });
  const besin = (ara.govde?.sonuclar ?? ara.govde?.besinler ?? [])[0];
  if (!besin) {
    sonuc('Aynı yemek → aynı makro', 'EatBetter', false, 'arama sonuç döndürmedi, sınanamadı');
  } else {
    const ekle = async () =>
      cagir('/v1/beslenme/kayit', {
        yontem: 'POST',
        govde: { food_id: besin.id, miktar: 100, gun: '2026-08-19' },
        token,
      });
    const a = await ekle();
    const b = await ekle();
    const ma = JSON.stringify(a.govde?.kayit?.hesaplanan_jsonb ?? a.govde?.hesaplanan ?? a.govde);
    const mb = JSON.stringify(b.govde?.kayit?.hesaplanan_jsonb ?? b.govde?.hesaplanan ?? b.govde);
    const aynı = ma.includes('kalori') && ma === mb;
    sonuc(
      'Aynı yemek → aynı makro',
      'EatBetter',
      aynı,
      aynı ? 'iki kayıt birebir aynı' : `AYRIŞTI: ${ma.slice(0, 90)} vs ${mb.slice(0, 90)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// 2. EatBetter: "kaydet tuşuna basıyorum, reklam çıkıyor" (1★, 8 beğeni)
//    YAZIO: ödeyene oyunlaştırma
// ---------------------------------------------------------------------------
{
  const durum = await cagir('/v1/abonelik/durum', { token });
  sonuc(
    'Ödeyene promosyon yok',
    'EatBetter',
    durum.govde?.promosyon_goster === false,
    `promosyon_goster=${durum.govde?.promosyon_goster}`,
  );

  /**
   * Yalnızca kullanıcıya GÖRÜNEN metinler taranıyor, alan adları değil.
   *
   * İlk hâli tüm JSON'u tarıyordu ve `haklar.reklam: false` alanını "reklam" geçtiği
   * için ihlal saydı — oysa o alan tam tersini söylüyor: hiçbir planda reklam yok.
   * Alan adını ihlal saymak, kuralın kendisini ihlali sanmaktır.
   */
  const metinDegerleri = (deger, toplanan = []) => {
    if (typeof deger === 'string') toplanan.push(deger);
    else if (Array.isArray(deger)) deger.forEach((d) => metinDegerleri(d, toplanan));
    else if (deger && typeof deger === 'object')
      Object.values(deger).forEach((d) => metinDegerleri(d, toplanan));
    return toplanan;
  };

  const yuzeyler = ['/v1/beslenme/hedef', '/v1/program/aktif', '/v1/abonelik/durum'];
  const upsell = [];
  for (const y of yuzeyler) {
    const c = await cagir(y, { token });
    for (const metin of metinDegerleri(c.govde ?? {})) {
      // "reklam ve upsell yok" bir taahhüt, upsell değil.
      if (/reklam\s*(ve|veya)?\s*(upsell)?\s*yok/i.test(metin)) continue;
      const e = metin.match(/yükselt|upgrade|Pro'ya geç|planlara bak|reklam/i);
      if (e) upsell.push(`${y}: "${metin.slice(0, 70)}"`);
    }
  }
  sonuc(
    'Ödeyene tek satır upsell yok',
    'EatBetter',
    upsell.length === 0,
    upsell.length ? upsell.join(' | ') : `${yuzeyler.length} yüzeydeki metinlerin hepsi temiz`,
  );

  // Hak tablosunda reklam her planda kapalı olmalı — pozitif kontrol.
  const tumPlanlar = (await cagir('/v1/abonelik/planlar')).govde?.planlar ?? [];
  const reklamli = tumPlanlar.filter((p) => p.reklam === true).map((p) => p.kod);
  sonuc(
    'Hiçbir planda reklam yok',
    'EatBetter',
    reklamli.length === 0,
    reklamli.length
      ? `reklamlı plan: ${reklamli.join(', ')}`
      : `${tumPlanlar.length} planda da reklam kapalı`,
  );
}

// ---------------------------------------------------------------------------
// 3. YAZIO: "aylık sandım, yıllık 600 TL kesilmiş" (5★, 214 beğeni)
//    Karşılığı: paywall'da fiyat ve yenileme tarihi en büyük puntoda, ön seçim yok.
// ---------------------------------------------------------------------------
{
  const paywall = readFileSync('apps/mobile/app/odeme/paywall.tsx', 'utf8');
  const onSecimYok = /useState<[^>]*>\(null\)/.test(paywall) || /secili.*null/.test(paywall);
  sonuc(
    'Paywall ön seçim yok',
    'YAZIO',
    onSecimYok,
    onSecimYok ? 'seçili plan başlangıçta null' : 'başlangıçta bir plan seçili görünüyor',
  );

  const tarihVar = /yenilemeTarihi/.test(paywall);
  const tutarVar = /odenecekTutar|fiyatYazisi/.test(paywall);
  sonuc(
    'Yenileme tarihi ve tutar açıkça yazılı',
    'YAZIO',
    tarihVar && tutarVar,
    `yenilemeTarihi=${tarihVar} tutar=${tutarVar}`,
  );

  const planlar = await cagir('/v1/abonelik/planlar');
  const donemVar = (planlar.govde?.planlar ?? []).every(
    (p) => p.aylik_fiyat_try !== undefined && p.yillik_fiyat_try !== undefined,
  );
  sonuc(
    'Aylık ve yıllık fiyat ayrı ayrı görünüyor',
    'YAZIO',
    donemVar,
    donemVar ? 'her planda iki fiyat da var' : JSON.stringify(planlar.govde).slice(0, 120),
  );
}

// ---------------------------------------------------------------------------
// 4. YAZIO: "çocuk muyuz biz" — oyunlaştırma (55 ve 65 beğeni)
// ---------------------------------------------------------------------------
{
  const yasak = /rozet|elmas|sandık|konfeti|seri|tebrikler|madalya|puan kazan/i;
  const yuzeyler = ['/v1/program/aktif', '/v1/beslenme/hedef', '/v1/abonelik/durum'];
  const kacaklar = [];
  for (const y of yuzeyler) {
    const c = await cagir(y, { token });
    const e = JSON.stringify(c.govde ?? {}).match(yasak);
    if (e) kacaklar.push(`${y}: "${e[0]}"`);
  }
  sonuc(
    'Oyunlaştırma yok',
    'YAZIO',
    kacaklar.length === 0,
    kacaklar.length ? kacaklar.join(', ') : 'API yüzeylerinde rozet/seri/kutlama dili yok',
  );
}

// ---------------------------------------------------------------------------
// 5. Fitify: "Türkçe dil desteği gerekli" (5★, 144 beğeni — TR'nin en beğenilen talebi)
// ---------------------------------------------------------------------------
{
  const katalog = readFileSync('packages/shared/src/hareketler.uretilmis.ts', 'utf8');
  const arr = JSON.parse(katalog.match(/=\s*(\[[\s\S]*\])\s*;?\s*$/m)[1]);
  const talimatsiz = arr.filter((h) => !(h.talimat_tr?.length >= 4));
  sonuc(
    'Hareket açıklamaları Türkçe',
    'Fitify',
    talimatsiz.length === 0,
    talimatsiz.length
      ? `${talimatsiz.length} harekette 4 adımdan az Türkçe talimat`
      : `${arr.length} hareketin hepsinde ≥4 adım Türkçe talimat`,
  );
}

// ---------------------------------------------------------------------------
// 6. Fitify: sakatlık farkındalığı (69 beğeni) — bel fıtığı sorulmadan program yazılıyor
// ---------------------------------------------------------------------------
{
  const aktif = await cagir('/v1/program/aktif', { token });
  const hareketler = (aktif.govde?.gunler ?? []).flatMap((g) => g.hareketler ?? []);
  const yasak = hareketler.filter((h) => /deadlift|good-morning|yerden-cekis/i.test(h.exercise_id));
  sonuc(
    'Bel fıtığında yerden çekiş yok',
    'Fitify',
    yasak.length === 0 && hareketler.length > 0,
    yasak.length
      ? `YASAK HAREKET: ${yasak.map((h) => h.exercise_id).join(', ')}`
      : `${hareketler.length} hareket, hiçbiri yerden çekiş değil`,
  );

  const uyarilar = JSON.stringify(aktif.govde?.uyarilar ?? []);
  sonuc(
    'Elenen hareketler kullanıcıya söyleniyor',
    'Fitify',
    /havuzdan çıkarıldı|çıkarıldı/i.test(uyarilar),
    uyarilar.slice(0, 120),
  );
}

// ---------------------------------------------------------------------------
// 7. Diyetkolik: negatiflerin %34'ü teknik hata — "açılmıyor", "giremiyorum"
//    Karşılığı: bozuk istek çökertmiyor, her hata kodlu.
// ---------------------------------------------------------------------------
{
  const kotu = [
    ['DELETE', '/v1/hesap', ''],
    ['POST', '/v1/beslenme/kilo', '{'],
    ['POST', '/v1/program/uret', '[]'],
    ['POST', '/v1/ogun/degistir', '{"hafta_basi":"bozuk"}'],
  ];
  const cokmeler = [];
  const kodsuzlar = [];
  for (const [yontem, yol, govde] of kotu) {
    const c = await fetch(`${TABAN}${yol}`, {
      method: yontem,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: govde,
    });
    const t = await c.text();
    let j = null;
    try {
      j = t ? JSON.parse(t) : null;
    } catch {
      j = null;
    }
    if (c.status >= 500) cokmeler.push(`${yontem} ${yol} → ${c.status}`);
    else if (c.status >= 400 && !j?.kod) kodsuzlar.push(`${yontem} ${yol}`);
  }
  sonuc(
    'Bozuk istek çökertmiyor',
    'Diyetkolik',
    cokmeler.length === 0,
    cokmeler.length ? cokmeler.join(', ') : `${kotu.length} bozuk istek, hiçbiri 500 değil`,
  );
  sonuc(
    'Her hata istemcinin çevirebileceği kod taşıyor',
    'Diyetkolik',
    kodsuzlar.length === 0,
    kodsuzlar.length ? kodsuzlar.join(', ') : 'hepsinde kod var',
  );
}

// ---------------------------------------------------------------------------
// 8. Hevy: ücretsiz katmanda bile kullanılabilirlik
//    Bizim karşılığımız farklı (1. gün) ama ÜCRETSİZİN ÇEKİRDEĞİ çalışmak zorunda.
// ---------------------------------------------------------------------------
{
  const u = await cagir('/v1/kimlik/kayit', {
    yontem: 'POST',
    govde: {
      email: `ucretsiz-${damga}@swiip.app`,
      parola: 'Kirmizi-Bisiklet-42',
      saglik_onayi: true,
    },
  });
  if (u.durum === 200 || u.durum === 201) {
    const ut = u.govde.erisim_token;
    await cagir('/v1/degerlendirme/cevap', {
      yontem: 'POST',
      govde: { cevaplar: CEVAPLAR },
      token: ut,
    });
    await cagir('/v1/degerlendirme/tamamla', { yontem: 'POST', govde: {}, token: ut });
    await cagir('/v1/program/uret', { yontem: 'POST', govde: { hafta: 1 }, token: ut });

    const aktif = await cagir('/v1/program/aktif', { token: ut });
    const gun = aktif.govde?.gunler?.length ?? 0;
    sonuc('Ücretsiz kullanıcı 1. günü görüyor', 'Hevy', gun >= 1, `${gun} gün görünür`);

    // Manuel giriş ve arama ücretsizin çekirdeği — şapkasız da bulmalı.
    const ara = await cagir('/v1/beslenme/besin/ara?q=kofte', { token: ut });
    const adet = (ara.govde?.sonuclar ?? ara.govde?.besinler ?? []).length;
    sonuc(
      'Şapkasız arama ücretsizde çalışıyor',
      'YAZIO/EatBetter',
      adet > 0,
      `"kofte" → ${adet} sonuç`,
    );
  } else {
    sonuc('Ücretsiz katman', 'Hevy', false, `kullanıcı kurulamadı: ${u.durum}`);
  }
}

// ---------------------------------------------------------------------------
// 9. Ürünün kendi iddiası: "programın neden o program olduğunu da söyleriz"
//    Gerekçe, AI'ın uydurduğu cümle değil KARAR İZİ olmalı.
// ---------------------------------------------------------------------------
{
  const aktif = await cagir('/v1/program/aktif', { token });
  const hareketler = (aktif.govde?.gunler ?? []).flatMap((g) => g.hareketler ?? []);
  const gerekcesizler = [];
  for (const h of hareketler.slice(0, 8)) {
    const g = await cagir(`/v1/program/gerekce/${h.exercise_id}`, { token });
    const metin = String(g.govde?.aciklama ?? g.govde?.gerekce ?? '');
    const kurallar = g.govde?.kurallar ?? g.govde?.rule_fired ?? [];
    if (!metin.trim() || kurallar.length === 0) {
      gerekcesizler.push(`${h.exercise_id} (metin=${metin.length}, kural=${kurallar.length})`);
    }
  }
  sonuc(
    'Her hareketin gerekçesi KARAR İZİNE bağlı',
    'ürünün ana iddiası',
    gerekcesizler.length === 0,
    gerekcesizler.length
      ? gerekcesizler.join(', ')
      : `${Math.min(8, hareketler.length)} harekette hem cümle hem ateşlenen kural var`,
  );
}

// ---------------------------------------------------------------------------
// 10. wger kullanılmadı (CC-BY-SA share-alike) — kilitli karar
// ---------------------------------------------------------------------------
{
  /**
   * Aranan şey kelimenin geçmesi değil, VERİNİN KAYNAĞI.
   *
   * İlk hâli `git grep wger` yapıyordu ve üç dosyayı ihlal saydı; üçünde de wger'in
   * neden REDDEDİLDİĞİ yazılıydı (`data/hareketler.json` içindeki "kullanma" alanı ve
   * iki kod yorumu). Kararı belgeleyen metni kararın ihlali saymak, aracı güvenilmez yapar.
   */
  const katalogHam = JSON.parse(readFileSync('data/hareketler.json', 'utf8'));
  const kullanilan = JSON.stringify(katalogHam.kaynak?.kullanilan ?? katalogHam.kaynak ?? {});
  const uretilmis = readFileSync('packages/shared/src/hareketler.uretilmis.ts', 'utf8');

  const kaynakWger = /wger/i.test(kullanilan.replace(/"kullanma"\s*:\s*"[^"]*"/gi, ''));
  const veriWger = /"kaynak"\s*:\s*"[^"]*wger/i.test(uretilmis);

  sonuc(
    'wger verisi kullanılmıyor',
    'lisans kararı',
    !kaynakWger && !veriWger,
    kaynakWger || veriWger
      ? 'katalog kaynağında wger görünüyor'
      : 'kullanılan kaynaklar: free-exercise-db (kamu malı) + exercemus (MIT)',
  );
}

console.log('GEÇENLER:');
for (const g of gecenler) console.log('  ✓ ' + g);
console.log('');
if (bulgular.length === 0) {
  console.log('Rakip farkı denetimi temiz — her zaafa karşı bizim durumumuz tutuyor.');
} else {
  console.log(`BULGULAR (${bulgular.length}):`);
  for (const b of bulgular) console.log('  ✗ ' + b);
  process.exitCode = 1;
}
