// ÜRETİLMİŞ DOSYA — elle düzenleme.
// Kaynak: data/kaynak/hareketler/*.mjs · Derleyici: scripts/hareketleri-derle.mjs
import type { Hareket } from './domain';

export const HAREKET_KATALOGU: readonly Hareket[] = [
  {
    "id": "ab-wheel",
    "ad_tr": "Karın tekerleği",
    "ad_en": "Ab Wheel Rollout",
    "birincil_kas": [
      "karin"
    ],
    "ikincil_kas": [
      "bel",
      "sirt"
    ],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "bel_fitigi",
      "omuz_instabilite"
    ],
    "teknik_zorluk": 4,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0
    },
    "alternatifler": [
      "plank",
      "dead-bug",
      "kablo-crunch"
    ],
    "talimat_tr": [
      "Diz üstü çök, tekerleği önünde tut.",
      "Karnını sık, belini yuvarlamadan ileri yuvarlan.",
      "Belinin çöktüğünü hissettiğin noktadan öteye gitme.",
      "Karnınla çekerek geri dön.",
      "Duvara doğru çalışarak menzili güvenle sınırlayabilirsin."
    ]
  },
  {
    "id": "arnold-press",
    "ad_tr": "Arnold press",
    "ad_en": "Arnold Press",
    "birincil_kas": [
      "on_omuz"
    ],
    "ikincil_kas": [
      "yan_omuz",
      "triceps"
    ],
    "ekipman": [
      "dumbbell",
      "ayarlanabilir_bench"
    ],
    "patern": "itme_dikey",
    "kontrendikasyon": [
      "omuz_sikismasi",
      "omuz_instabilite"
    ],
    "teknik_zorluk": 3,
    "sfr": 4,
    "eksenel_yuk": "dusuk",
    "bas_ustu": true,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0.35
    },
    "alternatifler": [
      "omuz-presi-dumbbell",
      "makine-omuz-presi",
      "yan-lateral-raise"
    ],
    "talimat_tr": [
      "Dumbbell’ları avuç içleri sana bakacak şekilde çene hizasında tut.",
      "Yukarı iterken bilekleri çevir, tepede avuç içleri öne baksın.",
      "İnerken ters yönde çevir.",
      "Dönüş yumuşak olsun, ani çevirme.",
      "Omuz sıkışması geçmişi varsa düz dumbbell presi tercih et."
    ]
  },
  {
    "id": "asili-diz-cekme",
    "ad_tr": "Asılı diz çekme",
    "ad_en": "Hanging Knee Raise",
    "birincil_kas": [
      "karin"
    ],
    "ikincil_kas": [
      "onkol"
    ],
    "ekipman": [
      "barfiks_bari"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "omuz_instabilite"
    ],
    "teknik_zorluk": 3,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": true,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0
    },
    "alternatifler": [
      "ters-mekik",
      "kablo-crunch",
      "dead-bug"
    ],
    "talimat_tr": [
      "Bara asıl, omuzlarını aşağı çek.",
      "Dizlerini göğsüne doğru kaldır.",
      "Kalçanı hafif yukarı kıvır; hareketin son kısmı budur.",
      "Sallanmayı durdur; her tekrar sıfırdan başlasın.",
      "Kolaylaştığında bacakları düz kaldırarak zorlaştır."
    ]
  },
  {
    "id": "ayak-bilegi-mobilite",
    "ad_tr": "Ayak bileği mobilite",
    "ad_en": "Ankle Dorsiflexion Drill",
    "birincil_kas": [
      "baldir"
    ],
    "ikincil_kas": [],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "isinma": true,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0
    },
    "alternatifler": [
      "vucut-agirligi-baldir",
      "kalca-90-90",
      "kedi-deve"
    ],
    "talimat_tr": [
      "Duvarın önünde diz üstü hamle pozisyonuna geç.",
      "Ön ayağın parmakları duvardan bir karış uzakta olsun.",
      "Topuğunu yerden kaldırmadan dizini duvara doğru it.",
      "Değdiriyorsan ayağını biraz daha geri al.",
      "Squat derinliği ayak bileğinden kısıtlıysa buradan başla."
    ]
  },
  {
    "id": "ayakta-baldir",
    "ad_tr": "Ayakta baldır kaldırma",
    "ad_en": "Standing Calf Raise",
    "birincil_kas": [
      "baldir"
    ],
    "ikincil_kas": [],
    "ekipman": [
      "makine_baldir"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "ayak_bilegi_kisitli"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "orta",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0.6
    },
    "alternatifler": [
      "oturarak-baldir",
      "dumbbell-baldir",
      "vucut-agirligi-baldir"
    ],
    "talimat_tr": [
      "Ayak ön kısmını platforma bas, topuklar boşta kalsın.",
      "Topuklarını aşağı indir, baldırında gerilme hisset.",
      "Parmak uçlarına yüksel, tepede iki saniye sık.",
      "Zıplayarak yapma; her tekrar kontrollü olsun.",
      "Tam menzil kullan; yarım tekrar bu kasta işe yaramaz."
    ]
  },
  {
    "id": "bant-ile-ayirma",
    "ad_tr": "Bantla omuz ayırma",
    "ad_en": "Band Pull-apart",
    "birincil_kas": [
      "arka_omuz"
    ],
    "ikincil_kas": [
      "trapez"
    ],
    "ekipman": [
      "direnc_bandi"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0
    },
    "alternatifler": [
      "face-pull",
      "ters-fly-dumbbell",
      "makine-arka-omuz"
    ],
    "talimat_tr": [
      "Bandı omuz genişliğinde, kollar önde uzatılmış şekilde tut.",
      "Bandı göğsüne doğru gererek iki yana aç.",
      "Kürek kemiklerini birbirine sıkıştır.",
      "Omuzlarını kulaklara doğru kaldırma.",
      "Kontrollü geri bırak; bandın seni geri çekmesine izin verme."
    ]
  },
  {
    "id": "bant-omuz-rotasyon",
    "ad_tr": "Bantla dış rotasyon",
    "ad_en": "Band External Rotation",
    "birincil_kas": [
      "arka_omuz"
    ],
    "ikincil_kas": [],
    "ekipman": [
      "direnc_bandi"
    ],
    "patern": "rotasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0
    },
    "alternatifler": [
      "face-pull",
      "ters-fly-dumbbell",
      "bant-ile-ayirma"
    ],
    "talimat_tr": [
      "Bandı göbek hizasında bir yere sabitle.",
      "Dirseğini gövdene yapıştır, 90 derece bükülü tut.",
      "Önkolunu dışa doğru çevir; dirseğin gövdeden ayrılmasın.",
      "Kontrollü geri getir.",
      "Bu bir güç hareketi değil; omuz eklemi sağlığı için yapılır."
    ]
  },
  {
    "id": "bant-yan-yuruyus",
    "ad_tr": "Bantla yan yürüyüş",
    "ad_en": "Banded Lateral Walk",
    "birincil_kas": [
      "kalca"
    ],
    "ikincil_kas": [
      "quadriceps"
    ],
    "ekipman": [
      "direnc_bandi"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0
    },
    "alternatifler": [
      "kalca-abduksiyon",
      "glute-bridge",
      "hip-thrust"
    ],
    "talimat_tr": [
      "Bandı dizlerinin hemen üstüne veya ayak bileklerine tak.",
      "Hafif squat pozisyonuna in.",
      "Yana doğru adım at, bandın gerginliğini koru.",
      "Dizlerinin içe çökmesine izin verme.",
      "Isınma ve kalça aktivasyonu için idealdir."
    ]
  },
  {
    "id": "barbell-bench-press",
    "ad_tr": "Barbell bench press",
    "ad_en": "Barbell Bench Press",
    "birincil_kas": [
      "gogus"
    ],
    "ikincil_kas": [
      "triceps",
      "on_omuz"
    ],
    "ekipman": [
      "barbell",
      "duz_bench"
    ],
    "patern": "itme_yatay",
    "kontrendikasyon": [
      "omuz_sikismasi",
      "omuz_instabilite"
    ],
    "teknik_zorluk": 3,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": true,
    "spotter": true,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 1
    },
    "alternatifler": [
      "dumbbell-bench-press",
      "makine-gogus-presi",
      "sinav"
    ],
    "talimat_tr": [
      "Sırtın bench’e yapışık, kürek kemiklerini geriye ve aşağı sıkıştır.",
      "Ayaklarını yere sağlam bas, kalçan bench’ten kalkmasın.",
      "Barı göğüs alt kısmına, meme hizasına indir.",
      "Dirseklerin gövdeyle yaklaşık 45 derece açı yapsın, yanlara tam açılmasın.",
      "Bar göğsüne değdiğinde durma, kontrollü şekilde yukarı it."
    ]
  },
  {
    "id": "barbell-curl",
    "ad_tr": "Barbell biceps curl",
    "ad_en": "Barbell Curl",
    "birincil_kas": [
      "biceps"
    ],
    "ikincil_kas": [
      "onkol"
    ],
    "ekipman": [
      "barbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "dirsek_tendinit",
      "bilek_agrisi"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.4
    },
    "alternatifler": [
      "biceps-curl",
      "kablo-biceps-curl",
      "ez-bar-curl"
    ],
    "talimat_tr": [
      "Barı omuz genişliğinde, avuç içleri yukarı bakacak şekilde kavra.",
      "Dirseklerini gövdene sabitle.",
      "Barı yukarı kaldır, gövdeni geriye yatırma.",
      "Yukarıda sık, kontrollü indir.",
      "Bileğin ağrıyorsa EZ bar kullan."
    ]
  },
  {
    "id": "barbell-deadlift",
    "ad_tr": "Barbell deadlift",
    "ad_en": "Conventional Deadlift",
    "birincil_kas": [
      "hamstring"
    ],
    "ikincil_kas": [
      "kalca",
      "bel",
      "sirt",
      "trapez"
    ],
    "ekipman": [
      "barbell"
    ],
    "patern": "kalca_baskin",
    "kontrendikasyon": [
      "bel_fitigi",
      "boyun_fitigi",
      "tansiyon_kontrolsuz"
    ],
    "teknik_zorluk": 5,
    "sfr": 3,
    "eksenel_yuk": "yuksek",
    "bas_ustu": false,
    "gurultu": true,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 1
    },
    "alternatifler": [
      "romanian-deadlift",
      "hip-thrust",
      "trap-bar-deadlift"
    ],
    "talimat_tr": [
      "Bar ayaklarının ortasında, kaval kemiğine yakın dursun.",
      "Kalçandan eğil, barı omuz genişliğinde kavra.",
      "Göğsünü yukarı çek, belini düzleştir; sırt yuvarlanmasın.",
      "Bacaklarınla yeri iterek kalk, bar vücuduna yakın kalsın.",
      "Tepede kalçanı öne kilitle; geriye yaslanma."
    ]
  },
  {
    "id": "barbell-omuz-presi",
    "ad_tr": "Barbell omuz presi",
    "ad_en": "Standing Barbell Overhead Press",
    "birincil_kas": [
      "on_omuz"
    ],
    "ikincil_kas": [
      "triceps",
      "yan_omuz",
      "karin"
    ],
    "ekipman": [
      "barbell"
    ],
    "patern": "itme_dikey",
    "kontrendikasyon": [
      "omuz_sikismasi",
      "bel_fitigi",
      "boyun_fitigi",
      "tansiyon_kontrolsuz"
    ],
    "teknik_zorluk": 4,
    "sfr": 4,
    "eksenel_yuk": "yuksek",
    "bas_ustu": true,
    "gurultu": true,
    "spotter": true,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 1
    },
    "alternatifler": [
      "omuz-presi-dumbbell",
      "makine-omuz-presi",
      "yan-lateral-raise"
    ],
    "talimat_tr": [
      "Barı köprücük kemiği hizasında, omuz genişliğinde kavra.",
      "Karnını ve kalçanı sık; gövden tek parça olsun.",
      "Barı yukarı iterken başını hafif geriye çek, bar yüzünü sıyırsın.",
      "Bar tepede kulaklarının hizasına gelsin, öne kalmasın.",
      "Belini geriye kavislendirerek itme; bu bel için en yaygın hata."
    ]
  },
  {
    "id": "barbell-row",
    "ad_tr": "Barbell row",
    "ad_en": "Barbell Bent-over Row",
    "birincil_kas": [
      "sirt"
    ],
    "ikincil_kas": [
      "arka_omuz",
      "biceps",
      "bel"
    ],
    "ekipman": [
      "barbell"
    ],
    "patern": "cekme_yatay",
    "kontrendikasyon": [
      "bel_fitigi"
    ],
    "teknik_zorluk": 4,
    "sfr": 4,
    "eksenel_yuk": "orta",
    "bas_ustu": false,
    "gurultu": true,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 1
    },
    "alternatifler": [
      "dumbbell-row",
      "kablo-oturarak-cekis",
      "makine-row"
    ],
    "talimat_tr": [
      "Kalçandan öne eğil, gövden yere 45 derece civarında olsun.",
      "Belini düz tut; sırtın yuvarlanıyorsa ağırlığı azalt.",
      "Barı göbek hizasına çek, dirsekleri gövdeye yakın tut.",
      "Yukarıda kürek kemiklerini birbirine sıkıştır.",
      "İndirirken barı serbest bırakma, kontrollü indir."
    ]
  },
  {
    "id": "barbell-squat",
    "ad_tr": "Barbell squat",
    "ad_en": "Barbell Back Squat",
    "birincil_kas": [
      "quadriceps"
    ],
    "ikincil_kas": [
      "kalca",
      "hamstring",
      "bel"
    ],
    "ekipman": [
      "barbell",
      "squat_rack"
    ],
    "patern": "diz_baskin",
    "kontrendikasyon": [
      "bel_fitigi",
      "diz_menisküs",
      "diz_patellofemoral",
      "ayak_bilegi_kisitli",
      "tansiyon_kontrolsuz"
    ],
    "teknik_zorluk": 4,
    "sfr": 4,
    "eksenel_yuk": "yuksek",
    "bas_ustu": false,
    "gurultu": true,
    "spotter": true,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 1
    },
    "alternatifler": [
      "hack-squat",
      "leg-press",
      "goblet-squat"
    ],
    "talimat_tr": [
      "Barı trapezinin üstüne yerleştir, ensene değil.",
      "Ayaklar omuz genişliğinde, parmak uçları hafif dışa dönük.",
      "Karnını sık, göğsünü yukarıda tut.",
      "Kalçanı geriye ve aşağı götürerek in; dizlerin ayak parmakları yönünde açılsın.",
      "Uyluk yere paralel olana kadar in, belin yuvarlanmaya başladığı noktayı geçme."
    ]
  },
  {
    "id": "barfiks",
    "ad_tr": "Barfiks",
    "ad_en": "Pull-up",
    "birincil_kas": [
      "sirt"
    ],
    "ikincil_kas": [
      "biceps",
      "arka_omuz",
      "onkol"
    ],
    "ekipman": [
      "barfiks_bari"
    ],
    "patern": "cekme_dikey",
    "kontrendikasyon": [
      "omuz_instabilite",
      "dirsek_tendinit"
    ],
    "teknik_zorluk": 4,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": true,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0
    },
    "alternatifler": [
      "lat-pulldown",
      "yardimli-barfiks",
      "kablo-oturarak-cekis"
    ],
    "talimat_tr": [
      "Barı omuz genişliğinden biraz açık, avuç içleri ileri bakacak şekilde kavra.",
      "Asılı dururken omuzlarını aşağı çek, gövden sallanmasın.",
      "Dirseklerini aşağı ve geriye çekerek göğsünü bara doğru götür.",
      "Çenen barı geçtiğinde bir an dur, sonra kontrollü in.",
      "Aşağıda kolları tam gevşetme, omuz ekleminde gerginliği koru."
    ]
  },
  {
    "id": "bench-dip",
    "ad_tr": "Bench dip",
    "ad_en": "Bench Dip",
    "birincil_kas": [
      "triceps"
    ],
    "ikincil_kas": [
      "on_omuz"
    ],
    "ekipman": [
      "duz_bench"
    ],
    "patern": "itme_yatay",
    "kontrendikasyon": [
      "omuz_sikismasi",
      "omuz_instabilite",
      "bilek_agrisi"
    ],
    "teknik_zorluk": 1,
    "sfr": 3,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0
    },
    "alternatifler": [
      "dip-triceps",
      "triceps-pushdown",
      "sinav"
    ],
    "talimat_tr": [
      "Bench’in kenarına otur, ellerini kalçanın yanına koy.",
      "Kalçanı bench’ten öne kaydır, bacaklarını uzat.",
      "Dirseklerini geriye bükerek in.",
      "Üst kol yere paralel olunca dur; daha derine inme.",
      "Omuz önünde rahatsızlık varsa dizlerini bük ve menzili kısalt."
    ]
  },
  {
    "id": "biceps-curl",
    "ad_tr": "Dumbbell biceps curl",
    "ad_en": "Dumbbell Biceps Curl",
    "birincil_kas": [
      "biceps"
    ],
    "ikincil_kas": [
      "onkol"
    ],
    "ekipman": [
      "dumbbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "dirsek_tendinit"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 1,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.2
    },
    "alternatifler": [
      "barbell-curl",
      "kablo-biceps-curl",
      "cekic-curl"
    ],
    "talimat_tr": [
      "Dumbbell’ları yanlarda, avuç içleri öne bakacak şekilde tut.",
      "Dirseklerini gövdene sabitle; öne savurma.",
      "Ağırlığı yukarı kaldırırken bileğini bükme.",
      "Yukarıda bir an sık, sonra yavaş indir.",
      "Aşağıda kolları tam gevşetme, gerginliği koru."
    ]
  },
  {
    "id": "bilek-curl",
    "ad_tr": "Bilek curl",
    "ad_en": "Wrist Curl",
    "birincil_kas": [
      "onkol"
    ],
    "ikincil_kas": [],
    "ekipman": [
      "dumbbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "bilek_agrisi"
    ],
    "teknik_zorluk": 1,
    "sfr": 3,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 1,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.1
    },
    "alternatifler": [
      "ters-curl",
      "cekic-curl",
      "ciftci-yuruyusu"
    ],
    "talimat_tr": [
      "Önkolunu uyluğuna veya bench’e yasla, bilek kenardan sarksın.",
      "Avuç içi yukarı bakacak şekilde dumbbell’ı tut.",
      "Bileği aşağı bırak, sonra yukarı kıvır.",
      "Menzil kısa; hafif ağırlıkla yüksek tekrar yap.",
      "Bilek ağrın varsa bu hareketi atla."
    ]
  },
  {
    "id": "bird-dog",
    "ad_tr": "Bird dog",
    "ad_en": "Bird Dog",
    "birincil_kas": [
      "bel"
    ],
    "ikincil_kas": [
      "karin",
      "kalca"
    ],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0
    },
    "alternatifler": [
      "dead-bug",
      "plank",
      "glute-bridge"
    ],
    "talimat_tr": [
      "Emekleme pozisyonuna geç; eller omuz, dizler kalça altında.",
      "Karşıt kol ve bacağı aynı anda uzat.",
      "Sırtın düz kalsın, kalçan yana dönmesin.",
      "Üç saniye tut, sonra değiştir.",
      "Bel ağrısında en sık önerilen egzersizlerden biridir."
    ]
  },
  {
    "id": "boyun-esnetme",
    "ad_tr": "Boyun esnetme",
    "ad_en": "Neck Stretch",
    "birincil_kas": [
      "trapez"
    ],
    "ikincil_kas": [],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "isinma": true,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0
    },
    "alternatifler": [
      "duvar-kaydirma",
      "torasik-rotasyon",
      "kol-cevirme"
    ],
    "talimat_tr": [
      "Başını yavaşça bir omzuna doğru yatır.",
      "Elini başının üstüne koyup hafifçe destekle; zorla çekme.",
      "20-30 saniye tut.",
      "Diğer tarafa geç.",
      "Ani ve hızlı hareketten kaçın."
    ]
  },
  {
    "id": "bulgarian-split-squat",
    "ad_tr": "Bulgar split squat",
    "ad_en": "Bulgarian Split Squat",
    "birincil_kas": [
      "quadriceps"
    ],
    "ikincil_kas": [
      "kalca",
      "hamstring"
    ],
    "ekipman": [
      "dumbbell",
      "duz_bench"
    ],
    "patern": "diz_baskin",
    "kontrendikasyon": [
      "diz_patellofemoral"
    ],
    "teknik_zorluk": 3,
    "sfr": 5,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0.25
    },
    "alternatifler": [
      "lunge",
      "goblet-squat",
      "leg-press"
    ],
    "talimat_tr": [
      "Arka ayağını bench’in üstüne koy, ön ayağın bir adım ileride olsun.",
      "Gövden dik kalsın, öne eğilme.",
      "Ön dizin ayak bileğinin üstünde kalacak şekilde aşağı in.",
      "Arka dizin yere yaklaşsın ama değmesin.",
      "Ön ayağın topuğuyla yeri iterek kalk."
    ]
  },
  {
    "id": "burpee",
    "ad_tr": "Burpee",
    "ad_en": "Burpee",
    "birincil_kas": [
      "quadriceps"
    ],
    "ikincil_kas": [
      "gogus",
      "on_omuz",
      "karin"
    ],
    "ekipman": [],
    "patern": "tasima",
    "kontrendikasyon": [
      "bel_fitigi",
      "diz_menisküs",
      "bilek_agrisi",
      "tansiyon_kontrolsuz"
    ],
    "teknik_zorluk": 3,
    "sfr": 2,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": true,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "pliometrik": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0
    },
    "alternatifler": [
      "mountain-climber",
      "kettlebell-swing",
      "ip-atlama"
    ],
    "talimat_tr": [
      "Çömel, ellerini yere koy.",
      "Ayaklarını geriye at, şınav pozisyonuna geç.",
      "Ayaklarını geri topla ve yukarı zıpla.",
      "Yorgunlukta şeklin bozulur; şekil bozulunca seti bitir.",
      "Uyaran/yorgunluk oranı düşüktür; kas geliştirmek için verimli değildir."
    ]
  },
  {
    "id": "cekic-curl",
    "ad_tr": "Çekiç curl",
    "ad_en": "Hammer Curl",
    "birincil_kas": [
      "biceps"
    ],
    "ikincil_kas": [
      "onkol"
    ],
    "ekipman": [
      "dumbbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "dirsek_tendinit"
    ],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 1,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.2
    },
    "alternatifler": [
      "biceps-curl",
      "kablo-biceps-curl",
      "ters-curl"
    ],
    "talimat_tr": [
      "Dumbbell’ları avuç içleri birbirine bakacak şekilde tut.",
      "Dirseklerini sabitle, yukarı kaldır.",
      "Bilek pozisyonu hiç değişmesin.",
      "Bu varyant önkolu ve kolun dış kısmını daha çok çalıştırır.",
      "Dirsek ağrısı olanlar genelde bu varyantı daha rahat bulur."
    ]
  },
  {
    "id": "ciftci-yuruyusu",
    "ad_tr": "Çiftçi yürüyüşü",
    "ad_en": "Farmer’s Walk",
    "birincil_kas": [
      "onkol"
    ],
    "ikincil_kas": [
      "trapez",
      "karin",
      "bel"
    ],
    "ekipman": [
      "dumbbell"
    ],
    "patern": "tasima",
    "kontrendikasyon": [
      "bel_fitigi"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "orta",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0.25
    },
    "alternatifler": [
      "bilek-curl",
      "shrug-dumbbell",
      "plank"
    ],
    "talimat_tr": [
      "İki yanına ağır dumbbell al.",
      "Omuzlarını geriye çek, göğsünü aç.",
      "Kısa ve kontrollü adımlarla düz yürü.",
      "Karnını sık, gövden yana yatmasın.",
      "Mesafe veya süre hedefle çalış: 30-40 saniye tipiktir."
    ]
  },
  {
    "id": "dead-bug",
    "ad_tr": "Dead bug",
    "ad_en": "Dead Bug",
    "birincil_kas": [
      "karin"
    ],
    "ikincil_kas": [
      "bel"
    ],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0
    },
    "alternatifler": [
      "plank",
      "yan-plank",
      "ters-mekik"
    ],
    "talimat_tr": [
      "Sırtüstü uzan, kolları tavana uzat, dizleri 90 derece bük.",
      "Belini yere yapıştır ve hareket boyunca orada tut.",
      "Karşıt kol ve bacağı yavaşça yere doğru uzat.",
      "Belin yerden kalkarsa menzili kısalt.",
      "Bel ağrısı olanlar için en güvenli karın hareketlerinden biridir."
    ]
  },
  {
    "id": "dik-cekis-kablo",
    "ad_tr": "Kabloda dik çekiş",
    "ad_en": "Cable Upright Row",
    "birincil_kas": [
      "yan_omuz"
    ],
    "ikincil_kas": [
      "trapez",
      "biceps"
    ],
    "ekipman": [
      "kablo_makinesi"
    ],
    "patern": "cekme_dikey",
    "kontrendikasyon": [
      "omuz_sikismasi",
      "omuz_instabilite"
    ],
    "teknik_zorluk": 2,
    "sfr": 3,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0.35
    },
    "alternatifler": [
      "yan-lateral-raise",
      "face-pull",
      "shrug-dumbbell"
    ],
    "talimat_tr": [
      "Makarayı en aşağı ayarla, düz barı omuz genişliğinde kavra.",
      "Barı göğsünün ortasına kadar çek, dirsekler yukarı gitsin.",
      "Dirseklerini omuz hizasının üstüne çıkarma.",
      "Omzunda sıkışma hissediyorsan bu hareketi yapma.",
      "Geniş kavrama omuz için daha güvenlidir."
    ]
  },
  {
    "id": "dinamik-bacak-savurma",
    "ad_tr": "Dinamik bacak savurma",
    "ad_en": "Leg Swing",
    "birincil_kas": [
      "kalca"
    ],
    "ikincil_kas": [
      "hamstring"
    ],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "isinma": true,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0
    },
    "alternatifler": [
      "kalca-fleksor-esnetme",
      "bant-yan-yuruyus",
      "kalca-90-90"
    ],
    "talimat_tr": [
      "Bir duvara veya rack’e tutun.",
      "Bir bacağını öne ve arkaya rahat bir genlikte savur.",
      "Gövdeni sabit tut, belini kullanma.",
      "Her tarafta 10 tekrar öne-arkaya, 10 tekrar yana yap.",
      "Bacak günü öncesi ısınmanın standart parçasıdır."
    ]
  },
  {
    "id": "dip-gogus",
    "ad_tr": "Dip (göğüs odaklı)",
    "ad_en": "Chest Dip",
    "birincil_kas": [
      "gogus"
    ],
    "ikincil_kas": [
      "triceps",
      "on_omuz"
    ],
    "ekipman": [
      "dip_bari"
    ],
    "patern": "itme_yatay",
    "kontrendikasyon": [
      "omuz_sikismasi",
      "omuz_instabilite"
    ],
    "teknik_zorluk": 4,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0
    },
    "alternatifler": [
      "sinav",
      "makine-gogus-presi",
      "dumbbell-bench-press"
    ],
    "talimat_tr": [
      "Barlara çık, kollarını kilitle, omuzlarını kulaklardan uzaklaştır.",
      "Göğüs için gövdeni hafif öne eğ, dizlerini geriye al.",
      "Üst kolun yere paralel olana kadar in, daha derine inme.",
      "Omzunda batma hissi varsa bu hareketi yapma, alternatifine geç.",
      "Kolaylaştığında bele ağırlık kemeri takarak zorlaştır."
    ]
  },
  {
    "id": "dip-triceps",
    "ad_tr": "Dip (triceps odaklı)",
    "ad_en": "Triceps Dip",
    "birincil_kas": [
      "triceps"
    ],
    "ikincil_kas": [
      "gogus",
      "on_omuz"
    ],
    "ekipman": [
      "dip_bari"
    ],
    "patern": "itme_yatay",
    "kontrendikasyon": [
      "omuz_sikismasi",
      "omuz_instabilite"
    ],
    "teknik_zorluk": 3,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0
    },
    "alternatifler": [
      "triceps-pushdown",
      "bench-dip",
      "yatarak-triceps-ekstansiyon"
    ],
    "talimat_tr": [
      "Barlara çık, gövdeni mümkün olduğunca dik tut.",
      "Dirseklerini geriye doğru bük, yanlara açma.",
      "Üst kol yere paralel olunca dur.",
      "Yukarı iterken triceps’i sık.",
      "Omuzda batma varsa bu hareketi yapma."
    ]
  },
  {
    "id": "disarida-yuruyus",
    "ad_tr": "Dışarıda tempolu yürüyüş",
    "ad_en": "Outdoor Brisk Walk",
    "birincil_kas": [
      "baldir"
    ],
    "ikincil_kas": [
      "quadriceps",
      "kalca"
    ],
    "ekipman": [],
    "patern": "tasima",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0
    },
    "alternatifler": [
      "kosu-bandi-tempolu",
      "sabit-bisiklet",
      "merdiven-cikma"
    ],
    "talimat_tr": [
      "Konuşabileceğin ama şarkı söyleyemeyeceğin bir tempo tuttur.",
      "Yokuşlu güzergâh seçersen aynı sürede daha fazla iş yaparsın.",
      "Günlük adım sayın antrenman dışı kalori yakımının en büyük parçasıdır.",
      "Ekipman gerektirmez, toparlanmayı bozmaz.",
      "Kardiyoyu sevmeyenler için en sürdürülebilir seçenek budur."
    ]
  },
  {
    "id": "dizden-sinav",
    "ad_tr": "Dizden şınav",
    "ad_en": "Knee Push-up",
    "birincil_kas": [
      "gogus"
    ],
    "ikincil_kas": [
      "triceps",
      "on_omuz"
    ],
    "ekipman": [],
    "patern": "itme_yatay",
    "kontrendikasyon": [
      "bilek_agrisi"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0
    },
    "alternatifler": [
      "sinav",
      "egimli-sinav",
      "makine-gogus-presi"
    ],
    "talimat_tr": [
      "Dizlerini yere koy, ayaklarını havada çaprazla.",
      "Dizden başa kadar gövden düz bir çizgi olsun, kalçan geriye kaçmasın.",
      "Göğsünü yere yaklaştır, dirseklerin gövdeye yakın kalsın.",
      "Yukarı iterken avuç içlerinle yeri it.",
      "Dizinin altına bir havlu koyabilirsin."
    ]
  },
  {
    "id": "dumbbell-baldir",
    "ad_tr": "Dumbbell ile baldır kaldırma",
    "ad_en": "Dumbbell Calf Raise",
    "birincil_kas": [
      "baldir"
    ],
    "ikincil_kas": [],
    "ekipman": [
      "dumbbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "ayak_bilegi_kisitli"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0.25
    },
    "alternatifler": [
      "ayakta-baldir",
      "vucut-agirligi-baldir",
      "oturarak-baldir"
    ],
    "talimat_tr": [
      "Dumbbell’ları yanlarda tut.",
      "Ayak ön kısmını bir kalınlığa (kitap, plaka) bas.",
      "Topuklarını indir, sonra parmak uçlarına yüksel.",
      "Tepede iki saniye sık.",
      "Tek ayakla yaparak zorlaştırabilirsin."
    ]
  },
  {
    "id": "dumbbell-bench-press",
    "ad_tr": "Dumbbell bench press",
    "ad_en": "Dumbbell Bench Press",
    "birincil_kas": [
      "gogus"
    ],
    "ikincil_kas": [
      "triceps",
      "on_omuz"
    ],
    "ekipman": [
      "dumbbell",
      "duz_bench"
    ],
    "patern": "itme_yatay",
    "kontrendikasyon": [
      "omuz_instabilite"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0.4
    },
    "alternatifler": [
      "barbell-bench-press",
      "makine-gogus-presi",
      "sinav"
    ],
    "talimat_tr": [
      "Dumbbell’ları dizlerinin üstüne al, geriye yatarken dizlerinle yukarı savur.",
      "Kürek kemiklerini sıkıştır, göğsünü hafif yukarı çıkar.",
      "Dumbbell’ları göğüs hizasında, bilekler düz olacak şekilde tut.",
      "Aşağıda göğsünde gerginlik hissedeceğin noktaya kadar in, omzunu zorlama.",
      "Yukarıda dirseklerini tam kilitleme, gerginliği kasta tut."
    ]
  },
  {
    "id": "dumbbell-fly",
    "ad_tr": "Dumbbell fly",
    "ad_en": "Dumbbell Fly",
    "birincil_kas": [
      "gogus"
    ],
    "ikincil_kas": [
      "on_omuz"
    ],
    "ekipman": [
      "dumbbell",
      "duz_bench"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "omuz_instabilite",
      "omuz_sikismasi"
    ],
    "teknik_zorluk": 3,
    "sfr": 3,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0.18
    },
    "alternatifler": [
      "kablo-gogus-fly",
      "pec-deck",
      "dumbbell-bench-press"
    ],
    "talimat_tr": [
      "Bench’e sırtüstü uzan, dumbbell’ları göğsünün üstünde tut.",
      "Dirseklerini hafif bükülü sabitle ve bu açıyı hiç değiştirme.",
      "Kolları yanlara doğru geniş bir yay çizerek aç.",
      "Omuz hizasının altına inme; gerilme hissettiğin yerde dur.",
      "Ağırlığı hafif tut — bu hareket ağırlıkla değil kontrolle çalışır."
    ]
  },
  {
    "id": "dumbbell-row",
    "ad_tr": "Tek kol dumbbell row",
    "ad_en": "Single-arm Dumbbell Row",
    "birincil_kas": [
      "sirt"
    ],
    "ikincil_kas": [
      "arka_omuz",
      "biceps"
    ],
    "ekipman": [
      "dumbbell",
      "duz_bench"
    ],
    "patern": "cekme_yatay",
    "kontrendikasyon": [],
    "teknik_zorluk": 2,
    "sfr": 5,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.45
    },
    "alternatifler": [
      "barbell-row",
      "kablo-oturarak-cekis",
      "makine-row"
    ],
    "talimat_tr": [
      "Bir dizini ve aynı taraf elini bench’e koy.",
      "Sırtın yere paralel ve düz olsun, boynun gövdenin devamı olsun.",
      "Dumbbell’ı kalçana doğru çek, dirseğini geriye götür.",
      "Yukarıda kürek kemiğini omurgaya doğru sık.",
      "Gövdeni döndürerek ağırlığı savurma; hareket koldan gelsin."
    ]
  },
  {
    "id": "duvar-kaydirma",
    "ad_tr": "Duvarda kol kaydırma",
    "ad_en": "Wall Slide",
    "birincil_kas": [
      "arka_omuz"
    ],
    "ikincil_kas": [
      "trapez"
    ],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": true,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "isinma": true,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0
    },
    "alternatifler": [
      "bant-ile-ayirma",
      "torasik-rotasyon",
      "bant-omuz-rotasyon"
    ],
    "talimat_tr": [
      "Sırtını duvara yasla, kollarını 90 derece bükülü duvara değdir.",
      "Kollarını duvardan ayırmadan yukarı kaydır.",
      "Belini duvardan ayırma.",
      "Kollar duvardan ayrılmaya başladığı yerde dur.",
      "Omuz presi öncesi ısınma olarak idealdir."
    ]
  },
  {
    "id": "egimli-barbell-press",
    "ad_tr": "Eğimli barbell press",
    "ad_en": "Incline Barbell Press",
    "birincil_kas": [
      "gogus"
    ],
    "ikincil_kas": [
      "on_omuz",
      "triceps"
    ],
    "ekipman": [
      "barbell",
      "egimli_bench"
    ],
    "patern": "itme_yatay",
    "kontrendikasyon": [
      "omuz_sikismasi",
      "omuz_instabilite"
    ],
    "teknik_zorluk": 3,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": true,
    "spotter": true,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0.8
    },
    "alternatifler": [
      "egimli-dumbbell-press",
      "makine-gogus-presi",
      "barbell-bench-press"
    ],
    "talimat_tr": [
      "Bench açısı 30 derece civarında olsun.",
      "Barı köprücük kemiğinin biraz altına indir.",
      "Kürekleri sıkıştır, kalçan bench’te kalsın.",
      "Barı yukarı iterken omuzların öne doğru yuvarlanmasın.",
      "Son tekrarlarda yardım alacak kimse yoksa güvenlik pimlerini ayarla."
    ]
  },
  {
    "id": "egimli-dumbbell-press",
    "ad_tr": "Eğimli dumbbell press",
    "ad_en": "Incline Dumbbell Press",
    "birincil_kas": [
      "gogus"
    ],
    "ikincil_kas": [
      "on_omuz",
      "triceps"
    ],
    "ekipman": [
      "dumbbell",
      "egimli_bench"
    ],
    "patern": "itme_yatay",
    "kontrendikasyon": [
      "omuz_sikismasi"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0.35
    },
    "alternatifler": [
      "egimli-barbell-press",
      "makine-gogus-presi",
      "dumbbell-bench-press"
    ],
    "talimat_tr": [
      "Bench açısını 30-45 derece ayarla; daha dik açı işi omuza kaydırır.",
      "Sırtını bench’e yasla, kürekleri sıkıştır.",
      "Dumbbell’ları köprücük kemiği hizasına indir.",
      "Dirseklerin gövdeyle 45 derece açıda kalsın.",
      "Yukarı iterken dumbbell’ları birbirine çarpma, gerginliği koru."
    ]
  },
  {
    "id": "egimli-sinav",
    "ad_tr": "Eğimli şınav (yükseltiden)",
    "ad_en": "Incline Push-up",
    "birincil_kas": [
      "gogus"
    ],
    "ikincil_kas": [
      "triceps",
      "on_omuz"
    ],
    "ekipman": [],
    "patern": "itme_yatay",
    "kontrendikasyon": [
      "bilek_agrisi"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0
    },
    "alternatifler": [
      "sinav",
      "dizden-sinav",
      "makine-gogus-presi"
    ],
    "talimat_tr": [
      "Ellerini masa, bench veya sağlam bir yükseltiye koy.",
      "Yükselti ne kadar yüksekse hareket o kadar kolaydır.",
      "Gövden baştan topuğa düz bir çizgi olsun.",
      "Göğsünü yükseltiye yaklaştır, kontrollü in.",
      "Kolaylaştıkça yükseltinin yüksekliğini azalt."
    ]
  },
  {
    "id": "elmas-sinav",
    "ad_tr": "Elmas şınav",
    "ad_en": "Diamond Push-up",
    "birincil_kas": [
      "triceps"
    ],
    "ikincil_kas": [
      "gogus",
      "on_omuz"
    ],
    "ekipman": [],
    "patern": "itme_yatay",
    "kontrendikasyon": [
      "bilek_agrisi",
      "dirsek_tendinit"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0
    },
    "alternatifler": [
      "sinav",
      "triceps-pushdown",
      "bench-dip"
    ],
    "talimat_tr": [
      "Ellerini göğsünün altında baş ve işaret parmakların üçgen yapacak şekilde koy.",
      "Gövden baştan topuğa düz olsun.",
      "Göğsünü ellerine doğru indir, dirsekler gövdeye yakın kalsın.",
      "Yukarı it, triceps’i sık.",
      "Bileğin zorlanıyorsa yumruk üstünde veya dizden yap."
    ]
  },
  {
    "id": "ez-bar-curl",
    "ad_tr": "EZ bar curl",
    "ad_en": "EZ-Bar Curl",
    "birincil_kas": [
      "biceps"
    ],
    "ikincil_kas": [
      "onkol"
    ],
    "ekipman": [
      "barbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "dirsek_tendinit"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.38
    },
    "alternatifler": [
      "barbell-curl",
      "biceps-curl",
      "preacher-curl"
    ],
    "talimat_tr": [
      "EZ barın eğimli kısımlarından kavra; bileğin daha rahat eder.",
      "Dirseklerin gövdene yapışık kalsın.",
      "Barı yukarı kaldırırken omuzlarını öne getirme.",
      "Yukarıda bir an dur.",
      "İnerken üç saniyede indir, kas bu bölümde büyür."
    ]
  },
  {
    "id": "face-pull",
    "ad_tr": "Yüzü çekiş (face pull)",
    "ad_en": "Face Pull",
    "birincil_kas": [
      "arka_omuz"
    ],
    "ikincil_kas": [
      "trapez",
      "sirt"
    ],
    "ekipman": [
      "kablo_makinesi"
    ],
    "patern": "cekme_yatay",
    "kontrendikasyon": [],
    "teknik_zorluk": 2,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.25
    },
    "alternatifler": [
      "ters-fly-dumbbell",
      "makine-arka-omuz",
      "bant-ile-ayirma"
    ],
    "talimat_tr": [
      "Makarayı yüz hizasına ayarla, halat tutamağı tak.",
      "Halatı yüzüne doğru çekerken dirseklerin omuz hizasında kalsın.",
      "Çekişin sonunda elleri kulaklarının hizasında iki yana ayır.",
      "Kürek kemiklerini sıkıştır, omuzlarını kaldırma.",
      "Ağır çalışma; bu hareket omuz sağlığı için, rekor için değil."
    ]
  },
  {
    "id": "glute-bridge",
    "ad_tr": "Kalça köprüsü",
    "ad_en": "Glute Bridge",
    "birincil_kas": [
      "kalca"
    ],
    "ikincil_kas": [
      "hamstring"
    ],
    "ekipman": [],
    "patern": "kalca_baskin",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0
    },
    "alternatifler": [
      "hip-thrust",
      "kablo-pull-through",
      "romanian-deadlift"
    ],
    "talimat_tr": [
      "Sırtüstü uzan, dizlerini bük, ayaklarını yere bas.",
      "Kalçanı yukarı kaldır, gövden diz ile omuz arasında düz çizgi olsun.",
      "Tepede kalçanı iki saniye sık.",
      "Belini aşırı kavislendirme; karnını hafif sık.",
      "Kolaylaştığında karnına ağırlık koyabilir veya hip thrust’a geçebilirsin."
    ]
  },
  {
    "id": "goblet-squat",
    "ad_tr": "Goblet squat",
    "ad_en": "Goblet Squat",
    "birincil_kas": [
      "quadriceps"
    ],
    "ikincil_kas": [
      "kalca",
      "karin"
    ],
    "ekipman": [
      "dumbbell"
    ],
    "patern": "diz_baskin",
    "kontrendikasyon": [
      "diz_patellofemoral"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0.3
    },
    "alternatifler": [
      "barbell-squat",
      "leg-press",
      "vucut-agirligi-squat"
    ],
    "talimat_tr": [
      "Bir dumbbell’ı göğsünün önünde dikey tut.",
      "Ayaklar omuz genişliğinde, parmaklar hafif dışa dönük.",
      "Dirseklerin dizlerinin içine değecek şekilde derine in.",
      "Göğsünü yukarıda tut; ağırlık öne düşmesine izin verme.",
      "Bu varyant squat tekniğini öğrenmenin en güvenli yoludur."
    ]
  },
  {
    "id": "guvercin-esnetme",
    "ad_tr": "Güvercin duruşu",
    "ad_en": "Pigeon Pose",
    "birincil_kas": [
      "kalca"
    ],
    "ikincil_kas": [],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "diz_menisküs"
    ],
    "teknik_zorluk": 2,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "isinma": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0
    },
    "alternatifler": [
      "kalca-90-90",
      "kalca-fleksor-esnetme",
      "bird-dog"
    ],
    "talimat_tr": [
      "Ön bacağını önünde bükülü, arka bacağını geride uzat.",
      "Kalçanı yere doğru bırak.",
      "Gövdeni öne eğerek gerilmeyi artır.",
      "Dizinde ağrı hissedersen bu hareketi yapma.",
      "30-45 saniye tut."
    ]
  },
  {
    "id": "hack-squat",
    "ad_tr": "Hack squat",
    "ad_en": "Hack Squat",
    "birincil_kas": [
      "quadriceps"
    ],
    "ikincil_kas": [
      "kalca"
    ],
    "ekipman": [
      "hack_squat"
    ],
    "patern": "diz_baskin",
    "kontrendikasyon": [
      "diz_menisküs",
      "diz_patellofemoral"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 10,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 1.1
    },
    "alternatifler": [
      "leg-press",
      "barbell-squat",
      "goblet-squat"
    ],
    "talimat_tr": [
      "Omuzlarını pedlerin altına yerleştir, sırtın sırtlığa yapışsın.",
      "Ayakları platformun ortasına koy.",
      "Kilidi aç, kontrollü in.",
      "Uyluk yere paralel olana kadar in.",
      "Dizlerin ayak parmakları yönünde açılsın, içe çökmesin."
    ]
  },
  {
    "id": "havlu-izometrik-curl",
    "ad_tr": "Havluyla kendine direnç curl",
    "ad_en": "Towel Self-resisted Curl",
    "birincil_kas": [
      "biceps"
    ],
    "ikincil_kas": [
      "onkol"
    ],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "dirsek_tendinit"
    ],
    "teknik_zorluk": 1,
    "sfr": 3,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0
    },
    "alternatifler": [
      "masa-alti-cekis",
      "biceps-curl",
      "cekic-curl"
    ],
    "talimat_tr": [
      "Havlunun bir ucunu ayağınla veya diğer elinle bastır.",
      "Diğer ucu avuç içi yukarı bakacak şekilde kavra.",
      "Kolunu yukarı kıvırırken diğer taraftan direnç uygula.",
      "Yukarı çıkarken 3 saniye, inerken 3 saniye say.",
      "Ekipmanın yokken biceps’i yükte tutmanın en pratik yoludur."
    ]
  },
  {
    "id": "hip-thrust",
    "ad_tr": "Hip thrust",
    "ad_en": "Barbell Hip Thrust",
    "birincil_kas": [
      "kalca"
    ],
    "ikincil_kas": [
      "hamstring",
      "quadriceps"
    ],
    "ekipman": [
      "barbell",
      "duz_bench"
    ],
    "patern": "kalca_baskin",
    "kontrendikasyon": [],
    "teknik_zorluk": 2,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0.75
    },
    "alternatifler": [
      "glute-bridge",
      "kablo-pull-through",
      "romanian-deadlift"
    ],
    "talimat_tr": [
      "Sırtının üst kısmını bench’in kenarına daya.",
      "Barı kalçanın üstüne yerleştir, altına ped koy.",
      "Ayakların dizlerin altına gelecek şekilde konumlansın.",
      "Kalçanı yukarı it, tepede gövden yere paralel olsun ve kalçanı sık.",
      "Belini geriye kavislendirme; hareket kalçadan gelsin."
    ]
  },
  {
    "id": "hiperekstansiyon",
    "ad_tr": "Hiperekstansiyon (bel)",
    "ad_en": "Back Extension",
    "birincil_kas": [
      "bel"
    ],
    "ikincil_kas": [
      "kalca",
      "hamstring"
    ],
    "ekipman": [
      "roman_chair"
    ],
    "patern": "kalca_baskin",
    "kontrendikasyon": [
      "bel_fitigi"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0
    },
    "alternatifler": [
      "romanian-deadlift",
      "glute-bridge",
      "kablo-pull-through"
    ],
    "talimat_tr": [
      "Ped kalça kemiğinin hemen altına gelsin.",
      "Kollarını göğsünde çaprazla.",
      "Kalçandan öne eğil, belini yuvarlamadan in.",
      "Kalçanı sıkarak doğrul; gövde yere paralel olunca dur.",
      "Geriye aşırı kavis yapma; bel için gereksiz baskıdır."
    ]
  },
  {
    "id": "ip-atlama",
    "ad_tr": "İp atlama",
    "ad_en": "Jump Rope",
    "birincil_kas": [
      "baldir"
    ],
    "ikincil_kas": [
      "quadriceps",
      "onkol"
    ],
    "ekipman": [],
    "patern": "tasima",
    "kontrendikasyon": [
      "diz_menisküs",
      "ayak_bilegi_kisitli",
      "diz_patellofemoral"
    ],
    "teknik_zorluk": 2,
    "sfr": 3,
    "eksenel_yuk": "orta",
    "bas_ustu": false,
    "gurultu": true,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "pliometrik": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0
    },
    "alternatifler": [
      "disarida-yuruyus",
      "sabit-bisiklet",
      "kosu-bandi-tempolu"
    ],
    "talimat_tr": [
      "İpi kolların dirsekten bükülü, eller kalça hizasında çevir.",
      "Zıplaman alçak olsun; ip geçecek kadar yeter.",
      "Ayak ön kısmına in, dizlerini hafif bük.",
      "Apartmanda alt komşun varsa bu hareketi yapma.",
      "Kısa aralıklarla başla: 30 saniye atlama, 30 saniye dinlenme."
    ]
  },
  {
    "id": "iyi-sabah",
    "ad_tr": "Good morning",
    "ad_en": "Good Morning",
    "birincil_kas": [
      "hamstring"
    ],
    "ikincil_kas": [
      "bel",
      "kalca"
    ],
    "ekipman": [
      "barbell",
      "squat_rack"
    ],
    "patern": "kalca_baskin",
    "kontrendikasyon": [
      "bel_fitigi",
      "boyun_fitigi"
    ],
    "teknik_zorluk": 4,
    "sfr": 3,
    "eksenel_yuk": "yuksek",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0.4
    },
    "alternatifler": [
      "romanian-deadlift",
      "kablo-pull-through",
      "makine-hamstring-curl"
    ],
    "talimat_tr": [
      "Barı squat pozisyonunda trapezine yerleştir.",
      "Dizlerini hafif bük, sabit tut.",
      "Kalçanı geriye iterek gövdeni öne eğ.",
      "Belini düz tut; yuvarlandığı anda dur.",
      "Hafif ağırlıkla çalış; bu hareket ağırlık yarışı değildir."
    ]
  },
  {
    "id": "kablo-biceps-curl",
    "ad_tr": "Kabloda biceps curl",
    "ad_en": "Cable Biceps Curl",
    "birincil_kas": [
      "biceps"
    ],
    "ikincil_kas": [
      "onkol"
    ],
    "ekipman": [
      "kablo_makinesi"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "dirsek_tendinit"
    ],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.35
    },
    "alternatifler": [
      "biceps-curl",
      "barbell-curl",
      "preacher-curl"
    ],
    "talimat_tr": [
      "Makarayı en aşağı ayarla, düz veya EZ tutamak tak.",
      "Bir adım geri çekil, kablo hafif gergin başlasın.",
      "Dirseklerini sabitleyerek yukarı kaldır.",
      "Kablo alt noktada da gerginlik verdiği için kas sürekli yük altında kalır.",
      "Gövdeni sallamadan çalış."
    ]
  },
  {
    "id": "kablo-crunch",
    "ad_tr": "Kabloda crunch",
    "ad_en": "Cable Crunch",
    "birincil_kas": [
      "karin"
    ],
    "ikincil_kas": [],
    "ekipman": [
      "kablo_makinesi"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "bel_fitigi",
      "boyun_fitigi"
    ],
    "teknik_zorluk": 2,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0.3
    },
    "alternatifler": [
      "mekik",
      "ab-wheel",
      "plank"
    ],
    "talimat_tr": [
      "Makarayı yukarı ayarla, halatı ensenin yanında tut.",
      "Dizlerinin üstüne çök.",
      "Omurganı yuvarlayarak dirseklerini dizlerine yaklaştır.",
      "Kalçandan eğilme; hareket sadece karından gelsin.",
      "Yukarı dönerken kontrolü bırakma."
    ]
  },
  {
    "id": "kablo-gogus-fly",
    "ad_tr": "Kablo göğüs fly",
    "ad_en": "Cable Chest Fly",
    "birincil_kas": [
      "gogus"
    ],
    "ikincil_kas": [
      "on_omuz"
    ],
    "ekipman": [
      "kablo_makinesi"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "omuz_instabilite"
    ],
    "teknik_zorluk": 2,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0.3
    },
    "alternatifler": [
      "dumbbell-fly",
      "pec-deck",
      "sinav"
    ],
    "talimat_tr": [
      "Makaraları omuz hizasının biraz üstüne ayarla.",
      "Bir adım öne çık, gövden hafif öne eğik dursun.",
      "Dirseklerini hafif bükülü sabitle, kolunu bükerek çekme.",
      "Elleri göğsünün önünde birleştirirken göğsünü sık.",
      "Geri açarken kontrolü bırakma, omuzda gerilme hissedince dur."
    ]
  },
  {
    "id": "kablo-lateral-raise",
    "ad_tr": "Kabloda lateral raise",
    "ad_en": "Cable Lateral Raise",
    "birincil_kas": [
      "yan_omuz"
    ],
    "ikincil_kas": [],
    "ekipman": [
      "kablo_makinesi"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "omuz_sikismasi"
    ],
    "teknik_zorluk": 2,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 1.25,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0.1
    },
    "alternatifler": [
      "yan-lateral-raise",
      "makine-lateral-raise",
      "omuz-presi-dumbbell"
    ],
    "talimat_tr": [
      "Makarayı en aşağı ayarla, kabloyu vücudunun önünden geçirerek tut.",
      "Makineye yan dur, dış eliyle tutamağı kavra.",
      "Kolu yanlara doğru omuz hizasına kaldır.",
      "Kablo alt noktada bile gerginliği koruduğu için hareket boyunca yük sabit kalır.",
      "Gövdeni yana yatırarak ivme verme."
    ]
  },
  {
    "id": "kablo-oturarak-cekis",
    "ad_tr": "Kabloda oturarak çekiş",
    "ad_en": "Seated Cable Row",
    "birincil_kas": [
      "sirt"
    ],
    "ikincil_kas": [
      "arka_omuz",
      "biceps"
    ],
    "ekipman": [
      "kablo_makinesi"
    ],
    "patern": "cekme_yatay",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.8
    },
    "alternatifler": [
      "makine-row",
      "dumbbell-row",
      "barbell-row"
    ],
    "talimat_tr": [
      "Ayaklarını platforma bas, dizlerin hafif bükülü kalsın.",
      "Gövden dik, bel çukurun doğal duruşunda olsun.",
      "Tutamağı göbeğine doğru çek, dirseklerin gövdeye yakın kalsın.",
      "Yukarıda kürekleri sık, gövdeni geriye yatırma.",
      "Bırakırken gövden öne düşmesin, sadece kollar uzasın."
    ]
  },
  {
    "id": "kablo-pull-through",
    "ad_tr": "Kabloda pull-through",
    "ad_en": "Cable Pull-through",
    "birincil_kas": [
      "kalca"
    ],
    "ikincil_kas": [
      "hamstring"
    ],
    "ekipman": [
      "kablo_makinesi"
    ],
    "patern": "kalca_baskin",
    "kontrendikasyon": [],
    "teknik_zorluk": 2,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0.35
    },
    "alternatifler": [
      "hip-thrust",
      "romanian-deadlift",
      "glute-bridge"
    ],
    "talimat_tr": [
      "Makarayı en aşağı ayarla, halatı bacaklarının arasından geçirerek tut.",
      "Makineye sırtın dönük, birkaç adım öne yürü.",
      "Kalçanı geriye it, gövden öne eğilsin.",
      "Kalçanı öne iterek doğrul, tepede kalçanı sık.",
      "Bu hareket kalça menteşesini bele yük binmeden öğretir."
    ]
  },
  {
    "id": "kablo-tek-kol-pullover",
    "ad_tr": "Kabloda pullover",
    "ad_en": "Cable Straight-arm Pullover",
    "birincil_kas": [
      "sirt"
    ],
    "ikincil_kas": [
      "gogus",
      "triceps"
    ],
    "ekipman": [
      "kablo_makinesi"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "omuz_sikismasi"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.3
    },
    "alternatifler": [
      "lat-pulldown",
      "kablo-oturarak-cekis",
      "makine-row"
    ],
    "talimat_tr": [
      "Makarayı baş hizasının üstüne ayarla, düz barı tut.",
      "Bir adım geri çekil, kalçandan hafif öne eğil.",
      "Kollar neredeyse düzken barı kalçana doğru indir.",
      "Aşağıda sırtının yan tarafını sık.",
      "Dirseğini bükerek çekme; bu bir triceps hareketi değil."
    ]
  },
  {
    "id": "kalca-90-90",
    "ad_tr": "Kalça 90/90 esnetme",
    "ad_en": "90/90 Hip Stretch",
    "birincil_kas": [
      "kalca"
    ],
    "ikincil_kas": [],
    "ekipman": [],
    "patern": "rotasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "isinma": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0
    },
    "alternatifler": [
      "guvercin-esnetme",
      "kalca-fleksor-esnetme",
      "bant-yan-yuruyus"
    ],
    "talimat_tr": [
      "Yere otur, ön bacağını 90 derece önünde, arka bacağını 90 derece yanında konumlandır.",
      "Sırtını dik tut, ön dizin üzerine doğru öne eğil.",
      "Kalçanın dışında gerilme hissetmelisin.",
      "30 saniye tut, taraf değiştir.",
      "Squat derinliği kısıtlı olanlar için birinci sırada gelir."
    ]
  },
  {
    "id": "kalca-abduksiyon",
    "ad_tr": "Kalça abduksiyon makinesi",
    "ad_en": "Hip Abduction Machine",
    "birincil_kas": [
      "kalca"
    ],
    "ikincil_kas": [],
    "ekipman": [
      "makine_abduktor"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0.25
    },
    "alternatifler": [
      "bant-yan-yuruyus",
      "hip-thrust",
      "glute-bridge"
    ],
    "talimat_tr": [
      "Pedler dizlerinin dışına gelecek şekilde otur.",
      "Gövdeni hafif öne eğ; bu kalça kaslarını daha çok çalıştırır.",
      "Bacaklarını dışa doğru aç.",
      "Dışarıda bir an sık.",
      "Kontrollü kapat, ağırlıkları çarptırma."
    ]
  },
  {
    "id": "kalca-fleksor-esnetme",
    "ad_tr": "Kalça ön esnetme",
    "ad_en": "Kneeling Hip Flexor Stretch",
    "birincil_kas": [
      "kalca"
    ],
    "ikincil_kas": [
      "quadriceps"
    ],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "isinma": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0
    },
    "alternatifler": [
      "kalca-90-90",
      "guvercin-esnetme",
      "kedi-deve"
    ],
    "talimat_tr": [
      "Bir dizini yere koy, diğer ayağını önde 90 derece bük.",
      "Kalçanı öne it, gövden dik kalsın.",
      "Arka bacağın kalça önünde gerilme hissetmelisin.",
      "Belini kavislendirme; kalçanı hafif içe kıvır.",
      "Uzun süre oturanlar için en gerekli esnetme budur."
    ]
  },
  {
    "id": "kalca-koprusu-isinma",
    "ad_tr": "Isınma kalça köprüsü",
    "ad_en": "Glute Bridge Activation",
    "birincil_kas": [
      "kalca"
    ],
    "ikincil_kas": [
      "hamstring"
    ],
    "ekipman": [],
    "patern": "kalca_baskin",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "isinma": true,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0
    },
    "alternatifler": [
      "glute-bridge",
      "bant-yan-yuruyus",
      "bird-dog"
    ],
    "talimat_tr": [
      "Sırtüstü uzan, dizlerini bük.",
      "Kalçanı kaldır, tepede iki saniye sık.",
      "15 tekrar yap, ağırlık kullanma.",
      "Uzun süre oturanlarda kalça kasları uyumakta gecikir; bu onları uyandırır.",
      "Bacak veya kalça günü öncesi yap."
    ]
  },
  {
    "id": "kedi-deve",
    "ad_tr": "Kedi-deve",
    "ad_en": "Cat-Cow",
    "birincil_kas": [
      "bel"
    ],
    "ikincil_kas": [
      "karin"
    ],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "isinma": true,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0
    },
    "alternatifler": [
      "bird-dog",
      "torasik-rotasyon",
      "kalca-fleksor-esnetme"
    ],
    "talimat_tr": [
      "Emekleme pozisyonuna geç.",
      "Nefes verirken sırtını yukarı kamburlaştır.",
      "Nefes alırken göğsünü öne aç, belini hafif çukurlaştır.",
      "Yavaş ve akıcı hareket et.",
      "Bel ısınması için 8-10 tekrar yeterlidir."
    ]
  },
  {
    "id": "kettlebell-goblet-tasima",
    "ad_tr": "Kettlebell göğüs taşıma",
    "ad_en": "Kettlebell Front-rack Carry",
    "birincil_kas": [
      "karin"
    ],
    "ikincil_kas": [
      "bel",
      "trapez",
      "on_omuz"
    ],
    "ekipman": [
      "kettlebell"
    ],
    "patern": "tasima",
    "kontrendikasyon": [
      "bel_fitigi"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "orta",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 4,
    "sure_bazli": true,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0.2
    },
    "alternatifler": [
      "ciftci-yuruyusu",
      "plank",
      "pallof-press"
    ],
    "talimat_tr": [
      "Kettlebell’ı göğsünün önünde iki elinle tut.",
      "Omuzlarını geriye çek, karnını sık.",
      "Kısa adımlarla düz yürü.",
      "Gövdenin geriye yaslanmasına izin verme.",
      "30-45 saniyelik yürüyüşler yeterlidir."
    ]
  },
  {
    "id": "kettlebell-omuz-presi",
    "ad_tr": "Kettlebell omuz presi",
    "ad_en": "Kettlebell Overhead Press",
    "birincil_kas": [
      "on_omuz"
    ],
    "ikincil_kas": [
      "triceps",
      "karin"
    ],
    "ekipman": [
      "kettlebell"
    ],
    "patern": "itme_dikey",
    "kontrendikasyon": [
      "omuz_sikismasi",
      "bilek_agrisi",
      "tansiyon_kontrolsuz"
    ],
    "teknik_zorluk": 3,
    "sfr": 4,
    "eksenel_yuk": "dusuk",
    "bas_ustu": true,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 4,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0.35
    },
    "alternatifler": [
      "omuz-presi-dumbbell",
      "makine-omuz-presi",
      "barbell-omuz-presi"
    ],
    "talimat_tr": [
      "Kettlebell’ı omuz hizasında, gövde önünde rack pozisyonunda tut.",
      "Bilek düz olsun, kettlebell önkolun üstüne yaslansın.",
      "Karnını sık, yukarı it.",
      "Tepede kol kulağının yanında olsun.",
      "İnerken kettlebell’ı yavaşça rack pozisyonuna geri al."
    ]
  },
  {
    "id": "kettlebell-swing",
    "ad_tr": "Kettlebell swing",
    "ad_en": "Kettlebell Swing",
    "birincil_kas": [
      "kalca"
    ],
    "ikincil_kas": [
      "hamstring",
      "bel",
      "karin"
    ],
    "ekipman": [
      "kettlebell"
    ],
    "patern": "kalca_baskin",
    "kontrendikasyon": [
      "bel_fitigi"
    ],
    "teknik_zorluk": 3,
    "sfr": 4,
    "eksenel_yuk": "orta",
    "bas_ustu": false,
    "gurultu": true,
    "spotter": false,
    "artis_kg": 4,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0.3
    },
    "alternatifler": [
      "hip-thrust",
      "kablo-pull-through",
      "romanian-deadlift"
    ],
    "talimat_tr": [
      "Kettlebell’ı bacaklarının önüne koy, kalçandan eğilerek kavra.",
      "Kettlebell’ı bacaklarının arasından geriye savur.",
      "Kalçanı hızla öne iterek gövdeni doğrult.",
      "Kettlebell göğüs hizasına kadar çıksın; kolla kaldırma.",
      "Hareket kalçadan gelir, omuzdan değil."
    ]
  },
  {
    "id": "kol-cevirme",
    "ad_tr": "Kol çevirme",
    "ad_en": "Arm Circles",
    "birincil_kas": [
      "on_omuz"
    ],
    "ikincil_kas": [
      "yan_omuz",
      "arka_omuz"
    ],
    "ekipman": [],
    "patern": "rotasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": true,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "isinma": true,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0
    },
    "alternatifler": [
      "duvar-kaydirma",
      "bant-ile-ayirma",
      "bant-omuz-rotasyon"
    ],
    "talimat_tr": [
      "Kollarını yanlara aç.",
      "Küçük dairelerle başla, giderek büyüt.",
      "15 saniye ileri, 15 saniye geri çevir.",
      "Omuzda takılma hissediyorsan daireyi küçült.",
      "Üst vücut günü öncesi ilk hareket olarak uygundur."
    ]
  },
  {
    "id": "kosu-bandi-tempolu",
    "ad_tr": "Koşu bandında tempolu yürüyüş",
    "ad_en": "Treadmill Incline Walk",
    "birincil_kas": [
      "baldir"
    ],
    "ikincil_kas": [
      "quadriceps",
      "kalca"
    ],
    "ekipman": [
      "kosu_bandi"
    ],
    "patern": "tasima",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0
    },
    "alternatifler": [
      "sabit-bisiklet",
      "disarida-yuruyus",
      "kurek-makinesi"
    ],
    "talimat_tr": [
      "Eğimi %8-12 arasına, hızı konuşabileceğin bir tempoya ayarla.",
      "Tutamaklara yaslanma; elleri serbest bırak.",
      "Gövden dik, adımların doğal olsun.",
      "Nefesin cümle kurabileceğin seviyede kalsın.",
      "Kalori yakımı için en düşük yorgunluk maliyetli seçenektir."
    ]
  },
  {
    "id": "kurek-makinesi",
    "ad_tr": "Kürek makinesi",
    "ad_en": "Rowing Machine",
    "birincil_kas": [
      "sirt"
    ],
    "ikincil_kas": [
      "quadriceps",
      "biceps",
      "kalca"
    ],
    "ekipman": [
      "kurek_makinesi"
    ],
    "patern": "cekme_yatay",
    "kontrendikasyon": [
      "bel_fitigi"
    ],
    "teknik_zorluk": 3,
    "sfr": 4,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0
    },
    "alternatifler": [
      "sabit-bisiklet",
      "kosu-bandi-tempolu",
      "kablo-oturarak-cekis"
    ],
    "talimat_tr": [
      "Sıra: önce bacaklar iter, sonra gövde açılır, en son kollar çeker.",
      "Dönüşte tersi: önce kollar uzar, sonra gövde, en son dizler bükülür.",
      "Belini yuvarlamadan çalış.",
      "Tutamağı göğüs altına çek, boynuna değil.",
      "Vuruş sayısını değil, her vuruştaki gücü hedefle."
    ]
  },
  {
    "id": "kutuya-ciks",
    "ad_tr": "Kutuya çıkış (box jump)",
    "ad_en": "Box Jump",
    "birincil_kas": [
      "quadriceps"
    ],
    "ikincil_kas": [
      "kalca",
      "baldir"
    ],
    "ekipman": [
      "plyo_box"
    ],
    "patern": "diz_baskin",
    "kontrendikasyon": [
      "diz_menisküs",
      "diz_patellofemoral",
      "ayak_bilegi_kisitli",
      "bel_fitigi"
    ],
    "teknik_zorluk": 3,
    "sfr": 3,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": true,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "pliometrik": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0
    },
    "alternatifler": [
      "step-up",
      "goblet-squat",
      "vucut-agirligi-squat"
    ],
    "talimat_tr": [
      "Rahatça çıkabileceğin bir yükseklik seç; ego yüksekliği sakatlık üretir.",
      "Kollarını sallayarak ivme al.",
      "İki ayakla kutunun üstüne yumuşak in.",
      "Kutudan zıplayarak inme; adımla in.",
      "Yorgunken bu hareketi yapma."
    ]
  },
  {
    "id": "lat-pulldown",
    "ad_tr": "Lat pulldown",
    "ad_en": "Lat Pulldown",
    "birincil_kas": [
      "sirt"
    ],
    "ikincil_kas": [
      "biceps",
      "arka_omuz"
    ],
    "ekipman": [
      "lat_pulldown"
    ],
    "patern": "cekme_dikey",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.85
    },
    "alternatifler": [
      "barfiks",
      "yardimli-barfiks",
      "kablo-oturarak-cekis"
    ],
    "talimat_tr": [
      "Diz pedini bacakların kalkmayacağı şekilde sıkıştır.",
      "Barı omuz genişliğinden açık kavra.",
      "Gövdeni çok geriye yatırma; 10-15 derece yeterli.",
      "Barı köprücük kemiğine doğru çek, dirsekleri aşağı ve geriye götür.",
      "Barı ensene indirme; bu omuz için gereksiz risk."
    ]
  },
  {
    "id": "leg-extension",
    "ad_tr": "Leg extension",
    "ad_en": "Leg Extension",
    "birincil_kas": [
      "quadriceps"
    ],
    "ikincil_kas": [],
    "ekipman": [
      "makine_quadriceps"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "diz_patellofemoral"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0.45
    },
    "alternatifler": [
      "leg-press",
      "goblet-squat",
      "hack-squat"
    ],
    "talimat_tr": [
      "Ped ayak bileğinin hemen üstüne gelsin.",
      "Sırtını sırtlığa yasla, tutamaklardan tut.",
      "Bacaklarını yukarı uzat, tepede bir an sık.",
      "Yavaş indir, ağırlığı düşürme.",
      "Diz önü ağrın varsa menzilin üst yarısında çalış."
    ]
  },
  {
    "id": "leg-press",
    "ad_tr": "Leg press",
    "ad_en": "Leg Press",
    "birincil_kas": [
      "quadriceps"
    ],
    "ikincil_kas": [
      "kalca",
      "hamstring"
    ],
    "ekipman": [
      "leg_press"
    ],
    "patern": "diz_baskin",
    "kontrendikasyon": [
      "diz_menisküs"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 10,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 1.8
    },
    "alternatifler": [
      "hack-squat",
      "barbell-squat",
      "goblet-squat"
    ],
    "talimat_tr": [
      "Ayaklarını platformun ortasına, omuz genişliğinde yerleştir.",
      "Sırtın ve kalçan sırtlığa tam yapışık kalsın.",
      "Dizler 90 dereceye gelene kadar in.",
      "Kalçan sırtlıktan kalkmaya başladığı noktayı geçme; bel için en riskli hata bu.",
      "Yukarıda dizlerini tam kilitleme."
    ]
  },
  {
    "id": "lunge",
    "ad_tr": "Lunge (öne hamle)",
    "ad_en": "Walking Lunge",
    "birincil_kas": [
      "quadriceps"
    ],
    "ikincil_kas": [
      "kalca",
      "hamstring"
    ],
    "ekipman": [
      "dumbbell"
    ],
    "patern": "diz_baskin",
    "kontrendikasyon": [
      "diz_patellofemoral",
      "diz_menisküs"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0.25
    },
    "alternatifler": [
      "bulgarian-split-squat",
      "goblet-squat",
      "leg-press"
    ],
    "talimat_tr": [
      "Dumbbell’ları yanlarda tut, gövden dik olsun.",
      "Bir adım öne at, arka dizini yere doğru indir.",
      "Ön dizin ayak parmaklarını çok geçmesin.",
      "Ön topuğunla iterek kalk ve diğer ayakla devam et.",
      "Dengeni zor buluyorsan sabit lunge yaparak başla."
    ]
  },
  {
    "id": "makine-arka-omuz",
    "ad_tr": "Makine arka omuz",
    "ad_en": "Reverse Pec Deck",
    "birincil_kas": [
      "arka_omuz"
    ],
    "ikincil_kas": [
      "trapez"
    ],
    "ekipman": [
      "makine_gogus"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0.3
    },
    "alternatifler": [
      "face-pull",
      "ters-fly-dumbbell",
      "bant-ile-ayirma"
    ],
    "talimat_tr": [
      "Makineyi ters çevirerek göğsünü pede yasla.",
      "Tutamakları omuz hizasında kavra.",
      "Kolları yanlara doğru aç, dirseklerin hafif bükülü kalsın.",
      "Arkada bir an dur, kürekleri sık.",
      "Kontrollü geri bırak, ağırlıkları çarptırma."
    ]
  },
  {
    "id": "makine-gogus-presi",
    "ad_tr": "Makine göğüs presi",
    "ad_en": "Machine Chest Press",
    "birincil_kas": [
      "gogus"
    ],
    "ikincil_kas": [
      "triceps",
      "on_omuz"
    ],
    "ekipman": [
      "makine_gogus"
    ],
    "patern": "itme_yatay",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0.9
    },
    "alternatifler": [
      "dumbbell-bench-press",
      "barbell-bench-press",
      "sinav"
    ],
    "talimat_tr": [
      "Koltuk yüksekliğini tutamaklar göğüs hizasına gelecek şekilde ayarla.",
      "Sırtını sırtlığa tam yasla, omuzlarını geriye çek.",
      "Kolları ileri iterken dirseklerini tam kilitleme.",
      "Geri dönüşte ağırlığı bırakma, kontrollü indir.",
      "Boynunu ileri uzatma, başın sırtlıkta kalsın."
    ]
  },
  {
    "id": "makine-hamstring-curl",
    "ad_tr": "Makine hamstring curl",
    "ad_en": "Lying Leg Curl",
    "birincil_kas": [
      "hamstring"
    ],
    "ikincil_kas": [
      "baldir"
    ],
    "ekipman": [
      "makine_hamstring"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0.3
    },
    "alternatifler": [
      "nordic-curl",
      "romanian-deadlift",
      "kablo-pull-through"
    ],
    "talimat_tr": [
      "Pedi ayak bileğinin hemen üstüne ayarla.",
      "Kalçanı yastığa yapıştır, kalkmasına izin verme.",
      "Topuklarını kalçana doğru çek.",
      "Tepede bir an sık.",
      "Yavaş indir; hamstring en çok bu bölümde çalışır."
    ]
  },
  {
    "id": "makine-lateral-raise",
    "ad_tr": "Makine lateral raise",
    "ad_en": "Machine Lateral Raise",
    "birincil_kas": [
      "yan_omuz"
    ],
    "ikincil_kas": [],
    "ekipman": [
      "makine_omuz"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "omuz_sikismasi"
    ],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0.3
    },
    "alternatifler": [
      "yan-lateral-raise",
      "kablo-lateral-raise",
      "makine-omuz-presi"
    ],
    "talimat_tr": [
      "Koltuğu omuz eklemin dönme noktasıyla hizala.",
      "Kollarını pedlere yasla.",
      "Yanlara doğru omuz hizasına kadar kaldır.",
      "Yukarıda bir an dur.",
      "Kontrollü indir, ağırlığı düşürme."
    ]
  },
  {
    "id": "makine-omuz-presi",
    "ad_tr": "Makine omuz presi",
    "ad_en": "Machine Shoulder Press",
    "birincil_kas": [
      "on_omuz"
    ],
    "ikincil_kas": [
      "triceps",
      "yan_omuz"
    ],
    "ekipman": [
      "makine_omuz"
    ],
    "patern": "itme_dikey",
    "kontrendikasyon": [
      "omuz_sikismasi"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": true,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0.8
    },
    "alternatifler": [
      "omuz-presi-dumbbell",
      "barbell-omuz-presi",
      "yan-lateral-raise"
    ],
    "talimat_tr": [
      "Koltuğu tutamaklar omuz hizasına gelecek şekilde ayarla.",
      "Sırtını sırtlığa tam yasla.",
      "Yukarı it, tepede dirsekleri tam kilitleme.",
      "İndirirken kontrolü bırakma.",
      "Omzunda batma varsa menzili kısalt veya alternatife geç."
    ]
  },
  {
    "id": "makine-row",
    "ad_tr": "Makine row",
    "ad_en": "Machine Row",
    "birincil_kas": [
      "sirt"
    ],
    "ikincil_kas": [
      "arka_omuz",
      "biceps"
    ],
    "ekipman": [
      "makine_sirt"
    ],
    "patern": "cekme_yatay",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.85
    },
    "alternatifler": [
      "kablo-oturarak-cekis",
      "dumbbell-row",
      "barbell-row"
    ],
    "talimat_tr": [
      "Göğüs pedini göğsünün ortasına gelecek şekilde ayarla.",
      "Göğsünü pede yasla, gövden sabit kalsın.",
      "Tutamakları geriye çek, kürek kemiklerini sıkıştır.",
      "Bırakırken omuzların öne yuvarlanmasına izin verme.",
      "Gövdeni pedden ayırarak ekstra ağırlık çekme."
    ]
  },
  {
    "id": "masa-alti-cekis",
    "ad_tr": "Masa altı çekiş",
    "ad_en": "Inverted Row (Under Table)",
    "birincil_kas": [
      "sirt"
    ],
    "ikincil_kas": [
      "biceps",
      "arka_omuz"
    ],
    "ekipman": [],
    "patern": "cekme_yatay",
    "kontrendikasyon": [
      "omuz_instabilite"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0
    },
    "alternatifler": [
      "dumbbell-row",
      "kablo-oturarak-cekis",
      "havlu-izometrik-curl"
    ],
    "talimat_tr": [
      "Sağlam bir masanın altına sırtüstü uzan, kenarından kavra.",
      "Gövden topuktan başa düz bir çizgi olsun.",
      "Göğsünü masanın kenarına doğru çek.",
      "Kürek kemiklerini sıkıştır, sonra kontrollü in.",
      "Masanın devrilmeyeceğinden emin ol; dizlerini bükerek kolaylaştırabilirsin."
    ]
  },
  {
    "id": "mekik",
    "ad_tr": "Mekik (crunch)",
    "ad_en": "Crunch",
    "birincil_kas": [
      "karin"
    ],
    "ikincil_kas": [],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "bel_fitigi",
      "boyun_fitigi"
    ],
    "teknik_zorluk": 1,
    "sfr": 3,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0
    },
    "alternatifler": [
      "kablo-crunch",
      "ters-mekik",
      "dead-bug"
    ],
    "talimat_tr": [
      "Sırtüstü uzan, dizlerini bük, ayakların yere bassın.",
      "Ellerini göğsünde çaprazla veya kulaklarının yanına koy.",
      "Omuzlarını yerden kaldır, belin yerde kalsın.",
      "Boynunu elinle çekme; bakışın tavanda kalsın.",
      "Yavaş in, ivmeyle çalışma."
    ]
  },
  {
    "id": "merdiven-cikma",
    "ad_tr": "Merdiven çıkma",
    "ad_en": "Stair Climbing",
    "birincil_kas": [
      "quadriceps"
    ],
    "ikincil_kas": [
      "kalca",
      "baldir"
    ],
    "ekipman": [
      "merdiven"
    ],
    "patern": "tasima",
    "kontrendikasyon": [
      "diz_patellofemoral"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0
    },
    "alternatifler": [
      "kosu-bandi-tempolu",
      "step-up",
      "disarida-yuruyus"
    ],
    "talimat_tr": [
      "Basamağa tam ayak bas, parmak ucuyla çıkma.",
      "Gövdeni dik tut, korkuluğa yaslanma.",
      "İnerken dizini koru; inişte asansör kullanmak makuldür.",
      "Diz önü ağrın varsa bu hareketi atla.",
      "Süre veya kat sayısı hedefle."
    ]
  },
  {
    "id": "mountain-climber",
    "ad_tr": "Mountain climber",
    "ad_en": "Mountain Climber",
    "birincil_kas": [
      "karin"
    ],
    "ikincil_kas": [
      "on_omuz",
      "quadriceps"
    ],
    "ekipman": [],
    "patern": "tasima",
    "kontrendikasyon": [
      "bilek_agrisi"
    ],
    "teknik_zorluk": 2,
    "sfr": 3,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0
    },
    "alternatifler": [
      "plank",
      "burpee",
      "ip-atlama"
    ],
    "talimat_tr": [
      "Şınav pozisyonunda başla, eller omuz altında.",
      "Dizlerini sırayla göğsüne doğru çek.",
      "Kalçan yukarı zıplamasın; gövden sabit kalsın.",
      "Tempoyu kontrol edebildiğin seviyede tut.",
      "Gürültüsüzdür; apartman için uygundur."
    ]
  },
  {
    "id": "nordic-curl",
    "ad_tr": "Nordic hamstring curl",
    "ad_en": "Nordic Hamstring Curl",
    "birincil_kas": [
      "hamstring"
    ],
    "ikincil_kas": [
      "kalca"
    ],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "diz_patellofemoral"
    ],
    "teknik_zorluk": 4,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": true,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0
    },
    "alternatifler": [
      "makine-hamstring-curl",
      "romanian-deadlift",
      "glute-bridge"
    ],
    "talimat_tr": [
      "Diz üstü çök, ayak bileklerini birinin tutmasını veya sabitlemesini sağla.",
      "Gövden dizden başa düz bir çizgi olsun.",
      "Öne doğru kontrollü şekilde yavaşça eğil.",
      "Dayanabildiğin yere kadar in, sonra ellerinle yeri iterek dön.",
      "Çok zorlayıcı bir harekettir; 3-5 tekrarla başla."
    ]
  },
  {
    "id": "olu-asilma",
    "ad_tr": "Barda ölü asılma",
    "ad_en": "Dead Hang",
    "birincil_kas": [
      "onkol"
    ],
    "ikincil_kas": [
      "sirt",
      "arka_omuz"
    ],
    "ekipman": [
      "barfiks_bari"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "omuz_instabilite"
    ],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": true,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "isinma": true,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0
    },
    "alternatifler": [
      "duvar-kaydirma",
      "olu-asilma-bantli",
      "bant-ile-ayirma"
    ],
    "talimat_tr": [
      "Bara asıl, omuzların kulaklarına yaklaşsın.",
      "Sonra omuzlarını aşağı çekerek aktif asılmaya geç.",
      "Nefesini tut, gövden sallanmasın.",
      "20-40 saniye asılı kal.",
      "Kavrama gücünü ve omuz sağlığını birlikte geliştirir."
    ]
  },
  {
    "id": "olu-asilma-bantli",
    "ad_tr": "Bantla destekli asılma",
    "ad_en": "Band-assisted Hang",
    "birincil_kas": [
      "onkol"
    ],
    "ikincil_kas": [
      "sirt"
    ],
    "ekipman": [
      "barfiks_bari",
      "direnc_bandi"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "omuz_instabilite"
    ],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": true,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "isinma": true,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0
    },
    "alternatifler": [
      "olu-asilma",
      "duvar-kaydirma",
      "bant-ile-ayirma"
    ],
    "talimat_tr": [
      "Bandı bara dola, ayağını bandın içine koy.",
      "Bara asıl, bant ağırlığının bir kısmını taşısın.",
      "Omuzlarını aşağı çek.",
      "Kavrama gücün yetersizse buradan başla.",
      "30 saniyeye ulaşınca bandı bırak."
    ]
  },
  {
    "id": "omuz-presi-dumbbell",
    "ad_tr": "Dumbbell omuz presi",
    "ad_en": "Seated Dumbbell Shoulder Press",
    "birincil_kas": [
      "on_omuz"
    ],
    "ikincil_kas": [
      "triceps",
      "yan_omuz"
    ],
    "ekipman": [
      "dumbbell",
      "ayarlanabilir_bench"
    ],
    "patern": "itme_dikey",
    "kontrendikasyon": [
      "omuz_sikismasi",
      "tansiyon_kontrolsuz"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "dusuk",
    "bas_ustu": true,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0.4
    },
    "alternatifler": [
      "makine-omuz-presi",
      "barbell-omuz-presi",
      "yan-lateral-raise"
    ],
    "talimat_tr": [
      "Bench sırtlığını dike yakın ayarla, sırtını yasla.",
      "Dumbbell’ları kulak hizasında, avuç içleri öne bakacak şekilde tut.",
      "Yukarı iterken dumbbell’lar birbirine hafif yaklaşsın.",
      "Tepede dirseklerini tam kilitleme.",
      "İnerken dirseğin omuz hizasının biraz altına gelsin, daha fazla inme."
    ]
  },
  {
    "id": "on-raise-dumbbell",
    "ad_tr": "Ön raise (dumbbell)",
    "ad_en": "Front Raise",
    "birincil_kas": [
      "on_omuz"
    ],
    "ikincil_kas": [],
    "ekipman": [
      "dumbbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "omuz_sikismasi"
    ],
    "teknik_zorluk": 1,
    "sfr": 3,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 1,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0.12
    },
    "alternatifler": [
      "omuz-presi-dumbbell",
      "yan-lateral-raise",
      "makine-omuz-presi"
    ],
    "talimat_tr": [
      "Dumbbell’ları uyluklarının önünde tut.",
      "Kolu düz tutarak omuz hizasına kadar kaldır.",
      "Gövdeni geriye yatırarak ivme verme.",
      "Kontrollü indir.",
      "Bu kas zaten her itme hareketinde çalışır; az hacim yeterlidir."
    ]
  },
  {
    "id": "oturarak-baldir",
    "ad_tr": "Oturarak baldır kaldırma",
    "ad_en": "Seated Calf Raise",
    "birincil_kas": [
      "baldir"
    ],
    "ikincil_kas": [],
    "ekipman": [
      "makine_baldir"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "ayak_bilegi_kisitli"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0.3
    },
    "alternatifler": [
      "ayakta-baldir",
      "dumbbell-baldir",
      "vucut-agirligi-baldir"
    ],
    "talimat_tr": [
      "Pedi uyluklarının üstüne, dizlerine yakın ayarla.",
      "Ayak ön kısmını platforma bas.",
      "Topuklarını indir, sonra yüksel.",
      "Diz bükülü olduğu için baldırın derin kası daha çok çalışır.",
      "Yavaş ve tam menzille çalış."
    ]
  },
  {
    "id": "overhead-triceps",
    "ad_tr": "Baş üstü triceps ekstansiyon",
    "ad_en": "Overhead Triceps Extension",
    "birincil_kas": [
      "triceps"
    ],
    "ikincil_kas": [],
    "ekipman": [
      "dumbbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "omuz_sikismasi",
      "dirsek_tendinit"
    ],
    "teknik_zorluk": 2,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": true,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0.22
    },
    "alternatifler": [
      "triceps-pushdown",
      "yatarak-triceps-ekstansiyon",
      "triceps-halat-pushdown"
    ],
    "talimat_tr": [
      "Tek dumbbell’ı iki elinle baş üstünde tut.",
      "Dirseklerini kulaklarının yanında sabitle.",
      "Ağırlığı ensenin arkasına doğru indir.",
      "Gerilme hissettiğin noktadan yukarı it.",
      "Bu pozisyon triceps’in uzun başını en iyi geren pozisyondur."
    ]
  },
  {
    "id": "pallof-press",
    "ad_tr": "Pallof press",
    "ad_en": "Pallof Press",
    "birincil_kas": [
      "karin"
    ],
    "ikincil_kas": [
      "bel"
    ],
    "ekipman": [
      "kablo_makinesi"
    ],
    "patern": "rotasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 2,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0.15
    },
    "alternatifler": [
      "dead-bug",
      "yan-plank",
      "plank"
    ],
    "talimat_tr": [
      "Makarayı göğüs hizasına ayarla, makineye yan dur.",
      "Tutamağı iki elinle göğsünün önünde tut.",
      "Kollarını öne uzat; kablo seni döndürmeye çalışacak.",
      "Gövdeni dönmeye karşı sabit tut.",
      "Bu bir dönme hareketi değil, dönmeye direnme hareketidir."
    ]
  },
  {
    "id": "pec-deck",
    "ad_tr": "Pec deck (göğüs makinesi)",
    "ad_en": "Pec Deck Fly",
    "birincil_kas": [
      "gogus"
    ],
    "ikincil_kas": [
      "on_omuz"
    ],
    "ekipman": [
      "makine_gogus"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "omuz_instabilite"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0.45
    },
    "alternatifler": [
      "kablo-gogus-fly",
      "dumbbell-fly",
      "makine-gogus-presi"
    ],
    "talimat_tr": [
      "Koltuğu tutamaklar göğüs hizasına gelecek şekilde ayarla.",
      "Sırtını sırtlığa yasla, omuzlarını geriye ve aşağı çek.",
      "Kolları öne kapatırken göğsünü sık, bir saniye tut.",
      "Açarken kontrollü geri bırak, ağırlıkları çarptırma.",
      "Aşırı geriye açma; omuz önünde zorlanma hissediyorsan menzili kısalt."
    ]
  },
  {
    "id": "pike-sinav",
    "ad_tr": "Pike şınav",
    "ad_en": "Pike Push-up",
    "birincil_kas": [
      "on_omuz"
    ],
    "ikincil_kas": [
      "triceps"
    ],
    "ekipman": [],
    "patern": "itme_dikey",
    "kontrendikasyon": [
      "omuz_sikismasi",
      "bilek_agrisi",
      "tansiyon_kontrolsuz"
    ],
    "teknik_zorluk": 3,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": true,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0
    },
    "alternatifler": [
      "omuz-presi-dumbbell",
      "makine-omuz-presi",
      "sinav"
    ],
    "talimat_tr": [
      "Şınav pozisyonundan kalçanı yukarı kaldırarak ters V oluştur.",
      "Ellerin omuz genişliğinden biraz açık olsun.",
      "Başını ellerinin arasına doğru indir.",
      "Yukarı iterken kalçanı yerinde tut.",
      "Ayaklarını yükseltiye koyarak zorlaştırabilirsin."
    ]
  },
  {
    "id": "plank",
    "ad_tr": "Plank",
    "ad_en": "Plank",
    "birincil_kas": [
      "karin"
    ],
    "ikincil_kas": [
      "bel",
      "on_omuz"
    ],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "bilek_agrisi"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0
    },
    "alternatifler": [
      "dead-bug",
      "yan-plank",
      "ab-wheel"
    ],
    "talimat_tr": [
      "Dirseklerin omuzlarının tam altında olsun.",
      "Gövden baştan topuğa düz bir çizgi olsun.",
      "Karnını ve kalçanı sık; kalçan ne düşsün ne yukarı kalksın.",
      "Boynunu gövdenin devamı olarak tut, bakışın yerde.",
      "Süre hedefle çalış; şeklin bozulduğu anda seti bitir."
    ]
  },
  {
    "id": "preacher-curl",
    "ad_tr": "Preacher curl",
    "ad_en": "Preacher Curl",
    "birincil_kas": [
      "biceps"
    ],
    "ikincil_kas": [
      "onkol"
    ],
    "ekipman": [
      "preacher_bench",
      "dumbbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "dirsek_tendinit"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 1,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.16
    },
    "alternatifler": [
      "biceps-curl",
      "kablo-biceps-curl",
      "ez-bar-curl"
    ],
    "talimat_tr": [
      "Koltuğu koltuk altın pedin üstüne oturacak şekilde ayarla.",
      "Kolun tamamı pede yaslansın.",
      "Aşağıda kolu tam düzleştirme; dirsekte zorlanma yaratır.",
      "Yukarı kaldır, tepede bir an dur.",
      "Yavaş indir; bu hareket ağır değil, kontrollü yapılır."
    ]
  },
  {
    "id": "romanian-deadlift",
    "ad_tr": "Romen deadlift",
    "ad_en": "Romanian Deadlift",
    "birincil_kas": [
      "hamstring"
    ],
    "ikincil_kas": [
      "kalca",
      "bel",
      "sirt"
    ],
    "ekipman": [
      "barbell"
    ],
    "patern": "kalca_baskin",
    "kontrendikasyon": [
      "bel_fitigi"
    ],
    "teknik_zorluk": 3,
    "sfr": 4,
    "eksenel_yuk": "yuksek",
    "bas_ustu": false,
    "gurultu": true,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0.8
    },
    "alternatifler": [
      "makine-hamstring-curl",
      "hip-thrust",
      "kablo-pull-through"
    ],
    "talimat_tr": [
      "Barı kalça hizasında, omuz genişliğinde tut.",
      "Dizlerini hafif bük ve bu açıyı sabit tut.",
      "Kalçanı geriye it, bar bacaklarına değerek insin.",
      "Hamstringlerinde gerilme hissettiğin noktada dur.",
      "Belin yuvarlanmaya başlıyorsa hemen dur; menzilin sınırı orasıdır."
    ]
  },
  {
    "id": "sabit-bisiklet",
    "ad_tr": "Sabit bisiklet",
    "ad_en": "Stationary Bike",
    "birincil_kas": [
      "quadriceps"
    ],
    "ikincil_kas": [
      "baldir",
      "kalca"
    ],
    "ekipman": [
      "sabit_bisiklet"
    ],
    "patern": "tasima",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0
    },
    "alternatifler": [
      "kosu-bandi-tempolu",
      "kurek-makinesi",
      "disarida-yuruyus"
    ],
    "talimat_tr": [
      "Sele yüksekliğini pedal en aşağıdayken dizin hafif bükülü kalacak şekilde ayarla.",
      "Sırtın dik, omuzların gevşek olsun.",
      "Direnci pedal çevirmenin zorlaştığı ama akıcı kaldığı seviyede tut.",
      "Diz eklemine yük binmediği için sakatlık sonrası dönüşte uygundur.",
      "Süre ve direnç hedefiyle çalış."
    ]
  },
  {
    "id": "shrug-barbell",
    "ad_tr": "Barbell shrug",
    "ad_en": "Barbell Shrug",
    "birincil_kas": [
      "trapez"
    ],
    "ikincil_kas": [
      "onkol"
    ],
    "ekipman": [
      "barbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "boyun_fitigi",
      "bel_fitigi"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "orta",
    "bas_ustu": false,
    "gurultu": true,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 1.1
    },
    "alternatifler": [
      "shrug-dumbbell",
      "kablo-oturarak-cekis",
      "face-pull"
    ],
    "talimat_tr": [
      "Barı omuz genişliğinde, kollar düz tut.",
      "Omuzlarını düz yukarı kaldır, dirseklerini bükme.",
      "Yukarıda sık, sonra kontrollü indir.",
      "Belini düz tut, gövdeni geriye yatırma.",
      "Kavrama gücün bitiyorsa kayış kullanabilirsin."
    ]
  },
  {
    "id": "shrug-dumbbell",
    "ad_tr": "Dumbbell shrug",
    "ad_en": "Dumbbell Shrug",
    "birincil_kas": [
      "trapez"
    ],
    "ikincil_kas": [
      "onkol"
    ],
    "ekipman": [
      "dumbbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "boyun_fitigi"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.45
    },
    "alternatifler": [
      "shrug-barbell",
      "kablo-oturarak-cekis",
      "face-pull"
    ],
    "talimat_tr": [
      "Dumbbell’ları yanlarda, kollar düz tut.",
      "Omuzlarını kulaklarına doğru düz yukarı kaldır.",
      "Yukarıda bir saniye sık.",
      "Omuzlarını çevirme; dairesel hareket boyuna gereksiz yük bindirir.",
      "Kontrollü indir, ağırlığın seni aşağı çekmesine izin verme."
    ]
  },
  {
    "id": "sinav",
    "ad_tr": "Şınav",
    "ad_en": "Push-up",
    "birincil_kas": [
      "gogus"
    ],
    "ikincil_kas": [
      "triceps",
      "on_omuz",
      "karin"
    ],
    "ekipman": [],
    "patern": "itme_yatay",
    "kontrendikasyon": [
      "bilek_agrisi"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0
    },
    "alternatifler": [
      "dizden-sinav",
      "egimli-sinav",
      "dumbbell-bench-press"
    ],
    "talimat_tr": [
      "Eller omuz genişliğinden biraz açık, parmaklar ileri baksın.",
      "Vücudun baştan topuğa tek bir düz çizgi olsun; kalçan düşmesin.",
      "Göğsün yere yaklaşana kadar in, dirseklerin 45 derece açıda kalsın.",
      "Karnını sıkı tut, bel çukurun derinleşmesin.",
      "Bileğin ağrıyorsa yumruk üstünde veya paralet üstünde çalış."
    ]
  },
  {
    "id": "smith-gogus-presi",
    "ad_tr": "Smith makinesinde göğüs presi",
    "ad_en": "Smith Machine Bench Press",
    "birincil_kas": [
      "gogus"
    ],
    "ikincil_kas": [
      "triceps",
      "on_omuz"
    ],
    "ekipman": [
      "smith_makinesi",
      "duz_bench"
    ],
    "patern": "itme_yatay",
    "kontrendikasyon": [
      "omuz_sikismasi"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0.95
    },
    "alternatifler": [
      "barbell-bench-press",
      "makine-gogus-presi",
      "dumbbell-bench-press"
    ],
    "talimat_tr": [
      "Bench’i barın altına, bar göğüs hizasına gelecek şekilde yerleştir.",
      "Barı çevirerek kilidinden çıkar.",
      "Barı göğüs altına indir, dirseklerin 45 derece açıda kalsın.",
      "Sabit ray dengeyi senin yerine tutar; bu yüzden yardımcıya ihtiyaç yok.",
      "Set bitince barı çevirip kilide oturt."
    ]
  },
  {
    "id": "step-up",
    "ad_tr": "Step-up (basamağa çıkma)",
    "ad_en": "Step-up",
    "birincil_kas": [
      "quadriceps"
    ],
    "ikincil_kas": [
      "kalca",
      "hamstring"
    ],
    "ekipman": [
      "dumbbell",
      "plyo_box"
    ],
    "patern": "diz_baskin",
    "kontrendikasyon": [
      "diz_patellofemoral"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0.22
    },
    "alternatifler": [
      "lunge",
      "bulgarian-split-squat",
      "leg-press"
    ],
    "talimat_tr": [
      "Diz hizasında sağlam bir kutu veya basamak seç.",
      "Tüm ayağını basamağa koy.",
      "Üstteki bacağınla iterek çık; arkadaki ayakla zıplama.",
      "Kontrollü in, aynı ayakla devam et.",
      "Basamak yüksekliğini dizin rahat ettiği seviyede tut."
    ]
  },
  {
    "id": "sumo-deadlift",
    "ad_tr": "Sumo deadlift",
    "ad_en": "Sumo Deadlift",
    "birincil_kas": [
      "kalca"
    ],
    "ikincil_kas": [
      "quadriceps",
      "hamstring",
      "bel"
    ],
    "ekipman": [
      "barbell"
    ],
    "patern": "kalca_baskin",
    "kontrendikasyon": [
      "bel_fitigi",
      "kalca_impingement",
      "tansiyon_kontrolsuz"
    ],
    "teknik_zorluk": 4,
    "sfr": 3,
    "eksenel_yuk": "yuksek",
    "bas_ustu": false,
    "gurultu": true,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 1
    },
    "alternatifler": [
      "barbell-deadlift",
      "trap-bar-deadlift",
      "romanian-deadlift"
    ],
    "talimat_tr": [
      "Ayaklarını geniş aç, parmak uçları dışa dönük olsun.",
      "Barı bacaklarının arasından, omuz genişliğinde kavra.",
      "Kalçanı alçalt, göğsünü yukarı çek.",
      "Dizlerini dışa doğru iterek kalk.",
      "Bu varyant gövdeyi daha dik tuttuğu için bele daha az yük bindirir."
    ]
  },
  {
    "id": "svend-press",
    "ad_tr": "Plaka sıkıştırma presi",
    "ad_en": "Svend Press",
    "birincil_kas": [
      "gogus"
    ],
    "ikincil_kas": [
      "on_omuz"
    ],
    "ekipman": [
      "barbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 3,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 1.25,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0.08
    },
    "alternatifler": [
      "kablo-gogus-fly",
      "pec-deck",
      "dumbbell-fly"
    ],
    "talimat_tr": [
      "İki plakayı avuç içlerinle göğsünün önünde birbirine bastır.",
      "Baskıyı bırakmadan kollarını öne uzat.",
      "Uzatırken göğsünü sık, nefesini ver.",
      "Kontrollü geri getir, baskı hiç azalmasın.",
      "Ağır plaka gerekmez; 5-10 kg fazlasıyla yeterli."
    ]
  },
  {
    "id": "t-bar-row",
    "ad_tr": "T-bar row",
    "ad_en": "T-Bar Row",
    "birincil_kas": [
      "sirt"
    ],
    "ikincil_kas": [
      "arka_omuz",
      "biceps",
      "bel"
    ],
    "ekipman": [
      "barbell"
    ],
    "patern": "cekme_yatay",
    "kontrendikasyon": [
      "bel_fitigi"
    ],
    "teknik_zorluk": 3,
    "sfr": 4,
    "eksenel_yuk": "orta",
    "bas_ustu": false,
    "gurultu": true,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.9
    },
    "alternatifler": [
      "barbell-row",
      "makine-row",
      "dumbbell-row"
    ],
    "talimat_tr": [
      "Barın bir ucunu köşeye sabitle, diğer ucuna plaka tak.",
      "Barın üzerine bacakların arasına gelecek şekilde konumlan.",
      "Kalçandan öne eğil, belini düz tut.",
      "Barı göğsünün altına doğru çek, dirsekleri geriye götür.",
      "Yukarıda bir an dur, kontrollü indir."
    ]
  },
  {
    "id": "ters-curl",
    "ad_tr": "Ters kavrama curl",
    "ad_en": "Reverse Curl",
    "birincil_kas": [
      "onkol"
    ],
    "ikincil_kas": [
      "biceps"
    ],
    "ekipman": [
      "barbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "dirsek_tendinit",
      "bilek_agrisi"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 1.25,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.22
    },
    "alternatifler": [
      "cekic-curl",
      "bilek-curl",
      "biceps-curl"
    ],
    "talimat_tr": [
      "Barı avuç içleri aşağı bakacak şekilde kavra.",
      "Dirseklerini sabitle, yukarı kaldır.",
      "Ağırlığı düşük tut; bu varyant çok daha zordur.",
      "Bileğini geriye kırma, düz tut.",
      "Tenisçi dirseği geçmişi olanlar için faydalı bir hareket."
    ]
  },
  {
    "id": "ters-fly-dumbbell",
    "ad_tr": "Ters fly (dumbbell)",
    "ad_en": "Dumbbell Reverse Fly",
    "birincil_kas": [
      "arka_omuz"
    ],
    "ikincil_kas": [
      "trapez",
      "sirt"
    ],
    "ekipman": [
      "dumbbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 1,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0.12
    },
    "alternatifler": [
      "face-pull",
      "makine-arka-omuz",
      "bant-ile-ayirma"
    ],
    "talimat_tr": [
      "Kalçandan öne eğil, gövden yere yakın paralel olsun.",
      "Hafif ağırlıklarla, dirsekler hafif bükülü çalış.",
      "Kolları yanlara doğru aç, omuz hizasında dur.",
      "Kürek kemiklerini birbirine yaklaştır.",
      "Boynunu yukarı kaldırma, bakışın yerde kalsın."
    ]
  },
  {
    "id": "ters-kavrama-barfiks",
    "ad_tr": "Ters kavrama barfiks (chin-up)",
    "ad_en": "Chin-up",
    "birincil_kas": [
      "sirt"
    ],
    "ikincil_kas": [
      "biceps",
      "onkol"
    ],
    "ekipman": [
      "barfiks_bari"
    ],
    "patern": "cekme_dikey",
    "kontrendikasyon": [
      "omuz_instabilite",
      "dirsek_tendinit"
    ],
    "teknik_zorluk": 3,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": true,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0
    },
    "alternatifler": [
      "barfiks",
      "ters-kavrama-lat-pulldown",
      "yardimli-barfiks"
    ],
    "talimat_tr": [
      "Barı avuç içleri sana bakacak şekilde omuz genişliğinde kavra.",
      "Omuzlarını aşağı çek, gövden sallanmasın.",
      "Göğsünü bara doğru çekerek yüksel.",
      "Bu kavrama biceps’i daha çok kattığı için düz barfiksten kolaydır.",
      "İnerken kolları tam gevşetme, kontrolü koru."
    ]
  },
  {
    "id": "ters-kavrama-lat-pulldown",
    "ad_tr": "Ters kavrama lat pulldown",
    "ad_en": "Underhand Lat Pulldown",
    "birincil_kas": [
      "sirt"
    ],
    "ikincil_kas": [
      "biceps"
    ],
    "ekipman": [
      "lat_pulldown"
    ],
    "patern": "cekme_dikey",
    "kontrendikasyon": [
      "dirsek_tendinit"
    ],
    "teknik_zorluk": 1,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0.85
    },
    "alternatifler": [
      "lat-pulldown",
      "barfiks",
      "kablo-oturarak-cekis"
    ],
    "talimat_tr": [
      "Barı avuç içleri sana bakacak şekilde omuz genişliğinde kavra.",
      "Diz pedini sıkıştır, gövdeni hafif geriye yatır.",
      "Barı göğsünün üst kısmına çek.",
      "Dirseklerini gövdene yakın tutarak aşağı ve geriye götür.",
      "Bileğini bükme, düz bir çizgi olarak tut."
    ]
  },
  {
    "id": "ters-mekik",
    "ad_tr": "Ters mekik",
    "ad_en": "Reverse Crunch",
    "birincil_kas": [
      "karin"
    ],
    "ikincil_kas": [],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "bel_fitigi"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0
    },
    "alternatifler": [
      "mekik",
      "asili-diz-cekme",
      "dead-bug"
    ],
    "talimat_tr": [
      "Sırtüstü uzan, ellerini yanlarına koy.",
      "Dizlerini göğsüne doğru çek, kalçanı yerden kaldır.",
      "Bacaklarını savurma; hareket karından gelsin.",
      "Kontrollü indir, ayaklarını yere değdirme.",
      "Belini yere yapışık tutmaya çalış."
    ]
  },
  {
    "id": "torasik-rotasyon",
    "ad_tr": "Üst sırt rotasyonu",
    "ad_en": "Thoracic Rotation",
    "birincil_kas": [
      "sirt"
    ],
    "ikincil_kas": [
      "arka_omuz"
    ],
    "ekipman": [],
    "patern": "rotasyon",
    "kontrendikasyon": [],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "sure_bazli": true,
    "isinma": true,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0
    },
    "alternatifler": [
      "kedi-deve",
      "duvar-kaydirma",
      "bant-ile-ayirma"
    ],
    "talimat_tr": [
      "Emekleme pozisyonunda bir elini ensene koy.",
      "Dirseğini tavana doğru çevirerek üst sırtını döndür.",
      "Belini döndürme; hareket göğüs kafesinden gelsin.",
      "Bakışını dirseğini takip ettir.",
      "Her tarafta 8 tekrar yap."
    ]
  },
  {
    "id": "trap-bar-deadlift",
    "ad_tr": "Trap bar deadlift",
    "ad_en": "Trap Bar Deadlift",
    "birincil_kas": [
      "quadriceps"
    ],
    "ikincil_kas": [
      "kalca",
      "hamstring",
      "trapez"
    ],
    "ekipman": [
      "barbell"
    ],
    "patern": "kalca_baskin",
    "kontrendikasyon": [
      "bel_fitigi",
      "tansiyon_kontrolsuz"
    ],
    "teknik_zorluk": 3,
    "sfr": 4,
    "eksenel_yuk": "yuksek",
    "bas_ustu": false,
    "gurultu": true,
    "spotter": false,
    "artis_kg": 5,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 1.05
    },
    "alternatifler": [
      "barbell-deadlift",
      "romanian-deadlift",
      "leg-press"
    ],
    "talimat_tr": [
      "Trap barın ortasında dur, tutamakları kavra.",
      "Kalçanı geriye ve aşağı götür, göğsünü yukarı çek.",
      "Yükü ayaklarının ortasından kaldır.",
      "Bu varyantta yük vücudun merkezine daha yakındır; bel için daha güvenlidir.",
      "Tepede omuzlarını geriye çek, kalçanı kilitle."
    ]
  },
  {
    "id": "triceps-halat-pushdown",
    "ad_tr": "Halatla triceps pushdown",
    "ad_en": "Rope Triceps Pushdown",
    "birincil_kas": [
      "triceps"
    ],
    "ikincil_kas": [],
    "ekipman": [
      "kablo_makinesi"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "dirsek_tendinit"
    ],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0.3
    },
    "alternatifler": [
      "triceps-pushdown",
      "yatarak-triceps-ekstansiyon",
      "dip-triceps"
    ],
    "talimat_tr": [
      "Halat tutamağı tak, uçlarından kavra.",
      "Dirseklerini gövdene sabitle.",
      "Aşağı iterken halatın uçlarını iki yana ayır.",
      "Aşağıda kolları tam düzleştir ve sık.",
      "Yukarı bırakırken dirseğin öne kaçmasın."
    ]
  },
  {
    "id": "triceps-pushdown",
    "ad_tr": "Triceps pushdown",
    "ad_en": "Triceps Pushdown",
    "birincil_kas": [
      "triceps"
    ],
    "ikincil_kas": [],
    "ekipman": [
      "kablo_makinesi"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "dirsek_tendinit"
    ],
    "teknik_zorluk": 1,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0.35
    },
    "alternatifler": [
      "triceps-halat-pushdown",
      "dip-triceps",
      "yatarak-triceps-ekstansiyon"
    ],
    "talimat_tr": [
      "Makarayı göğüs hizasının üstüne ayarla, düz barı kavra.",
      "Dirseklerini gövdene yapıştır ve orada tut.",
      "Barı aşağı it, kolları tam düzleştir.",
      "Aşağıda bir an sık.",
      "Gövdeni öne eğerek ağırlık bastırma; hareket sadece dirsekten gelsin."
    ]
  },
  {
    "id": "vucut-agirligi-baldir",
    "ad_tr": "Vücut ağırlığı baldır kaldırma",
    "ad_en": "Bodyweight Calf Raise",
    "birincil_kas": [
      "baldir"
    ],
    "ikincil_kas": [],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "ayak_bilegi_kisitli"
    ],
    "teknik_zorluk": 1,
    "sfr": 3,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0
    },
    "alternatifler": [
      "dumbbell-baldir",
      "ayakta-baldir",
      "oturarak-baldir"
    ],
    "talimat_tr": [
      "Basamağın kenarına ayak ön kısmınla bas.",
      "Dengeni duvardan alabilirsin.",
      "Topukları indir, sonra yüksel.",
      "Yüksek tekrar çalış: 15-25 tekrar uygundur.",
      "Tek ayakla yaparak yükü ikiye katlayabilirsin."
    ]
  },
  {
    "id": "vucut-agirligi-squat",
    "ad_tr": "Vücut ağırlığı squat",
    "ad_en": "Bodyweight Squat",
    "birincil_kas": [
      "quadriceps"
    ],
    "ikincil_kas": [
      "kalca"
    ],
    "ekipman": [],
    "patern": "diz_baskin",
    "kontrendikasyon": [
      "diz_patellofemoral"
    ],
    "teknik_zorluk": 1,
    "sfr": 3,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "squat",
      "katsayi": 0
    },
    "alternatifler": [
      "goblet-squat",
      "bulgarian-split-squat",
      "leg-press"
    ],
    "talimat_tr": [
      "Ayaklar omuz genişliğinde, kollar önde dengede.",
      "Kalçanı geriye götürerek in.",
      "Topuklarını yerden kaldırma.",
      "Uyluk yere paralel olana kadar in.",
      "Yukarı kalkarken topuklarınla yeri it."
    ]
  },
  {
    "id": "yan-egilme-dumbbell",
    "ad_tr": "Dumbbell yan eğilme",
    "ad_en": "Dumbbell Side Bend",
    "birincil_kas": [
      "karin"
    ],
    "ikincil_kas": [
      "bel"
    ],
    "ekipman": [
      "dumbbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "bel_fitigi"
    ],
    "teknik_zorluk": 1,
    "sfr": 3,
    "eksenel_yuk": "dusuk",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "deadlift",
      "katsayi": 0.2
    },
    "alternatifler": [
      "yan-plank",
      "pallof-press",
      "ciftci-yuruyusu"
    ],
    "talimat_tr": [
      "Tek elinde dumbbell, diğer el belinde dur.",
      "Gövdeni dumbbell tarafına doğru yana eğ.",
      "Karşı taraf karın yanını sıkarak doğrul.",
      "Öne veya arkaya eğilme; hareket tam yanlamasına olsun.",
      "Bel fıtığın varsa bu hareketi yapma."
    ]
  },
  {
    "id": "yan-lateral-raise",
    "ad_tr": "Yan lateral raise",
    "ad_en": "Dumbbell Lateral Raise",
    "birincil_kas": [
      "yan_omuz"
    ],
    "ikincil_kas": [
      "trapez"
    ],
    "ekipman": [
      "dumbbell"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "omuz_sikismasi"
    ],
    "teknik_zorluk": 2,
    "sfr": 5,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 1,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "ohp",
      "katsayi": 0.12
    },
    "alternatifler": [
      "kablo-lateral-raise",
      "makine-lateral-raise",
      "omuz-presi-dumbbell"
    ],
    "talimat_tr": [
      "Hafif dumbbell’larla başla; bu hareket ağırlıkla bozulur.",
      "Gövden dik, dirseklerin hafif bükülü olsun.",
      "Kolları yanlara doğru omuz hizasına kadar kaldır.",
      "Baş parmağın hafif aşağı baksın, su döker gibi.",
      "Omuz hizasını geçme; yukarısı trapeze geçer."
    ]
  },
  {
    "id": "yan-plank",
    "ad_tr": "Yan plank",
    "ad_en": "Side Plank",
    "birincil_kas": [
      "karin"
    ],
    "ikincil_kas": [
      "bel",
      "kalca"
    ],
    "ekipman": [],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "omuz_instabilite"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "tek_tarafli": true,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0
    },
    "alternatifler": [
      "plank",
      "dead-bug",
      "pallof-press"
    ],
    "talimat_tr": [
      "Yan yat, dirseğin omzunun altında olsun.",
      "Kalçanı yerden kaldır, gövden tek çizgi olsun.",
      "Üstteki eli belinde veya havada tut.",
      "Kalçanın öne veya arkaya dönmesine izin verme.",
      "Zorlanıyorsan dizlerin üstünde yap."
    ]
  },
  {
    "id": "yardimli-barfiks",
    "ad_tr": "Yardımlı barfiks (bant veya makine)",
    "ad_en": "Assisted Pull-up",
    "birincil_kas": [
      "sirt"
    ],
    "ikincil_kas": [
      "biceps",
      "arka_omuz"
    ],
    "ekipman": [
      "barfiks_bari",
      "direnc_bandi"
    ],
    "patern": "cekme_dikey",
    "kontrendikasyon": [
      "omuz_instabilite"
    ],
    "teknik_zorluk": 2,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": true,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 0,
    "vucut_agirligi": true,
    "yuk_referansi": {
      "lift": "row",
      "katsayi": 0
    },
    "alternatifler": [
      "lat-pulldown",
      "barfiks",
      "kablo-oturarak-cekis"
    ],
    "talimat_tr": [
      "Direnç bandını bara dola, dizini veya ayağını bandın içine koy.",
      "Bant ne kadar kalınsa yardım o kadar fazladır.",
      "Omuzları önce aşağı çek, sonra dirsekleri geriye çekerek yüksel.",
      "Bandın seni fırlatmasına izin verme; iniş de kontrollü olsun.",
      "Zamanla daha ince banda geç, sonra bandı bırak."
    ]
  },
  {
    "id": "yatarak-triceps-ekstansiyon",
    "ad_tr": "Yatarak triceps ekstansiyon",
    "ad_en": "Lying Triceps Extension",
    "birincil_kas": [
      "triceps"
    ],
    "ikincil_kas": [],
    "ekipman": [
      "barbell",
      "duz_bench"
    ],
    "patern": "izolasyon",
    "kontrendikasyon": [
      "dirsek_tendinit",
      "omuz_sikismasi"
    ],
    "teknik_zorluk": 3,
    "sfr": 4,
    "eksenel_yuk": "yok",
    "bas_ustu": false,
    "gurultu": false,
    "spotter": false,
    "artis_kg": 2.5,
    "yuk_referansi": {
      "lift": "bench",
      "katsayi": 0.3
    },
    "alternatifler": [
      "triceps-pushdown",
      "triceps-halat-pushdown",
      "overhead-triceps"
    ],
    "talimat_tr": [
      "Bench’e sırtüstü uzan, barı göğsünün üstünde tut.",
      "Dirseklerini sabitle, barı alnına doğru indir.",
      "Üst kolun yere dik kalsın, öne geriye gitmesin.",
      "Yukarı iterken kolları tam kilitleme.",
      "Dirseğinde ağrı hissedersen menzili kısalt veya pushdown’a geç."
    ]
  }
];
