import { describe, expect, it } from 'vitest';
import { butceDurumu, PLAN_AYLIK_BUTCE_USD, ucuzaDusur } from './butce';

/**
 * Kullanıcı başına aylık AI bütçesi.
 *
 * Kota çağrı **sayısını** sınırlıyor; maliyeti değil. Aynı sayıda çağrı, uzun bağlam veya
 * yanlış model seviyesiyle kat kat pahalıya gelebilir. Ürünün bilinen en büyük riski
 * birim ekonomisi: Pro'nun aylık AI maliyeti gelirinin üçte biri.
 *
 * Bütçe bir kesme anahtarı değil, bir görünürlük katmanı: eşiği geçen kullanıcı işaretlenir
 * ve model seviyesi ucuza düşürülür. Ödeme yapan kullanıcının hizmetini ortadan kesmek,
 * marjı korurken güveni harcamak olurdu.
 */

describe('PLAN_AYLIK_BUTCE_USD', () => {
  it('her plan için tanımlı', () => {
    expect(PLAN_AYLIK_BUTCE_USD.ucretsiz).toBeGreaterThanOrEqual(0);
    expect(PLAN_AYLIK_BUTCE_USD.temel).toBeGreaterThan(0);
    expect(PLAN_AYLIK_BUTCE_USD.pro).toBeGreaterThan(0);
  });

  it('daha pahalı plan daha yüksek bütçeye sahip', () => {
    expect(PLAN_AYLIK_BUTCE_USD.pro).toBeGreaterThan(PLAN_AYLIK_BUTCE_USD.temel);
    expect(PLAN_AYLIK_BUTCE_USD.temel).toBeGreaterThan(PLAN_AYLIK_BUTCE_USD.ucretsiz);
  });

  /**
   * Spec: Pro aylık 169₺, AI maliyeti ~50₺. Bütçe bunun altında kalmalı, yoksa tavan
   * olmanın anlamı yok.
   */
  it('Pro bütçesi gelirin altında kalıyor', () => {
    // ~169₺ gelir, kabaca 5 USD. Bütçe bunun yarısını aşmamalı.
    expect(PLAN_AYLIK_BUTCE_USD.pro).toBeLessThan(2.5);
  });
});

describe('butceDurumu', () => {
  it('bütçenin altındaki kullanım normal', () => {
    const durum = butceDurumu({ plan: 'pro', harcananUsd: 0.2 });

    expect(durum.asildi).toBe(false);
    expect(durum.ucuzaDus).toBe(false);
  });

  it('uyarı eşiğini geçince ucuz modele düşülür', () => {
    const durum = butceDurumu({ plan: 'pro', harcananUsd: PLAN_AYLIK_BUTCE_USD.pro * 0.85 });

    expect(durum.ucuzaDus).toBe(true);
    expect(durum.asildi).toBe(false);
  });

  it('bütçe aşılınca işaretlenir', () => {
    const durum = butceDurumu({ plan: 'pro', harcananUsd: PLAN_AYLIK_BUTCE_USD.pro * 1.2 });

    expect(durum.asildi).toBe(true);
    expect(durum.ucuzaDus).toBe(true);
  });

  /**
   * Aşım hizmeti kesmiyor. Ödeme yapan kullanıcıyı ay ortasında kapıda bırakmak,
   * marjı korurken güveni harcamak olurdu; kota zaten bir üst sınır koyuyor.
   */
  it('aşım hizmeti kesmiyor', () => {
    const durum = butceDurumu({ plan: 'pro', harcananUsd: PLAN_AYLIK_BUTCE_USD.pro * 5 });

    expect(durum.hizmetKesildi).toBe(false);
  });

  it('kalan bütçe negatife düşmez', () => {
    const durum = butceDurumu({ plan: 'temel', harcananUsd: 999 });

    expect(durum.kalanUsd).toBe(0);
  });

  it('kullanım oranı yüzde olarak okunabilir', () => {
    const durum = butceDurumu({ plan: 'pro', harcananUsd: PLAN_AYLIK_BUTCE_USD.pro / 2 });

    expect(durum.kullanimYuzdesi).toBe(50);
  });

  it('ücretsiz planda AI bütçesi sıfır — kota zaten kapalı', () => {
    const durum = butceDurumu({ plan: 'ucretsiz', harcananUsd: 0 });

    expect(durum.kalanUsd).toBe(0);
    expect(durum.asildi).toBe(true);
  });

  it('aynı girdi her zaman aynı sonucu verir', () => {
    const girdi = { plan: 'pro' as const, harcananUsd: 0.7 };

    expect(butceDurumu(girdi)).toEqual(butceDurumu(girdi));
  });
});

describe('ucuzaDusur', () => {
  it('güçlü seviyeyi ucuza indirir', () => {
    expect(ucuzaDusur({ seviye: 'guclu', gorsel: false, max_cikti_token: 1200 }).seviye).toBe(
      'ucuz',
    );
  });

  it('orta seviyeyi ucuza indirir', () => {
    expect(ucuzaDusur({ seviye: 'orta', gorsel: false, max_cikti_token: 700 }).seviye).toBe('ucuz');
  });

  it('görsel işi görsel kalmak zorunda — metin modeli fotoğraf okuyamaz', () => {
    const dusuk = ucuzaDusur({ seviye: 'guclu_gorsel', gorsel: true, max_cikti_token: 800 });

    expect(dusuk.seviye).toBe('ucuz_gorsel');
    expect(dusuk.gorsel).toBe(true);
  });

  /**
   * Koç sohbeti ucuz seviyeye alınınca ortaya çıktı: "zaten ucuzsa dokunma" demek,
   * bütçe supabını o iş için tamamen kapatmak oluyordu — bütçe aşılıyor ama hiçbir şey
   * ucuzlamıyordu. Seviye dibe vurduğunda elde kalan tek kaldıraç uzunluk.
   */
  it('zaten ucuzsa seviyeyi korur ama çıktıyı yine kısar', () => {
    const secim = { seviye: 'ucuz' as const, gorsel: false, max_cikti_token: 700 };
    const dusuk = ucuzaDusur(secim);

    expect(dusuk.seviye).toBe('ucuz');
    expect(dusuk.max_cikti_token).toBeLessThan(secim.max_cikti_token);
  });

  it('taban 150 tokenın altına inmez — cevap kullanılmaz hâle gelmesin', () => {
    const dusuk = ucuzaDusur({ seviye: 'ucuz', gorsel: false, max_cikti_token: 160 });

    expect(dusuk.max_cikti_token).toBe(150);
  });

  /**
   * Çıktı sınırı da daralıyor: ucuz modele düşmek maliyetin yarısını çözer, uzunluğu
   * kısmak diğer yarısını.
   */
  it('çıktı sınırını da daraltır', () => {
    const dusuk = ucuzaDusur({ seviye: 'guclu', gorsel: false, max_cikti_token: 1200 });

    expect(dusuk.max_cikti_token).toBeLessThan(1200);
    expect(dusuk.max_cikti_token).toBeGreaterThan(0);
  });
});
