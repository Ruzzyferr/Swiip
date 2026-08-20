import { randomInt, timingSafeEqual } from 'node:crypto';
import { tokenOzeti } from './parola';

/**
 * Doğrulama kodları — parola sıfırlama ve e-posta doğrulama.
 *
 * Altı hane, tek kullanımlık, kısa ömürlü. Veritabanında ham kod saklanmaz; yalnızca özeti.
 * Bağlantı yerine kod tercih edildi: kod, "gelen e-postadaki bağlantıya tıkla" alışkanlığını
 * pekiştirmediği için kimlik avına karşı daha dayanıklı.
 */

/** Yeterince kısa ki çalınan kod işe yaramasın, yeterince uzun ki kullanıcı yetişsin. */
export const KOD_OMRU_DAKIKA = 15;

const HANE = 6;

/**
 * Kriptografik rastgele altı haneli kod.
 * `randomInt` kullanılıyor: `Math.random()` tahmin edilebilir ve kimlik akışında kabul edilemez.
 */
export function kodUret(): string {
  return String(randomInt(0, 10 ** HANE)).padStart(HANE, '0');
}

export interface KodKaydi {
  kod_hash: string;
  expires_at: Date;
  kullanildi_at: Date | null;
}

export function kodGecerliMi(kayit: KodKaydi, girilen: string, simdi = new Date()): boolean {
  if (!girilen || girilen.length !== HANE) return false;
  if (kayit.kullanildi_at !== null) return false;
  if (kayit.expires_at.getTime() <= simdi.getTime()) return false;

  // Sabit zamanlı karşılaştırma: yanıt süresinden kod sızmasın.
  const beklenen = Buffer.from(kayit.kod_hash, 'utf8');
  const hesaplanan = Buffer.from(tokenOzeti(girilen), 'utf8');
  return beklenen.length === hesaplanan.length && timingSafeEqual(beklenen, hesaplanan);
}

export function kodSonGecerlilik(simdi = new Date()): Date {
  return new Date(simdi.getTime() + KOD_OMRU_DAKIKA * 60_000);
}
