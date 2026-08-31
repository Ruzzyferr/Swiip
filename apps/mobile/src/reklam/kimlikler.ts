import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * AdMob reklam birimi kimlikleri.
 *
 * Bu kimlikler SIR DEĞİL: derlenen pakette düz metin olarak duruyorlar ve AdMob'un
 * kendi belgeleri de kaynak koda yazılmalarını bekliyor. Sırlara koymak yanlış bir
 * güvenlik hissi verirdi.
 *
 * **Geliştirmede daima Google'ın test kimlikleri kullanılıyor.** Kendi birimlerine
 * geliştirme sırasında istek atmak AdMob'un "geçersiz trafik" kuralını ihlal ediyor
 * ve hesabın askıya alınmasıyla sonuçlanabiliyor — kazanılacak hiçbir şey yokken
 * alınacak en pahalı risk.
 */

/** Google'ın resmî test birimleri; her yerde aynı, her zaman dolu döner. */
const TEST = {
  banner: Platform.select({
    ios: 'ca-app-pub-3940256099942544/2934735716',
    default: 'ca-app-pub-3940256099942544/6300978111',
  }),
  gecis: Platform.select({
    ios: 'ca-app-pub-3940256099942544/4411468910',
    default: 'ca-app-pub-3940256099942544/1033173712',
  }),
};

/**
 * Üretim birimleri.
 *
 * iOS HENÜZ YOK: 2026-08-31'de AdMob konsolunda Swiip'in yalnızca Android girdisi
 * vardı (Cheep ve Conversa'nın ikisi de iki platformda kayıtlı, Swiip değil). iOS
 * girdisi açılıp kendi birimleri üretilene kadar burada `null` duruyor ve
 * `birimKimligi` test kimliğine düşüyor.
 *
 * `null` bilinçli bir işaret: "bakıldı, yok" demek. Buraya Android'in kimliğini
 * yazmak iki platformun gelirini tek birimde toplar ve raporu okunamaz hale getirir.
 */
const URETIM: { banner: Record<string, string | null>; gecis: Record<string, string | null> } = {
  banner: {
    android: 'ca-app-pub-2953141598487358/9667478087',
    ios: null,
  },
  gecis: {
    android: 'ca-app-pub-2953141598487358/4038842921',
    ios: null,
  },
};

/** Uygulama kimliği — `app.json` içindeki eklenti yapılandırmasıyla aynı olmalı. */
export const UYGULAMA_KIMLIGI = {
  android: 'ca-app-pub-2953141598487358~8715281071',
  ios: null,
} as const;

/**
 * Geliştirme derlemesi mi?
 *
 * `__DEV__` tek başına yetmiyor: dahili test derlemeleri de üretim modunda çalışıyor
 * ama mağazadan gelmiyor. `expo-constants` üzerinden yayın kanalına da bakılıyor.
 */
function gelistirmeMi(): boolean {
  if (__DEV__) return true;
  const kanal = Constants.expoConfig?.extra?.eas?.kanal;
  return kanal === 'gelistirme' || kanal === 'test';
}

export type ReklamTuru = 'banner' | 'gecis';

export function birimKimligi(tur: ReklamTuru): string {
  if (gelistirmeMi()) return TEST[tur]!;
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  return URETIM[tur][platform] ?? TEST[tur]!;
}

/** Üretim kimliği gerçekten tanımlı mı — ekranlar bunu sormuyor, testler soruyor. */
export function uretimKimligiVar(tur: ReklamTuru, platform: 'ios' | 'android'): boolean {
  return URETIM[tur][platform] !== null;
}
