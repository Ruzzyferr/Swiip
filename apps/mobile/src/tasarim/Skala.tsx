import { View } from 'react-native';
import { Sayi, Yazi } from './bilesenler';
import { useTema } from './tema';

/**
 * Skala okuması — kumpas.
 *
 * Yağ oranı düz metin olarak yazılıyordu: "%20-28". Ürünün en çok "ölçüm" olan çıktısı,
 * bir cümlenin içinde kaybolmuş bir dize hâlindeydi. Oysa bu bir ARALIK: nerede
 * başladığı, nerede bittiği ve ölçeğin neresinde durduğu bilgi taşıyor.
 *
 * Taksimat motifinin ikinci ve son yeri burası. Kural: motif yalnızca kullanıcının bir
 * değer girdiği ya da bir ölçüm sonucunu okuduğu yerde kullanılır — navigasyonda,
 * kart kenarlarında, düz metin altında değil. Ve ekran başına tek ölçek: ikincisi
 * konduğunda arayüz kumpas değil, bozuk bir ses mikseri gibi görünür.
 */

export interface SkalaProps {
  /** Ölçeğin iki ucu. */
  alt: number;
  ust: number;
  /** İşaretlenecek aralık. Tek değer için ikisi de aynı verilir. */
  isaretAlt: number;
  isaretUst: number;
  birim?: string;
  /** Ölçeğin altında duran açıklama; okumanın ne olduğunu söyler. */
  etiket?: string;
}

const YUKSEK = 26;

export function Skala({ alt, ust, isaretAlt, isaretUst, birim = '', etiket }: SkalaProps) {
  const tema = useTema();
  const aralik = ust - alt || 1;
  const oran = (deger: number) => Math.max(0, Math.min(1, (deger - alt) / aralik));

  const sol = oran(isaretAlt);
  const sag = oran(isaretUst);
  const genislik = Math.max(0.01, sag - sol);

  /**
   * Çentikler ölçeğin kendisi.
   *
   * On bir çentik: iki uç ve arada dokuz bölme. Sayı buradan yükselirse çentikler
   * birbirine girip gri bir şeride dönüşüyor ve ölçek olmaktan çıkıyor.
   */
  const centikler = Array.from({ length: 11 }, (_, i) => i / 10);

  return (
    <View style={{ gap: tema.bosluk.xs }}>
      <View style={{ height: YUKSEK, justifyContent: 'flex-end' }}>
        {/* İşaretli aralık: kumpasın durduğu yer. */}
        <View
          style={{
            position: 'absolute',
            left: `${sol * 100}%`,
            width: `${genislik * 100}%`,
            bottom: 0,
            height: YUKSEK,
            borderLeftWidth: 2,
            borderRightWidth: 2,
            borderColor: tema.renk.aksan,
            borderBottomWidth: 2,
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 10 }}>
          {centikler.map((yer) => {
            const icinde = yer >= sol && yer <= sag;
            return (
              <View key={yer} style={{ flex: 1, alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 1,
                    height: yer === 0 || yer === 1 ? 10 : 6,
                    backgroundColor: icinde ? tema.renk.aksan : tema.renk.celikSilik,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Sayi tur="etiket" renk="metinSilik">
          {alt}
          {birim}
        </Sayi>
        <Sayi tur="etiket" renk="aksan">
          {isaretAlt}
          {isaretAlt === isaretUst ? '' : `-${isaretUst}`}
          {birim}
        </Sayi>
        <Sayi tur="etiket" renk="metinSilik">
          {ust}
          {birim}
        </Sayi>
      </View>

      {etiket ? (
        <Yazi tur="etiket" renk="metinSilik">
          {etiket}
        </Yazi>
      ) : null}
    </View>
  );
}
