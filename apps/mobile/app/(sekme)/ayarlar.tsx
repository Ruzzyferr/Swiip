import { useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { DILLER, islemHatasiMetni, kendiVerisiMi, type Dil } from '@swiip/shared';
import {
  Ayirac,
  Dugme,
  Etiket,
  Kart,
  KlavyeKaydirma,
  Satir,
  Sayi,
  Sutun,
  Uyari,
  Yazi,
  Yukleniyor,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { ApiHatasi, istek } from '../../src/veri/api';
import { veriyiPaylas } from '../../src/veri/disaAktar';
import { useDil, useMetinler, useOturum } from '../../src/durum/Oturum';
import { tarihMetni } from '@swiip/shared';
import { magaza } from '../../src/odeme/magaza';
import { useAbonelik } from '../../src/reklam/ReklamHakki';
import { degerlendirmeyiGuncelle } from '../../src/degerlendirme/guncelle';
import { useOdaktaTazele } from '../../src/durum/tazele';

/**
 * Ayarlar.
 *
 * Sıralama tesadüf değil: ABONELİK İPTALİ EN ÜSTTE. Pilates Workout negatiflerinin %42'si
 * iptal/iade şikâyetiydi. İptali gömmek kısa vadede geliri korur, uzun vadede puanı öldürür.
 */

const DIL_ADLARI: Record<Dil, string> = { tr: 'Türkçe', en: 'English' };

export default function Ayarlar() {
  const tema = useTema();
  const { kullanici, cikisYap, yenile } = useOturum();
  const metinler = useMetinler();
  const a = metinler.ayarlar;
  const aktifDil = useDil();
  /** Plan adı sözlükten; sunucu görünen ad göndermiyor. */
  const planAdi = (kod: string) =>
    metinler.genel.planAdlari[kod as keyof typeof metinler.genel.planAdlari] ?? kod;

  /*
    Abonelik durumu reklam kararıyla AYNI kaynaktan geliyor ve önbellekten anında çiziliyor.

    Eskiden bu ekran ucu kendisi okuyordu: iptal kartı ve plan kartı istek dönünce
    sayfanın EN ÜSTÜNE birden beliriyor ve altındaki her şeyi itiyordu. İstek hata
    verirse de iptal düğmesi HİÇ görünmüyordu — kilitli kural "iptal gizlenmez".
    Satın almadan sonra da kimse yeniden okumuyordu: yeni ödeyen hâlâ "Planlara bak"
    görüyordu.
  */
  const { durum: abonelik, okunamadi: abonelikHatasi, yenile: abonelikYenile } = useAbonelik();
  const [guncelleniyor, setGuncelleniyor] = useState(false);
  const [dilYukleniyor, setDilYukleniyor] = useState(false);
  const [disaAktariliyor, setDisaAktariliyor] = useState(false);
  const [islemHatasi, setIslemHatasi] = useState<string | null>(null);
  const [dogrulamaAdimi, setDogrulamaAdimi] = useState<'kapali' | 'kod'>('kapali');
  const [dogrulamaKodu, setDogrulamaKodu] = useState('');
  const [dogrulamaNotu, setDogrulamaNotu] = useState<string | null>(null);

  const yukle = async () => {
    await abonelikYenile();
    await yenile();
  };
  useOdaktaTazele(yukle);

  /**
   * Iptal, kullaniciyi MAGAZANIN abonelik sayfasina goturur.
   *
   * Burada bir zamanlar yalnizca `POST /v1/abonelik/iptal` cagriliyordu. O uc kendi
   * tablomuzda `status = 'iptal_edildi'` yaziyor — ve o kolon hicbir yerde okunmuyor.
   * Apple ve Google tahsilata devam ediyordu. Yani kullaniciya "Aboneligin iptal edildi"
   * deniyor, karti her ay cekilmeye devam ediyordu. Ne Apple ne Google, sunucudan gelen
   * bir cagriyla aboneligi iptal ettirmeye izin veriyor; tek yol magazanin kendi sayfasi
   * (Apple 3.1.2 de bunu sart kosuyor).
   *
   * `magaza.iptalBaglantisi()` bu is icin ZATEN yazilmisti ve hicbir yerden
   * cagrilmiyordu. Sunucu cagrisi niyet kaydi olarak duruyor ama artik basari mesaji
   * ona bagli degil.
   */
  const iptalEt = () => {
    Alert.alert(a.iptalOnayBaslik, a.iptalOnayGovde, [
      { text: metinler.genel.iptal, style: 'cancel' },
      {
        text: a.iptalEt,
        style: 'destructive',
        onPress: () => {
          // Niyet kaydi; basarisiz olsa da kullaniciyi magazaya goturmeyi engellemez.
          void istek('/v1/abonelik/iptal', { yontem: 'POST', govde: {} }).catch(() => null);

          const adres = magaza.iptalBaglantisi(Platform.OS === 'ios' ? 'ios' : 'android');
          Linking.openURL(adres).catch(() => setIslemHatasi(a.iptalMagazaAcilamadi));
        },
      },
    ]);
  };

  /**
   * Dışa aktarma paylaşım sayfasıyla bitiyor. "Hazırlandı" deyip bırakmak taşınabilirlik
   * değil: kullanıcı dosyayı eline almadıysa verisini almamış demektir.
   */
  const veriyiDisaAktar = async () => {
    setDisaAktariliyor(true);
    setIslemHatasi(null);
    try {
      const veri = await istek('/v1/hesap/disa-aktar');
      const sonuc = await veriyiPaylas(veri, new Date().toISOString(), a.verimiDisaAktar);
      if (sonuc === 'paylasim_yok') Alert.alert(a.verinHazirBaslik, a.verinHazirGovde);
    } catch {
      setIslemHatasi(a.disaAktarilamadi);
    } finally {
      setDisaAktariliyor(false);
    }
  };

  const hesabiSil = () => {
    /*
      Ödeyen kullanıcıya: hesap silmek mağaza aboneliğini iptal etmiyor. Söylenmezse
      kullanıcı silinmiş bir hesap için ödemeye devam ediyor (Apple 5.1.1(v)).
    */
    const govde =
      abonelik && abonelik.plan !== 'ucretsiz'
        ? `${a.silOnayGovde}

${a.silAbonelikNotu}`
        : a.silOnayGovde;
    Alert.alert(a.silOnayBaslik, govde, [
      { text: metinler.genel.iptal, style: 'cancel' },
      {
        text: a.sil,
        style: 'destructive',
        onPress: () => {
          /**
           * Silme basarisiz olursa kullanici bunu OGRENMELI.
           *
           * Once `void istek(...).then(...)` yaziliyordu: istek patlarsa yakalanmamis
           * bir promise reddi kaliyor, ekran degismiyor ve kullanici hesabinin
           * silindigini saniyordu. KVKK baglaminda bu, sessizce tutulmamis bir soz.
           */
          void istek('/v1/hesap', { yontem: 'DELETE', govde: { onay: 'HESABIMI SİL' } })
            .then(() => cikisYap())
            .then(() => router.replace('/'))
            .catch((h) =>
              setIslemHatasi(
                h instanceof ApiHatasi ? h.mesaj : islemHatasiMetni('hesap_sil', aktifDil),
              ),
            );
        },
      },
    ]);
  };

  const diliDegistir = async (dil: Dil) => {
    setDilYukleniyor(true);
    setIslemHatasi(null);
    try {
      await istek('/v1/kimlik/dil', { yontem: 'POST', govde: { dil } });
      await yenile();
    } catch {
      setIslemHatasi(islemHatasiMetni('dil_degistir', aktifDil));
    } finally {
      setDilYukleniyor(false);
    }
  };

  const dogrulamaKoduIste = async () => {
    setDogrulamaNotu(null);
    /*
      Sunucu `{ durum: 'gonderildi', gecerlilik_dakika }` dönüyor — `mesaj` alanı YOK.
      Ekran `yanit?.mesaj ?? kodGonderilemedi` yazıyordu: kod e-postaya GİTTİĞİ hâlde
      kullanıcı "Kod gönderilemedi" okuyordu. Metin artık sözlükten, sonuca göre.
    */
    const yanit = await istek<{ gecerlilik_dakika?: number }>('/v1/kimlik/eposta-dogrula-gonder', {
      yontem: 'POST',
      govde: {},
    }).catch(() => null);
    if (!yanit) {
      setDogrulamaNotu(a.kodGonderilemedi);
      return;
    }
    setDogrulamaAdimi('kod');
    setDogrulamaNotu(a.kodGonderildi(yanit.gecerlilik_dakika ?? 15));
  };

  const epostayiDogrula = async (kod: string = dogrulamaKodu) => {
    setDogrulamaNotu(null);
    const yanit = await istek('/v1/kimlik/eposta-dogrula', {
      yontem: 'POST',
      govde: { kod: kod.trim() },
    }).catch(() => null);

    if (!yanit) {
      setDogrulamaNotu(a.kodGecersiz);
      return;
    }

    setDogrulamaAdimi('kapali');
    setDogrulamaKodu('');
    await yenile();
  };

  const edSayilariDegistir = async (acik: boolean) => {
    setIslemHatasi(null);
    try {
      await istek('/v1/kimlik/ed-sayilar', { yontem: 'POST', govde: { acik } });
      await yenile();
    } catch {
      // ED ayarı sağlıkla ilgili: kullanıcı kapattığını sanıp açık kalmamalı.
      setIslemHatasi(islemHatasiMetni('ed_sayilar', aktifDil));
    }
  };

  return (
    <KlavyeKaydirma>
      <Sutun>
        {/* --- İPTAL EN ÜSTTE --- */}
        {abonelik === null ? (
          /*
            Durum henüz bilinmiyor (ilk açılış, önbellek yok). Yer ayrılıyor ve bir
            hata olursa SÖYLENİYOR: iptal düğmesinin sessizce yokluğu, gizlenmesiyle
            kullanıcı açısından aynı şey.
          */
          <Kart>
            <Yazi tur="baslik3">{a.planKotaBasligi}</Yazi>
            {abonelikHatasi ? (
              <>
                <Yazi tur="kucuk" renk="metinYumusak">
                  {a.abonelikOkunamadi}
                </Yazi>
                <Dugme
                  baslik={metinler.genel.yeniden}
                  tur="ikincil"
                  onPress={() => void abonelikYenile()}
                />
              </>
            ) : (
              <Yukleniyor />
            )}
          </Kart>
        ) : null}
        {abonelik && abonelik.plan !== 'ucretsiz' ? (
          <Kart>
            <Satir dagit="space-between">
              <Yazi tur="baslik3">{a.planEki(planAdi(abonelik.plan))}</Yazi>
              <Etiket metin={a.aktifEtiketi} tur="aksan" />
            </Satir>
            <Dugme baslik={a.iptalOnayBaslik} tur="tehlike" onPress={iptalEt} />
            <Yazi tur="etiket" renk="metinSilik">
              {a.iptalTekAdim}
            </Yazi>
          </Kart>
        ) : null}

        {abonelik ? (
          <Kart>
            <Yazi tur="baslik3">{a.planKotaBasligi}</Yazi>
            <Satir dagit="space-between">
              <Yazi tur="kucuk" renk="metinYumusak">
                {a.planEtiketi}
              </Yazi>
              <Yazi tur="kucuk">{planAdi(abonelik.plan)}</Yazi>
            </Satir>

            {/*
              "250 / 250" tek basina belirsizdi: kalan mi, kullanilan mi? Olculen bir
              hakta bu ayrimi kullaniciya tahmin ettirmek olmaz. Etiket artik soyluyor.
            */}
            {abonelik.kota.yemek_tanima.toplam > 0 ? (
              <Satir dagit="space-between">
                <Yazi tur="kucuk" renk="metinYumusak">
                  {a.yemekTanima}
                </Yazi>
                <Satir arasi="xs" hizala="baseline">
                  <Sayi tur="kucuk" renk="aksan">
                    {abonelik.kota.yemek_tanima.kalan} / {abonelik.kota.yemek_tanima.toplam}
                  </Sayi>
                  <Yazi tur="etiket" renk="metinSilik">
                    {a.kalanEki}
                  </Yazi>
                </Satir>
              </Satir>
            ) : null}

            {abonelik.kota.koc_sohbeti.toplam > 0 ? (
              <Satir dagit="space-between">
                <Yazi tur="kucuk" renk="metinYumusak">
                  {a.kocMesaji}
                </Yazi>
                <Satir arasi="xs" hizala="baseline">
                  <Sayi tur="kucuk" renk="aksan">
                    {abonelik.kota.koc_sohbeti.kalan} / {abonelik.kota.koc_sohbeti.toplam}
                  </Sayi>
                  <Yazi tur="etiket" renk="metinSilik">
                    {a.kalanEki}
                  </Yazi>
                </Satir>
              </Satir>
            ) : null}

            {/*
              Adalet notu ve sıfırlanma tarihi yalnızca gösterilen bir KOTA varken.
              Ücretsiz planda kota satırı yok; "tanıma kotandan düşmez" ve "1 Kasım'da
              sıfırlanır" ortada olmayan bir şeyden söz ediyordu.
            */}
            {abonelik.kota.yemek_tanima.toplam > 0 || abonelik.kota.koc_sohbeti.toplam > 0 ? (
              <>
                <Ayirac />
                <Yazi tur="etiket" renk="metinSilik">
                  {abonelik.kota.adalet_notu}
                </Yazi>
                <Yazi tur="etiket" renk="metinSilik">
                  {/* Sunucu ISO tarih gönderiyor; kullanıcıya "2026-09-01" gösterilemez. */}
                  {a.kotaYenilenme(tarihMetni(new Date(abonelik.kota.yenilenme), aktifDil))}
                </Yazi>
              </>
            ) : null}

            {/* Ödeyene tek satır bile upsell gösterilmez. */}
            {abonelik.promosyon_goster ? (
              <Dugme
                baslik={metinler.genel.planlaraBak}
                tur="ikincil"
                onPress={() => router.push('/odeme/paywall')}
              />
            ) : null}
          </Kart>
        ) : null}

        {kullanici?.ed_mode ? (
          <Kart>
            <Yazi tur="baslik3">{a.sayiGosterimi}</Yazi>
            <Yazi tur="kucuk" renk="metinYumusak">
              {metinler.kapilar.yemeBozuklugu.govde}
            </Yazi>
            <Satir dagit="space-between">
              <Yazi tur="kucuk">{a.sayilariGoster}</Yazi>
              <Switch
                value={kullanici.ed_sayilar_acik}
                onValueChange={(v) => void edSayilariDegistir(v)}
                accessibilityLabel={a.sayilariGosterErisim}
                trackColor={{ true: tema.renk.aksan, false: tema.renk.cizgi }}
              />
            </Satir>
          </Kart>
        ) : null}

        <Kart>
          <Yazi tur="baslik3">{a.degerlendirmeBasligi}</Yazi>
          <Yazi tur="kucuk" renk="metinYumusak">
            {a.degerlendirmeGovde}
          </Yazi>
          <Dugme
            baslik={a.degerlendirmeyiGuncelle}
            tur="ikincil"
            yukleniyor={guncelleniyor}
            onPress={() => {
              /*
                Çift dokunuş iki yeni sürüm açıyordu; zincirin `catch`'i yoktu ve ağ
                hatasında hiçbir şey olmuyordu (yakalanmamış red). İkisi de kapandı.
              */
              if (guncelleniyor) return;
              setGuncelleniyor(true);
              setIslemHatasi(null);
              void degerlendirmeyiGuncelle()
                .catch(() => setIslemHatasi(metinler.genel.hata))
                .finally(() => setGuncelleniyor(false));
            }}
          />
        </Kart>

        <Kart>
          <Yazi tur="baslik3">{a.bildirimBasligi}</Yazi>
          <Yazi tur="kucuk" renk="metinYumusak">
            {a.bildirimGovde}
          </Yazi>
          <Dugme
            baslik={a.bildirimAyarlari}
            tur="ikincil"
            onPress={() => router.push('/ayarlar/bildirimler')}
          />
        </Kart>

        <Kart>
          <Yazi tur="baslik3">{a.gizlilikBasligi}</Yazi>
          <Yazi tur="kucuk" renk="metinYumusak">
            {a.gizlilikGovde}
          </Yazi>
          <Dugme
            baslik={a.verimiDisaAktar}
            tur="ikincil"
            yukleniyor={disaAktariliyor}
            onPress={() => void veriyiDisaAktar()}
          />
        </Kart>

        <Kart>
          <Yazi tur="baslik3">{a.dilBasligi}</Yazi>
          <Satir dagit="flex-start">
            {DILLER.map((dil) => (
              <Pressable
                key={dil}
                onPress={() => void diliDegistir(dil)}
                disabled={dilYukleniyor || dil === aktifDil}
                accessibilityRole="button"
                accessibilityState={{ selected: dil === aktifDil }}
                accessibilityLabel={DIL_ADLARI[dil]}
                style={{
                  minHeight: tema.dokunmaHedefi,
                  justifyContent: 'center',
                  paddingHorizontal: tema.bosluk.lg,
                  marginRight: tema.bosluk.sm,
                  borderRadius: tema.yaricap.md,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: dil === aktifDil ? tema.renk.aksan : tema.renk.cizgi,
                  backgroundColor: dil === aktifDil ? tema.renk.aksanZemin : 'transparent',
                }}
              >
                <Yazi renk={dil === aktifDil ? 'aksan' : 'metin'}>{DIL_ADLARI[dil]}</Yazi>
              </Pressable>
            ))}
          </Satir>
          {/*
            Not yalnizca YEDEGE DUSEN kullaniciya gosterilir.
            Kosulsuz gosteriliyordu: Turk kullanici "hareket talimatlari ve tarifler
            simdilik yalnizca Turkce" cumlesini okuyordu -- kendisi icin bir kisit
            olmayan, sadece kafa karistiran bir uyari. `kendiVerisiMi` tam bunun icin
            yazilmisti ve hicbir yerden cagrilmiyordu.
          */}
          {kendiVerisiMi(aktifDil) ? null : (
            <Yazi tur="kucuk" renk="metinSilik">
              {a.dilNotu}
            </Yazi>
          )}
        </Kart>

        <Kart>
          <Yazi tur="baslik3">{a.saglikUyarisiBasligi}</Yazi>
          <Yazi tur="kucuk" renk="metinYumusak">
            {metinler.saglik.tibbiCihazDegil}
          </Yazi>
          {/*
            Kaynaklar buraya, saglik uyarisinin YANINA konuldu.
            Apple 1.4.1 atifin "kolay bulunur" olmasini sart kosuyor; kullanicinin
            "bu sayi nereden cikti" diye bakacagi yer de burasi.
          */}
          <Dugme
            baslik={a.kaynaklarDugmesi}
            tur="ikincil"
            onPress={() => router.push('/ayarlar/kaynaklar')}
          />
        </Kart>

        <Kart>
          <Yazi tur="baslik3">{a.hesapBasligi}</Yazi>
          <Satir>
            <Yazi tur="kucuk" renk="metinSilik">
              {kullanici?.email}
            </Yazi>
            {kullanici?.email_dogrulandi_at ? <Etiket metin={a.dogrulandi} tur="aksan" /> : null}
          </Satir>

          {kullanici && !kullanici.email_dogrulandi_at ? (
            <View style={{ gap: tema.bosluk.sm }}>
              <Yazi tur="kucuk" renk="metinYumusak">
                {a.dogrulamaGovde}
              </Yazi>

              {dogrulamaAdimi === 'kod' ? (
                <>
                  <TextInput
                    value={dogrulamaKodu}
                    onChangeText={(m) => {
                      const kod = m.replace(/\D/g, '').slice(0, 6);
                      setDogrulamaKodu(kod);
                      // Altı hane tamamlanınca doğrulama kendiliğinden başlıyor: "Doğrula"
                      // düğmesi klavyenin arkasında kalıyordu.
                      if (kod.length === 6) void epostayiDogrula(kod);
                    }}
                    returnKeyType="done"
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    maxLength={6}
                    accessibilityLabel={a.dogrulamaKodu}
                    style={{
                      minHeight: tema.dokunmaHedefi,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: tema.renk.cizgi,
                      borderRadius: tema.yaricap.md,
                      paddingHorizontal: tema.bosluk.lg,
                      fontSize: 16,
                      fontFamily: tema.tipografi.aileler.sayisal,
                      letterSpacing: 6,
                      color: tema.renk.metin,
                      backgroundColor: tema.renk.yuzey,
                    }}
                  />
                  <Dugme
                    baslik={a.dogrula}
                    onPress={() => void epostayiDogrula()}
                    pasif={dogrulamaKodu.length !== 6}
                  />
                  <Dugme
                    baslik={a.kodGelmedi}
                    tur="sessiz"
                    onPress={() => void dogrulamaKoduIste()}
                  />
                </>
              ) : (
                <Dugme
                  baslik={a.dogrulamaKoduGonder}
                  tur="ikincil"
                  onPress={() => void dogrulamaKoduIste()}
                />
              )}

              {dogrulamaNotu ? (
                <Yazi tur="kucuk" renk="metinYumusak">
                  {dogrulamaNotu}
                </Yazi>
              ) : null}
            </View>
          ) : null}

          <Dugme
            baslik={a.cikisYap}
            tur="ikincil"
            onPress={() => {
              void cikisYap().then(() => router.replace('/'));
            }}
          />
          <Pressable
            onPress={hesabiSil}
            accessibilityRole="button"
            style={{ minHeight: tema.dokunmaHedefi, justifyContent: 'center' }}
          >
            <Yazi renk="tehlike" hizala="center">
              {a.hesabimiSil}
            </Yazi>
          </Pressable>
        </Kart>

        {islemHatasi ? <Uyari tur="tehlike" govde={islemHatasi} /> : null}

        <Uyari govde={a.oyunlastirmaNotu} />
      </Sutun>
    </KlavyeKaydirma>
  );
}
