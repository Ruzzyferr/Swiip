import { z } from 'zod';

/**
 * Ortam değişkenleri tek yerden okunur ve açılışta doğrulanır.
 * Eksik bir sır varsa sunucu açılmaz — yarım yapılandırmayla çalışmaktan iyidir.
 */

const sema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().min(1),

  /** En az 32 karakter: kısa sır, sır değildir. */
  JWT_SECRET: z.string().min(32),
  ERISIM_TOKEN_OMRU: z.string().default('15m'),
  YENILEME_TOKEN_GUN: z.coerce.number().int().positive().default(30),

  /**
   * Kimlik uçları için dakikalık istek sınırı.
   *
   * Genel sınır (120) normal kullanım içindir; parola denemesi için fazla gevşek.
   * Dakikada 120 deneme günde 170 binden fazla eder ve zayıf bir parolayı bulmaya yeter.
   */
  KIMLIK_ISTEK_SINIRI: z.coerce.number().int().positive().default(10),

  /**
   * RevenueCat web kancası sırrı.
   *
   * Tanımsızsa kanca ucu **hiç açılmaz** — doğrulanmamış bir kanca, ödeme duvarını
   * herkese açık bırakmak demek. Yarım yapılandırmayla çalışmaktansa hiç çalışmasın.
   */
  REVENUECAT_KANCA_SIRRI: z.string().min(16).optional(),

  /** AI gateway; tanımsızsa motor deterministik yedeklerle çalışır. */
  AI_GATEWAY_URL: z.string().url().optional(),
  AI_GATEWAY_KEY: z.string().optional(),

  /** Posta sağlayıcısı; tanımsızsa kodlar loglanır ve kullanıcıya yanlış vaat verilmez. */
  POSTA_API_URL: z.string().url().optional(),
  POSTA_API_KEY: z.string().optional(),
  POSTA_GONDEREN: z.string().default('Made2Fit <merhaba@made2fit.io>'),

  /** Analitik uçlarını açar; en az 32 karakter. Tanımsızsa uçlar kapalıdır. */
  YONETIM_ANAHTARI: z.string().min(32).optional(),

  LOG_SEVIYESI: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_KAYNAKLAR: z.string().default('*'),
});

export type Yapilandirma = z.infer<typeof sema>;

export function yapilandirmayiOku(env: NodeJS.ProcessEnv = process.env): Yapilandirma {
  const sonuc = sema.safeParse(env);

  if (!sonuc.success) {
    const eksikler = sonuc.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Ortam değişkenleri geçersiz:\n${eksikler}`);
  }

  return sonuc.data;
}
