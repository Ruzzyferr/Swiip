import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en, tr } from '@swiip/shared';

/**
 * Abonelik koşulları DOĞRU mağazayı adlandırıyor mu?
 *
 * Metin "Yönetim ve iptal **App Store** hesabından da yapılabilir." diye sabit
 * yazılıydı ve Android kullanıcısına da aynen görünüyordu: aboneliğini hiç
 * kullanmadığı bir mağazadan yönetmesi söyleniyordu.
 *
 * Aynı uygulamada `ayarlar.tsx` iptal bağlantısını zaten `Platform.OS` ile seçiyor —
 * yani ayrım biliniyordu, paywall metnine uğramamıştı. Abonelik koşullarının mağazayı
 * doğru adlandırması iki mağazanın da kural gereği beklediği bir şey.
 */

const PAYWALL = readFileSync(
  join(import.meta.dirname, '..', '..', 'app', 'odeme', 'paywall.tsx'),
  'utf8',
);

describe('abonelik koşullarında mağaza adı', () => {
  it('sözlükte sabit değil, parametre', () => {
    expect(typeof tr.paywall.kosullarGovde, 'tr metni hâlâ sabit dize').toBe('function');
    expect(typeof en.paywall.kosullarGovde, 'en metni hâlâ sabit dize').toBe('function');
  });

  it('verilen mağaza adını metne koyuyor', () => {
    expect(tr.paywall.kosullarGovde('Google Play')).toContain('Google Play');
    expect(tr.paywall.kosullarGovde('Google Play')).not.toContain('App Store');
    expect(en.paywall.kosullarGovde('App Store')).toContain('App Store');
    expect(en.paywall.kosullarGovde('App Store')).not.toContain('Google Play');
  });

  it('paywall mağaza adını platformdan seçiyor', () => {
    expect(PAYWALL, "Platform ayrımı yoksa Android kullanıcısına yine 'App Store' denir.").toMatch(
      /Platform\.OS === 'ios' \? 'App Store' : 'Google Play'/,
    );
    expect(PAYWALL).toMatch(/kosullarGovde\(MAGAZA_ADI\)/);
  });

  it('sözlükte hiçbir mağaza adı sabit gömülü kalmadı', () => {
    const govde = tr.paywall.kosullarGovde('{MAGAZA}');
    expect(govde).not.toMatch(/App Store|Google Play/);
  });
});
