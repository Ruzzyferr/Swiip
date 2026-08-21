import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HAREKET_KATALOGU } from '@swiip/shared';
import { hareketBul, muadilZinciri } from '@swiip/core';
import { Bulunamadi } from '../hatalar';

/**
 * Hareket kütüphanesi.
 *
 * Katalog kodda derli olduğu için bu uçlar veritabanına hiç gitmez; istemci tamamını
 * bir kez indirip çevrimdışı kullanabilir (F1.9 — uçak modunda program açılır).
 *
 * Hepsi kimlik doğrulaması ister. Türkçe talimat kütüphanesi bizim türettiğimiz varlık;
 * `CLAUDE.md` wger'i tam da bunu rakibe açmamak için reddediyor. Aynı kütüphaneyi açık
 * bir uçtan servis etmek, reddettiğimiz şeyi kendi elimizle yapmak olurdu. Çevrimdışı
 * kullanım bozulmuyor: istemci bir kez oturumla indirip önbelleğe alıyor.
 */

export async function hareketRotalari(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { kas, ekipman, patern } = z
      .object({
        kas: z.string().optional(),
        ekipman: z.string().optional(),
        patern: z.string().optional(),
      })
      .parse(istek.query);

    let sonuc = [...HAREKET_KATALOGU];
    if (kas) sonuc = sonuc.filter((h) => h.birincil_kas.includes(kas as never));
    if (ekipman) sonuc = sonuc.filter((h) => h.ekipman.includes(ekipman as never));
    if (patern) sonuc = sonuc.filter((h) => h.patern === patern);

    return { toplam: sonuc.length, hareketler: sonuc };
  });

  /** Çevrimdışı önbellek için sürüm damgası; değişmediyse istemci indirmez. */
  app.get('/surum', { preHandler: app.kimlikDogrula }, async () => ({
    surum: HAREKET_KATALOGU.length,
    hareket_sayisi: HAREKET_KATALOGU.length,
  }));

  app.get('/:id', { preHandler: app.kimlikDogrula }, async (istek) => {
    const { id } = z.object({ id: z.string() }).parse(istek.params);

    const hareket = hareketBul(id);
    if (!hareket) throw Bulunamadi('Böyle bir hareket yok.', 'hareket_yok');

    return {
      ...hareket,
      muadiller: muadilZinciri(id, { ekipman: hareket.ekipman }).map((h) => ({
        id: h.id,
        ad_tr: h.ad_tr,
      })),
    };
  });
}
