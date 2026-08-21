import { offUrunuCevir, type IthalBesin, type OffUrun } from '@swiip/core';

/**
 * Barkod sorgulama (F5.5, F5.9).
 *
 * Kendi veritabanımızda olmayan bir barkod için Open Food Facts'e sorulur ve sonuç
 * yerel veritabanına yazılır. Böylece ikinci kullanıcı ağa hiç çıkmaz.
 *
 * Neden toplu içe aktarma değil de istek anında sorgu: ODbL "share-alike" yükümlülüğü
 * türetilmiş veritabanını dağıtmakta doğar. Tek tek ürün çekip önbelleklemek, 9.000
 * kayıtlık bir çıkarımı ürünle birlikte dağıtmaktan farklı bir hukuki durum. Toplu içe
 * aktarma betiği duruyor ama çalıştırılması hukuki bir karar — bkz. docs/durum.md.
 *
 * Arayüz enjekte edilebilir: testler ağa çıkmaz.
 */

export interface BarkodSaglayici {
  ara(barkod: string): Promise<IthalBesin | null>;
}

const OFF_ALANLARI = [
  'code',
  'product_name',
  'product_name_tr',
  'brands',
  'serving_size',
  'serving_quantity',
  'nutriments',
].join(',');

export interface OffSecenekleri {
  /** Kısa tutuyoruz: kullanıcı barkodu okuttu, elinde telefonla bekliyor. */
  zamanAsimiMs?: number;
  tabanUrl?: string;
}

export function offSaglayici(secenekler: OffSecenekleri = {}): BarkodSaglayici {
  const zamanAsimi = secenekler.zamanAsimiMs ?? 4000;
  const taban = secenekler.tabanUrl ?? 'https://world.openfoodfacts.org';

  return {
    async ara(barkod) {
      const durdurucu = new AbortController();
      const zamanlayici = setTimeout(() => durdurucu.abort(), zamanAsimi);

      try {
        const yanit = await fetch(
          `${taban}/api/v2/product/${encodeURIComponent(barkod)}?fields=${OFF_ALANLARI}`,
          {
            headers: { 'user-agent': 'Swiip/0.1 (swiip.app)' },
            signal: durdurucu.signal,
          },
        );

        if (!yanit.ok) return null;

        const govde = (await yanit.json()) as { status?: number; product?: OffUrun };
        if (govde.status !== 1 || !govde.product) return null;

        // Barkod alanı yanıtta boş gelebiliyor; sorduğumuz barkodu yazıyoruz.
        return offUrunuCevir({ ...govde.product, code: govde.product.code || barkod });
      } catch {
        // Ağ hatası "ürün yok" demek değil ama kullanıcı için sonuç aynı: elle ekler.
        return null;
      } finally {
        clearTimeout(zamanlayici);
      }
    },
  };
}

/** Testler için: sabit bir sözlükten cevap verir, ağa çıkmaz. */
export function sahteBarkodSaglayici(kayitlar: Record<string, IthalBesin>): BarkodSaglayici & {
  cagriSayisi: number;
} {
  const saglayici = {
    cagriSayisi: 0,
    async ara(barkod: string) {
      saglayici.cagriSayisi += 1;
      return kayitlar[barkod] ?? null;
    },
  };
  return saglayici;
}
