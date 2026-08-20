import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  Ayirac,
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
import { useDil, useMetinler } from '../../src/durum/Oturum';
import { fiyatMetni, tarihMetni } from '@made2fit/shared';
import { istek } from '../../src/veri/api';
import { magaza, type Donem as MagazaDonemi, type PlanKodu } from '../../src/odeme/magaza';

/**
 * Paywall — spec bölüm 13.
 *
 * Kurallar tek tek uygulanmıştır:
 *  - Tek ekran, karşılaştırma tablosu var.
 *  - Toplam tutar ve yenileme tarihi EN BÜYÜK PUNTODA.
 *  - ÖNCEDEN SEÇİLİ PLAN YOK. Kullanıcı seçmeden satın alma düğmesi açılmaz.
 *  - Geri sayım, sahte kıtlık, "son şans" yok.
 *  - Kapatma düğmesi ilk saniyeden görünür ve gerçekten kapatır.
 *  - İptalin nasıl yapıldığı satın alma ekranında yazar.
 */

interface Plan {
  kod: string;
  aylik_fiyat_try: number;
  yillik_fiyat_try: number;
  koc_mesaji_aylik: number;
  yemek_tanima_aylik: number;
  gorunur_gun_sayisi: number | 'tumu';
  seans_geri_bildirimi: boolean;
  kalori_makro_hedefi: boolean;
  ogun_plani: boolean;
  barkod: boolean;
}

type Donem = 'aylik' | 'yillik';

export default function Paywall() {
  const tema = useTema();
  const m = useMetinler().paywall;
  const genel = useMetinler().genel;
  const dil = useDil();

  const [planlar, setPlanlar] = useState<Plan[]>([]);
  const [secili, setSecili] = useState<string | null>(null); // ÖN SEÇİM YOK
  const [donem, setDonem] = useState<Donem>('aylik');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [satinAlmaHatasi, setSatinAlmaHatasi] = useState<string | null>(null);
  /**
   * Mağazadan gelen yerelleştirilmiş fiyatlar: ürün kimliği → "$4.99" gibi hazır dize.
   *
   * Fiyatın tek doğruluk kaynağı mağazadır; tahsil edilen tutar odur. Bu ekran daha önce
   * sunucudaki liste fiyatını sabit `₺` ile yazıyordu — mağaza dolar çekerken ekranda
   * lira yazması, yalnızca çeviri hatası değil yanlış fiyat beyanıdır.
   */
  const [magazaFiyatlari, setMagazaFiyatlari] = useState<Record<string, string>>({});

  useEffect(() => {
    void istek<{ planlar: Plan[] }>('/v1/abonelik/planlar')
      .then((c) => setPlanlar(c.planlar.filter((p) => p.kod !== 'ucretsiz')))
      .catch(() => setPlanlar([]));
  }, []);

  // Mağaza ulaşılamazsa boş döner ve liste fiyatına düşülür; ekran yine açılır.
  useEffect(() => {
    void magaza.fiyatlar().then(setMagazaFiyatlari);
  }, []);

  /** Önce mağaza fiyatı, yoksa liste fiyatı — her durumda para birimi görünür. */
  const fiyatYazisi = (kod: string, d: Donem, listeFiyati: number): string =>
    magazaFiyatlari[magaza.urunKimligi(kod as PlanKodu, d as MagazaDonemi) ?? ''] ??
    fiyatMetni(listeFiyati, dil);

  /** Plan adı sözlükten; sunucu artık görünen ad göndermiyor. */
  const planAdi = (kod: string): string =>
    genel.planAdlari[kod as keyof typeof genel.planAdlari] ?? kod;

  const seciliPlan = planlar.find((p) => p.kod === secili);
  const tutar = seciliPlan
    ? donem === 'aylik'
      ? seciliPlan.aylik_fiyat_try
      : seciliPlan.yillik_fiyat_try
    : 0;

  const yenilemeTarihi = new Date();
  if (donem === 'aylik') yenilemeTarihi.setMonth(yenilemeTarihi.getMonth() + 1);
  else yenilemeTarihi.setFullYear(yenilemeTarihi.getFullYear() + 1);

  const satinAl = async () => {
    if (!secili) return;
    setYukleniyor(true);
    setSatinAlmaHatasi(null);

    const sonuc = await magaza.satinAl(secili as PlanKodu, donem as MagazaDonemi);

    // Hak sunucuda açılır; istemci "premium oldum" diyemez.
    if (sonuc.durum === 'basarili') {
      setYukleniyor(false);
      router.back();
      return;
    }

    if (sonuc.durum === 'iptal') {
      setYukleniyor(false);
      return;
    }

    // SDK henüz bağlı değilse geliştirme akışı: sunucudan doğrudan güncelle.
    if (sonuc.durum === 'sdk_yok' && __DEV__) {
      await istek('/v1/abonelik/guncelle', {
        yontem: 'POST',
        govde: { plan: secili, renews_at: yenilemeTarihi.toISOString() },
      }).catch(() => null);
      setYukleniyor(false);
      router.back();
      return;
    }

    setSatinAlmaHatasi(sonuc.mesaj ?? m.satinAlmaHatasi);
    setYukleniyor(false);
  };

  const geriYukle = async () => {
    setYukleniyor(true);
    const sonuc = await magaza.geriYukle();
    setYukleniyor(false);
    if (sonuc.durum === 'basarili') router.back();
    else setSatinAlmaHatasi(m.geriYuklemeYok);
  };

  if (planlar.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: m.planlarBasligi,
          // Kapatma ilk saniyeden görünür ve gerçekten kapatır.
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={m.kapat}
              style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
            >
              <Yazi tur="baslik3">✕</Yazi>
            </Pressable>
          ),
        }}
      />
      <Ekran>
        <Yazi tur="baslik1">{m.baslik}</Yazi>
        <Yazi renk="metinYumusak">{m.girisMetni}</Yazi>

        <Satir arasi="sm">
          {(['aylik', 'yillik'] as const).map((d) => (
            <Pressable
              key={d}
              onPress={() => setDonem(d)}
              accessibilityRole="tab"
              accessibilityState={{ selected: donem === d }}
              style={{
                flex: 1,
                minHeight: tema.dokunmaHedefi,
                borderRadius: tema.yaricap.md,
                borderWidth: donem === d ? 2 : 1,
                borderColor: donem === d ? tema.renk.aksan : tema.renk.cizgi,
                backgroundColor: donem === d ? tema.renk.aksanZemin : tema.renk.yuzey,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Yazi renk={donem === d ? 'aksan' : 'metinYumusak'}>
                {d === 'aylik' ? m.aylik : m.yillik}
              </Yazi>
            </Pressable>
          ))}
        </Satir>

        {planlar.map((plan) => {
          const isaretli = secili === plan.kod;
          const fiyat = fiyatYazisi(
            plan.kod,
            donem,
            donem === 'aylik' ? plan.aylik_fiyat_try : plan.yillik_fiyat_try,
          );
          const ad = planAdi(plan.kod);

          return (
            <Pressable
              key={plan.kod}
              onPress={() => setSecili(plan.kod)}
              accessibilityRole="radio"
              accessibilityLabel={m.planErisim(ad, fiyat)}
              accessibilityState={{ checked: isaretli }}

              style={{ minHeight: tema.dokunmaHedefi }}
            >
              <Kart vurgulu={isaretli}>
                <Satir dagit="space-between" hizala="baseline">
                  <Yazi tur="baslik2">{ad}</Yazi>
                  <Satir arasi="xs" hizala="baseline">
                    <Sayi tur="baslik1" renk={isaretli ? 'aksan' : 'metin'}>
                      {fiyat}
                    </Sayi>
                    <Yazi tur="kucuk" renk="metinSilik">
                      /{donem === 'aylik' ? m.ayKisa : m.yilKisa}
                    </Yazi>
                  </Satir>
                </Satir>

                <Ayirac />

                <Ozellik metin={m.ozellikler.tumGunler} acik />
                <Ozellik metin={m.ozellikler.geriBildirim} acik={plan.seans_geri_bildirimi} />
                <Ozellik metin={m.ozellikler.kaloriMakroHedefi} acik={plan.kalori_makro_hedefi} />
                <Ozellik metin={m.ozellikler.ogunPlani} acik={plan.ogun_plani} />
                <Ozellik metin={m.ozellikler.barkodOkuma} acik={plan.barkod} />
                <Ozellik
                  metin={m.ozellikler.kocSohbeti(plan.koc_mesaji_aylik)}
                  acik={plan.koc_mesaji_aylik > 0}
                />
                <Ozellik
                  metin={
                    plan.yemek_tanima_aylik > 0
                      ? m.ozellikler.yemekTanimaKotali(plan.yemek_tanima_aylik)
                      : m.ozellikler.yemekTanima
                  }
                  acik={plan.yemek_tanima_aylik > 0}
                />
                <Ozellik metin={m.ozellikler.programDuzenleme} acik />
                <Ozellik metin={m.ozellikler.reklamYok} acik />
              </Kart>
            </Pressable>
          );
        })}

        {seciliPlan ? (
          <Kart vurgulu>
            <Yazi tur="etiket" renk="aksan">
              {m.odenecekTutar}
            </Yazi>
            <Sayi tur="dev" renk="aksan">
              {fiyatYazisi(seciliPlan.kod, donem, tutar)}
            </Sayi>
            <Yazi tur="baslik3">{m.yenilemeTarihi(tarihMetni(yenilemeTarihi, dil))}</Yazi>
            <Yazi tur="kucuk" renk="metinYumusak">
              {m.tahsilatNotu(donem === 'aylik' ? m.herAy : m.herYil)}
            </Yazi>
          </Kart>
        ) : (
          <Kart>
            <Yazi tur="kucuk" renk="metinSilik" hizala="center">
              {m.planSecUyarisi}
            </Yazi>
          </Kart>
        )}

        {satinAlmaHatasi ? <Uyari tur="uyari" govde={satinAlmaHatasi} /> : null}

        <Dugme
          baslik={seciliPlan ? m.planiBaslat(planAdi(seciliPlan.kod)) : m.planSec}
          onPress={() => void satinAl()}
          pasif={!secili}
          yukleniyor={yukleniyor}
        />

        {/* Mağaza politikası gereği zorunlu. */}
        <Dugme baslik={m.geriYukle} tur="sessiz" onPress={() => void geriYukle()} />

        <Kart>
          <Yazi tur="baslik3">{m.iptalBasligi}</Yazi>
          <Yazi tur="kucuk" renk="metinYumusak">
            {m.iptalGovde}
          </Yazi>
        </Kart>

        <Etiket metin={m.durusEtiketi} />
      </Ekran>
    </>
  );
}

function Ozellik({ metin, acik }: { metin: string; acik: boolean }) {
  return (
    <Satir arasi="sm" hizala="flex-start">
      <Yazi tur="kucuk" renk={acik ? 'aksan' : 'metinSilik'}>
        {acik ? '✓' : '—'}
      </Yazi>
      <Yazi
        tur="kucuk"
        renk={acik ? 'metinYumusak' : 'metinSilik'}
        stil={{ flex: 1, textDecorationLine: acik ? 'none' : 'line-through' }}
      >
        {metin}
      </Yazi>
    </Satir>
  );
}
