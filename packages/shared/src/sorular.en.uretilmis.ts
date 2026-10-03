// ÜRETİLMİŞ DOSYA — elle düzenleme.
// Kaynak: data/sorular.en.json · Derleyici: scripts/sorulari-derle.mjs
import type { SoruBankasiCevirisi } from './degerlendirme';

export const SORU_BANKASI_EN: SoruBankasiCevirisi = {
  "locale": "en-US",
  "blocks": {
    "K": {
      "title": "You"
    },
    "G": {
      "title": "Safety"
    },
    "A": {
      "title": "Pain and limits"
    },
    "H": {
      "title": "Goal"
    },
    "E": {
      "title": "Where"
    },
    "Z": {
      "title": "Time"
    },
    "B": {
      "title": "Off the menu"
    },
    "M": {
      "title": "Kitchen"
    }
  },
  "questions": {
    "K1": {
      "text": "Your date of birth"
    },
    "K2": {
      "text": "Your biological sex",
      "options": {
        "Erkek": "Male",
        "Kadın": "Female"
      }
    },
    "K3": {
      "text": "Your height"
    },
    "K4": {
      "text": "Your current weight"
    },
    "F2": {
      "text": "Your body fat percentage — if you know it"
    },
    "K7": {
      "text": "Are you 18 or older?",
      "options": {
        "Evet": "Yes",
        "Hayır": "No"
      }
    },
    "K6": {
      "text": "Are you pregnant or breastfeeding?",
      "options": {
        "Hayır": "No",
        "Hamileyim": "I'm pregnant",
        "Emziriyorum": "I'm breastfeeding"
      }
    },
    "S1": {
      "text": "Has a doctor ever told you that you have a heart condition or high blood pressure?",
      "options": {
        "Hayır": "No",
        "Evet": "Yes"
      }
    },
    "S2": {
      "text": "Do you feel pain in your chest at rest, during the day or while exercising?",
      "options": {
        "Hayır": "No",
        "Evet": "Yes"
      }
    },
    "S3": {
      "text": "In the last 12 months, have you lost your balance because of dizziness, or lost consciousness?",
      "options": {
        "Hayır": "No",
        "Evet": "Yes"
      }
    },
    "S6": {
      "text": "Do you have a bone, joint or soft-tissue problem that exercise could make worse?",
      "options": {
        "Hayır": "No",
        "Evet": "Yes"
      }
    },
    "S7": {
      "text": "Has a doctor restricted the exercise you can do?",
      "options": {
        "Hayır": "No",
        "Evet": "Yes"
      }
    },
    "S18": {
      "text": "Have you ever had an eating disorder, or been treated for one, now or in the past?",
      "options": {
        "Hayır": "No",
        "Evet": "Yes",
        "Paylaşmak istemiyorum": "I'd rather not say"
      }
    },
    "S15": {
      "text": "Is your blood pressure under control?",
      "options": {
        "Tansiyonum normal": "My blood pressure is normal",
        "İlaçla kontrol altında": "Controlled with medication",
        "Kontrolsüz / bilmiyorum": "Not controlled / I don't know"
      }
    },
    "S17": {
      "text": "Has a doctor diagnosed you with any of these?",
      "options": {
        "Hayır": "No",
        "Bel fıtığı": "Lower back disc herniation",
        "Boyun fıtığı": "Neck disc herniation",
        "Kasık fıtığı": "Inguinal (groin) hernia",
        "Osteoporoz / kemik erimesi": "Osteoporosis / bone loss"
      }
    },
    "S8": {
      "text": "Mark the areas where you have pain or an injury"
    },
    "S11": {
      "text": "Your current pain level"
    },
    "S12": {
      "text": "Which movements make it worse?",
      "options": {
        "Öne eğilme": "Bending forward",
        "Geriye yaslanma": "Leaning back",
        "Ağırlık kaldırma": "Lifting weights",
        "Baş üstü hareket": "Overhead movements",
        "Çömelme": "Squatting",
        "Koşma / zıplama": "Running / jumping",
        "Dönme": "Twisting",
        "Uzun oturma": "Sitting for long periods",
        "Belli değil": "Not sure"
      }
    },
    "H1": {
      "text": "What is your main goal?",
      "options": {
        "Yağ kaybı": "Fat loss",
        "Kas kazanımı": "Muscle gain",
        "Güç artışı": "Strength",
        "Dayanıklılık": "Endurance",
        "Genel sağlık": "General health",
        "Sakatlık sonrası dönüş": "Coming back from an injury",
        "Spora özel performans": "Sport-specific performance",
        "Duruş ve ağrı": "Posture and pain"
      }
    },
    "H3": {
      "text": "Your target weight"
    },
    "H10": {
      "text": "How many kilograms a month do you expect to lose or gain?"
    },
    "H6": {
      "text": "The 3 areas you most want to develop"
    },
    "H2": {
      "text": "Do you have a secondary goal?",
      "options": {
        "Yok": "No",
        "Yağ kaybı": "Fat loss",
        "Kas kazanımı": "Muscle gain",
        "Güç artışı": "Strength",
        "Dayanıklılık": "Endurance",
        "Genel sağlık": "General health",
        "Duruş ve ağrı": "Posture and pain"
      }
    },
    "E1": {
      "text": "Where will you train?",
      "options": {
        "Spor salonu": "Gym",
        "Ev": "Home",
        "Açık hava": "Outdoors",
        "Karma": "A mix"
      }
    },
    "E3": {
      "text": "Select the equipment you can use",
      "options": {
        "Barbell ve plaka": "Barbell and plates",
        "Dumbbell": "Dumbbells",
        "Kettlebell": "Kettlebell",
        "Leg press": "Leg press",
        "Hack squat": "Hack squat",
        "Lat pulldown": "Lat pulldown",
        "Kablo makinesi": "Cable machine",
        "Smith makinesi": "Smith machine",
        "Barfiks barı": "Pull-up bar",
        "Dip barı": "Dip bars",
        "Düz bench": "Flat bench",
        "Eğimli bench": "Incline bench",
        "Ayarlanabilir bench": "Adjustable bench",
        "Direnç bandı": "Resistance band",
        "Koşu bandı": "Treadmill",
        "Sabit bisiklet": "Stationary bike",
        "Kürek makinesi": "Rowing machine",
        "Merdiven": "Stair climber",
        "TRX / askı": "TRX / suspension trainer",
        "Squat rack": "Squat rack",
        "Göğüs presi makinesi": "Chest press machine",
        "Sırt makinesi": "Back machine",
        "Omuz presi makinesi": "Shoulder press machine",
        "Bacak ekstansiyon / curl makinesi": "Leg extension / curl machine",
        "Baldır makinesi": "Calf machine",
        "Abduktor / adduktor makinesi": "Abductor / adductor machine",
        "Preacher bench": "Preacher bench",
        "Roma sandalyesi / hiperekstansiyon": "Roman chair / hyperextension",
        "Plyo box": "Plyo box",
        "Hiçbiri, vücut ağırlığı": "None, bodyweight only"
      }
    },
    "E5a": {
      "text": "Is your ceiling high enough for overhead movements?",
      "options": {
        "Evet": "Yes",
        "Hayır": "No",
        "Emin değilim": "Not sure"
      }
    },
    "E6": {
      "text": "Do you need to keep the noise down?",
      "options": {
        "Yok": "No",
        "Var, zıplayamam": "Yes, I can't jump",
        "Var, ağırlık bırakamam": "Yes, I can't drop weights",
        "İkisi de": "Both"
      }
    },
    "E7": {
      "text": "Your dumbbell weight range"
    },
    "E4": {
      "text": "Is your gym crowded? Do you have to wait for machines?",
      "options": {
        "Hiç beklemem": "I never wait",
        "Bazen beklerim": "I sometimes wait",
        "Sık sık beklerim": "I often wait",
        "Sürekli kalabalık": "It's always crowded"
      }
    },
    "E8": {
      "text": "Do you have a training partner?",
      "options": {
        "Hayır": "No",
        "Bazen": "Sometimes",
        "Evet, düzenli": "Yes, regularly"
      }
    },
    "A1": {
      "text": "How long have you been lifting weights regularly?",
      "options": {
        "Hiç yapmadım": "Never",
        "6 aydan az": "Less than 6 months",
        "6-12 ay": "6-12 months",
        "1-3 yıl": "1-3 years",
        "3-5 yıl": "3-5 years",
        "5 yıldan fazla": "More than 5 years"
      }
    },
    "Z1": {
      "text": "How many days a week can you train? Not what you'd like — what you can really do.",
      "options": {
        "2 gün": "2 days",
        "3 gün": "3 days",
        "4 gün": "4 days",
        "5 gün": "5 days",
        "6 gün": "6 days"
      }
    },
    "Z2": {
      "text": "How many minutes can you give a session?",
      "options": {
        "30 dakika": "30 minutes",
        "45 dakika": "45 minutes",
        "60 dakika": "60 minutes",
        "75 dakika": "75 minutes",
        "90 dakika ve üzeri": "90 minutes or more"
      }
    },
    "Z3": {
      "text": "Which days work for you?",
      "options": {
        "Pazartesi": "Monday",
        "Salı": "Tuesday",
        "Çarşamba": "Wednesday",
        "Perşembe": "Thursday",
        "Cuma": "Friday",
        "Cumartesi": "Saturday",
        "Pazar": "Sunday"
      }
    },
    "Y1": {
      "text": "How many hours do you sleep a night, on average?",
      "options": {
        "5 saatten az": "Less than 5 hours",
        "5-6 saat": "5-6 hours",
        "6-7 saat": "6-7 hours",
        "7-8 saat": "7-8 hours",
        "8 saatten fazla": "More than 8 hours"
      }
    },
    "Y4": {
      "text": "What is your work like?",
      "options": {
        "Masa başı, çoğunlukla oturarak": "Desk job, mostly sitting",
        "Karma, biraz ayakta": "Mixed, some standing",
        "Ayakta çalışıyorum": "I'm on my feet",
        "Fiziksel iş yapıyorum": "Physical work",
        "Çalışmıyorum": "I'm not working"
      }
    },
    "A8": {
      "text": "Which of these lifts can you do with confident technique?",
      "options": {
        "Barbell squat": "Barbell squat",
        "Barbell deadlift": "Barbell deadlift",
        "Barbell bench press": "Barbell bench press",
        "Barbell omuz presi": "Barbell overhead press",
        "Barfiks": "Pull-up",
        "Hiçbiri": "None"
      }
    },
    "A5": {
      "text": "Your best set on the main lifts (if you know it)",
      "lifts": {
        "Squat": "Squat",
        "Bench press": "Bench press",
        "Deadlift": "Deadlift",
        "Omuz presi": "Overhead press"
      }
    },
    "A6": {
      "text": "If you don't know it: the weight you can lift for 8-10 reps on these lifts",
      "lifts": {
        "Squat": "Squat",
        "Bench press": "Bench press",
        "Deadlift": "Deadlift",
        "Omuz presi": "Overhead press"
      }
    },
    "A7": {
      "text": "Your bodyweight capacity"
    },
    "T2": {
      "text": "Is there an exercise you never want to do?",
      "options": {
        "Yok": "No",
        "Burpee": "Burpee",
        "Deadlift": "Deadlift",
        "Squat": "Squat",
        "Koşu": "Running",
        "Ip atlama": "Jump rope",
        "Baş üstü pres": "Overhead press",
        "Barfiks": "Pull-ups",
        "Diğer": "Other"
      }
    },
    "Y5": {
      "text": "Do you know your daily step count?",
      "options": {
        "3.000'den az": "Under 3,000",
        "3.000-6.000": "3,000-6,000",
        "6.000-10.000": "6,000-10,000",
        "10.000'den fazla": "Over 10,000",
        "Bilmiyorum": "I don't know"
      }
    },
    "Y2": {
      "text": "How would you rate your sleep quality?"
    },
    "Y6": {
      "text": "Your overall stress level"
    },
    "B9": {
      "text": "Do you have any food allergies?",
      "options": {
        "Yok": "None",
        "Fıstık": "Peanuts",
        "Ağaç kuruyemişleri": "Tree nuts",
        "Süt": "Milk",
        "Yumurta": "Eggs",
        "Balık": "Fish",
        "Kabuklu deniz ürünleri": "Shellfish",
        "Soya": "Soy",
        "Buğday": "Wheat",
        "Susam": "Sesame",
        "Diğer": "Other"
      }
    },
    "B10": {
      "text": "Do you have any food intolerances?",
      "options": {
        "Yok": "None",
        "Laktoz": "Lactose",
        "Gluten": "Gluten",
        "FODMAP": "FODMAP",
        "Fruktoz": "Fructose",
        "Histamin": "Histamine"
      }
    },
    "B11": {
      "text": "Do you follow any religious or ethical diet?",
      "options": {
        "Yok": "None",
        "Helal": "Halal",
        "Domuz yemem": "No pork",
        "Vejetaryen": "Vegetarian",
        "Vegan": "Vegan",
        "Pesketaryen": "Pescatarian"
      }
    },
    "B13": {
      "text": "Any foods you really dislike and won't eat?",
      "options": {
        "Yok": "None",
        "Balık": "Fish",
        "Karaciğer / sakatat": "Liver / offal",
        "Kuzu eti": "Lamb",
        "Mantar": "Mushrooms",
        "Patlıcan": "Eggplant",
        "Bakliyat": "Legumes",
        "Süt": "Milk",
        "Yoğurt": "Yogurt",
        "Zeytin": "Olives",
        "Acı yiyecekler": "Spicy food",
        "Diğer": "Other"
      }
    },
    "B14": {
      "text": "Which food could you never give up?"
    },
    "B5": {
      "text": "Who prepares your meals?",
      "options": {
        "Kendim": "I do",
        "Ailem": "My family",
        "Dışarıdan alıyorum": "I buy them ready-made",
        "Karışık": "A mix"
      }
    },
    "B7": {
      "text": "How much time a day can you spend on cooking?",
      "options": {
        "Hiç pişiremem": "I can't cook at all",
        "15 dakikaya kadar": "Up to 15 minutes",
        "30 dakikaya kadar": "Up to 30 minutes",
        "45 dakika ve üzeri": "45 minutes or more"
      }
    },
    "B8": {
      "text": "What is your food budget like?",
      "options": {
        "Çok kısıtlı": "Very tight",
        "Orta": "Moderate",
        "Rahat": "Comfortable",
        "Kısıt yok": "No limit"
      }
    },
    "B12": {
      "text": "Do you fast during Ramadan?",
      "options": {
        "Evet": "Yes",
        "Hayır": "No",
        "Bazı günler": "Some days"
      }
    }
  }
};
