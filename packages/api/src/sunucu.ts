import { veritabaniAc } from './db/baglanti';
import { uygulamaOlustur } from './uygulama';
import { yapilandirmayiOku } from './yapilandirma';
import { gatewayIstemcisi } from './servisler/aiGecidi';
import { httpPostaci } from './servisler/postaci';

/**
 * Sunucu giriş noktası.
 * Yapılandırma açılışta doğrulanır; eksik bir sır varsa süreç hiç başlamaz.
 */

async function baslat(): Promise<void> {
  const yapilandirma = yapilandirmayiOku();
  const { db, kapat } = veritabaniAc({ url: yapilandirma.DATABASE_URL });

  const aiIstemcisi =
    yapilandirma.AI_GATEWAY_URL && yapilandirma.AI_GATEWAY_KEY
      ? gatewayIstemcisi({
          url: yapilandirma.AI_GATEWAY_URL,
          anahtar: yapilandirma.AI_GATEWAY_KEY,
        })
      : undefined;

  const postaci =
    yapilandirma.POSTA_API_URL && yapilandirma.POSTA_API_KEY
      ? httpPostaci({
          url: yapilandirma.POSTA_API_URL,
          anahtar: yapilandirma.POSTA_API_KEY,
          gonderen: yapilandirma.POSTA_GONDEREN,
        })
      : undefined;

  const app = await uygulamaOlustur({
    db,
    yapilandirma,
    ...(aiIstemcisi ? { aiIstemcisi } : {}),
    ...(postaci ? { postaci } : {}),
  });

  if (yapilandirma.NODE_ENV === 'production' && !yapilandirma.REVENUECAT_KANCA_SIRRI) {
    app.log.warn(
      'REVENUECAT_KANCA_SIRRI tanımlı değil: abonelik web kancası kapalı. Satın alma ' +
        'yapan kullanıcının hakkı açılmaz. Yayına çıkmadan önce tanımlanmalı.',
    );
  }

  if (!postaci) {
    app.log.warn(
      'Posta sağlayıcısı yapılandırılmadı. Parola sıfırlama ve e-posta doğrulama kodları ' +
        'yalnızca sunucu logunda görünecek — yayına çıkmadan önce POSTA_API_URL tanımlanmalı.',
    );
  }

  if (!aiIstemcisi) {
    app.log.warn(
      'AI gateway yapılandırılmadı. Motor deterministik yedeklerle çalışacak: ' +
        'program ve gerekçeler üretilir, yalnızca anlatım sadeleşir.',
    );
  }

  const kapanis = async (sinyal: string) => {
    app.log.info({ sinyal }, 'kapanış başlıyor');
    await app.close();
    await kapat();
    process.exit(0);
  };

  process.on('SIGTERM', () => void kapanis('SIGTERM'));
  process.on('SIGINT', () => void kapanis('SIGINT'));

  await app.listen({ port: yapilandirma.PORT, host: yapilandirma.HOST });
}

baslat().catch((hata) => {
  console.error('Sunucu başlatılamadı:', hata instanceof Error ? hata.message : hata);
  process.exit(1);
});
