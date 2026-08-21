import { describe, expect, it } from 'vitest';
import { beslenmeHedefiHesapla } from './beslenme';
import { profilKur } from '../test/profilKur';
import type { Cinsiyet, Hedef } from '@swiip/shared';

/**
 * Beslenme motorunun DEĞİŞMEZLERİ — örnek değil, ızgara.
 *
 * Tek tek profil sınamak "bu profilde doğru" der; kuralın her yerde tuttuğunu söylemez.
 * Sağlık bağlamında bizi yakan şey ortalama kullanıcı değil uç kullanıcıdır: çok kısa,
 * çok ağır, çok yaşlı, çok hareketsiz olan. Bu yüzden gerçekçi uçları da kapsayan bir
 * ızgarada bütün profiller taranıyor.
 */

const CINSIYETLER: Cinsiyet[] = ['erkek', 'kadin'];
const YASLAR = [18, 30, 45, 60, 75];
const BOYLAR = [145, 160, 175, 190, 205];
const KILOLAR = [40, 55, 70, 90, 120, 160];
const AKTIVITELER = [1.2, 1.375, 1.55, 1.725, 1.9];
const HEDEFLER: Hedef[] = [
  'yag_kaybi',
  'kas_kazanimi',
  'guc_artisi',
  'dayaniklilik',
  'genel_saglik',
];

function* izgara() {
  for (const cinsiyet of CINSIYETLER)
    for (const yas of YASLAR)
      for (const boy_cm of BOYLAR)
        for (const kilo_kg of KILOLAR)
          for (const aktivite_carpani of AKTIVITELER)
            for (const hedef of HEDEFLER)
              yield {
                cinsiyet,
                yas,
                boy_cm,
                kilo_kg,
                aktivite_carpani,
                hedef,
                profil: profilKur({
                  cinsiyet,
                  yas,
                  boy_cm,
                  kilo_kg,
                  aktivite_carpani,
                  hedef_vektoru: { birincil: hedef, oncelikli_bolgeler: [], memnun_bolgeler: [] },
                }),
              };
}

describe('beslenme değişmezleri — tüm ızgara', () => {
  it('makro toplamı beyan edilen kaloriyle tutarlı', () => {
    const sapanlar: string[] = [];

    for (const p of izgara()) {
      const h = beslenmeHedefiHesapla(p.profil);
      const makroKalori = h.protein_g * 4 + h.karbonhidrat_g * 4 + h.yag_g * 9;
      const sapma = makroKalori - h.kalori;

      // Yuvarlama payı: üç makro da tam sayıya yuvarlanıyor.
      if (Math.abs(sapma) > 25) {
        sapanlar.push(
          `${p.cinsiyet} ${p.yas}y ${p.boy_cm}cm ${p.kilo_kg}kg ` +
            `akt=${p.aktivite_carpani} ${p.hedef}: ` +
            `beyan ${h.kalori} kcal, makrolar ${Math.round(makroKalori)} kcal ` +
            `(P${h.protein_g} K${h.karbonhidrat_g} Y${h.yag_g}), sapma ${Math.round(sapma)}`,
        );
      }
    }

    expect(sapanlar.slice(0, 12).join('\n')).toBe('');
  });

  it('hiçbir profile sıfır karbonhidrat yazılmıyor', () => {
    const sifirlar: string[] = [];

    for (const p of izgara()) {
      const h = beslenmeHedefiHesapla(p.profil);
      if (h.karbonhidrat_g <= 0) {
        sifirlar.push(
          `${p.cinsiyet} ${p.yas}y ${p.boy_cm}cm ${p.kilo_kg}kg ` +
            `akt=${p.aktivite_carpani} ${p.hedef}: ` +
            `${h.kalori} kcal, P${h.protein_g} K${h.karbonhidrat_g} Y${h.yag_g}`,
        );
      }
    }

    expect(sifirlar.slice(0, 12).join('\n')).toBe('');
  });

  it('kalori mutlak alt sınırın altına inmiyor', () => {
    const altta: string[] = [];

    for (const p of izgara()) {
      const h = beslenmeHedefiHesapla(p.profil);
      const taban = p.cinsiyet === 'erkek' ? 1500 : 1200;
      if (h.kalori < taban) {
        altta.push(`${p.cinsiyet} ${p.kilo_kg}kg ${p.hedef}: ${h.kalori} < ${taban}`);
      }
    }

    expect(altta.slice(0, 12).join('\n')).toBe('');
  });
});
