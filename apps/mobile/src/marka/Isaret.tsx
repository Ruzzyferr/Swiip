import Svg, { G, Line, Mask, Path, Rect } from 'react-native-svg';

/**
 * Marka işareti — ÜRETİLMİŞ DOSYA, elle düzenleme.
 * Kaynak: scripts/marka-uret.mjs · yeniden üretmek için: npm run marka
 *
 * İşaretin kendisi bir ölçü aleti: S, teğet noktasında birleşen iki yaydan kuruluyor
 * ve üst yayın dış kenarında açıölçer taksimatı var.
 */
export function Isaret({ renk, boyut = 72 }: { renk: string; boyut?: number }) {
  return (
    <Svg width={boyut} height={boyut} viewBox="0 0 100 100">
      <Mask id="swiipMark" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
        <Rect x="0" y="0" width="100" height="100" fill="white" />
        <G stroke="black" strokeLinecap="butt">
          <Line x1={63.86} y1={26} x2={69.75} y2={22.6} strokeWidth={1.9} />
          <Line x1={63.15} y1={20.85} x2={66.12} y2={17.88} strokeWidth={1.4} />
          <Line x1={59.3} y1={17.89} x2={61.4} y2={14.25} strokeWidth={1.4} />
          <Line x1={54.14} y1={18.55} x2={55.9} y2={11.98} strokeWidth={1.9} />
          <Line x1={50} y1={15.4} x2={50} y2={11.2} strokeWidth={1.4} />
          <Line x1={45.19} y1={16.03} x2={44.1} y2={11.98} strokeWidth={1.4} />
          <Line x1={42} y1={20.14} x2={38.6} y2={14.25} strokeWidth={1.9} />
          <Line x1={36.85} y1={20.85} x2={33.88} y2={17.88} strokeWidth={1.4} />
          <Line x1={33.89} y1={24.7} x2={30.25} y2={22.6} strokeWidth={1.4} />
          <Line x1={34.55} y1={29.86} x2={27.98} y2={28.1} strokeWidth={1.9} />
          <Line x1={31.4} y1={34} x2={27.2} y2={34} strokeWidth={1.4} />
          <Line x1={32.03} y1={38.81} x2={27.98} y2={39.9} strokeWidth={1.4} />
        </G>
      </Mask>
      <G mask="url(#swiipMark)" fill="none" stroke={renk} strokeWidth={12} strokeLinecap="butt">
        <Path d="M 65.04 28.53 A 16 16 0 1 0 50 50 A 16 16 0 1 1 34.96 71.47" />
      </G>
    </Svg>
  );
}
