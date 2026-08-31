import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import type { PorsiyonRehberi } from '@swiip/core';
import type { BeslenmeHedefi } from '@swiip/shared';
import {
  Ayirac,
  BaglantiSatiri,
  BosDurum,
  Dugme,
  Etiket,
  Kart,
  Satir,
  Sayi,
  Sutun,
  Uyari,
  Yazi,
  Yukleniyor,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { ApiHatasi, istek } from '../../src/veri/api';
import {
  bugunMu,
  gelecekMi,
  gunKaydir,
  islemHatasiMetni,
  kisaTarihMetni,
  yerelGun,
} from '@swiip/shared';
import { useDil, useMetinler } from '../../src/durum/Oturum';
import { sunucuMetni } from '../../src/veri/sunucuMetni';
import { ReklamBanner } from '../../src/reklam/ReklamBanner';
import { useReklamHakki } from '../../src/reklam/ReklamHakki';
import { gecisReklamiGoster, gecisReklamiHazirla } from '../../src/reklam/gecisReklami';

/**
 * Günlük beslenme özeti ve kayıt (F5.8, F5.10, F5.11).
 *
 * ED modunda hiçbir sayı görünmez; porsiyon rehberi görünür. Bu bir tercih değil,
 * spec'in pazarlık edilemez maddesi.
 */

interface HedefCevabi {
  ed_modu: boolean;
  sayilar_gizli: boolean;
  hedef?: BeslenmeHedefi;
  /** Günlük hedef ücretli katman; ücretsiz planda kilitli gelir. */
  hedef_kilidi?: boolean;
  /** Hangi kısayolların ücretli katmanda olduğu; ekran bunu önceden söyler. */
  kilitler?: {
    ogun_plani: boolean;
    kaydirmali_ogun: boolean;
    barkod: boolean;
    yemek_tanima: boolean;
  };
  /** Sunucu metni koddan kuruluyor; `mesaj` yalnızca yedek. Bkz. `sunucuMetni`. */
  kod?: string;
  mesaj?: string;
  porsiyon_rehberi?: PorsiyonRehberi;
  /** EFSA yeterli alımından türeyen günlük içecek hedefi; ücretsizde de açık. */
  su_hedefi_ml?: number;
}

interface GunCevabi {
  gun: string;
  kayitlar: Array<{
    id: string;
    /** Besin adı. Sunucu `foods` ile birleştirip gönderiyor; serbest kalemde boş olabilir. */
    ad: string | null;
    /** Çözülmüş porsiyon adı ("kase", "dilim"). Yoksa gram gösterilir. */
    porsiyon_adi: string | null;
    ogun: string | null;
    quantity: string;
    portion_id: string | null;
    hesaplanan: { kalori: number; protein_g: number; yag_g: number; karbonhidrat_g: number };
  }>;
  toplam: { kalori: number; protein_g: number; yag_g: number; karbonhidrat_g: number } | null;
  sayilar_gizli: boolean;
  /** Bugün içilen toplam. ED modunda da geliyor: su bir enerji ölçüsü değil. */
  su_ml?: number;
}

interface BesinSonucu {
  id: string;
  name_tr: string;
  per_100g: { kalori: number; protein_g: number; yag_g: number; karbonhidrat_g: number };
  portions: Array<{ id: string; ad: string; gram: number }>;
}

export default function Beslenme() {
  const tema = useTema();
  const dil = useDil();
  const tumMetinler = useMetinler();
  const m = tumMetinler.beslenme;
  const ogunAdlari = tumMetinler.ogun.ogunAdlari;
  const genel = useMetinler().genel;
  /*
    `toISOString()` UTC gunu verir. Turkiye UTC+3: gece 00:00-03:00 arasi girilen
    yemek DUNE yaziliyor ve "Bugun" listesinden kayboluyordu — kalori takibinde en
    sik kacirilan ogun tam da o.
  */
  /*
    Seçili gün — artık sabit "bugün" değil.

    Kullanıcı geçmiş günlere bakabiliyor: "hangi gün ne kadar yemişim" sorusunun
    cevabı bir kalori takipçisinin varlık sebebi. Gelecek günlere gidilemiyor;
    henüz yenmemiş bir öğünü kaydetmek defterin anlamını bozar.
  */
  const [secilenGun, setSecilenGun] = useState(yerelGun());
  const bugun = secilenGun;

  const [hedef, setHedef] = useState<HedefCevabi | null>(null);
  /* Kilit metni sunucunun Türkçe yedeğinden değil, kodundan kuruluyor. */
  const kilitMetni = sunucuMetni(hedef, tumMetinler);
  const [gun, setGun] = useState<GunCevabi | null>(null);
  const [hazir, setHazir] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [hataKodu, setHataKodu] = useState<string | null>(null);
  const [aramaAcik, setAramaAcik] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const [h, g] = await Promise.all([
        istek<HedefCevabi>('/v1/beslenme/hedef'),
        istek<GunCevabi>(`/v1/beslenme/gun/${bugun}`),
      ]);
      setHedef(h);
      setGun(g);
      setHata(null);
      setHataKodu(null);
    } catch (h) {
      setHata(h instanceof ApiHatasi ? h.mesaj : m.yuklenemedi);
      setHataKodu(h instanceof ApiHatasi ? h.kod : null);
    } finally {
      setHazir(true);
    }
  }, [bugun]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  /**
   * Yanlış girilen kalem silinebilir.
   *
   * Sunucudaki `DELETE /v1/beslenme/kayit/:id` yazılmıştı ama arayüzde hiçbir yerden
   * çağrılmıyordu: bir kez yanlış girilen kalori kalıcıydı. Kalori takibinde bu, günün
   * tamamını çöpe atmak demek — ve kullanıcının yapabileceği tek şey o günü boş bırakmak.
   */
  const kaydiSil = (id: string) => {
    Alert.alert(m.silOnayBaslik, m.silOnayGovde, [
      { text: genel.iptal, style: 'cancel' },
      {
        text: m.sil,
        style: 'destructive',
        onPress: () => {
          void istek(`/v1/beslenme/kayit/${id}`, { yontem: 'DELETE' })
            .then(() => yukle())
            .catch((h) => setHata(h instanceof ApiHatasi ? h.mesaj : m.silinemedi));
        },
      },
    ]);
  };

  /**
   * "2 kase" mi "150 g" mı.
   *
   * `portion_id` ham bir katalog anahtarı; doğrudan basılınca kullanıcı `kase-orta`
   * gibi bir dize görüyordu. Karşılığı yoksa gram varsayılıyor.
   */
  const miktarMetni = (miktar: string, porsiyonAdi: string | null) =>
    porsiyonAdi ? `${miktar} ${porsiyonAdi}` : `${miktar} g`;

  if (!hazir) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor />
      </View>
    );
  }

  if (hata && !hedef) {
    /*
      "Hedef yok" ile "getiremedim" ayni sey degil.
      Her hata "Beslenme hedefi yok — Degerlendirmeye git" ekranina cikiyordu:
      cevrimdisi olmak da, sunucu hatasi da, oturumun dusmesi de. Degerlendirmesini
      coktan tamamlamis bir kullanici, ag aksadigi icin bastan doldurmaya
      yonlendiriliyordu.
    */
    const profilEksik = hataKodu === 'profil_yok' || hataKodu === 'degerlendirme_yok';
    return (
      <ScrollView style={{ flex: 1, backgroundColor: tema.renk.zemin }}>
        <Sutun>
          <BosDurum baslik={profilEksik ? m.hedefYokBaslik : m.hedefAlinamadi} govde={hata} />
          {profilEksik ? (
            <Dugme baslik={m.degerlendirmeyeGit} onPress={() => router.push('/degerlendirme')} />
          ) : (
            <Dugme baslik={genel.yeniden} onPress={() => void yukle()} />
          )}
        </Sutun>
      </ScrollView>
    );
  }

  // --- ED modu: sayı yok, porsiyon var ---
  if (hedef?.sayilar_gizli && hedef.porsiyon_rehberi) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: tema.renk.zemin }}>
        <Sutun>
          <Yazi tur="baslik1">{m.edBaslik}</Yazi>
          <Yazi renk="metinYumusak">{hedef.porsiyon_rehberi.ozet}</Yazi>

          <Kart vurgulu>
            {hedef.porsiyon_rehberi.ogunler.map((satir, i) => (
              <View key={i} style={{ gap: tema.bosluk.xs }}>
                {i > 0 ? <Ayirac /> : null}
                <Yazi renk="metinYumusak">{satir}</Yazi>
              </View>
            ))}
          </Kart>

          <Uyari govde={hedef.porsiyon_rehberi.not} />

          <Yazi tur="etiket" renk="metinSilik" hizala="center">
            {m.edSayiNotu}
          </Yazi>
        </Sutun>
      </ScrollView>
    );
  }

  const h = hedef?.hedef;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tema.renk.zemin }}>
      <Sutun>
        {/*
          Tarih gezinme.

          Satır HER ZAMAN burada ve yüksekliği sabit: belirip kaybolan bir blok,
          altındaki listeyi parmağın altından kaydırır (bu depoda 2. kusur).
          "Sonraki gün" gelecekte devre dışı — henüz yenmemiş öğün kaydedilmez.
        */}
        <Satir dagit="space-between" hizala="center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={m.oncekiGun}
            onPress={() => setSecilenGun((g) => gunKaydir(g, -1))}
            hitSlop={12}
            style={{
              minWidth: tema.dokunmaHedefi,
              minHeight: tema.dokunmaHedefi,
              justifyContent: 'center',
            }}
          >
            <Yazi tur="baslik3" renk="aksan">
              {'‹'}
            </Yazi>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={m.buguneDon}
            onPress={() => setSecilenGun(yerelGun())}
            hitSlop={12}
            style={{
              flex: 1,
              alignItems: 'center',
              minHeight: tema.dokunmaHedefi,
              justifyContent: 'center',
            }}
          >
            <Yazi tur="baslik1">
              {bugunMu(secilenGun)
                ? m.bugun
                : kisaTarihMetni(new Date(`${secilenGun}T00:00:00`), dil)}
            </Yazi>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={m.sonrakiGun}
            disabled={gelecekMi(gunKaydir(secilenGun, 1))}
            onPress={() => setSecilenGun((g) => gunKaydir(g, 1))}
            hitSlop={12}
            style={{
              minWidth: tema.dokunmaHedefi,
              minHeight: tema.dokunmaHedefi,
              justifyContent: 'center',
              alignItems: 'flex-end',
              opacity: gelecekMi(gunKaydir(secilenGun, 1)) ? 0.25 : 1,
            }}
          >
            <Yazi tur="baslik3" renk="aksan">
              {'›'}
            </Yazi>
          </Pressable>
        </Satir>

        {/*
          Hedef kilitliyken bile günün toplamı gösteriliyor. Ücretsizin çekirdek vaadi
          manuel giriş; kaydettiğini göremeyen kullanıcı için kayıt tutmanın anlamı kalmaz.
          Kilit tek satırda açıklanıyor, üstelemiyoruz.
        */}
        {hedef?.hedef_kilidi && gun?.toplam ? (
          <Kart vurgulu>
            <Yazi tur="etiket" renk="aksan">
              {m.kaloriEtiketi}
            </Yazi>
            <Sayi tur="dev" renk="aksan">
              {gun.toplam.kalori}
            </Sayi>
            {kilitMetni ? <Yazi renk="metinYumusak">{kilitMetni}</Yazi> : null}
          </Kart>
        ) : null}

        {h && gun?.toplam ? (
          <Kart vurgulu>
            {/*
              Hedef sayisi bir kez yaziliyor.
              Ust sagda "hedef 2134", hemen altinda "0 / 2134 kcal" vardi; ayni sayi iki
              kez. Olcum gosteren bir arayuzde tekrar, okuyani sayinin hangisi oldugunu
              aramaya zorlar.
            */}
            <Yazi tur="etiket" renk="aksan">
              {m.kaloriEtiketi}
            </Yazi>
            <Satir arasi="xs" hizala="baseline">
              <Sayi tur="dev" renk="aksan">
                {gun.toplam.kalori}
              </Sayi>
              <Yazi tur="kucuk" renk="metinSilik">
                {m.kaloriPayda(h.kalori)}
              </Yazi>
            </Satir>

            {/*
              KALAN kalori.

              "0 / 2231" tek başına yarım bir cevap: kullanıcının gün içinde sorduğu
              soru "ne kadar yedim" değil, "daha ne kadar yiyebilirim". Çıkarmayı
              kullanıcıya yaptırmak, ölçüm gösteren bir arayüzde yapılacak en tuhaf
              şey.

              Aşıldığında sayı EKSİYE düşmüyor, cümle değişiyor: "-140 kcal kaldı"
              matematiksel olarak doğru ama okunmuyor; "140 kcal aşıldı" okunuyor.
              Ceza dili yok — yalnızca ölçü.
            */}
            <Yazi tur="kucuk" renk={gun.toplam.kalori > h.kalori ? 'metinYumusak' : 'aksan'}>
              {gun.toplam.kalori > h.kalori
                ? m.asimKalori(gun.toplam.kalori - h.kalori)
                : m.kalanKalori(h.kalori - gun.toplam.kalori)}
            </Yazi>

            <View style={{ gap: tema.bosluk.sm, marginTop: tema.bosluk.sm }}>
              <MakroCubugu ad={m.protein} mevcut={gun.toplam.protein_g} hedef={h.protein_g} />
              <MakroCubugu
                ad={m.karbonhidrat}
                mevcut={gun.toplam.karbonhidrat_g}
                hedef={h.karbonhidrat_g}
              />
              <MakroCubugu ad={m.yag} mevcut={gun.toplam.yag_g} hedef={h.yag_g} />
            </View>
          </Kart>
        ) : null}

        {h?.uyari ? <Uyari tur="uyari" govde={h.uyari} /> : null}

        {h ? (
          <Kart>
            <Yazi tur="baslik3">{m.hedefNasilHesaplandi}</Yazi>
            <Satir dagit="space-between">
              <Yazi tur="kucuk" renk="metinYumusak">
                {m.bazalMetabolizma(
                  h.yontem === 'katch_mcardle' ? 'Katch-McArdle' : 'Mifflin-St Jeor',
                )}
              </Yazi>
              <Sayi tur="kucuk">{h.bmr}</Sayi>
            </Satir>
            <Satir dagit="space-between">
              <Yazi tur="kucuk" renk="metinYumusak">
                {m.gunlukHarcama}
              </Yazi>
              <Sayi tur="kucuk">{h.tdee}</Sayi>
            </Satir>
            <Satir dagit="space-between">
              <Yazi tur="kucuk" renk="metinYumusak">
                {m.hedefeGoreFark}
              </Yazi>
              <Sayi tur="kucuk" renk={h.kalori_farki < 0 ? 'uyari' : 'aksan'}>
                {h.kalori_farki > 0 ? '+' : ''}
                {h.kalori_farki}
              </Sayi>
            </Satir>
            <Ayirac />
            <Yazi tur="etiket" renk="metinSilik">
              {m.duzeltmeNotu}
            </Yazi>
          </Kart>
        ) : null}

        <Dugme
          baslik={aramaAcik ? m.aramayiKapat : m.yemekEkle}
          onPress={() => setAramaAcik(!aramaAcik)}
        />

        <Satir arasi="sm">
          <View style={{ flex: 1 }}>
            {/*
              Kilit ROZETİ burada da var — istisnasız.

              Bu iki düğme hiçbir işaret taşımıyordu: ücretsiz kullanıcı basıyor ve
              bir sonraki ekranda duvara çarpıyordu. Aynı ekranın hemen altındaki
              planlama satırları ise "Temel plandan" diye kilitli görünüyordu. Bir
              dürüstlük sistemi tek satırda tutmadığında geri kalanı da inandırıcı
              olmuyor.
            */}
            <Dugme
              baslik={m.fotograftanEkle}
              tur="ikincil"
              kilitli={hedef?.kilitler?.yemek_tanima}
              kilitPlan="pro"
              onPress={() => router.push('/beslenme/tanima')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Dugme
              baslik={m.barkodOkut}
              tur="ikincil"
              kilitli={hedef?.kilitler?.barkod}
              onPress={() => router.push('/beslenme/barkod')}
            />
          </View>
        </Satir>

        {/*
          Haftalik planlama isleri artik dugme izgarasinda degil, liste halinde.

          Alti eylem 2x3'luk esit agirlikli bir izgaradaydi: gunde birkac kez kullanilan
          "Fotograftan ekle" ile haftada bir kullanilan "Alisveris listesi" ayni
          goruniyordu. Izgara "ozellik listesi" okuyor, urunun ne yapmani bekledigini
          soylemiyordu.
        */}
        <View style={{ gap: tema.bosluk.xs }}>
          <Yazi tur="etiket" renk="metinSilik">
            {m.planlamaBasligi}
          </Yazi>
          <View>
            <BaglantiSatiri
              ilk
              baslik={m.haftalikPlan}
              kilitli={hedef?.kilitler?.ogun_plani}
              onPress={() => router.push('/ogun/plan')}
            />
            <BaglantiSatiri
              baslik={m.ogunDegistir}
              kilitli={hedef?.kilitler?.kaydirmali_ogun}
              onPress={() => router.push('/ogun/deste')}
            />
            <BaglantiSatiri
              baslik={m.alisverisListesi}
              kilitli={hedef?.kilitler?.ogun_plani}
              onPress={() => router.push('/ogun/alisveris')}
            />
            {/*
              Buzdolabı da `ogun_plani` hakkıyla korunuyor (`ogun.ts` → `ozellikKontrol`),
              ama satır açık görünüyordu. Sunucu kapıyı tutuyordu, ekran söylemiyordu.
            */}
            <BaglantiSatiri
              baslik={m.buzdolabim}
              kilitli={hedef?.kilitler?.ogun_plani}
              onPress={() => router.push('/ogun/dolap')}
            />
          </View>
        </View>

        {aramaAcik ? <BesinArama gun={bugun} onEklendi={() => void yukle()} /> : null}

        {gun && gun.kayitlar.length > 0 ? (
          <Kart>
            <Yazi tur="baslik3">{m.bugunYediklerin}</Yazi>
            {/*
              Satırda ÖNCE yemek adı var.
              Eskiden yalnızca `{quantity} {portion_id ?? 'g'}` yazıyordu; sunucu adı hiç
              göndermiyordu. Kullanıcı gününe baktığında "100 g · 155 kcal" gibi satırlar
              görüyor, NE YEDİĞİNİ göremiyordu — üstelik `portion_id` ham bir katalog
              anahtarı, kullanıcıya gösterilecek bir metin değil.

              Silme de buradaydı eksik: sunucuda `DELETE /v1/beslenme/kayit/:id` vardı ama
              arayüzde hiçbir yerden çağrılmıyordu. Yanlış girilen bir kalori kalıcıydı.
            */}
            {ogunGruplari(gun.kayitlar).map(({ ogun, kayitlar, kalori }) => (
              <View key={ogun ?? 'yok'} style={{ gap: tema.bosluk.xs }}>
                {/*
                  Öğün başlığı ve o öğünün toplamı.

                  Kayıtlar düz bir liste olarak akıyordu; kullanıcı "akşam ne kadar
                  yedim" sorusunu ancak satırları gözüyle toplayarak cevaplayabiliyordu.
                  Öğün bilgisi zaten kaydediliyordu (`food_logs.ogun`), yalnızca
                  gösterilmiyordu.
                */}
                <Satir dagit="space-between" hizala="baseline">
                  <Yazi tur="etiket" renk="aksan">
                    {ogun
                      ? (ogunAdlari[
                          OGUN_METIN_ANAHTARI[ogun as keyof typeof OGUN_METIN_ANAHTARI] ??
                            (ogun as keyof typeof ogunAdlari)
                        ] ?? ogun)
                      : m.ogunYok}
                  </Yazi>
                  <Sayi tur="etiket" renk="metinSilik">
                    {kalori}
                  </Sayi>
                </Satir>
                {kayitlar.map((kayit) => (
                  <Satir key={kayit.id} dagit="space-between">
                    <View style={{ flex: 1 }}>
                      <Yazi tur="kucuk">{kayit.ad ?? m.adsizKalem}</Yazi>
                      <Yazi tur="etiket" renk="metinSilik">
                        {miktarMetni(kayit.quantity, kayit.porsiyon_adi)}
                      </Yazi>
                    </View>
                    <Satir>
                      <Sayi tur="kucuk">{kayit.hesaplanan.kalori} kcal</Sayi>
                      <Pressable
                        onPress={() => kaydiSil(kayit.id)}
                        accessibilityRole="button"
                        accessibilityLabel={m.kaydiSilErisim(kayit.ad ?? m.adsizKalem)}
                        hitSlop={12}
                        style={{
                          minWidth: tema.dokunmaHedefi,
                          minHeight: tema.dokunmaHedefi,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Yazi tur="kucuk" renk="metinSilik">
                          {m.sil}
                        </Yazi>
                      </Pressable>
                    </Satir>
                  </Satir>
                ))}
              </View>
            ))}
          </Kart>
        ) : (
          <BosDurum baslik={m.bosKayitBaslik} govde={m.bosKayitGovde} />
        )}

        {/*
          Su kartı listenin ALTINDA.

          Üstte olsaydı, "bir bardak ekle"ye her dokunuşta sayı değişip yüksekliği
          oynayabilir ve altındaki yemek listesini kaydırırdı — bu depoda 2. kusur
          tam olarak oydu. Altta olunca kartın kendi içindeki değişim kimseyi
          itmiyor.
        */}
        {hedef?.su_hedefi_ml ? (
          <SuKarti
            gun={bugun}
            suMl={gun?.su_ml ?? 0}
            hedefMl={hedef.su_hedefi_ml}
            onDegisti={(ml) => setGun((onceki) => (onceki ? { ...onceki, su_ml: ml } : onceki))}
          />
        ) : null}

        {/*
          Banner listenin ALTINDA ve yüklenene kadar sıfır yükseklikte. Üstte
          olsaydı bu depodaki 2. kusurun aynısını kurardı: bir listenin üstünde
          belirip kaybolan blok, altındaki her şeyi parmağın altından kaydırıyor.
        */}
        <ReklamBanner />
      </Sutun>
    </ScrollView>
  );
}

/**
 * Kayıtları öğüne göre gruplar ve her grubun kalori toplamını verir.
 *
 * Sıra SABİT (kahvaltı → öğle → akşam → ara), kayıt sırasına göre değil: kullanıcı
 * gününe her baktığında aynı düzeni görmeli. Öğünü olmayan kayıtlar en sonda kendi
 * başlığı altında toplanıyor — düşürmek, kullanıcının girdiği bir kalorinin listeden
 * kaybolması demek olurdu.
 */
const OGUN_SIRASI = ['kahvalti', 'ogle', 'aksam', 'ara'] as const;

function ogunGruplari(
  kayitlar: GunCevabi['kayitlar'],
): Array<{ ogun: string | null; kayitlar: GunCevabi['kayitlar']; kalori: number }> {
  const kova = new Map<string, GunCevabi['kayitlar']>();
  for (const k of kayitlar) {
    const anahtar = k.ogun ?? '';
    const mevcut = kova.get(anahtar);
    if (mevcut) mevcut.push(k);
    else kova.set(anahtar, [k]);
  }

  const sirali = [...OGUN_SIRASI.filter((o) => kova.has(o))];
  const bilinmeyenler = [...kova.keys()].filter(
    (a) => a !== '' && !OGUN_SIRASI.includes(a as (typeof OGUN_SIRASI)[number]),
  );
  const anahtarlar: string[] = [...sirali, ...bilinmeyenler];
  if (kova.has('')) anahtarlar.push('');

  return anahtarlar.map((a) => {
    const grup = kova.get(a) ?? [];
    return {
      ogun: a === '' ? null : a,
      kayitlar: grup,
      kalori: grup.reduce((t, k) => t + (k.hesaplanan.kalori ?? 0), 0),
    };
  });
}

function MakroCubugu({ ad, mevcut, hedef }: { ad: string; mevcut: number; hedef: number }) {
  const tema = useTema();
  const oran = hedef > 0 ? Math.min(100, (mevcut / hedef) * 100) : 0;

  return (
    <View style={{ gap: 4 }}>
      <Satir dagit="space-between">
        <Yazi tur="kucuk" renk="metinYumusak">
          {ad}
        </Yazi>
        <Sayi tur="kucuk" renk="metinSilik">
          {Math.round(mevcut)} / {hedef} g
        </Sayi>
      </Satir>
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: tema.renk.yuzeyIkincil,
          overflow: 'hidden',
        }}
      >
        <View style={{ width: `${oran}%`, height: '100%', backgroundColor: tema.renk.aksan }} />
      </View>
    </View>
  );
}

function BesinArama({ gun, onEklendi }: { gun: string; onEklendi: () => void }) {
  const ogunAdlari = useMetinler().ogun.ogunAdlari;
  const { goster: reklamGoster } = useReklamHakki();

  /*
   * Reklam ÖNCEDEN yükleniyor: gösterileceği anda yüklemeye başlamak kullanıcıyı
   * boş ekranda bekletir. Ekran açıldığında hazırlanıyor, kayıt anında hazır.
   */
  useEffect(() => {
    if (reklamGoster) gecisReklamiHazirla();
  }, [reklamGoster]);

  const tema = useTema();
  const m = useMetinler().beslenme;
  const genel = useMetinler().genel;
  const [sorgu, setSorgu] = useState('');
  const [sonuclar, setSonuclar] = useState<BesinSonucu[]>([]);
  const [secili, setSecili] = useState<BesinSonucu | null>(null);
  const [miktar, setMiktar] = useState('1');
  const [porsiyon, setPorsiyon] = useState<string | null>(null);
  /*
    Öğün seçimi, varsayılanı SAATTEN.

    Öğün alanı sunucuda hep vardı (`food_logs.ogun`) ama arayüz hiç sormuyordu; her
    kayıt "Öğün seçilmemiş" altına düşüyor ve "akşam ne kadar yedim" sorusu
    cevapsız kalıyordu.

    Varsayılanı boş bırakmak da olmazdı: kullanıcıya her kayıtta bir soru daha
    sormak, üç dokunuşluk bir işi dörde çıkarır. Saatten tahmin çoğu zaman doğru,
    yanlışsa tek dokunuşla değişiyor.
  */
  const [ogun, setOgun] = useState<string>(() => ogunTahmini(new Date()));
  const [ekleHatasi, setEkleHatasi] = useState<string | null>(null);
  const dil = useDil();

  useEffect(() => {
    if (sorgu.length < 2) {
      setSonuclar([]);
      return;
    }
    const zamanlayici = setTimeout(() => {
      void istek<{ sonuclar: BesinSonucu[] }>(
        `/v1/beslenme/besin/ara?q=${encodeURIComponent(sorgu)}`,
      )
        .then((c) => setSonuclar(c.sonuclar))
        .catch(() => setSonuclar([]));
    }, 250);
    return () => clearTimeout(zamanlayici);
  }, [sorgu]);

  const ekle = async () => {
    if (!secili) return;
    let basarili = true;
    await istek('/v1/beslenme/kayit', {
      yontem: 'POST',
      govde: {
        food_id: secili.id,
        miktar: Number(miktar.replace(',', '.')) || 1,
        portion_id: porsiyon,
        ogun,
        gun,
      },
    }).catch(() => {
      // Sessiz başarısızlık, kullanıcının yemeği eklediğini sanmasına yol açar.
      setEkleHatasi(islemHatasiMetni('yemek_ekle', dil));
      basarili = false;
      return null;
    });

    setSecili(null);
    setSorgu('');
    setMiktar('1');
    setPorsiyon(null);
    onEklendi();

    /*
     * Tam ekran reklam KAYITTAN SONRA ve yalnızca kayıt BAŞARILIYSA.
     *
     * `docs/rakip-analizi.md`, 1★ / 8 beğeni: "kaydet tuşuna basıyorum, kaydetmek
     * yerine reklam çıkıyor." O cümledeki iki kusur da burada yok — kullanıcı
     * ödemişse `reklamGoster` zaten false, ve reklam kaydın yerine geçmiyor:
     * kayıt tamamlandı, ekran temizlendi, liste tazelendi; reklam ondan sonra.
     *
     * Başarısız kayıtta reklam yok: kullanıcı hatayı okuyacak, üstüne reklam
     * bindirmek hatayı gizlemek olur.
     *
     * Beklenmiyor (`void`): reklamın yüklenmesi kullanıcının akışını tutamaz.
     */
    if (basarili) void gecisReklamiGoster(reklamGoster);
  };

  return (
    <Kart>
      <TextInput
        value={sorgu}
        onChangeText={setSorgu}
        placeholder={m.aramaIpucu}
        placeholderTextColor={tema.renk.metinSilik}
        accessibilityLabel={m.yemekArama}
        style={{
          minHeight: tema.dokunmaHedefi,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tema.renk.kenar,
          borderRadius: tema.yaricap.md,
          paddingHorizontal: tema.bosluk.lg,
          fontSize: 16,
          fontFamily: tema.tipografi.aileler.govde,
          color: tema.renk.metin,
          backgroundColor: tema.renk.zemin,
        }}
      />

      {!secili
        ? sonuclar.slice(0, 8).map((besin) => (
            <Pressable
              key={besin.id}
              onPress={() => {
                setSecili(besin);
                setPorsiyon(besin.portions[0]?.id ?? null);
              }}
              accessibilityRole="button"
              style={{
                minHeight: tema.dokunmaHedefi,
                justifyContent: 'center',
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: tema.renk.cizgi,
              }}
            >
              <Satir dagit="space-between">
                <Yazi tur="kucuk" stil={{ flex: 1 }}>
                  {besin.name_tr}
                </Yazi>
                <Sayi tur="etiket" renk="metinSilik">
                  {besin.per_100g.kalori} kcal/100g
                </Sayi>
              </Satir>
            </Pressable>
          ))
        : null}

      {secili ? (
        <View style={{ gap: tema.bosluk.md }}>
          <Yazi tur="baslik3">{secili.name_tr}</Yazi>

          <Satir arasi="sm">
            <TextInput
              value={miktar}
              onChangeText={setMiktar}
              keyboardType="decimal-pad"
              accessibilityLabel={m.miktar}
              style={{
                width: 80,
                minHeight: tema.dokunmaHedefi,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: tema.renk.kenar,
                borderRadius: tema.yaricap.md,
                paddingHorizontal: tema.bosluk.md,
                fontSize: 18,
                fontFamily: tema.tipografi.aileler.sayisal,
                fontVariant: ['tabular-nums'],
                color: tema.renk.metin,
                textAlign: 'center',
              }}
            />
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: tema.bosluk.xs }}>
              {[...secili.portions, { id: 'gram', ad: 'gram', gram: 1 }].map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setPorsiyon(p.id === 'gram' ? null : p.id)}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: porsiyon === p.id || (p.id === 'gram' && porsiyon === null),
                  }}
                  style={{
                    minHeight: tema.dokunmaHedefi,
                    justifyContent: 'center',
                    paddingHorizontal: tema.bosluk.md,
                    borderRadius: tema.yaricap.tam,
                    borderWidth: 1,
                    borderColor:
                      porsiyon === p.id || (p.id === 'gram' && porsiyon === null)
                        ? tema.renk.aksan
                        : tema.renk.cizgi,
                    backgroundColor:
                      porsiyon === p.id || (p.id === 'gram' && porsiyon === null)
                        ? tema.renk.aksanZemin
                        : 'transparent',
                  }}
                >
                  <Yazi tur="kucuk">{p.ad}</Yazi>
                </Pressable>
              ))}
            </View>
          </Satir>

          {/* Öğün seçimi: dört seçenek, biri her zaman seçili. */}
          <Satir arasi="xs" sar>
            {(['kahvalti', 'ogle', 'aksam', 'ara'] as const).map((o) => (
              <Pressable
                key={o}
                accessibilityRole="radio"
                accessibilityState={{ selected: ogun === o }}
                onPress={() => setOgun(o)}
                style={{
                  paddingHorizontal: tema.bosluk.md,
                  paddingVertical: tema.bosluk.sm,
                  borderRadius: tema.yaricap.sm,
                  borderWidth: ogun === o ? 2 : 1,
                  borderColor: ogun === o ? tema.renk.aksan : tema.renk.kenar,
                  backgroundColor: ogun === o ? tema.renk.aksanZemin : 'transparent',
                  minHeight: tema.dokunmaHedefi,
                  justifyContent: 'center',
                }}
              >
                <Yazi tur="kucuk" renk={ogun === o ? 'aksan' : 'metinYumusak'}>
                  {ogunAdlari[OGUN_METIN_ANAHTARI[o]]}
                </Yazi>
              </Pressable>
            ))}
          </Satir>

          <Etiket metin={m.evOlcusuEtiketi} tur="aksan" />
          {ekleHatasi ? <Uyari tur="tehlike" govde={ekleHatasi} /> : null}

          <Dugme baslik={genel.ekle} onPress={() => void ekle()} />
          <Dugme baslik={m.vazgec} tur="sessiz" onPress={() => setSecili(null)} />
        </View>
      ) : null}
    </Kart>
  );
}

/**
 * Öğün kodu → sözlük anahtarı.
 *
 * Sunucu `ara` gönderiyor (`food_logs.ogun` zod şeması), sözlükte karşılığı
 * `ara_ogun`. İkisini birbirine bu harita bağlıyor; doğrudan indekslemek `ara`
 * anahtarında sessizce ham kodu bastırırdı.
 */
const OGUN_METIN_ANAHTARI = {
  kahvalti: 'kahvalti',
  ogle: 'ogle',
  aksam: 'aksam',
  ara: 'ara_ogun',
} as const;

/**
 * Saatten öğün tahmini.
 *
 * Sınırlar Türkiye'nin yaygın öğün saatlerine göre ve bilerek geniş: 05-11 kahvaltı,
 * 11-16 öğle, 16-22 akşam, kalanı ara öğün. Amaç doğru tahmin etmek değil, çoğu
 * zaman doğru olup kullanıcıyı bir dokunuştan kurtarmak.
 */
function ogunTahmini(simdi: Date): string {
  const saat = simdi.getHours();
  if (saat >= 5 && saat < 11) return 'kahvalti';
  if (saat >= 11 && saat < 16) return 'ogle';
  if (saat >= 16 && saat < 22) return 'aksam';
  return 'ara';
}

/**
 * Su kartı.
 *
 * YAZIO paritesinde kalan son eksikti. Hedef EFSA'nın yeterli alım değerinden
 * türüyor; künyesi `kaynaklar.ts`'te (`suEfsa`) ve Ayarlar > Kaynaklar'dan
 * görülebiliyor — kaynaksız bir sağlık sayısı, Apple'ın 1.4.1 ile bir kez
 * reddettiği şeydi. Kart o yüzden kaynağı bir satırla söylüyor.
 *
 * **ED modunda da görünür.** ED kapısı kalori ve makro sayılarını gizliyor; su bir
 * enerji ölçüsü değil ve gizlemek kullanıcıyı korumuyor, yalnızca zararsız bir
 * alışkanlığı da elinden alıyor.
 *
 * **İyimser güncelleme yok.** Sayı sunucudan dönen değerle yazılıyor: artırma
 * veritabanında yapıldığı için doğru toplam yalnızca orada biliniyor. İki hızlı
 * dokunuşta istemci kendi sayısını tutmaya kalksa, sunucudaki gerçekten sapardı.
 */
function SuKarti({
  gun,
  suMl,
  hedefMl,
  onDegisti,
}: {
  gun: string;
  suMl: number;
  hedefMl: number;
  onDegisti: (ml: number) => void;
}) {
  const m = useMetinler().beslenme;
  const tema = useTema();
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const degistir = async (ekleMl: number) => {
    if (gonderiliyor) return;
    setGonderiliyor(true);
    try {
      const cevap = await istek<{ ml: number }>('/v1/beslenme/su', {
        yontem: 'POST',
        govde: { ekle_ml: ekleMl, gun },
      });
      onDegisti(cevap.ml);
    } catch {
      // Sessizce geç: su kaydı başarısız olursa sayı olduğu yerde kalır, uygulama bozulmaz.
    } finally {
      setGonderiliyor(false);
    }
  };

  const oran = hedefMl > 0 ? Math.min(1, suMl / hedefMl) : 0;

  return (
    <Kart>
      <Yazi tur="etiket" renk="aksan">
        {m.suEtiketi}
      </Yazi>
      <Satir arasi="xs" hizala="baseline">
        <Sayi tur="dev" renk="aksan">
          {suMl}
        </Sayi>
        <Yazi tur="kucuk" renk="metinSilik">
          {m.suPayda(hedefMl)}
        </Yazi>
      </Satir>

      <View
        style={{
          height: 4,
          backgroundColor: tema.renk.yuzeyIkincil,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <View style={{ width: `${oran * 100}%`, height: 4, backgroundColor: tema.renk.aksan }} />
      </View>

      <Satir arasi="sm">
        <Dugme baslik={m.suBardakEkle} onPress={() => void degistir(250)} />
        {suMl > 0 ? (
          <Dugme baslik={m.suGeriAl} tur="sessiz" onPress={() => void degistir(-250)} />
        ) : null}
      </Satir>

      {/* Kaynağı söylemek zorunlu: sayı bir sağlık tavsiyesi. */}
      <Yazi tur="kucuk" renk="metinSilik">
        {m.suKaynak}
      </Yazi>
    </Kart>
  );
}
