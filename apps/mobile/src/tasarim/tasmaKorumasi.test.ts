import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Hiçbir ekran içeriğini kırpmasın — tuval ne kadar küçük olursa olsun.
 *
 * Apple 2026-08-28'de Guideline 4 (Design) ile reddetti. Gerekçe metni:
 * *"the buttons and texts were not visible"*, inceleme cihazı iPad Air 11" (M3).
 * Ekli ekran görüntüsünde karşılama ekranı görünüyordu: iPhone uyumluluk penceresi
 * uygulamaya **375x667 pt** veriyor, oysa `app/index.tsx` düz bir `View` idi ve
 * içerik o yüksekliğe sığmayınca "Başla" ile "Hesabım var" düğmeleri ekranın
 * altında kalıyordu. Kaydırma olmadığı için ulaşılamıyorlardı da.
 *
 * Bu, bu depoda aynı sınıfın DÖRDÜNCÜ örneğiydi: `degerlendirme/kapi.tsx` bir kez
 * tam bunu yaşayıp düzeltilmişti ve düzeltmenin yorumu hâlâ o dosyada duruyor —
 * ama kural hiçbir yerde kilitlenmediği için `blok-sonu.tsx` ile `index.tsx`
 * kırpmaya devam etti.
 *
 * DÜRÜST SINIR: burası statik bir tarama, düzen ölçmüyor. Kırpmanın gerçekleştiği
 * mekanizmayı — kaydırmayan bir kap — engelliyor, "bu ekran şu cihazda güzel mi"
 * sorusunu yanıtlamıyor. O soru emülatörde gözle bakılarak yanıtlanır.
 */

const TASARIM = import.meta.dirname;
const APP = join(TASARIM, '..', '..', 'app');

function tsxDosyalari(dizin: string): string[] {
  return readdirSync(dizin).flatMap((ad) => {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) return tsxDosyalari(yol);
    return ad.endsWith('.tsx') ? [yol] : [];
  });
}

const EKRANLAR = tsxDosyalari(APP).filter((yol) => !yol.endsWith('_layout.tsx'));

/**
 * Yorumları atılmış kaynak.
 *
 * Bu depoda yorumlar kusurların tarihçesini tutuyor — `kapi.tsx` kaldırılmış
 * `kaydirilabilir={false}` propunu hâlâ ADIYLA anlatıyor ve anlatmaya da devam
 * etmeli. Tarama koda bakmalı, tarihçeye değil; yoksa doğru olan şeyi silmeye
 * zorlar.
 */
function kod(yol: string): string {
  return readFileSync(yol, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, ' ');
}

/** Taşan içeriği kaydırarak erişilebilir kılan kaplar. */
const KAYDIRAN = /<(Ekran|ScrollView|FlatList|SectionList)\b/;

describe('ekranlar taşan içeriği kırpmıyor', () => {
  it('taranacak ekran var — test boşa dönmüyor', () => {
    expect(EKRANLAR.length).toBeGreaterThan(20);
  });

  it.each(EKRANLAR.map((y) => [y.slice(APP.length + 1), y]))(
    '%s kaydıran bir kap kullanıyor',
    (_ad, yol) => {
      expect(
        KAYDIRAN.test(kod(yol)),
        'Bu ekran kaydırmayan bir kapla çiziliyor. Küçük tuvalde (iPhone SE, iPad ' +
          'uyumluluk penceresi 375x667, büyük yazı tipi) son düğme ekranın dışında ' +
          'kalır ve ulaşılamaz. <Ekran> kullan.',
      ).toBe(true);
    },
  );
});

/**
 * `Ekran`ın kaçış kapısı YOK.
 *
 * `kaydirilabilir={false}` vardı ve kullanıldığı iki yerin ikisi de kusurluydu.
 * Bir kaçış kapısı, kuralı kuralın kendisi kadar hızlı bozar.
 */
describe('Ekran kabının garantileri', () => {
  const kaynak = kod(join(TASARIM, 'bilesenler.tsx'));

  it('kaydırmayı kapatan bir prop yok', () => {
    expect(
      /kaydirilabilir/.test(kaynak),
      'Kaydırmayı kapatan prop geri gelmiş. Dikey ortalama isteniyorsa `ortala` ' +
        'kullan: o, yer varken ortalıyor, yer yokken kaydırıyor.',
    ).toBe(false);
  });

  it('hiçbir ekran kaydırmayı kapatmaya çalışmıyor', () => {
    for (const yol of EKRANLAR) {
      expect(/kaydirilabilir/.test(kod(yol)), `${yol} kaydırmayı kapatıyor`).toBe(false);
    }
  });

  /**
   * Dibe yaslanan düzenin doğru kurulumu bu. `flexGrow: 1` olmadan `Ekran`
   * içindeki `flex: 1` ayırıcı çökerdi ve alt düğmeler içeriğe yapışırdı;
   * `View` ile de içerik sığmadığında kırpılırdı. İkisinin arası yok.
   */
  it('içerik kabı yer varken uzuyor (flexGrow)', () => {
    expect(kaynak).toMatch(/contentContainerStyle/);
    expect(kaynak).toMatch(/flexGrow:\s*1/);
  });

  it('geniş tuvalde satır uzunluğu sınırlı', () => {
    expect(
      /maxWidth/.test(kaynak),
      'Geniş tuvalde (yatay telefon, iPad) satırlar ekran boyunca uzar ve okunmaz.',
    ).toBe(true);
  });

  it('alt kenar boşluğunu ekliyor', () => {
    expect(kaynak).toMatch(/kenar\.bottom/);
  });
});

/**
 * Yatay taşma — Guideline 4 reddinin ikinci yüzü.
 *
 * Dikey kırpmayı `Ekran` çözüyor; yataydakini bu çözüyor. React Native'de bir
 * `<Text>` yatay bir kabın içinde varsayılan olarak daralmıyor, taşıyor. 320 dp
 * genişlikte %130 yazı tipiyle "Nasıl çalışır" kartındaki süre etiketi
 * "15 saniy" diye kesiliyordu — emülatörde görüldü, kod okunarak değil.
 */
describe('satır içi metin taşmıyor', () => {
  const kaynak = kod(join(TASARIM, 'bilesenler.tsx'));

  it('Satir çocuklarına "satır içindeyim" bilgisini veriyor', () => {
    expect(kaynak).toMatch(/SatirIcinde\.Provider/);
  });

  it('Yazi satır içindeyken daralıyor', () => {
    expect(
      /satirda\s*\?\s*\{\s*flexShrink:\s*1\s*\}/.test(kaynak),
      'Satır içindeki metin daralmıyor: sığmayınca satırı taşırır ve kırpılır.',
    ).toBe(true);
  });

  /**
   * Sarma daralmayı ETKİSİZ kılıyor: Yoga önce satırı kırıyor, daralmaya sıra
   * gelmiyor. Bir aralık `flexWrap` varsayılan yapıldı ve başlıklar numaralarından
   * koptu. Varsayılan olarak geri gelmesin.
   */
  it('sarma varsayılan değil', () => {
    expect(kaynak).not.toMatch(/flexWrap:\s*'wrap'\s*,/);
    expect(kaynak).toMatch(/sar\s*\?\s*\{\s*flexWrap/);
  });
});

/**
 * Okuma sütunu HER ekranda.
 *
 * iPad desteği açılınca tuval 820 pt (dikey) ve 1180 pt (yatay) oldu. `Ekran`
 * kullanan ekranlar sütunu kaptan alıyor; kendi `ScrollView`'ini kuran beş sekme
 * almıyordu ve orada satırlar 110 karaktere uzuyordu — emulatörde ölçüldü.
 *
 * Sütun `Sutun` bileşeninde tek yerde tanımlı; `Ekran` de onu kullanıyor. Bu test
 * her ekranın ikisinden birine girmesini şart koşuyor.
 */
describe('geniş tuvalde okuma sütunu', () => {
  it.each(EKRANLAR.map((y) => [y.slice(APP.length + 1), y]))('%s sütun içinde', (_ad, yol) => {
    expect(
      /<(Ekran|Sutun)\b/.test(kod(yol)),
      'Bu ekran okuma sütununa girmiyor: iPad tuvalinde (820-1180 pt) satırlar ' +
        'ekran boyunca uzar ve okunmaz. <Ekran> ya da <Sutun> kullan.',
    ).toBe(true);
  });

  it('sütun genişliği tek yerde tanımlı', () => {
    const kaynak = kod(join(TASARIM, 'bilesenler.tsx'));
    expect(kaynak).toMatch(/export const OKUMA_GENISLIGI/);
    expect(kaynak).toMatch(/export function Sutun/);
    // `Ekran` sütunu kendisi yeniden kurmasın; tek tanım kalsın.
    expect((kaynak.match(/maxWidth: OKUMA_GENISLIGI/g) || []).length).toBe(1);
  });
});

/**
 * Tam ekran düz `View` yalnızca YÜKLENİYOR göstergesi için.
 *
 * Dosya düzeyindeki tarama bir deliği açık bırakmıştı: bir ekranın erken dönüş dalı
 * kaydırmayan bir kapla çizilebiliyor ve dosyada başka bir yerde `ScrollView` geçtiği
 * için tarama yeşil kalıyordu. Program sekmesinin "Henüz programın yok" dalı tam
 * böyleydi ve orada üç değişken metin var — biri sunucudan gelen üretim hatası.
 * 320 dp'lik tuvalde büyük yazı tipiyle "Değerlendirmeye dön" ekranın dışında
 * kalabiliyordu: yani kullanıcının programsız kaldığı ekranda ÇIKIŞ YOLU kırpılıyordu.
 *
 * Tek meşru istisna yükleniyor göstergesi: tek satır, sabit yükseklik, kaydırmaya
 * ihtiyacı yok.
 */
describe('tam ekran kaplar kaydırıyor', () => {
  const TAM_EKRAN = /<View\s+style=\{\{\s*flex: 1,\s*backgroundColor: tema\.renk\.zemin/g;

  /**
   * Bir `<View>`in KENDİ gövdesi — kapanış etiketine kadar.
   *
   * Önce sabit uzunlukta bir pencere kullanıldı ve iki yönden de yanlış çalıştı:
   * dar pencere değerlendirme koşucusunun kabını (cetvel önce geliyor, `<Ekran>`
   * sonra) yanlışlıkla suçluyordu; geniş pencere ise dosyanın İLERİSİNDEKİ bir
   * `ScrollView`i görüp gerçek kusuru aklıyordu. İkincisi daha kötü: yakalamayan
   * bir kilit, olmayan bir kilittir — bilerek bozup denendi ve testi kırmadı.
   *
   * Artık gövde gerçekten eşleşen `</View>`e kadar okunuyor.
   */
  function govdesi(kaynak: string, baslangic: number): string {
    const acilisSonu = kaynak.indexOf('>', baslangic);
    if (acilisSonu === -1) return kaynak.slice(baslangic);

    let derinlik = 1;
    let i = acilisSonu + 1;
    while (i < kaynak.length && derinlik > 0) {
      const kapanis = kaynak.indexOf('</View>', i);
      const acilis = kaynak.indexOf('<View', i);
      if (kapanis === -1) return kaynak.slice(baslangic);

      if (acilis !== -1 && acilis < kapanis) {
        // Kendinden kapanan `<View ... />` derinliği artırmıyor.
        const etiketSonu = kaynak.indexOf('>', acilis);
        if (etiketSonu !== -1 && kaynak[etiketSonu - 1] !== '/') derinlik += 1;
        i = etiketSonu === -1 ? acilis + 5 : etiketSonu + 1;
        continue;
      }

      derinlik -= 1;
      i = kapanis + 7;
    }
    return kaynak.slice(baslangic, i);
  }

  it.each(EKRANLAR.map((y) => [y.slice(APP.length + 1), y]))(
    '%s tam ekran düz View kullanmıyor',
    (_ad, yol) => {
      const kaynak = kod(yol);
      const suclu: string[] = [];

      for (const eslesme of kaynak.matchAll(TAM_EKRAN)) {
        const govde = govdesi(kaynak, eslesme.index ?? 0);
        const yukleniyor = /<Yukleniyor/.test(govde);
        if (!yukleniyor && !KAYDIRAN.test(govde)) suclu.push(govde.slice(0, 90));
      }

      expect(
        suclu,
        'Tam ekran düz bir `View` içeriği kırpar. Yükleniyor göstergesi dışında ' +
          '`<Ekran>` (ya da bir kaydıran kap) kullan.',
      ).toEqual([]);
    },
  );
});
