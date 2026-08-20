import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import {
  apiHataMetni,
  dilCozumle,
  metinleriAl,
  tekUcus,
  varsayilanDil,
  type Dil,
} from '@made2fit/shared';

/**
 * Ağ katmanının bildiği dil.
 *
 * `api.ts` bir React bileşeni değil; kancayla dil okuyamaz. Oturum katmanı kullanıcının
 * `locale` alanını yükledikçe burayı güncelliyor. Oturum açılmamışsa varsayılan Türkçe —
 * hata metni her durumda bir dilde çıkıyor.
 */
let aktif: Dil = varsayilanDil;

export function agDiliniAyarla(locale?: string | null): void {
  aktif = dilCozumle(locale);
}

const aktifDil = (): Dil => aktif;

/**
 * API istemcisi.
 *
 * Tokenlar SecureStore'da (iOS Keychain / Android Keystore) tutulur, AsyncStorage'da değil:
 * sağlık verisine erişim veren bir tokenın düz metin saklanması kabul edilemez.
 *
 * 401 alındığında bir kez sessizce yenilenir; yine olmazsa oturum düşer.
 */

const VARSAYILAN_TABAN = 'http://localhost:3000';

const ERISIM_ANAHTARI = 'made2fit.erisim';
const YENILEME_ANAHTARI = 'made2fit.yenileme';

export class ApiHatasi extends Error {
  constructor(
    readonly durum: number,
    readonly kod: string,
    readonly mesaj: string,
  ) {
    super(mesaj);
    this.name = 'ApiHatasi';
  }
}

function tabanUrl(): string {
  const yapilandirma = Constants.expoConfig?.extra as { apiTabanUrl?: string } | undefined;
  return yapilandirma?.apiTabanUrl ?? process.env.EXPO_PUBLIC_API_URL ?? VARSAYILAN_TABAN;
}

export async function tokenlariKaydet(erisim: string, yenileme: string): Promise<void> {
  await SecureStore.setItemAsync(ERISIM_ANAHTARI, erisim);
  await SecureStore.setItemAsync(YENILEME_ANAHTARI, yenileme);
}

export async function tokenlariSil(): Promise<void> {
  await SecureStore.deleteItemAsync(ERISIM_ANAHTARI);
  await SecureStore.deleteItemAsync(YENILEME_ANAHTARI);
}

export async function erisimTokeni(): Promise<string | null> {
  return SecureStore.getItemAsync(ERISIM_ANAHTARI);
}

export async function oturumVar(): Promise<boolean> {
  return (await erisimTokeni()) !== null;
}

/**
 * Oturum kesin olarak düştüğünde haber verilecek yer.
 *
 * Yenileme tokeni de geçersizse kullanıcı artık oturumda değil. Bunu söylemeden her
 * ekranda genel hata göstermek, kullanıcıyı neden hiçbir şeyin çalışmadığını bilmeden
 * bırakır. Oturum katmanı buraya abone oluyor ve karşılama ekranına götürüyor.
 */
let oturumDustuDinleyici: (() => void) | null = null;

export function oturumDustugundeCalistir(geriCagri: (() => void) | null): void {
  oturumDustuDinleyici = geriCagri;
}

/**
 * Token yenileme — aynı anda yalnızca bir kez.
 *
 * Erişim tokeni dolduğunda ekrandaki birkaç istek aynı anda 401 alıyor. Yenileme tokeni
 * **dönen** bir token: ilk çağrı onu tüketip yenisini alıyor, sonrakiler artık geçersiz
 * olan eskisiyle gidiyor ve 401 alıyor.
 *
 * Asıl zarar oradan sonra geliyordu: başarısız çağrı `tokenlariSil()` çağırıp
 * **kazanan çağrının az önce yazdığı yeni tokenı da siliyordu.** Kullanıcı hiçbir şey
 * yapmadan oturumdan düşüyordu. Emülatörde ölçüldü:
 * `/v1/kimlik/yenile` sonuçları `200, 200, 200, 200, 200, 401, 200, 401, 200, 401`.
 *
 * Program sekmesi açılışta bir program ve her hareket için bir gerekçe isteği atıyor;
 * bu yarış istisna değil, kural.
 *
 * İki koruma var:
 *  1. `tekUcus` — eşzamanlı çağrılar tek yenilemeyi bekliyor.
 *  2. Silme koşulu — saklı token bu arada değiştiyse SİLMİYORUZ: başkası zaten
 *     yenilemiş demektir ve o oturum geçerli.
 */
const tokenYenile = tekUcus(async (): Promise<boolean> => {
  const yenileme = await SecureStore.getItemAsync(YENILEME_ANAHTARI);
  if (!yenileme) return false;

  const yanit = await fetch(`${tabanUrl()}/v1/kimlik/yenile`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ yenileme_token: yenileme }),
  });

  if (!yanit.ok) {
    // Denediğimiz token hâlâ saklıysa oturum gerçekten bitti; değiştiyse dokunma.
    const suanki = await SecureStore.getItemAsync(YENILEME_ANAHTARI);
    if (suanki === yenileme) {
      await tokenlariSil();
      oturumDustuDinleyici?.();
      return false;
    }
    return true;
  }

  const govde = (await yanit.json()) as { erisim_token: string; yenileme_token: string };
  await tokenlariKaydet(govde.erisim_token, govde.yenileme_token);
  return true;
});

export interface IstekSecenekleri {
  yontem?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  govde?: unknown;
  yetkisiz?: boolean;
}

export async function istek<T>(yol: string, secenekler: IstekSecenekleri = {}): Promise<T> {
  return istekYap<T>(yol, secenekler, true);
}

async function istekYap<T>(
  yol: string,
  secenekler: IstekSecenekleri,
  yenilemeyeIzinVer: boolean,
): Promise<T> {
  const basliklar: Record<string, string> = { 'content-type': 'application/json' };

  if (!secenekler.yetkisiz) {
    const token = await erisimTokeni();
    if (token) basliklar.authorization = `Bearer ${token}`;
  }

  let yanit: Response;
  try {
    yanit = await fetch(`${tabanUrl()}${yol}`, {
      method: secenekler.yontem ?? 'GET',
      headers: basliklar,
      ...(secenekler.govde !== undefined ? { body: JSON.stringify(secenekler.govde) } : {}),
    });
  } catch {
    throw new ApiHatasi(
      0,
      'baglanti_yok',
      'İnternet yok. Son programın cihazında kayıtlı, açabilirsin.',
    );
  }

  if (yanit.status === 401 && yenilemeyeIzinVer && !secenekler.yetkisiz) {
    if (await tokenYenile()) return istekYap<T>(yol, secenekler, false);
  }

  if (!yanit.ok) {
    const hata = (await yanit.json().catch(() => ({}))) as {
      kod?: string;
      mesaj?: string;
      degerler?: Record<string, string | number>;
    };

    /**
     * Metin koddan, kullanıcının dilinde kuruluyor.
     *
     * Sunucu mesajı Türkçe üretir ve kod döner; sunucunun kullanıcının dilini bilmesi
     * gerekmiyor. Kodu çözemezsek sunucunun mesajına düşüyoruz — hiçbir durumda boş
     * mesaj kalmıyor.
     */
    const metinler = metinleriAl(aktifDil());

    throw new ApiHatasi(
      yanit.status,
      hata.kod ?? 'bilinmeyen',
      apiHataMetni(hata, metinler.apiHatalari) ?? metinler.genel.hata,
    );
  }

  return (await yanit.json()) as T;
}
