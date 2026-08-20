/**
 * Veri dışa aktarma — dosya adı ve gövde biçimi.
 *
 * Dosyayı yazan ve paylaşan kod mobil tarafta duruyor (platforma bağlı). Adın ve
 * biçimin nasıl oluştuğu ise saf mantık; burada duruyor ki test edilebilsin.
 */

const ON_EK = 'made2fit-verilerim';

/**
 * `made2fit-verilerim-2026-08-20.json`
 *
 * Saat bilinçli olarak yok: aynı gün ikinci kez dışa aktaran kullanıcı, indirme
 * klasöründe birbirine benzeyen iki dosya değil, güncellenmiş tek dosya bulsun.
 */
export function disaAktarmaDosyaAdi(isoDamga: string): string {
  const gun = /^(\d{4}-\d{2}-\d{2})/.exec(isoDamga)?.[1];
  return gun ? `${ON_EK}-${gun}.json` : `${ON_EK}.json`;
}

/**
 * Dosyanın içeriği. Girintili, çünkü bu kopya bir makineye değil kullanıcıya gidiyor;
 * tek satırlık JSON'u bir dosya yöneticisinde açan kimse okuyamaz.
 */
export function disaAktarmaMetni(veri: unknown): string {
  return JSON.stringify(veri, null, 2);
}
