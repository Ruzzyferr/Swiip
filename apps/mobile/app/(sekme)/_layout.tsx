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

function BeslenmeSimgesi({ renk }: { renk: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={renk} strokeWidth={1.8}>
      <Circle cx={12} cy={13} r={7} />
      <Path d="M12 6V3M9 4l3-1 3 1" />
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

function AyarSimgesi({ renk }: { renk: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={renk} strokeWidth={1.8}>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </Svg>
  );
}
