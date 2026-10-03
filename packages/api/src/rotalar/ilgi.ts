import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HataliIstek } from '../hatalar';
import { ilgi_kayitlari } from '../db/sema';
import { istekSayaciKur } from '../servisler/istekSayaci';

/**
 * Yayın haberi listesi — marka sitesinin tek dönüşüm yolu.
 *
 * Uygulama mağazada olmadığı sürece sitede yapılacak tek şey bu. Kasten küçük tutuldu:
 * bülten yok, segment yok, takip pikseli yok. Tek e-posta gönderilir ve kayıt silinir.
 *
 * Oturum istemiyor — henüz hesabı olmayan insanlar için. Bu yüzden kötüye kullanıma
 * açık: kimlik uçlarındaki dakikalık sınırın aynısına bağlı.
 */

const semaGirdi = z.object({
  eposta: z.string().trim().min(5).max(254).email(),
  /**
   * Açık rıza. `true` olmak zorunda: varsayılanı kabul saymak açık rıza değildir.
   * İstemci onay kutusunu zaten zorunlu tutuyor; sunucu da kendi başına doğruluyor.
   */
  riza: z.literal(true),
});

export async function ilgiRotalari(app: FastifyInstance): Promise<void> {
  const { db } = app;

  /**
   * Yukarıdaki not "kimlik uçlarındaki dakikalık sınırın aynısına bağlı" diyordu ama
   * uç yalnızca genel 120/dk kovasındaydı: tek bir IP dakikada 120 yabancı adresi
   * listeye yazabiliyordu. Haber e-postası o adreslere gidecek — listeyi istenmeyen
   * postayla doldurmak, gönderen alan adının itibarını yakmak demek.
   */
  const sayac = istekSayaciKur({
    sinir: app.yapilandirma.KIMLIK_ISTEK_SINIRI,
    pencereMs: 60_000,
  });

  app.post('/', async (istek, yanit) => {
    if (!sayac.izinVar(istek.ip, Date.now())) {
      return yanit.code(429).send({
        kod: 'cok_fazla_istek',
        mesaj: 'Çok fazla deneme yapıldı. Bir dakika sonra tekrar dene.',
      });
    }

    const ayristirma = semaGirdi.safeParse(istek.body);
    if (!ayristirma.success) {
      throw HataliIstek('Geçerli bir e-posta adresi ve açık rıza gerekiyor.', 'ilgi_gecersiz');
    }

    // E-posta karşılaştırması küçük harfle: "Ali@X.com" ile "ali@x.com" aynı adres.
    // Yerel ayara bağlı küçültme kullanılmıyor — e-posta alan adı ASCII kurallarına tabi.
    const eposta = ayristirma.data.eposta.toLowerCase();

    /**
     * Aynı adres iki kez eklenmiyor ama bu kullanıcıya hata olarak dönmüyor.
     *
     * "Bu adres zaten kayıtlı" demek, kimin listede olduğunu sızdırır. Sonuç her iki
     * durumda da aynı: bir kez haber vereceğiz.
     */
    await db
      .insert(ilgi_kayitlari)
      .values({ eposta })
      .onConflictDoUpdate({
        target: ilgi_kayitlari.eposta,
        set: { riza_at: sql`now()` },
      });

    return yanit.code(201).send({ kaydedildi: true });
  });
}
