# App Review Information → Notes

**Bu dosya alanın tek kaynağı.** Konsola elle yazma; buradaki metni
`scripts/apple-notlar.mjs` yüklüyor ve yazdıktan sonra geri okuyup doğruluyor.

Alanın sert sınırı **4.000 karakter**. Betik sınırı aşarsa hiçbir şey yazmadan
duruyor — yarım yüklenmiş bir not, boş nottan kötüdür.

Metin İngilizce, çünkü inceleyen Apple çalışanı Türkçe okumuyor.

> ### ⚠ Bu metin YENİ değerlendirmeyi anlatıyor — yeni derlemeden önce yükleme
>
> Gövde artık "eight-card assessment" diyor. Mağazada duran ve incelemede olan build 12
> hâlâ eski akışı çalıştırıyor. `scripts/apple-notlar.mjs` bu metni **anında** canlı
> alana yazıyor, yani yeni derleme sürüme bağlanmadan çalıştırırsan Apple'a incelediği
> uygulamadan başka bir şey anlatmış olursun — Guideline 2.1'de bir tur daha demek.
>
> Sıra: yeni derleme yüklensin ve sürüme bağlansın → sonra `apple-notlar.mjs`.

## İlk iki başlık

Apple sekiz bilgi istedi. Aşağıdaki metin 3–8'i cevaplıyor. Kalan ikisi
**burada yok, çünkü uydurulamaz:**

1. **Ekran kaydı** — fiziksel cihazda çekilmiş olmalı, simülatör kabul edilmiyor.
2. **Denenen cihazlar** — hangi iPhone modeli, hangi iOS sürümü.

İkisi hazır olunca:

```bash
node scripts/apple-notlar.mjs \
  --kayit "https://.../swiip-inceleme.mp4" \
  --cihazlar "iPhone 15 Pro (iOS 26.0), iPhone 12 (iOS 26.0)"
```

Betik bu iki başlığı metnin **başına** ekliyor; Apple'ın ilk gördüğü şey
istediği iki cevap oluyor. İkisi verilmezse yalnızca aşağıdaki gövde yükleniyor.

Kaydın ne göstermesi gerektiği `video-cekim-talimati.md` içinde.

---

```notlar
WHAT THE APP DOES / WHO IT IS FOR
Swiip is a personal training and nutrition coaching app. The user answers an eight-card assessment (~32 inputs: measurements, health screening, pain map, goal, equipment, schedule, diet, kitchen) and may optionally submit one body photo. A deterministic engine produces a weekly training program and a daily meal plan. What distinguishes the app: every decision is inspectable. Each exercise and meal shows which of the user's own answers and rules produced it (e.g. hip thrust instead of a floor deadlift, because the user reported a disc herniation) - a stored decision trace from the solver, not language-model output. Audience: adults 18+, primarily Turkish-speaking.

SETUP / ACCESS
Two accounts. (1) The demo account above: Pro, assessment complete, every screen reachable right after sign-in. (2) inceleme-ucretsiz@swiip.app / kumsal-terazi-5820-fener: free tier, assessment complete - use this one for the purchase screen: we show paying users no upsell, so the Pro account has no purchase entry by design. The app opens on the assessment; the other tabs stay locked until it is finished, because a program cannot be computed without answers. To see the flow from zero, register a new account (~5 min).

EXTERNAL SERVICES
- Vercel AI Gateway, routing to Anthropic and Google models. AI is used at exactly four points: interpreting assessment answers, analysing the body photo, identifying which dish is in a food photo, and the coach chat. Every number (volume, progression, calories, macros, nutrients) comes from deterministic formulas and our own database, never from a model.
- RevenueCat: subscription entitlements and receipt validation.
- Resend (EU): transactional email, password reset codes only.
- Open Food Facts: barcode lookup.
- Exercise photos: free-exercise-db (public domain), bundled in the app.
No ad or analytics SDK and no tracking, hence no ATT prompt. The body photo is uploaded over TLS, analysed and deleted immediately; it never touches disk and only the numeric measurements are stored.

REGIONAL DIFFERENCES
None. Features and content are identical everywhere. The app ships in Turkish and English, Turkish by default; language follows the account setting, not the device. Meal slot names follow the user's own fasting answer, not their storefront.

REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Swiip provides general fitness and nutrition information. It does not diagnose or treat any condition and has no medical-device functionality. Four hard safety gates stop program generation and direct the user to a physician: age under 18, pregnancy, cardiac warning signs, and a positive eating-disorder screen. They cannot be skipped. Body-fat estimates are shown as a range, never a single number. No licensed third-party material is used.

IN-APP PURCHASES
Two auto-renewable tiers, monthly and annual, in the "Swiip Uyelik" group: Temel 99 TRY/month or 690 TRY/year, Pro 169 TRY/month or 1190 TRY/year. Free tier: the full assessment, one body analysis, day one of the program, manual calorie entry. Temel adds all training days, adaptation, calorie/macro targets, meal planning, barcode scanning, 60 coach messages/month. Pro adds photo food recognition (250/month) and 150 coach messages/month. To reach the purchase screen (use account 2): Settings > "Planlar", or "Planlara bak" on the locked-days card in the Program tab. Both open the same screen, showing each subscription's title, billing period and price; selecting one reveals the exact charge and renewal date in the largest type on screen. No plan is preselected. Terms of use and the privacy policy are linked at the bottom. Cancelling takes two taps from the top of Settings and opens the App Store subscription page; account deletion is there too.
```
