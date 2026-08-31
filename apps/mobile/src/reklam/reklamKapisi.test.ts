import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ÖDEYEN KULLANICI HİÇBİR KOŞULDA REKLAM GÖRMEZ.
 *
 * Buradaki her madde ölçülmüş bir şikâyete bağlı. `docs/rakip-analizi.md`,
 * EatBetter, 1★ / 8 beğeni:
 *
 *   "3 aylık programı satın aldım ama öğün kaydetmek istediğimde kaydet tuşuna
 *    basıyorum, kaydetmek yerine reklam çıkıyor."
 *
 * Aynı cümlede İKİ ayrı kusur var:
 *   1. Ödeyen kullanıcıya reklam gösterilmiş.
 *   2. Reklam eylemin YERİNE geçmiş.
 *
 * `docs/spec.md` bölüm 02 bunu kilitli kural yapmış: "Ödeyene sıfır reklam ·
 * Ödeyen kullanıcıya hiçbir promosyon arayüzü yok."
 *
 * DÜRÜST SINIR: burası statik bir tarama. Ekranlar `react-native` çektiği için Node
 * altında içe aktarılamıyor — `tasmaKorumasi.test.ts`, `klavye.test.ts` ve
 * `degerlendirmeAkisi.test.ts` aynı sınırla karşılaşıp aynı yolu seçmiş. Korunan şey
 * MEKANİZMA: kararın kaynağı, varsayılanın yönü ve çizim koşulu.
 */

const MOBIL = join(import.meta.dirname, '..', '..');
const REKLAM = join(MOBIL, 'src', 'reklam');
const APP = join(MOBIL, 'app');

/** Yorumları atılmış kaynak; yorumlar eski kodu adıyla anlatıyor olabilir. */
function kod(yol: string): string {
  return readFileSync(yol, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, ' ');
}

function tsxDosyalari(dizin: string): string[] {
  return readdirSync(dizin).flatMap((ad) => {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) return tsxDosyalari(yol);
    return /\.tsx?$/.test(ad) && !ad.includes('.test.') ? [yol] : [];
  });
}

describe('reklam kararı SUNUCUDAN geliyor', () => {
  const HAK = kod(join(REKLAM, 'ReklamHakki.tsx'));

  it('hak sunucudan okunuyor', () => {
    expect(
      HAK.includes('abonelik/durum'),
      'Reklam kararı istemcideki plan bilgisinden türetiliyor: istemciyi kandıran ' +
        'herkes reklamsız olur ve aboneliğin somut karşılıklarından biri kâğıtta kalır.',
    ).toBe(true);
    expect(HAK).toMatch(/haklar\?\.reklam/);
  });

  it('varsayılan REKLAM YOK — bilinmiyorsa gösterilmiyor', () => {
    /*
     * Değişken ADIYLA aranıyor, çıplak `useState(false)` ile değil.
     *
     * İlk hâli `HAK.includes('useState(false)')` idi ve KUSURU AKLADI: dosyada iki
     * `useState(false)` var (`goster` ve `bilindi`). `goster` bilerek `true`
     * yapıldığında test yeşil kaldı, çünkü `bilindi`nin satırı eşleşiyordu.
     * Kural kusur geri konarak sınandı; ancak bu hâli kırmızıya düştü.
     */
    expect(
      HAK.includes('const [goster, setGoster] = useState(false)'),
      'Varsayılan `true` olursa ödeyen kullanıcı, cevap gelene kadar reklam görür. ' +
        'Ölçülen 1★ yorumu tam olarak bu deneyimden doğmuş.',
    ).toBe(true);
    expect(
      HAK.includes('const [bilindi, setBilindi] = useState(false)'),
      '`bilindi` başlangıçta true olursa banner cevap gelmeden çizilir.',
    ).toBe(true);
  });

  it('hata durumunda da reklam kapanıyor', () => {
    const yakala = HAK.slice(HAK.indexOf('catch'));
    expect(
      yakala.includes('setGoster(false)'),
      'Ağ hatasında son bilinen değer korunursa, satın alma sonrası ödeyen kullanıcı ' +
        'bir süre daha reklam görür.',
    ).toBe(true);
  });
});

describe('banner üç koşul sağlanmadan çizilmiyor', () => {
  const BANNER = kod(join(REKLAM, 'ReklamBanner.tsx'));

  it('hak yoksa ya da bilinmiyorsa null dönüyor', () => {
    expect(
      BANNER.includes('if (!bilindi || !goster) return null'),
      'Yalnızca `goster` bakmak yetmez: cevap gelmeden `goster` false ama "bilinmiyor" ' +
        'ile "hayır" aynı şey değil. Yükleme anında çizim yapılmamalı.',
    ).toBe(true);
  });

  it('yüklenmeden yer kaplamıyor', () => {
    expect(
      BANNER.includes('height: yuklendi ? undefined : 0'),
      'Önceden yer ayırmak, reklam gelmezse sayfanın dibinde sebepsiz bir boşluk ' +
        'bırakır; gelince de içerik zıplar.',
    ).toBe(true);
  });

  it('kişiselleştirme kapalı', () => {
    expect(
      BANNER.includes('requestNonPersonalizedAdsOnly: true'),
      'Kişiselleştirme, Apple App Privacy tarafında "Data Used to Track You" beyanı ' +
        'gerektirir; sağlık verisi tutan bir uygulamada bedeli eCPM farkından ağır.',
    ).toBe(true);
  });
});

describe('tam ekran reklam eylemin YERİNE geçmiyor', () => {
  const GECIS = kod(join(REKLAM, 'gecisReklami.ts'));
  const BESLENME = kod(join(APP, '(sekme)', 'beslenme.tsx'));

  it('hak parametresi zorunlu ve false ise hemen çıkıyor', () => {
    expect(GECIS).toMatch(/gecisReklamiGoster\(reklamGoster: boolean\)/);
    expect(
      GECIS.includes('if (!reklamGoster) return;'),
      'Parametre okunmuyorsa ödeyene reklam çıkar.',
    ).toBe(true);
  });

  it('sıklık sınırı uygulanıyor', () => {
    expect(GECIS).toMatch(/gosterilebilirMi/);
    expect(GECIS).toMatch(/gosterildi/);
  });

  it('gösterilemeyen reklam sayacı ARTIRMIYOR', () => {
    const goster = GECIS.slice(GECIS.indexOf('reklam.show()'));
    const yaz = goster.indexOf('durumuYaz');
    const yakala = goster.indexOf('catch');
    expect(yaz, 'durumuYaz çağrısı yok').toBeGreaterThan(-1);
    expect(
      yaz < yakala || yakala === -1,
      'Sayaç `show()` başarısız olduğunda da artarsa, kullanıcı görmediği reklamın ' +
        'bedelini öder ve o gün hakkı boşa gider.',
    ).toBe(true);
  });

  it('kayıt tamamlandıktan SONRA çağrılıyor', () => {
    const i = BESLENME.indexOf("istek('/v1/beslenme/kayit'");
    const j = BESLENME.indexOf('gecisReklamiGoster(reklamGoster)');
    expect(i, 'kayıt çağrısı bulunamadı').toBeGreaterThan(-1);
    expect(j, 'reklam çağrısı bulunamadı').toBeGreaterThan(-1);
    expect(
      j,
      'Reklam kaydın önünde: ölçülen 1★ şikâyeti tam olarak bu — "kaydetmek yerine ' +
        'reklam çıkıyor".',
    ).toBeGreaterThan(i);
  });

  it('yalnızca başarılı kayıtta gösteriliyor', () => {
    expect(
      BESLENME.includes('if (basarili) void gecisReklamiGoster'),
      'Başarısız kayıtta reklam açmak, kullanıcının okuması gereken hatayı gizler.',
    ).toBe(true);
  });

  it('akışı bloklamıyor', () => {
    expect(
      BESLENME.includes('void gecisReklamiGoster'),
      'Reklam beklenirse kullanıcının kaydı reklamın yüklenmesine takılır.',
    ).toBe(true);
  });
});

/**
 * Reklamın GİRMEYECEĞİ ekranlar.
 *
 * Değerlendirme, vücut fotoğrafı ve sağlık kapıları: oralar ya sağlık ya da
 * kullanıcının en kırılgan olduğu an. Ödeme ekranı: satmaya çalıştığın şeyin
 * değerini kendi elinle düşürmek olurdu.
 */
describe('reklam yasak bölgeler', () => {
  const YASAK = ['degerlendirme', 'fotograf', 'odeme'];

  it.each(YASAK)('%s ekranlarında reklam yok', (klasor) => {
    const suclular = tsxDosyalari(join(APP, klasor))
      .filter((yol) => /ReklamBanner|gecisReklamiGoster/.test(kod(yol)))
      .map((yol) => yol.slice(APP.length + 1));

    expect(suclular, `${klasor}: sağlık ve ödeme ekranlarında reklam gösterilmez.`).toEqual([]);
  });

  it('koç ekranında reklam yok — kotalı ve ücretli bir özellik', () => {
    expect(kod(join(APP, '(sekme)', 'koc.tsx')).includes('ReklamBanner')).toBe(false);
  });
});

describe('reklam yerleşimi bilinen üç sekmede', () => {
  const SEKMELER = ['beslenme.tsx', 'ilerleme.tsx', 'program.tsx'];

  it.each(SEKMELER)('%s banner taşıyor', (ad) => {
    expect(kod(join(APP, '(sekme)', ad))).toMatch(/<ReklamBanner \/>/);
  });

  it('banner her zaman listenin ALTINDA', () => {
    for (const ad of SEKMELER) {
      const kaynak = kod(join(APP, '(sekme)', ad));
      const banner = kaynak.indexOf('<ReklamBanner />');
      const sutunKapanis = kaynak.indexOf('</Sutun>', banner);
      expect(banner, `${ad}: banner yok`).toBeGreaterThan(-1);
      expect(
        sutunKapanis - banner,
        `${ad}: banner listenin ortasında. Bu depoda 2. kusur tam buydu — bir listenin ` +
          'üstünde belirip kaybolan blok, altındaki her şeyi parmağın altından kaydırıyor.',
      ).toBeLessThan(200);
    }
  });
});
