import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Dugme, Ekran, MetinAlani, Uyari, Yazi } from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { useMetinler } from '../../src/durum/Oturum';
import { ApiHatasi, istek } from '../../src/veri/api';

/**
 * Çevre ölçüleri — fotoğrafsız vücut analizinin girdisi.
 *
 * Bu ekran YOKTU. Sunucu `POST /v1/vucut/analiz` gövdesinde `olculer` kabul ediyordu ve
 * rapor "bel ve boyun ölçünü girersen bir aralık çıkarabiliriz" diyordu — ama uygulamada
 * ölçü girilecek tek bir alan yoktu. "Ölçülerle devam et" düğmesi ölçü sormadan rapora
 * gidiyordu ve rapor ekranı İÇİ BOŞ bir analiz üretiyordu: ücretsiz kullanıcının ömür
 * boyu tek vücut analizi hakkı, hiçbir veri taşımayan bir rapora harcanıyordu.
 *
 * Aralıklar sunucunun şemasıyla aynı (`packages/api/src/rotalar/vucut.ts`).
 */

const ALANLAR = [
  { kod: 'bel_cm', alt: 40, ust: 200 },
  { kod: 'boyun_cm', alt: 20, ust: 70 },
  { kod: 'kalca_cm', alt: 50, ust: 220 },
] as const;

type Kod = (typeof ALANLAR)[number]['kod'];

export default function Olculer() {
  const tema = useTema();
  const metinler = useMetinler();
  const m = metinler.fotograf;
  const etiketler = metinler.degerlendirme.alanEtiketleri;

  const [degerler, setDegerler] = useState<Record<Kod, string>>({
    bel_cm: '',
    boyun_cm: '',
    kalca_cm: '',
  });
  const [hatalar, setHatalar] = useState<Partial<Record<Kod, string>>>({});
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const alanlar = useRef<Partial<Record<Kod, TextInput | null>>>({});

  const sayi = (metin: string) => Number(metin.replace(',', '.'));

  /** Bel ve boyun şart; kalça isteğe bağlı (kadınlarda tahmini daraltıyor). */
  const yeterli = degerler.bel_cm.trim() !== '' && degerler.boyun_cm.trim() !== '';

  const gonder = async () => {
    if (gonderiliyor) return;
    const yeniHatalar: Partial<Record<Kod, string>> = {};
    const olculer: Partial<Record<Kod, number>> = {};
    for (const alan of ALANLAR) {
      const ham = degerler[alan.kod].trim();
      if (ham === '') continue;
      const deger = sayi(ham);
      if (!Number.isFinite(deger) || deger < alan.alt || deger > alan.ust) {
        yeniHatalar[alan.kod] = m.olcuGecersiz(alan.alt, alan.ust);
      } else {
        olculer[alan.kod] = deger;
      }
    }
    setHatalar(yeniHatalar);
    if (Object.keys(yeniHatalar).length > 0) return;

    setHata(null);
    setGonderiliyor(true);
    try {
      await istek('/v1/vucut/analiz', { yontem: 'POST', govde: { olculer } });
      router.replace('/rapor');
    } catch (h) {
      setHata(h instanceof ApiHatasi ? h.mesaj : metinler.rapor.hataMesaji);
      setGonderiliyor(false);
    }
  };

  return (
    <Ekran>
      <Yazi tur="baslik1">{m.olculerBaslik}</Yazi>
      <Yazi renk="metinYumusak">{m.olculerGiris}</Yazi>

      {ALANLAR.map((alan, i) => {
        const sonraki = ALANLAR[i + 1];
        return (
          <View key={alan.kod} style={{ gap: tema.bosluk.xs }}>
            <Yazi tur="baslik3">{etiketler[alan.kod]}</Yazi>
            <Yazi tur="kucuk" renk="metinYumusak">
              {m.olcuIpuclari[alan.kod]}
            </Yazi>
            <View style={{ justifyContent: 'center' }}>
              <MetinAlani
                ref={(r) => {
                  alanlar.current[alan.kod] = r;
                }}
                value={degerler[alan.kod]}
                onChangeText={(v) => {
                  setDegerler((d) => ({ ...d, [alan.kod]: v.replace(/[^0-9.,]/g, '') }));
                  if (hatalar[alan.kod]) setHatalar((h) => ({ ...h, [alan.kod]: undefined }));
                }}
                keyboardType="decimal-pad"
                maxLength={5}
                returnKeyType={sonraki ? 'next' : 'done'}
                submitBehavior={sonraki ? 'submit' : 'blurAndSubmit'}
                onSubmitEditing={() => {
                  if (sonraki) alanlar.current[sonraki.kod]?.focus();
                }}
                placeholder={m.olcuAraligi(alan.alt, alan.ust)}
                accessibilityLabel={etiketler[alan.kod]}
                style={{
                  paddingRight: 56,
                  fontSize: 18,
                  fontFamily: tema.tipografi.aileler.sayisal,
                  fontVariant: ['tabular-nums'],
                }}
              />
              <Yazi
                tur="kucuk"
                renk="metinSilik"
                stil={{ position: 'absolute', right: tema.bosluk.lg }}
              >
                cm
              </Yazi>
            </View>
            {/* Hata satırı yer tutuyor: belirince altındaki alanı itmesin. */}
            <Yazi tur="etiket" renk="tehlike" stil={{ minHeight: 18 }}>
              {hatalar[alan.kod] ?? ''}
            </Yazi>
          </View>
        );
      })}

      {hata ? <Uyari tur="tehlike" govde={hata} /> : null}

      <Dugme
        baslik={m.raporuCikar}
        onPress={() => void gonder()}
        pasif={!yeterli}
        yukleniyor={gonderiliyor}
      />
      <Dugme
        baslik={m.olcusuzGec}
        tur="sessiz"
        onPress={() => router.dismissTo('/(sekme)/program')}
      />
      <Yazi tur="etiket" renk="metinSilik" hizala="center">
        {m.olcusuzGecNotu}
      </Yazi>
    </Ekran>
  );
}
