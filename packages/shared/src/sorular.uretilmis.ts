// ÜRETİLMİŞ DOSYA — elle düzenleme.
// Kaynak: data/sorular.json · Derleyici: scripts/sorulari-derle.mjs
import type { SoruBankasi } from './degerlendirme';

export const SORU_BANKASI: SoruBankasi = {
  "version": 1,
  "locale": "tr-TR",
  "toplamSoru": {
    "temel": 114,
    "kosullu": 22,
    "toplam": 136,
    "not": "Temel sorular herkese sorulur. Koşullu sorular yalnızca dallanma tetiklendiğinde çıkar. Vücut haritasında işaretlenen her bölge S9-S13 setini tekrar tetikler."
  },
  "not": "drives alanı, cevabın motorda hangi parametreyi değiştirdiğini söyler. Sürücüsü olmayan soru eklenmez.",
  "tipler": {
    "date": "tarih seçici",
    "number": "sayı, birim alanda belirtilir",
    "single": "tek seçim",
    "multi": "çoklu seçim",
    "scale": "1-10 kaydırıcı",
    "text": "kısa metin",
    "longtext": "uzun metin",
    "bodymap": "vücut haritası üzerinde bölge işaretleme",
    "imagechoice": "görsel seçim",
    "measure": "ölçü grubu",
    "consent": "açık rıza onayı",
    "time": "saat",
    "daterange": "tarih aralığı",
    "liftinput": "ağırlık x tekrar girişi"
  },
  "blocks": [
    {
      "id": "K",
      "title": "Kimlik ve kapı",
      "order": 1,
      "geriBildirim": "Bakım kalorin yaklaşık {tdee} kcal",
      "questions": [
        {
          "id": "K1",
          "text": "Doğum tarihin",
          "type": "date",
          "required": true,
          "drives": [
            "bmr",
            "max_hr",
            "hacim_tolerans",
            "parq_65_ek_tarama"
          ]
        },
        {
          "id": "K2",
          "text": "Biyolojik cinsiyetin",
          "type": "single",
          "required": true,
          "options": [
            "Erkek",
            "Kadın"
          ],
          "drives": [
            "bmr_formul",
            "yag_orani_referans",
            "adet_dongusu_modulu"
          ]
        },
        {
          "id": "K3",
          "text": "Boy uzunluğun",
          "type": "number",
          "unit": "cm",
          "min": 120,
          "max": 230,
          "required": true,
          "drives": [
            "bmr",
            "bki",
            "uzuv_orani"
          ]
        },
        {
          "id": "K4",
          "text": "Güncel kilon",
          "type": "number",
          "unit": "kg",
          "min": 35,
          "max": 300,
          "required": true,
          "drives": [
            "bmr",
            "tdee",
            "baslangic_yuk"
          ]
        },
        {
          "id": "K5",
          "text": "Bu kiloyu ne zaman ölçtün?",
          "type": "single",
          "options": [
            "Bugün",
            "Bu hafta",
            "Bu ay",
            "Daha eski / tahmin"
          ],
          "drives": [
            "veri_guvenilirlik"
          ]
        },
        {
          "id": "K6",
          "text": "Hamile misin veya emziriyor musun?",
          "type": "single",
          "required": true,
          "options": [
            "Hayır",
            "Hamileyim",
            "Emziriyorum"
          ],
          "gate": {
            "if": [
              "Hamileyim",
              "Emziriyorum"
            ],
            "action": "program_uretme",
            "mesaj": "Bu dönemde egzersiz programı uzman gözetimi ister. Doktorunla görüşmeni öneriyoruz."
          },
          "drives": [
            "guvenlik_kapisi"
          ]
        },
        {
          "id": "K7",
          "text": "18 yaşından büyük müsün?",
          "type": "single",
          "required": true,
          "options": [
            "Evet",
            "Hayır"
          ],
          "gate": {
            "if": [
              "Hayır"
            ],
            "action": "kayit_reddet",
            "mesaj": "Uygulamayı 18 yaş ve üzeri kullanabilir."
          },
          "drives": [
            "guvenlik_kapisi"
          ]
        },
        {
          "id": "K8",
          "text": "Şu anda düzenli doktor takibinde misin?",
          "type": "single",
          "options": [
            "Hayır",
            "Evet"
          ],
          "branch": {
            "Evet": [
              "K8a"
            ]
          },
          "drives": [
            "medikal_onay_akisi"
          ]
        },
        {
          "id": "K8a",
          "text": "Hangi konuda takip ediliyorsun?",
          "type": "text",
          "conditional": true,
          "drives": [
            "medikal_bayrak"
          ]
        },
        {
          "id": "K9",
          "text": "Yaşadığın şehir",
          "type": "single",
          "dataSource": "tr_iller",
          "drives": [
            "besin_db_locale",
            "salon_zinciri_tespiti",
            "birim_sistemi"
          ],
          "options": [
            "Adana",
            "Adıyaman",
            "Afyonkarahisar",
            "Ağrı",
            "Amasya",
            "Ankara",
            "Antalya",
            "Artvin",
            "Aydın",
            "Balıkesir",
            "Bilecik",
            "Bingöl",
            "Bitlis",
            "Bolu",
            "Burdur",
            "Bursa",
            "Çanakkale",
            "Çankırı",
            "Çorum",
            "Denizli",
            "Diyarbakır",
            "Edirne",
            "Elazığ",
            "Erzincan",
            "Erzurum",
            "Eskişehir",
            "Gaziantep",
            "Giresun",
            "Gümüşhane",
            "Hakkâri",
            "Hatay",
            "Isparta",
            "Mersin",
            "İstanbul",
            "İzmir",
            "Kars",
            "Kastamonu",
            "Kayseri",
            "Kırklareli",
            "Kırşehir",
            "Kocaeli",
            "Konya",
            "Kütahya",
            "Malatya",
            "Manisa",
            "Kahramanmaraş",
            "Mardin",
            "Muğla",
            "Muş",
            "Nevşehir",
            "Niğde",
            "Ordu",
            "Rize",
            "Sakarya",
            "Samsun",
            "Siirt",
            "Sinop",
            "Sivas",
            "Tekirdağ",
            "Tokat",
            "Trabzon",
            "Tunceli",
            "Şanlıurfa",
            "Uşak",
            "Van",
            "Yozgat",
            "Zonguldak",
            "Aksaray",
            "Bayburt",
            "Karaman",
            "Kırıkkale",
            "Batman",
            "Şırnak",
            "Bartın",
            "Ardahan",
            "Iğdır",
            "Yalova",
            "Karabük",
            "Kilis",
            "Osmaniye",
            "Düzce"
          ]
        },
        {
          "id": "K10",
          "text": "Son 1 yılda kilon nasıl değişti?",
          "type": "single",
          "options": [
            "5 kilodan fazla verdim",
            "1-5 kilo verdim",
            "Değişmedi",
            "1-5 kilo aldım",
            "5 kilodan fazla aldım"
          ],
          "drives": [
            "metabolik_adaptasyon_bayrak",
            "gercekci_hedef_siniri"
          ]
        },
        {
          "id": "K11",
          "text": "Daha önce kaç kez diyet yaptın ve sonuç ne oldu?",
          "type": "single",
          "options": [
            "Hiç yapmadım",
            "Bir kez, kalıcı oldu",
            "Bir kez, geri aldım",
            "Birkaç kez, hep geri aldım",
            "Sürekli deniyorum"
          ],
          "drives": [
            "yoyo_gecmisi",
            "baglilik_risk_skoru"
          ]
        },
        {
          "id": "K12",
          "text": "Yetişkinlikteki en yüksek ve en düşük kilon",
          "type": "measure",
          "fields": [
            "en_yuksek_kg",
            "en_dusuk_kg"
          ],
          "optional": true,
          "drives": [
            "ayar_noktasi_tahmini",
            "gercekci_hedef_araligi"
          ]
        }
      ]
    },
    {
      "id": "H",
      "title": "Hedef ve motivasyon",
      "order": 2,
      "geriBildirim": "Bu hedef {sure} haftada gerçekçi",
      "questions": [
        {
          "id": "H1",
          "text": "Birincil hedefin ne?",
          "type": "single",
          "required": true,
          "options": [
            "Yağ kaybı",
            "Kas kazanımı",
            "Güç artışı",
            "Dayanıklılık",
            "Genel sağlık",
            "Sakatlık sonrası dönüş",
            "Spora özel performans",
            "Duruş ve ağrı"
          ],
          "drives": [
            "periyodizasyon_modeli",
            "kalori_yonu",
            "set_tekrar_semasi"
          ]
        },
        {
          "id": "H2",
          "text": "İkincil hedefin var mı?",
          "type": "single",
          "optional": true,
          "options": [
            "Yok",
            "Yağ kaybı",
            "Kas kazanımı",
            "Güç artışı",
            "Dayanıklılık",
            "Genel sağlık",
            "Duruş ve ağrı"
          ],
          "drives": [
            "ikincil_vurgu",
            "hacim_dagilimi"
          ]
        },
        {
          "id": "H3",
          "text": "Hedef kilon",
          "type": "number",
          "unit": "kg",
          "optional": true,
          "drives": [
            "acik_fazla_buyuklugu",
            "sure_hesabi"
          ],
          "min": 35,
          "max": 300
        },
        {
          "id": "H4",
          "text": "Belirli bir tarihe yetiştirmen gereken bir şey var mı?",
          "type": "single",
          "options": [
            "Yok",
            "Düğün",
            "Tatil",
            "Yarışma",
            "Sağlık kontrolü",
            "Diğer"
          ],
          "branch": {
            "_notYok": [
              "H4a"
            ]
          },
          "drives": [
            "sure_fizibilitesi"
          ]
        },
        {
          "id": "H4a",
          "text": "Hangi tarihe?",
          "type": "date",
          "conditional": true,
          "drives": [
            "sure_fizibilitesi",
            "gerceklik_testi"
          ]
        },
        {
          "id": "H5",
          "text": "Hedeflediğin vücut hangisi?",
          "type": "imagechoice",
          "required": true,
          "imageSet": "vucut_kompozisyon_{cinsiyet}",
          "count": 8,
          "not": "Gerçekçi vücut kompozisyonu görselleri, cinsiyete göre ayrı set",
          "drives": [
            "hedef_yag_orani",
            "kas_dagilimi_vurgusu",
            "gerceklik_kontrolu"
          ]
        },
        {
          "id": "H6",
          "text": "En çok geliştirmek istediğin 3 bölge",
          "type": "bodymap",
          "maxSelect": 3,
          "regions": [
            "gogus",
            "sirt",
            "omuz",
            "kol",
            "karin",
            "kalca",
            "bacak_on",
            "bacak_arka",
            "baldir"
          ],
          "drives": [
            "hacim_tahsisi_x1.25"
          ]
        },
        {
          "id": "H7",
          "text": "Halinden memnun olduğun bölge?",
          "type": "bodymap",
          "maxSelect": 2,
          "optional": true,
          "drives": [
            "koruma_hacmi"
          ]
        },
        {
          "id": "H8",
          "text": "Senin için başarı ne demek?",
          "type": "single",
          "options": [
            "Aynadaki görüntü",
            "Mezura ölçüleri",
            "Kaldırdığım ağırlık",
            "Nasıl hissettiğim",
            "Sağlık verilerim"
          ],
          "drives": [
            "birincil_ilerleme_metrigi",
            "ana_grafik_secimi"
          ]
        },
        {
          "id": "H9",
          "text": "Bu hedefi daha önce kaç kez denedin, neden bıraktın?",
          "type": "single",
          "options": [
            "İlk denemem",
            "Zaman bulamadım",
            "Sonuç göremedim",
            "Sıkıldım",
            "Sakatlandım",
            "Motivasyonum bitti",
            "Program çok zordu"
          ],
          "drives": [
            "birakma_riski",
            "program_agresifligi"
          ]
        },
        {
          "id": "H10",
          "text": "Ayda kaç kilo vermeyi veya almayı bekliyorsun?",
          "type": "number",
          "unit": "kg",
          "required": true,
          "gerceklikTesti": {
            "maxAylikKayipOrani": 0.04,
            "maxAylikKazancKg": 1.2,
            "aksiHalde": "itiraz_et"
          },
          "drives": [
            "gerceklik_testi",
            "hedef_duzeltme"
          ],
          "min": 0,
          "max": 20
        }
      ]
    },
    {
      "id": "A",
      "title": "Antrenman geçmişi",
      "order": 3,
      "geriBildirim": "{seviye} seviye. Haftada {min}-{max} set/kas grubu kaldırırsın",
      "questions": [
        {
          "id": "A1",
          "text": "Ne kadar süredir düzenli ağırlık antrenmanı yapıyorsun?",
          "type": "single",
          "required": true,
          "options": [
            "Hiç yapmadım",
            "6 aydan az",
            "6-12 ay",
            "1-3 yıl",
            "3-5 yıl",
            "5 yıldan fazla"
          ],
          "drives": [
            "antrenman_yasi",
            "hacim_esikleri",
            "ilerleme_hizi"
          ]
        },
        {
          "id": "A2",
          "text": "Şu anda haftada kaç gün antrenman yapıyorsun?",
          "type": "number",
          "min": 0,
          "max": 7,
          "drives": [
            "baslangic_referansi",
            "sicrama_siniri"
          ]
        },
        {
          "id": "A3",
          "text": "Son 3 ayın kaç haftasında düzenli antrenman yaptın?",
          "type": "number",
          "min": 0,
          "max": 13,
          "drives": [
            "antrenmansizlik_degerlendirmesi",
            "yuk_dusurme"
          ]
        },
        {
          "id": "A4",
          "text": "Şu anki programını nereden aldın?",
          "type": "single",
          "options": [
            "Programım yok",
            "Kendim yazdım",
            "İnternetten buldum",
            "PT yazdı",
            "Uygulama verdi"
          ],
          "drives": [
            "terk_edecegi_urun",
            "gecis_mesajlasmasi"
          ]
        },
        {
          "id": "A5",
          "text": "Temel hareketlerde en iyi setin nedir? (biliyorsan)",
          "type": "liftinput",
          "lifts": [
            "Squat",
            "Bench press",
            "Deadlift",
            "Omuz presi"
          ],
          "optional": true,
          "drives": [
            "1rm_tahmini_epley",
            "guc_standartlari",
            "baslangic_yukleri"
          ]
        },
        {
          "id": "A6",
          "text": "Bilmiyorsan: bu hareketlerde 8-10 tekrar yapabildiğin ağırlık",
          "type": "liftinput",
          "lifts": [
            "Squat",
            "Bench press",
            "Deadlift",
            "Omuz presi"
          ],
          "optional": true,
          "drives": [
            "yuk_tahmini_alternatif"
          ],
          "conditionalOn": {
            "A5": "_bos"
          }
        },
        {
          "id": "A7",
          "text": "Vücut ağırlığı kapasiten",
          "type": "measure",
          "fields": [
            "sinav_adet",
            "barfiks_adet",
            "plank_saniye"
          ],
          "drives": [
            "vucut_agirligi_gucu",
            "kalistenik_uygunlugu"
          ]
        },
        {
          "id": "A8",
          "text": "Şu hareketleri doğru yaptığına ne kadar güveniyorsun?",
          "type": "scale",
          "repeatFor": [
            "Squat",
            "Deadlift",
            "Bench press",
            "Omuz presi",
            "Barfiks"
          ],
          "min": 1,
          "max": 5,
          "labels": {
            "1": "Hiç yapmadım",
            "3": "Az çok",
            "5": "Çok eminim"
          },
          "drives": [
            "teknik_guven_skoru",
            "barbell_mi_makine_mi"
          ]
        },
        {
          "id": "A9",
          "text": "Geçmişte yaptığın spor dalları",
          "type": "multi",
          "options": [
            "Futbol",
            "Basketbol",
            "Voleybol",
            "Yüzme",
            "Koşu",
            "Dövüş sporları",
            "Halter",
            "Jimnastik",
            "Bisiklet",
            "Tenis",
            "Dans",
            "Hiçbiri"
          ],
          "drives": [
            "hareket_okuryazarligi",
            "ogrenme_hizi"
          ]
        },
        {
          "id": "A10",
          "text": "Kardiyo kapasiten nasıl?",
          "type": "single",
          "options": [
            "5 km rahat koşarım",
            "2-3 km koşabilirim",
            "Tempolu yürürüm",
            "Merdivende nefesim daralır",
            "Hareketsizim"
          ],
          "drives": [
            "kondisyon_referansi",
            "kardiyo_receti"
          ]
        },
        {
          "id": "A11",
          "text": "Setleri tükenene kadar mı yapıyorsun?",
          "type": "single",
          "options": [
            "Her sette tükenirim",
            "Genelde 1-2 tekrar yedek bırakırım",
            "3-4 yedek bırakırım",
            "Bilmiyorum"
          ],
          "drives": [
            "rpe_kalibrasyonu",
            "efor_tahmini_duzeltme"
          ]
        },
        {
          "id": "A12",
          "text": "Antrenmanda ağrı ile yorgunluğu ayırt edebiliyor musun?",
          "type": "single",
          "options": [
            "Evet, net ayırt ederim",
            "Genelde ederim",
            "Emin değilim",
            "Hayır"
          ],
          "drives": [
            "otoregulasyon_guveni"
          ]
        },
        {
          "id": "A13",
          "text": "Daha önce program takip ederken en çok neyde zorlandın?",
          "type": "single",
          "options": [
            "Zaman ayırmak",
            "Hareketleri doğru yapmak",
            "Ne yiyeceğimi bilmek",
            "Motive kalmak",
            "Programı anlamak",
            "Sonuç göremeyince"
          ],
          "drives": [
            "baglilik_tasarimi",
            "hatirlatma_stratejisi"
          ]
        },
        {
          "id": "A14",
          "text": "Daha önce antrenman günlüğü tuttun mu?",
          "type": "single",
          "options": [
            "Evet, düzenli",
            "Ara sıra",
            "Denedim bıraktım",
            "Hiç"
          ],
          "drives": [
            "kayit_aliskanligi",
            "arayuz_karmasikligi"
          ]
        }
      ]
    },
    {
      "id": "S",
      "title": "Sağlık ve sakatlık",
      "order": 4,
      "kaynak": "PAR-Q+ 2024 ve ACSM ön katılım değerlendirmesi türevi",
      "geriBildirim": "{adet} hareket havuzdan çıkarıldı",
      "questions": [
        {
          "id": "S1",
          "text": "Doktorun kalp rahatsızlığın veya yüksek tansiyonun olduğunu söyledi mi?",
          "type": "single",
          "required": true,
          "options": [
            "Hayır",
            "Evet"
          ],
          "branch": {
            "Evet": [
              "S1a",
              "S1b"
            ]
          },
          "drives": [
            "medikal_onay",
            "yuk_tavani"
          ]
        },
        {
          "id": "S1a",
          "text": "Durumun kontrol altında mı?",
          "type": "single",
          "conditional": true,
          "options": [
            "Evet, ilaçla kontrol altında",
            "Kısmen",
            "Hayır"
          ],
          "drives": [
            "medikal_bayrak"
          ]
        },
        {
          "id": "S1b",
          "text": "Doktorun egzersiz için onay verdi mi?",
          "type": "single",
          "conditional": true,
          "options": [
            "Evet",
            "Hayır",
            "Sormadım"
          ],
          "drives": [
            "medikal_onay_kapisi"
          ]
        },
        {
          "id": "S2",
          "text": "Dinlenirken, gün içinde veya egzersiz sırasında göğsünde ağrı hissediyor musun?",
          "type": "single",
          "required": true,
          "options": [
            "Hayır",
            "Evet"
          ],
          "gate": {
            "if": [
              "Evet"
            ],
            "action": "program_uretme",
            "mesaj": "Göğüs ağrısı egzersiz öncesi mutlaka değerlendirilmeli. Doktoruna başvur, onay aldığında devam ederiz."
          },
          "drives": [
            "guvenlik_kapisi"
          ]
        },
        {
          "id": "S3",
          "text": "Son 12 ayda baş dönmesi nedeniyle dengeni kaybettin veya bilincini yitirdin mi?",
          "type": "single",
          "required": true,
          "options": [
            "Hayır",
            "Evet"
          ],
          "gate": {
            "if": [
              "Evet"
            ],
            "action": "medikal_onay_zorunlu"
          },
          "drives": [
            "guvenlik_kapisi"
          ]
        },
        {
          "id": "S4",
          "text": "Kalp veya tansiyon dışında tanı konmuş kronik bir hastalığın var mı?",
          "type": "multi",
          "options": [
            "Yok",
            "Diyabet",
            "Astım / KOAH",
            "Tiroid",
            "Artrit / eklem romatizması",
            "Böbrek hastalığı",
            "Kanser (geçmiş veya güncel)",
            "Osteoporoz",
            "Diğer"
          ],
          "branch": {
            "Diyabet": [
              "S14"
            ],
            "Astım / KOAH": [
              "S16"
            ]
          },
          "drives": [
            "durum_bazli_dallanma"
          ]
        },
        {
          "id": "S5",
          "text": "Şu anda düzenli kullandığın reçeteli ilaç var mı?",
          "type": "single",
          "options": [
            "Hayır",
            "Evet"
          ],
          "branch": {
            "Evet": [
              "S5a"
            ]
          },
          "drives": [
            "ilac_etkilesim_bayragi"
          ]
        },
        {
          "id": "S5a",
          "text": "Hangileri?",
          "type": "text",
          "conditional": true,
          "ozelKontrol": [
            "beta_bloker",
            "kortikosteroid",
            "kan_sulandirici"
          ],
          "drives": [
            "nabiz_bazli_kardiyo_gecersiz",
            "bag_doku_uyarisi"
          ]
        },
        {
          "id": "S6",
          "text": "Egzersizle kötüleşebilecek kemik, eklem veya yumuşak doku sorunun var mı?",
          "type": "single",
          "required": true,
          "options": [
            "Hayır",
            "Evet"
          ],
          "branch": {
            "Evet": [
              "S8"
            ]
          },
          "drives": [
            "vucut_haritasi_zorunlu"
          ]
        },
        {
          "id": "S7",
          "text": "Doktorun sana egzersiz konusunda kısıtlama koydu mu?",
          "type": "single",
          "required": true,
          "options": [
            "Hayır",
            "Evet"
          ],
          "gate": {
            "if": [
              "Evet"
            ],
            "action": "onay_belgesi_iste"
          },
          "drives": [
            "guvenlik_kapisi"
          ]
        },
        {
          "id": "S8",
          "text": "Ağrın veya sakatlığın olan bölgeleri işaretle",
          "type": "bodymap",
          "regions": [
            "boyun",
            "omuz_sag",
            "omuz_sol",
            "dirsek_sag",
            "dirsek_sol",
            "bilek_sag",
            "bilek_sol",
            "ust_sirt",
            "bel",
            "kalca_sag",
            "kalca_sol",
            "diz_sag",
            "diz_sol",
            "ayak_bilegi_sag",
            "ayak_bilegi_sol"
          ],
          "repeatBranch": [
            "S9",
            "S10",
            "S11",
            "S12",
            "S13"
          ],
          "drives": [
            "hareket_filtresi"
          ]
        },
        {
          "id": "S9",
          "text": "Ne zaman başladı?",
          "type": "single",
          "conditional": true,
          "options": [
            "Son 1 ay",
            "1-6 ay",
            "6-12 ay",
            "1 yıldan uzun",
            "Kronik"
          ],
          "drives": [
            "akut_mu_kronik_mi"
          ]
        },
        {
          "id": "S10",
          "text": "Tanı kondu mu?",
          "type": "single",
          "conditional": true,
          "options": [
            "Evet, tanı var",
            "Hayır, sadece ağrıyor"
          ],
          "branch": {
            "Evet, tanı var": [
              "S10a"
            ]
          },
          "drives": [
            "kontrendikasyon_eslesmesi"
          ]
        },
        {
          "id": "S10a",
          "text": "Tanı nedir?",
          "type": "text",
          "conditional": true,
          "drives": [
            "kontrendikasyon_eslesmesi"
          ]
        },
        {
          "id": "S11",
          "text": "Şu anki ağrı seviyen",
          "type": "scale",
          "conditional": true,
          "min": 0,
          "max": 10,
          "drives": [
            "yuk_tavani",
            "hacim_x0.60"
          ]
        },
        {
          "id": "S12",
          "text": "Hangi harekette artıyor?",
          "type": "multi",
          "conditional": true,
          "options": [
            "Öne eğilme",
            "Geriye yaslanma",
            "Ağırlık kaldırma",
            "Baş üstü hareket",
            "Çömelme",
            "Koşma / zıplama",
            "Dönme",
            "Uzun oturma",
            "Belli değil"
          ],
          "drives": [
            "hareket_paterni_filtresi"
          ]
        },
        {
          "id": "S13",
          "text": "Ameliyat oldun veya fizyoterapi aldın mı?",
          "type": "single",
          "conditional": true,
          "options": [
            "Hayır",
            "Fizyoterapi aldım",
            "Ameliyat oldum",
            "İkisi de"
          ],
          "drives": [
            "rehabilitasyon_durumu"
          ]
        },
        {
          "id": "S14",
          "text": "Diyabet tipin ve insülin kullanımın",
          "type": "single",
          "conditional": true,
          "options": [
            "Tip 1, insülin kullanıyorum",
            "Tip 2, insülin kullanıyorum",
            "Tip 2, ilaç kullanıyorum",
            "Tip 2, diyetle kontrol"
          ],
          "drives": [
            "kan_sekeri_protokolu",
            "karbonhidrat_zamanlamasi"
          ]
        },
        {
          "id": "S15",
          "text": "Tansiyon değerlerin kontrol altında mı?",
          "type": "single",
          "options": [
            "Tansiyonum normal",
            "İlaçla kontrol altında",
            "Kontrolsüz / bilmiyorum"
          ],
          "drives": [
            "valsalva_uyarisi",
            "bas_ustu_siniri",
            "izometrik_kisit"
          ]
        },
        {
          "id": "S16",
          "text": "Solunum durumun",
          "type": "single",
          "conditional": true,
          "options": [
            "Kontrol altında",
            "Efor sırasında zorlanırım",
            "Sık atak geçiririm"
          ],
          "drives": [
            "kardiyo_yogunluk_tavani",
            "isinma_uzatma"
          ]
        },
        {
          "id": "S17",
          "text": "Fıtık tanısı aldın mı?",
          "type": "multi",
          "options": [
            "Hayır",
            "Bel fıtığı",
            "Boyun fıtığı",
            "Kasık fıtığı"
          ],
          "drives": [
            "eksenel_yuklenme_minimize",
            "yerden_cekis_cikar"
          ]
        },
        {
          "id": "S18",
          "text": "Geçmişte veya şu anda yeme bozukluğu yaşadın mı ya da tedavi gördün mü?",
          "type": "single",
          "required": true,
          "options": [
            "Hayır",
            "Evet",
            "Paylaşmak istemiyorum"
          ],
          "gate": {
            "if": [
              "Evet"
            ],
            "action": "ed_modu_ac",
            "mesaj": "Beslenme tarafını sayı göstermeden, porsiyon diliyle anlatacağız. İstersen ayarlardan değiştirebilirsin."
          },
          "drives": [
            "ed_modu",
            "kalori_gizle",
            "kilo_grafigi_gizle"
          ]
        },
        {
          "id": "S19",
          "text": "Tanı konmuş bir ruh sağlığı durumun var mı?",
          "type": "multi",
          "optional": true,
          "options": [
            "Yok",
            "Depresyon",
            "Anksiyete",
            "DEHB",
            "Diğer",
            "Paylaşmak istemiyorum"
          ],
          "drives": [
            "bildirim_tonu",
            "hedef_agresifligi",
            "dil_secimi"
          ]
        },
        {
          "id": "S20",
          "text": "Adet döngün ve durumun",
          "type": "single",
          "conditionalOn": {
            "K2": "Kadın"
          },
          "options": [
            "Düzenli",
            "Düzensiz",
            "PCOS tanım var",
            "Menopoz dönemindeyim",
            "Menopoz sonrası",
            "Doğum kontrol kullanıyorum"
          ],
          "drives": [
            "dongu_bazli_programlama",
            "demir_kalori_degerlendirmesi"
          ]
        }
      ]
    },
    {
      "id": "E",
      "title": "Ekipman ve ortam",
      "order": 5,
      "geriBildirim": "Salonunda {adet} hareket yapılabilir",
      "questions": [
        {
          "id": "E1",
          "text": "Nerede antrenman yapacaksın?",
          "type": "single",
          "required": true,
          "options": [
            "Spor salonu",
            "Ev",
            "Açık hava",
            "Karma"
          ],
          "branch": {
            "Spor salonu": [
              "E2",
              "E4",
              "E9",
              "E12"
            ],
            "Ev": [
              "E5",
              "E6",
              "E7",
              "E5a"
            ],
            "Karma": [
              "E2",
              "E4",
              "E9",
              "E12",
              "E5",
              "E6",
              "E7",
              "E5a"
            ],
            "Açık hava": [
              "E6"
            ]
          },
          "drives": [
            "ana_hareket_havuzu"
          ]
        },
        {
          "id": "E2",
          "text": "Salonun hangisi?",
          "type": "single",
          "conditional": true,
          "options": [
            "MACFit",
            "Fit In Time",
            "B-Fit",
            "Sportium",
            "Üniversite / kurum salonu",
            "Bağımsız salon",
            "Diğer"
          ],
          "drives": [
            "ekipman_envanteri_ondoldur"
          ]
        },
        {
          "id": "E3",
          "text": "Kullanabildiğin ekipmanları seç",
          "type": "multi",
          "required": true,
          "visual": true,
          "options": [
            "Barbell ve plaka",
            "Dumbbell",
            "Kettlebell",
            "Leg press",
            "Hack squat",
            "Lat pulldown",
            "Kablo makinesi",
            "Smith makinesi",
            "Barfiks barı",
            "Dip barı",
            "Düz bench",
            "Eğimli bench",
            "Ayarlanabilir bench",
            "Direnç bandı",
            "Koşu bandı",
            "Sabit bisiklet",
            "Kürek makinesi",
            "Merdiven",
            "TRX / askı",
            "Squat rack",
            "Göğüs presi makinesi",
            "Sırt makinesi",
            "Omuz presi makinesi",
            "Bacak ekstansiyon / curl makinesi",
            "Baldır makinesi",
            "Abduktor / adduktor makinesi",
            "Preacher bench",
            "Roma sandalyesi / hiperekstansiyon",
            "Plyo box",
            "Hiçbiri, vücut ağırlığı"
          ],
          "drives": [
            "kisit_cozucu_ana_girdi"
          ],
          "onDoldurma": "E2 cevabina gore salonOnDoldurma() ile isaretlenir; kullanici degistirebilir."
        },
        {
          "id": "E4",
          "text": "Salonun kalabalık mı? Makine için beklemek zorunda kalıyor musun?",
          "type": "single",
          "conditional": true,
          "options": [
            "Hiç beklemem",
            "Bazen beklerim",
            "Sık sık beklerim",
            "Sürekli kalabalık"
          ],
          "drives": [
            "superset_uygunlugu",
            "populer_makine_alternatifi"
          ]
        },
        {
          "id": "E5",
          "text": "Evde ne kadar alanın var?",
          "type": "single",
          "conditional": true,
          "options": [
            "Bir mat kadar",
            "Küçük oda",
            "Geniş oda",
            "Ayrı çalışma alanı / garaj"
          ],
          "drives": [
            "alan_filtresi"
          ]
        },
        {
          "id": "E5a",
          "text": "Tavan yüksekliğin baş üstü hareket için yeterli mi?",
          "type": "single",
          "conditional": true,
          "options": [
            "Evet",
            "Hayır",
            "Emin değilim"
          ],
          "drives": [
            "bas_ustu_filtresi"
          ]
        },
        {
          "id": "E6",
          "text": "Gürültü kısıtın var mı?",
          "type": "single",
          "conditional": true,
          "options": [
            "Yok",
            "Var, zıplayamam",
            "Var, ağırlık bırakamam",
            "İkisi de"
          ],
          "drives": [
            "pliometrik_cikar",
            "agirlik_birakma_cikar"
          ]
        },
        {
          "id": "E7",
          "text": "Dumbbell ağırlık aralığın",
          "type": "measure",
          "conditional": true,
          "fields": [
            "min_kg",
            "max_kg"
          ],
          "drives": [
            "yuk_ilerleme_tavani",
            "varyant_degisimi"
          ]
        },
        {
          "id": "E8",
          "text": "Antrenman partnerin var mı?",
          "type": "single",
          "options": [
            "Hayır",
            "Bazen",
            "Evet, düzenli"
          ],
          "drives": [
            "spotter_guvenligi",
            "agir_bench_izni"
          ]
        },
        {
          "id": "E9",
          "text": "Salona ulaşman ne kadar sürüyor?",
          "type": "single",
          "conditional": true,
          "options": [
            "10 dakikadan az",
            "10-25 dakika",
            "25-45 dakika",
            "45 dakikadan fazla"
          ],
          "drives": [
            "gercekci_seans_suresi"
          ]
        },
        {
          "id": "E10",
          "text": "Antrenman sırasında telefonunu yanında tutabiliyor musun?",
          "type": "single",
          "options": [
            "Evet",
            "Hayır",
            "Bazen"
          ],
          "drives": [
            "program_gosterim_bicimi"
          ]
        },
        {
          "id": "E11",
          "text": "Ayna var mı?",
          "type": "single",
          "options": [
            "Var",
            "Yok"
          ],
          "drives": [
            "form_kontrol_ipuclari"
          ]
        },
        {
          "id": "E12",
          "text": "Salon üyeliğin ne zaman bitiyor?",
          "type": "date",
          "conditional": true,
          "optional": true,
          "drives": [
            "program_ufku",
            "ev_programina_gecis"
          ]
        }
      ]
    },
    {
      "id": "Z",
      "title": "Zaman ve program",
      "order": 6,
      "geriBildirim": "{split} {gun} gün sana uygun",
      "questions": [
        {
          "id": "Z1",
          "text": "Haftada kaç gün antrenman yapabilirsin? İstediğin değil, gerçekten yapabileceğin.",
          "type": "single",
          "required": true,
          "options": [
            "2 gün",
            "3 gün",
            "4 gün",
            "5 gün",
            "6 gün"
          ],
          "drives": [
            "split_secimi"
          ]
        },
        {
          "id": "Z2",
          "text": "Bir seansa kaç dakika ayırabilirsin?",
          "type": "single",
          "required": true,
          "options": [
            "30 dakika",
            "45 dakika",
            "60 dakika",
            "75 dakika",
            "90 dakika ve üzeri"
          ],
          "drives": [
            "seans_hacim_tavani",
            "superset_zorunlulugu"
          ]
        },
        {
          "id": "Z3",
          "text": "Hangi günler uygun?",
          "type": "multi",
          "options": [
            "Pazartesi",
            "Salı",
            "Çarşamba",
            "Perşembe",
            "Cuma",
            "Cumartesi",
            "Pazar"
          ],
          "drives": [
            "takvim_yerlesimi",
            "kas_grubu_dinlenme"
          ]
        },
        {
          "id": "Z4",
          "text": "Genelde günün hangi saatinde antrenman yaparsın?",
          "type": "single",
          "options": [
            "Sabah erken",
            "Öğlen",
            "Akşamüstü",
            "Akşam geç"
          ],
          "drives": [
            "ogun_zamanlamasi",
            "kafein_tavsiyesi"
          ]
        },
        {
          "id": "Z5",
          "text": "Programın sabit günlerde mi olsun, esnek mi?",
          "type": "single",
          "options": [
            "Sabit günler",
            "Esnek, ben ayarlarım"
          ],
          "drives": [
            "kacirilan_gun_telafi"
          ]
        },
        {
          "id": "Z6",
          "text": "Önümüzdeki 12 haftada tatil, seyahat veya çok yoğun bir dönem var mı?",
          "type": "daterange",
          "optional": true,
          "multiple": true,
          "drives": [
            "deload_yerlesimi",
            "seyahat_protokolu"
          ]
        },
        {
          "id": "Z7",
          "text": "Vardiyalı mı çalışıyorsun?",
          "type": "single",
          "options": [
            "Hayır",
            "Evet"
          ],
          "drives": [
            "toparlanma_modeli",
            "sabit_saat_varsayimi_kaldir"
          ]
        },
        {
          "id": "Z8",
          "text": "Hafta sonu düzenin hafta içinden farklı mı?",
          "type": "single",
          "options": [
            "Aynı",
            "Farklı"
          ],
          "drives": [
            "kalori_dongusu",
            "ogun_plani_farklilastirma"
          ]
        }
      ]
    },
    {
      "id": "Y",
      "title": "Yaşam tarzı ve toparlanma",
      "order": 7,
      "geriBildirim": "Uykun {durum}, hacmi %{oran} ayarladım",
      "questions": [
        {
          "id": "Y1",
          "text": "Gecede ortalama kaç saat uyuyorsun?",
          "type": "single",
          "required": true,
          "options": [
            "5 saatten az",
            "5-6 saat",
            "6-7 saat",
            "7-8 saat",
            "8 saatten fazla"
          ],
          "drives": [
            "toparlanma_kapasitesi",
            "hacim_x0.88"
          ]
        },
        {
          "id": "Y2",
          "text": "Uyku kaliteni nasıl değerlendirirsin?",
          "type": "scale",
          "min": 1,
          "max": 10,
          "drives": [
            "toparlanma",
            "ilerleme_hizi_beklentisi"
          ]
        },
        {
          "id": "Y3",
          "text": "Uykuya dalmakta zorlanır veya gece uyanır mısın?",
          "type": "single",
          "options": [
            "Hayır",
            "Dalmakta zorlanırım",
            "Gece uyanırım",
            "İkisi de"
          ],
          "drives": [
            "kafein_kesme_saati"
          ]
        },
        {
          "id": "Y4",
          "text": "İşin nasıl geçiyor?",
          "type": "single",
          "required": true,
          "options": [
            "Masa başı, çoğunlukla oturarak",
            "Karma, biraz ayakta",
            "Ayakta çalışıyorum",
            "Fiziksel iş yapıyorum",
            "Çalışmıyorum"
          ],
          "drives": [
            "tdee_aktivite_carpani",
            "neat_tahmini"
          ]
        },
        {
          "id": "Y5",
          "text": "Günlük adım sayını biliyor musun?",
          "type": "single",
          "options": [
            "3.000'den az",
            "3.000-6.000",
            "6.000-10.000",
            "10.000'den fazla",
            "Bilmiyorum"
          ],
          "drives": [
            "neat_hassaslastirma"
          ]
        },
        {
          "id": "Y6",
          "text": "Genel stres seviyen",
          "type": "scale",
          "min": 1,
          "max": 10,
          "drives": [
            "hacim_x0.90",
            "deload_sikligi"
          ]
        },
        {
          "id": "Y7",
          "text": "Sigara kullanıyor musun?",
          "type": "single",
          "options": [
            "Hayır",
            "Bıraktım",
            "Ara sıra",
            "Düzenli"
          ],
          "drives": [
            "kardiyo_kapasite_beklentisi",
            "toparlanma"
          ]
        },
        {
          "id": "Y8",
          "text": "Haftada ne kadar alkol tüketiyorsun?",
          "type": "single",
          "options": [
            "Hiç",
            "Ayda birkaç",
            "Haftada 1-2 kadeh",
            "Haftada 3-7 kadeh",
            "Daha fazla"
          ],
          "drives": [
            "kalori_butcesi",
            "toparlanma",
            "protein_sentezi"
          ]
        },
        {
          "id": "Y9",
          "text": "Günde kaç kahve veya çay içiyorsun ve en geç saat kaçta?",
          "type": "measure",
          "fields": [
            "adet",
            "son_saat"
          ],
          "drives": [
            "uyku_etkilesimi",
            "antrenman_oncesi_kafein"
          ]
        },
        {
          "id": "Y10",
          "text": "Günde ne kadar su içiyorsun?",
          "type": "single",
          "options": [
            "1 litreden az",
            "1-1,5 litre",
            "1,5-2,5 litre",
            "2,5 litreden fazla",
            "Takip etmiyorum"
          ],
          "drives": [
            "sivi_hedefi",
            "kilo_dalgalanma_aciklamasi"
          ]
        },
        {
          "id": "Y11",
          "text": "Gün içinde en enerjik olduğun zaman?",
          "type": "single",
          "options": [
            "Sabah",
            "Öğlen",
            "Akşamüstü",
            "Gece"
          ],
          "drives": [
            "antrenman_saati_onerisi"
          ]
        },
        {
          "id": "Y12",
          "text": "Çevrende spor yapan biri var mı? Destekleniyor musun?",
          "type": "single",
          "options": [
            "Evet, destekleniyorum",
            "Var ama ilgilenmiyorlar",
            "Kimse yok",
            "Olumsuz tepki alıyorum"
          ],
          "drives": [
            "sosyal_destek",
            "baglilik_tahmini"
          ]
        }
      ]
    },
    {
      "id": "B",
      "title": "Beslenme",
      "order": 8,
      "geriBildirim": "Protein hedefin {gram} g",
      "questions": [
        {
          "id": "B1",
          "text": "Şu anda nasıl besleniyorsun?",
          "type": "single",
          "options": [
            "Serbest, takip etmiyorum",
            "Diyet yapıyorum",
            "Kalori sayıyorum",
            "Diyetisyen takibindeyim"
          ],
          "drives": [
            "baslangic_noktasi",
            "gecis_yumusakligi"
          ]
        },
        {
          "id": "B2",
          "text": "Günde kaç öğün yiyorsun?",
          "type": "single",
          "options": [
            "1",
            "2",
            "3",
            "4",
            "5 ve üzeri"
          ],
          "drives": [
            "ogun_sayisi",
            "protein_dagilimi"
          ]
        },
        {
          "id": "B3",
          "text": "Öğün saatlerin genelde nasıl?",
          "type": "measure",
          "fields": [
            "kahvalti",
            "ogle",
            "aksam",
            "ara_ogun"
          ],
          "drives": [
            "plan_zamanlamasi",
            "antrenman_cevresi_beslenme"
          ]
        },
        {
          "id": "B4",
          "text": "Kahvaltı yapar mısın?",
          "type": "single",
          "options": [
            "Her gün",
            "Bazen",
            "Hiç yapmam"
          ],
          "drives": [
            "ogun_penceresi"
          ]
        },
        {
          "id": "B5",
          "text": "Yemeklerini kim hazırlıyor?",
          "type": "single",
          "required": true,
          "kritik": true,
          "options": [
            "Kendim",
            "Ailem",
            "Dışarıdan alıyorum",
            "Karışık"
          ],
          "drives": [
            "plan_bicimi_menu_mu_porsiyon_mu"
          ],
          "not": "Ailem seçilirse plan menü dayatmaz, mevcut ev yemeğine porsiyon ve tamamlayıcı önerir. Hiçbir yabancı rakipte bu soru yok."
        },
        {
          "id": "B6",
          "text": "Haftada kaç öğünü dışarıda yiyorsun?",
          "type": "single",
          "options": [
            "Hiç",
            "1-3",
            "4-7",
            "8-14",
            "Neredeyse hepsi"
          ],
          "drives": [
            "disarida_yeme_stratejisi",
            "restoran_db_onceligi"
          ]
        },
        {
          "id": "B7",
          "text": "Yemek pişirebiliyor musun? Günde kaç dakika ayırabilirsin?",
          "type": "single",
          "options": [
            "Pişiremem",
            "15 dakikaya kadar",
            "30 dakikaya kadar",
            "45 dakika ve üzeri"
          ],
          "drives": [
            "tarif_karmasiklik_tavani"
          ]
        },
        {
          "id": "B8",
          "text": "Aylık yemek bütçen yaklaşık ne kadar?",
          "type": "single",
          "required": true,
          "kritik": true,
          "options": [
            "Çok kısıtlı",
            "Orta",
            "Rahat",
            "Kısıt yok"
          ],
          "drives": [
            "ogun_maliyet_tavani"
          ],
          "not": "Pahalı protein kaynağı önerilmemesini sağlar. Rakiplerde hiç yok."
        },
        {
          "id": "B9",
          "text": "Gıda alerjin var mı?",
          "type": "multi",
          "options": [
            "Yok",
            "Fıstık",
            "Ağaç kuruyemişleri",
            "Süt",
            "Yumurta",
            "Balık",
            "Kabuklu deniz ürünleri",
            "Soya",
            "Buğday",
            "Susam",
            "Diğer"
          ],
          "filtreTipi": "sert",
          "drives": [
            "tarif_sert_filtre"
          ]
        },
        {
          "id": "B10",
          "text": "İntoleransın var mı?",
          "type": "multi",
          "options": [
            "Yok",
            "Laktoz",
            "Gluten",
            "FODMAP",
            "Fruktoz",
            "Histamin"
          ],
          "filtreTipi": "sert",
          "drives": [
            "malzeme_ikamesi"
          ]
        },
        {
          "id": "B11",
          "text": "Dini veya etik kısıtın var mı?",
          "type": "multi",
          "options": [
            "Yok",
            "Helal",
            "Domuz yemem",
            "Vejetaryen",
            "Vegan",
            "Pesketaryen"
          ],
          "filtreTipi": "sert",
          "drives": [
            "protein_kaynak_havuzu"
          ]
        },
        {
          "id": "B12",
          "text": "Ramazan'da oruç tutar mısın?",
          "type": "single",
          "kritik": true,
          "options": [
            "Evet",
            "Hayır",
            "Bazı günler"
          ],
          "drives": [
            "ramazan_modu",
            "ogun_penceresi_iftar_sahur",
            "antrenman_saati",
            "sivi_protokolu"
          ],
          "not": "Hiçbir global rakipte yok."
        },
        {
          "id": "B13",
          "text": "Hiç sevmediğin, yemeyeceğin yiyecekler?",
          "type": "multi",
          "options": [
            "Yok",
            "Balık",
            "Karaciğer / sakatat",
            "Kuzu eti",
            "Mantar",
            "Patlıcan",
            "Bakliyat",
            "Süt",
            "Yoğurt",
            "Zeytin",
            "Acı yiyecekler",
            "Diğer"
          ],
          "filtreTipi": "yumusak",
          "drives": [
            "tarif_havuzundan_cikar"
          ]
        },
        {
          "id": "B14",
          "text": "Vazgeçemeyeceğin yiyecek ne?",
          "type": "text",
          "kritik": true,
          "drives": [
            "plana_zorunlu_dahil"
          ],
          "not": "Yasaklanmaz, haftada en az 2 kez plana dahil edilir. Bağlılığın en büyük kaldıracı."
        },
        {
          "id": "B15",
          "text": "Tipik bir gününde ne yiyorsun? Serbestçe anlat.",
          "type": "longtext",
          "aiYorumlanir": true,
          "drives": [
            "mevcut_aliskanlik_cikarimi",
            "gercekci_ilk_plan"
          ]
        },
        {
          "id": "B16",
          "text": "Tatlı isteği yaşar mısın? Ne zaman?",
          "type": "single",
          "options": [
            "Yaşamam",
            "Yemekten sonra",
            "İkindi",
            "Gece",
            "Stresliyken"
          ],
          "drives": [
            "karbonhidrat_zamanlamasi",
            "planli_tatli"
          ]
        },
        {
          "id": "B17",
          "text": "Gece yeme alışkanlığın var mı?",
          "type": "single",
          "options": [
            "Yok",
            "Bazen",
            "Sık sık",
            "Her gece"
          ],
          "drives": [
            "kalori_dagilimi_aksama_kaydir"
          ]
        },
        {
          "id": "B18",
          "text": "Stresliyken yemek yer misin?",
          "type": "single",
          "options": [
            "Hayır",
            "Bazen",
            "Sık sık",
            "Her zaman"
          ],
          "drives": [
            "duygusal_yeme_modulu",
            "sayi_gosterim_tonu"
          ]
        },
        {
          "id": "B19",
          "text": "Kullandığın takviyeler",
          "type": "multi",
          "options": [
            "Hiçbiri",
            "Protein tozu",
            "Kreatin",
            "Multivitamin",
            "D vitamini",
            "Omega 3",
            "Magnezyum",
            "B12",
            "Demir",
            "Diğer"
          ],
          "drives": [
            "mukerrer_oneri_engeli",
            "etkilesim_uyarisi"
          ]
        },
        {
          "id": "B20",
          "text": "Protein tozu kullanır mısın veya kullanmaya açık mısın?",
          "type": "single",
          "options": [
            "Kullanıyorum",
            "Açığım",
            "Kullanmam"
          ],
          "drives": [
            "protein_hedefine_ulasma_stratejisi"
          ]
        },
        {
          "id": "B21",
          "text": "Protein kaynaklarını ne sıklıkla tüketiyorsun?",
          "type": "scale",
          "repeatFor": [
            "Kırmızı et",
            "Tavuk",
            "Balık",
            "Yumurta",
            "Süt ürünleri",
            "Bakliyat"
          ],
          "min": 0,
          "max": 7,
          "unit": "gün/hafta",
          "drives": [
            "protein_kaynak_dagilimi",
            "demir_b12_degerlendirmesi"
          ]
        },
        {
          "id": "B22",
          "text": "Günde kaç porsiyon sebze ve meyve yiyorsun?",
          "type": "single",
          "options": [
            "Hiç",
            "1-2",
            "3-4",
            "5 ve üzeri"
          ],
          "drives": [
            "lif_hedefi",
            "mikrobesin_boslugu"
          ]
        },
        {
          "id": "B23",
          "text": "Sindirim sorunun var mı?",
          "type": "multi",
          "options": [
            "Yok",
            "Şişkinlik",
            "Kabızlık",
            "İshal",
            "Reflü",
            "Gaz"
          ],
          "drives": [
            "lif_artis_hizi",
            "fodmap_degerlendirmesi"
          ]
        },
        {
          "id": "B24",
          "text": "Nasıl ölçersin?",
          "type": "single",
          "required": true,
          "options": [
            "Mutfak tartısıyla tartarım",
            "Kaşık, tabak gibi ev ölçüleriyle",
            "Göz kararı"
          ],
          "drives": [
            "porsiyon_giris_arayuzu"
          ],
          "not": "Diyetkolik'in en beğenilen övgüsü ölçü çeşitliliğiydi. Türkiye'de insanlar gram değil kaşık, tabak, kepçe kullanıyor."
        },
        {
          "id": "B25",
          "text": "Buzdolabında ve dolabında genelde ne bulunur?",
          "type": "multi",
          "options": [
            "Yumurta",
            "Tavuk",
            "Kıyma",
            "Peynir",
            "Yoğurt",
            "Süt",
            "Domates",
            "Soğan",
            "Patates",
            "Bulgur",
            "Pirinç",
            "Makarna",
            "Mercimek",
            "Nohut",
            "Kuru fasulye",
            "Zeytinyağı",
            "Salça",
            "Ekmek",
            "Yulaf",
            "Tuna konservesi"
          ],
          "drives": [
            "buzdolabi_baslangic_envanteri"
          ]
        }
      ]
    },
    {
      "id": "T",
      "title": "Tercih ve psikoloji",
      "order": 9,
      "geriBildirim": "Kardiyoyu {tercih}, ona göre ayarladım",
      "questions": [
        {
          "id": "T1",
          "text": "Hangi antrenman tarzına yakınsın?",
          "type": "single",
          "options": [
            "Bodybuilding / estetik",
            "Powerlifting / güç",
            "Kalistenik",
            "CrossFit",
            "HYROX / hibrit",
            "Fonksiyonel",
            "Fark etmez"
          ],
          "drives": [
            "hareket_secim_agirliklari",
            "set_tekrar_semasi",
            "ilerleme_modeli"
          ]
        },
        {
          "id": "T2",
          "text": "Hiç yapmak istemediğin hareket var mı?",
          "type": "multi",
          "options": [
            "Yok",
            "Burpee",
            "Deadlift",
            "Squat",
            "Koşu",
            "Ip atlama",
            "Baş üstü pres",
            "Barfiks",
            "Diğer"
          ],
          "drives": [
            "havuzdan_cikar",
            "muadil_atama"
          ]
        },
        {
          "id": "T3",
          "text": "Kardiyo hakkında ne düşünüyorsun?",
          "type": "single",
          "options": [
            "Severim",
            "Katlanırım",
            "Nefret ederim"
          ],
          "drives": [
            "kardiyo_receti",
            "neat_agirlikli_alternatif"
          ]
        },
        {
          "id": "T4",
          "text": "Kısa ve yoğun mu, uzun ve sakin mi?",
          "type": "single",
          "options": [
            "Kısa ve yoğun",
            "Uzun ve sakin",
            "Fark etmez"
          ],
          "drives": [
            "dinlenme_sureleri",
            "yogunluk_teknikleri"
          ]
        },
        {
          "id": "T5",
          "text": "Tek başına mı, kalabalıkta mı daha rahatsın?",
          "type": "single",
          "options": [
            "Tek başıma",
            "Kalabalık sorun değil",
            "Kalabalıkta rahatsız olurum"
          ],
          "drives": [
            "salon_saat_onerisi"
          ]
        },
        {
          "id": "T6",
          "text": "Motivasyonun genelde ne zaman düşer?",
          "type": "single",
          "options": [
            "İlk 2 hafta sonra",
            "1 ay sonra",
            "Sonuç göremeyince",
            "Bir gün kaçırınca",
            "Kış aylarında",
            "Düşmez"
          ],
          "drives": [
            "proaktif_mudahale_zamanlamasi"
          ]
        },
        {
          "id": "T7",
          "text": "Hatırlatma almak ister misin?",
          "type": "single",
          "options": [
            "İstemem",
            "Sadece antrenman günü",
            "Günde bir",
            "Sık olsun"
          ],
          "varsayilan": "Sadece antrenman günü",
          "drives": [
            "bildirim_stratejisi"
          ]
        },
        {
          "id": "T8",
          "text": "Programda çeşitlilik mi, tutarlılık mı istersin?",
          "type": "single",
          "options": [
            "Tutarlılık, aynı hareketler",
            "Dengeli",
            "Çeşitlilik, sık değişsin"
          ],
          "drives": [
            "hareket_rotasyon_sikligi"
          ]
        },
        {
          "id": "T9",
          "text": "Antrenmanda müzik veya podcast dinler misin?",
          "type": "single",
          "options": [
            "Evet",
            "Hayır"
          ],
          "drives": [
            "sesli_yonlendirme_varsayilani"
          ]
        },
        {
          "id": "T10",
          "text": "Kendini ne kadar disiplinli görüyorsun?",
          "type": "scale",
          "min": 1,
          "max": 10,
          "drives": [
            "program_agresifligi",
            "baslangic_kolayligi"
          ]
        }
      ]
    },
    {
      "id": "F",
      "title": "Ölçüm ve fotoğraf",
      "order": 10,
      "geriBildirim": "Vücut analizin hazırlanıyor",
      "questions": [
        {
          "id": "F1",
          "text": "Çevre ölçülerin",
          "type": "measure",
          "optional": true,
          "fields": [
            "bel_cm",
            "kalca_cm",
            "gogus_cm",
            "kol_cm",
            "uyluk_cm",
            "boyun_cm"
          ],
          "drives": [
            "navy_yag_orani",
            "ilerleme_metrigi",
            "bel_boy_orani"
          ]
        },
        {
          "id": "F2",
          "text": "Vücut yağ oranını biliyor musun?",
          "type": "number",
          "unit": "%",
          "optional": true,
          "drives": [
            "katch_mcardle_bmr"
          ],
          "min": 3,
          "max": 60
        },
        {
          "id": "F3",
          "text": "Fotoğraf: ön, yan, arka",
          "type": "photo",
          "count": 3,
          "protokol": {
            "mesafe_m": 2,
            "aci": "telefon yere dik, jiroskopla doğrulanır",
            "zemin": "düz ve sade",
            "isik": "gündüz, tepe ışığı değil",
            "kiyafet": "dar veya spor kıyafet"
          },
          "drives": [
            "yag_orani_tahmini",
            "kas_dagilimi",
            "durus_degerlendirmesi"
          ]
        },
        {
          "id": "F4",
          "text": "Fotoğraf gizlilik onayı",
          "type": "consent",
          "required": true,
          "metin": "Fotoğrafın analiz edildikten sonra anında silinir. Sunucumuzda saklanmaz. Yalnızca çıkarılan sayısal ölçümler kaydedilir. Karşılaştırma için tuttuğumuz kopya yalnızca senin telefonunda kalır.",
          "drives": [
            "kvkk_acik_riza"
          ]
        },
        {
          "id": "F5",
          "text": "Duruş değerlendirmesi için ek yan profil",
          "type": "photo",
          "count": 1,
          "optional": true,
          "drives": [
            "kifoz_lordoz_egilimi",
            "omuz_protraksiyonu",
            "mobilite_receti"
          ]
        },
        {
          "id": "F6",
          "text": "Fotoğraf çekmek istemiyorum",
          "type": "single",
          "options": [
            "Ölçülerle devam etmek istiyorum"
          ],
          "cikisYolu": true,
          "drives": [
            "alternatif_akis"
          ],
          "not": "Engel değil. Analiz kalitesi düşer, kullanıcıya bu söylenir, akış devam eder."
        }
      ]
    }
  ],
  "guvenlikKapilari": [
    {
      "id": "yas",
      "tetik": "K7 = Hayır",
      "eylem": "kayit_reddet"
    },
    {
      "id": "gebelik",
      "tetik": "K6 = Hamileyim | Emziriyorum",
      "eylem": "program_uretme"
    },
    {
      "id": "kardiyak",
      "tetik": "S2 = Evet | S3 = Evet | S7 = Evet",
      "eylem": "program_uretme_medikal_onay_bekle"
    },
    {
      "id": "yeme_bozuklugu",
      "tetik": "S18 = Evet",
      "eylem": "ed_modu_ac",
      "detay": "Program üretilir. Kalori, kilo ve makro sayıları gizlenir. Beslenme porsiyon dilinde anlatılır. Uzman yönlendirme kartı gösterilir. Kullanıcı ayarlardan açabilir; biz varsayılan yapmayız."
    }
  ],
  "akisKurallari": {
    "kaydetme": "Her blok bittiğinde profil sunucuya yazılır. Yarıda bırakan kullanıcı kaldığı yerden devam eder.",
    "geriBildirim": "Her blok sonunda kullanıcıya somut bir çıktı gösterilir. Emek karşılığını görmeden bir sonraki bloğa geçilmez.",
    "tahminiSure": "11-14 dakika",
    "yenidenDegerlendirme": "Profil ayarlardan güncellenebilir. Kilo, hedef ve sakatlık değişiklikleri programı yeniden hesaplatır."
  },
  "dallanma": {
    "branch": "Cevap anahtarla eslesirse listedeki sorular gorunur hale gelir.",
    "_notYok": "Ozel anahtar: cevap \"Yok\" disinda herhangi bir sey ise tetiklenir.",
    "conditional": "Varsayilan olarak gizli; yalnizca bir branch tarafindan acilir.",
    "conditionalOn": "Baska bir sorunun cevabina bagli gorunurluk.",
    "repeatBranch": "Bodymap secilen her bolge icin bu sorular tekrarlanir; cevap anahtari \"S11:bel\" bicimindedir.",
    "repeatFor": "Listedeki her kalem icin ayri cevap alinir; anahtar \"A8:Squat\" bicimindedir.",
    "_bos": "Ozel deger: bagimli soru cevaplanmamissa tetiklenir."
  }
} as SoruBankasi;
