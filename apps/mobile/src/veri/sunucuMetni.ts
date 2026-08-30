import { apiHataMetni, type Metinler } from '@swiip/shared';

/**
 * Sunucudan gelen bir bildirimi KULLANICININ DİLİNDE kurar.
 *
 * Mimari `hatalar.ts`'te yazılı: sunucu `kod` yolluyor, istemci metni kendi
 * sözlüğünden kuruyor, kodu çözemezse sunucunun Türkçe mesajına düşüyor. Hata
 * yolunda (`api.ts`) bu zaten yapılıyordu.
 *
 * Ama BAŞARILI yanıtlar (200) hata yolundan geçmiyor ve içlerindeki `mesaj` alanı
 * ekrana ham basılıyordu. Ölçüldü (2026-08-31): İngilizce hesapla açılan Beslenme
 * ekranının tamamı İngilizce, ortadaki paragraf Türkçe — sunucunun
 * `kod: 'plan_yetersiz'` ile birlikte gönderdiği Türkçe yedek metin.
 *
 * Beş ekran aynı deseni kullanıyordu. Tek yerde çözmek, altıncısı eklendiğinde
 * unutulmasını da engelliyor.
 */
export function sunucuMetni(
  kaynak: { kod?: string; mesaj?: string; degerler?: Record<string, string | number> } | null,
  metinler: Metinler,
): string | undefined {
  if (!kaynak) return undefined;
  return apiHataMetni(kaynak, metinler.apiHatalari);
}
