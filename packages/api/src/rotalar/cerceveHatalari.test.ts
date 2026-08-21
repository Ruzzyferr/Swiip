import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { testUygulamasi, type TestUygulama } from '../test/uygulama';

/**
 * Çerçeveden gelen 4xx hataları 500'e düşmemeli.
 *
 * Hata işleyicisi `UygulamaHatasi`, `ZodError` ve 429'u tanıyordu; geri kalan **her şey**
 * `500 sunucu_hatasi` oluyordu. Oysa Fastify'ın kendi hataları da bir `statusCode`
 * taşıyor ve çoğu 4xx: boş gövde, bozuk JSON, desteklenmeyen içerik tipi, gövde
 * sınırının aşılması.
 *
 * Bu üç şeyi birden bozuyordu:
 *
 * 1. **Kullanıcıya yalan.** İstek hatalıyken "Bir şeyler ters gitti" demek, suçu sunucuya
 *    atmak. İstemci de aynı sınıfa girip "sunucu hatası" gösteriyor. `cihazda-calistirma.md`
 *    4. maddede tam bu vardı: sunucunun reddi "bağlantı yok" diye gösteriliyordu.
 * 2. **İzlemeyi boğuyor.** Her bozuk istemci isteği `beklenmeyen hata` seviyesinde
 *    loglanıyordu; gerçek çökmeler bu gürültünün içinde kaybolur.
 * 3. **Çeviriyi kırıyor.** İstemci metni `kod` alanından kuruyor; 500'ün kodu
 *    `sunucu_hatasi` olduğu için kullanıcı ne yapacağını öğrenemiyordu.
 */

let uygulama: TestUygulama;
let app: FastifyInstance;
let token: string;

beforeAll(async () => {
  uygulama = await testUygulamasi();
  app = uygulama.app;

  const kayit = await app.inject({
    method: 'POST',
    url: '/v1/kimlik/kayit',
    payload: { email: 'cerceve@swiip.app', parola: 'Kirmizi-Bisiklet-42', saglik_onayi: true },
  });
  token = kayit.json().erisim_token;
}, 60_000);

afterAll(async () => {
  await uygulama?.kapat();
});

function yetkili() {
  return { authorization: `Bearer ${token}` };
}

describe('bozuk istekler 4xx döner, 500 değil', () => {
  it('içerik tipi JSON ama gövde boşsa 400 döner', async () => {
    const cevap = await app.inject({
      method: 'DELETE',
      url: '/v1/hesap',
      headers: { ...yetkili(), 'content-type': 'application/json' },
      payload: '',
    });

    expect(cevap.statusCode).toBe(400);
    expect(cevap.json().kod).toBeTruthy();
    expect(cevap.json().kod).not.toBe('sunucu_hatasi');
  });

  it('bozuk JSON gövdesi 400 döner', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/kilo',
      headers: { ...yetkili(), 'content-type': 'application/json' },
      payload: '{"kilo_kg": 80,,,}',
    });

    expect(cevap.statusCode).toBe(400);
    expect(cevap.json().kod).not.toBe('sunucu_hatasi');
  });

  it('desteklenmeyen içerik tipi 415 döner', async () => {
    const cevap = await app.inject({
      method: 'POST',
      url: '/v1/beslenme/kilo',
      headers: { ...yetkili(), 'content-type': 'application/xml' },
      payload: '<kilo>80</kilo>',
    });

    expect(cevap.statusCode).toBe(415);
    expect(cevap.json().kod).not.toBe('sunucu_hatasi');
  });

  it('hiçbir bozuk istek 500 üretmiyor', async () => {
    const denemeler: Array<[string, string, string, string]> = [
      ['DELETE', '/v1/hesap', 'application/json', ''],
      ['POST', '/v1/beslenme/kilo', 'application/json', '{'],
      ['POST', '/v1/beslenme/kilo', 'application/json', 'null'],
      ['POST', '/v1/beslenme/kilo', 'text/plain', 'kilo=80'],
      ['POST', '/v1/program/uret', 'application/json', '[]'],
      ['POST', '/v1/ogun/degistir', 'application/json', '{"hafta_basi":"bozuk"}'],
    ];

    const besyuzler: string[] = [];
    for (const [yontem, url, tip, govde] of denemeler) {
      const cevap = await app.inject({
        method: yontem as 'POST',
        url,
        headers: { ...yetkili(), 'content-type': tip },
        payload: govde,
      });
      if (cevap.statusCode >= 500) {
        besyuzler.push(`${yontem} ${url} (${tip}) → ${cevap.statusCode}`);
      }
      // Sözleşme: her hata cevabında istemcinin çevirebileceği bir kod var.
      if (cevap.statusCode >= 400) {
        expect(cevap.json().kod, `${yontem} ${url} kodsuz döndü`).toBeTruthy();
      }
    }

    expect(besyuzler.join('\n')).toBe('');
  });
});
