import { Tabs } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTema } from '../../src/tasarim/tema';
import { useMetinler } from '../../src/durum/Oturum';

export default function SekmeDuzeni() {
  const tema = useTema();
  const m = useMetinler().sekmeler;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: tema.renk.zemin },
        headerTintColor: tema.renk.metin,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
        tabBarActiveTintColor: tema.renk.aksan,
        tabBarInactiveTintColor: tema.renk.metinSilik,
        tabBarStyle: {
          backgroundColor: tema.renk.yuzey,
          borderTopColor: tema.renk.cizgi,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        sceneStyle: { backgroundColor: tema.renk.zemin },
      }}
    >
      <Tabs.Screen
        name="program"
        options={{
          title: m.program,
          tabBarIcon: ({ color }) => <ProgramSimgesi renk={color} />,
        }}
      />
      <Tabs.Screen
        name="beslenme"
        options={{
          title: m.beslenme,
          tabBarIcon: ({ color }) => <BeslenmeSimgesi renk={color} />,
        }}
      />
      <Tabs.Screen
        name="koc"
        options={{
          title: m.koc,
          tabBarIcon: ({ color }) => <KocSimgesi renk={color} />,
        }}
      />
      <Tabs.Screen
        name="ilerleme"
        options={{
          title: m.ilerleme,
          tabBarIcon: ({ color }) => <IlerlemeSimgesi renk={color} />,
        }}
      />
      <Tabs.Screen
        name="ayarlar"
        options={{
          title: m.ayarlar,
          tabBarIcon: ({ color }) => <AyarSimgesi renk={color} />,
        }}
      />
    </Tabs>
  );
}

function ProgramSimgesi({ renk }: { renk: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={renk} strokeWidth={1.8}>
      <Rect x={3} y={9} width={3} height={6} rx={1} />
      <Rect x={18} y={9} width={3} height={6} rx={1} />
      <Path d="M6 12h12" />
    </Svg>
  );
}

/**
 * Beslenme: mutfak terazisi.
 *
 * Önce üstünde sap olan bir daireydi ve kronometre okunuyordu — yemekle hiçbir bağı
 * yoktu. Terazi hem yiyeceği hem ürünün fikrini taşıyor: burada da ölçülüyor.
 */
function BeslenmeSimgesi({ renk }: { renk: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={renk} strokeWidth={1.8}>
      {/* Tabla */}
      <Path d="M4 8h16" strokeLinecap="round" />
      {/* Gövde ve kadran */}
      <Path d="M6 8v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8" />
      <Path d="M9 13h6" strokeLinecap="round" />
      {/* Tablanın üstündeki ölçülen şey */}
      <Path d="M10 8c0-1.6.9-2.5 2-2.5s2 .9 2 2.5" />
    </Svg>
  );
}

function IlerlemeSimgesi({ renk }: { renk: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={renk} strokeWidth={1.8}>
      <Path d="M4 18V9M10 18V5M16 18v-6M22 18H2" />
    </Svg>
  );
}

function KocSimgesi({ renk }: { renk: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={renk} strokeWidth={1.8}>
      <Path d="M4 5h16v11H8l-4 4V5Z" />
    </Svg>
  );
}

/**
 * Ayarlar: kalibrasyon sürgüleri.
 *
 * Önce sekiz ışınlı bir güneş/dişli karışımıydı ve "parlaklık" okunuyordu. Sürgü hem
 * ayarı doğrudan anlatıyor hem de kalibre edilen bir aletin diliyle konuşuyor.
 */
function AyarSimgesi({ renk }: { renk: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={renk} strokeWidth={1.8}>
      <Path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
      <Circle cx={9} cy={7} r={2} fill="none" />
      <Circle cx={15} cy={12} r={2} fill="none" />
      <Circle cx={8} cy={17} r={2} fill="none" />
    </Svg>
  );
}
