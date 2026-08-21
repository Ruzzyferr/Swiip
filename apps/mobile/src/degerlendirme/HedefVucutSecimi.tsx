import { Pressable, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import type { Soru } from '@swiip/shared';
import { Yazi } from '../tasarim/bilesenler';
import { useTema } from '../tasarim/tema';
import { useMetinler } from '../durum/Oturum';

/**
 * Hedef vücut görsel seçimi (F2.4).
 *
 * Fotoğraf değil, çizim kullanılıyor: fotoğraf gerçek bir bedeni "hedef" diye sunar ve
 * karşılaştırma üretir. Sekiz kademe, nötr silüet, yargı içermeyen etiketler.
 * Etiketlerde "ideal", "mükemmel", "kusursuz" gibi kelimeler bilinçli olarak yok.
 */

interface Kademe {
  kod: string;
  /** Silüet genişlik çarpanı (omuz) ve bel çarpanı — görsel farkı bu ikisi taşıyor. */
  omuz: number;
  bel: number;
}

const KADEMELER: Kademe[] = [
  { kod: 'ince', omuz: 0.82, bel: 0.72 },
  { kod: 'ince_tonlu', omuz: 0.9, bel: 0.7 },
  { kod: 'atletik', omuz: 1, bel: 0.72 },
  { kod: 'kaslı_atletik', omuz: 1.12, bel: 0.76 },
  { kod: 'kaslı', omuz: 1.24, bel: 0.84 },
  { kod: 'guclu_hacimli', omuz: 1.32, bel: 1 },
  { kod: 'ortalama', omuz: 1, bel: 1.05 },
  { kod: 'daha_dolgun', omuz: 1.05, bel: 1.28 },
];

export interface HedefVucutSecimiProps {
  soru: Soru;
  deger: unknown;
  onDegisim: (deger: unknown) => void;
}

export function HedefVucutSecimi({ deger, onDegisim }: HedefVucutSecimiProps) {
  const tema = useTema();
  const m = useMetinler().degerlendirme;
  const kademeAdi = (kod: string) => m.siluetAdlari[kod as keyof typeof m.siluetAdlari] ?? kod;
  const secili = typeof deger === 'string' ? deger : undefined;

  return (
    <View style={{ gap: tema.bosluk.md }}>
      <Yazi tur="kucuk" renk="metinSilik">
        {m.siluetNotu}
      </Yazi>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.bosluk.md }}>
        {KADEMELER.map((kademe) => {
          const isaretli = secili === kademe.kod;
          return (
            <Pressable
              key={kademe.kod}
              onPress={() => onDegisim(kademe.kod)}
              accessibilityRole="radio"
              accessibilityLabel={kademeAdi(kademe.kod)}
              accessibilityState={{ checked: isaretli }}
              style={{
                width: '47%',
                minHeight: tema.dokunmaHedefi * 3,
                borderRadius: tema.yaricap.md,
                borderWidth: isaretli ? 2 : 1,
                borderColor: isaretli ? tema.renk.aksan : tema.renk.cizgi,
                backgroundColor: isaretli ? tema.renk.aksanZemin : tema.renk.yuzey,
                alignItems: 'center',
                paddingVertical: tema.bosluk.md,
                gap: tema.bosluk.xs,
              }}
            >
              <Svg width={64} height={110} viewBox="0 0 60 110">
                <KademeSilueti
                  kademe={kademe}
                  renk={isaretli ? tema.renk.aksan : tema.renk.yuzeyIkincil}
                  cizgi={isaretli ? tema.renk.aksan : tema.renk.cizgi}
                />
              </Svg>
              <Yazi tur="kucuk" renk={isaretli ? 'aksan' : 'metinYumusak'} hizala="center">
                {kademeAdi(kademe.kod)}
              </Yazi>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function KademeSilueti({ kademe, renk, cizgi }: { kademe: Kademe; renk: string; cizgi: string }) {
  const merkez = 30;
  const omuzYari = 12 * kademe.omuz;
  const belYari = 9 * kademe.bel;
  const kalcaYari = 10.5 * Math.max(kademe.bel, 0.9);

  const govde = [
    `M${merkez - omuzYari} 30`,
    `C${merkez - omuzYari - 2} 42 ${merkez - belYari} 46 ${merkez - belYari} 54`,
    `C${merkez - belYari} 62 ${merkez - kalcaYari} 64 ${merkez - kalcaYari} 70`,
    `L${merkez + kalcaYari} 70`,
    `C${merkez + kalcaYari} 64 ${merkez + belYari} 62 ${merkez + belYari} 54`,
    `C${merkez + belYari} 46 ${merkez + omuzYari + 2} 42 ${merkez + omuzYari} 30`,
    'Z',
  ].join(' ');

  return (
    <G fill={renk} stroke={cizgi} strokeWidth={0.7} opacity={0.9}>
      <Circle cx={merkez} cy={14} r={7} />
      <Path d={`M${merkez - 3} 21 h6 v6 h-6 z`} />
      <Path d={govde} />
      <Path
        d={`M${merkez - kalcaYari} 70 L${merkez - kalcaYari + 1} 100 h6 L${merkez - 1} 74 L${merkez + 1} 74 L${merkez + kalcaYari - 7} 100 h6 L${merkez + kalcaYari} 70 Z`}
      />
      <Ellipse cx={merkez - omuzYari - 1} cy={48} rx={2.6} ry={12} />
      <Ellipse cx={merkez + omuzYari + 1} cy={48} rx={2.6} ry={12} />
    </G>
  );
}
