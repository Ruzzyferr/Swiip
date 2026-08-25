# Başka bir bilgisayarda çalışmak

Depoyu klonlayıp kod yazmak ve **main'e push edip iki mağazaya test sürümü çıkarmak**
için bu makinede hiçbir gizli anahtar gerekmiyor. Anahtarların hepsi GitHub sırlarında;
derleme, yükleme ve yayına alma koşucularda oluyor.

Yerelde çalıştırmak (test, tip denetimi, Expo Go) için de anahtar gerekmiyor. Anahtar
yalnızca **yerelden mağazaya paket göndermek** isterseniz gerekiyor ve o da normalde
gerekmiyor — hattın işi bu.

---

## Sıfırdan kurulum

```bash
git clone https://github.com/Ruzzyferr/Swiip.git
cd Swiip
npm ci
npm run verify        # biçim + lint + tip + çeviri + 1900 test
```

Node 22 gerekiyor (CI de 22 kullanıyor). Başka bir şey yok: veritabanı testleri
PGlite ile bellekte koşuyor, Docker ya da Postgres kurulumu istemiyor.

Mobil uygulamayı açmak için:

```bash
npm -w @swiip/mobile run start
```

---

## Sürüm çıkarmak: main'e push etmek yeterli

```
push → CI (biçim/lint/tip/test) → yeşilse Yayın
                                    ├─ Play test izi      ← otomatik
                                    ├─ sürüm etiketi
                                    └─ sonuç e-postası

TestFlight                                                ← ELLE
  gh workflow run yayin.yml -f platform=ios
```

**iOS neden otomatik değil:** macOS koşucusu dakikası özel depoda **10 kat**
sayılıyor. Ölçüldü: iki derleme 528 faturalanan dakika, yani Free planın aylık
2.000 dakikasının dörtte biri. Android ubuntu'da ve çarpanı 1; o otomatik.
TestFlight'a her commit'te derleme çıkmasına da gerek yok.

Bilinmesi gerekenler:

- **CI kırmızıysa yayın hiç başlamıyor.** Kırmızı testle mağazaya paket gitmiyor.
- **Kapı var:** son `yayin-*` etiketinden beri `apps/mobile`, `packages/core` veya
  `packages/shared` değişmediyse derleme atlanıyor. Yalnızca belge, betik ya da sunucu
  kodu (`packages/api`) değiştiyse derleme yapılmıyor — kullanıcının telefonunda
  değişen bir şey yok ve iOS derlemesi ~300 GitHub dakikası tutuyor.
- **Sürüm numarasını sen artırmıyorsun.** Sayaç EAS'te; `app.json` içinde
  `buildNumber`/`versionCode` yok ve olmamalı.
- **Sürüm notu commit konularından üretiliyor.** Testçiye başka bir cümle göstermek
  istersen commit gövdesine bir satır ekle:

  ```
  Barkod okuyucu iki kez okuyordu

  not: Barkod okutunca ürün iki kez ekleniyordu, düzeldi.
  ```

- Sonuç ne olursa olsun `info@swiip.app`'e e-posta düşüyor.

Elle tetiklemek (ör. tek platform, ya da ürün değişmemişken zorlamak):

```bash
gh workflow run yayin.yml -f platform=ikisi -f zorla=true
```

---

## Sunucu dağıtımı ayrı

`packages/api` değişikliği mağazaya gitmiyor; sunucuya `scripts/sunucu-dagit.sh` ile
dağıtılıyor ve bunun için SSH erişimi gerekiyor. Erişim bilgileri depoda değil:
`Masaüstü/Swiip-YEDEK/sunucu-erisimi.md`.

---

## Yerelden mağazaya göndermek (normalde gerekmez)

Hattın yaptığı işi elle yapmak isterseniz iki dosya gerekiyor ve ikisi de
gitignore'da:

| Dosya | Ne | Nereden |
|---|---|---|
| `apps/mobile/asc.p8` | App Store Connect API anahtarı | `~/.asc-keys/AuthKey_YX69K49LLD.p8` |
| `apps/mobile/play.json` | Play servis hesabı | `~/.play-keys/play-servis-hesabi.json` |
| `apps/mobile/credentials.json` + `apps/mobile/kimlik/` | imzalama malzemesi | GitHub sırları (`CREDENTIALS_JSON`, `ANDROID_KEYSTORE_B64`, `IOS_DIST_P12_B64`, `IOS_PROVISION_B64`) |

`eas.json` bu dosyaları **göreli** yolla arıyor. Bir zamanlar mutlak Windows yolu
yazıyordu; o hâliyle depo başka bir makinede klonlandığında da, Linux koşucusunda da
çalışmıyordu. `packages/api/src/yayinHatti.test.ts` mutlak yolun geri gelmesini
engelliyor.

---

## GitHub sırları ve değişkenleri

Kurulu ve hattın çalışması için gereken her şey:

| Sır | Ne için |
|---|---|
| `EXPO_TOKEN` | EAS kimlik çözümü ve sürüm sayacı |
| `CREDENTIALS_JSON` | imzalama yapılandırması (parolalar burada) |
| `ANDROID_KEYSTORE_B64` | Play yükleme anahtarı |
| `IOS_DIST_P12_B64` | iOS dağıtım sertifikası |
| `IOS_PROVISION_B64` | iOS provisioning profili |
| `ASC_API_KEY_P8` | App Store Connect anahtarı (base64) |
| `ASC_KEY_ID`, `ASC_ISSUER_ID` | aynı anahtarın kimlikleri |
| `PLAY_SERVIS_HESABI_JSON` | Play Developer API servis hesabı |
| `POSTA_API_KEY` | bildirim e-postası (Resend) |
| `BILDIRIM_ALICI` | bildirimin gideceği adres |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_SOHBET_ID` | isteğe bağlı; yoksa atlanıyor |

| Değişken | Şu an | Ne zaman değişir |
|---|---|---|
| `PLAY_IZ` | `internal` | Play uygulamayı taslaktan çıkarınca `alpha` yapılır |

**Yükleme anahtarını (`ANDROID_KEYSTORE_B64`) kaybetme.** Play o anahtarla imzalanmayan
paketi kabul etmiyor; kaybolursa uygulama bir daha güncellenemez. Yerel kopya
`apps/mobile/kimlik/yukleme.jks`, yedek `Masaüstü/Swiip-YEDEK`.
