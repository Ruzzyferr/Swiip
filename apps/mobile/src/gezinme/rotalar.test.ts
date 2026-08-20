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

/**
 * Paywall modal olarak açılmalı (F6.3).
 *
 * Spec bölüm 13: kapatma ilk saniyeden görünür. Modal sunum kapatmayı sistem düzeyinde
 * de mümkün kılar (aşağı kaydırma) ve ekranın "akışın içinde bir adım" değil
 * "araya giren bir teklif" olduğunu görsel olarak söyler.
 *
 * Seçenek kök düzende yazılıydı ama `odeme` rotası olmadığı için hiç uygulanmıyordu;
 * artık ekranın kendi tanımında.
 */
describe('paywall sunumu', () => {
  it("paywall kendi ekranında presentation: 'modal' tanımlıyor", () => {
    const kaynak = readFileSync(join(APP, 'odeme', 'paywall.tsx'), 'utf8');

    expect(kaynak).toMatch(/presentation:\s*'modal'/);
  });
});
