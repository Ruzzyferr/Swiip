import { describe, expect, it } from 'vitest';
import { yapilandirmayiOku } from './yapilandirma';

/**
 * Ortam değişkeni okuması.
 *
 * 2026-08-21'de ilk gerçek dağıtımda API açılmadı:
 *
 *   Sunucu başlatılamadı: Ortam değişkenleri geçersiz:
 *     • REVENUECAT_KANCA_SIRRI: String must contain at least 16 character(s)
 *     • AI_GATEWAY_URL: Invalid url
 *     • POSTA_API_URL: Invalid url
 *
 * Üçü de `.optional()` tanımlıydı ve `sunucu.ts` yoklarını zaten zarifçe karşılıyor:
 * uyarı basıp deterministik yedekle devam ediyor. Sorun şuydu — `optional()` yalnızca
 * `undefined`'a izin verir, ama docker compose tanımsız bir değişkeni **boş dize**
 * olarak geçirir (`AI_GATEWAY_URL: ${AI_GATEWAY_URL:-}`). Boş dize ne `.url()` ne
 * `.min(16)` geçer.
 *
 * Yani şema ile başlatma kodu birbiriyle çelişiyordu ve bu yalnızca gerçek bir
 * konteynerde ortaya çıkıyordu: testlerde ortam değişkenleri elle veriliyor, elle
 * verirken de boş dize yazan olmuyor.
 */

const asgari = {
  DATABASE_URL: 'postgres://k:p@yerel:5432/veri',
  JWT_SECRET: 'a'.repeat(32),
};

describe('yapilandirmayiOku', () => {
  it('isteğe bağlı alanlar hiç verilmediğinde açılır', () => {
    const y = yapilandirmayiOku({ ...asgari } as NodeJS.ProcessEnv);

    expect(y.AI_GATEWAY_URL).toBeUndefined();
    expect(y.POSTA_API_URL).toBeUndefined();
    expect(y.REVENUECAT_KANCA_SIRRI).toBeUndefined();
  });

  it('isteğe bağlı alanlar BOŞ DİZE geldiğinde de açılır — compose böyle geçirir', () => {
    const y = yapilandirmayiOku({
      ...asgari,
      AI_GATEWAY_URL: '',
      AI_GATEWAY_KEY: '',
      POSTA_API_URL: '',
      POSTA_API_KEY: '',
      REVENUECAT_KANCA_SIRRI: '',
      YONETIM_ANAHTARI: '',
    } as NodeJS.ProcessEnv);

    // Boş dize "tanımsız" demektir; tanımsız gibi davranmalı.
    expect(y.AI_GATEWAY_URL).toBeUndefined();
    expect(y.POSTA_API_URL).toBeUndefined();
    expect(y.REVENUECAT_KANCA_SIRRI).toBeUndefined();
    expect(y.YONETIM_ANAHTARI).toBeUndefined();
  });

  it('boş dize kabul etmek doğrulamayı gevşetmez: bozuk değer hâlâ reddedilir', () => {
    expect(() =>
      yapilandirmayiOku({
        ...asgari,
        AI_GATEWAY_URL: 'gecerli-bir-adres-degil',
      } as NodeJS.ProcessEnv),
    ).toThrow(/AI_GATEWAY_URL/);

    expect(() =>
      yapilandirmayiOku({ ...asgari, REVENUECAT_KANCA_SIRRI: 'kisa' } as NodeJS.ProcessEnv),
    ).toThrow(/REVENUECAT_KANCA_SIRRI/);
  });

  it('zorunlu sırlar hâlâ zorunlu', () => {
    expect(() => yapilandirmayiOku({ DATABASE_URL: 'postgres://x' } as NodeJS.ProcessEnv)).toThrow(
      /JWT_SECRET/,
    );

    // Kısa sır, sır değildir.
    expect(() =>
      yapilandirmayiOku({ ...asgari, JWT_SECRET: 'kisa-sir' } as NodeJS.ProcessEnv),
    ).toThrow(/JWT_SECRET/);
  });

  it('boş dize verilen sayısal alan varsayılana düşer', () => {
    const y = yapilandirmayiOku({ ...asgari, KIMLIK_ISTEK_SINIRI: '' } as NodeJS.ProcessEnv);
    expect(y.KIMLIK_ISTEK_SINIRI).toBe(10);
  });
});
