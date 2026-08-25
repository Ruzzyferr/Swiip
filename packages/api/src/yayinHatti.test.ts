import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Yayın hattının sessizce bozulabilecek yerleri.
 *
 * Hepsi ölçülmüş bir kusurdan türedi. Ortak yanları şu: hiçbiri tip denetiminden ya da
 * normal testlerden görünmüyor, ve çoğu **iş yeşil bittiği hâlde** yanlış sonuç
 * üretiyor. Yayın hattında en pahalı hata türü bu — mağazaya yanlış şey gider ya da
 * hiçbir şey gitmez, ve kimse fark etmez.
 *
 * Dosyaları metin olarak okuyup şart koşuyoruz; niyet beyanı değil, dosyanın kendisi.
 */

const buradan = dirname(fileURLToPath(import.meta.url));
const kok = resolve(buradan, '../../..');

/**
 * Satır sonları normalleştiriliyor.
 *
 * Dosyalar Windows'ta düzenleniyor ve CRLF'le kaydedilebiliyor; desenler `\n`'e
 * bakınca eşleşme sessizce boşa düşüyor ve test "iş bulunamadı" diyordu. Testin
 * ölçtüğü şey satır sonu değil, içerik.
 */
const oku = (yol: string) => readFileSync(resolve(kok, yol), 'utf8').replace(/\r\n/g, '\n');

const isAkisi = oku('.github/workflows/yayin.yml');
const easJson = oku('apps/mobile/eas.json');
const gitignore = oku('.gitignore');

describe('eas.json', () => {
  /**
   * Mutlak yol = tek bir bilgisayara bağımlılık.
   *
   * Gönderim profili bir zamanlar `C:/Users/ruzzy/.asc-keys/...` yazıyordu. Bu
   * makinede çalışıyordu; Linux koşucusunda ve depo başka bir bilgisayarda
   * klonlandığında yoktu. Hata da anlaşılır değildi — "dosya bulunamadı" diyordu ve
   * dosyanın neden orada olması gerektiğini kimse bilmiyordu.
   */
  it('mutlak makine yolu içermiyor', () => {
    /**
     * Desenler tırnakla başlıyor: yalnızca bir DEĞERİN başındaki mutlak yol aranıyor.
     * İlk hâli `[A-Za-z]:[\\/]` idi ve `"http://127.0.0.1:3311"` adresindeki `p://`
     * ile eşleşti — geliştirme profilindeki tamamen meşru bir satır.
     */
    const kotu = [/"[A-Za-z]:[\\/]/, /"\/Users\//, /"\/home\//];
    for (const desen of kotu) {
      expect(easJson, `eas.json mutlak yol içeriyor: ${desen}`).not.toMatch(desen);
    }
  });

  /**
   * `appVersionSource: local` + `autoIncrement` + CI = yinelenen sürüm numarası.
   *
   * Yerel kaynakta artan numara koşucunun kopyasına yazılıyor ve commit edilmiyor;
   * her koşu aynı numarayı üretir ve mağaza ikinciyi reddeder. Sayaç EAS'te durmalı.
   */
  it('sürüm kaynağı uzak', () => {
    expect(JSON.parse(easJson).cli.appVersionSource).toBe('remote');
  });

  it('CI gönderim profili var', () => {
    expect(Object.keys(JSON.parse(easJson).submit)).toContain('ci');
  });
});

describe('yayın iş akışı', () => {
  /**
   * TestFlight notu YANLIŞ DERLEMEYE yazılabiliyor.
   *
   * İlk gerçek koşuda `--son` kullanıldı: "en yeni derleme" ile "az önce yüklediğim
   * derleme" aynı şey değil. Apple yeni derlemeyi listeye almadan önce adım koştu,
   * `--son` bir öncekini seçti; yeni derleme notsuz kaldı ve eski derlemenin notunun
   * üstüne yazıldı. Hiçbir adım hata vermedi.
   */
  it('TestFlight notu için --son kullanmıyor', () => {
    expect(isAkisi, 'numara IPA’nın CFBundleVersion’ından okunmalı').not.toMatch(
      /testflight-notlar\.mjs\s+--son/,
    );
    expect(isAkisi).toMatch(/CFBundleVersion/);
  });

  /**
   * Derleme koşucuda yapılmalı. EAS bulut kotası dolduğunda hattın kendisi doğruyken
   * günlerce hiçbir şey çıkmıyordu.
   */
  it('derleme koşucuda yapılıyor', () => {
    for (const platform of ['android', 'ios']) {
      const desen = new RegExp(`eas build --platform ${platform}[^\\n]*--local`);
      expect(isAkisi, `${platform} yerel derlenmeli`).toMatch(desen);
    }
  });

  /**
   * Başarısız yayın ETİKETLENMEMELİ. Etiket "buraya kadarı mağazada" demek; düşen bir
   * platformdan sonra etiket atılırsa bir sonraki koşu o commit'i yayınlanmış sayar ve
   * eksik platform sessizce geride kalır.
   */
  it('başarısız yayın etiketlenmiyor', () => {
    const etiket = /etiket:\s*\n(?:.*\n)*?\s{4}runs-on:/.exec(isAkisi)?.[0] ?? '';
    expect(etiket).toMatch(/needs\.android\.result != 'failure'/);
    expect(etiket).toMatch(/needs\.ios\.result != 'failure'/);
  });

  /**
   * Bildirim `always()` ile koşmalı. Yalnız başarıda koşan bir bildirim, sessizliği
   * "her şey yolunda" diye okutur; oysa sessizlik hem başarı hem çöküş demek.
   */
  it('bildirim her durumda koşuyor', () => {
    const bildirim = isAkisi.slice(isAkisi.indexOf('  bildirim:'));
    expect(bildirim).toMatch(/if:\s*always\(\)/);
  });

  /**
   * Play izi kodda gömülü olmamalı. Play uygulamayı "taslak" saydığı sürece kapalı
   * teste yayına alma reddediliyor; iz bir değişken olduğu için kilit açılınca kod
   * değişmeden geçiliyor.
   */
  it('Play izi değişkenden geliyor', () => {
    expect(isAkisi).toMatch(/vars\.PLAY_IZ/);
  });

  /**
   * iOS OTOMATİK KOŞMAMALI.
   *
   * Ölçüldü: bir iOS derlemesi ~25-30 dakika macOS koşucusu ve özel depoda macOS
   * dakikası **10 kat** sayılıyor — derleme başına ~250-300 faturalanan dakika.
   * 2026-08-25'te iki derleme 528 dakika yedi, Free planın aylığının dörtte biri,
   * tek öğleden sonrada. Hesabı başka projeler de paylaşıyor.
   *
   * Android ubuntu'da ve çarpanı 1; o otomatik kalabilir. TestFlight'a her commit'te
   * yeni derleme çıkmasına zaten gerek yok.
   */
  /** Bir işin tanımını `runs-on` satırına kadar kesip verir. */
  const isTanimi = (ad: string) => {
    const bas = isAkisi.indexOf(`\n  ${ad}:\n`);
    if (bas < 0) return '';
    const son = isAkisi.indexOf('runs-on:', bas);
    return son < 0 ? '' : isAkisi.slice(bas, son);
  };

  it('iOS yalnızca elle tetiklendiğinde koşuyor', () => {
    const ios = isTanimi('ios');
    expect(ios, 'ios işi bulunamadı').not.toBe('');
    expect(ios, 'iOS otomatik koşuyor — macOS dakikası aylık bütçeyi yakar').toMatch(
      /github\.event_name == 'workflow_dispatch'/,
    );
  });

  /** Android otomatik KALMALI: ubuntu, çarpan 1, ve "push et sürüm çıksın" akışı buna dayanıyor. */
  it('Android otomatik koşmaya devam ediyor', () => {
    const android = isTanimi('android');
    expect(android, 'android işi bulunamadı').not.toBe('');
    expect(android).not.toMatch(/github\.event_name == 'workflow_dispatch'/);
  });

  /** Derleme öncesi SDK kapısı: eski Xcode'la 30 dakika macOS dakikası yakılmasın. */
  it('iOS SDK sürümü derlemeden önce kontrol ediliyor', () => {
    const sdkYeri = isAkisi.indexOf('show-sdk-version');
    const derlemeYeri = isAkisi.indexOf('eas build --platform ios');
    expect(sdkYeri, 'SDK kontrolü yok').toBeGreaterThan(-1);
    expect(sdkYeri, 'SDK kontrolü derlemeden ÖNCE olmalı').toBeLessThan(derlemeYeri);
  });
});

describe('sırlar depoya sızmıyor', () => {
  /**
   * CI, mağaza anahtarlarını `apps/mobile/` içine yazıyor. Biri yerelde çalışıp
   * kazara commit ederse imzalama anahtarı ve servis hesabı depoya girer.
   */
  it('koşucunun ürettiği anahtar dosyaları yok sayılıyor', () => {
    for (const yol of [
      'apps/mobile/play.json',
      'apps/mobile/asc.p8',
      'apps/mobile/credentials.json',
      'apps/mobile/kimlik/',
    ]) {
      expect(gitignore, `${yol} .gitignore'da olmalı`).toContain(yol);
    }
  });
});
