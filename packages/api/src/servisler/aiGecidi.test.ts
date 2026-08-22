import { describe, expect, it, vi } from 'vitest';
import { gatewayIstemcisi } from './aiGecidi';

/**
 * Gateway istemcisinin gövdesi.
 *
 * Bu testler "istek gitti mi"yi değil, **modelin ne gördüğünü** doğruluyor. Persona
 * koşusunda ortaya çıkan hata tam buradaydı: fotoğraf `content` alanına düz metin
 * olarak yazılıyordu. İstek 200 dönüyor, ölçüm sayfaları doluyor, hiçbir yerde hata
 * görünmüyordu — ama model fotoğrafı hiç görmemişti ve fatura 90 katına çıkıyordu.
 *
 * Bir daha sessizce olmasın diye gövdenin şekli teste bağlandı.
 */

const JPEG = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBk=';

function sahteFetch(cevap: unknown = { content: [{ text: 'tamam' }], usage: {} }) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => cevap,
  });
}

function govdeyiOku(cagri: ReturnType<typeof vi.fn>) {
  return JSON.parse(cagri.mock.calls[0]![1].body as string);
}

describe('gatewayIstemcisi — metin isteği', () => {
  it('görsel yoksa içerik düz metin kalır', async () => {
    const f = sahteFetch();
    const istemci = gatewayIstemcisi({ url: 'https://ornek', anahtar: 'k', fetch: f });

    await istemci.metinUret({
      is: 'koc_sohbeti',
      sistem: 'sistem',
      kullanici: 'merhaba',
      max_cikti_token: 100,
    });

    expect(govdeyiOku(f).messages[0].content).toBe('merhaba');
  });
});

describe('gatewayIstemcisi — görsel isteği', () => {
  it('fotoğraf ayrı bir image bloğu olarak gider, metne gömülmez', async () => {
    const f = sahteFetch();
    const istemci = gatewayIstemcisi({ url: 'https://ornek', anahtar: 'k', fetch: f });

    await istemci.metinUret({
      is: 'yemek_tanima',
      sistem: 'sistem',
      kullanici: 'Bu tabakta ne var?',
      max_cikti_token: 100,
      gorseller: [{ ortam_tipi: 'image/jpeg', veri: JPEG }],
    });

    const icerik = govdeyiOku(f).messages[0].content;

    expect(Array.isArray(icerik)).toBe(true);
    expect(icerik[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: JPEG },
    });
    expect(icerik[1]).toEqual({ type: 'text', text: 'Bu tabakta ne var?' });
  });

  /**
   * Base64 gövdesinin istek metnine sızması, düzeltilen hatanın ta kendisi.
   * Metin bloğunda fotoğrafın tek bir parçası bile görünmemeli.
   */
  it('base64 gövdesi metin bloğuna sızmaz', async () => {
    const f = sahteFetch();
    const istemci = gatewayIstemcisi({ url: 'https://ornek', anahtar: 'k', fetch: f });

    await istemci.metinUret({
      is: 'yemek_tanima',
      sistem: 'sistem',
      kullanici: 'Bu tabakta ne var?',
      max_cikti_token: 100,
      gorseller: [{ ortam_tipi: 'image/jpeg', veri: JPEG }],
    });

    const metinBloklari = govdeyiOku(f)
      .messages[0].content.filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join(' ');

    expect(metinBloklari).not.toContain(JPEG.slice(0, 24));
  });

  it('birden çok görsel sırayla gider — poz sırası anlam taşıyor', async () => {
    const f = sahteFetch();
    const istemci = gatewayIstemcisi({ url: 'https://ornek', anahtar: 'k', fetch: f });

    await istemci.metinUret({
      is: 'vucut_analizi',
      sistem: 'sistem',
      kullanici: 'ön, yan, arka',
      max_cikti_token: 100,
      gorseller: [
        { ortam_tipi: 'image/jpeg', veri: 'AAA' },
        { ortam_tipi: 'image/png', veri: 'BBB' },
      ],
    });

    const icerik = govdeyiOku(f).messages[0].content;

    expect(icerik.map((b: { type: string }) => b.type)).toEqual(['image', 'image', 'text']);
    expect(icerik[1].source.media_type).toBe('image/png');
  });

  it('boş görsel listesi düz metne düşer', async () => {
    const f = sahteFetch();
    const istemci = gatewayIstemcisi({ url: 'https://ornek', anahtar: 'k', fetch: f });

    await istemci.metinUret({
      is: 'koc_sohbeti',
      sistem: 'sistem',
      kullanici: 'merhaba',
      max_cikti_token: 100,
      gorseller: [],
    });

    expect(govdeyiOku(f).messages[0].content).toBe('merhaba');
  });
});
