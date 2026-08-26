import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bildirimPlaniHesapla,
  ilkTetiklemeyeSaniye,
  SESSIZ_BASLANGIC,
  SESSIZ_BITIS,
} from '@swiip/core';

/**
 * Ölçüm hatırlatması gerçekten kuruluyor mu?
 *
 * Ayarlardaki anahtar ÖLÜYDÜ. `bildirimPlaniHesapla` ölçüm hatırlatmasını
 * `tekrar: 'dort_haftada_bir'` üretiyor, `bildirimleriKur` ise `haftalikOlanlar()`
 * süzgeciyle yalnızca haftalık olanları alıyordu. Kullanıcı anahtarı açıyor,
 * "kaydedildi" görüyor — başka bir hatırlatma açıksa "kuruldu" bile yazıyor — ve
 * bildirim hiçbir zaman gelmiyordu.
 *
 * Bu, ürünün en sevmediği hata türü: sessizce sözden dönmek. Kullanıcı haftalar
 * sonra, hiç fark etmeden kaybediyor.
 */

const METINLER = {
  seans: { baslik: 's', govde: 's' },
  geriBildirim: { baslik: 'g', govde: 'g' },
  haftalikOzet: { baslik: 'h', govde: 'h' },
  olcum: { baslik: 'o', govde: 'o' },
  su: { baslik: 'su', govde: 'su' },
};

const KAPALI = {
  seans_hatirlatmasi: false,
  seans_saati: '18:00',
  geri_bildirim_hatirlatmasi: false,
  haftalik_ozet: false,
  olcum_hatirlatmasi: false,
  su_hatirlatmasi: false,
};

const olcumBildirimi = () => {
  const plan = bildirimPlaniHesapla(
    { ...KAPALI, olcum_hatirlatmasi: true },
    { antrenmanGunleri: [1, 3, 5] },
    METINLER,
  );
  return plan.find((b) => b.tur === 'olcum')!;
};

describe('ölçüm hatırlatması kurulabiliyor', () => {
  it('planda dört haftada bir olarak üretiliyor', () => {
    const b = olcumBildirimi();
    expect(b).toBeDefined();
    expect(b.tekrar).toBe('dort_haftada_bir');
  });

  it('zamanlayıcı dört haftalık tekrarı ELEMİYOR', () => {
    const kaynak = readFileSync(join(import.meta.dirname, 'zamanlayici.ts'), 'utf8');
    const yorumsuz = kaynak.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

    expect(
      yorumsuz,
      'plan yine süzülüyorsa ölçüm hatırlatması hiç kurulmaz — anahtar ölü düğmeye döner.',
    ).not.toMatch(/haftalikOlanlar\s*\(/);
  });
});

describe('ilk tetikleme zamanı', () => {
  const DORT_HAFTA = 28 * 24 * 60 * 60;

  it('en az dört hafta sonraya kuruluyor — söz "ayda bir"', () => {
    const b = olcumBildirimi();
    // Haftanın her günü ve günün her saatinden denenir.
    for (let gun = 0; gun < 7; gun++) {
      for (const saat of [0, 6, 9, 10, 11, 15, 23]) {
        const simdi = new Date(2026, 8, 6 + gun, saat, 37, 0);
        const saniye = ilkTetiklemeyeSaniye(b, simdi);
        expect(saniye, `${simdi.toISOString()} için erken kurulmuş`).toBeGreaterThanOrEqual(
          DORT_HAFTA,
        );
      }
    }
  });

  it('her zaman çekirdeğin verdiği gün ve saate düşüyor', () => {
    const b = olcumBildirimi();
    for (let gun = 0; gun < 14; gun++) {
      const simdi = new Date(2026, 8, 6 + gun, 13, 12, 0);
      const hedef = new Date(simdi.getTime() + ilkTetiklemeyeSaniye(b, simdi) * 1000);
      expect(hedef.getDay(), 'hafta günü kaymış').toBe(b.haftaGunu);
      expect(hedef.getHours(), 'saat kaymış').toBe(b.saat);
      expect(hedef.getMinutes(), 'dakika kaymış').toBe(b.dakika);
    }
  });

  it('hedef saat sessiz saatin dışında kalıyor', () => {
    const b = olcumBildirimi();
    const simdi = new Date(2026, 8, 6, 23, 45, 0);
    const hedef = new Date(simdi.getTime() + ilkTetiklemeyeSaniye(b, simdi) * 1000);
    expect(hedef.getHours()).toBeGreaterThanOrEqual(SESSIZ_BITIS);
    expect(hedef.getHours()).toBeLessThan(SESSIZ_BASLANGIC);
  });
});

describe('oturum başında sessiz tazeleme', () => {
  const OTURUM = readFileSync(join(import.meta.dirname, '..', 'durum', 'Oturum.tsx'), 'utf8');

  it('oturum açılışında hatırlatmalar yeniden kuruluyor', () => {
    expect(
      OTURUM,
      'yalnızca ayar ekranından kurulursa telefon değiştiren kullanıcıda hiç bildirim olmaz.',
    ).toMatch(/bildirimleriTazele\(/);
  });

  it('açılışta izin İSTENMİYOR', () => {
    expect(
      OTURUM,
      'uygulamayı açar açmaz izin kutusu göstermek kötü karşılama ve inceleme riski.',
    ).toMatch(/izinIsteme:\s*true/);
  });
});
