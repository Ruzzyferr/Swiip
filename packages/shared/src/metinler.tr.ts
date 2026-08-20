import { gunMetni } from './tarih';
/**
 * Türkçe sözlük. Tüm kullanıcıya görünen metinler tek dosyada toplanır, dağıtılmaz.
 * İkinci dil `metinler.en.ts`; tip bütünlüğü `i18n.ts` üzerinden zorlanır.
 *
 * Dil kuralları:
 *  - Tanı dili yasak. "eğilim", "görünüyor", "olabilir".
 *  - Tahminler aralık olarak: "%16-21", asla "%18,4".
 *  - Suçlayıcı ton yok, kutlama/oyunlaştırma dili yok.
 *  - "Kişiselleştirilmiş" kelimesi yasak.
 */

export const tr = {
  bildirim: {
    seans: {
      baslik: 'Bugün antrenman günü',
      govde: 'Programın hazır. Vaktin yoksa kısa sürümü de var.',
    },
    geriBildirim: {
      baslik: 'Seans nasıl geçti?',
      govde: 'Üç dokunuş: zorluk, ağrı, süre. Bir sonraki seansı buna göre hesaplayacağız.',
    },
    haftalikOzet: {
      baslik: 'Haftanın özeti hazır',
      govde: 'Hacim, ağrı bildirimleri ve gelecek haftanın değişiklikleri — nedenleriyle.',
    },
    olcum: {
      baslik: 'Ölçü zamanı',
      govde: 'Bel ve boyun çevresi bir dakika sürer. Değişimi buradan takip ediyoruz.',
    },
    su: {
      baslik: 'Su',
      govde: 'Bir bardak iyi gelir.',
    },
  },
  gerekce: {
    /** Ondalık ayırıcı: Türkçede virgül, İngilizcede nokta. 52,5 kg ile 52.5 kg. */
    ondalikAyirac: ',',
    /** Sözlüğün dili; katalog adı (hareket adı) buna göre seçilir. */
    dil: 'tr',
    hacim: {
      uyku_kisa: 'Gecede 6 saatin altında uyuduğun için haftalık set sayısını %12 düşürdüm.',
      stres_yuksek: 'Stres seviyen yüksek; toparlanmaya alan bırakmak için hacmi %10 düşürdüm.',
      yas_50_ustu: 'Toparlanma süresi yaşla uzuyor; haftalık hacmi %10 daha ölçülü tuttum.',
      kalori_acigi_yuksek: 'Kalori açığın yüksek olduğu için antrenman hacmini %10 düşürdüm.',
      oncelikli_bolge: 'Öncelik verdiğin bölgelere haftalık set sayısını %25 fazladan ayırdım.',
      memnun_bolge_koruma:
        'Halinden memnun olduğun bölgeleri koruma hacminde tuttum, zaman kazandın.',
      aktif_sakatlik: 'Ağrı bildirdiğin bölgeye binen haftalık yükü %40 azalttım.',
    },
    ilerleme: {
      tekrar_tavani: (ad: string, tekrar: number) =>
        `${ad} artık ${tekrar} tekrarla rahat geliyor. Bundan sonrası dayanıklılık ` +
        'antrenmanı olur; daha zor bir varyasyona geçiyoruz.',
      tekrar_artti: (ad: string, tekrar: number) => `${ad} hedefi ${tekrar} tekrara çıkıyor.`,
      yuk_artti: (ad: string, artis: string, kg: string) => `${ad} ${artis} kg artıyor → ${kg} kg.`,
      cift_ilerleme_sabit: (ad: string, kg: string) => `${ad} sabit, bir hafta daha ${kg} kg.`,
      hacim_dusuruldu: (ad: string) =>
        `${ad} hareketinde iki hafta üst üste zorlandın, hacmi bir set düşürdüm.`,
      yuk_dusuruldu: (ad: string, kg: string) => `${ad} ${kg} kg'a iniyor, tekrar oturtalım.`,
      tekrar_dusuruldu: (ad: string, tekrar: number) => `${ad} hedefi ${tekrar} tekrara iniyor.`,
      agri_bildirimi:
        'Bu harekette ağrı bildirdin. Yükü azalttım ve sana aynı kası çalıştıran bir muadil ' +
        'öneriyorum. Ağrı iki haftadan uzun sürerse bir hekime veya fizyoterapiste görünmeni öneririm.',
      deload:
        'Bu hafta bilinçli olarak hafif: yükü ve set sayısını düşürdüm. Toparlanma, kazanımın ' +
        'gerçekleştiği yerdir; sürekli üstüne binmek ilerlemeyi durdurur.',
    },
    havuz: {
      ekipman_yok: 'Ekipman listende olmayan hareketleri havuzdan çıkardım.',
      kontrendikasyon: 'Bildirdiğin sakatlıkla çelişen hareketleri havuzdan çıkardım.',
      agriyi_artiran_patern: 'Ağrının arttığını söylediğin hareket paternini havuzdan çıkardım.',
      eksenel_yuk_yasak: 'Omurgana dikey yük bindiren hareketleri havuzdan çıkardım.',
      tavan_alcak: 'Tavan yüksekliğin yeterli olmadığı için baş üstü hareketleri çıkardım.',
      gurultu_kisiti: 'Gürültü kısıtın nedeniyle ağırlık bırakılan hareketleri çıkardım.',
      zipla_yasak: 'Zıplama kısıtın nedeniyle pliometrik hareketleri çıkardım.',
      spotter_yok: 'Yardımcın olmadığı için tek başına riskli hareketleri çıkardım.',
      teknik_guven_dusuk:
        'Teknik güvenin oturana kadar karmaşık serbest ağırlık hareketlerini çıkardım.',
      kullanici_reddetti: 'Yapmak istemediğini söylediğin hareketleri çıkardım.',
      varsayilan: (adet: number) => `${adet} hareket havuzdan çıkarıldı.`,
    },
    hareket: {
      cumle: (ad: string, sebepler: string) => `${ad} seçildi: ${sebepler}.`,
      ayirac: ', ',
      oncelikli_bolge: (grup: string) => `${grup} bölgesini öncelik olarak seçtin`,
      bilesik_cekirdek: (patern: string) => `${patern} paterni haftalık hacminin çekirdeği`,
      izolasyon_tamamlayici: (grup: string) =>
        `${grup} hacmini tamamlamak için izolasyon olarak ekledim`,
      sfr_yuksek: 'uyaran/yorgunluk oranı yüksek',
      kontrendikasyon_uyumlu: 'bildirdiğin kısıtlarla çelişmiyor',
      kalabalik_salon_uyumlu: 'makine beklemeden yapabilirsin',
    },
    gruplar: {
      gogus: 'Göğüs',
      sirt: 'Sırt',
      omuz: 'Omuz',
      biceps: 'Biceps',
      triceps: 'Triceps',
      quadriceps: 'Ön bacak',
      hamstring: 'Arka bacak',
      kalca: 'Kalça',
      karin: 'Karın',
      baldir: 'Baldır',
    },
    paternler: {
      itme_yatay: 'Yatay itme',
      itme_dikey: 'Dikey itme',
      cekme_yatay: 'Yatay çekme',
      cekme_dikey: 'Dikey çekme',
      diz_baskin: 'Diz baskın',
      kalca_baskin: 'Kalça baskın',
      tasima: 'Taşıma',
      rotasyon: 'Rotasyon',
      izolasyon: 'İzolasyon',
    },
  },
  blokGeriBildirimi: {
    kimlikEksik: () => 'Temel bilgilerin kaydedildi. Bir sonraki bölümde hedefini konuşacağız.',
    kimlikEd: () =>
      'Temel bilgilerin kaydedildi. Senin için sayıları kapattık; beslenmeyi porsiyon diliyle ' +
      'anlatacağız.',
    bakimKalorisi: (d: Record<string, string | number>) =>
      `Bakım kalorin yaklaşık ${d.tdee} kcal. Bu, kilonu korumak için günde aldığın enerji.`,
    hedefEd: () =>
      'Hedefini not ettim. İlerlemeyi kilo yerine nasıl hissettiğin ve ölçülerinle takip edeceğiz.',
    hedefKaydedildi: () => 'Hedefin kaydedildi. Programı buna göre kuracağız.',
    hedefBeklenti: (d: Record<string, string | number>) =>
      `Ayda ${d.beklenti} kg beklentini not ettim; gerçekçiliğini raporda göstereceğim.`,
    hedefSure: (d: Record<string, string | number>) =>
      `Bu hedef yaklaşık ${d.hafta} haftalık bir yol. Gerçekçi olup olmadığını raporda göstereceğim.`,
    hedefKisa: () => 'Hedefin kaydedildi.',
    antrenmanYasi: (d: Record<string, string | number>) =>
      `${d.seviyeAdi} seviye. Haftada kas grubu başına ${d.alt}-${d.ust} set kaldırırsın.`,
    saglikTemiz: () =>
      'Sağlık taramanda program üretimini kısıtlayan bir şey görünmüyor. Yine de ağrı ' +
      'bildirdiğin an programı değiştiririz.',
    saglikEleme: (d: Record<string, string | number>) =>
      `Bildirdiklerine göre ${d.adet} hareket havuzdan çıkarıldı. Yerlerine aynı kası ` +
      'çalıştıran güvenli muadiller koyacağım.',
    ekipman: (d: Record<string, string | number>) =>
      `Ekipmanınla ${d.yapilabilir} hareket yapılabiliyor (kütüphanede ${d.toplam} hareket var).`,
    split: (d: Record<string, string | number>) => `${d.split} · ${d.gun} gün sana uygun.`,
    toparlanmaTemiz: () =>
      'Toparlanma tarafında engelleyici bir şey yok; hacmi standart aralıkta tutuyorum.',
    toparlanmaDuzeltme: (d: Record<string, string | number>) => {
      const sebepler = [d.uykuKisa ? 'uykun kısa' : '', d.stres ? 'stresin yüksek' : '']
        .filter(Boolean)
        .join(' ve ');
      const bas = sebepler.charAt(0).toLocaleUpperCase('tr-TR') + sebepler.slice(1);
      return `${bas}; haftalık hacmi yaklaşık %${d.oran} düşürdüm.`;
    },
    beslenmeEd: () =>
      'Beslenme tarafını sayı göstermeden anlatacağım: her öğünde bir avuç protein, bir yumruk ' +
      'karbonhidrat, iki avuç sebze.',
    beslenmeProtein: (d: Record<string, string | number>) =>
      `Protein hedefin ${d.protein} g. Bu, kas kaybını önleyen en önemli tek sayı.`,
    kardiyoSevmiyor: () =>
      'Kardiyoyu sevmiyorsun; minimuma indirdim ve yerine günlük adım hedefi koydum.',
    kardiyoSeviyor: () =>
      'Kardiyoyu seviyorsun; toparlanmayı bozmayacak şekilde programa yerleştirdim.',
    kardiyoOlculu: () =>
      'Kardiyoyu ölçülü tuttum: sağlık için yeterli, antrenmanı bozmayacak kadar.',
    fotografEd: () =>
      'Ölçülerin kaydedildi. Vücut analizini sayı göstermeden, bölge bazlı anlatacağım.',
    fotograf: () =>
      'Vücut analizin hazırlanıyor. Yağ oranını tek sayı olarak değil, aralık olarak vereceğim.',
    seviyeAdlari: {
      yeni: 'Yeni başlayan',
      erken: 'Erken',
      orta: 'Orta',
      ileri: 'İleri',
      kidemli: 'Kıdemli',
    },
  },
  apiHatalari: {
    magaza_disi_yukseltme: () =>
      'Plan yalnızca mağaza üzerinden değiştirilir. Satın alma uygulamadan yapılır.',
    onay_gerekli: (d: Record<string, string | number>) =>
      `Hesabını silmek için onay alanına "${d.onay}" yazman gerekiyor. Bu işlem geri alınamaz.`,
    riza_gerekli: () =>
      'Sağlık verilerin özel nitelikli kişisel veridir; işleyebilmemiz için açık rıza vermen gerekiyor.',
    eposta_kullanimda: () => 'Bu e-posta ile bir hesap zaten var. Giriş yapmayı deneyebilirsin.',
    tanima_basarisiz: () =>
      'Fotoğrafta tanıyabildiğim bir yemek yok. Daha yakından ve daha aydınlık çekebilir ya da ' +
      'elle arayabilirsin. Bu deneme kotandan düşmedi.',
    ilgi_gecersiz: () => 'Geçerli bir e-posta adresi ve açık rıza gerekiyor.',
    analiz_hakki_bitti: () =>
      'Vücut analizi hakkını kullandın. Ücretsiz planda bir kez, ödemeli planlarda her ay açılıyor.',
    profil_yok: () => 'Önce değerlendirmeyi tamamla.',
    barkod_yok: () => 'Bu barkod veritabanımızda yok. Elle ekleyebilirsin.',
    besin_yok: () => 'Besin bulunamadı.',
    hareket_yok: () => 'Böyle bir hareket yok.',
    tarif_yok: () => 'Tarif bulunamadı.',
    haftalik_plan_yok: () => 'Bu hafta için plan yok.',
    program_yok: () => 'Henüz bir programın yok.',
    gerekce_yok: () => 'Bu hareket için kayıtlı bir gerekçe yok.',
    seans_yok: () => 'Seans bulunamadı.',
    seansta_hareket_yok: () => 'Bu seansta böyle bir hareket yok.',
    kullanici_yok: () => 'Kullanıcı bulunamadı.',
    kod_gecersiz: () => 'Kod geçersiz veya süresi dolmuş.',
    oturum_bitti: () => 'Oturumun sona ermiş. Tekrar giriş yap.',
    yetkisiz: () => 'Oturumun sona ermiş. Tekrar giriş yap.',
    bulunamadi: () => 'Aradığın kayıt yok.',
    boy_yok: () => 'Analiz için boy bilgin gerekiyor; değerlendirmeyi tamamla.',
    bilinmeyen_blok: () => 'Böyle bir blok yok.',
    foto_riza_yok: () =>
      'Fotoğraf analizi için ayrı açık rıza vermen gerekiyor. Dilersen fotoğrafsız, yalnızca ' +
      'ölçülerinle devam edebilirsin.',
    uygun_olmayan_muadil: () =>
      'Bu hareket senin ekipmanın ve kısıtlarınla yapılamıyor; listedeki muadillerden birini seç.',
    koc_plan_yetersiz: () =>
      'Koç sohbeti Temel plandan itibaren açık. Programın ve gerekçeleri her planda tam.',
    tanima_plan_yetersiz: () =>
      'Fotoğraftan yemek tanıma Pro planda. Manuel giriş ve arama her planda sınırsız.',
    ogun_plan_yetersiz: () =>
      'Öğün planı ve kaydırmalı değiştirme Temel plandan itibaren açık. Manuel kalori girişi ve ' +
      'arama her planda sınırsız.',
    geri_bildirim_plan_yetersiz: () =>
      'Seans sonrası geri bildirim ve programın buna göre güncellenmesi Temel plandan itibaren açık.',
    // Sunucu ISO tarih gönderiyor ("2026-09-01"); kullanıcıya öyle gösterilmez.
    koc_kotasi_doldu: (d: Record<string, string | number>) =>
      `Bu ayki koç mesajı hakkın doldu (${d.hak}). ${gunMetni(d.yenilenme, 'tr')} tarihinde sıfırlanır.`,
    tanima_kotasi_doldu: (d: Record<string, string | number>) =>
      `Bu ayki fotoğraf tanıma hakkın doldu (${d.hak}). ${gunMetni(d.yenilenme, 'tr')} tarihinde ` +
      'sıfırlanır. Bu arada manuel giriş ve barkod sınırsız.',
  },
  genel: {
    devam: 'Devam',
    geri: 'Geri',
    kaydet: 'Kaydet',
    iptal: 'Vazgeç',
    kapat: 'Kapat',
    tamam: 'Tamam',
    yeniden: 'Tekrar dene',
    atla: 'Atla',
    yukleniyor: 'Yükleniyor',
    hata: 'Bir şeyler ters gitti. Tekrar deneyebilirsin.',
    baglantiYok: 'İnternet yok. Son programın cihazında kayıtlı, açabilirsin.',
    yuzdeTamamlandi: (yuzde: number) => `Yüzde ${yuzde} tamamlandı`,
    zorunluAlan: 'Bu soru zorunlu.',
    ekle: 'Ekle',
    planlaraBak: 'Planlara bak',
    dakikaKisa: (dakika: number) => `${dakika} DK`,
    // Kilitli kısayolun altında; baskı değil, dokunmadan önce bilgi.
    temelPlandan: 'Temel plandan',
    /**
     * Plan adları sözlükte, sunucuda değil.
     *
     * Hak tablosundaki `ad` alanı Türkçe bir görünen ad ve API cevabında gidiyordu:
     * İngilizce kullanıcı ayarlarda "Ücretsiz" okuyordu.
     */
    planAdlari: {
      ucretsiz: 'Ücretsiz',
      temel: 'Temel',
      pro: 'Pro',
    },
    saatBasligi: 'SAAT',
    toplamBasligi: 'TOPLAM',
    malzemelerBasligi: 'MALZEMELER',
    malzemeler: 'Malzemeler',
    /**
     * Bütçe kademesi (1-4).
     *
     * Kart üstünde `'₺'.repeat(kademe)` ile çiziliyordu. Kademe bir fiyat değil, göreli
     * bir pahalılık işareti; para simgesiyle çizmek onu Türkiye'ye çiviler ve dolarla
     * ödeyen kullanıcıya yanlış para birimi gösterir.
     */
    butceKademesi: (kademe: number) =>
      ['', 'EKONOMİK', 'UYGUN', 'ORTA', 'YÜKSEK'][kademe] ?? 'ORTA',
  },

  giris: {
    aciliyor: 'Açılıyor',
    slogan: 'Ölçüne göre.',
    altSlogan: 'Programın neden o program olduğunu da söyleriz.',
    maddeler: [
      '134 soru soruyoruz. Hepsinin bir karşılığı var.',
      'Programındaki her hareketin yanında neden orada olduğu yazıyor.',
      'Fotoğrafın analiz edilir edilmez silinir, sunucumuzda kalmaz.',
      'Rozet yok, seri yok, konfeti yok.',
    ],
    basla: 'Başla',
    hesabimVar: 'Hesabım var',

    nasilCalisir: {
      baslik: 'Nasıl çalışır',
      ustBaslik: 'Önce soruyoruz, sonra yazıyoruz',
      girisMetni:
        'Çoğu uygulama 8 soru sorup program üretir. Biz 134 soruyoruz, çünkü bel fıtığını bilmeden yerden çekiş yazmak, bilerek yazmamaktan daha kolay ama çok daha riskli.',
      adimlar: [
        {
          baslik: 'Değerlendirme',
          sure: '11-14 dakika',
          govde:
            'On bölüm. Her bölüm bittiğinde ne öğrendiğimizi ve programını nasıl değiştirdiğini gösteriyoruz. Yarıda bırakırsan kaldığın yerden devam edersin.',
        },
        {
          baslik: 'Vücut analizi',
          sure: '2 dakika',
          govde:
            'Üç fotoğraf veya sadece çevre ölçüleri. Fotoğrafın analiz edildiği anda bellekten silinir; sunucumuzun diskine hiç yazılmaz.',
        },
        {
          baslik: 'Programın',
          sure: 'anında',
          govde:
            'Her hareketin yanında neden orada olduğu yazar. Beğenmediğini değiştirirsin — ücretsiz ve sınırsız.',
        },
        {
          baslik: 'Seans sonrası üç dokunuş',
          sure: '15 saniye',
          govde:
            'Salonda telefonla kayıt tutmanı istemiyoruz. Sonrasında üç dokunuş yeter; bir sonraki seansı ona göre hesaplarız.',
        },
      ],
      uyariBaslik: 'Bilmeni istediğimiz iki şey',
      uyariGovde:
        'Made2Fit tıbbi cihaz değildir ve teşhis koymaz. Sağlık sorularına verdiğin cevaplar, sana güvenli bir program yazabilmemiz için gerekli — ve yalnızca bunun için kullanılır.',
      devamEt: 'Devam et',
    },

    kayit: {
      sayfaBasligi: 'Hesap aç',
      baslik: 'Hesabını açalım',
      eposta: 'E-posta',
      epostaEtiketi: 'E-posta adresi',
      parola: 'Parola',
      parolaIpucu: 'En az 10 karakter. Uzunluk karmaşıklıktan daha çok işe yarar.',
      rizaBasligi: 'Sağlık verisi rızası',
      rizaGovde:
        "Sakatlık, hastalık ve ilaç bilgilerin KVKK'ya göre özel nitelikli kişisel veridir. Bunları yalnızca sana güvenli bir program yazmak için işleriz. Program üretimi için yapay zekâ hizmet sağlayıcısına gönderilen veride bu bilgiler yer almaz; yalnızca karar izinin özeti gider. Rızanı istediğin zaman geri alabilir, hesabını tek adımda silebilirsin.",
      saglikRizasi: 'Sağlık verilerimin işlenmesine açık rıza veriyorum',
      olcumRizasi: 'Çevre ölçülerimin işlenmesine açık rıza veriyorum',
      olcumRizasiAciklama: 'İsteğe bağlı. Vermezsen yağ oranı tahmini daha geniş bir aralık olur.',
      gonder: 'Hesabı aç ve değerlendirmeye başla',
      yasNotu: 'Uygulamayı 18 yaş ve üzeri kullanabilir.',
    },

    girisYap: {
      sayfaBasligi: 'Giriş',
      baslik: 'Tekrar hoş geldin',
      gonder: 'Giriş yap',
      hata: 'Giriş yapılamadı. Tekrar deneyebilirsin.',
      parolamiUnuttum: 'Parolamı unuttum',
      hesabimYok: 'Hesabım yok, oluşturayım',
    },

    parolaSifirlama: {
      sayfaBasligi: 'Parolamı unuttum',
      baslik: 'Parolanı sıfırlayalım',
      aciklama: 'Kayıtlı e-posta adresini yaz. Altı haneli bir kod göndereceğiz.',
      kodGonder: 'Kod gönder',
      istekHatasi: 'İstek gönderilemedi. Tekrar deneyebilirsin.',
      kodBasligi: 'Kodu gir',
      kodEtiketi: 'Altı haneli kod',
      kodErisim: 'Doğrulama kodu',
      yeniParola: 'Yeni parola',
      yeniParolaIpucu: 'En az 12 karakter. Uzunluk karmaşıklıktan önemli — üç kelime yeter.',
      degistir: 'Parolayı değiştir',
      degistirHatasi: 'Parola değiştirilemedi. Tekrar deneyebilirsin.',
      tekrarGonder: 'Kod gelmedi, tekrar gönder',
    },
  },

  kapilar: {
    yas: {
      baslik: 'Uygulamayı 18 yaş ve üzeri kullanabilir',
      govde:
        'Gelişim çağındaki bir vücut için program yazmak farklı bir uzmanlık ve biz bunu güvenli şekilde yapamıyoruz. 18 yaşını doldurduğunda seni burada bekliyoruz.',
    },
    gebelik: {
      baslik: 'Bu dönemde program üretmiyoruz',
      govde:
        'Gebelik ve emzirme döneminde egzersiz programı uzman gözetimi ister. Doktorunla veya bu alanda çalışan bir fizyoterapistle görüşmeni öneriyoruz. Verdiğin cevaplar duruyor; döndüğünde kaldığın yerden devam edersin.',
    },
    kardiyak: {
      baslik: 'Önce doktor onayı',
      govde:
        'Verdiğin cevaplarda kalp ve dolaşımla ilgili bir işaret var. Bu, spor yapamazsın demek değil — doğru programın doktorunla belirlenmesi gerekiyor demek. Onayını yükleyince program üretimi açılır.',
      eylem: 'Doktor onayı yükle',
    },
    yemeBozuklugu: {
      baslik: 'Sayıları kapattık',
      govde:
        'Kalori, kilo grafiği ve makro yüzdeleri senin için varsayılan olarak kapalı. Beslenmeyi porsiyon ve öğün düzeni diliyle anlatıyoruz. İstersen ayarlardan açabilirsin; biz kendiliğimizden açmayız.',
    },
  },

  degerlendirme: {
    baslik: 'Değerlendirme',
    kaldiginYer: 'Kaldığın yer bulunuyor',
    tamamBaslik: 'Değerlendirme tamam',
    tamamGovde: 'Bütün soruları cevapladın. Şimdi vücut analizine geçiyoruz.',
    devamEtDugmesi: 'Devam et',
    cevrimdisiNotu: 'Bağlantı yok — cevapların cihazında tutuluyor, bağlanınca gönderilecek.',
    soruyuAtla: 'Bu soruyu atla',
    listeAra: 'Yazarak ara',
    listeSonucYok: 'Eşleşen yok. Yazımı değiştirmeyi dene.',
    istersenAtla: 'İstersen atlayabilirsin',
    gecersizCevap: 'Bu cevap geçerli değil.',
    okudumRizaVeriyorum: 'Okudum, açık rıza veriyorum',
    gun: 'Gün',
    ay: 'Ay',
    yil: 'Yıl',
    gunKisa: 'GG',
    ayKisa: 'AA',
    yilKisa: 'YYYY',
    saat: 'Saat',
    agirlikKg: 'Ağırlık (kg)',
    agirlikBasligi: 'AĞIRLIK (KG)',
    tekrarBasligi: 'TEKRAR',
    enFazlaSecim: (adet: number) => `En fazla ${adet} seçim`,
    agirlikErisim: 'Ağırlık kilogram',
    tekrar: 'Tekrar',
    tekrarErisim: 'Tekrar sayısı',
    alanEtiketleri: {
      bel_cm: 'Bel',
      kalca_cm: 'Kalça',
      gogus_cm: 'Göğüs',
      kol_cm: 'Kol',
      uyluk_cm: 'Uyluk',
      boyun_cm: 'Boyun',
      en_yuksek_kg: 'En yüksek kilo',
      en_dusuk_kg: 'En düşük kilo',
      sinav_adet: 'Şınav (adet)',
      barfiks_adet: 'Barfiks (adet)',
      plank_saniye: 'Plank (saniye)',
      min_kg: 'En hafif',
      max_kg: 'En ağır',
    },
    ekipman: {
      onDoldurmaOnerisi: (salon: string) =>
        `${salon} salonlarında genelde bulunan ekipmanı işaretleyebiliriz. Sonra istediğini kaldırırsın.`,
      salonumaGoreDoldur: 'Salonuma göre doldur',
      secili: (adet: number) => `${adet} ekipman seçili`,
      temizle: 'Temizle',
    },
    listedenSec: 'LİSTEDEN DE SEÇEBİLİRSİN',
    baslangic: 'Başlangıç',
    bitis: 'Bitiş',
    siluetNotu: 'Bunlar hedef değil, yön. Hangi yöne gitmek istediğini seç.',
    onden: 'Önden',
    arkadan: 'Arkadan',
    bolgeAdlari: {
      boyun: 'Boyun',
      omuz_sag: 'Sağ omuz',
      omuz_sol: 'Sol omuz',
      dirsek_sag: 'Sağ dirsek',
      dirsek_sol: 'Sol dirsek',
      bilek_sag: 'Sağ bilek',
      bilek_sol: 'Sol bilek',
      ust_sirt: 'Üst sırt',
      bel: 'Bel',
      kalca_sag: 'Sağ kalça',
      kalca_sol: 'Sol kalça',
      diz_sag: 'Sağ diz',
      diz_sol: 'Sol diz',
      ayak_bilegi_sag: 'Sağ ayak bileği',
      ayak_bilegi_sol: 'Sol ayak bileği',
      gogus: 'Göğüs',
      omuz: 'Omuz',
      sirt: 'Sırt',
      kol: 'Kol',
      karin: 'Karın',
      kalca: 'Kalça',
      bacak_on: 'Ön bacak',
      bacak_arka: 'Arka bacak',
      baldir: 'Baldır',
    },
    siluetAdlari: {
      ince: 'İnce',
      ince_tonlu: 'İnce ve tonlu',
      atletik: 'Atletik',
      kaslı_atletik: 'Kaslı atletik',
      kaslı: 'Kaslı',
      guclu_hacimli: 'Güçlü ve hacimli',
      ortalama: 'Ortalama',
      daha_dolgun: 'Daha dolgun',
    },
    blokSonu: {
      bolum: 'BÖLÜM',
      varsayilanBaslik: 'Bu bölüm tamam',
      basliklar: {
        K: 'Temel bilgilerin alındı',
        H: 'Hedefini not ettik',
        A: 'Antrenman geçmişin çıkarıldı',
        S: 'Sağlık taraması tamam',
        E: 'Ekipmanın kaydedildi',
        Z: 'Program yapın belirlendi',
        Y: 'Toparlanma kapasiten hesaplandı',
        B: 'Beslenme çerçeven çıktı',
        T: 'Tercihlerin işlendi',
        F: 'Ölçülerin alındı',
      },
      dipnot: 'Bu, verdiğin cevaplardan hesaplandı. Sonraki bölümlerde daha da netleşecek.',
    },
    ilerleme: (mevcut: number, toplam: number) => `${mevcut} / ${toplam}`,
    blokTamamlandi: 'Bu bölüm tamam',
    devamEt: 'Kaldığın yerden devam et',
    tahminiSure: (dakika: number) => `Yaklaşık ${dakika} dakika`,
    kaydedildi: 'Cevapların kaydedildi. İstediğin zaman devam edebilirsin.',
    gerceklikTesti: (beklenen: number, gercekci: string) =>
      `Ayda ${beklenen} kilo hedefliyorsun. Sağlıklı ve korunabilir aralık ${gercekci}. Daha hızlısı genelde kas kaybı ve geri alım demek. Hedefini bu aralığa çekmeni öneriyoruz.`,
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
      /**
       * Gizlilik notu, YAPILAN işi anlatmalı.
       *
       * Tek bir cümle vardı ve her raporda yazıyordu: "Fotoğrafın analiz edildi ve
       * bellekten düştü." Ölçülerle devam eden kullanıcı hiç fotoğraf göndermemişti;
       * olmayan bir şeyin silindiğine dair güvence, güvenin kendisini harcıyor.
       */
      gizlilikNotu: {
        fotografli:
          'Fotoğrafın analiz edildi ve bu istek biterken bellekten düştü. Sunucumuzun ' +
          'diskine hiç yazılmadı; sadece yukarıdaki sayılar saklandı.',
        olculerle:
          'Fotoğraf göndermedin; bu rapor yalnızca ölçülerinden çıkarıldı. Saklanan tek ' +
          'şey yukarıdaki sayılar.',
      },
      ozet: {
        veriYok:
          'Yağ oranı tahmini için yeterli veri yok. Bel ve boyun ölçünü girer ya da fotoğraf ' +
          'yüklersen bir aralık çıkarabiliriz.',
        yontem: {
          capraz: 'Fotoğraf ve çevre ölçülerini birlikte değerlendirdik',
          gorsel: 'Fotoğraf üzerinden değerlendirdik',
          olcu: 'Çevre ölçülerin üzerinden değerlendirdik',
        },
        cumle: (yontem: string, alt: number, ust: number, kilo: number, boy: number) =>
          `${yontem}: vücut yağ oranın yaklaşık %${alt}-${ust} aralığında görünüyor. ` +
          `Bu bir aralıktır, kesin ölçüm değil — ${kilo} kg ve ${boy} cm değerlerinle ` +
          'birlikte ilerlemeyi bu aralığın nasıl değiştiğine bakarak takip edeceğiz.',
      },
      durus: {
        omuz_protraksiyonu:
          'Omuzlarında öne doğru kayma eğilimi görünüyor. Üst sırt ve arka omuz çalışmasını ' +
          'artırdım, göğüs esnekliği için ısınmaya hareket ekledim.',
        bas_one:
          'Başın gövde hizasının biraz önünde duruyor gibi görünüyor. Uzun süre ekran başında ' +
          'kalanlarda sık görülen bir eğilim; boyun ve üst sırt çalışması yardımcı olur.',
        pelvik_egim:
          'Leğen kemiğinde öne dönme eğilimi görünüyor. Karın ve kalça çalışmasını dengeleyerek ' +
          'bu eğilimi azaltmayı hedefliyoruz.',
        ust_sirt_yuvarlanma:
          'Üst sırtında yuvarlanma eğilimi görünüyor. Programda çekme hareketlerinin payını ' +
          'itme hareketlerine göre biraz yüksek tuttum.',
        omuz_asimetrisi:
          'İki omzun arasında hafif bir yükseklik farkı görünüyor. Tek taraflı hareketler ' +
          'ekleyerek iki tarafı ayrı ayrı çalıştırıyoruz.',
        diz_ice_donme:
          'Çömelirken dizlerinde içe doğru kayma eğilimi görünüyor. Kalça yan kaslarını ' +
          'güçlendiren hareketler ekledim.',
      },
      sinirlama: {
        fotograf_yok:
          'Fotoğraf yüklemedin. Ölçülerinle devam ettik; yağ oranı aralığı biraz daha geniş ' +
          'çıkıyor ve kas dağılımı haritası çıkarılamıyor. İstediğin zaman fotoğrafla ' +
          'güncelleyebilirsin.',
        olcu_yok:
          'Bel ve boyun ölçünü girmedin. Bu ikisi girildiğinde tahmini ölçüyle çapraz ' +
          'doğrulayabiliyoruz.',
      },
      belBoy: {
        uyari:
          'Bel ölçün boyunun yarısından fazla. Bu, göbek çevresi yağlanmasının biraz yüksek ' +
          'olabileceğine işaret eden basit bir göstergedir. Bel çevresi, kilo düşmese bile ' +
          'antrenman ve beslenmeye en hızlı yanıt veren ölçülerden biri.',
        normal:
          'Bel ölçün boyunun yarısının altında. Bu genellikle iyi bir göstergedir; ' +
          'ilerlemeyi takip ederken bu oranı izlemeye devam edeceğiz.',
      },
      feragat:
        'Made2Fit tıbbi cihaz değildir, teşhis koymaz. Buradaki çıktılar ölçüm ve görüntüden ' +
        'çıkarılmış tahminlerdir; kesin değer değildir. Bir şikâyetin varsa hekimine danış.',
    },
    sayfaBasligi: 'Vücut analizin',
    yukleniyor: 'Ölçümler çıkarılıyor',
    hataMesaji: 'Analiz şu an yapılamadı. Ölçülerini girip tekrar deneyebilirsin.',
    hataBaslik: 'Analiz hazırlanamadı',
    programaGec: 'Programa geç',
    analizRaporun: 'Analiz raporun',
    yagOraniAraligi: 'YAĞ ORANI ARALIĞI',
    kaynakIkisi: 'Fotoğraf ve ölçü birlikte değerlendirildi; aralık bu yüzden daha dar.',
    kaynakOlcu: 'Yalnızca çevre ölçünden hesaplandı.',
    kaynakFotograf: 'Yalnızca fotoğraftan hesaplandı.',
    tahminEtiketi: 'TAHMİN ARALIĞI · KESİN ÖLÇÜM DEĞİL',
    edBaslik: 'Sayılar senin için kapalı',
    edGovde: 'Vücut analizini bölge bazlı anlatıyoruz. İstersen ayarlardan sayıları açabilirsin.',
    belBoyBasligi: 'Bel / boy oranı',
    kasDagilimiBasligi: 'Kas dağılımı',
    kasDagilimiNotu:
      'Bu bir sıralama, not değil. Görece geride kalan bölgeye program fazladan set ayırır.',
    /** Skor 1-5. Boş yer tutucu koymuyoruz: sözlükte boş metin olmaz. */
    kasSkorAdlari: {
      1: 'geride',
      2: 'gelişmekte',
      3: 'dengeli',
      4: 'iyi',
      5: 'baskın',
    },
    durusBasligi: 'Duruş eğilimleri',
    sinirlarBasligi: 'Bu raporun sınırları',
    hedefGercekciMi: 'Hedefim gerçekçi mi?',
    programimiGor: 'Programımı gör',
    programErisimIpucu: 'Değerlendirmene göre hazırlanan programı açar',
  },

  gerceklik: {
    yukleniyor: 'Hedefin değerlendiriliyor',
    bosBaslik: 'Hedef bilgisi yok',
    bosGovde: 'Değerlendirmeyi tamamladığında burası dolar.',
    edSayfaBasligi: 'Hedefin',
    edBaslik: 'Hedefin',
    edUyariBaslik: 'Bu bölümü sayısız anlatıyoruz',
    edUyariGovde:
      'Kilo hedefi ve hız hesabı senin için kapalı. İlerlemeni nasıl hissettiğin, ne kadar kaldırdığın ve çevre ölçülerinle takip edeceğiz.',
    sayfaBasligi: 'Hedefin gerçekçi mi',
    girisMetni:
      'Bu sayfa satış yapmıyor. Hedefinin fizyolojik olarak mümkün olup olmadığını hesaplıyor ve mümkün değilse bunu söylüyor.',
    seninBeklentin: 'SENİN BEKLENTİN',
    gercekciEtiketi: 'GERÇEKÇİ',
    cokHizliEtiketi: 'ÇOK HIZLI',
    kgAy: 'kg / ay',
    korunabilirAralik: 'Korunabilir aralık:',
    ayBirimi: '/ ay',
    beklentiYok: 'Aylık beklentini girmemişsin. Değerlendirmeden güncelleyebilirsin.',
    yolBasligi: 'Bu hedefe giden yol',
    suAnkiKilo: 'Şu anki kilon',
    hedefKilo: 'Hedef kilon',
    fark: 'Fark',
    korunabilirSure: 'Korunabilir hızda süre',
    haftaBirimi: (hafta: number) => `~${hafta} hafta`,
    hedefTarihNotu: (tarih: string) =>
      `${tarih} tarihine yetiştirmek istediğini söylemiştin. Bu süreyle karşılaştırıp programı ona göre kuruyoruz.`,
    nedenHizliBaslik: 'Neden hızlısı işe yaramıyor',
    nedenHizliMaddeleri: [
      "Haftada %1'in üstünde kayıp, kaybın önemli bir kısmının kas olması demek.",
      'Kas kaybı bazal metabolizmayı düşürür; aynı kaloriyle kilo vermek zorlaşır.',
      'Aşırı açık hormonal düşüş, uyku bozulması ve performans kaybı getirir.',
      'Hızlı verilen kilonun geri alınma oranı, yavaş verilene göre belirgin yüksek.',
    ],
    saglikUyarisi:
      'Made2Fit tıbbi cihaz değildir ve teşhis koymaz. Bu hesaplar genel fizyoloji üzerinden yapılır; özel bir sağlık durumun varsa hekimine danış.',
    programimiGor: 'Programımı gör',
    hedefimiGuncelle: 'Hedefimi güncelle',
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
          'Haftada 1 güne tüm vücudu sığdırmak gerekiyor; bileşik hareketlerle en verimli kesiti aldım.',
        fullBodyAzGun: (d: Record<string, string | number>) =>
          `Haftada ${d.gun} gün antrenman yapabiliyorsun. Bu sıklıkta her kas grubuna haftada en az ` +
          'iki kez dokunmanın tek yolu her seansı tüm vücut yapmak.',
        fullBodyYeni: () =>
          'Haftada 3 gün antrenman yapabildiğini ve yeni başladığını söyledin. Bu aşamada her ' +
          'seansta tüm vücuda dokunmak, hareketleri daha sık tekrarladığın için tekniği en hızlı ' +
          'oturtan yol.',
        ucGunKisaSeans: (d: Record<string, string | number>) =>
          `Haftada 3 gün ve seans başına ${d.dakika} dakikan var. Tüm vücut bu süreye sığmayacağı ` +
          'için üst, alt ve bir toplayıcı gün olarak böldüm.',
        ucGunDeneyimli: () =>
          'Haftada 3 günün var ve artık yeni başlayan değilsin. Üst, alt ve bir toplayıcı gün, ' +
          'hem yeterli hacim hem yeterli dinlenme veriyor.',
        dortGun: () =>
          'Haftada 4 gün için üst/alt ikilisi iki kez dönüyor. Her kas grubu haftada iki kez ' +
          'uyaran alıyor, aralarda tam bir gün toparlanma kalıyor.',
        besGun: () =>
          'Haftada 5 gün için iki genel gün ve üç odaklı gün kurdum. Bu yapı hacmi tek seansa ' +
          'yığmadan haftaya dağıtıyor.',
        altiGun: () =>
          'Haftada 6 gün için itme, çekme ve bacak günleri iki kez dönüyor. Her kas grubu haftada ' +
          'iki kez çalışıyor, seans süreleri kısa kalıyor.',
      },
      uyari: {
        havuz_elemesi: (d: Record<string, string | number>) =>
          `Bildirdiğin kısıtlar nedeniyle ${d.adet} hareket havuzdan çıkarıldı.`,
        havuz_dar: () =>
          'Hareket havuzun dar. Ekipman ekleyebilir veya ağrı bildirdiğin bölgeleri güncelleyebilirsin.',
      },
      ilerlemeKurali: {
        vucut_agirligi: (d: Record<string, string | number>) =>
          `${d.set} setin hepsinde ${d.tekrar_ust} tekrarı tamamlarsan bir sonraki hafta ` +
          `zorlaştırılmış varyanta geç. ${d.tekrar_alt} tekrarın altına düşersen aynı varyantta kal.`,
        agirlik: (d: Record<string, string | number>) =>
          `${d.set} setin hepsinde ${d.tekrar_ust} tekrarı tamamlarsan gelecek hafta ${d.artis} kg ` +
          `ekle. ${d.tekrar_alt} tekrarın altına düşersen ağırlığı sabit tut.`,
      },
    },
    yukleniyor: 'Programın hazırlanıyor',
    bosBaslik: 'Henüz programın yok',
    // Sunucu sebebi söyleyemediğinde; sessiz kalmaktan iyidir.
    uretilemedi: 'Program şu an hesaplanamadı. Tekrar deneyebilirsin.',
    bosGovde:
      'Değerlendirmeyi tamamladıysan programı şimdi hesaplayabiliriz. Tamamlamadıysan önce oraya dönelim.',
    programimiHesapla: 'Programımı hesapla',
    degerlendirmeyeDon: 'Değerlendirmeye dön',
    cevrimdisiNotu:
      'Bağlantı yok. Bu, cihazında kayıtlı son programın — okuyabilirsin, geri bildirim bağlanınca gönderilir.',
    haftaEki: 'HAFTA',
    hazir: 'Programın hazır',
    nedenBuProgram: 'NEDEN BU PROGRAM',
    kararlarinTamami: 'Kararların tamamı →',
    haftalikYapi: 'Haftalık yapı →',
    gunBasligi: (sira: number, tip: string) => `${sira}. gün · ${tip}`,
    dakikaEtiketi: (dakika: number) => `~${dakika} DK`,
    seansiBitirdim: 'Seansı bitirdim, geri bildirim ver',
    seansErisimIpucu: 'Üç dokunuş, on beş saniye',
    kilitliGun: (adet: number) => `${adet} gün daha hazır`,
    kilitliGovde:
      'Haftanın tamamı hesaplandı. 1. günü ücretsiz görüyorsun; kalan günler ve seans sonrası uyarlama Temel plandan itibaren açılıyor.',
    planlaraBak: 'Planlara bak',
    tamamEtiketi: 'TAMAM',
    hareketEtiketi: (adet: number) => `${adet} HAREKET`,
    bugunuAc: 'Bu günü aç →',
    gunTipleri: {
      full_body: 'Tüm vücut',
      upper: 'Üst vücut',
      lower: 'Alt vücut',
      push: 'İtme',
      pull: 'Çekme',
      legs: 'Bacak',
    },
    // Gün ve hareket başlıkları veri gelince kesinleşir; yüklenirken bunlar yazar.
    gunSayfaBasligi: 'Seans',
    hareketSayfaBasligi: 'Hareket',
    gunBulunamadi: 'Bu gün bulunamadı',
    programaDon: 'Programa dön',
    gunEki: (sira: number) => `${sira}. gün`,
    kasAdlari: {
      gogus: 'Göğüs',
      sirt: 'Sırt',
      trapez: 'Trapez',
      on_omuz: 'Ön omuz',
      yan_omuz: 'Yan omuz',
      arka_omuz: 'Arka omuz',
      omuz: 'Omuz',
      biceps: 'Biceps',
      triceps: 'Triceps',
      onkol: 'Önkol',
      karin: 'Karın',
      bel: 'Bel',
      kalca: 'Kalça',
      quadriceps: 'Ön bacak',
      hamstring: 'Arka bacak',
      baldir: 'Baldır',
    },
    paternAdlari: {
      itme_yatay: 'YATAY İTME',
      itme_dikey: 'DİKEY İTME',
      cekme_yatay: 'YATAY ÇEKME',
      cekme_dikey: 'DİKEY ÇEKME',
      diz_baskin: 'DİZ BASKIN',
      kalca_baskin: 'KALÇA BASKIN',
      tasima: 'TAŞIMA',
      rotasyon: 'ROTASYON',
      izolasyon: 'İZOLASYON',
    },
    zorlukEtiketi: (deger: number) => `ZORLUK ${deger}/5`,
    verimEtiketi: (deger: number) => `VERİM ${deger}/5`,
    hangiCevaplardan: 'HANGİ CEVAPLARINDAN ÇIKTI',
    gorselKaynagi: 'Görsel: free-exercise-db (kamu malı)',
    gorselErisim: (ad: string) => `${ad} hareketinin görseli`,
    nasilYapilir: 'Nasıl yapılır',
    calisanKaslar: 'Çalışan kaslar',
    birincil: 'Birincil',
    ikincil: 'İkincil',
    kimlerdeDikkat: 'Kimlerde dikkat',
    kontrendikasyonNotu: (liste: string) =>
      `Bu hareket şu durumlarda havuzdan çıkarılır: ${liste}. Sende bunlardan biri varsa program bu hareketi zaten önermez.`,
    ucretsizSinirsiz: 'Ücretsiz ve sınırsız. Haftalık hacmin korunur.',
    muadillerBasligi: 'Muadiller',
    muadillerNotu:
      'Aynı kası çalıştıran, senin ekipmanınla yapılabilen ve kısıtlarınla çelişmeyen hareketler.',
    muadilYok:
      'Ekipmanın ve kısıtlarınla bu harekete uygun muadil bulunamadı. Ekipman listeni güncellersen seçenekler açılır.',
    vazgec: 'Vazgeç',
    neden: {
      sayfaBasligi: 'Neden bu program',
      baslik: 'Programının karar izi',
      girisMetni:
        'Aşağıdakiler yapay zekânın ürettiği cümleler değil, çözücünün karar izidir. Her satır senin bir cevabına bağlı.',
      programYapisi: 'PROGRAM YAPISI',
      hacimButcesi: 'Haftalık hacim bütçen',
      hacimButcesiNotu:
        'Kas grubu başına haftalık set sayısı. Bu tablo antrenman yaşından başlar, sonra cevaplarınla çarpımsal olarak düzeltilir.',
      setBirimi: 'set',
      hacimDuzeltmeleri: 'Hacim düzeltmeleri',
      havuzdanCikanlar: 'Havuzdan çıkarılanlar',
      havuzdanCikanlarNotu: 'Bu hareketler senin için hiç değerlendirilmedi.',
      hareketSecimleri: 'Hareket seçimleri',
      bosBaslik: 'Karar izi henüz yok',
      bosGovde: 'Program üretildiğinde her kararın kaydı burada görünür.',
      kuralAdlari: {
        uyku_kisa: 'Uykun kısa',
        stres_yuksek: 'Stresin yüksek',
        yas_50_ustu: '50 yaş üstü',
        oncelikli_bolge: 'Öncelikli bölge',
        memnun_bolge_koruma: 'Koruma hacmi',
        aktif_sakatlik: 'Aktif sakatlık',
        kalori_acigi_yuksek: 'Kalori açığı yüksek',
        ekipman_yok: 'Ekipman yok',
        kontrendikasyon: 'Sakatlık kısıtı',
        eksenel_yuk_yasak: 'Eksenel yük yasağı',
        tavan_alcak: 'Tavan alçak',
        gurultu_kisiti: 'Gürültü kısıtı',
        zipla_yasak: 'Zıplama yasağı',
        spotter_yok: 'Yardımcı yok',
        teknik_guven_dusuk: 'Teknik güveni düşük',
        kullanici_reddetti: 'Sen istemedin',
        agriyi_artiran_patern: 'Ağrıyı artıran patern',
      },
    },
    hafta: {
      sayfaBasligi: 'Haftalık yapı',
      bosBaslik: 'Program yok',
      bosGovde: 'Önce programını hesaplaman gerekiyor.',
      yapiNedenSecildi: 'BU YAPI NEDEN SEÇİLDİ',
      yerlesimBasligi: 'Hafta içindeki yerleşim',
      yerlesimNotu:
        'Günler değerlendirmede uygun işaretlediklerinden seçildi; aralarını mümkün olduğunca açtık ki aynı kas grubu toparlanmadan tekrar yüklenmesin.',
      gunKisaltmalari: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
      antrenmanGunu: 'antrenman günü',
      dinlenmeGunu: 'dinlenme',
      hacimButcesi: 'Haftalık hacim bütçen',
      hacimButcesiNotu:
        'Kas grubu başına haftalık set sayısı. Antrenman yaşından başlar, cevaplarınla çarpımsal olarak düzeltilir.',
      haftaninGunleri: 'Haftanın günleri',
      kilitliNotu: (adet: number) =>
        `Haftanın tamamı hesaplandı ama ${adet} günü henüz göremiyorsun. Temel plandan itibaren açılıyor.`,
      gelecekHaftaBasligi: 'Gelecek haftanın ağırlıkları neden yok?',
      gelecekHaftaGovde:
        'Çünkü henüz var değiller. Motor 12 haftalık bir tablo çıkarmıyor; her seansı bir öncekinin geri bildiriminden hesaplıyor. Bu, programın gerçekten sana uyum sağlaması demek — statik bir doküman olsaydı ikinci haftada eskimiş olurdu.',
    },
    dinlenmeEtiketi: (saniye: number) => `DİNLENME ${saniye} SN`,
    nedenBuHareket: 'NEDEN BU HAREKET',
    ilerlemeKurali: 'İLERLEME KURALI',
    makineDoluysa: 'MAKİNE DOLUYSA',
    dinlenme: (saniye: number) => `Dinlenme ${saniye} sn`,
    setTekrar: (set: number, alt: number, ust: number) => `${set} set × ${alt}-${ust} tekrar`,
    baslangic: (kg: number) => `Başlangıç: ${kg} kg`,
    vucutAgirligi: 'Vücut ağırlığı',
    hareketDegistir: 'Hareketi değiştir',
    gunKaydir: 'Günü kaydır',
    hareketCikar: 'Hareketi çıkar',
    duzenlemeUcretsiz: 'Programını düzenlemek ücretsiz ve sınırsız.',
  },

  geriBildirim: {
    sayfaBasligi: 'Seans sonrası',
    girisMetni: 'Üç dokunuş, on beş saniye. Salonda telefonla uğraşmanı istemiyoruz.',
    gonder: 'Gönder',
    gonderilemedi: 'Gönderilemedi. Tekrar deneyebilirsin.',
    yargilamiyoruz: 'Yargılamıyoruz; programı buna göre kaydırıyoruz.',
    atlamaSebepleri: [
      'Zamanım olmadı',
      'Hastaydım',
      'Yorgundum',
      'Salona gidemedim',
      'Canım istemedi',
    ],
    kararSayfaBasligi: 'Programında ne değişti',
    kararBaslik: 'Motor kararı',
    kararGiris: 'Verdiğin geri bildirim bir sonraki seansı şu şekilde değiştirdi:',
    agriUyarisi:
      'Ağrı bildirdiğin bölgeye binen yükü azalttım. Ağrı iki haftadan uzun sürerse veya artarsa bir hekime ya da fizyoterapiste görünmeni öneririm.',
    programaDon: 'Programa dön',
    agriHaritasiBasligi: 'Ağrıyan bölge',
    baslik: 'Geçen seansı nasıl geçirdin?',
    altBaslik: 'Üç dokunuş, on beş saniye.',
    tamamladim: 'Tamamladım',
    zorlandim: 'Zorlandım',
    yapamadim: 'Yapamadım',
    agriSorusu: 'Bir yerin ağrıdı mı?',
    agriOpsiyonel: 'İstersen vücut haritasında göster',
    seansiAtladim: 'Seansı atladım',
    atlamaSebebi: 'Ne oldu?',
    motorKarari: 'Programında ne değişti',
  },

  beslenme: {
    yuklenemedi: 'Yüklenemedi.',
    hedefYokBaslik: 'Beslenme hedefi yok',
    degerlendirmeyeGit: 'Değerlendirmeye git',
    edBaslik: 'Bugünkü tabağın',
    edSayiNotu: 'Sayıları görmek istersen ayarlardan açabilirsin.',
    bugun: 'Bugün',
    kaloriEtiketi: 'KALORİ',
    hedefEki: (kalori: number) => `hedef ${kalori}`,
    kaloriPayda: (kalori: number) => `/ ${kalori} kcal`,
    hedefNasilHesaplandi: 'Hedefin nasıl hesaplandı',
    bazalMetabolizma: (yontem: string) => `Bazal metabolizma (${yontem})`,
    gunlukHarcama: 'Günlük toplam harcama',
    hedefeGoreFark: 'Hedefe göre fark',
    duzeltmeNotu:
      'Bu sayılar iki haftada bir gerçek kilo değişiminle karşılaştırılır ve düzeltilir.',
    aramayiKapat: 'Aramayı kapat',
    yemekEkle: 'Yemek ekle',
    barkodOkut: 'Barkod okut',
    fotograftanEkle: 'Fotoğraftan ekle',
    haftalikPlan: 'Haftalık plan',
    buzdolabim: 'Buzdolabım',
    ogunDegistir: 'Öğün değiştir',
    alisverisListesi: 'Alışveriş listesi',
    bugunYediklerin: 'Bugün yediklerin',
    bosKayitBaslik: 'Bugün henüz kayıt yok',
    bosKayitGovde:
      'Yemek eklediğinde toplam burada görünür. Aynı yemeği iki kez eklediğinde aynı makro çıkar — söz.',
    aramaIpucu: 'Yemek ara — pilav, köfte, yoğurt',
    yemekArama: 'Yemek arama',
    miktar: 'Miktar',
    evOlcusuEtiketi: 'EV ÖLÇÜSÜ SEÇEBİLİRSİN — SADECE GRAM DEĞİL',
    vazgec: 'Vazgeç',
    kaloriHedefi: 'Günlük hedef',
    protein: 'Protein',
    yag: 'Yağ',
    karbonhidrat: 'Karbonhidrat',
    lif: 'Lif',
    su: 'Su',
    edPorsiyon: {
      protein: 'her öğünde bir avuç protein',
      karbonhidrat: 'bir yumruk karbonhidrat',
      sebze: 'iki avuç sebze',
      yag: 'bir başparmak kadar yağ',
    },
    tdeeDuzeltildi: (fark: number) =>
      `Son iki haftanın gerçek kilo değişimine göre günlük hedefini ${fark > 0 ? '+' : ''}${fark} kcal güncelledik. Formül yanılır, veri yanılmaz.`,
  },

  saglik: {
    tibbiCihazDegil:
      'Made2Fit tıbbi cihaz değildir, teşhis koymaz ve tedavi önermez. Çıktılar tahmindir. Şikâyetin varsa hekimine danış.',
    aralikDili: 'Bu bir tahmin aralığıdır, kesin ölçüm değildir.',
    agriYonlendirme:
      'Ağrın iki haftadan uzun sürüyorsa veya artıyorsa bir hekime ya da fizyoterapiste görünmeni öneriyoruz. Bu arada o bölgeyi zorlamayan bir program veriyoruz.',
  },

  sekmeler: {
    program: 'Program',
    beslenme: 'Beslenme',
    koc: 'Koç',
    ilerleme: 'İlerleme',
    ayarlar: 'Ayarlar',
  },

  kapiEkrani: {
    anladim: 'Anladım',
    simdilikDevam: 'Şimdilik devam et',
    devamEt: 'Devam et',
    duraklama:
      'Verdiğin cevaplar duruyor. Bu ekran bir kapı değil, bir duraklama — durumun değiştiğinde kaldığın yerden devam edersin.',
  },

  fotograf: {
    sayfaBasligi: 'Çekim',
    gizlilikSayfaBasligi: 'Vücut analizi',
    akisAdimlari: [
      'Fotoğraf telefonunda çekilir.',
      'Şifreli kanaldan analiz servisine gider.',
      'Ölçümler çıkarılır: yağ oranı aralığı, kas dağılımı, duruş.',
      'Fotoğraf aynı istek içinde bellekten silinir.',
      'Sadece sayılar saklanır. Diskimize hiç yazılmaz.',
    ],
    fotoraflaDevam: 'Anladım, fotoğrafla devam et',
    olculerleDevam: 'Ölçülerle devam et',
    baslik: 'Çekim protokolü',
    girisMetni:
      'Aynı koşullarda çekilmeyen iki fotoğraf karşılaştırılamaz. Bu yüzden protokol sabit.',
    kurallar: [
      'Telefonu yere dik tut, göğüs hizasında, 2 metre uzakta.',
      'Düz ve sade bir zemin seç.',
      'Gündüz ışığı; tepe lambası gölge yapar.',
      'Dar veya spor kıyafet; vücut hattı görünsün.',
    ],
    hayaletNotu: 'SONRAKİ ÖLÇÜMDE ÖNCEKİ SİLUETİN BURADA GÖRÜNÜR',
    aciUygun:
      'Telefonun açısı uygun. Eğik tutarsan çekim düğmesi kapanır — bozuk açı sonucu bozar.',
    aciBozuk: 'Telefonu dikleştir. Açı düzelene kadar çekim yapılamaz.',
    izinYok: 'Kamera izni verilmedi. Fotoğrafsız devam edebilirsin; rapor ölçülerinden çıkar.',
    izinVer: 'Kamera iznini ver',
    egimDerecesi: (derece: number) => `Eğim ${derece}°`,
    yenidenCek: 'Yeniden çek',
    analizEdiliyor: 'Ölçümler çıkarılıyor',
    analizHatasi: 'Analiz yapılamadı. Fotoğrafsız devam edebilirsin.',
    cekildi: 'ÇEKİLDİ',
    bekliyor: 'BEKLİYOR',
    pozCek: (poz: string) => `${poz} çek`,
    pozlar: {
      on: { ad: 'Önden', yonerge: 'Kollar gövdeden 45 derece açık, avuç içleri öne baksın.' },
      yan: { ad: 'Yandan', yonerge: 'Sağ yanın kameraya dönük, kollar yanda serbest.' },
      arka: { ad: 'Arkadan', yonerge: 'Sırtın kameraya dönük, kollar önden pozdaki gibi.' },
    },
    analiziBaslat: 'Analizi başlat',
    fotografsizDevam: 'Fotoğrafsız devam et',
    silmeNotu: 'Analiz biter bitmez fotoğraflar bellekten silinir.',
  },

  gizlilik: {
    fotografBaslik: 'Fotoğrafın bizde kalmıyor',
    fotografGovde:
      'Fotoğrafın şifreli kanaldan analiz servisine gider, ölçümler çıkarılır ve fotoğraf aynı istek içinde bellekten silinir. Sunucumuzun diskine hiç yazılmaz. Saklanan tek şey sayısal çıktılar.',
    cihazKopyasi:
      'Karşılaştırma için bir kopya yalnızca senin telefonunda tutulur. Telefon değiştirirsen bu fotoğraflar gider — bunu şimdiden bilmeni istiyoruz.',
    fotografsizDevam: 'Fotoğrafsız devam et',
    fotografsizAciklama:
      'Fotoğraf çekmek istemiyorsan çevre ölçülerinle devam edebiliriz. Yağ oranı aralığı biraz daha geniş çıkar, gerisi aynı.',
  },

  ayarlar: {
    baslik: 'Ayarlar',
    aktifEtiketi: 'AKTİF',
    planEki: (ad: string) => `${ad} planı`,
    iptalTekAdim: 'Tek adım. Gizlemiyoruz, zorlaştırmıyoruz.',
    iptalOnayBaslik: 'Aboneliği iptal et',
    iptalOnayGovde:
      'Dönem sonuna kadar tüm özellikler açık kalır, sonra ücretsiz plana döner. Verilerin silinmez.',
    iptalEt: 'İptal et',
    silOnayBaslik: 'Hesabını sil',
    silOnayGovde: 'Tüm verilerin kalıcı olarak silinir. Bu işlem geri alınamaz.',
    sil: 'Sil',
    planKotaBasligi: 'Plan ve kota',
    planEtiketi: 'Plan',
    kotaAdaletNotu:
      'Önbellekten gelen tanıma ve yanlış tanıma sonrası tekrar deneme kotandan düşmez.',
    yemekTanima: 'Fotoğraftan yemek tanıma',
    kocMesaji: 'Koç mesajı',
    kotaYenilenme: (tarih: string) => `${tarih} tarihinde sıfırlanır.`,
    sayiGosterimi: 'Sayı gösterimi',
    sayilariGoster: 'Kalori ve makro sayılarını göster',
    sayilariGosterErisim: 'Sayıları göster',
    degerlendirmeBasligi: 'Değerlendirme',
    degerlendirmeGovde:
      'Sakatlığın, ekipmanın veya hedefin değiştiyse cevaplarını güncelle. Programın yeniden hesaplanır; baştan cevaplamak zorunda değilsin.',
    degerlendirmeyiGuncelle: 'Değerlendirmeyi güncelle',
    bildirimBasligi: 'Bildirimler',
    bildirimGovde:
      'Hatırlatma gönderiyoruz, dürtmüyoruz. Seri bozulma uyarısı ve suçluluk dili yok.',
    bildirimAyarlari: 'Bildirim ayarları',
    gizlilikBasligi: 'Gizlilik ve veri',
    gizlilikGovde:
      'Vücut fotoğrafların hiçbir zaman sunucumuzda saklanmadı. Diğer tüm verini indirebilir veya hesabınla birlikte silebilirsin.',
    verimiDisaAktar: 'Verimi dışa aktar',
    verinHazirBaslik: 'Verin hazır',
    verinHazirGovde:
      'Tüm kayıtların JSON dosyası olarak cihazına yazıldı ama paylaşım sayfası bu cihazda açılamıyor.',
    disaAktarilamadi: 'Verin hazırlanamadı. Biraz sonra tekrar deneyebilirsin.',
    saglikUyarisiBasligi: 'Sağlık uyarısı',
    hesapBasligi: 'Hesap',
    dogrulandi: 'Doğrulandı',
    dogrulamaGovde:
      'E-postanı doğrulamak zorunlu değil, ama hesabına erişimini kaybedersen geri almanın tek yolu bu.',
    dogrulamaKoduGonder: 'Doğrulama kodu gönder',
    dogrulamaKodu: 'Doğrulama kodu',
    dogrula: 'Doğrula',
    kodGelmedi: 'Kod gelmedi, tekrar gönder',
    kodGonderilemedi: 'Kod gönderilemedi. Biraz sonra tekrar deneyebilirsin.',
    kodGecersiz: 'Kod geçersiz veya süresi dolmuş. Yeni kod isteyebilirsin.',
    cikisYap: 'Çıkış yap',
    hesabimiSil: 'Hesabımı sil',
    oyunlastirmaNotu:
      "Made2Fit'te rozet, elmas, seri veya kutlama animasyonu yok. Bu bir eksiklik değil, tercih.",
    dilBasligi: 'Dil',
    dilNotu:
      'Hareket talimatları, tarifler ve vücut analizi raporu şimdilik yalnızca Türkçe. ' +
      'Arayüz, program gerekçeleri ve koç sohbeti iki dilde.',
  },

  odeme: {
    planlar: 'Planlar',
    ucretsiz: 'Ücretsiz',
    temel: 'Temel',
    pro: 'Pro',
    aylik: 'aylık',
    yillik: 'yıllık',
    yenilemeTarihi: (tarih: string) => `${tarih} tarihinde yenilenir`,
    iptalKolay: 'İptal etmek 2 dokunuş sürer, işte nasıl',
    iptalEt: 'Aboneliği iptal et',
    kotaKalan: (kalan: number, toplam: number) => `${kalan} / ${toplam} kaldı`,
    kotaYenilenme: (tarih: string) => `${tarih} tarihinde sıfırlanır`,
    kotaAdaleti: 'Önbellekten gelen tanıma ve yanlış tanıma sonrası tekrar deneme kotandan düşmez.',
  },

  ilerleme: {
    baslik: 'İlerleme',
    fotografKarsilastir: 'Fotoğraf karşılaştır',
    haftalikYapi: 'Haftalık yapı',
    bugunkuKilon: 'Bugünkü kilon',
    kiloErisim: 'Kilo',
    tartimNotu: 'Sabah, tuvaletten sonra, aç karnına tart. Gün içi dalgalanma 1-2 kg olabilir.',
    edBaslik: 'Kilo takibi senin için kapalı',
    edGovde:
      'İlerlemeni kaldırdığın ağırlık ve nasıl hissettiğinle takip ediyoruz. İstersen ayarlardan açabilirsin.',
    analizGecmisi: 'Vücut analizi geçmişi',
    kiloSeyri: 'Kilo seyri',
    // Yüzde işareti Türkçede sayının önünde, İngilizcede arkasında.
    yagOraniAraligi: (alt: number, ust: number) => `%${alt}-${ust}`,
    hareketGelisimi: 'Hareket bazlı gelişim',
    hareketGelisimiNotu: 'Kilo değişmese bile burada ilerleme görürsün. Asıl kanıt bu.',
    bosBaslik: 'Henüz ilerleme verisi yok',
    bosGovde:
      'İlk seansının geri bildirimini verdiğinde burada ağırlıklarının nasıl değiştiğini göreceksin.',
  },

  bildirimAyarlari: {
    sayfaBasligi: 'Bildirimler',
    girisMetni:
      'Hatırlatma gönderiyoruz, dürtmüyoruz. Seri bozulma uyarısı, suçluluk dili ve "seni özledik" bildirimi yok — hiçbiri olmayacak.',
    seansBaslik: 'Seans hatırlatması',
    seansAciklama: 'Antrenman günlerinde tek bildirim.',
    geriBildirimBaslik: 'Geri bildirim hatırlatması',
    geriBildirimAciklama: 'Seansın ertesi günü, üç dokunuşu unutmayasın diye.',
    ozetBaslik: 'Haftalık özet',
    ozetAciklama: 'Haftada bir, ne değiştiğini anlatan tek bildirim.',
    olcumBaslik: 'Ölçüm hatırlatması',
    olcumAciklamaEd: 'Ayda bir çevre ölçüsü hatırlatması. Kilo sorulmaz.',
    olcumAciklama: 'Ayda bir kilo ve çevre ölçüsü hatırlatması.',
    suBaslik: 'Su hatırlatması',
    suAciklama: 'Gün içinde birkaç kez. Çoğu kişi bunu kapatıyor; varsayılanı kapalı.',
    durusNotu:
      "Hiçbir bildirimde seri, rozet veya 'kaçırdın' dili kullanılmaz. Bir günü atlamak bir şeyi bozmaz; bildirim de öyle davranır.",
    kaydedildiIzinYok:
      'Tercihlerin kaydedildi ama bildirim izni verilmedi. Cihaz ayarlarından açabilirsin.',
    kaydedildiBos: 'Tercihlerin kaydedildi. Şu an kurulu bildirim yok.',
    kaydedildiKuruldu: 'Tercihlerin kaydedildi ve hatırlatmalar kuruldu.',
  },

  karsilastirma: {
    sayfaBasligi: 'Karşılaştırma',
    azBaslik: 'Karşılaştırmak için en az iki ölçüm gerekiyor',
    azGovde:
      'İlk analizin yapıldı. Bir ay sonra ikincisini yaptığında değişimi yan yana göreceksin.',
    cihazNotu:
      'Karşılaştırma tamamen telefonunda çalışır. Fotoğraflar sunucumuza hiç gitmediği için burada da bizim elimizde değil.',
    baslik: 'Değişim',
    once: 'ÖNCE',
    sonra: 'SONRA',
    hangiOlcumler: 'Hangi ölçümler',
    yagOraniAraligi: 'YAĞ ORANI ARALIĞI',
    aralikAsagi: 'Aralık aşağı kaydı. Bunlar tahmin aralığı; tek bir ölçüme değil eğilime bak.',
    aralikYukari: 'Aralık yukarı kaydı. Tek ölçüm bir şey söylemez; üç ölçümün yönüne bak.',
    aralikAyni: 'Aralık aynı kaldı.',
    fotografNotu:
      'Bu fotoğraflar yalnızca senin telefonunda. Telefon değiştirirsen giderler — bunu şimdiden bilmeni istiyoruz.',
    yeniOlcum: 'Yeni ölçüm al',
    cevreOlculeri: 'Çevre ölçüleri',
    belNotu: 'Bel ölçüsü kilo düşmese bile en hızlı yanıt veren ölçülerden biri.',
    fotografYok: 'BU CİHAZDA\nFOTOĞRAF YOK',
  },

  ogun: {
    ogunAdlari: {
      kah: 'Kahvaltı',
      ogl: 'Öğle',
      aks: 'Akşam',
      ana_ogun: 'Ana öğün',
      kahvalti: 'Kahvaltı',
      ogle: 'Öğle',
      aksam: 'Akşam',
      ara_ogun: 'Ara öğün',
      ara_ogun_2: 'Ara öğün 2',
      gece: 'Gece',
      sahur: 'Sahur',
      iftar: 'İftar',
      iftar_sonrasi: 'İftar sonrası',
    },

    deste: {
      sayfaBasligi: 'Öğün değiştir',
      hata: 'Deste açılamadı.',
      yukleniyor: 'Seçenekler hazırlanıyor',
      bosBaslik: 'Deste açılamadı',
      sadeceDolaptan: 'Sadece dolabımdakilerle yapılabilenler',
      menuDayatmiyoruz: 'Menü dayatmıyoruz',
      makroKilidi: 'BU ÖĞÜNÜN MAKRO KİLİDİ',
      makroKilidiNotu:
        "Aşağıdaki her seçenek bu hedefin %8'i içinde. Hangisini seçersen seç, günlük toplamın aynı kalıyor.",
      porsiyonEtiketi: (katsayi: string) => `${katsayi} PORSİYON`,
      begenmedim: 'Beğenmedim',
      bunuSec: 'Bunu seç',
      desteBitti: 'Deste bitti',
      sonsuzKaydirmaYok:
        'Sonsuz kaydırma yok — bilerek. Beğendiğin çıkmadıysa öğünü kendin seçebilir ya da dolabına malzeme ekleyebilirsin.',
      eklerseAcilir: 'Bunları eklersen seçenekler açılır',
      acilanTarif: (adet: number) => `+${adet} TARİF`,
      alisverisListemeEkle: 'Alışveriş listeme ekle',
    },

    reyonAdlari: {
      manav: 'Manav',
      kasap: 'Kasap',
      balikci: 'Balıkçı',
      sarkuteri: 'Şarküteri',
      firin: 'Fırın',
      kuru_gida: 'Kuru gıda',
      dondurulmus: 'Dondurulmuş',
      diger: 'Diğer',
    },

    haftaGunleri: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'],

    plan: {
      sayfaBasligi: 'Haftalık plan',
      hata: 'Plan üretilemedi.',
      yukleniyor: 'Plan hazırlanıyor',
      kapaliBaslik: 'Öğün planı kapalı',
      bosBaslik: 'Bu hafta için plan yok',
      bosGovde:
        'Kısıtlarına ve makro hedeflerine göre yedi günlük bir plan çıkarabilirim. Beğenmediğin öğünü tek dokunuşla değiştirirsin.',
      planiCikar: 'Haftalık planımı çıkar',
      haftaBasligi: (hafta: string) => `${hafta} haftası`,
      alternatifEtiketi: (adet: number) => `${adet} ALTERNATİF`,
      tarifiAc: 'Tarifi aç',
      degistir: 'Değiştir',
      ogunYok:
        'Bu öğün için kısıtlarına uyan tarif çıkmadı. Dolabına malzeme eklersen ya da bütçe kısıtını gevşetirsen seçenekler açılır.',
      alisverisListesi: 'Alışveriş listesini gör',
      planiYenile: 'Planı yenile',
      makroNotu: 'Her alternatif aynı makro bütçesinde. Ne seçersen seç günlük toplamın bozulmaz.',
    },

    alisveris: {
      sayfaBasligi: 'Alışveriş listesi',
      bosBaslik: 'Liste boş',
      bosGovde:
        'Haftalık plan çıkardığında alışveriş listen otomatik oluşur. Dolabında olan malzemeler listeye hiç girmez.',
      planiCikar: 'Haftalık planımı çıkar',
      baslik: 'Alışveriş',
      girisMetni: 'Markette dolaşma sırasına göre gruplandı. Dolabında olanlar listeye alınmadı.',
      dolabaEkle: 'Aldıklarımı dolaba ekle',
      planiGor: 'Planı gör',
    },

    tarif: {
      // Tarif adı yüklenene kadar başlıkta bu yazar; boş başlık ham rota yolu gösterir.
      sayfaBasligi: 'Tarif',
      bosBaslik: 'Tarif bulunamadı',
      bosGovde: 'Bu tarif kaldırılmış ya da hiç olmamış olabilir.',
      birPorsiyon: 'BİR PORSİYON',
      makroKaynagi: 'MAKROLAR KENDİ BESİN VERİTABANIMIZDAN HESAPLANDI',
      edBaslik: 'Sayılar senin için kapalı',
      edGovde:
        'Bu tarifi porsiyon diliyle anlatıyoruz: bir avuç protein, bir yumruk karbonhidrat, iki avuç sebze.',
      nasilYapilir: 'Nasıl yapılır',
      kontrolNotu:
        'Bu tarif gıda güvenliği için elle kontrol edildi. Et, tavuk ve yumurtalı tariflerin tamamında pişirme sıcaklığı ve süresi gözden geçirilir.',
    },

    dolap: {
      sayfaBasligi: 'Buzdolabım',
      baslik: 'Dolabında ne var?',
      girisMetni:
        'Envanterini girersen sana yalnızca şu anda yapabileceğin tarifleri gösteririz. Girmezsen tüm tarifler açık kalır.',
      malzemeSayisi: (adet: number) => `Dolabında ${adet} malzeme`,
      cikarErisim: (malzeme: string) => `${malzeme} çıkar`,
      bosBaslik: 'Dolabın boş görünüyor',
      bosGovde: 'Aşağıdaki sık kullanılanlardan seçebilir ya da elle yazabilirsin.',
      sikKullanilanlar: 'SIK KULLANILANLAR',
      kaydedildi: 'Dolabın kaydedildi.',
      malzemeIpucu: 'Malzeme yaz ve ekle',
      malzemeEkle: 'Malzeme ekle',
      tarifleriGor: 'Yapabileceğim tarifleri gör',
    },
  },

  barkod: {
    sayfaBasligi: 'Barkod',
    baslik: 'Ürün barkodu',
    girisMetni:
      'Ambalajın üzerindeki barkodu okut ya da rakamları elle gir. Bulduğumuz değer üreticinin beyanıdır; biz uydurmayız.',
    izinIsteniyor: 'Kamera izni isteniyor',
    izinYok: 'Kamera izni verilmedi. Barkod rakamlarını elle girebilirsin.',
    izinVer: 'Kamera iznini ver',
    kadraja: 'Barkodu kadrajın içine getir',
    tara: 'Barkodu okut',
    taramayiKapat: 'Taramayı kapat',
    alanEtiketi: 'Barkod rakamları',
    gecersiz: 'Bu barkod hatalı görünüyor. Rakamları bir daha kontrol eder misin?',
    ara: 'Ara',
    araniyor: 'Barkod aranıyor',
    bulunamadi: 'Bu barkod veritabanımızda yok. Elle ekleyebilirsin.',
    kaynakYerel: 'VERİTABANIMIZDAN',
    kaynakOff: 'OPEN FOOD FACTS',
    dogrulanmadiNotu:
      'Bu kayıt Open Food Facts topluluğundan geldi ve bizim tarafımızdan doğrulanmadı. Etiketle uyuşmuyorsa değerleri elle düzeltebilirsin.',
    yuzGramBasina: '100 gram başına',
    gune: 'Güne ekle',
    miktarGram: 'Miktar (gram)',
  },

  tanima: {
    hata: 'Tanıma yapılamadı.',
    yukleniyor: 'Tabağına bakıyorum',
    dogrulaSayfaBasligi: 'Doğrula',
    dogrulaBaslik: 'Bunlar doğru mu?',
    elleAraEkle: 'Elle ara ve ekle',
    onbellektenEtiketi: 'ÖNBELLEKTEN',
    tanindiEtiketi: 'TANINDI',
    dogrulaGiris:
      'Miktarı ben tahmin ettim, besin değerini veritabanından aldım. Yanlış olanı düzelt; onaylamadan hiçbir şey kaydedilmiyor.',
    fotograftaEki: (ad: string) => `FOTOĞRAFTA: ${ad}`,
    eslesmediEtiketi: 'EŞLEŞMEDİ',
    eslesmediNotu:
      'Bunu veritabanında bulamadım. Elle seçersen bir dahaki sefere ben de bileceğim.',
    miktarGram: 'MİKTAR (GRAM)',
    miktarErisim: (ad: string) => `${ad} miktarı`,
    kapat: 'Kapat',
    yemegiDegistir: 'Yemeği değiştir',
    tabaktaYoktu: 'Bu tabakta yoktu, çıkar',
    kalemKalmadiBaslik: 'Kalem kalmadı',
    kalemKalmadiGovde: 'Hepsini çıkardın. Yeniden çekebilir ya da elle ekleyebilirsin.',
    kaynakEtiketi: 'MİKTARI TAHMİN ETTİM · BESİN DEĞERİ VERİTABANINDAN',
    onayla: 'Onayla ve güne ekle',
    tekrarDene: 'Yanlış tanıdı, tekrar dene',
    kotaNotu: 'Yanlış tanıma sonrası tekrar deneme kotandan düşmez.',
    cekimSayfaBasligi: 'Fotoğraftan ekle',
    cekimBaslik: 'Tabağını çek',
    cekimGiris:
      'Ne yediğini ve ne kadar yediğini tahmin ederim. Kaloriyi ben uydurmam — besin değeri her zaman veritabanından gelir, bu yüzden aynı yemek her zaman aynı sonucu verir.',
    ipuclari: [
      'Tabağın tamamı kadrajda olsun.',
      'Yukarıdan, hafif açılı çek.',
      'Çatal veya kaşığı kadrajda bırak — ölçü referansı olur.',
      'Aynı tabağı ikinci kez çekersen hakkın düşmez.',
    ],
    tekrarDenemeNotu: 'Bu tekrar deneme kotandan düşmeyecek.',
    fotografCek: 'Fotoğraf çek',
    silmeNotu: 'Fotoğrafın analiz edildikten sonra bellekten silinir, sunucumuza yazılmaz.',
    dogruYemegiAra: 'Doğru yemeği ara',
  },

  paywall: {
    satinAlmaHatasi: 'Satın alma tamamlanamadı.',
    geriYuklemeYok: 'Geri yüklenecek bir satın alma bulunamadı.',
    baslik: 'Temel planı verir, Pro takibi zahmetsiz yapar',
    girisMetni:
      'Değerlendirme, vücut analizi ve 1. gün programı ücretsiz kalır. Aşağıdakiler bunun üstüne eklenir.',
    aylik: 'Aylık',
    yillik: 'Yıllık',
    ayKisa: 'ay',
    yilKisa: 'yıl',
    planErisim: (ad: string, fiyat: string) => `${ad} planı, ${fiyat}`,
    // Plan adı sunucudan Türkçe geliyordu; İngilizce başlık "Basic" derken kart
    // "Temel" gösteriyordu. Ad da bir metindir, sözlükte durur.
    yenilemeTarihi: (tarih: string) => `${tarih} tarihinde yenilenir`,
    ozellikler: {
      tumGunler: 'Haftanın tüm günleri',
      geriBildirim: 'Seans sonrası geri bildirim ve uyarlama',
      ogunPlani: 'Öğün planı, tarifler, buzdolabı',
      kocSohbeti: (adet: number) => `AI koç sohbeti — ayda ${adet} mesaj`,
      yemekTanimaKotali: (adet: number) => `Fotoğraftan yemek tanıma — ayda ${adet}`,
      yemekTanima: 'Fotoğraftan yemek tanıma',
      programDuzenleme: 'Program düzenleme — sınırsız',
      kaloriMakroHedefi: 'Kalori ve makro hedefi',
      barkodOkuma: 'Barkod okuma',
      reklamYok: 'Reklam ve upsell yok',
    },
    odenecekTutar: 'ÖDENECEK TUTAR',
    tahsilatNotu: (donem: string) =>
      `${donem} aynı tutar tahsil edilir. İstediğin an iptal edersin; dönem sonuna kadar özellikler açık kalır.`,
    herAy: 'Her ay',
    herYil: 'Her yıl',
    planSecUyarisi: 'Devam etmek için bir plan seç. Senin yerine seçmiyoruz.',
    planiBaslat: (ad: string) => `${ad} planını başlat`,
    planSec: 'Plan seç',
    planlarBasligi: 'Planlar',
    kapat: 'Kapat',
    geriYukle: 'Satın almalarımı geri yükle',
    iptalBasligi: 'İptal etmek 2 dokunuş sürer',
    iptalGovde:
      '1. Ayarlar sekmesini aç. 2. En üstteki "Aboneliği iptal et" düğmesine bas. Hepsi bu. Aramana, e-posta yazmana veya sebep açıklamana gerek yok.',
    durusEtiketi: 'GERİ SAYIM YOK · SAHTE KITLIK YOK · ÖN SEÇİM YOK',
  },

  koc: {
    cevapVeremiyorum: 'Şu an cevap veremiyorum. Biraz sonra tekrar deneyebilirsin.',
    kapaliBaslik: 'Koç şu an kapalı',
    planlaraBak: 'Planlara bak',
    geri: 'Geri',
    tanitim:
      'Genel tavsiye vermem; senin verine bakarım. Antrenman geçmişin, beslenme kayıtların ve ölçümlerin elimde.',
    ornekSorularBasligi: 'ÖRNEK SORULAR',
    ornekSorular: [
      'Bench pressim takıldı, ne yapmalıyım?',
      'Kalori hedefime uyuyor muyum?',
      'Bu hafta hacmim yeterli mi?',
    ],
    sinirUyarisi:
      'Koç tanı koymaz, ilaç veya takviye dozu vermez. Sağlık sorularında seni hekime yönlendirir.',
    baktigimVeri: 'BAKTIĞIM VERİ:',
    saglikYonlendirmesi: 'SAĞLIK SORUSU — HEKİME YÖNLENDİRİLDİ',
    dusunuyor: 'Verine bakıyorum',
    kalanMesaj: (kalan: number) => `Bu ay ${kalan} mesaj hakkın kaldı`,
    girdiErisim: 'Koça sorulacak mesaj',
    gonder: 'Gönder',
    aracAdlari: {
      antrenman_gecmisi: 'antrenman geçmişin',
      beslenme_gecmisi: 'beslenme kayıtların',
      olcum_gecmisi: 'ölçümlerin',
      hareket_bilgisi: 'hareket bilgisi',
      besin_ara: 'besin veritabanı',
    },
    baslik: 'Koç',
    girisAlani: 'Sorunu yaz',
    tanıKoymaz:
      'Bu bir sağlık sorusu ve ben tanı koyamam. Bir hekime görünmeni öneriyorum. Bu arada programını o bölgeyi zorlamayacak şekilde düzenleyebilirim.',
    dozVermez:
      'İlaç ve takviye dozu konusunda yönlendirme yapamam. Bunu hekimine veya eczacına sormalısın.',
    asiriHedefRed:
      'Bunu öneremem. Bu kadar düşük kalori kas kaybı, hormonal bozulma ve geri alım demek. Sana güvenli aralıkta ama hızlı sonuç veren bir plan çıkarabilirim.',
    kapsamDisi: 'Ben antrenman ve beslenme için buradayım, bu konuda yardımcı olamam.',
    kotaBitti: 'Bu ayki koç mesajı hakkın doldu.',
  },
} as const;
