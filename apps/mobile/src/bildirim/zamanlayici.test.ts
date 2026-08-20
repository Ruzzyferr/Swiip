import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Bildirim sunum sözleşmesi — kaynak taraması.
 *
 * Emülatörde ölçülen iki kusuru koruyor. İkisi de "kütüphane varsayılanına bırakılmış
 * karar" sınıfından: kod çalışıyordu, kimse yanlış bir şey yazmamıştı, ama davranış
 * seçilmemişti.
 *
 * 1. **Ön planda gelen bildirim kayboluyordu.** 18:00 alarmı uygulama açıkken tetiklendi
 *    (alarm sistem listesinden düştü) ama bildirim gölgeye hiç girmedi. Aynı hatırlatma
 *    uygulama arka plandayken sorunsuz göründü. `expo-notifications` sözleşmesi: ön
 *    planda gelen bildirim işleyiciye sorulur, işleyici yoksa varsayılan "gösterme".
 *
 * 2. **Bildirim `expo_notifications_fallback_notification_channel` ile düşüyordu.**
 *    Uygulama hiç kanal tanımlamamıştı; beş hatırlatma türü sistem ayarlarında tek bir
 *    genel başlık altında toplanıyor ve kullanıcı yalnızca su hatırlatmasını
 *    susturamıyordu.
 *
 * Neden çalıştırma değil kaynak taraması: `zamanlayici.ts` `expo-notifications` ve
 * `react-native` çekiyor; bu paketler Node altında ayrıştırılamıyor (aynı sebeple
 * `tema.ts` de test edilemiyor). Taranan şey davranışın kendisi değil, davranışı
 * belirleyen karar — ve kaybolan tam olarak o kararın yokluğuydu.
 */

const KAYNAK = readFileSync(join(__dirname, 'zamanlayici.ts'), 'utf8');
const KOK_DUZEN = readFileSync(join(__dirname, '..', '..', 'app', '_layout.tsx'), 'utf8');

describe('bildirim sunumu', () => {
  it('sunum işleyicisi tanımlı — ön planda gelen bildirim yutulmuyor', () => {
    expect(KAYNAK).toMatch(/setNotificationHandler\s*\(/);
    expect(KAYNAK, 'banner gösterilmiyor').toMatch(/shouldShowBanner:\s*true/);
    expect(KAYNAK, 'listede görünmüyor').toMatch(/shouldShowList:\s*true/);
  });

  it('hatırlatma ses çıkarmıyor ve rozet basmıyor — dürtmüyoruz', () => {
    expect(KAYNAK).toMatch(/shouldPlaySound:\s*false/);
    expect(KAYNAK).toMatch(/shouldSetBadge:\s*false/);
  });

  it('işleyici açılışta kuruluyor, yalnızca ayar ekranında değil', () => {
    // Modül yalnızca ayar ekranından yüklenirse, o ekrana hiç girmeyen kullanıcıda
    // işleyici hiç kurulmaz ve kusur aynen geri döner.
    expect(KOK_DUZEN, 'kök düzen zamanlayıcıyı yüklemiyor').toMatch(
      /import\s+'\.\.\/src\/bildirim\/zamanlayici'/,
    );
  });
});

describe('bildirim kanalları', () => {
  it('her hatırlatma türünün kendi kanalı var', () => {
    // Çekirdekteki tür listesiyle birebir: yeni bir tür eklenip kanalı unutulursa
    // o hatırlatma yedek kanala düşer ve kullanıcı onu ayrı ayarlayamaz.
    for (const tur of ['seans', 'geri_bildirim', 'haftalik_ozet', 'olcum', 'su']) {
      expect(KAYNAK, `${tur} için kanal adı yok`).toContain(`${tur}:`);
    }
    expect(KAYNAK).toMatch(/setNotificationChannelAsync\s*\(/);
  });

  it('planlanan bildirim kanal kimliği taşıyor', () => {
    expect(KAYNAK, 'channelId verilmiyor — yedek kanala düşer').toMatch(/channelId:/);
  });

  it('kanallar sessiz ve titreşimsiz', () => {
    expect(KAYNAK).toMatch(/enableVibrate:\s*false/);
    expect(KAYNAK).toMatch(/showBadge:\s*false/);
  });
});
