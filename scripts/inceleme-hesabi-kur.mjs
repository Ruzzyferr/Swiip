/**
 * App Review için ikinci hesabı kurar: **ücretsiz katman**, değerlendirmesi tamam.
 *
 * Neden gerekli: `inceleme@swiip.app` Pro ve ödeyene tek satır upsell göstermiyoruz —
 * yani Ayarlar'daki "Planlara bak" düğmesi o hesapta HİÇ ÇIKMIYOR (`promosyon_goster`
 * false). Apple inceleme notları "Settings → Planlar" diyordu; inceleyici o hesapla
 * satın alma ekranına asla ulaşamazdı. Bu tek başına yeni bir ret sebebi.
 *
 * Değerlendirmenin tamamlanmış olması da şart: program, beslenme ve koç sekmeleri
 * bitene kadar kilitli, ve kilitli özelliğe dokunmak paywall'a düşmenin ikinci yolu.
 *
 *   node scripts/inceleme-hesabi-kur.mjs [taban-url]
 */
const TABAN = process.argv[2] ?? 'https://swiip.app';
const EPOSTA = 'inceleme-ucretsiz@swiip.app';
const PAROLA = 'kumsal-terazi-5820-fener';

async function cagir(yol, { yontem = 'GET', govde, token } = {}) {
  const y = await fetch(`${TABAN}${yol}`, {
    method: yontem,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(govde !== undefined ? { body: JSON.stringify(govde) } : {}),
  });
  const metin = await y.text();
  let veri = null;
  try {
    veri = metin ? JSON.parse(metin) : null;
  } catch {
    veri = { ham: metin.slice(0, 200) };
  }
  return { durum: y.status, veri };
}

let token;
const kayit = await cagir('/v1/kimlik/kayit', {
  yontem: 'POST',
  govde: { email: EPOSTA, parola: PAROLA, saglik_onayi: true },
});
if (kayit.durum === 200 || kayit.durum === 201) {
  token = kayit.veri.erisim_token;
  console.log('hesap açıldı');
} else {
  const giris = await cagir('/v1/kimlik/giris', {
    yontem: 'POST',
    govde: { email: EPOSTA, parola: PAROLA },
  });
  if (giris.durum !== 200) {
    console.error('ne kayıt ne giriş oldu:', kayit.durum, JSON.stringify(kayit.veri).slice(0, 200));
    process.exit(1);
  }
  token = giris.veri.erisim_token;
  console.log('hesap zaten vardı, girildi');
}

const { veri: banka } = await cagir('/v1/degerlendirme/sorular', { token });
// Banka bloklara bolunmus geliyor: {version, locale, blocks:[{id, questions:[...]}]}
const sorular = (banka.blocks ?? []).flatMap((b) => b.questions ?? []);
if (!sorular.length) {
  console.error('soru bankasi bos dondu:', JSON.stringify(banka).slice(0, 200));
  process.exit(1);
}
console.log('soru sayisi:', sorular.length);

/**
 * Senaryo bilerek DÜZ: hiçbir sert kapıyı tetiklemiyor.
 *
 * 18 yaş altı, gebelik, kardiyak bayrak ve yeme bozukluğu taraması program üretimini
 * durduruyor. İnceleyicinin hesabı kapıya takılırsa hiçbir ekranı göremez.
 */
const CEVAPLAR = {
  K1: '1993-06-15',
  K2: 'Erkek',
  K3: 176,
  K4: 78,
  K6: 'Hayır',
  K7: 'Evet',
  S1: 'Hayır',
  S2: 'Hayır',
  S3: 'Hayır',
  S4: ['Yok'],
  S5: 'Hayır',
  S6: 'Hayır',
  S7: 'Hayır',
  S15: 'Tansiyonum normal',
  S18: 'Hayır',
  H1: 'Kas kazanımı',
  H10: 0.25,
  A1: '1-3 yıl',
  A2: 3,
  Z1: '3 gün',
  Z2: '60 dakika',
  E1: 'Spor salonu',
  B5: 'Kendim',
  B7: '30 dakikaya kadar',
  B8: 'Orta',
  B9: ['Yok'],
  B10: ['Yok'],
  B11: ['Yok'],
  B13: [],
  T2: [],
};

/** Soru tipi başına makul varsayılan; banka 14 ayrı şekil bekliyor. */
function varsayilan(soru) {
  const secenekler = soru.options ?? soru.secenekler ?? [];
  const orta = (min, max) => Math.round(((min ?? 1) + (max ?? 5)) / 2);
  switch (soru.type) {
    case 'bodymap':
      return [];
    case 'multi': {
      const yok = secenekler.find((o) => /^(Yok|Hayır|Hiçbiri)/.test(o));
      return yok ? [yok] : [];
    }
    case 'single':
      return secenekler.find((o) => o === 'Hayır' || o === 'Yok') ?? secenekler[0];
    case 'number':
      return orta(soru.min ?? 1, soru.max ?? 100);
    case 'scale': {
      const d = orta(soru.min ?? 1, soru.max ?? 5);
      return Array.isArray(soru.repeatFor)
        ? Object.fromEntries(soru.repeatFor.map((k) => [k, d]))
        : d;
    }
    case 'measure':
      return Object.fromEntries((soru.fields ?? []).map((f) => [f, 70]));
    case 'liftinput':
      return {};
    case 'date':
      return '1990-01-01';
    case 'daterange':
      return [];
    case 'consent':
      return true;
    case 'photo':
      return [];
    case 'imagechoice':
      return 1;
    case 'text':
    case 'longtext':
      return '';
    default:
      return secenekler.length ? secenekler[0] : '';
  }
}

const cevaplar = { ...CEVAPLAR };
for (const soru of sorular) {
  if (cevaplar[soru.id] === undefined) cevaplar[soru.id] = varsayilan(soru);
}

const kaydet = await cagir('/v1/degerlendirme/cevap', {
  yontem: 'POST',
  govde: { cevaplar },
  token,
});
console.log('cevaplar:', kaydet.durum);

// Gövdesiz POST'ta `content-type: application/json` gidiyor ve Fastify boş gövdeyi
// ayrıştırmaya çalışıp 400 dönüyor. Boş nesne göndermek doğru istek.
const tamamla = await cagir('/v1/degerlendirme/tamamla', {
  yontem: 'POST',
  govde: {},
  token,
});
console.log('tamamla:', tamamla.durum);

const uret = await cagir('/v1/program/uret', { yontem: 'POST', govde: {}, token });
console.log('program üret:', uret.durum);

// --- Doğrulama: "200 döndü" yetmez, inceleyicinin göreceği hâli oku. ---
const durum = await cagir('/v1/degerlendirme/durum', { token });
const abonelik = await cagir('/v1/abonelik/durum', { token });
const program = await cagir('/v1/program/aktif', { token });

console.log('\n--- inceleyicinin göreceği hâl ---');
console.log('değerlendirme tamamlandı :', durum.veri?.tamamlandi);
console.log('plan                     :', abonelik.veri?.plan);
console.log('program                  :', program.durum === 200 ? 'var' : `YOK (${program.durum})`);
console.log('promosyon_goster         :', abonelik.veri?.promosyon_goster, '<- true olmalı');

if (abonelik.veri?.plan !== 'ucretsiz' || abonelik.veri?.promosyon_goster !== true) {
  console.error('\nBAŞARISIZ: bu hesapla paywall açılmaz. İnceleyici satın alma ekranını göremez.');
  process.exit(1);
}
console.log('\ndoğrulandı: Ayarlar → "Planlara bak" bu hesapta görünüyor.');
console.log(`\nE-posta: ${EPOSTA}\nParola : ${PAROLA}`);
