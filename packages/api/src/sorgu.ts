import { z } from 'zod';

/**
 * Sorgu dizesindeki mantıksal değer.
 *
 * `z.coerce.boolean()` burada kullanılamaz: JavaScript'te boş olmayan her dize doğrudur,
 * yani `?dolaptan=false` da `true` olur. Kaydırmalı destede tam bu oldu — buzdolabı
 * süzgeci kapalıyken de açık çalışıyordu ve dolabı boş olan herkes her öğünde
 * "deste bitti" görüyordu. Üstelik gösterilen gerekçe de yanlıştı: kullanıcıya
 * "dolabına zeytinyağı eklersen 56 seçenek açılır" deniyordu, oysa süzgeç zaten
 * kapalıydı ve zeytinyağının hiçbir etkisi olmayacaktı.
 *
 * Bilinmeyen bir değer sessizce `false` sayılmıyor: sunucunun istemciyi yanlış
 * anlaması, hatayı yıllarca görünmez kılan türden bir sessizlik.
 */
export function sorguBooleani(varsayilan: boolean) {
  return z
    .enum(['true', 'false', '1', '0'])
    .default(varsayilan ? 'true' : 'false')
    .transform((deger) => deger === 'true' || deger === '1');
}
