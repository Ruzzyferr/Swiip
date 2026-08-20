import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ciktiyiAyristir, gorselParmakIzi } from './gorselAnaliz';

/**
 * Gizlilik mimarisinin kod düzeyinde güvencesi (F4 bitti kriteri:
 * "Fotoğraf sunucuda hiçbir yerde saklanmıyor — kod incelemesiyle doğrulandı").
 *
 * Bu test kod incelemesini otomatikleştirir: fotoğrafa dokunan yollarda diske yazma,
 * nesne deposuna yükleme veya kuyruğa koyma çağrısı belirirse CI kırılır.
 *
 * Şema tarafındaki karşılığı: packages/api/src/db/sema.test.ts
 */

const kaynakDizin = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Fotoğraf verisine erişebilen dosyalar. Bu listeye ekleme yapmak bilinçli bir karar olmalı. */
const FOTOGRAFA_DOKUNAN_DOSYALAR = ['servisler/gorselAnaliz.ts', 'rotalar/vucut.ts'];

/** Kalıcılık üreten çağrılar. Fotoğraf yolunda hiçbiri bulunamaz. */
const YASAKLI_CAGRILAR = [
  'writeFile',
  'writeFileSync',
  'createWriteStream',
  'appendFile',
  'copyFile',
  'mkdtemp',
  'putObject',
  'upload',
  's3',
  'bucket',
  'multipart',
  'diskStorage',
];

async function dosyaOku(gorecelYol: string): Promise<string> {
  return readFile(join(kaynakDizin, gorecelYol), 'utf8');
}

describe('gizlilik mimarisi — kaynak kod güvencesi', () => {
  it.each(FOTOGRAFA_DOKUNAN_DOSYALAR)('%s dosyasında diske yazma çağrısı yok', async (yol) => {
    const kaynak = await dosyaOku(yol);
    const kod = kaynak
      .split('\n')
      // Yorum satırları hariç: yasak listesini anlatan yorumlar testi kırmamalı.
      .filter((satir) => !satir.trim().startsWith('*') && !satir.trim().startsWith('//'))
      .join('\n');

    for (const cagri of YASAKLI_CAGRILAR) {
      expect(
        kod.toLowerCase().includes(cagri.toLowerCase()),
        `${yol} içinde ${cagri} bulundu`,
      ).toBe(false);
    }
  });

  it('fotoğraf yolunda dosya sistemi modülü içe aktarılmıyor', async () => {
    for (const yol of FOTOGRAFA_DOKUNAN_DOSYALAR) {
      const kaynak = await dosyaOku(yol);
      expect(kaynak.includes("from 'node:fs")).toBe(false);
      expect(kaynak.includes("require('fs')")).toBe(false);
    }
  });

  it('görsel analiz dönüş tipinde fotoğraf alanı yok', async () => {
    const cikti = ciktiyiAyristir(
      JSON.stringify({ yag_orani: 18, kas_dagilimi: { gogus: 4 }, durus: ['bas_one'] }),
    );

    expect(Object.keys(cikti).sort()).toEqual(['durusBayraklari', 'kasDagilimi', 'yagOrani']);
    expect(JSON.stringify(cikti)).not.toMatch(/base64|data:image/i);
  });

  it('hiçbir rota dosyası fotoğrafı veritabanına yazmıyor', async () => {
    const rotaDizini = join(kaynakDizin, 'rotalar');
    const dosyalar = (await readdir(rotaDizini)).filter(
      (d) => d.endsWith('.ts') && !d.endsWith('.test.ts'),
    );

    for (const dosya of dosyalar) {
      const kaynak = await readFile(join(rotaDizini, dosya), 'utf8');
      // `fotograflar` yalnızca istek gövdesinde okunabilir; insert/update değerine giremez.
      const yazmaIcinde =
        /values\(\{[^}]*fotograf/is.test(kaynak) || /set\(\{[^}]*fotograf/is.test(kaynak);
      expect(yazmaIcinde, `${dosya} fotoğrafı veritabanına yazıyor`).toBe(false);
    }
  });
});

describe('gorselParmakIzi', () => {
  it('aynı görsel aynı parmak izini verir', () => {
    expect(gorselParmakIzi('abc')).toBe(gorselParmakIzi('abc'));
  });

  it('farklı görsel farklı parmak izi verir', () => {
    expect(gorselParmakIzi('abc')).not.toBe(gorselParmakIzi('abd'));
  });

  it('parmak izi görselin kendisini içermez ve kısadır', () => {
    const iz = gorselParmakIzi('cok-uzun-bir-base64-dizisi'.repeat(100));

    expect(iz).toHaveLength(32);
    expect(iz).not.toContain('base64');
  });
});

describe('ciktiyiAyristir — model çıktısına güvenilmez', () => {
  it('bozuk JSON çökertmez, boş çıktı verir', () => {
    expect(ciktiyiAyristir('bu json değil')).toEqual({ kasDagilimi: {}, durusBayraklari: [] });
  });

  it('fizyolojik sınır dışı yağ oranını atar', () => {
    expect(ciktiyiAyristir(JSON.stringify({ yag_orani: 95 })).yagOrani).toBeUndefined();
    expect(ciktiyiAyristir(JSON.stringify({ yag_orani: 1 })).yagOrani).toBeUndefined();
  });

  it('tanımsız duruş etiketini reddeder', () => {
    const cikti = ciktiyiAyristir(JSON.stringify({ durus: ['kifoz', 'bas_one'] }));

    expect(cikti.durusBayraklari).toEqual(['bas_one']);
  });

  it('aralık dışı kas skorunu atar', () => {
    const cikti = ciktiyiAyristir(JSON.stringify({ kas_dagilimi: { gogus: 9, sirt: 3 } }));

    expect(cikti.kasDagilimi).toEqual({ sirt: 3 });
  });
});

/**
 * Cihaz tarafındaki karşılığı.
 *
 * Sunucuda saklamamak sözün yarısı. Diğer yarısı: çekim ekranı fotoğrafı bizim
 * önbelleğimize veya kalıcı depoya yazmamalı. Kullanıcının kendi telefonunda kalan
 * karşılaştırma kopyası ayrı bir şey ve gizlilik ekranında açıkça söyleniyor.
 */
describe('çekim ekranı — cihazda kalıcılık yok', () => {
  const cekimYolu = join(kaynakDizin, '..', '..', '..', 'apps', 'mobile', 'app', 'fotograf');

  /** Bizim yazdığımız kalıcı depolar. Fotoğraf bunların hiçbirine girmemeli. */
  const YASAKLI_DEPOLAR = ['AsyncStorage', 'SecureStore', 'onbellek', 'FileSystem'];

  it('fotoğraf verisi hiçbir kalıcı depoya yazılmıyor', async () => {
    const kaynak = await readFile(join(cekimYolu, 'cekim.tsx'), 'utf8');
    const kod = kaynak.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

    for (const depo of YASAKLI_DEPOLAR) {
      expect(kod, `${depo} çekim ekranında geçmemeli`).not.toContain(depo);
    }
  });

  it('çekilen kareler analizden sonra bellekten bırakılıyor', async () => {
    const kaynak = await readFile(join(cekimYolu, 'cekim.tsx'), 'utf8');

    // Gönderimden sonra durum temizleniyor: ekran açık kalsa bile kare tutulmaz.
    expect(kaynak).toContain('setKareler([])');
  });
});

/**
 * Log maskesi kapsamı.
 *
 * Sağlık cevabı, parola, kod ve fotoğraf log'a düşerse gizlilik mimarisi kâğıt üstünde
 * kalır: veriyi veritabanında saklamamak, log dosyasında saklamakla anlamsızlaşır.
 *
 * Bu test maskeyi istek şemalarına karşı doğrular: yeni bir hassas alan eklenip maskeye
 * yazılmazsa CI kırılır.
 */
describe('log maskesi — hassas alanlar', () => {
  /** İsteklerde geçen ve log'a düşmemesi gereken gövde alanları. */
  const HASSAS_ALANLAR = [
    'parola',
    'yeni_parola',
    'yenileme_token',
    'cevaplar',
    'fotograflar',
    'fotograf',
    'kod',
    'mesaj',
  ];

  it('her hassas alan maskede yazılı', async () => {
    const kaynak = await readFile(join(kaynakDizin, 'uygulama.ts'), 'utf8');

    const eksik = HASSAS_ALANLAR.filter((alan) => !kaynak.includes(`'req.body.${alan}'`));

    expect(eksik).toEqual([]);
  });

  it('maskelenen alanlar siliniyor, yıldızlanmıyor', async () => {
    const kaynak = await readFile(join(kaynakDizin, 'uygulama.ts'), 'utf8');

    // `remove: true` olmazsa alan "[Redacted]" olarak kalır; uzunluğu bile bilgi verir.
    expect(kaynak).toContain('remove: true');
  });
});
