import { Pressable, View } from 'react-native';
import type { Soru } from '@swiip/shared';
import { Dugme, Satir, Uyari, Yazi } from '../tasarim/bilesenler';
import { useTema } from '../tasarim/tema';
import { useMetinler } from '../durum/Oturum';

/**
 * Ekipman envanteri (F2.5).
 *
 * Görsel çoklu seçim + salon zincirine göre ön doldurma. Ön doldurma bir varsayımdır,
 * kısıt değil: kullanıcı onaylayana kadar bağlayıcı olmaz, tikleri kaldırabilir.
 */

const SIMGELER: Record<string, string> = {
  'Barbell ve plaka': '🏋',
  Dumbbell: '🔩',
  Kettlebell: '🔔',
  'Leg press': '🦵',
  'Hack squat': '⛰',
  'Lat pulldown': '⬇',
  'Kablo makinesi': '🔗',
  'Smith makinesi': '⛓',
  'Barfiks barı': '➖',
  'Dip barı': '⊓',
  'Düz bench': '🛏',
  'Eğimli bench': '📐',
  'Ayarlanabilir bench': '🪑',
  'Direnç bandı': '➰',
  'Koşu bandı': '🏃',
  'Sabit bisiklet': '🚲',
  'Kürek makinesi': '🚣',
  Merdiven: '🪜',
  'TRX / askı': '🪢',
  'Squat rack': '🗜',
  'Göğüs presi makinesi': '🎛',
  'Sırt makinesi': '🎚',
  'Omuz presi makinesi': '🎛',
  'Bacak ekstansiyon / curl makinesi': '🦿',
  'Baldır makinesi': '🦶',
  'Abduktor / adduktor makinesi': '↔',
  'Preacher bench': '💪',
  'Roma sandalyesi / hiperekstansiyon': '🪑',
  'Plyo box': '📦',
  'Hiçbiri, vücut ağırlığı': '🧍',
};

/** Zincir salonlarda standart set. `salonOnDoldurma` ile aynı mantık, arayüz tarafı. */
const SALON_SETLERI: Record<string, string[]> = {
  MACFit: TAM_SET(),
  'Fit In Time': TAM_SET(),
  Sportium: TAM_SET(),
  'B-Fit': DAR_SET(),
  'Üniversite / kurum salonu': DAR_SET(),
  'Bağımsız salon': DAR_SET(),
};

function TAM_SET(): string[] {
  return [
    'Barbell ve plaka',
    'Dumbbell',
    'Kettlebell',
    'Leg press',
    'Hack squat',
    'Lat pulldown',
    'Kablo makinesi',
    'Smith makinesi',
    'Barfiks barı',
    'Dip barı',
    'Düz bench',
    'Eğimli bench',
    'Ayarlanabilir bench',
    'Squat rack',
    'Koşu bandı',
    'Sabit bisiklet',
    'Kürek makinesi',
    'Göğüs presi makinesi',
    'Sırt makinesi',
    'Omuz presi makinesi',
    'Bacak ekstansiyon / curl makinesi',
    'Baldır makinesi',
    'Abduktor / adduktor makinesi',
    'Preacher bench',
    'Roma sandalyesi / hiperekstansiyon',
  ];
}

function DAR_SET(): string[] {
  return [
    'Barbell ve plaka',
    'Dumbbell',
    'Lat pulldown',
    'Kablo makinesi',
    'Barfiks barı',
    'Düz bench',
    'Eğimli bench',
    'Squat rack',
    'Leg press',
    'Koşu bandı',
  ];
}

export interface EkipmanEnvanteriProps {
  soru: Soru;
  deger: unknown;
  onDegisim: (deger: unknown) => void;
  /** E2 cevabı; verilirse ön doldurma önerilir. */
  salon?: string;
}

export function EkipmanEnvanteri({ soru, deger, onDegisim, salon }: EkipmanEnvanteriProps) {
  const tema = useTema();
  const m = useMetinler().degerlendirme.ekipman;
  const secili = Array.isArray(deger) ? (deger as string[]) : [];
  const secenekler = soru.options ?? [];
  const onDolduSet = salon ? SALON_SETLERI[salon] : undefined;

  const degistir = (secenek: string) => {
    if (secenek === 'Hiçbiri, vücut ağırlığı') {
      onDegisim(secili.includes(secenek) ? [] : [secenek]);
      return;
    }
    const temiz = secili.filter((s) => s !== 'Hiçbiri, vücut ağırlığı');
    onDegisim(temiz.includes(secenek) ? temiz.filter((s) => s !== secenek) : [...temiz, secenek]);
  };

  return (
    <View style={{ gap: tema.bosluk.md }}>
      {onDolduSet && secili.length === 0 ? (
        <View style={{ gap: tema.bosluk.sm }}>
          <Uyari govde={m.onDoldurmaOnerisi(salon ?? '')} />
          <Dugme
            baslik={m.salonumaGoreDoldur}
            tur="ikincil"
            onPress={() => onDegisim(onDolduSet)}
          />
        </View>
      ) : null}

      <Satir dagit="space-between">
        <Yazi tur="kucuk" renk="metinSilik">
          {m.secili(secili.length)}
        </Yazi>
        {secili.length > 0 ? (
          /*
            Hiç stili yoktu: dokunma alanı 14 px'lik metnin sınırları kadardı ve bu
            düğme tüm ekipman seçimini siliyor. Küçük hedef + geri alınamayan işlem
            kötü bir ikili.
          */
          <Pressable
            onPress={() => onDegisim([])}
            accessibilityRole="button"
            accessibilityLabel={m.temizle}
            hitSlop={12}
            style={{
              minHeight: tema.dokunmaHedefi,
              justifyContent: 'center',
              paddingHorizontal: tema.bosluk.sm,
            }}
          >
            <Yazi tur="kucuk" renk="aksan">
              {m.temizle}
            </Yazi>
          </Pressable>
        ) : null}
      </Satir>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.bosluk.sm }}>
        {secenekler.map((secenek) => {
          const isaretli = secili.includes(secenek);
          return (
            <Pressable
              key={secenek}
              onPress={() => degistir(secenek)}
              accessibilityRole="checkbox"
              accessibilityLabel={secenek}
              accessibilityState={{ checked: isaretli }}
              style={{
                width: '47%',
                minHeight: tema.dokunmaHedefi + 20,
                borderRadius: tema.yaricap.md,
                borderWidth: isaretli ? 2 : 1,
                borderColor: isaretli ? tema.renk.aksan : tema.renk.cizgi,
                backgroundColor: isaretli ? tema.renk.aksanZemin : tema.renk.yuzey,
                padding: tema.bosluk.md,
                gap: 4,
                justifyContent: 'center',
              }}
            >
              <Yazi tur="baslik3">{SIMGELER[secenek] ?? '•'}</Yazi>
              <Yazi tur="kucuk" renk={isaretli ? 'aksan' : 'metinYumusak'}>
                {secenek}
              </Yazi>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
