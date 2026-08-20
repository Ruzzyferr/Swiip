import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { DILLER, islemHatasiMetni, type Dil } from '@made2fit/shared';
import {
  Ayirac,
  Dugme,
  Etiket,
  Kart,
  Sayi,
  Satir,
  Uyari,
  Yazi,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { istek } from '../../src/veri/api';
import { useDil, useMetinler, useOturum } from '../../src/durum/Oturum';
import { tarihMetni } from '@made2fit/shared';

/**
 * Ayarlar.
 *
 * Sıralama tesadüf değil: ABONELİK İPTALİ EN ÜSTTE. Pilates Workout negatiflerinin %42'si
 * iptal/iade şikâyetiydi. İptali gömmek kısa vadede geliri korur, uzun vadede puanı öldürür.
 */

interface AbonelikDurumu {
  plan: string;
  haklar: { aylik_fiyat_try: number };
  kota: {
    yenilenme: string;
    yemek_tanima: { kullanilan: number; toplam: number; kalan: number };
    koc_sohbeti: { kullanilan: number; toplam: number; kalan: number };
    adalet_notu: string;
  };
  promosyon_goster: boolean;
}

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

  const [abonelik, setAbonelik] = useState<AbonelikDurumu | null>(null);
  const [dilYukleniyor, setDilYukleniyor] = useState(false);
  const [islemHatasi, setIslemHatasi] = useState<string | null>(null);
  const [dogrulamaAdimi, setDogrulamaAdimi] = useState<'kapali' | 'kod'>('kapali');
  const [dogrulamaKodu, setDogrulamaKodu] = useState('');
  const [dogrulamaNotu, setDogrulamaNotu] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setAbonelik(await istek<AbonelikDurumu>('/v1/abonelik/durum').catch(() => null));
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const iptalEt = () => {
    Alert.alert(a.iptalOnayBaslik, a.iptalOnayGovde, [
      { text: metinler.genel.iptal, style: 'cancel' },
      {
        text: a.iptalEt,
        style: 'destructive',
        onPress: () => {
          void istek('/v1/abonelik/iptal', { yontem: 'POST', govde: {} }).then(() => void yukle());
        },
      },
    ]);
  };

  const hesabiSil = () => {
    Alert.alert(a.silOnayBaslik, a.silOnayGovde, [
      { text: metinler.genel.iptal, style: 'cancel' },
      {
        text: a.sil,
        style: 'destructive',
        onPress: () => {
          void istek('/v1/hesap', { yontem: 'DELETE', govde: { onay: 'HESABIMI SİL' } })
            .then(() => cikisYap())
            .then(() => router.replace('/'));
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
    const yanit = await istek<{ mesaj: string }>('/v1/kimlik/eposta-dogrula-gonder', {
      yontem: 'POST',
      govde: {},
    }).catch(() => null);
    setDogrulamaAdimi('kod');
    setDogrulamaNotu(yanit?.mesaj ?? a.kodGonderilemedi);
  };

  const epostayiDogrula = async () => {
    setDogrulamaNotu(null);
    const yanit = await istek('/v1/kimlik/eposta-dogrula', {
      yontem: 'POST',
      govde: { kod: dogrulamaKodu.trim() },
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
    <ScrollView style={{ flex: 1, backgroundColor: tema.renk.zemin }}>
      <View style={{ padding: tema.bosluk.lg, gap: tema.bosluk.lg }}>
        {/* --- İPTAL EN ÜSTTE --- */}
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

            {abonelik.kota.yemek_tanima.toplam > 0 ? (
              <Satir dagit="space-between">
                <Yazi tur="kucuk" renk="metinYumusak">
                  {a.yemekTanima}
                </Yazi>
                <Sayi tur="kucuk" renk="aksan">
                  {abonelik.kota.yemek_tanima.kalan} / {abonelik.kota.yemek_tanima.toplam}
                </Sayi>
              </Satir>
            ) : null}

            {abonelik.kota.koc_sohbeti.toplam > 0 ? (
              <Satir dagit="space-between">
                <Yazi tur="kucuk" renk="metinYumusak">
                  {a.kocMesaji}
                </Yazi>
                <Sayi tur="kucuk" renk="aksan">
                  {abonelik.kota.koc_sohbeti.kalan} / {abonelik.kota.koc_sohbeti.toplam}
                </Sayi>
              </Satir>
            ) : null}

            <Ayirac />
            <Yazi tur="etiket" renk="metinSilik">
              {abonelik.kota.adalet_notu}
            </Yazi>
            <Yazi tur="etiket" renk="metinSilik">
              {/* Sunucu ISO tarih gönderiyor; kullanıcıya "2026-09-01" gösterilemez. */}
              {a.kotaYenilenme(tarihMetni(new Date(abonelik.kota.yenilenme), aktifDil))}
            </Yazi>

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
            onPress={() => {
              void istek('/v1/degerlendirme/yeni-surum', { yontem: 'POST', govde: {} }).then(() =>
                router.push('/degerlendirme'),
              );
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
            onPress={() => {
              void istek('/v1/hesap/disa-aktar').then(() =>
                Alert.alert(a.verinHazirBaslik, a.verinHazirGovde),
              );
            }}
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
          <Yazi tur="kucuk" renk="metinSilik">
            {a.dilNotu}
          </Yazi>
        </Kart>

        <Kart>
          <Yazi tur="baslik3">{a.saglikUyarisiBasligi}</Yazi>
          <Yazi tur="kucuk" renk="metinYumusak">
            {metinler.saglik.tibbiCihazDegil}
          </Yazi>
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
                    onChangeText={(m) => setDogrulamaKodu(m.replace(/\D/g, '').slice(0, 6))}
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
      </View>
    </ScrollView>
  );
}
