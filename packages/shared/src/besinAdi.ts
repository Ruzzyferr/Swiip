import type { Dil } from './diller';
import { varsayilanDil } from './diller';

/**
 * Besinin ve ev ölçüsünün kullanıcının dilindeki adı.
 *
 * Besin veritabanı Türk mutfağından doğdu ve uzun süre yalnızca `name_tr` taşıdı; uygulama
 * 175 ülkede açıldığında İngilizce arayüzdeki kullanıcı "chicken" aradığında hiçbir şey
 * bulamıyor, günlüğünde "Tavuk göğsü, pişmiş" okuyordu. `name_en` artık tohumdaki her
 * besinde var (testle kilitli); bu yardımcı ikisi arasında seçiyor.
 *
 * İngilizce adı olmayan kayıt (ör. Open Food Facts'ten yalnız Türkçe adla gelen barkod)
 * Türkçesine düşer: boş satır göstermektense izi göstermek.
 */
export interface AdlandirilabilirBesin {
  name_tr?: string | null;
  name_en?: string | null;
}

export function besinAdi(
  besin: AdlandirilabilirBesin | undefined | null,
  dil: Dil = varsayilanDil,
  yedek = '',
): string {
  if (!besin) return yedek;
  const en = besin.name_en?.trim();
  const tr = besin.name_tr?.trim();
  if (dil === 'en' && en) return en;
  return tr || en || yedek;
}

/** Sözlükteki ev ölçüleri: kimlik → miktarlı görünen metin ("2 kase", "2 bowls"). */
export type PorsiyonSozlugu = Readonly<Record<string, (miktar: number) => string>>;

/**
 * Ev ölçüsünün görünen adı — `portion_id` üzerinden sözlükten.
 *
 * Veride saklanan `ad` ('1 kase', '1 su bardağı') Türkçe bir dize ve olduğu gibi basılırsa
 * İngilizce arayüzde Türkçe kalır. Saklanan kimlik değişmiyor; yalnızca gösterilen metin
 * sözlükten geliyor. Günlük de buradan geçiyor: eskiden "2" + "1 kase" yan yana basılıp
 * "2 1 kase" çıkıyordu.
 *
 * Sözlükte karşılığı olmayan kimlik (dış kaynaktan gelen bir porsiyon) verideki adına
 * düşer; o da yoksa boş döner ve çağıran grama düşer — ham kimlik asla basılmaz.
 */
export function porsiyonAdi(
  sozluk: PorsiyonSozlugu,
  id: string | null | undefined,
  yedekAd?: string | null,
  miktar = 1,
): string {
  if (id && Object.prototype.hasOwnProperty.call(sozluk, id)) return sozluk[id]!(miktar);
  if (yedekAd) return miktar === 1 ? yedekAd : `${miktar} × ${yedekAd}`;
  return '';
}
