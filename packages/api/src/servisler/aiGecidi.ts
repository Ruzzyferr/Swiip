import type { AiCevap, AiIstek, AiIstemcisi } from '@made2fit/core';
import { modelSec } from '@made2fit/core';

/**
 * AI gateway istemcisi.
 *
 * Tek entegrasyon, iş başına model seçimi, sağlayıcı bağımlılığı yok. Fiyat değiştiğinde
 * yalnızca çekirdekteki fiyat tablosu değişir; bu dosya aynı kalır.
 *
 * Zaman aşımı kısa tutulur: AI gecikirse ürün beklemez, deterministik yedeğe düşer.
 */

const ZAMAN_ASIMI_MS = 20_000;

/** İş seviyesi -> gateway model kimliği. Gateway bu adları kendi sağlayıcılarına eşler. */
const MODEL_ADLARI: Record<string, string> = {
  guclu: 'anthropic/claude-opus-4',
  guclu_gorsel: 'anthropic/claude-opus-4',
  orta: 'anthropic/claude-sonnet-4',
  ucuz: 'anthropic/claude-haiku-4',
  ucuz_gorsel: 'anthropic/claude-haiku-4',
};

export interface GatewaySecenekleri {
  url: string;
  anahtar: string;
  zamanAsimiMs?: number;
}

export function gatewayIstemcisi(secenekler: GatewaySecenekleri): AiIstemcisi {
  return {
    async metinUret(istek: AiIstek): Promise<AiCevap> {
      const secim = modelSec(istek.is);
      const model = MODEL_ADLARI[secim.seviye] ?? MODEL_ADLARI.orta!;

      const durdurucu = new AbortController();
      const zamanlayici = setTimeout(
        () => durdurucu.abort(),
        secenekler.zamanAsimiMs ?? ZAMAN_ASIMI_MS,
      );

      try {
        const yanit = await fetch(`${secenekler.url}/v1/messages`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${secenekler.anahtar}`,
          },
          body: JSON.stringify({
            model,
            max_tokens: Math.min(istek.max_cikti_token, secim.max_cikti_token),
            system: istek.sistem,
            messages: [{ role: 'user', content: istek.kullanici }],
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
