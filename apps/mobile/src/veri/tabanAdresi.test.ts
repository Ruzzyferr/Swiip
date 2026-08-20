import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Yayın paketine yerel adres sızamaz — kaynak taraması.
 *
 * Play'e yükleme hazırlanırken derlenmiş release paketinde API adresi olarak
 * `http://127.0.0.1:3311` gömülü olduğu görüldü. Yayınlansaydı hiçbir kullanıcı kayıt
 * bile olamaz, uygulama herkeste "İnternet yok" derdi. Derleme hiçbir uyarı üretmiyor:
 * `EXPO_PUBLIC_API_URL` ne yazıyorsa o gömülüyor.
 *
 * İki katman var ve ikisi de gerekli:
 *  - Bu test KAYNAKTAKİ yedeği koruyor: env değişkeni tanımsızsa ne gönderiliyor.
 *  - `scripts/yayin-denetimi.mjs` DERLENMİŞ paketi tarıyor: env değişkeni yanlış
 *    doldurulmuşsa onu yakalar. Kaynak doğru olsa da yanlış `.env` ile derlenebilir.
 *
 * `api.ts` doğrudan içe aktarılamıyor (expo-secure-store ve react-native çekiyor,
 * Node altında ayrıştırılamıyor); taranan şey davranışı belirleyen sabitler.
 */

const KAYNAK = readFileSync(join(__dirname, 'api.ts'), 'utf8');

const YEREL = /localhost|127\.0\.0\.1|10\.0\.2\.2|0\.0\.0\.0|192\.168\./;

describe('yayın paketinin taban adresi', () => {
  it('üretim yedeği https ve gerçek alan adı', () => {
    const m = KAYNAK.match(/const URETIM_TABAN = '([^']+)'/);
    expect(m, 'URETIM_TABAN tanımlı değil').toBeTruthy();
    const adres = m![1]!;
    expect(adres, `üretim adresi yerel: ${adres}`).not.toMatch(YEREL);
    expect(adres, 'üretim adresi https değil').toMatch(/^https:\/\//);
  });

  it('yayın dalında yerel adrese düşülmüyor', () => {
    // `__DEV__ ? GELISTIRME : URETIM` — yayın tarafı üretim olmak zorunda.
    expect(KAYNAK).toMatch(/__DEV__\s*\?\s*GELISTIRME_TABAN\s*:\s*URETIM_TABAN/);
  });

  it('boş dize tanımsız sayılıyor', () => {
    /**
     * `??` boş dizeyi GEÇİRİR: `.env` içinde `EXPO_PUBLIC_API_URL=` yazan bir derleme
     * taban adresi olarak `''` alır ve her istek göreli yola gider. Bu, `.env.example`
     * dosyasının kendisinde o satırın boş bırakılmış olması yüzünden gerçekçi bir hata.
     */
    expect(KAYNAK, 'boş dizeyi geçiren `??` kullanılmış').toMatch(
      /apiTabanUrl \|\| process\.env\.EXPO_PUBLIC_API_URL/,
    );
  });
});
