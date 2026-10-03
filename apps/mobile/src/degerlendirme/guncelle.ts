import { router } from 'expo-router';
import { istek } from '../veri/api';
import { ANAHTARLAR, sil } from '../veri/onbellek';

/**
 * Değerlendirmenin YENİ SÜRÜMÜNÜ açar ve değerlendirme ekranına gider.
 *
 * Ayarlar'daki "Değerlendirmeyi güncelle" ve hedef raporundaki "Hedefimi güncelle" aynı
 * işi yapıyor; ikincisi kullanıcıyı Ayarlar'a gönderiyordu. `blok` verilirse doğrudan o
 * kart açılıyor.
 *
 * Yeni sürüm eski taslakla açılmasın: taslak, tamamlanmış sürümün kalıntısı.
 */
export async function degerlendirmeyiGuncelle(blok?: string): Promise<void> {
  await sil(ANAHTARLAR.degerlendirmeTaslagi);
  await istek('/v1/degerlendirme/yeni-surum', { yontem: 'POST', govde: {} });
  router.push(blok ? { pathname: '/degerlendirme', params: { blok } } : '/degerlendirme');
}
