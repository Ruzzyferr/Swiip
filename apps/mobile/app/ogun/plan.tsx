import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  BosDurum,
  Dugme,
  Ekran,
  Etiket,
  Kart,
  Sayi,
  Satir,
  Uyari,
  Yazi,
  Yukleniyor,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { ApiHatasi, istek } from '../../src/veri/api';
import { useDil, useMetinler } from '../../src/durum/Oturum';
import { buyukHarf } from '@made2fit/shared';

/**
 * Haftalık öğün planı (F8.7).
 *
 * Plan bir dayatma değil bir başlangıç noktası: her öğünün yanında kaç alternatifi olduğu
 * yazar ve tek dokunuşla kaydırmalı desteye geçilir. Makro kilidi sayesinde hangi
 * alternatif seçilirse seçilsin günlük toplam bozulmaz.
 */

interface OgunKalemi {
  ad: string;
  /** Dilden bagimsiz ogun kodu; eski planlarda yok. */
  kod?: string;
  hedef: { kalori: number; protein_g: number };
  tarif: { id: string; ad: string; makrolar: { kalori: number; protein_g: number } } | null;
  secenek_sayisi: number;
}

interface Gun {
  gun: number;
  ogunler: OgunKalemi[];
}

interface PlanCevabi {
  plan_id?: string;
  hafta_basi?: string;
  gunler: Gun[];
  alisveris?: { kalemler: Array<{ ad: string; gram: number; reyon: string }> };
}

/** Haftanın pazartesisini verir; plan haftalık anahtarla saklanır. */
function haftaBasi(): string {
  const bugun = new Date();
  const gun = bugun.getDay();
  const fark = gun === 0 ? -6 : 1 - gun;
  const pazartesi = new Date(bugun);
  pazartesi.setDate(bugun.getDate() + fark);
  return pazartesi.toISOString().slice(0, 10);
}

export default function HaftalikPlan() {
  const tema = useTema();
  const ogunMetinleri = useMetinler().ogun;
  const genel = useMetinler().genel;
  const m = ogunMetinleri.plan;
  const dil = useDil();
  const gunAdlari = ogunMetinleri.haftaGunleri;
  const hafta = haftaBasi();

  const [plan, setPlan] = useState<PlanCevabi | null>(null);
  const [durum, setDurum] = useState<'yukleniyor' | 'hazir' | 'yok' | 'kilit'>('yukleniyor');
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [acikGun, setAcikGun] = useState(0);

  const yukle = useCallback(async () => {
    try {
      const cevap = await istek<{ plan: { days_jsonb: Gun[] }; alisveris: unknown }>(
        `/v1/ogun/plan/${hafta}`,
      );
      setPlan({ gunler: cevap.plan.days_jsonb });
      setDurum('hazir');
    } catch (hata) {
      if (hata instanceof ApiHatasi && hata.durum === 402) {
        setMesaj(hata.mesaj);
        setDurum('kilit');
        return;
      }
      setDurum('yok');
    }
  }, [hafta]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const uret = async () => {
    setDurum('yukleniyor');
    try {
      const cevap = await istek<PlanCevabi>('/v1/ogun/plan', {
        yontem: 'POST',
        govde: { hafta_basi: hafta },
      });
      setPlan(cevap);
      setDurum('hazir');
    } catch (hata) {
      if (hata instanceof ApiHatasi && hata.durum === 402) {
        setMesaj(hata.mesaj);
        setDurum('kilit');
        return;
      }
      setMesaj(hata instanceof ApiHatasi ? hata.mesaj : m.hata);
      setDurum('yok');
    }
  };

  if (durum === 'yukleniyor') {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor metin={m.yukleniyor} />
      </View>
    );
  }

  if (durum === 'kilit') {
    return (
      <Ekran>
        <BosDurum baslik={m.kapaliBaslik} govde={mesaj ?? ''} />
        <Dugme baslik={genel.planlaraBak} onPress={() => router.push('/odeme/paywall')} />
      </Ekran>
    );
  }

  if (durum === 'yok' || !plan) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
        <Ekran>
          <BosDurum baslik={m.bosBaslik} govde={m.bosGovde} />
          {mesaj ? <Uyari tur="uyari" govde={mesaj} /> : null}
          <Dugme baslik={m.planiCikar} onPress={() => void uret()} />
        </Ekran>
      </>
    );
  }

  const gun = plan.gunler[acikGun];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        <Yazi tur="baslik1">{m.haftaBasligi(hafta)}</Yazi>

        <Satir arasi="xs">
          {plan.gunler.map((g, i) => (
            <Pressable
              key={g.gun}
              onPress={() => setAcikGun(i)}
              accessibilityRole="tab"
              accessibilityLabel={gunAdlari[i]}
              accessibilityState={{ selected: acikGun === i }}
              style={{
                flex: 1,
                minHeight: tema.dokunmaHedefi,
                borderRadius: tema.yaricap.sm,
                borderWidth: acikGun === i ? 2 : 1,
                borderColor: acikGun === i ? tema.renk.aksan : tema.renk.cizgi,
                backgroundColor: acikGun === i ? tema.renk.aksanZemin : tema.renk.yuzey,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Yazi tur="etiket" renk={acikGun === i ? 'aksan' : 'metinSilik'}>
                {buyukHarf(gunAdlari[i]?.slice(0, 2) ?? '', dil)}
              </Yazi>
            </Pressable>
          ))}
        </Satir>

        <Yazi tur="baslik2">{gunAdlari[acikGun]}</Yazi>

        {gun?.ogunler.map((ogun) => (
          <Kart key={ogun.ad}>
            <Satir dagit="space-between" hizala="flex-start">
              <Yazi tur="etiket" renk="aksan">
                {buyukHarf(ogun.ad, dil)}
              </Yazi>
              <Sayi tur="etiket" renk="metinSilik">
                hedef {ogun.hedef.kalori} kcal
              </Sayi>
            </Satir>

            {ogun.tarif ? (
              <>
                <Yazi tur="baslik3">{ogun.tarif.ad}</Yazi>
                <Satir arasi="lg" hizala="baseline">
                  <Sayi tur="baslik3">{ogun.tarif.makrolar.kalori}</Sayi>
                  <Yazi tur="kucuk" renk="metinSilik">
                    kcal · {Math.round(ogun.tarif.makrolar.protein_g)} g protein
                  </Yazi>
                </Satir>
                <Satir arasi="sm">
                  <Etiket metin={m.alternatifEtiketi(ogun.secenek_sayisi)} tur="aksan" />
                </Satir>
                <Satir arasi="sm">
                  <View style={{ flex: 1 }}>
                    <Dugme
                      baslik={m.tarifiAc}
                      tur="ikincil"
                      onPress={() =>
                        router.push({ pathname: '/ogun/tarif', params: { id: ogun.tarif!.id } })
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Dugme
                      baslik={m.degistir}
                      tur="ikincil"
                      /**
                       * Hangi gunun hangi ogunu degistiriliyor — soylenmek zorunda.
                       *
                       * Parametresiz gonderiliyordu: kullanici pazartesi kahvaltisina
                       * basiyor, deste ogle destesi aciliyor ve secim hicbir yere
                       * yazilmiyordu.
                       */
                      onPress={() =>
                        router.push({
                          pathname: '/ogun/deste',
                          params: {
                            hafta,
                            gun: String(gun?.gun ?? acikGun),
                            ...(ogun.kod ? { ogun: ogun.kod } : {}),
                          },
                        })
                      }
                    />
                  </View>
                </Satir>
              </>
            ) : (
              <Yazi tur="kucuk" renk="metinSilik">
                {m.ogunYok}
              </Yazi>
            )}
          </Kart>
        ))}

        <Dugme baslik={m.alisverisListesi} onPress={() => router.push('/ogun/alisveris')} />
        <Dugme baslik={m.planiYenile} tur="sessiz" onPress={() => void uret()} />

        <Yazi tur="etiket" renk="metinSilik" hizala="center">
          {m.makroNotu}
        </Yazi>
      </Ekran>
    </>
  );
}
