import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Dışa aktarmanın kaynak taraması.
 *
 * Bu dosyadaki her şey platforma bağlı (dosya sistemi, paylaşım sayfası), yani birim
 * testiyle çalıştırılamıyor. Ama bu projedeki en sık kusur sınıfı "yazıldı, hiç
 * çağrılmadı" — ve dışa aktarma tam olarak öyle bir yerdeydi: uç nokta veriyi
 * döndürüyordu, ekran onu atıyor ve "hazırlandı" yazıyordu.
 *
 * Aşağıdaki testler davranışı değil, bağlantıların kurulmuş olduğunu koruyor.
 */

const kok = join(import.meta.dirname, '..', '..');
const oku = (...parcalar: string[]) => readFileSync(join(kok, ...parcalar), 'utf8');

/**
 * İçe aktarma satırlarını atar.
 *
 * Bu testler ilk yazıldığında `import` satırı tek başına onları geçiriyordu: çağrıyı
 * silip içe aktarmayı bırakınca test yeşil kalıyordu. Yani koruduğunu sandığımız şeyi
 * korumuyordu. Gövdeye bakılıyor artık.
 */
const govde = (kaynak: string) =>
  kaynak
    .split(String.fromCharCode(10))
    .filter((satir) => !/^\s*import\s/.test(satir) && !/^\s*\}\s*from\s/.test(satir))
    .join(String.fromCharCode(10));

describe('dışa aktarma bağlantıları', () => {
  it('ayarlar ekranı paylaşımı gerçekten çağırıyor', () => {
    const ekran = oku('app', '(sekme)', 'ayarlar.tsx');
    expect(ekran).toContain("from '../../src/veri/disaAktar'");
    expect(govde(ekran)).toMatch(/veriyiPaylas\(/);
  });

  it('ayarlar ekranı veriyi alıp atmıyor', () => {
    const ekran = oku('app', '(sekme)', 'ayarlar.tsx');
    // Uç noktadan dönen gövde paylaşıma giriyor olmalı.
    expect(ekran).toMatch(/const veri = await istek\([^)]*disa-aktar[^)]*\)/);
    expect(ekran).toMatch(/veriyiPaylas\(\s*veri/);
  });

  it('paylaşım açılamazsa kullanıcıya nerede olduğu söyleniyor', () => {
    const ekran = oku('app', '(sekme)', 'ayarlar.tsx');
    expect(ekran).toContain("'paylasim_yok'");
    expect(ekran).toContain('verinHazirGovde');
  });

  it('çıkışta önbellekteki dışa aktarma dosyaları siliniyor', () => {
    const oturum = oku('src', 'durum', 'Oturum.tsx');
    expect(oturum).toContain("from '../veri/disaAktar'");
    expect(govde(oturum)).toMatch(/await disaAktarmaArtiklariniSil\(\)/);
  });

  it('dosya adı ortak paketten geliyor, ekranda elle kurulmuyor', () => {
    const modul = oku('src', 'veri', 'disaAktar.ts');
    expect(modul).toContain('disaAktarmaDosyaAdi');
    expect(oku('app', '(sekme)', 'ayarlar.tsx')).not.toContain('.json');
  });
});

describe('dışa aktarma metinleri', () => {
  it('artık "sonraki sürümde" sözü vermiyor', () => {
    const tr = readFileSync(
      join(kok, '..', '..', 'packages', 'shared', 'src', 'metinler.tr.ts'),
      'utf8',
    );
    expect(tr).not.toContain('Paylaşım seçeneği bir sonraki sürümde');
  });
});
