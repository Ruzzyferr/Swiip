/**
 * Tam ekran reklamın sıklık sınırı.
 *
 * Saf modül: tarih, depolama ve React yok. Kural burada yaşıyor, yan etkiler
 * çağıranda — böylece kural testle sınanabiliyor.
 *
 * **Neden sınır var.** Kullanıcı günde 4-6 öğün kaydediyor. Her onaydan sonra tam
 * ekran reklam açmak günde 4-6 kesinti demek ve bu, `docs/rakip-analizi.md`'nin
 * ölçtüğü terk sebebinin ta kendisi. Sınır bir nezaket değil, ürünün yaşamasının
 * şartı: silinen uygulama sıfır gelir üretir.
 */

/** Günde en fazla kaç tam ekran. */
export const GUNLUK_TAVAN = 3;

/** İki tam ekran arasındaki en kısa süre. */
export const ARALIK_MS = 4 * 60 * 1000;

export interface GecisDurumu {
  /** Yerel takvim günü, `YYYY-AA-GG`. */
  gun: string;
  /** O gün gösterilen tam ekran sayısı. */
  sayac: number;
  /** Son gösterimin zamanı (epoch ms); hiç gösterilmediyse 0. */
  sonGosterim: number;
}

export const BOS_DURUM: GecisDurumu = { gun: '', sayac: 0, sonGosterim: 0 };

/**
 * Yerel takvim günü.
 *
 * `toISOString()` KULLANILMIYOR: o UTC'ye çeviriyor ve Türkiye'de (UTC+3) gece
 * 00:00-03:00 arası hâlâ "dün" sayılıyor. Gece atıştırmasını kaydeden kullanıcının
 * sayacı sıfırlanmaz, ertesi gün de eksik başlar.
 */
export function gunAnahtari(simdi: Date): string {
  const a = String(simdi.getMonth() + 1).padStart(2, '0');
  const g = String(simdi.getDate()).padStart(2, '0');
  return `${simdi.getFullYear()}-${a}-${g}`;
}

/** Gün değiştiyse sayaç sıfırlanmış hâliyle döner. */
export function gunuTazele(durum: GecisDurumu, simdi: Date): GecisDurumu {
  const gun = gunAnahtari(simdi);
  if (durum.gun === gun) return durum;
  return { gun, sayac: 0, sonGosterim: durum.sonGosterim };
}

export function gosterilebilirMi(durum: GecisDurumu, simdi: Date): boolean {
  const guncel = gunuTazele(durum, simdi);
  if (guncel.sayac >= GUNLUK_TAVAN) return false;
  if (guncel.sonGosterim === 0) return true;
  return simdi.getTime() - guncel.sonGosterim >= ARALIK_MS;
}

export function gosterildi(durum: GecisDurumu, simdi: Date): GecisDurumu {
  const guncel = gunuTazele(durum, simdi);
  return { gun: guncel.gun, sayac: guncel.sayac + 1, sonGosterim: simdi.getTime() };
}
