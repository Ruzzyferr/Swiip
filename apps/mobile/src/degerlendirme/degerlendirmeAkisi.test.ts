import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Değerlendirme akışının üç kilidi.
 *
 * Üçü de 2026-08-30'da gerçek bir kullanıcı turunda emülatörde bulundu ve üçü de
 * "sessiz" sınıfındandı: uygulama çökmüyor, hata da vermiyor.
 *
 *  1. Değerlendirme sunucuda hiç KAPANMIYORDU. Son blok da geri bildirim üretiyor,
 *     akış kart sonu dalına girip `return` ediyordu ve `/tamamla` çağrısı ondan
 *     sonra geliyordu. Ağdan doğrulandı: sekiz `POST /cevap`, sıfır `/tamamla`.
 *     Kullanıcı sekiz kartı ve vücut analizini bitirdikten sonra "Henüz programın
 *     yok · Önce değerlendirmeyi tamamla" duvarına çarpıyor, `POST /program/uret`
 *     400 dönüyordu. Yeni kullanıcı kilitli kalıyordu.
 *
 *  2. Kapı ekranı HER kart sonunda yeniden açılıyordu. Sunucu o an açık olan bütün
 *     kapıları döndürüyor; ekran da her gördüğünde sayfayı açıyordu. Kardiyak
 *     bayrağa bir kez "Evet" diyen kullanıcı "Önce doktor onayı" ekranını yedi kez
 *     görüyordu.
 *
 *  3. "İsteğe bağlıları sonra cevaplayacağım" satırının yeri her cevapta yeniden
 *     hesaplanıyordu; satır belirip kayboldukça altındaki bütün sorular kayıyordu.
 *     Ölçüldü: bir şıkka dokunulduğu anda liste 310 px yukarı sıçrıyor ve ikinci
 *     dokunuş üç sıra aşağıdaki şıkka gidiyordu.
 *
 * DÜRÜST SINIR: burası statik bir tarama. Ekran `react-native` çektiği için Node
 * altında içe aktarılamıyor — `tasmaKorumasi.test.ts` ve `hataSiniri.test.ts` aynı
 * sınırla karşılaşıp aynı yolu seçmiş. Korunan şey MEKANİZMA: sıra, filtre ve
 * bağımlılık. "Bu akış doğru hissettiriyor mu" sorusu emülatörde yanıtlanır.
 */

const BURASI = import.meta.dirname;
const KOSUCU = join(BURASI, '..', '..', 'app', 'degerlendirme', 'index.tsx');
const ENVANTER = join(BURASI, 'EkipmanEnvanteri.tsx');

/**
 * Yorumları atılmış kaynak.
 *
 * Bu depoda yorumlar kusurların tarihçesini tutuyor ve aşağıdaki yorumlar eski
 * kodu ADIYLA anlatıyor. Tarama koda bakmalı, tarihçeye değil.
 */
function kod(yol: string): string {
  return readFileSync(yol, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, ' ');
}

describe('değerlendirme sunucuda kapanıyor', () => {
  const kaynak = kod(KOSUCU);

  it('tamamlama çağrısı tek bir yerde', () => {
    expect(
      (kaynak.match(/degerlendirme\/tamamla/g) ?? []).length,
      'İki ayrı yerden tamamlanıyorsa biri unutulur; bir kez unutuldu.',
    ).toBe(1);
  });

  it('tamamlama YÖNLENDİRMEDEN önce', () => {
    const tamamlandi = kaynak.indexOf('await tamamla()');
    const ilkPush = kaynak.indexOf('router.push');
    expect(tamamlandi, '`await tamamla()` çağrısı yok').toBeGreaterThan(-1);
    expect(ilkPush, 'router.push yok').toBeGreaterThan(-1);
    expect(
      tamamlandi,
      'Yönlendirme tamamlamadan önce geliyor: `router.push` ardından `return` var, ' +
        'yani son kartta `/tamamla` hiç çağrılmıyor ve kullanıcı programsız kalıyor.',
    ).toBeLessThan(ilkPush);
  });

  it('"Değerlendirme tamam" yedek ekranı da tamamlıyor', () => {
    // Fotoğraf akışına giden her yol tamamlamadan geçmeli.
    const gizlilikYollari = [...kaynak.matchAll(/router\.replace\('\/fotograf\/gizlilik'\)/g)];
    expect(gizlilikYollari.length).toBeGreaterThan(0);
    expect(
      /tamamla\(\)[\s\S]{0,240}fotograf\/gizlilik/.test(kaynak),
      'Yedek ekranın düğmesi doğrudan fotoğraf akışına atlıyor; force-quit sonrası ' +
        'dönen kullanıcı değerlendirmesi kapanmadan ilerler.',
    ).toBe(true);
  });
});

describe('kapı ekranı kapı başına bir kez', () => {
  const kaynak = kod(KOSUCU);

  it('gösterilen kapılar hatırlanıyor', () => {
    expect(kaynak).toMatch(/gosterilenKapilar/);
    expect(
      /\.filter\(\([^)]*\)\s*=>\s*!gosterilenKapilar\.current\.has\(/.test(kaynak),
      'Kapılar gösterilmişlere göre süzülmüyor: sunucu her kayıtta açık kapıların ' +
        'hepsini döndürdüğü için aynı uyarı her kart sonunda yeniden açılır.',
    ).toBe(true);
  });

  it('gösterilen kapı kümeye ekleniyor', () => {
    expect(kaynak).toMatch(/gosterilenKapilar\.current\.add\(/);
  });

  /**
   * Tekrarı engellemek kapıyı ZAYIFLATMAZ: engelin kendisi sunucuda.
   * Bu satır, "kapıyı ekranda saymayı bıraktık" diye okunmasın diye burada.
   */
  it('kapı listesi hâlâ ağırlığa göre sıralanıyor — en ağırı önce', () => {
    expect(kaynak).toMatch(/kayit_reddet:\s*0/);
    expect(kaynak).toMatch(/program_uretme:\s*1/);
    expect(kaynak).toMatch(/doktor_onayi_bekle:\s*2/);
    expect(kaynak).toMatch(/sayilari_gizle:\s*3/);
  });
});

describe('cevap vermek düzeni oynatmıyor', () => {
  it('atlama satırının yeri cevaplara bakmıyor', () => {
    const kaynak = kod(KOSUCU);
    const eslesme = kaynak.match(/const atlamaSirasi = useMemo\([\s\S]*?\);/);
    expect(eslesme, '`atlamaSirasi` bulunamadı').not.toBeNull();
    const govde = eslesme![0];

    expect(
      /cevaplar/.test(govde),
      'Satırın yeri cevaplardan hesaplanıyor: her cevapta yer değiştirir ya da ' +
        'kaybolur, altındaki sorular parmağın altından kayar.',
    ).toBe(false);
    expect(
      /zorunlulariBitti|cevaplandiMi/.test(govde),
      'Satır cevapların durumuna göre belirip kayboluyor.',
    ).toBe(false);
  });

  it('ekipman öneri bloğu seçim yapılınca kaybolmuyor', () => {
    const kaynak = kod(ENVANTER);
    expect(
      /secili\.length === 0\s*\?/.test(kaynak),
      'Öneri bloğu ilk seçimde yok oluyor ve ızgara yukarı sıçrıyor; ikinci dokunuş ' +
        'başka bir kutucuğa gider.',
    ).toBe(false);
    expect(kaynak, 'Öneri bloğu yalnızca konumdan gelen sete bağlı olmalı').toMatch(
      /\{onDolduSet \?/,
    );
  });

  it('ekipman sayaç satırının yüksekliği sabit', () => {
    const kaynak = kod(ENVANTER);
    expect(
      /<Satir[^>]*stil=\{\{\s*minHeight: tema\.dokunmaHedefi\s*\}\}/.test(kaynak),
      '"Temizle" belirince satır büyür ve ızgarayı aşağı iter.',
    ).toBe(true);
  });
});

/**
 * Cevaplar DEĞİŞTİRİLEBİLİR kalır.
 *
 * Değerlendirme bitince koşucu "Değerlendirme tamam" ekranında kalıyor ve cetvel
 * çizilmiyordu; cevaplanmış bir soruyu değiştirmenin hiçbir yolu yoktu. Ayarlardaki
 * "Değerlendirmeyi güncelle" de aynı ekrana çıkıyordu — yani orada da yoktu.
 *
 * Bedeli rahatsızlıktan ibaret değildi: yanlış dokunulan tek bir güvenlik sorusu
 * (kardiyak bayrak) program üretimini kalıcı olarak kapatıyor ve kullanıcının
 * düzeltmesi imkânsız hale geliyordu. Emülatörde doğrulandı.
 */
describe('bitmiş değerlendirmeye dönülebiliyor', () => {
  const kaynak = kod(KOSUCU);

  it('kapanış ekranında cevaplara dönüş düğmesi var', () => {
    expect(kaynak, 'Kapanış ekranı çıkmaz olmamalı').toMatch(/m\.cevaplariGozdenGecir/);
  });

  it('düğme bir bölüm seçerek cetveli geri getiriyor', () => {
    expect(
      /cevaplariGozdenGecir[\s\S]{0,200}setAktifBlokId\(bolumler\[0\]\?\.id\)/.test(kaynak),
      'Düğme bir blok seçmiyor: seçilmeyince koşucu kapanış ekranında kalır.',
    ).toBe(true);
  });
});

/**
 * Program KENDİLİĞİNDEN üretiliyor.
 *
 * Vücut analizindeki "Programımı gör" doğrudan Program sekmesine getiriyor ve program
 * henüz üretilmemiş olduğu için kullanıcı "Henüz programın yok" boş ekranıyla
 * karşılaşıyordu. Sekiz kartı ve vücut analizini bitirmiş birine "programını görmek
 * için bir de şuraya bas" demek, emeğinin karşılığını bir dokunuş arkasına saklamak.
 */
describe('program boş ekranda bırakmıyor', () => {
  const kaynak = kod(join(BURASI, '..', '..', 'app', '(sekme)', 'program.tsx'));

  it('program yoksa bir kez otomatik deneniyor', () => {
    expect(kaynak).toMatch(/denendi\.current/);
    expect(
      /if \(durum !== 'yok' \|\| denendi\.current\) return;/.test(kaynak),
      'Deneme mount başına bir kez olmalı; yoksa başarısızlıkta döngüye girer.',
    ).toBe(true);
    expect(kaynak).toMatch(/void uret\(true\)/);
  });

  it('otomatik denemede kapı ekranı yüze açılmıyor', () => {
    expect(
      /durum === 403 && !otomatik/.test(kaynak),
      'Otomatik deneme kapı ekranını açarsa, kardiyak bayraklı kullanıcı sekmeye her ' +
        'girdiğinde uyarı ekranıyla karşılaşır. Sebep sayfanın içinde yazmalı.',
    ).toBe(true);
  });

  it('elle basıldığında kapı ekranı hâlâ açılıyor', () => {
    expect(kaynak).toMatch(/void uret\(false\)/);
  });
});
