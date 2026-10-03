import { desc, eq } from 'drizzle-orm';
import { kapilariDegerlendir, type Cevaplar } from '@swiip/core';
import type { Kapi, KapiDurumu } from '@swiip/shared';
import type { Veritabani } from '../db/baglanti';
import { assessments, users } from '../db/sema';
import { Yasak } from '../hatalar';

/**
 * Sert kapıların GÜNCEL cevaplara göre durumu.
 *
 * Program üretimi kapıyı `profiles.profil_jsonb` içindeki `kapi_durumu`'ndan okuyordu —
 * yani `POST /degerlendirme/tamamla` anındaki fotoğraftan. Profil yalnızca o uçta
 * yazılıyor; `/cevap` cevapları güncelliyor ama profile dokunmuyor. Sonuç:
 *
 *   temiz bir değerlendirmeyle program alan kullanıcı, sonra "Değerlendirmeyi
 *   güncelle" deyip "Hamileyim" ya da kardiyak bir soruya "Evet" diyor ve `/tamamla`
 *   çağrılmadan `POST /program/uret` (ödemelide her hafta `/sonraki-hafta`) eski
 *   profille program üretmeye devam ediyordu.
 *
 * `CLAUDE.md`: "Dört sert kapı var. Atlanamaz." Kapı artık en son cevaplardan yeniden
 * değerlendiriliyor. Değerlendirme kaydı hiç yoksa `null`: o durumda zaten profil de
 * yoktur ve çağıran profilin kendi kapı durumuna güvenir.
 */
export async function guncelKapiDurumu(
  db: Veritabani,
  kullaniciId: string,
  bugun: Date = new Date(),
): Promise<KapiDurumu | null> {
  const [degerlendirme] = await db
    .select({ cevaplar: assessments.answers_jsonb })
    .from(assessments)
    .where(eq(assessments.user_id, kullaniciId))
    .orderBy(desc(assessments.version))
    .limit(1);

  if (!degerlendirme) return null;

  const [kullanici] = await db
    .select({ onay: users.doktor_onayi_at, edAcik: users.ed_sayilar_acik })
    .from(users)
    .where(eq(users.id, kullaniciId))
    .limit(1);

  return kapilariDegerlendir(degerlendirme.cevaplar as Cevaplar, {
    bugun,
    doktorOnayiVar: kullanici?.onay !== null && kullanici?.onay !== undefined,
    kullaniciSayilariActi: kullanici?.edAcik ?? false,
  });
}

/** Yaş kapısı (kayıt reddi) açık mı? Açıksa ilgili kapıyı döner. */
export function yasKapisi(durum: KapiDurumu | null): Kapi | undefined {
  return durum?.kapilar.find((k) => k.eylem === 'kayit_reddet');
}

/**
 * Program üretimini durduran bir kapı varsa fırlatır.
 *
 * Eksik tarama burada bilerek SAYILMIYOR: o, profilin kendi kapı durumunda zaten
 * kontrol ediliyor (`programUret`). Burada yakalanan tek şey, profil yazıldıktan SONRA
 * verilen ve programı durdurması gereken bir cevap.
 */
export async function programKapisiniUygula(db: Veritabani, kullaniciId: string): Promise<void> {
  const durum = await guncelKapiDurumu(db, kullaniciId);
  if (!durum) return;

  const yas = yasKapisi(durum);
  if (yas) throw Yasak(yas.mesaj, 'kapi_yas');

  const engel = durum.kapilar.find(
    (k) => k.eylem === 'program_uretme' || k.eylem === 'doktor_onayi_bekle',
  );
  if (engel) throw Yasak(engel.mesaj, 'kapi_engeli');
}
