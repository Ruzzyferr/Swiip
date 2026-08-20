import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema, type Tema } from './tema';
import { useMetinler } from '../durum/Oturum';

/**
 * Temel arayüz bileşenleri.
 *
 * Erişilebilirlik burada zorlanır, ekranlarda unutulmasın diye:
 *  - Her dokunulabilir öğe en az 44 px.
 *  - Her butonun accessibilityRole ve etiketi var.
 *  - Sayısal veri tabular monospace ile hizalanır.
 */

// ---------------------------------------------------------------------------
// Metin
// ---------------------------------------------------------------------------

type MetinTuru = 'dev' | 'baslik1' | 'baslik2' | 'baslik3' | 'govde' | 'kucuk' | 'etiket';

interface BaslikProps {
  children: ReactNode;
  tur?: MetinTuru;
  renk?: 'metin' | 'metinYumusak' | 'metinSilik' | 'aksan' | 'tehlike' | 'uyari';
  hizala?: TextStyle['textAlign'];
  stil?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function Yazi({
  children,
  tur = 'govde',
  renk = 'metin',
  hizala,
  stil,
  numberOfLines,
}: BaslikProps) {
  const tema = useTema();
  const olcek = tema.tipografi.olcek[tur];
  const baslikMi = tur === 'dev' || tur.startsWith('baslik');

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: olcek.size,
          lineHeight: olcek.lineHeight,
          letterSpacing: olcek.letterSpacing,
          color: tema.renk[renk],
          fontWeight: baslikMi ? '600' : '400',
          ...(hizala ? { textAlign: hizala } : {}),
        },
        stil,
      ]}
    >
      {children}
    </Text>
  );
}

/** Sayısal veri: tabular hizalama hem okunurluk hem "ölçü aleti" hissi verir. */
export function Sayi({
  children,
  tur = 'govde',
  renk = 'metin',
  stil,
}: Omit<BaslikProps, 'hizala'>) {
  const tema = useTema();
  const olcek = tema.tipografi.olcek[tur];

  return (
    <Text
      style={[
        {
          fontSize: olcek.size,
          lineHeight: olcek.lineHeight,
          color: tema.renk[renk],
          fontVariant: ['tabular-nums'],
          fontWeight: '500',
        },
        stil,
      ]}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Düzen
// ---------------------------------------------------------------------------

/**
 * Ekran kabı — güvenli alanı bilen tek yer.
 *
 * `SafeAreaProvider` kökte takılıydı ama **hiçbir ekran kenar boşluklarını okumuyordu.**
 * Başlığı gizlenmiş ekranlarda (açılış, giriş, değerlendirme, güvenlik kapıları) içerik
 * durum çubuğunun altından başlıyor: emülatörde kapı ekranının başlığı saatin hizasına
 * geliyordu, çentikli bir telefonda çentiğin altında kalırdı.
 *
 * Kural her ekrana ayrı ayrı yazılmıyor; kap biliyor:
 *
 *  - **Başlık varsa** üst boşluğu react-navigation zaten veriyor; buradan eklemek çift
 *    boşluk yapardı. Varsayılan bu.
 *  - **Başlık yoksa** ekran `ustGuvenliAlan` vererek üst boşluğu buradan ister.
 *
 * Bunu bileşenin kendisinin anlamasını denedik: `HeaderHeightContext` okumak
 * `@react-navigation/elements`i doğrudan bağımlılık yapıyor ve expo-router'ın kullandığı
 * sürümle çakışıyor. Açık bir prop daha az sihirli — ve unutulmasın diye
 * `src/tasarim/guvenliAlan.test.ts` her başlıksız ekranın bunu yaptığını denetliyor.
 *
 * Alt kenar boşluğu her durumda ekleniyor: jest çubuğunun altında kalan içerik,
 * dokunulamayan içeriktir.
 */
export function Ekran({
  children,
  kaydirilabilir = true,
  altBoslugu = true,
  ustGuvenliAlan = false,
}: {
  children: ReactNode;
  kaydirilabilir?: boolean;
  altBoslugu?: boolean;
  /** Ekranın gezinme başlığı yoksa true: üst kenar boşluğunu bu kap verir. */
  ustGuvenliAlan?: boolean;
}) {
  const tema = useTema();
  const kenar = useSafeAreaInsets();
  const ustEk = ustGuvenliAlan ? kenar.top : 0;

  const icerik = (
    <View
      style={{
        padding: tema.bosluk.lg,
        paddingTop: tema.bosluk.lg + ustEk,
        paddingBottom: (altBoslugu ? tema.bosluk.xxxl : 0) + kenar.bottom,
        gap: tema.bosluk.lg,
      }}
    >
      {children}
    </View>
  );

  if (!kaydirilabilir) {
    return <View style={{ flex: 1, backgroundColor: tema.renk.zemin }}>{icerik}</View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tema.renk.zemin }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      {icerik}
    </ScrollView>
  );
}

export function Kart({
  children,
  vurgulu = false,
  stil,
}: {
  children: ReactNode;
  vurgulu?: boolean;
  stil?: StyleProp<ViewStyle>;
}) {
  const tema = useTema();
  return (
    <View
      style={[
        {
          backgroundColor: vurgulu ? tema.renk.aksanZemin : tema.renk.yuzey,
          borderRadius: tema.yaricap.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: vurgulu ? tema.renk.aksan : tema.renk.cizgi,
          padding: tema.bosluk.lg,
          gap: tema.bosluk.sm,
        },
        stil,
      ]}
    >
      {children}
    </View>
  );
}

export function Bosluk({ boyut = 'md' }: { boyut?: keyof Tema['bosluk'] }) {
  const tema = useTema();
  return <View style={{ height: tema.bosluk[boyut] }} />;
}

export function Ayirac() {
  const tema = useTema();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: tema.renk.cizgi }} />;
}

export function Satir({
  children,
  arasi = 'sm',
  hizala = 'center',
  dagit,
}: {
  children: ReactNode;
  arasi?: keyof Tema['bosluk'];
  hizala?: ViewStyle['alignItems'];
  dagit?: ViewStyle['justifyContent'];
}) {
  const tema = useTema();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: hizala,
        gap: tema.bosluk[arasi],
        ...(dagit ? { justifyContent: dagit } : {}),
      }}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Etkileşim
// ---------------------------------------------------------------------------

interface DugmeProps {
  baslik: string;
  onPress: () => void;
  tur?: 'birincil' | 'ikincil' | 'sessiz' | 'tehlike';
  pasif?: boolean;
  yukleniyor?: boolean;
  tamGenislik?: boolean;
  erisimIpucu?: string;
  /**
   * Ücretli katmanda olduğunu önceden söyler.
   *
   * Düğme çalışmaya devam ediyor — basınca ne olduğunu anlatan ekrana gidiyor. Amaç
   * baskı değil, dokunmadan önce ne olacağını bilmek: kilitli olduğu görünmeyen bir
   * düğme kullanıcıyı duvara çarptırıyordu.
   */
  kilitli?: boolean;
}

export function Dugme({
  baslik,
  onPress,
  tur = 'birincil',
  pasif = false,
  yukleniyor = false,
  tamGenislik = true,
  erisimIpucu,
  kilitli = false,
}: DugmeProps) {
  const tema = useTema();
  const kilitMetni = useMetinler().genel.temelPlandan;

  const zeminler: Record<string, string> = {
    birincil: tema.renk.aksan,
    ikincil: tema.renk.yuzeyIkincil,
    sessiz: 'transparent',
    tehlike: tema.renk.tehlikeZemin,
  };
  const metinler: Record<string, string> = {
    birincil: '#FFFFFF',
    ikincil: tema.renk.metin,
    sessiz: tema.renk.aksan,
    tehlike: tema.renk.tehlike,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={pasif || yukleniyor}
      accessibilityRole="button"
      accessibilityLabel={baslik}
      accessibilityHint={erisimIpucu}
      accessibilityState={{ disabled: pasif || yukleniyor, busy: yukleniyor }}
      style={({ pressed }) => ({
        minHeight: tema.dokunmaHedefi,
        paddingVertical: tema.bosluk.md,
        paddingHorizontal: tema.bosluk.xl,
        borderRadius: tema.yaricap.md,
        backgroundColor: zeminler[tur],
        borderWidth: tur === 'sessiz' ? 0 : StyleSheet.hairlineWidth,
        borderColor: tur === 'birincil' ? tema.renk.aksan : tema.renk.cizgi,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: tamGenislik ? 'stretch' : 'flex-start',
        opacity: pasif ? 0.45 : pressed ? 0.85 : 1,
      })}
    >
      {yukleniyor ? (
        <ActivityIndicator color={metinler[tur]} />
      ) : (
        <>
          <Text style={{ color: metinler[tur], fontSize: 16, fontWeight: '600' }}>{baslik}</Text>
          {kilitli ? (
            <Text
              style={{
                color: tema.renk.metinSilik,
                fontSize: 11,
                letterSpacing: 0.3,
                marginTop: 2,
              }}
            >
              {kilitMetni}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

export function SecimDugmesi({
  baslik,
  aciklama,
  secili,
  onPress,
  cokluSecim = false,
}: {
  baslik: string;
  aciklama?: string;
  secili: boolean;
  onPress: () => void;
  cokluSecim?: boolean;
}) {
  const tema = useTema();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={cokluSecim ? 'checkbox' : 'radio'}
      accessibilityLabel={baslik}
      accessibilityState={{ checked: secili }}
      style={({ pressed }) => ({
        minHeight: tema.dokunmaHedefi + 6,
        paddingVertical: tema.bosluk.md,
        paddingHorizontal: tema.bosluk.lg,
        borderRadius: tema.yaricap.md,
        borderWidth: secili ? 2 : StyleSheet.hairlineWidth,
        borderColor: secili ? tema.renk.aksan : tema.renk.cizgi,
        backgroundColor: secili ? tema.renk.aksanZemin : tema.renk.yuzey,
        opacity: pressed ? 0.9 : 1,
        gap: 2,
        justifyContent: 'center',
      })}
    >
      <Text
        style={{
          color: tema.renk.metin,
          fontSize: 16,
          fontWeight: secili ? '600' : '400',
        }}
      >
        {baslik}
      </Text>
      {aciklama ? (
        <Text style={{ color: tema.renk.metinSilik, fontSize: 13 }}>{aciklama}</Text>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Bilgi kutuları
// ---------------------------------------------------------------------------

export function Uyari({
  baslik,
  govde,
  tur = 'bilgi',
}: {
  baslik?: string;
  govde: string;
  tur?: 'bilgi' | 'uyari' | 'tehlike';
}) {
  const tema = useTema();
  const zemin = {
    bilgi: tema.renk.aksanZemin,
    uyari: tema.renk.uyariZemin,
    tehlike: tema.renk.tehlikeZemin,
  }[tur];
  const kenar = { bilgi: tema.renk.aksan, uyari: tema.renk.uyari, tehlike: tema.renk.tehlike }[tur];

  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: zemin,
        borderLeftWidth: 3,
        borderLeftColor: kenar,
        borderRadius: tema.yaricap.sm,
        padding: tema.bosluk.lg,
        gap: tema.bosluk.xs,
      }}
    >
      {baslik ? (
        <Text style={{ color: tema.renk.metin, fontWeight: '600', fontSize: 15 }}>{baslik}</Text>
      ) : null}
      <Text style={{ color: tema.renk.metinYumusak, fontSize: 14, lineHeight: 20 }}>{govde}</Text>
    </View>
  );
}

/** İlerleme çubuğu. Yüzde yalnızca metin olarak da okunur — ekran okuyucu için. */
export function IlerlemeCubugu({ yuzde, etiket }: { yuzde: number; etiket?: string }) {
  const metinler = useMetinler();
  const tema = useTema();
  const guvenli = Math.max(0, Math.min(100, yuzde));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: guvenli }}
      accessibilityLabel={etiket ?? metinler.genel.yuzdeTamamlandi(guvenli)}
      style={{ gap: tema.bosluk.xs }}
    >
      <View
        style={{
          height: 6,
          borderRadius: tema.yaricap.tam,
          backgroundColor: tema.renk.yuzeyIkincil,
          overflow: 'hidden',
        }}
      >
        <View style={{ width: `${guvenli}%`, height: '100%', backgroundColor: tema.renk.aksan }} />
      </View>
      {etiket ? <Text style={{ color: tema.renk.metinSilik, fontSize: 12 }}>{etiket}</Text> : null}
    </View>
  );
}

export function Etiket({
  metin,
  tur = 'notr',
}: {
  metin: string;
  tur?: 'notr' | 'aksan' | 'uyari';
}) {
  const tema = useTema();
  const zemin = {
    notr: tema.renk.yuzeyIkincil,
    aksan: tema.renk.aksanZemin,
    uyari: tema.renk.uyariZemin,
  }[tur];
  const renk = { notr: tema.renk.metinSilik, aksan: tema.renk.aksan, uyari: tema.renk.uyari }[tur];

  return (
    <View
      style={{
        backgroundColor: zemin,
        paddingHorizontal: tema.bosluk.sm,
        paddingVertical: 3,
        borderRadius: tema.yaricap.sm,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: renk, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 }}>
        {metin}
      </Text>
    </View>
  );
}

export function Yukleniyor({ metin }: { metin?: string }) {
  const metinler = useMetinler();
  const tema = useTema();
  return (
    <View style={{ padding: tema.bosluk.xxl, alignItems: 'center', gap: tema.bosluk.md }}>
      <ActivityIndicator color={tema.renk.aksan} />
      <Text style={{ color: tema.renk.metinSilik, fontSize: 14 }}>
        {metin ?? metinler.genel.yukleniyor}
      </Text>
    </View>
  );
}

export function BosDurum({ baslik, govde }: { baslik: string; govde: string }) {
  const tema = useTema();
  return (
    <View style={{ padding: tema.bosluk.xxl, gap: tema.bosluk.sm, alignItems: 'center' }}>
      <Text
        style={{ color: tema.renk.metin, fontSize: 17, fontWeight: '600', textAlign: 'center' }}
      >
        {baslik}
      </Text>
      <Text
        style={{ color: tema.renk.metinSilik, fontSize: 14, textAlign: 'center', lineHeight: 20 }}
      >
        {govde}
      </Text>
    </View>
  );
}
