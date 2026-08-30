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
import { islemHatasiMetni, yerelGun } from '@swiip/shared';
import { useDil, useMetinler } from '../../src/durum/Oturum';
import { sunucuMetni } from '../../src/veri/sunucuMetni';

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
}

interface BesinSonucu {
  id: string;
  name_tr: string;
  per_100g: { kalori: number; protein_g: number; yag_g: number; karbonhidrat_g: number };
  portions: Array<{ id: string; ad: string; gram: number }>;
}

export default function Beslenme() {
  const tema = useTema();
  const tumMetinler = useMetinler();
  const m = tumMetinler.beslenme;
  const genel = useMetinler().genel;
  /*
    `toISOString()` UTC gunu verir. Turkiye UTC+3: gece 00:00-03:00 arasi girilen
    yemek DUNE yaziliyor ve "Bugun" listesinden kayboluyordu — kalori takibinde en
    sik kacirilan ogun tam da o.
  */
  const bugun = yerelGun();

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
        <Yazi tur="baslik1">{m.bugun}</Yazi>

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
            {gun.kayitlar.map((kayit) => (
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
          </Kart>
        ) : (
          <BosDurum baslik={m.bosKayitBaslik} govde={m.bosKayitGovde} />
        )}
      </Sutun>
    </ScrollView>
  );
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
  const tema = useTema();
  const m = useMetinler().beslenme;
  const genel = useMetinler().genel;
  const [sorgu, setSorgu] = useState('');
  const [sonuclar, setSonuclar] = useState<BesinSonucu[]>([]);
  const [secili, setSecili] = useState<BesinSonucu | null>(null);
  const [miktar, setMiktar] = useState('1');
  const [porsiyon, setPorsiyon] = useState<string | null>(null);
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
    await istek('/v1/beslenme/kayit', {
      yontem: 'POST',
      govde: {
        food_id: secili.id,
        miktar: Number(miktar.replace(',', '.')) || 1,
        portion_id: porsiyon,
        gun,
      },
    }).catch(() => {
      // Sessiz başarısızlık, kullanıcının yemeği eklediğini sanmasına yol açar.
      setEkleHatasi(islemHatasiMetni('yemek_ekle', dil));
      return null;
    });

    setSecili(null);
    setSorgu('');
    setMiktar('1');
    setPorsiyon(null);
    onEklendi();
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

          <Etiket metin={m.evOlcusuEtiketi} tur="aksan" />
          {ekleHatasi ? <Uyari tur="tehlike" govde={ekleHatasi} /> : null}

          <Dugme baslik={genel.ekle} onPress={() => void ekle()} />
          <Dugme baslik={m.vazgec} tur="sessiz" onPress={() => setSecili(null)} />
        </View>
      ) : null}
    </Kart>
  );
}
