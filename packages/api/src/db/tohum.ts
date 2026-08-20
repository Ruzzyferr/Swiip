import { sql } from 'drizzle-orm';
import { veritabaniAc, type Veritabani } from './baglanti';
import { foods, recipes } from './sema';
import { BESIN_TOHUMU } from './besinler';
import { TARIF_TOHUMU } from './tarifler';
import { tarifMakrolariniHesapla } from './malzemeEslemesi';
import { yapilandirmayiOku } from '../yapilandirma';

/**
 * Başlangıç verisi. Tekrar çalıştırılabilir: aynı ad tekrar eklenmez, değerler güncellenir.
 */

export async function besinleriTohumla(db: Veritabani): Promise<number> {
  let sayac = 0;

  for (const besin of BESIN_TOHUMU) {
    const mevcut = await db
      .select({ id: foods.id })
      .from(foods)
      .where(sql`lower(${foods.name_tr}) = lower(${besin.name_tr})`)
      .limit(1);

    if (mevcut.length > 0) {
      await db
        .update(foods)
        .set({
          per_100g_jsonb: besin.per_100g,
          portions_jsonb: besin.portions,
          source: besin.source,
          verified: besin.verified,
        })
        .where(sql`lower(${foods.name_tr}) = lower(${besin.name_tr})`);
    } else {
      await db.insert(foods).values({
        name_tr: besin.name_tr,
        name_en: besin.name_en ?? null,
        per_100g_jsonb: besin.per_100g,
        portions_jsonb: besin.portions,
        source: besin.source,
        verified: besin.verified,
        locale: 'tr-TR',
      });
      sayac += 1;
    }
  }

  return sayac;
}

/**
 * Tarif kütüphanesi. Gıda güvenliği kontrolünden geçmemiş tarif yazılmaz.
 *
 * Makrolar **besin tablosundan türetilir**, tarif dosyasındaki değerden değil. Ürünün sözü
 * "besin değeri veritabanından gelir" ve tarif katmanı bunun istisnası olmamalı. Dosyadaki
 * değer yalnızca malzemesi çözülemeyen tarifler için yedek kalır.
 */
export async function tarifleriTohumla(db: Veritabani): Promise<number> {
  let sayac = 0;

  for (const tarif of TARIF_TOHUMU) {
    if (!tarif.insan_kontrollu) {
      throw new Error(`Kontrolden geçmemiş tarif tohumlanamaz: ${tarif.id}`);
    }

    const makrolar = tarifMakrolariniHesapla(tarif) ?? tarif.makrolar;

    await db
      .insert(recipes)
      .values({
        id: tarif.id,
        name_tr: tarif.ad,
        ingredients_jsonb: tarif.malzemeler,
        steps_tr: tarif.adimlar_tr,
        macros_jsonb: makrolar,
        cost_tier: tarif.maliyet_kademesi,
        prep_minutes: tarif.hazirlik_dakika,
        tags: tarif.etiketler,
        verified_by_human: tarif.insan_kontrollu,
        locale: 'tr-TR',
      })
      .onConflictDoUpdate({
        target: recipes.id,
        set: {
          name_tr: tarif.ad,
          ingredients_jsonb: tarif.malzemeler,
          steps_tr: tarif.adimlar_tr,
          macros_jsonb: makrolar,
          cost_tier: tarif.maliyet_kademesi,
          prep_minutes: tarif.hazirlik_dakika,
          tags: tarif.etiketler,
          verified_by_human: tarif.insan_kontrollu,
        },
      });
    sayac += 1;
  }

  return sayac;
}

const dogrudanCalistirildi = process.argv[1]?.endsWith('tohum.ts') === true;

if (dogrudanCalistirildi) {
  const yapilandirma = yapilandirmayiOku();
  const { db, kapat } = veritabaniAc({ url: yapilandirma.DATABASE_URL });

  besinleriTohumla(db)
    .then(async (sayac) => {
      const tarifSayisi = await tarifleriTohumla(db);
      console.log(
        `${sayac} yeni besin eklendi, ${BESIN_TOHUMU.length} besin güncel. ` +
          `${tarifSayisi} tarif yazıldı.`,
      );
      await kapat();
    })
    .catch(async (hata) => {
      console.error(hata instanceof Error ? hata.message : hata);
      await kapat();
      process.exit(1);
    });
}
