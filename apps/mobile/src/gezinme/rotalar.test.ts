import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Kök düzendeki rota adları gerçek rotalara karşılık geliyor mu? (F1.6)
 *
 * `<Stack.Screen name="X">` yazılı ama `X` diye bir rota yoksa expo-router o satırı
 * sessizce yok sayar: `headerShown`, `presentation`, başlık — hiçbiri uygulanmaz.
 * Hata alınmaz, yalnızca konsola uyarı düşer ve kimse bakmaz.
 *
 * Bu, projenin başka yerlerde de avladığı sınıfın aynısı: **yazılı ama çalışmayan kural.**
 * Koç aracında sonucu kötü bir cevaptı, havuz kuralında yaralanma olurdu; burada
 * kullanıcının gördüğü ekranın yanlış sunulması.
 *
 * Gerçekten kaçırılmıştı: paywall `presentation: 'modal'` ile tanımlıydı ama `odeme` diye
 * bir rota yok (klasörün `_layout.tsx`'i yok), dolayısıyla ödeme ekranı modal olarak
 * hiç açılmıyordu.
 */

const APP = join(import.meta.dirname, '..', '..', 'app');

/** expo-router'ın rota adı çözümü: dosya rotası ya da `_layout.tsx` taşıyan klasör. */
function rotaVarMi(ad: string): boolean {
  return existsSync(join(APP, `${ad}.tsx`)) || existsSync(join(APP, ad, '_layout.tsx'));
}

function kokDuzenAdlari(): string[] {
  const kaynak = readFileSync(join(APP, '_layout.tsx'), 'utf8');
  return [...kaynak.matchAll(/<Stack\.Screen\s+name="([^"]+)"/g)].map((e) => e[1]!);
}

describe('kök düzen rota adları', () => {
  it('en az bir Stack.Screen tanımı okunuyor', () => {
    expect(kokDuzenAdlari().length).toBeGreaterThan(0);
  });

  it.each(kokDuzenAdlari())('"%s" gerçek bir rotaya karşılık geliyor', (ad) => {
    expect(
      rotaVarMi(ad),
      `app/_layout.tsx içinde "${ad}" tanımlı ama app/${ad}.tsx da app/${ad}/_layout.tsx da yok. ` +
        'expo-router bu satırı yok sayar; içindeki seçenekler hiç uygulanmaz.',
    ).toBe(true);
  });
});
