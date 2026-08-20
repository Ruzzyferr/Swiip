import { createHash } from 'node:crypto';
import type { AiIstemcisi, GorselAnalizCiktisi } from '@made2fit/core';
import { modelSec } from '@made2fit/core';

/**
 * Görsel analiz köprüsü.
 *
 * Bu dosyanın tek sorumluluğu: fotoğrafı modele gönderip **sayı** almak.
 * Fotoğraf hiçbir koşulda diske yazılmaz, kuyruğa konmaz, loglanmaz.
 * Dönüş değerinde fotoğrafın kendisi yer almaz.
 */

export interface Fotograf {
  poz: 'on' | 'yan' | 'arka';
  veri: string;
}

export interface AnalizGirdisi {
  fotograflar: Fotograf[];
  aiIstemcisi?: AiIstemcisi;
}

const SISTEM_MESAJI = [
  'Sen bir vücut kompozisyonu tahmin aracısın. Fotoğraftan yalnızca sayısal tahmin çıkarırsın.',
  'KURALLAR:',
  '1. Tanı koymazsın. Duruş bulgularını yalnızca listedeki etiketlerden seçersin.',
  '2. Yağ oranını tek sayı olarak verirsin; aralığı sistem hesaplar.',
  '3. Kişi hakkında yorum, tavsiye veya değer yargısı yazmazsın.',
  '4. Yalnızca JSON döndürürsün.',
  'ÇIKTI: {"yag_orani": number, "kas_dagilimi": {"bolge": 1-5}, "durus": ["etiket"]}',
  'GEÇERLİ DURUŞ ETİKETLERİ: omuz_protraksiyonu, bas_one, pelvik_egim, ust_sirt_yuvarlanma,',
  'omuz_asimetrisi, diz_ice_donme',
].join('\n');

const GECERLI_DURUSLAR = new Set([
  'omuz_protraksiyonu',
  'bas_one',
  'pelvik_egim',
  'ust_sirt_yuvarlanma',
  'omuz_asimetrisi',
  'diz_ice_donme',
]);

export async function fotografiAnalizEt(girdi: AnalizGirdisi): Promise<GorselAnalizCiktisi> {
  if (!girdi.aiIstemcisi) {
    // Model bağlı değilse fotoğraf hiç kullanılmaz; akış ölçülerle devam eder.
    return { kasDagilimi: {}, durusBayraklari: [] };
  }

  const secim = modelSec('vucut_analizi');

  const cevap = await girdi.aiIstemcisi.metinUret({
    is: 'vucut_analizi',
    sistem: SISTEM_MESAJI,
    // Fotoğraf içeriği yalnızca bu çağrıda; değişken çağrı bitince erişilemez hâle gelir.
    kullanici: JSON.stringify({
      pozlar: girdi.fotograflar.map((f) => ({ poz: f.poz, veri: f.veri })),
    }),
    max_cikti_token: secim.max_cikti_token,
  });

  return ciktiyiAyristir(cevap.metin);
}

/** Model çıktısı asla doğrudan güvenilmez; tip ve sınır kontrolünden geçirilir. */
export function ciktiyiAyristir(ham: string): GorselAnalizCiktisi {
  try {
    const json = JSON.parse(ham) as Record<string, unknown>;

    const yagOrani = typeof json.yag_orani === 'number' ? json.yag_orani : undefined;
    const kasDagilimi: Record<string, number> = {};

    if (json.kas_dagilimi && typeof json.kas_dagilimi === 'object') {
      for (const [bolge, skor] of Object.entries(json.kas_dagilimi as Record<string, unknown>)) {
        if (typeof skor === 'number' && skor >= 1 && skor <= 5) {
          kasDagilimi[bolge] = Math.round(skor);
        }
      }
    }

    const durusBayraklari = Array.isArray(json.durus)
      ? json.durus.filter((d): d is string => typeof d === 'string' && GECERLI_DURUSLAR.has(d))
      : [];

    return {
      ...(yagOrani !== undefined && yagOrani >= 3 && yagOrani <= 65 ? { yagOrani } : {}),
      kasDagilimi,
      durusBayraklari,
    };
  } catch {
    // Bozuk çıktıda sessizce ölçü tabanlı akışa düşülür.
    return { kasDagilimi: {}, durusBayraklari: [] };
  }
}

/**
 * Görsel parmak izi — yemek tanıma önbelleği için (F7.1).
 * Fotoğrafın kendisi değil, yalnızca özeti saklanır.
 */
export function gorselParmakIzi(base64: string): string {
  return createHash('sha256').update(base64).digest('hex').slice(0, 32);
}
