import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql as sqlHam } from 'drizzle-orm';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';

let uygulama: TestUygulama;
let app: FastifyInstance;

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;
}, 60_000);

afterAll(async () => {
  await uygulama?.kapat();
});

const gecerliKayit = {
  email: 'yeni@made2fit.io',
  parola: 'Kirmizi-Bisiklet-42',
  saglik_onayi: true,
};

async function kayitOl(govde: Record<string, unknown>) {
  return app.inject({ method: 'POST', url: '/v1/kimlik/kayit', payload: govde });
}

describe('POST /v1/kimlik/kayit', () => {
  it('geçerli bilgilerle hesap açar', async () => {
    const cevap = await kayitOl({ ...gecerliKayit, email: 'kayit1@made2fit.io' });

    expect(cevap.statusCode).toBe(201);
    const govde = cevap.json();
    expect(govde.erisim_token).toBeTruthy();
    expect(govde.yenileme_token).toBeTruthy();
    expect(govde.kullanici.email).toBe('kayit1@made2fit.io');
  });

  it('parola hiçbir cevapta geri dönmez', async () => {
    const cevap = await kayitOl({ ...gecerliKayit, email: 'kayit2@made2fit.io' });

    expect(JSON.stringify(cevap.json())).not.toContain('Kirmizi-Bisiklet-42');
    expect(JSON.stringify(cevap.json())).not.toContain('parola_hash');
  });

  it('zayıf parolayı reddeder ve nedenini söyler', async () => {
    const cevap = await kayitOl({ ...gecerliKayit, email: 'zayif@made2fit.io', parola: 'kisa' });

    expect(cevap.statusCode).toBe(400);
    expect(cevap.json().mesaj.length).toBeGreaterThan(15);
  });

  it('geçersiz e-postayı reddeder', async () => {
    const cevap = await kayitOl({ ...gecerliKayit, email: 'eposta-degil' });

    expect(cevap.statusCode).toBe(400);
  });

  it('sağlık verisi açık rızası olmadan hesap açmaz', async () => {
    const cevap = await kayitOl({
      email: 'rizasiz@made2fit.io',
      parola: 'Kirmizi-Bisiklet-42',
      saglik_onayi: false,
    });

    expect(cevap.statusCode).toBe(400);
    expect(cevap.json().mesaj.toLowerCase()).toContain('rıza');
  });

  it('aynı e-posta ile ikinci hesap açılmaz', async () => {
    await kayitOl({ ...gecerliKayit, email: 'cift@made2fit.io' });
    const ikinci = await kayitOl({ ...gecerliKayit, email: 'cift@made2fit.io' });

    expect(ikinci.statusCode).toBe(409);
  });

  it('e-posta büyük harfle yazılsa da aynı hesap sayılır', async () => {
    await kayitOl({ ...gecerliKayit, email: 'harf@made2fit.io' });
    const ikinci = await kayitOl({ ...gecerliKayit, email: 'HARF@Made2Fit.io' });

    expect(ikinci.statusCode).toBe(409);
  });
});

describe('POST /v1/kimlik/giris', () => {
  const kullanici = { email: 'giris@made2fit.io', parola: 'Kirmizi-Bisiklet-42' };

  beforeAll(async () => {
    await kayitOl({ ...kullanici, saglik_onayi: true });
  });

  it('doğru bilgilerle token verir', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/giris',
      payload: kullanici,
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().erisim_token).toBeTruthy();
  });

  it('yanlış parolada 401 döner', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/giris',
      payload: { ...kullanici, parola: 'Yanlis-Parola-99' },
    });

    expect(cevap.statusCode).toBe(401);
  });

  it('olmayan kullanıcıda da aynı hatayı verir — hesap varlığı sızmaz', async () => {
    const yanlisParola = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/giris',
      payload: { ...kullanici, parola: 'Yanlis-Parola-99' },
    });
    const olmayanHesap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/giris',
      payload: { email: 'yok@made2fit.io', parola: 'Yanlis-Parola-99' },
    });

    expect(olmayanHesap.statusCode).toBe(yanlisParola.statusCode);
    expect(olmayanHesap.json().mesaj).toBe(yanlisParola.json().mesaj);
  });
});

describe('POST /v1/kimlik/yenile', () => {
  it('geçerli yenileme tokenı yeni erişim tokenı verir', async () => {
    const kayit = await kayitOl({ ...gecerliKayit, email: 'yenile@made2fit.io' });
    const { yenileme_token } = kayit.json();

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/yenile',
      payload: { yenileme_token },
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().erisim_token).toBeTruthy();
  });

  it('kullanılan yenileme tokenı bir daha çalışmaz — rotasyon', async () => {
    const kayit = await kayitOl({ ...gecerliKayit, email: 'rotasyon@made2fit.io' });
    const { yenileme_token } = kayit.json();

    await app.inject({ method: 'POST', url: '/v1/kimlik/yenile', payload: { yenileme_token } });
    const ikinci = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/yenile',
      payload: { yenileme_token },
    });

    expect(ikinci.statusCode).toBe(401);
  });

  it('uydurma token reddedilir', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/yenile',
      payload: { yenileme_token: 'uydurma' },
    });

    expect(cevap.statusCode).toBe(401);
  });

  it('çıkış yapınca yenileme tokenı iptal olur', async () => {
    const kayit = await kayitOl({ ...gecerliKayit, email: 'cikis@made2fit.io' });
    const { yenileme_token, erisim_token } = kayit.json();

    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/cikis',
      headers: { authorization: `Bearer ${erisim_token}` },
      payload: { yenileme_token },
    });

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/yenile',
      payload: { yenileme_token },
    });
    expect(cevap.statusCode).toBe(401);
  });
});

describe('korumalı uçlar', () => {
  it('token olmadan 401 döner', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/v1/kimlik/ben' });

    expect(cevap.statusCode).toBe(401);
  });

  it('geçersiz token 401 döner', async () => {
    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/kimlik/ben',
      headers: { authorization: 'Bearer sahte.token.degeri' },
    });

    expect(cevap.statusCode).toBe(401);
  });

  it('geçerli token kullanıcıyı döner', async () => {
    const kayit = await kayitOl({ ...gecerliKayit, email: 'ben@made2fit.io' });
    const { erisim_token } = kayit.json();

    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/kimlik/ben',
      headers: { authorization: `Bearer ${erisim_token}` },
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().email).toBe('ben@made2fit.io');
    expect(cevap.json().parola_hash).toBeUndefined();
  });
});

describe('KVKK — hesap silme ve veri dışa aktarma', () => {
  it('kullanıcı verisini dışa aktarabilir', async () => {
    const kayit = await kayitOl({ ...gecerliKayit, email: 'disaaktar@made2fit.io' });
    const { erisim_token } = kayit.json();

    const cevap = await app.inject({
      method: 'GET',
      url: '/v1/hesap/disa-aktar',
      headers: { authorization: `Bearer ${erisim_token}` },
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().kullanici.email).toBe('disaaktar@made2fit.io');
    expect(cevap.json()).toHaveProperty('degerlendirmeler');
  });

  it('hesap silme gerçekten siler', async () => {
    const kayit = await kayitOl({ ...gecerliKayit, email: 'silinen@made2fit.io' });
    const { erisim_token } = kayit.json();

    const silme = await app.inject({
      method: 'DELETE',
      url: '/v1/hesap',
      headers: { authorization: `Bearer ${erisim_token}` },
      payload: { onay: 'HESABIMI SİL' },
    });
    expect(silme.statusCode).toBe(200);

    const sonra = await app.inject({
      method: 'GET',
      url: '/v1/kimlik/ben',
      headers: { authorization: `Bearer ${erisim_token}` },
    });
    expect(sonra.statusCode).toBe(401);
  });

  it('onay metni olmadan hesap silinmez', async () => {
    const kayit = await kayitOl({ ...gecerliKayit, email: 'silinmez@made2fit.io' });
    const { erisim_token } = kayit.json();

    const cevap = await app.inject({
      method: 'DELETE',
      url: '/v1/hesap',
      headers: { authorization: `Bearer ${erisim_token}` },
      payload: { onay: 'evet' },
    });

    expect(cevap.statusCode).toBe(400);
  });
});

describe('sağlık ucu', () => {
  it('/saglik 200 döner', async () => {
    const cevap = await app.inject({ method: 'GET', url: '/saglik' });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().durum).toBe('iyi');
  });
});

describe('parola sıfırlama', () => {
  const kullanici = { email: 'sifirla@made2fit.io', parola: 'Kirmizi-Bisiklet-42' };

  beforeAll(async () => {
    await kayitOl({ ...kullanici, saglik_onayi: true });
  });

  function sonKod(): string {
    const posta = uygulama.kutu[uygulama.kutu.length - 1];
    return posta?.govde.match(/\b\d{6}\b/)?.[0] ?? '';
  }

  it('istek kodu e-postayla gönderir', async () => {
    const oncekiSayi = uygulama.kutu.length;

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla-istek',
      payload: { email: kullanici.email },
    });

    expect(cevap.statusCode).toBe(200);
    expect(uygulama.kutu.length).toBe(oncekiSayi + 1);
    expect(sonKod()).toMatch(/^\d{6}$/);
  });

  it('olmayan hesapta da aynı cevabı verir — hesap varlığı sızmaz', async () => {
    const varOlan = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla-istek',
      payload: { email: kullanici.email },
    });
    const olmayan = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla-istek',
      payload: { email: 'hicyok@made2fit.io' },
    });

    expect(olmayan.statusCode).toBe(varOlan.statusCode);
    expect(olmayan.json().mesaj).toBe(varOlan.json().mesaj);
  });

  it('olmayan hesap için e-posta gönderilmez', async () => {
    const oncekiSayi = uygulama.kutu.length;

    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla-istek',
      payload: { email: 'hicyok2@made2fit.io' },
    });

    expect(uygulama.kutu.length).toBe(oncekiSayi);
  });

  it('doğru kodla parola değişir', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla-istek',
      payload: { email: kullanici.email },
    });
    const kod = sonKod();

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla',
      payload: { email: kullanici.email, kod, yeni_parola: 'Yesil-Kalem-77' },
    });

    expect(cevap.statusCode).toBe(200);

    const giris = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/giris',
      payload: { email: kullanici.email, parola: 'Yesil-Kalem-77' },
    });
    expect(giris.statusCode).toBe(200);
  });

  it('parola değişince tüm oturumlar kapanır', async () => {
    const yeniKullanici = { email: 'oturumkapat@made2fit.io', parola: 'Kirmizi-Bisiklet-42' };
    const kayit = await kayitOl({ ...yeniKullanici, saglik_onayi: true });
    const { yenileme_token } = kayit.json();

    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla-istek',
      payload: { email: yeniKullanici.email },
    });

    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla',
      payload: { email: yeniKullanici.email, kod: sonKod(), yeni_parola: 'Mavi-Defter-88' },
    });

    const yenileme = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/yenile',
      payload: { yenileme_token },
    });
    expect(yenileme.statusCode).toBe(401);
  });

  it('yanlış kod reddedilir', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla-istek',
      payload: { email: kullanici.email },
    });

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla',
      payload: { email: kullanici.email, kod: '000000', yeni_parola: 'Turuncu-Masa-99' },
    });

    expect(cevap.statusCode).toBe(401);
  });

  it('kod tek kullanımlıktır', async () => {
    const tekKullanim = { email: 'tekkullanim@made2fit.io', parola: 'Kirmizi-Bisiklet-42' };
    await kayitOl({ ...tekKullanim, saglik_onayi: true });

    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla-istek',
      payload: { email: tekKullanim.email },
    });
    const kod = sonKod();

    const ilk = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla',
      payload: { email: tekKullanim.email, kod, yeni_parola: 'Sari-Kutu-11' },
    });
    const ikinci = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla',
      payload: { email: tekKullanim.email, kod, yeni_parola: 'Mor-Kalem-22' },
    });

    expect(ilk.statusCode).toBe(200);
    expect(ikinci.statusCode).toBe(401);
  });

  it('zayıf yeni parola reddedilir', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla-istek',
      payload: { email: kullanici.email },
    });

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla',
      payload: { email: kullanici.email, kod: sonKod(), yeni_parola: '123' },
    });

    expect(cevap.statusCode).toBe(400);
  });

  it('yeni istek eski kodu iptal eder', async () => {
    const iptal = { email: 'kodiptal@made2fit.io', parola: 'Kirmizi-Bisiklet-42' };
    await kayitOl({ ...iptal, saglik_onayi: true });

    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla-istek',
      payload: { email: iptal.email },
    });
    const eskiKod = sonKod();

    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla-istek',
      payload: { email: iptal.email },
    });

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla',
      payload: { email: iptal.email, kod: eskiKod, yeni_parola: 'Beyaz-Tahta-33' },
    });

    expect(cevap.statusCode).toBe(401);
  });

  it('e-postada ham kod var ama veritabanında yok', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/parola-sifirla-istek',
      payload: { email: kullanici.email },
    });
    const kod = sonKod();

    const kayitlar = await uygulama.ortam.db.execute<{ kod_hash: string }>(
      sqlHam`select kod_hash from dogrulama_kodlari`,
    );

    expect(kayitlar.rows.every((r) => !r.kod_hash.includes(kod))).toBe(true);
  });
});

describe('e-posta doğrulama', () => {
  function sonKod(): string {
    return uygulama.kutu[uygulama.kutu.length - 1]?.govde.match(/\b\d{6}\b/)?.[0] ?? '';
  }

  it('kod gönderilir ve doğrulama çalışır', async () => {
    const kayit = await kayitOl({ ...gecerliKayit, email: 'dogrula@made2fit.io' });
    const basliklar = { authorization: `Bearer ${kayit.json().erisim_token}` };

    const gonder = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/eposta-dogrula-gonder',
      headers: basliklar,
      payload: {},
    });
    expect(gonder.json().durum).toBe('gonderildi');

    const dogrula = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/eposta-dogrula',
      headers: basliklar,
      payload: { kod: sonKod() },
    });
    expect(dogrula.json().durum).toBe('dogrulandi');

    const ben = await app.inject({ method: 'GET', url: '/v1/kimlik/ben', headers: basliklar });
    expect(ben.json().email_dogrulandi_at).not.toBeNull();
  });

  it('doğrulanmış hesapta tekrar kod gönderilmez', async () => {
    const kayit = await kayitOl({ ...gecerliKayit, email: 'dogrulandi2@made2fit.io' });
    const basliklar = { authorization: `Bearer ${kayit.json().erisim_token}` };

    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/eposta-dogrula-gonder',
      headers: basliklar,
      payload: {},
    });
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/eposta-dogrula',
      headers: basliklar,
      payload: { kod: sonKod() },
    });

    const tekrar = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/eposta-dogrula-gonder',
      headers: basliklar,
      payload: {},
    });
    expect(tekrar.json().durum).toBe('zaten_dogrulanmis');
  });

  it('yanlış kod reddedilir', async () => {
    const kayit = await kayitOl({ ...gecerliKayit, email: 'yanliskod@made2fit.io' });
    const basliklar = { authorization: `Bearer ${kayit.json().erisim_token}` };

    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/eposta-dogrula-gonder',
      headers: basliklar,
      payload: {},
    });

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/eposta-dogrula',
      headers: basliklar,
      payload: { kod: '111111' },
    });
    expect(cevap.statusCode).toBe(401);
  });

  it('token olmadan doğrulama yapılamaz', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/eposta-dogrula',
      payload: { kod: '123456' },
    });

    expect(cevap.statusCode).toBe(401);
  });
});

describe('POST /v1/kimlik/dil', () => {
  it('desteklenen dile geçer ve /ben bunu yansıtır', async () => {
    const oturum = (await kayitOl({ ...gecerliKayit, email: 'dil-degistiren@made2fit.io' })).json();

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/dil',
      headers: { authorization: `Bearer ${oturum.erisim_token}` },
      payload: { dil: 'en' },
    });

    expect(cevap.statusCode).toBe(200);
    expect(cevap.json().locale).toBe('en');

    const ben = await app.inject({
      method: 'GET',
      url: '/v1/kimlik/ben',
      headers: { authorization: `Bearer ${oturum.erisim_token}` },
    });
    expect(ben.json().locale).toBe('en');
  });

  it('desteklenmeyen dili reddeder — yarım çevrilmiş arayüz göstermeyiz', async () => {
    const oturum = (await kayitOl({ ...gecerliKayit, email: 'dil-reddi@made2fit.io' })).json();

    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/dil',
      headers: { authorization: `Bearer ${oturum.erisim_token}` },
      payload: { dil: 'de' },
    });

    expect(cevap.statusCode).toBe(400);
  });

  it('oturumsuz değiştirilemez', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/kimlik/dil',
      payload: { dil: 'en' },
    });

    expect(cevap.statusCode).toBe(401);
  });
});
