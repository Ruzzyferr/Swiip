import type { AiCevap, AiIstek, AiIstemcisi } from '@swiip/core';
import { modelAdi, modelSec } from '@swiip/core';

/**
 * AI gateway istemcisi.
 *
 * Tek entegrasyon, iş başına model seçimi, sağlayıcı bağımlılığı yok. Fiyat değiştiğinde
 * yalnızca çekirdekteki fiyat tablosu değişir; bu dosya aynı kalır.
 *
 * Zaman aşımı kısa tutulur: AI gecikirse ürün beklemez, deterministik yedeğe düşer.
 */

const ZAMAN_ASIMI_MS = 20_000;

export interface GatewaySecenekleri {
  url: string;
  anahtar: string;
  zamanAsimiMs?: number;
  /** Testlerde gövdeyi okuyabilmek için; üretimde global `fetch`. */
  fetch?: typeof globalThis.fetch;
}

/**
 * Anthropic biçiminde mesaj içeriği.
 *
 * Görsel varsa içerik bir **blok dizisi** olmak zorunda; düz dize olarak gönderilen
 * fotoğraf model tarafından görsel değil, harf dizisi olarak okunur.
 */
type IcerikBlogu =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

function icerikKur(istek: AiIstek): string | IcerikBlogu[] {
  if (!istek.gorseller || istek.gorseller.length === 0) return istek.kullanici;

  return [
    ...istek.gorseller.map((g): IcerikBlogu => ({
      type: 'image',
      source: { type: 'base64', media_type: g.ortam_tipi, data: g.veri },
    })),
    { type: 'text', text: istek.kullanici },
  ];
}

export function gatewayIstemcisi(secenekler: GatewaySecenekleri): AiIstemcisi {
  return {
    async metinUret(istek: AiIstek): Promise<AiCevap> {
      const secim = modelSec(istek.is);
      // Ad çekirdekteki fiyat tablosuyla aynı satırdan geliyor; ikisi ayrışamaz.
      const model = modelAdi(secim.seviye);

      const agaGit = secenekler.fetch ?? globalThis.fetch;
      const durdurucu = new AbortController();
      const zamanlayici = setTimeout(
        () => durdurucu.abort(),
        secenekler.zamanAsimiMs ?? ZAMAN_ASIMI_MS,
      );

      try {
        const yanit = await agaGit(`${secenekler.url}/v1/messages`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${secenekler.anahtar}`,
          },
          body: JSON.stringify({
            model,
            max_tokens: Math.min(istek.max_cikti_token, secim.max_cikti_token),
            system: istek.sistem,
            messages: [{ role: 'user', content: icerikKur(istek) }],
          }),
          signal: durdurucu.signal,
        });

        if (!yanit.ok) {
          throw new Error(`gateway ${yanit.status}`);
        }

        const govde = (await yanit.json()) as {
          content?: Array<{ text?: string }>;
          usage?: { input_tokens?: number; output_tokens?: number };
        };

        return {
          metin: govde.content?.map((p) => p.text ?? '').join('') ?? '',
          girdi_token: govde.usage?.input_tokens ?? 0,
          cikti_token: govde.usage?.output_tokens ?? 0,
          model,
        };
      } finally {
        clearTimeout(zamanlayici);
      }
    },
  };
}
