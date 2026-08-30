import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tr } from './metinler.tr';
import { en } from './metinler.en';

/**
 * Sunucunun fırlattığı her hata kodunun İKİ SÖZLÜKTE de karşılığı var.
 *
 * Mimari `packages/api/src/hatalar.ts`'in başında yazılı: sunucu `kod` yolluyor,
 * istemci metni KENDİ sözlüğünden kuruyor, kodu çözemezse sunucunun Türkçe mesajına
 * düşüyor. Bu tasarım doğru — ama yedeğin sessizce devreye girmesi, eksik çevirinin
 * hiçbir yerde görünmemesi demek.
 *
 * Ölçüldü (2026-08-31, uluslararası açılım hazırlığı): sunucu 48 kod fırlatıyordu ve
 * yalnızca 36'sının sözlükte karşılığı vardı. Kalan 12'si İngilizce arayüzde Türkçe
 * çıkıyordu. Biri emülatörde görüldü: İngilizce hesapla açılan Beslenme ekranının
 * tamamı İngilizce, ortadaki paragraf Türkçe (`plan_yetersiz`).
 *
 * Kusur sessizdi çünkü yedek çalışıyor: ekran çizilir, hata olmaz, kimse uyarmaz.
 * Yalnızca yabancı kullanıcı Türkçe bir cümle görür.
 *
 * DÜRÜST SINIR: burası statik bir tarama. Kodun sözlükte OLDUĞUNU kanıtlıyor,
 * çevirinin İYİ olduğunu değil.
 */

const BURASI = import.meta.dirname;
const API = join(BURASI, '..', '..', 'api', 'src');

/** Yönetim uçları kullanıcıya hiç çıkmıyor; onların çevrilmesi gerekmiyor. */
const YONETIM_KODLARI = new Set(['yonetim_kapali', 'yonetim_yetkisiz']);

function tsDosyalari(dizin: string): string[] {
  return readdirSync(dizin).flatMap((ad) => {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) return tsDosyalari(yol);
    return ad.endsWith('.ts') && !ad.includes('.test.') ? [yol] : [];
  });
}

/** Sunucunun fırlattığı hata kodları. */
function sunucuKodlari(): Set<string> {
  const kodlar = new Set<string>();
  const yardimcilar = 'HataliIstek|Bulunamadi|Yetkisiz|Yasak|Cakisma|KotaDoldu|PlanYetersiz';

  for (const yol of tsDosyalari(API)) {
    const kaynak = readFileSync(yol, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');

    const yardimci = new RegExp(
      `(?:${yardimcilar})\\(\\s*(?:'[^']*'|"[^"]*"|\`[^\`]*\`|[^,()]+)\\s*,\\s*'([a-z0-9_]+)'`,
      'g',
    );
    for (const e of kaynak.matchAll(yardimci)) kodlar.add(e[1]!);
    for (const e of kaynak.matchAll(/UygulamaHatasi\(\s*\d+\s*,\s*'([a-z0-9_]+)'/g)) {
      kodlar.add(e[1]!);
    }
    for (const e of kaynak.matchAll(/kod:\s*'([a-z0-9_]+)'/g)) kodlar.add(e[1]!);
  }
  return kodlar;
}

const KODLAR = [...sunucuKodlari()].filter((k) => !YONETIM_KODLARI.has(k)).sort();

describe('hata kodları iki dilde de karşılanıyor', () => {
  it('taranacak kod var — test boşa dönmüyor', () => {
    expect(KODLAR.length).toBeGreaterThan(30);
  });

  it.each(KODLAR)('%s → Türkçe karşılığı var', (kod) => {
    expect(
      (tr.apiHatalari as Record<string, unknown>)[kod],
      `"${kod}" sözlükte yok; istemci sunucunun ham mesajına düşer.`,
    ).toBeTypeOf('function');
  });

  it.each(KODLAR)('%s → İngilizce karşılığı var', (kod) => {
    expect(
      (en.apiHatalari as Record<string, unknown>)[kod],
      `"${kod}" İngilizce sözlükte yok; İngilizce arayüzde Türkçe metin çıkar.`,
    ).toBeTypeOf('function');
  });
});

/**
 * E-postalar SUNUCUDA çevriliyor.
 *
 * Hata mesajlarından farklı: kullanıcı e-postayı gelen kutusunda okuyor, arada
 * istemci yok. Kod yollamak burada bir şey çözmez — sunucunun dili bilmesi gerekiyor.
 */
describe('e-posta metinleri sözlükte', () => {
  it('iki dilde de var', () => {
    for (const sozluk of [tr, en]) {
      expect(sozluk.postalar.parolaSifirlama.konu.length).toBeGreaterThan(0);
      expect(sozluk.postalar.epostaDogrulama.konu.length).toBeGreaterThan(0);
      expect(sozluk.postalar.parolaSifirlama.govde({ kod: '123456', dakika: 15 })).toContain(
        '123456',
      );
      expect(sozluk.postalar.epostaDogrulama.govde({ kod: '654321', dakika: 15 })).toContain(
        '654321',
      );
    }
  });

  it('şablonlar kullanıcının dilini alıyor', () => {
    const kaynak = readFileSync(join(API, 'servisler', 'postaci.ts'), 'utf8');
    expect(kaynak, 'şablon dili parametre olarak almalı').toMatch(/locale\?: string \| null/);
    expect(kaynak).toMatch(/metinleriAl\(dilCozumle\(locale\)\)/);
    // Elle yazılmış Türkçe konu satırı geri gelmesin.
    expect(kaynak).not.toMatch(/konu: 'Swiip /);
  });
});
