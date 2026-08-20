import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';

/**
 * Vücut analizi raporu, hakkı ikinci kez harcamadan görüntülenebilmeli.
 *
 * Emülatörde bulundu: kullanıcı üç fotoğrafını çekiyor, "Analizi başlat" düğmesine **bir
 * kez** basıyor ve sunucuya **iki** istek gidiyor (76 ms arayla). Sebep tek düğme değil,
 * iki ekran:
 *
 *   `fotograf/cekim.tsx`  → POST /v1/vucut/analiz  (fotoğraflarla)  → 200, hak harcanır
 *   `rapor/index.tsx`     → POST /v1/vucut/analiz  (boş gövdeyle)   → 403, hak bitti
 *
 * Sonuç ücretsiz katmanda yıkıcı: ömür boyu tek analiz hakkı kullanıcının kendi
 * çekimiyle harcanıyor, sonra rapor ekranı aynı ucu tekrar çağırıp 403 alıyor ve
 * kullanıcı **kendi analizini hiç göremiyor.** Ücretsiz katmanın teslim ettiği tek
 * çıktı buydu.
 *
 * `POST /analiz` bilerek yaratıcı bir uç: her çağrıda yeni analiz üretiyor. Sorun ucun
 * kendisi değil, raporu OKUMAK için de onun çağrılmasıydı. Okuma ile yazma ayrıldı.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;

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
  S18: 'Hayır',
  E1: 'Ev',
  E3: ['Hiçbiri, vücut ağırlığı'],
  Z1: '3 gün',
  Z2: '45 dakika',
  Y1: '7-8 saat',
  Y4: 'Masa başı, çoğunlukla oturarak',
  Y6: 4,
};

async function ucretsizKullanici(email: string): Promise<string> {
  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email, parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true, olcum_onayi: true },
  });
  const token = kayit.json().erisim_token as string;
  const basliklar = { authorization: `Bearer ${token}` };

  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/cevap',
    headers: basliklar,
    payload: { cevaplar: CEVAPLAR },
  });
  await app.inject({
    method: 'POST',
    url: '/v1/degerlendirme/tamamla',
    headers: basliklar,
    payload: {},
  });
  return token;
}

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;
}, 60_000);

afterAll(async () => {
  await uygulama?.kapat();
});

describe('rapor ikinci kez hak harcamadan okunur', () => {
  it('analiz üretildikten sonra son rapor okunabilir', async () => {
    const token = await ucretsizKullanici('rapor-oku@made2fit.io');
    const basliklar = { authorization: `Bearer ${token}` };

    const uret = await app.inject({
      method: 'POST',
      url: '/v1/vucut/analiz',
      headers: basliklar,
      payload: { olculer: { bel_cm: 84, boyun_cm: 38 } },
    });
    expect(uret.statusCode).toBe(200);
    const uretilenId = uret.json().analiz_id;

    // Ücretsiz katmanda hak bitti; ama rapor hâlâ görülebilmeli.
    const tekrar = await app.inject({
      method: 'POST',
      url: '/v1/vucut/analiz',
      headers: basliklar,
      payload: {},
    });
    expect(tekrar.statusCode, 'ikinci üretim hâlâ engellenmeli').toBe(403);

    const son = await app.inject({
      method: 'GET',
      url: '/v1/vucut/analiz/son',
      headers: basliklar,
    });

    expect(son.statusCode, 'son rapor okunamıyor').toBe(200);
    expect(son.json().analiz_id).toBe(uretilenId);
    expect(son.json().rapor).toBeTruthy();
    // Rapor ekranı bu iki alanı da okuyor.
    expect(son.json()).toHaveProperty('sayilar_gizli');
    expect(son.json()).toHaveProperty('gizlilik_notu');
  });

  it('okuma hakkı tüketmiyor — art arda beş okuma da çalışır', async () => {
    const token = await ucretsizKullanici('rapor-oku-2@made2fit.io');
    const basliklar = { authorization: `Bearer ${token}` };

    await app.inject({
      method: 'POST',
      url: '/v1/vucut/analiz',
      headers: basliklar,
      payload: { olculer: { bel_cm: 84, boyun_cm: 38 } },
    });

    for (let i = 0; i < 5; i += 1) {
      const okuma = await app.inject({
        method: 'GET',
        url: '/v1/vucut/analiz/son',
        headers: basliklar,
      });
      expect(okuma.statusCode, `${i + 1}. okuma başarısız`).toBe(200);
    }

    // Hiç yeni analiz yazılmamış olmalı.
    const liste = await app.inject({
      method: 'GET',
      url: '/v1/vucut/analizler',
      headers: basliklar,
    });
    expect(liste.json().analizler.length, 'okuma yeni kayıt üretti').toBe(1);
  });

  it('hiç analizi olmayan kullanıcıya 404 döner — sessiz boş cevap değil', async () => {
    const token = await ucretsizKullanici('rapor-yok@made2fit.io');

    const son = await app.inject({
      method: 'GET',
      url: '/v1/vucut/analiz/son',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(son.statusCode).toBe(404);
    expect(son.json().kod).toBeTruthy();
  });
  it('okunan rapor TAMAMEN kullanıcının dilinde — feragat dahil', async () => {
    const token = await ucretsizKullanici('rapor-dil@made2fit.io');
    const basliklar = { authorization: `Bearer ${token}` };

    await app.inject({
      method: 'POST',
      url: '/v1/vucut/analiz',
      headers: basliklar,
      payload: { olculer: { bel_cm: 84, boyun_cm: 38 } },
    });
    await app.inject({
      method: 'POST',
      url: '/v1/kimlik/dil',
      headers: basliklar,
      payload: { dil: 'en' },
    });

    const son = await app.inject({
      method: 'GET',
      url: '/v1/vucut/analiz/son',
      headers: basliklar,
    });
    expect(son.statusCode).toBe(200);

    /**
     * Kaçaklardan biri TIBBİ CİHAZ FERAGATİYDİ.
     *
     * İlk hâlinde okuma yolu yalnızca `ozet` ve `durus` çeviriyordu; `sinirlamalar`,
     * `feragat` ve bel/boy mesajı Türkçe kalıyordu. Emülatörde İngilizce arayüzde
     * doğrudan görüldü. `durum.md` zaten şunu söylüyor: çeviride kaybolabilecek en
     * tehlikeli cümle feragattir.
     */
    const rapor = son.json().rapor;
    expect(rapor.feragat, 'feragat Türkçe kalmış').not.toMatch(/tıbbi cihaz|teşhis koymaz/i);
    expect(String(rapor.feragat)).toMatch(/medical device/i);
    expect(JSON.stringify(rapor.sinirlamalar ?? []), 'sınırlamalar Türkçe kalmış').not.toMatch(
      /girmedin|ölçünü|doğrulayabiliyoruz/i,
    );
  });

  it('gizlilik notu fotoğraf gönderilip gönderilmediğini DOĞRU söyler', async () => {
    const token = await ucretsizKullanici('rapor-gizlilik@made2fit.io');
    const basliklar = { authorization: `Bearer ${token}` };

    // Ölçülerle üretilen analiz: "fotoğraf göndermedin" demeli.
    await app.inject({
      method: 'POST',
      url: '/v1/vucut/analiz',
      headers: basliklar,
      payload: { olculer: { bel_cm: 84, boyun_cm: 38 } },
    });

    const son = await app.inject({
      method: 'GET',
      url: '/v1/vucut/analiz/son',
      headers: basliklar,
    });

    /**
     * Not, kayıtlı bayraktan geliyor; duruş bayrağı sayısından ÇIKARILMIYOR.
     *
     * Çıkarım emülatörde yanlış çıktı: görsel analiz bayrak üretmediğinde (AI geçidi
     * yapılandırılmamışsa) üç fotoğraf çeken kullanıcıya "fotoğraf göndermedin"
     * deniyordu. Olmayan bir silme işleminden söz etmek kadar, yapılan bir silmeyi
     * inkâr etmek de güveni harcar.
     */
    expect(son.json().gizlilik_notu).toBeTruthy();
    expect(son.json().gizlilik_notu).toMatch(/ölçü|measurement/i);
  });
});
