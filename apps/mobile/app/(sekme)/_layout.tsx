import { Tabs } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '../../src/tasarim/tema';
import { useMetinler } from '../../src/durum/Oturum';

export default function SekmeDuzeni() {
  const tema = useTema();
  const m = useMetinler().sekmeler;
  const guvenli = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: tema.renk.zemin },
        headerTintColor: tema.renk.metin,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
        tabBarActiveTintColor: tema.renk.aksan,
        tabBarInactiveTintColor: tema.renk.metinSilik,
        /**
         * Yükseklik BİLEREK verilmiyor.
         *
         * `height: 64` ve `paddingBottom: 8` sabitti. React Navigation çubuğu
         * `varsayılan + insets.bottom` olarak hesaplıyor; ikisini de elle yazmak hem bu
         * hesabı hem de ev göstergesi için ayrılan payı çöpe atıyordu. Çentikli
         * telefonda gösterge şeridi 64 pikselin içinden yiyor, etikete yer kalmıyordu:
         * "Program", "Beslenme", "Koç", "İlerleme", "Ayarlar" — beşi de x-yüksekliğinin
         * ortasından kırpılıyordu, "Koç" çengelini tamamen kaybediyordu.
         *
         * Ölçüldü: etiket kutusu 11 px yazı ve 14 px satır yüksekliği için 5 px
         * kalıyordu. Sabit yükseklik verildiğinde kütüphane çubuğu büyütmüyor, etiketi
         * eziyor. Hesabı kütüphaneye bırakmak doğru çözüm; `guvenli.bottom` yalnızca
         * alt dolgunun tabanı olarak kullanılıyor.
         */
        tabBarStyle: {
          backgroundColor: tema.renk.yuzey,
          borderTopColor: tema.renk.cizgi,
          /**
           * Yükseklik = içerik + alt güvenli alan.
           *
           * Eskiden `height: 64` ve `paddingBottom: 8` sabitti ve güvenli alan payı bu
           * 64'ün İÇİNDEYDİ. Çentikli telefonda ev göstergesi şeridi (34 px) oradan
           * yeniyor, simge ve etikete 30 px kalıyordu: "Program", "Beslenme", "Koç",
           * "İlerleme", "Ayarlar" — beşi de x-yüksekliğinin ortasından kırpılıyordu ve
           * dokunulabilir yükseklik 44'ün altına düşüyordu. Uygulamanın kalıcı kroması
           * olduğu için kusur beş ekranda birden görünüyordu.
           *
           * Şimdi pay yüksekliğe EKLENİYOR: 44 px'lik içerik alanı simge (24) ve etiket
           * (11/14) için her cihazda sabit kalıyor.
           *
           * Not: tarayıcı önizlemesinde `insets.bottom` her zaman 0 ve
           * `@react-navigation/bottom-tabs`'ın web düzeni farklı davranıyor; bu satırın
           * doğrulaması gerçek cihazda yapılmalı.
           */
          height: 60 + guvenli.bottom,
          paddingTop: 8,
          paddingBottom: guvenli.bottom + 8,
        },
        // `includeFontPadding: false` olmadan Android'de etiketin altı ayrıca kırpılıyor.
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          lineHeight: 14,
          includeFontPadding: false,
        },
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
