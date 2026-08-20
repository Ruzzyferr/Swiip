import type { Metinler } from './i18n';
import { gunMetni } from './tarih';

/**
 * English dictionary.
 *
 * Same rules as the Turkish source, restated because they are easy to lose in translation:
 *  - No diagnostic language. "tends to", "looks like", "may".
 *  - Estimates are ranges: "16-21%", never "18.4%".
 *  - No blame, no celebration, no gamification.
 *  - The word "personalized" is banned — every competitor uses it and it means nothing.
 *
 * Typed as `Metinler`, so a missing key is a compile error rather than a half-translated
 * screen the user has to decipher.
 */

export const en: Metinler = {
  bildirim: {
    seans: {
      baslik: 'Training day',
      govde: 'Your session is ready. Short version is there if time is tight.',
    },
    geriBildirim: {
      baslik: 'How did the session go?',
      govde: 'Three taps: effort, pain, duration. The next session is calculated from them.',
    },
    haftalikOzet: {
      baslik: 'Your weekly summary is ready',
      govde: 'Volume, pain reports and next week changes — with the reasons.',
    },
    olcum: {
      baslik: 'Measurement time',
      govde: 'Waist and neck take a minute. This is how we track the change.',
    },
    su: {
      baslik: 'Water',
      govde: 'A glass would help.',
    },
  },
  gerekce: {
    /** Ondalık ayırıcı: Türkçede virgül, İngilizcede nokta. 52,5 kg ile 52.5 kg. */
    ondalikAyirac: '.',
    /** Sözlüğün dili; katalog adı (hareket adı) buna göre seçilir. */
    dil: 'en',
    hacim: {
      uyku_kisa: 'You sleep under 6 hours a night, so I cut weekly sets by 12%.',
      stres_yuksek: 'Your stress is high; I cut volume by 10% to leave room for recovery.',
      yas_50_ustu: 'Recovery takes longer with age, so I kept weekly volume 10% more measured.',
      kalori_acigi_yuksek: 'Your calorie deficit is large, so I cut training volume by 10%.',
      oncelikli_bolge: 'I gave the areas you prioritised 25% more weekly sets.',
      memnun_bolge_koruma:
        'I kept the areas you are happy with at maintenance volume — that saves you time.',
      aktif_sakatlik: 'I cut weekly load on the area where you reported pain by 40%.',
    },
    ilerleme: {
      tekrar_tavani: (ad: string, tekrar: number) =>
        `${ad} now feels easy at ${tekrar} reps. Beyond this it becomes endurance work, ` +
        'so we are moving to a harder variation.',
      tekrar_artti: (ad: string, tekrar: number) => `${ad} target goes up to ${tekrar} reps.`,
      yuk_artti: (ad: string, artis: string, kg: string) =>
        `${ad} goes up by ${artis} kg → ${kg} kg.`,
      cift_ilerleme_sabit: (ad: string, kg: string) =>
        `${ad} stays put, one more week at ${kg} kg.`,
      hacim_dusuruldu: (ad: string) =>
        `You struggled with ${ad} two weeks running, so I dropped one set.`,
      yuk_dusuruldu: (ad: string, kg: string) => `${ad} comes down to ${kg} kg, let us rebuild it.`,
      tekrar_dusuruldu: (ad: string, tekrar: number) =>
        `${ad} target comes down to ${tekrar} reps.`,
      agri_bildirimi:
        'You reported pain on this exercise. I reduced the load and am suggesting a substitute ' +
        'that works the same muscle. If the pain lasts more than two weeks, please see a doctor ' +
        'or a physiotherapist.',
      deload:
        'This week is deliberately light: I lowered both load and sets. Recovery is where the ' +
        'gain actually happens; piling on without it stalls progress.',
    },
    havuz: {
      ekipman_yok: 'I removed exercises that need equipment you do not have.',
      kontrendikasyon: 'I removed exercises that conflict with the injury you reported.',
      agriyi_artiran_patern: 'I removed the movement pattern you said increases your pain.',
      eksenel_yuk_yasak: 'I removed exercises that load your spine vertically.',
      tavan_alcak: 'I removed overhead exercises because your ceiling is too low.',
      gurultu_kisiti: 'I removed exercises that involve dropping weights, due to your noise limit.',
      zipla_yasak: 'I removed plyometric exercises, due to your jumping limit.',
      spotter_yok: 'I removed exercises that are risky alone, since you have no spotter.',
      teknik_guven_dusuk:
        'I removed complex free-weight exercises until your technique settles in.',
      kullanici_reddetti: 'I removed the exercises you said you do not want to do.',
      varsayilan: (adet: number) => `${adet} exercises were removed from the pool.`,
    },
    hareket: {
      cumle: (ad: string, sebepler: string) => `${ad} was chosen: ${sebepler}.`,
      ayirac: ', ',
      oncelikli_bolge: (grup: string) => `you picked ${grup} as a priority area`,
      bilesik_cekirdek: (patern: string) =>
        `the ${patern} pattern is the core of your weekly volume`,
      izolasyon_tamamlayici: (grup: string) =>
        `added as isolation work to complete your ${grup} volume`,
      sfr_yuksek: 'its stimulus-to-fatigue ratio is high',
      kontrendikasyon_uyumlu: 'it does not conflict with the limits you reported',
      kalabalik_salon_uyumlu: 'you can do it without waiting for a machine',
    },
    gruplar: {
      gogus: 'Chest',
      sirt: 'Back',
      omuz: 'Shoulders',
      biceps: 'Biceps',
      triceps: 'Triceps',
      quadriceps: 'Quads',
      hamstring: 'Hamstrings',
      kalca: 'Glutes',
      karin: 'Core',
      baldir: 'Calves',
    },
    paternler: {
      itme_yatay: 'Horizontal push',
      itme_dikey: 'Vertical push',
      cekme_yatay: 'Horizontal pull',
      cekme_dikey: 'Vertical pull',
      diz_baskin: 'Knee dominant',
      kalca_baskin: 'Hip dominant',
      tasima: 'Carry',
      rotasyon: 'Rotation',
      izolasyon: 'Isolation',
    },
  },
  blokGeriBildirimi: {
    kimlikEksik: () => 'Your basics are saved. In the next section we will talk about your goal.',
    kimlikEd: () =>
      'Your basics are saved. We turned the numbers off for you; we will describe nutrition ' +
      'in portions.',
    bakimKalorisi: (d: Record<string, string | number>) =>
      `Your maintenance is around ${d.tdee} kcal. That is the energy you take in daily to hold your weight.`,
    hedefEd: () =>
      'I noted your goal. We will track progress by how you feel and by your measurements, not by weight.',
    hedefKaydedildi: () => 'Your goal is saved. We will build the program around it.',
    hedefBeklenti: (d: Record<string, string | number>) =>
      `I noted your expectation of ${d.beklenti} kg a month; I will show you in the report whether it is realistic.`,
    hedefSure: (d: Record<string, string | number>) =>
      `This goal is roughly a ${d.hafta} week road. I will show you in the report whether it is realistic.`,
    hedefKisa: () => 'Your goal is saved.',
    antrenmanYasi: (d: Record<string, string | number>) =>
      `${d.seviyeAdi} level. You can handle ${d.alt}-${d.ust} sets per muscle group per week.`,
    saglikTemiz: () =>
      'Nothing in your health screening restricts program generation. Even so, the moment you ' +
      'report pain we change the program.',
    saglikEleme: (d: Record<string, string | number>) =>
      `Based on what you reported, ${d.adet} exercises were removed from the pool. I will put ` +
      'safe substitutes that work the same muscle in their place.',
    ekipman: (d: Record<string, string | number>) =>
      `With your equipment, ${d.yapilabilir} exercises are possible (the library has ${d.toplam}).`,
    split: (d: Record<string, string | number>) => `${d.split} · ${d.gun} days suits you.`,
    toparlanmaTemiz: () =>
      'Nothing is blocking recovery; I am keeping volume in the standard range.',
    toparlanmaDuzeltme: (d: Record<string, string | number>) => {
      const sebepler = [
        d.uykuKisa ? 'your sleep is short' : '',
        d.stres ? 'your stress is high' : '',
      ]
        .filter(Boolean)
        .join(' and ');
      const bas = sebepler.charAt(0).toUpperCase() + sebepler.slice(1);
      return `${bas}; I cut weekly volume by about ${d.oran}%.`;
    },
    beslenmeEd: () =>
      'I will describe nutrition without numbers: a palm of protein, a fist of carbohydrate and ' +
      'two handfuls of vegetables at each meal.',
    beslenmeProtein: (d: Record<string, string | number>) =>
      `Your protein target is ${d.protein} g. It is the single most important number for preventing muscle loss.`,
    kardiyoSevmiyor: () =>
      'You do not like cardio; I cut it to the minimum and put a daily step target in its place.',
    kardiyoSeviyor: () =>
      'You like cardio; I placed it so that it does not interfere with recovery.',
    kardiyoOlculu: () =>
      'I kept cardio measured: enough for health, not enough to interfere with training.',
    fotografEd: () =>
      'Your measurements are saved. I will describe the body analysis by area, without numbers.',
    fotograf: () =>
      'Your body analysis is being prepared. I will give body fat as a range, not a single number.',
    seviyeAdlari: {
      yeni: 'Beginner',
      erken: 'Early',
      orta: 'Intermediate',
      ileri: 'Advanced',
      kidemli: 'Seasoned',
    },
  },
  apiHatalari: {
    magaza_disi_yukseltme: () =>
      'Plans are changed only through the store. Purchases happen inside the app.',
    onay_gerekli: (d: Record<string, string | number>) =>
      `To delete your account, type "${d.onay}" in the confirmation field. This cannot be undone.`,
    riza_gerekli: () =>
      'Your health data is special-category personal data; we need your explicit consent to process it.',
    eposta_kullanimda: () => 'An account with this email already exists. You can try signing in.',
    tanima_basarisiz: () =>
      'I cannot recognise a meal in this photo. You can shoot closer and better lit, or search ' +
      'manually. This attempt did not use your quota.',
    ilgi_gecersiz: () => 'A valid email address and explicit consent are required.',
    analiz_hakki_bitti: () =>
      'You have used your body analysis. The free plan includes one; paid plans open one every month.',
    profil_yok: () => 'Finish the assessment first.',
    barkod_yok: () => 'This barcode is not in our database. You can add it manually.',
    besin_yok: () => 'Food not found.',
    hareket_yok: () => 'No such exercise.',
    tarif_yok: () => 'Recipe not found.',
    haftalik_plan_yok: () => 'No plan for this week.',
    program_yok: () => 'You do not have a program yet.',
    gerekce_yok: () => 'There is no saved rationale for this exercise.',
    seans_yok: () => 'Session not found.',
    seansta_hareket_yok: () => 'No such exercise in this session.',
    kullanici_yok: () => 'User not found.',
    kod_gecersiz: () => 'The code is invalid or has expired.',
    oturum_bitti: () => 'Your session has ended. Please sign in again.',
    yetkisiz: () => 'Your session has ended. Please sign in again.',
    bulunamadi: () => 'The record you are looking for does not exist.',
    boy_yok: () => 'The analysis needs your height; finish the assessment.',
    bilinmeyen_blok: () => 'No such section.',
    foto_riza_yok: () =>
      'Photo analysis needs separate explicit consent. If you prefer, you can continue with ' +
      'measurements only.',
    uygun_olmayan_muadil: () =>
      'This exercise is not possible with your equipment and limits; pick one of the listed substitutes.',
    koc_plan_yetersiz: () =>
      'Coach chat is available from the Basic plan. Your program and its rationales are full on every plan.',
    tanima_plan_yetersiz: () =>
      'Photo food recognition is on the Pro plan. Manual entry and search are unlimited on every plan.',
    ogun_plan_yetersiz: () =>
      'Meal planning and swipe-to-swap are available from the Basic plan. Manual calorie entry and ' +
      'search are unlimited on every plan.',
    geri_bildirim_plan_yetersiz: () =>
      'Post-session feedback, and the program updating from it, are available from the Basic plan.',
    koc_kotasi_doldu: (d: Record<string, string | number>) =>
      `You have used this month's coach messages (${d.hak}). It resets on ${gunMetni(d.yenilenme, 'en')}.`,
    tanima_kotasi_doldu: (d: Record<string, string | number>) =>
      `You have used this month's photo recognitions (${d.hak}). It resets on ` +
      `${gunMetni(d.yenilenme, 'en')}. Manual entry and barcode stay unlimited in the meantime.`,
  },
  genel: {
    devam: 'Continue',
    geri: 'Back',
    kaydet: 'Save',
    iptal: 'Cancel',
    kapat: 'Close',
    tamam: 'Done',
    yeniden: 'Try again',
    atla: 'Skip',
    yukleniyor: 'Loading',
    hata: 'Something went wrong. You can try again.',
    baglantiYok: 'No connection. Your latest program is saved on this device — you can open it.',
    yuzdeTamamlandi: (yuzde: number) => `${yuzde} percent complete`,
    zorunluAlan: 'This question is required.',
    ekle: 'Add',
    planlaraBak: 'See plans',
    dakikaKisa: (dakika: number) => `${dakika} MIN`,
    saatBasligi: 'TIME',
    toplamBasligi: 'TOTAL',
    malzemelerBasligi: 'INGREDIENTS',
    malzemeler: 'Ingredients',
    butceKademesi: (kademe: number) => ['', 'BUDGET', 'AFFORDABLE', 'MID', 'HIGH'][kademe] ?? 'MID',
  },

  giris: {
    aciliyor: 'Opening',
    slogan: 'Made to fit.',
    altSlogan: 'And made to explain.',
    maddeler: [
      'We ask 134 questions. Every one of them changes something.',
      'Next to every exercise in your program, it says why it is there.',
      'Your photo is deleted the moment it is analysed. It never reaches our disk.',
      'No badges, no streaks, no confetti.',
    ],
    basla: 'Start',
    hesabimVar: 'I already have an account',

    nasilCalisir: {
      baslik: 'How it works',
      ustBaslik: 'We ask first, then we write',
      girisMetni:
        'Most apps ask 8 questions and generate a program. We ask 134, because writing a deadlift without knowing about a herniated disc is easier than asking — and a great deal riskier.',
      adimlar: [
        {
          baslik: 'Assessment',
          sure: '11-14 minutes',
          govde:
            'Ten sections. At the end of each one we show you what we learned and how it changed your program. If you stop halfway, you continue where you left off.',
        },
        {
          baslik: 'Body analysis',
          sure: '2 minutes',
          govde:
            'Three photos, or just tape measurements. Your photo is erased from memory the moment it is analysed; it is never written to our disk.',
        },
        {
          baslik: 'Your program',
          sure: 'instant',
          govde:
            'Next to every exercise it says why it is there. Swap out anything you do not like — free and unlimited.',
        },
        {
          baslik: 'Three taps after the session',
          sure: '15 seconds',
          govde:
            'We do not want you logging sets on your phone at the gym. Three taps afterwards is enough; we compute the next session from them.',
        },
      ],
      uyariBaslik: 'Two things we want you to know',
      uyariGovde:
        'Made2Fit is not a medical device and does not diagnose. Your answers to the health questions are what let us write a safe program — and they are used for nothing else.',
      devamEt: 'Continue',
    },

    kayit: {
      sayfaBasligi: 'Create account',
      baslik: 'Let us set up your account',
      eposta: 'Email',
      epostaEtiketi: 'Email address',
      parola: 'Password',
      parolaIpucu: 'At least 10 characters. Length beats complexity.',
      rizaBasligi: 'Health data consent',
      rizaGovde:
        'Your injury, illness and medication answers are special-category personal data. We process them only to write you a safe program. They are not included in what goes to the AI provider; only a summary of the decision trace does. You can withdraw consent at any time and delete your account in one step.',
      saglikRizasi: 'I explicitly consent to my health data being processed',
      olcumRizasi: 'I explicitly consent to my body measurements being processed',
      olcumRizasiAciklama:
        'Optional. Without it, the body fat estimate comes out as a wider range.',
      gonder: 'Create account and start the assessment',
      yasNotu: 'Made2Fit is for ages 18 and over.',
    },

    girisYap: {
      sayfaBasligi: 'Sign in',
      baslik: 'Welcome back',
      gonder: 'Sign in',
      hata: 'Could not sign you in. You can try again.',
      parolamiUnuttum: 'I forgot my password',
      hesabimYok: 'I do not have an account yet',
    },

    parolaSifirlama: {
      sayfaBasligi: 'Forgot password',
      baslik: 'Let us reset your password',
      aciklama: 'Enter your registered email address. We will send a six-digit code.',
      kodGonder: 'Send code',
      istekHatasi: 'Could not send the request. You can try again.',
      kodBasligi: 'Enter the code',
      kodEtiketi: 'Six-digit code',
      kodErisim: 'Verification code',
      yeniParola: 'New password',
      yeniParolaIpucu: 'At least 12 characters. Length beats complexity — three words will do.',
      degistir: 'Change password',
      degistirHatasi: 'Could not change the password. You can try again.',
      tekrarGonder: 'Code did not arrive, send another',
    },
  },

  kapilar: {
    yas: {
      baslik: 'Made2Fit is for ages 18 and over',
      govde:
        'Writing a program for a body that is still growing is a different specialty, and we cannot do it safely. When you turn 18, we will be here.',
    },
    gebelik: {
      baslik: 'We do not build programs during this period',
      govde:
        'Exercise during pregnancy and breastfeeding needs specialist supervision. We suggest talking to your doctor or a physiotherapist who works in this area. Your answers are saved; you can pick up where you left off.',
    },
    kardiyak: {
      baslik: 'Doctor approval first',
      govde:
        'Your answers include a sign related to the heart or circulation. This does not mean you cannot train — it means the right program should be set with your doctor. Program generation opens once you upload their approval.',
      eylem: 'Upload doctor approval',
    },
    yemeBozuklugu: {
      baslik: 'We turned the numbers off',
      govde:
        'Calories, weight charts and macro percentages are off by default for you. We describe nutrition in portions and meal structure instead. You can turn them on in settings; we will not turn them on by ourselves.',
    },
  },

  degerlendirme: {
    baslik: 'Assessment',
    kaldiginYer: 'Finding where you left off',
    tamamBaslik: 'Assessment complete',
    tamamGovde: 'You answered every question. Now on to the body analysis.',
    devamEtDugmesi: 'Continue',
    cevrimdisiNotu:
      'No connection — your answers are held on this device and will be sent once you are back online.',
    soruyuAtla: 'Skip this question',
    listeAra: 'Type to search',
    listeSonucYok: 'No match. Try a different spelling.',
    istersenAtla: 'You can skip this one',
    gecersizCevap: 'That answer is not valid.',
    okudumRizaVeriyorum: 'I have read this and give my explicit consent',
    gun: 'Day',
    ay: 'Month',
    yil: 'Year',
    gunKisa: 'DD',
    ayKisa: 'MM',
    yilKisa: 'YYYY',
    saat: 'Time',
    agirlikKg: 'Weight (kg)',
    agirlikBasligi: 'WEIGHT (KG)',
    tekrarBasligi: 'REPS',
    enFazlaSecim: (adet: number) => `Choose up to ${adet}`,
    agirlikErisim: 'Weight in kilograms',
    tekrar: 'Reps',
    tekrarErisim: 'Number of reps',
    alanEtiketleri: {
      bel_cm: 'Waist',
      kalca_cm: 'Hips',
      gogus_cm: 'Chest',
      kol_cm: 'Arm',
      uyluk_cm: 'Thigh',
      boyun_cm: 'Neck',
      en_yuksek_kg: 'Highest weight',
      en_dusuk_kg: 'Lowest weight',
      sinav_adet: 'Push-ups (reps)',
      barfiks_adet: 'Pull-ups (reps)',
      plank_saniye: 'Plank (seconds)',
      min_kg: 'Lightest',
      max_kg: 'Heaviest',
    },
    ekipman: {
      onDoldurmaOnerisi: (salon: string) =>
        `We can tick the equipment ${salon} gyms usually have. You can remove anything afterwards.`,
      salonumaGoreDoldur: 'Fill in from my gym',
      secili: (adet: number) => `${adet} selected`,
      temizle: 'Clear',
    },
    listedenSec: 'YOU CAN ALSO PICK FROM THE LIST',
    baslangic: 'Start',
    bitis: 'End',
    siluetNotu: 'These are a direction, not a target. Pick the way you want to go.',
    onden: 'Front',
    arkadan: 'Back',
    bolgeAdlari: {
      boyun: 'Neck',
      omuz_sag: 'Right shoulder',
      omuz_sol: 'Left shoulder',
      dirsek_sag: 'Right elbow',
      dirsek_sol: 'Left elbow',
      bilek_sag: 'Right wrist',
      bilek_sol: 'Left wrist',
      ust_sirt: 'Upper back',
      bel: 'Lower back',
      kalca_sag: 'Right hip',
      kalca_sol: 'Left hip',
      diz_sag: 'Right knee',
      diz_sol: 'Left knee',
      ayak_bilegi_sag: 'Right ankle',
      ayak_bilegi_sol: 'Left ankle',
      gogus: 'Chest',
      omuz: 'Shoulders',
      sirt: 'Back',
      kol: 'Arms',
      karin: 'Abs',
      kalca: 'Glutes',
      bacak_on: 'Front of legs',
      bacak_arka: 'Back of legs',
      baldir: 'Calves',
    },
    siluetAdlari: {
      ince: 'Lean',
      ince_tonlu: 'Lean and toned',
      atletik: 'Athletic',
      kaslı: 'Muscular',
      kaslı_atletik: 'Muscular athletic',
      guclu_hacimli: 'Strong and full',
      ortalama: 'Average',
      daha_dolgun: 'Fuller',
    },
    blokSonu: {
      bolum: 'SECTION',
      varsayilanBaslik: 'This section is done',
      basliklar: {
        K: 'We have your basics',
        H: 'Your goal is noted',
        A: 'Your training history is mapped',
        S: 'Health screening complete',
        E: 'Your equipment is recorded',
        Z: 'Your program structure is set',
        Y: 'Your recovery capacity is calculated',
        B: 'Your nutrition framework is ready',
        T: 'Your preferences are applied',
        F: 'Your measurements are in',
      },
      dipnot: 'This was computed from your answers. It gets sharper with each remaining section.',
    },
    ilerleme: (mevcut: number, toplam: number) => `${mevcut} / ${toplam}`,
    blokTamamlandi: 'This section is done',
    devamEt: 'Continue where you left off',
    tahminiSure: (dakika: number) => `About ${dakika} minutes`,
    kaydedildi: 'Your answers are saved. You can continue whenever you like.',
    gerceklikTesti: (beklenen: number, gercekci: string) =>
      `You are aiming for ${beklenen} kg a month. The healthy, sustainable range is ${gercekci}. Faster than that usually means muscle loss and regain. We suggest bringing your target into that range.`,
  },

  rapor: {
    /**
     * Motorun ürettiği rapor metinleri.
     *
     * Motor kod üretiyor (duruş bayrağı, sınırlama kodu, özet parametreleri); cümle
     * burada kuruluyor. Rapor ücretsiz planın teslim ettiği tek çıktı, yani ürünün ilk
     * izlenimi — tek dile bağlı kalamaz.
     */
    motor: {
      gizlilikNotu: {
        fotografli:
          'Your photo was analysed and dropped from memory as this request finished. It was ' +
          'never written to our disk; only the numbers above are stored.',
        olculerle:
          'You did not send a photo; this report comes from your measurements alone. The only ' +
          'thing stored is the numbers above.',
      },
      ozet: {
        veriYok:
          'Not enough data to estimate body fat. Enter your waist and neck measurements, or ' +
          'upload a photo, and we can give you a range.',
        yontem: {
          capraz: 'We assessed your photo and measurements together',
          gorsel: 'We assessed this from your photo',
          olcu: 'We assessed this from your measurements',
        },
        cumle: (yontem: string, alt: number, ust: number, kilo: number, boy: number) =>
          `${yontem}: your body fat looks to be around ${alt}-${ust}%. This is a range, not ` +
          `an exact measurement — together with ${kilo} kg and ${boy} cm, we will track ` +
          'progress by watching how this range moves.',
      },
      durus: {
        omuz_protraksiyonu:
          'Your shoulders tend to sit forward. I increased upper-back and rear-delt work, and ' +
          'added a chest mobility drill to the warm-up.',
        bas_one:
          'Your head appears to sit slightly ahead of your torso. This is common with long ' +
          'screen time; neck and upper-back work helps.',
        pelvik_egim:
          'Your pelvis tends to tilt forward. We aim to reduce this by balancing core and ' +
          'glute work.',
        ust_sirt_yuvarlanma:
          'Your upper back tends to round. I kept pulling movements slightly higher than ' +
          'pushing movements in your program.',
        omuz_asimetrisi:
          'There is a slight height difference between your shoulders. We work each side ' +
          'separately by adding unilateral movements.',
        diz_ice_donme:
          'Your knees tend to travel inward when you squat. I added movements that strengthen ' +
          'the lateral hip muscles.',
      },
      sinirlama: {
        fotograf_yok:
          'You did not upload a photo. We continued with your measurements; the body fat range ' +
          'comes out a little wider and the muscle distribution map cannot be produced. You can ' +
          'update with a photo whenever you like.',
        olcu_yok:
          'You did not enter your waist and neck measurements. With those two we can ' +
          'cross-check the estimate against the measured value.',
      },
      belBoy: {
        uyari:
          'Your waist is more than half your height. This is a simple indicator that abdominal ' +
          'fat may be somewhat high. Waist circumference is one of the measures that responds ' +
          'fastest to training and nutrition, even when the scale does not move.',
        normal:
          'Your waist is under half your height. This is generally a good sign; we will keep ' +
          'watching this ratio as we track progress.',
      },
      feragat:
        'Made2Fit is not a medical device and does not diagnose. These outputs are estimates ' +
        'derived from measurements and imagery; they are not exact values. If you have a ' +
        'complaint, talk to your doctor.',
    },
    sayfaBasligi: 'Your body analysis',
    yukleniyor: 'Extracting measurements',
    hataMesaji: 'The analysis could not run just now. You can enter your measurements and retry.',
    hataBaslik: 'Analysis could not be prepared',
    programaGec: 'Go to the program',
    analizRaporun: 'Your analysis report',
    yagOraniAraligi: 'BODY FAT RANGE',
    kaynakIkisi: 'Photo and measurements were combined, which is why the range is narrower.',
    kaynakOlcu: 'Calculated from your tape measurements alone.',
    kaynakFotograf: 'Calculated from the photo alone.',
    tahminEtiketi: 'ESTIMATED RANGE - NOT AN EXACT MEASUREMENT',
    edBaslik: 'Numbers are off for you',
    edGovde:
      'We describe the body analysis by region instead. You can turn the numbers on in settings.',
    belBoyBasligi: 'Waist-to-height ratio',
    kasDagilimiBasligi: 'Muscle distribution',
    kasDagilimiNotu:
      'This is a ranking, not a grade. Whichever region lags gets extra sets in your program.',
    kasSkorAdlari: {
      1: 'lagging',
      2: 'developing',
      3: 'balanced',
      4: 'good',
      5: 'dominant',
    },
    durusBasligi: 'Postural tendencies',
    sinirlarBasligi: 'Limits of this report',
    hedefGercekciMi: 'Is my target realistic?',
    programimiGor: 'See my program',
    programErisimIpucu: 'Opens the program built from your assessment',
  },

  gerceklik: {
    yukleniyor: 'Checking your target',
    bosBaslik: 'No target on file',
    bosGovde: 'This fills in once you finish the assessment.',
    edSayfaBasligi: 'Your target',
    edBaslik: 'Your target',
    edUyariBaslik: 'We describe this section without numbers',
    edUyariGovde:
      'Weight targets and rate calculations are off for you. We will track your progress by how you feel, what you lift and your tape measurements.',
    sayfaBasligi: 'Is your target realistic',
    girisMetni:
      'This page is not selling anything. It works out whether your target is physiologically possible, and says so when it is not.',
    seninBeklentin: 'WHAT YOU EXPECT',
    gercekciEtiketi: 'REALISTIC',
    cokHizliEtiketi: 'TOO FAST',
    kgAy: 'kg / month',
    korunabilirAralik: 'Sustainable range:',
    ayBirimi: '/ month',
    beklentiYok: 'You have not entered a monthly expectation. You can update it in the assessment.',
    yolBasligi: 'The road to this target',
    suAnkiKilo: 'Current weight',
    hedefKilo: 'Target weight',
    fark: 'Difference',
    korunabilirSure: 'Time at a sustainable rate',
    haftaBirimi: (hafta: number) => `~${hafta} weeks`,
    hedefTarihNotu: (tarih: string) =>
      `You said you wanted to be there by ${tarih}. We compare that with this timeline and build the program accordingly.`,
    nedenHizliBaslik: 'Why faster does not work',
    nedenHizliMaddeleri: [
      'Losing more than 1% of bodyweight a week means a good share of the loss is muscle.',
      'Muscle loss lowers your basal metabolism; the same calories stop working.',
      'Too large a deficit brings hormonal decline, disrupted sleep and lost performance.',
      'Weight lost quickly is regained at a markedly higher rate than weight lost slowly.',
    ],
    saglikUyarisi:
      'Made2Fit is not a medical device and does not diagnose. These calculations use general physiology; if you have a specific health condition, talk to your doctor.',
    programimiGor: 'See my program',
    hedefimiGuncelle: 'Update my target',
  },

  program: {
    /**
     * Motorun ürettiği program metinleri.
     *
     * Motor anahtar ve parametre üretiyor; cümle burada kuruluyor. Split gerekçesi ve
     * ilerleme kuralı programın her satırında görünüyor — tek dile bağlı kalamaz.
     */
    motor: {
      split: {
        fullBodyTekGun: () =>
          'One day a week has to hold the whole body; I took the most efficient slice with compound movements.',
        fullBodyAzGun: (d: Record<string, string | number>) =>
          `You can train ${d.gun} days a week. At this frequency, the only way to hit every muscle ` +
          'group at least twice is to make every session full body.',
        fullBodyYeni: () =>
          'You said you can train 3 days a week and that you are new to this. At this stage, ' +
          'touching the whole body every session is the fastest way to settle technique, because ' +
          'you repeat the movements more often.',
        ucGunKisaSeans: (d: Record<string, string | number>) =>
          `You have 3 days a week and ${d.dakika} minutes per session. Full body will not fit into ` +
          'that time, so I split it into upper, lower and one collector day.',
        ucGunDeneyimli: () =>
          'You have 3 days a week and you are no longer a beginner. Upper, lower and one collector ' +
          'day give you both enough volume and enough rest.',
        dortGun: () =>
          'For 4 days a week the upper/lower pair runs twice. Every muscle group gets a stimulus ' +
          'twice a week, with a full day of recovery in between.',
        besGun: () =>
          'For 5 days a week I set up two general days and three focused days. This spreads volume ' +
          'across the week instead of piling it into one session.',
        altiGun: () =>
          'For 6 days a week the push, pull and legs days run twice. Every muscle group works twice ' +
          'a week and sessions stay short.',
      },
      uyari: {
        havuz_elemesi: (d: Record<string, string | number>) =>
          `${d.adet} exercises were removed from the pool because of the limits you reported.`,
        havuz_dar: () =>
          'Your exercise pool is narrow. You can add equipment, or update the areas where you reported pain.',
      },
      ilerlemeKurali: {
        vucut_agirligi: (d: Record<string, string | number>) =>
          `If you complete ${d.tekrar_ust} reps on all ${d.set} sets, move to a harder variation ` +
          `next week. If you drop below ${d.tekrar_alt} reps, stay on the same variation.`,
        agirlik: (d: Record<string, string | number>) =>
          `If you complete ${d.tekrar_ust} reps on all ${d.set} sets, add ${d.artis} kg next week. ` +
          `If you drop below ${d.tekrar_alt} reps, keep the weight the same.`,
      },
    },
    yukleniyor: 'Building your program',
    bosBaslik: 'You do not have a program yet',
    uretilemedi: 'The program could not be computed right now. You can try again.',
    bosGovde:
      'If you finished the assessment we can compute your program now. If not, let us go back there first.',
    programimiHesapla: 'Compute my program',
    degerlendirmeyeDon: 'Back to the assessment',
    cevrimdisiNotu:
      'No connection. This is the last program saved on your device — you can read it, and feedback is sent once you are back online.',
    haftaEki: 'WEEK',
    hazir: 'Your program is ready',
    nedenBuProgram: 'WHY THIS PROGRAM',
    kararlarinTamami: 'All the decisions →',
    haftalikYapi: 'Weekly structure →',
    gunBasligi: (sira: number, tip: string) => `Day ${sira} · ${tip}`,
    dakikaEtiketi: (dakika: number) => `~${dakika} MIN`,
    seansiBitirdim: 'I finished the session, give feedback',
    seansErisimIpucu: 'Three taps, fifteen seconds',
    kilitliGun: (adet: number) => `${adet} more days are ready`,
    kilitliGovde:
      'The whole week is computed. Day 1 is free; the remaining days and the post-session adaptation open from the Basic plan onwards.',
    planlaraBak: 'See the plans',
    tamamEtiketi: 'DONE',
    hareketEtiketi: (adet: number) => `${adet} EXERCISES`,
    bugunuAc: 'Open this day →',
    gunTipleri: {
      full_body: 'Full body',
      upper: 'Upper body',
      lower: 'Lower body',
      push: 'Push',
      pull: 'Pull',
      legs: 'Legs',
    },
    gunSayfaBasligi: 'Session',
    hareketSayfaBasligi: 'Exercise',
    gunBulunamadi: 'That day could not be found',
    programaDon: 'Back to the program',
    gunEki: (sira: number) => `Day ${sira}`,
    kasAdlari: {
      gogus: 'Chest',
      sirt: 'Back',
      trapez: 'Traps',
      on_omuz: 'Front delts',
      yan_omuz: 'Side delts',
      arka_omuz: 'Rear delts',
      omuz: 'Shoulders',
      biceps: 'Biceps',
      triceps: 'Triceps',
      onkol: 'Forearms',
      karin: 'Abs',
      bel: 'Lower back',
      kalca: 'Glutes',
      quadriceps: 'Quads',
      hamstring: 'Hamstrings',
      baldir: 'Calves',
    },
    paternAdlari: {
      itme_yatay: 'HORIZONTAL PUSH',
      itme_dikey: 'VERTICAL PUSH',
      cekme_yatay: 'HORIZONTAL PULL',
      cekme_dikey: 'VERTICAL PULL',
      diz_baskin: 'KNEE DOMINANT',
      kalca_baskin: 'HIP DOMINANT',
      tasima: 'CARRY',
      rotasyon: 'ROTATION',
      izolasyon: 'ISOLATION',
    },
    zorlukEtiketi: (deger: number) => `DIFFICULTY ${deger}/5`,
    verimEtiketi: (deger: number) => `EFFICIENCY ${deger}/5`,
    hangiCevaplardan: 'WHICH ANSWERS THIS CAME FROM',
    gorselKaynagi: 'Image: free-exercise-db (public domain)',
    gorselErisim: (ad: string) => `Illustration of ${ad}`,
    nasilYapilir: 'How to do it',
    calisanKaslar: 'Muscles worked',
    birincil: 'Primary',
    ikincil: 'Secondary',
    kimlerdeDikkat: 'Who should take care',
    kontrendikasyonNotu: (liste: string) =>
      `This exercise is filtered out in these cases: ${liste}. If any apply to you, your program never suggests it.`,
    ucretsizSinirsiz: 'Free and unlimited. Your weekly volume is preserved.',
    muadillerBasligi: 'Alternatives',
    muadillerNotu:
      'Exercises that work the same muscle, fit your equipment and do not conflict with your restrictions.',
    muadilYok:
      'No alternative fits your equipment and restrictions. Update your equipment list to open up options.',
    vazgec: 'Cancel',
    neden: {
      sayfaBasligi: 'Why this program',
      baslik: 'The decision trail behind your program',
      girisMetni:
        'What follows was not written by an AI. It is the solver decision trail, and every line traces back to one of your answers.',
      programYapisi: 'PROGRAM STRUCTURE',
      hacimButcesi: 'Your weekly volume budget',
      hacimButcesiNotu:
        'Weekly sets per muscle group. The table starts from your training age, then gets corrected multiplicatively by your answers.',
      setBirimi: 'sets',
      hacimDuzeltmeleri: 'Volume corrections',
      havuzdanCikanlar: 'Filtered out of the pool',
      havuzdanCikanlarNotu: 'These exercises were never even considered for you.',
      hareketSecimleri: 'Exercise choices',
      bosBaslik: 'No decision trail yet',
      bosGovde: 'Once a program is generated, every decision is recorded here.',
      kuralAdlari: {
        uyku_kisa: 'Short sleep',
        stres_yuksek: 'High stress',
        yas_50_ustu: 'Over 50',
        oncelikli_bolge: 'Priority region',
        memnun_bolge_koruma: 'Maintenance volume',
        aktif_sakatlik: 'Active injury',
        kalori_acigi_yuksek: 'Large calorie deficit',
        ekipman_yok: 'Equipment unavailable',
        kontrendikasyon: 'Injury restriction',
        eksenel_yuk_yasak: 'Axial loading banned',
        tavan_alcak: 'Low ceiling',
        gurultu_kisiti: 'Noise restriction',
        zipla_yasak: 'No jumping',
        spotter_yok: 'No spotter',
        teknik_guven_dusuk: 'Low technical confidence',
        kullanici_reddetti: 'You said no',
        agriyi_artiran_patern: 'Pain-aggravating pattern',
      },
    },
    hafta: {
      sayfaBasligi: 'Weekly structure',
      bosBaslik: 'No program',
      bosGovde: 'You need to compute your program first.',
      yapiNedenSecildi: 'WHY THIS STRUCTURE',
      yerlesimBasligi: 'Placement across the week',
      yerlesimNotu:
        'The days come from the ones you marked available in the assessment; we spread them as far apart as possible so the same muscle group is not loaded again before it recovers.',
      gunKisaltmalari: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      antrenmanGunu: 'training day',
      dinlenmeGunu: 'rest',
      hacimButcesi: 'Your weekly volume budget',
      hacimButcesiNotu:
        'Weekly sets per muscle group. It starts from your training age and gets corrected multiplicatively by your answers.',
      haftaninGunleri: 'Days of the week',
      kilitliNotu: (adet: number) =>
        `The whole week is computed, but ${adet} days are still hidden. They open from the Basic plan onwards.`,
      gelecekHaftaBasligi: 'Why are next week weights missing?',
      gelecekHaftaGovde:
        'Because they do not exist yet. The engine does not print a 12-week table; it computes each session from the feedback on the previous one. That is what lets the program actually adapt to you — a static document would be stale by week two.',
    },
    dinlenmeEtiketi: (saniye: number) => `REST ${saniye} S`,
    nedenBuHareket: 'WHY THIS EXERCISE',
    ilerlemeKurali: 'PROGRESSION RULE',
    makineDoluysa: 'IF THE MACHINE IS TAKEN',
    dinlenme: (saniye: number) => `Rest ${saniye} s`,
    setTekrar: (set: number, alt: number, ust: number) => `${set} sets x ${alt}-${ust} reps`,
    baslangic: (kg: number) => `Starting weight: ${kg} kg`,
    vucutAgirligi: 'Bodyweight',
    hareketDegistir: 'Swap this exercise',
    gunKaydir: 'Move this day',
    hareketCikar: 'Remove this exercise',
    duzenlemeUcretsiz: 'Editing your program is free and unlimited.',
  },

  geriBildirim: {
    sayfaBasligi: 'After the session',
    girisMetni:
      'Three taps, fifteen seconds. We do not want you fiddling with your phone at the gym.',
    gonder: 'Send',
    gonderilemedi: 'Could not send. You can try again.',
    yargilamiyoruz: 'No judgement; we shift the program accordingly.',
    atlamaSebepleri: [
      'No time',
      'I was ill',
      'I was exhausted',
      'Could not get to the gym',
      'Did not feel like it',
    ],
    kararSayfaBasligi: 'What changed in your program',
    kararBaslik: 'Engine decision',
    kararGiris: 'Your feedback changed the next session like this:',
    agriUyarisi:
      'I reduced the load on the area where you reported pain. If it lasts longer than two weeks or gets worse, I suggest seeing a doctor or physiotherapist.',
    programaDon: 'Back to the program',
    agriHaritasiBasligi: 'Where it hurts',
    baslik: 'How did the last session go?',
    altBaslik: 'Three taps, fifteen seconds.',
    tamamladim: 'Completed it',
    zorlandim: 'Struggled',
    yapamadim: 'Could not do it',
    agriSorusu: 'Did anything hurt?',
    agriOpsiyonel: 'Point to it on the body map if you want',
    seansiAtladim: 'I skipped the session',
    atlamaSebebi: 'What happened?',
    motorKarari: 'What changed in your program',
  },

  beslenme: {
    yuklenemedi: 'Could not load.',
    hedefYokBaslik: 'No nutrition target yet',
    degerlendirmeyeGit: 'Go to the assessment',
    edBaslik: 'Your plate today',
    edSayiNotu: 'If you want to see the numbers, you can turn them on in settings.',
    bugun: 'Today',
    kaloriEtiketi: 'CALORIES',
    hedefEki: (kalori: number) => `target ${kalori}`,
    kaloriPayda: (kalori: number) => `/ ${kalori} kcal`,
    hedefNasilHesaplandi: 'How your target was calculated',
    bazalMetabolizma: (yontem: string) => `Basal metabolic rate (${yontem})`,
    gunlukHarcama: 'Total daily expenditure',
    hedefeGoreFark: 'Difference from maintenance',
    duzeltmeNotu:
      'These numbers are compared with your real weight change every two weeks and corrected.',
    aramayiKapat: 'Close search',
    yemekEkle: 'Add food',
    barkodOkut: 'Scan a barcode',
    fotograftanEkle: 'Add from a photo',
    haftalikPlan: 'Weekly plan',
    buzdolabim: 'My fridge',
    ogunDegistir: 'Swap a meal',
    alisverisListesi: 'Shopping list',
    bugunYediklerin: 'What you ate today',
    bosKayitBaslik: 'Nothing logged today',
    bosKayitGovde:
      'Once you add food, the totals appear here. Add the same food twice and you get the same macros — promise.',
    aramaIpucu: 'Search food — rice, meatballs, yoghurt',
    yemekArama: 'Food search',
    miktar: 'Amount',
    evOlcusuEtiketi: 'YOU CAN PICK A HOUSEHOLD MEASURE - NOT JUST GRAMS',
    vazgec: 'Cancel',
    kaloriHedefi: 'Daily target',
    protein: 'Protein',
    yag: 'Fat',
    karbonhidrat: 'Carbs',
    lif: 'Fibre',
    su: 'Water',
    edPorsiyon: {
      protein: 'a palm of protein at each meal',
      karbonhidrat: 'a fist of carbs',
      sebze: 'two handfuls of vegetables',
      yag: 'a thumb of fat',
    },
    tdeeDuzeltildi: (fark: number) =>
      `Based on your real weight change over the last two weeks, we adjusted your daily target by ${fark > 0 ? '+' : ''}${fark} kcal. Formulas are wrong sometimes; your data is not.`,
  },

  saglik: {
    tibbiCihazDegil:
      'Made2Fit is not a medical device. It does not diagnose and does not prescribe treatment. Its outputs are estimates. If you have a complaint, see your doctor.',
    aralikDili: 'This is an estimated range, not an exact measurement.',
    agriYonlendirme:
      'If your pain lasts longer than two weeks or is getting worse, we suggest seeing a doctor or physiotherapist. In the meantime we will give you a program that does not load that area.',
  },

  sekmeler: {
    program: 'Program',
    beslenme: 'Nutrition',
    koc: 'Coach',
    ilerleme: 'Progress',
    ayarlar: 'Settings',
  },

  kapiEkrani: {
    anladim: 'Understood',
    simdilikDevam: 'Continue for now',
    devamEt: 'Continue',
    duraklama:
      'Your answers are kept. This screen is a pause, not a door — when your situation changes, you continue from where you stopped.',
  },

  fotograf: {
    sayfaBasligi: 'Capture',
    gizlilikSayfaBasligi: 'Body analysis',
    akisAdimlari: [
      'The photo is taken on your phone.',
      'It travels to the analysis service over an encrypted channel.',
      'Measurements are extracted: body fat range, muscle distribution, posture.',
      'The photo is erased from memory within the same request.',
      'Only the numbers are stored. Nothing is written to our disk.',
    ],
    fotoraflaDevam: 'Understood, continue with photos',
    olculerleDevam: 'Continue with measurements',
    baslik: 'Capture protocol',
    girisMetni:
      'Two photos taken in different conditions cannot be compared. That is why the protocol is fixed.',
    kurallar: [
      'Hold the phone upright at chest height, two metres away.',
      'Pick a flat, plain background.',
      'Use daylight; overhead lamps cast shadows.',
      'Wear fitted or athletic clothing so your outline is visible.',
    ],
    hayaletNotu: 'YOUR PREVIOUS OUTLINE WILL APPEAR HERE NEXT TIME',
    aciUygun:
      'The phone angle is good. If you tilt it, the shutter locks — a bad angle spoils the result.',
    aciBozuk: 'Straighten the phone. Capture stays locked until the angle is right.',
    izinYok:
      'Camera permission was not granted. You can continue without photos; the report is then based on measurements.',
    izinVer: 'Grant camera permission',
    egimDerecesi: (derece: number) => `Tilt ${derece}°`,
    yenidenCek: 'Retake',
    analizEdiliyor: 'Extracting measurements',
    analizHatasi: 'The analysis could not run. You can continue without photos.',
    cekildi: 'TAKEN',
    bekliyor: 'WAITING',
    pozCek: (poz: string) => `Take the ${poz.toLowerCase()} photo`,
    pozlar: {
      on: { ad: 'Front', yonerge: 'Arms 45 degrees from your torso, palms facing forward.' },
      yan: { ad: 'Side', yonerge: 'Right side to the camera, arms relaxed at your sides.' },
      arka: { ad: 'Back', yonerge: 'Back to the camera, arms as in the front pose.' },
    },
    analiziBaslat: 'Start the analysis',
    fotografsizDevam: 'Continue without photos',
    silmeNotu: 'The photos are erased from memory as soon as the analysis finishes.',
  },

  gizlilik: {
    fotografBaslik: 'Your photo does not stay with us',
    fotografGovde:
      'Your photo travels over an encrypted channel to the analysis service, measurements are extracted, and the photo is erased from memory within the same request. It is never written to our disk. The only thing stored is the numeric output.',
    cihazKopyasi:
      'A copy is kept only on your phone, for comparison. If you change phones those photos are gone — we want you to know that up front.',
    fotografsizDevam: 'Continue without a photo',
    fotografsizAciklama:
      'If you would rather not take a photo, we can continue with your tape measurements. The body fat range comes out a little wider; everything else is the same.',
  },

  ayarlar: {
    baslik: 'Settings',
    aktifEtiketi: 'ACTIVE',
    planEki: (ad: string) => `${ad} plan`,
    iptalTekAdim: 'One step. We do not hide it and we do not make it hard.',
    iptalOnayBaslik: 'Cancel subscription',
    iptalOnayGovde:
      'Everything stays open until the end of the period, then you return to the free plan. Your data is not deleted.',
    iptalEt: 'Cancel it',
    silOnayBaslik: 'Delete your account',
    silOnayGovde: 'All your data is permanently deleted. This cannot be undone.',
    sil: 'Delete',
    planKotaBasligi: 'Plan and quota',
    planEtiketi: 'Plan',
    kotaAdaletNotu:
      'Recognition served from cache, and retries after a wrong recognition, do not count against your quota.',
    yemekTanima: 'Meal recognition from photos',
    kocMesaji: 'Coach messages',
    kotaYenilenme: (tarih: string) => `Resets on ${tarih}.`,
    sayiGosterimi: 'Number display',
    sayilariGoster: 'Show calorie and macro numbers',
    sayilariGosterErisim: 'Show numbers',
    degerlendirmeBasligi: 'Assessment',
    degerlendirmeGovde:
      'If an injury, your equipment or your goal has changed, update your answers. Your program is recomputed; you do not have to start over.',
    degerlendirmeyiGuncelle: 'Update the assessment',
    bildirimBasligi: 'Notifications',
    bildirimGovde:
      'We send reminders, we do not nag. No broken-streak warnings and no guilt language.',
    bildirimAyarlari: 'Notification settings',
    gizlilikBasligi: 'Privacy and data',
    gizlilikGovde:
      'Your body photos were never stored on our servers. You can download all your other data or delete it along with your account.',
    verimiDisaAktar: 'Export my data',
    verinHazirBaslik: 'Your data is ready',
    verinHazirGovde:
      'All your records were prepared as JSON. A sharing option arrives in the next release.',
    saglikUyarisiBasligi: 'Health notice',
    hesapBasligi: 'Account',
    dogrulandi: 'Verified',
    dogrulamaGovde:
      'Verifying your email is not required, but it is the only way back in if you lose access to your account.',
    dogrulamaKoduGonder: 'Send a verification code',
    dogrulamaKodu: 'Verification code',
    dogrula: 'Verify',
    kodGelmedi: 'Code did not arrive, send another',
    kodGonderilemedi: 'Could not send the code. You can try again shortly.',
    kodGecersiz: 'The code is invalid or has expired. You can request a new one.',
    cikisYap: 'Sign out',
    hesabimiSil: 'Delete my account',
    oyunlastirmaNotu:
      'Made2Fit has no badges, no gems, no streaks and no celebration animations. That is a choice, not an omission.',
    dilBasligi: 'Language',
    dilNotu:
      'Exercise instructions, recipes and the body analysis report are Turkish-only for now. ' +
      'The interface, program rationales and coach chat are bilingual.',
  },

  odeme: {
    planlar: 'Plans',
    ucretsiz: 'Free',
    temel: 'Basic',
    pro: 'Pro',
    aylik: 'monthly',
    yillik: 'yearly',
    yenilemeTarihi: (tarih: string) => `Renews on ${tarih}`,
    iptalKolay: 'Cancelling takes two taps — here is how',
    iptalEt: 'Cancel subscription',
    kotaKalan: (kalan: number, toplam: number) => `${kalan} / ${toplam} left`,
    kotaYenilenme: (tarih: string) => `Resets on ${tarih}`,
    kotaAdaleti:
      'Recognitions served from cache, and retries after a wrong result, do not count against your quota.',
  },

  ilerleme: {
    baslik: 'Progress',
    fotografKarsilastir: 'Compare photos',
    haftalikYapi: 'Weekly structure',
    bugunkuKilon: 'Your weight today',
    kiloErisim: 'Weight',
    tartimNotu:
      'Weigh yourself in the morning, after the toilet, before eating. Daily swings of 1-2 kg are normal.',
    edBaslik: 'Weight tracking is off for you',
    edGovde:
      'We track your progress by what you lift and how you feel. You can turn it on in settings.',
    analizGecmisi: 'Body analysis history',
    kiloSeyri: 'Weight trend',
    yagOraniAraligi: (alt: number, ust: number) => `${alt}-${ust}%`,
    hareketGelisimi: 'Progress by exercise',
    hareketGelisimiNotu:
      'Even when the scale does not move, you see progress here. This is the real evidence.',
    bosBaslik: 'No progress data yet',
    bosGovde:
      'Once you give feedback on your first session, you will see how your weights changed here.',
  },

  bildirimAyarlari: {
    sayfaBasligi: 'Notifications',
    girisMetni:
      'We send reminders, we do not nag. No broken-streak alerts, no guilt language and no "we miss you" pings — none of that will ever exist here.',
    seansBaslik: 'Session reminder',
    seansAciklama: 'One notification on training days.',
    geriBildirimBaslik: 'Feedback reminder',
    geriBildirimAciklama: 'The day after a session, so the three taps do not slip your mind.',
    ozetBaslik: 'Weekly summary',
    ozetAciklama: 'Once a week, one notification explaining what changed.',
    olcumBaslik: 'Measurement reminder',
    olcumAciklamaEd: 'A monthly tape-measurement reminder. Weight is never asked.',
    olcumAciklama: 'A monthly weight and tape-measurement reminder.',
    suBaslik: 'Water reminder',
    suAciklama: 'A few times a day. Most people turn this off; it is off by default.',
    durusNotu:
      'No notification ever uses streaks, badges or "you missed it" language. Skipping a day breaks nothing, and the notifications behave accordingly.',
    kaydedildiIzinYok:
      'Your preferences are saved, but notification permission was not granted. You can enable it in device settings.',
    kaydedildiBos: 'Your preferences are saved. Nothing is scheduled right now.',
    kaydedildiKuruldu: 'Your preferences are saved and the reminders are scheduled.',
  },

  karsilastirma: {
    sayfaBasligi: 'Comparison',
    azBaslik: 'Comparing needs at least two measurements',
    azGovde:
      'Your first analysis is done. When you do the second one a month from now, you will see the change side by side.',
    cihazNotu:
      'The comparison runs entirely on your phone. The photos never reached our servers, so they are not in our hands here either.',
    baslik: 'Change',
    once: 'BEFORE',
    sonra: 'AFTER',
    hangiOlcumler: 'Which measurements',
    yagOraniAraligi: 'BODY FAT RANGE',
    aralikAsagi:
      'The range shifted down. These are estimated ranges; look at the trend, not a single reading.',
    aralikYukari:
      'The range shifted up. One measurement says nothing; look at the direction across three.',
    aralikAyni: 'The range stayed the same.',
    fotografNotu:
      'These photos live only on your phone. If you change phones they are gone — we want you to know that now.',
    yeniOlcum: 'Take a new measurement',
    cevreOlculeri: 'Tape measurements',
    belNotu:
      'Waist is one of the fastest-responding measurements, even when the scale does not move.',
    fotografYok: 'NO PHOTOS\nON THIS DEVICE',
  },

  ogun: {
    ogunAdlari: {
      kah: 'Breakfast',
      ogl: 'Lunch',
      aks: 'Dinner',
      ana_ogun: 'Main meal',
      kahvalti: 'Breakfast',
      ogle: 'Lunch',
      aksam: 'Dinner',
      ara_ogun: 'Snack',
      ara_ogun_2: 'Second snack',
      gece: 'Late',
      sahur: 'Suhoor',
      iftar: 'Iftar',
      iftar_sonrasi: 'After iftar',
    },

    deste: {
      sayfaBasligi: 'Swap a meal',
      hata: 'Could not load the options.',
      yukleniyor: 'Preparing options',
      bosBaslik: 'Could not load the options',
      sadeceDolaptan: 'Only what I can make from my fridge',
      menuDayatmiyoruz: 'We do not impose a menu',
      makroKilidi: 'MACRO LOCK FOR THIS MEAL',
      makroKilidiNotu:
        'Every option below lands within 8% of this target. Whichever you pick, your daily totals stay the same.',
      porsiyonEtiketi: (katsayi: string) => `${katsayi} PORTIONS`,
      begenmedim: 'Not this one',
      bunuSec: 'Pick this',
      desteBitti: 'Deck finished',
      sonsuzKaydirmaYok:
        'No infinite scrolling — on purpose. If nothing appeals, you can pick the meal yourself or add ingredients to your fridge.',
      eklerseAcilir: 'Add these and more options open up',
      acilanTarif: (adet: number) => `+${adet} RECIPES`,
      alisverisListemeEkle: 'Add to my shopping list',
    },

    reyonAdlari: {
      manav: 'Produce',
      kasap: 'Butcher',
      balikci: 'Fishmonger',
      sarkuteri: 'Deli',
      firin: 'Bakery',
      kuru_gida: 'Dry goods',
      dondurulmus: 'Frozen',
      diger: 'Other',
    },

    haftaGunleri: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],

    plan: {
      sayfaBasligi: 'Weekly plan',
      hata: 'The plan could not be generated.',
      yukleniyor: 'Preparing the plan',
      kapaliBaslik: 'Meal planning is locked',
      bosBaslik: 'No plan for this week',
      bosGovde:
        'I can lay out seven days from your restrictions and macro targets. Any meal you dislike is one tap away from being swapped.',
      planiCikar: 'Generate my weekly plan',
      haftaBasligi: (hafta: string) => `Week of ${hafta}`,
      alternatifEtiketi: (adet: number) => `${adet} ALTERNATIVES`,
      tarifiAc: 'Open the recipe',
      degistir: 'Swap',
      ogunYok:
        'No recipe fits your restrictions for this meal. Add ingredients to your fridge or relax the budget restriction and options open up.',
      alisverisListesi: 'See the shopping list',
      planiYenile: 'Refresh the plan',
      makroNotu:
        'Every alternative sits in the same macro budget. Whatever you pick, your daily totals hold.',
    },

    alisveris: {
      sayfaBasligi: 'Shopping list',
      bosBaslik: 'The list is empty',
      bosGovde:
        'Your shopping list is built automatically when you generate a weekly plan. Anything already in your fridge never makes the list.',
      planiCikar: 'Generate my weekly plan',
      baslik: 'Shopping',
      girisMetni:
        'Grouped by the order you walk the shop. Whatever is already in your fridge was left out.',
      dolabaEkle: 'Add what I bought to my fridge',
      planiGor: 'See the plan',
    },

    tarif: {
      sayfaBasligi: 'Recipe',
      bosBaslik: 'Recipe not found',
      bosGovde: 'This recipe may have been removed, or may never have existed.',
      birPorsiyon: 'ONE PORTION',
      makroKaynagi: 'MACROS COMPUTED FROM OUR OWN FOOD DATABASE',
      edBaslik: 'Numbers are off for you',
      edGovde:
        'We describe this recipe in portions: a palm of protein, a fist of carbs, two handfuls of vegetables.',
      nasilYapilir: 'How to make it',
      kontrolNotu:
        'This recipe was checked by hand for food safety. Cooking temperature and time are reviewed on every recipe containing meat, chicken or egg.',
    },

    dolap: {
      sayfaBasligi: 'My fridge',
      baslik: 'What is in your fridge?',
      girisMetni:
        'If you enter your inventory, we only show recipes you can make right now. If you skip it, every recipe stays available.',
      malzemeSayisi: (adet: number) => `${adet} ingredients in your fridge`,
      cikarErisim: (malzeme: string) => `remove ${malzeme}`,
      bosBaslik: 'Your fridge looks empty',
      bosGovde: 'Pick from the common items below, or type your own.',
      sikKullanilanlar: 'COMMON ITEMS',
      kaydedildi: 'Your fridge is saved.',
      malzemeIpucu: 'Type an ingredient and add',
      malzemeEkle: 'Add ingredient',
      tarifleriGor: 'Show recipes I can make',
    },
  },

  barkod: {
    sayfaBasligi: 'Barcode',
    baslik: 'Product barcode',
    girisMetni:
      'Scan the barcode on the packaging, or type the digits. What we find is the manufacturer declaration; we do not invent it.',
    izinIsteniyor: 'Requesting camera permission',
    izinYok: 'Camera permission was not granted. You can type the barcode digits instead.',
    izinVer: 'Grant camera permission',
    kadraja: 'Line the barcode up inside the frame',
    tara: 'Scan barcode',
    taramayiKapat: 'Close the scanner',
    alanEtiketi: 'Barcode digits',
    gecersiz: 'That barcode looks wrong. Could you check the digits again?',
    ara: 'Search',
    araniyor: 'Looking up the barcode',
    bulunamadi: 'That barcode is not in our database. You can add it manually.',
    kaynakYerel: 'FROM OUR DATABASE',
    kaynakOff: 'OPEN FOOD FACTS',
    dogrulanmadiNotu:
      'This record came from the Open Food Facts community and has not been verified by us. If it does not match the label, you can correct the values manually.',
    yuzGramBasina: 'Per 100 grams',
    gune: 'Add to today',
    miktarGram: 'Amount (grams)',
  },

  tanima: {
    hata: 'Recognition failed.',
    yukleniyor: 'Looking at your plate',
    dogrulaSayfaBasligi: 'Confirm',
    dogrulaBaslik: 'Is this right?',
    elleAraEkle: 'Search and add manually',
    onbellektenEtiketi: 'FROM CACHE',
    tanindiEtiketi: 'RECOGNISED',
    dogrulaGiris:
      'I estimated the amounts and took the nutrition values from the database. Fix anything wrong; nothing is saved until you confirm.',
    fotograftaEki: (ad: string) => `IN THE PHOTO: ${ad}`,
    eslesmediEtiketi: 'NO MATCH',
    eslesmediNotu:
      'I could not find this in the database. Pick it manually and I will know it next time.',
    miktarGram: 'AMOUNT (GRAMS)',
    miktarErisim: (ad: string) => `amount of ${ad}`,
    kapat: 'Close',
    yemegiDegistir: 'Change the food',
    tabaktaYoktu: 'This was not on the plate, remove it',
    kalemKalmadiBaslik: 'Nothing left',
    kalemKalmadiGovde: 'You removed everything. You can retake the photo or add items manually.',
    kaynakEtiketi: 'AMOUNTS ESTIMATED - NUTRITION FROM THE DATABASE',
    onayla: 'Confirm and add to today',
    tekrarDene: 'Wrong result, try again',
    kotaNotu: 'A retry after a wrong result does not count against your quota.',
    cekimSayfaBasligi: 'Add from a photo',
    cekimBaslik: 'Photograph your plate',
    cekimGiris:
      'I estimate what you ate and how much. I never invent the calories — nutrition values always come from the database, which is why the same meal always gives the same result.',
    ipuclari: [
      'Get the whole plate in frame.',
      'Shoot from above, at a slight angle.',
      'Leave a fork or spoon in frame — it gives a size reference.',
      'Photographing the same plate twice does not cost you a credit.',
    ],
    tekrarDenemeNotu: 'This retry will not count against your quota.',
    fotografCek: 'Take a photo',
    silmeNotu:
      'Your photo is erased from memory after the analysis and is never written to our servers.',
    dogruYemegiAra: 'Search for the right food',
  },

  paywall: {
    satinAlmaHatasi: 'The purchase could not be completed.',
    geriYuklemeYok: 'No purchase was found to restore.',
    baslik: 'Basic gives you the program, Pro makes tracking effortless',
    girisMetni:
      'The assessment, the body analysis and day one of your program stay free. What follows comes on top.',
    aylik: 'Monthly',
    yillik: 'Yearly',
    ayKisa: 'mo',
    yilKisa: 'yr',
    planErisim: (ad: string, fiyat: string) => `${ad} plan, ${fiyat}`,
    planAdlari: {
      ucretsiz: 'Free',
      temel: 'Basic',
      pro: 'Pro',
    },
    yenilemeTarihi: (tarih: string) => `Renews on ${tarih}`,
    ozellikler: {
      tumGunler: 'Every day of the week',
      geriBildirim: 'Post-session feedback and adaptation',
      ogunPlani: 'Meal plan, recipes, fridge',
      kocSohbeti: (adet: number) => `AI coach chat - ${adet} messages a month`,
      yemekTanimaKotali: (adet: number) => `Meal recognition from photos - ${adet} a month`,
      yemekTanima: 'Meal recognition from photos',
      programDuzenleme: 'Program editing - unlimited',
      kaloriMakroHedefi: 'Calorie and macro targets',
      barkodOkuma: 'Barcode scanning',
      reklamYok: 'No ads, no upsells',
    },
    odenecekTutar: 'AMOUNT TO PAY',
    tahsilatNotu: (donem: string) =>
      `${donem} you are charged the same amount. Cancel whenever you like; everything stays open until the end of the period.`,
    herAy: 'Every month',
    herYil: 'Every year',
    planSecUyarisi: 'Pick a plan to continue. We do not pick one for you.',
    planiBaslat: (ad: string) => `Start the ${ad} plan`,
    planSec: 'Choose a plan',
    planlarBasligi: 'Plans',
    kapat: 'Close',
    geriYukle: 'Restore my purchases',
    iptalBasligi: 'Cancelling takes two taps',
    iptalGovde:
      '1. Open the Settings tab. 2. Press the "Cancel subscription" button at the top. That is all. No phone call, no email, no reason required.',
    durusEtiketi: 'NO COUNTDOWN - NO FAKE SCARCITY - NO PRESELECTED PLAN',
  },

  koc: {
    cevapVeremiyorum: 'I cannot answer right now. Try again in a little while.',
    kapaliBaslik: 'The coach is closed right now',
    planlaraBak: 'See the plans',
    geri: 'Back',
    tanitim:
      'I do not give generic advice; I look at your data. Your training history, your food log and your measurements are all in front of me.',
    ornekSorularBasligi: 'EXAMPLE QUESTIONS',
    ornekSorular: [
      'My bench press has stalled, what should I do?',
      'Am I hitting my calorie target?',
      'Is my volume enough this week?',
    ],
    sinirUyarisi:
      'The coach does not diagnose and does not give medication or supplement doses. For health questions it points you to a doctor.',
    baktigimVeri: 'DATA I LOOKED AT:',
    saglikYonlendirmesi: 'HEALTH QUESTION - REFERRED TO A DOCTOR',
    dusunuyor: 'Looking at your data',
    kalanMesaj: (kalan: number) => `${kalan} messages left this month`,
    girdiErisim: 'Message to the coach',
    gonder: 'Send',
    aracAdlari: {
      antrenman_gecmisi: 'your training history',
      beslenme_gecmisi: 'your food log',
      olcum_gecmisi: 'your measurements',
      hareket_bilgisi: 'exercise data',
      besin_ara: 'the food database',
    },
    baslik: 'Coach',
    girisAlani: 'Write your question',
    tanıKoymaz:
      'That is a health question and I cannot diagnose. I suggest seeing a doctor. In the meantime I can adjust your program so it does not load that area.',
    dozVermez:
      'I cannot advise on medication or supplement dosing. Ask your doctor or pharmacist about that.',
    asiriHedefRed:
      'I cannot recommend that. Eating that little means muscle loss, hormonal disruption and regain. I can put together a plan that stays in a safe range and still moves fast.',
    kapsamDisi: 'I am here for training and nutrition, so I cannot help with that one.',
    kotaBitti: 'You have used all your coach messages for this month.',
  },
};
