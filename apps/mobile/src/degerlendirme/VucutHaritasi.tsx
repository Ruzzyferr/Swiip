import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { Soru } from '@made2fit/shared';
import { Satir, Yazi } from '../tasarim/bilesenler';
import { useTema } from '../tasarim/tema';
import { useMetinler } from '../durum/Oturum';

/**
 * Vücut haritası (F2.3).
 *
 * Ön ve arka görünüm; bölgeye dokunarak işaretleme. İşaretlenen her bölge motorda
 * S9-S13 soru setini tetikler, bu yüzden bölge kodları `sorular.json` ile birebir aynı.
 *
 * Erişilebilirlik: harita dokunmatik, ama her bölge ayrıca listeden de seçilebilir —
 * ekran okuyucu kullanan biri SVG'ye dokunmak zorunda kalmasın.
 */

interface Bolge {
  kod: string;
  taraf: 'on' | 'arka' | 'ikisi';
  /** SVG içindeki dokunma alanı (cx, cy, r) — basit ve hatasız hedefleme için daire. */
  x: number;
  y: number;
  r: number;
}

const BOLGELER: Bolge[] = [
  { kod: 'boyun', taraf: 'ikisi', x: 60, y: 34, r: 9 },
  { kod: 'omuz_sag', taraf: 'ikisi', x: 38, y: 52, r: 11 },
  { kod: 'omuz_sol', taraf: 'ikisi', x: 82, y: 52, r: 11 },
  { kod: 'dirsek_sag', taraf: 'ikisi', x: 27, y: 92, r: 9 },
  { kod: 'dirsek_sol', taraf: 'ikisi', x: 93, y: 92, r: 9 },
  { kod: 'bilek_sag', taraf: 'ikisi', x: 21, y: 124, r: 8 },
  { kod: 'bilek_sol', taraf: 'ikisi', x: 99, y: 124, r: 8 },
  { kod: 'ust_sirt', taraf: 'arka', x: 60, y: 66, r: 13 },
  { kod: 'bel', taraf: 'ikisi', x: 60, y: 104, r: 12 },
  { kod: 'kalca_sag', taraf: 'ikisi', x: 48, y: 132, r: 11 },
  { kod: 'kalca_sol', taraf: 'ikisi', x: 72, y: 132, r: 11 },
  { kod: 'diz_sag', taraf: 'ikisi', x: 48, y: 192, r: 10 },
  { kod: 'diz_sol', taraf: 'ikisi', x: 72, y: 192, r: 10 },
  { kod: 'ayak_bilegi_sag', taraf: 'ikisi', x: 48, y: 244, r: 9 },
  { kod: 'ayak_bilegi_sol', taraf: 'ikisi', x: 72, y: 244, r: 9 },
];

/** H6/H7 gibi gelişim bölgeleri farklı bir kod kümesi kullanır. */
const GELISIM_BOLGELERI: Array<{ kod: string; x: number; y: number; r: number }> = [
  { kod: 'gogus', x: 60, y: 68, r: 14 },
  { kod: 'omuz', x: 36, y: 52, r: 11 },
  { kod: 'sirt', x: 84, y: 52, r: 11 },
  { kod: 'kol', x: 24, y: 96, r: 11 },
  { kod: 'karin', x: 60, y: 100, r: 13 },
  { kod: 'kalca', x: 60, y: 134, r: 13 },
  { kod: 'bacak_on', x: 48, y: 176, r: 12 },
  { kod: 'bacak_arka', x: 72, y: 176, r: 12 },
  { kod: 'baldir', x: 60, y: 228, r: 11 },
];

export interface VucutHaritasiProps {
  soru: Soru;
  deger: unknown;
  onDegisim: (deger: unknown) => void;
}

export function VucutHaritasi({ soru, deger, onDegisim }: VucutHaritasiProps) {
  const tema = useTema();
  const m = useMetinler().degerlendirme;
  const bolgeAdi = (kod: string) => m.bolgeAdlari[kod as keyof typeof m.bolgeAdlari] ?? kod;
  const [taraf, setTaraf] = useState<'on' | 'arka'>('on');

  const secili = Array.isArray(deger) ? (deger as string[]) : [];
  const gelisimHaritasi = (soru.regions ?? []).includes('gogus');
  const bolgeler = gelisimHaritasi
    ? GELISIM_BOLGELERI.map((b) => ({ ...b, taraf: 'ikisi' as const }))
    : BOLGELER.filter((b) => soru.regions?.includes(b.kod) ?? true);

  const gorunur = bolgeler.filter((b) => b.taraf === 'ikisi' || b.taraf === taraf);

  const degistir = (kod: string) => {
    if (secili.includes(kod)) {
      onDegisim(secili.filter((s) => s !== kod));
      return;
    }
    if (soru.maxSelect !== undefined && secili.length >= soru.maxSelect) {
      // Sınır dolduysa en eski seçim düşer; kullanıcı takılıp kalmasın.
      onDegisim([...secili.slice(1), kod]);
      return;
    }
    onDegisim([...secili, kod]);
  };

  return (
    <View style={{ gap: tema.bosluk.md }}>
      {!gelisimHaritasi ? (
        <Satir arasi="sm">
          {(['on', 'arka'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTaraf(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: taraf === t }}
              style={{
                flex: 1,
                minHeight: tema.dokunmaHedefi,
                borderRadius: tema.yaricap.md,
                backgroundColor: taraf === t ? tema.renk.aksanZemin : tema.renk.yuzey,
                borderWidth: taraf === t ? 2 : 1,
                borderColor: taraf === t ? tema.renk.aksan : tema.renk.cizgi,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Yazi renk={taraf === t ? 'aksan' : 'metinYumusak'}>
                {t === 'on' ? m.onden : m.arkadan}
              </Yazi>
            </Pressable>
          ))}
        </Satir>
      ) : null}

      <View style={{ alignItems: 'center' }}>
        <Svg width={240} height={540} viewBox="0 0 120 270">
          <Silüet renk={tema.renk.yuzeyIkincil} cizgi={tema.renk.cizgi} />
          <G>
            {gorunur.map((bolge) => {
              const isaretli = secili.includes(bolge.kod);
              return (
                <Circle
                  key={bolge.kod}
                  cx={bolge.x}
                  cy={bolge.y}
                  r={bolge.r}
                  fill={isaretli ? tema.renk.aksan : 'transparent'}
                  fillOpacity={isaretli ? 0.75 : 0}
                  stroke={isaretli ? tema.renk.aksan : tema.renk.metinSilik}
                  strokeWidth={isaretli ? 2 : 1}
                  strokeDasharray={isaretli ? undefined : '2 3'}
                  onPress={() => degistir(bolge.kod)}
                />
              );
            })}
          </G>
        </Svg>
      </View>

      {/* Erişilebilir liste: ekran okuyucu ve motor beceri kısıtı olan kullanıcı için. */}
      <View style={{ gap: tema.bosluk.xs }}>
        <Yazi tur="etiket" renk="metinSilik">
          {m.listedenSec}
        </Yazi>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.bosluk.sm }}>
          {bolgeler.map((bolge) => {
            const isaretli = secili.includes(bolge.kod);
            return (
              <Pressable
                key={bolge.kod}
                onPress={() => degistir(bolge.kod)}
                accessibilityRole="checkbox"
                accessibilityLabel={bolgeAdi(bolge.kod)}
                accessibilityState={{ checked: isaretli }}
                style={{
                  minHeight: tema.dokunmaHedefi,
                  justifyContent: 'center',
                  paddingHorizontal: tema.bosluk.lg,
                  borderRadius: tema.yaricap.tam,
                  borderWidth: isaretli ? 2 : 1,
                  borderColor: isaretli ? tema.renk.aksan : tema.renk.cizgi,
                  backgroundColor: isaretli ? tema.renk.aksanZemin : tema.renk.yuzey,
                }}
              >
                <Yazi tur="kucuk" renk={isaretli ? 'aksan' : 'metinYumusak'}>
                  {bolgeAdi(bolge.kod)}
                </Yazi>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/** Nötr, cinsiyetsiz silüet. Vücut tipi yargısı taşımaz. */
function Silüet({ renk, cizgi }: { renk: string; cizgi: string }) {
  return (
    <G stroke={cizgi} strokeWidth={0.8} fill={renk}>
      <Circle cx={60} cy={18} r={12} />
      <Rect x={55} y={28} width={10} height={10} rx={3} />
      <Path d="M60 38 C42 38 34 46 34 60 L34 112 C34 118 38 120 42 118 L44 96 L46 130 L74 130 L76 96 L78 118 C82 120 86 118 86 112 L86 60 C86 46 78 38 60 38 Z" />
      <Path d="M44 130 L46 200 L44 250 L56 250 L58 200 L60 150 L62 200 L64 250 L76 250 L74 200 L76 130 Z" />
      <Ellipse cx={50} cy={256} rx={8} ry={5} />
      <Ellipse cx={70} cy={256} rx={8} ry={5} />
    </G>
  );
}
