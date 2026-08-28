import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  PixelRatio,
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
import { gorselOrani } from './gorselOrani';
import { paraParcalari } from './para';
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

/**
 * Sistem yazı tipi ölçeği.
 *
 * `fontSize` işletim sistemi tarafından ölçekleniyor ama `lineHeight` sabit dp olarak
 * kalıyor. %200 büyütmede `dev` 34 px'lik yazıyı 40 px'lik satıra sığdırmaya çalışıyor:
 * başlıklar üst satıra biniyor ve alt uzantıları kırpılıyor. Satır yüksekliği de aynı
 * oranda büyümeli.
 *
 * Üst sınır 1.6: bunun ötesinde satır yüksekliği ekranı tek başlığa çeviriyor ve
 * `fontSize` zaten büyümeye devam ettiği için okunabilirlik kaybolmuyor.
 */
function yaziOlcegi(): number {
  return Math.min(PixelRatio.getFontScale(), 1.6);
}

/**
 * "Bir satırın içindeyim" bilgisi.
 *
 * React Native'de bir `<Text>` yatay bir kabın içinde varsayılan olarak DARALMIYOR
 * (`flexShrink: 0`): sığmayınca sarmak yerine kabı taşırıyor ve kırpılıyor. Bu, bu
 * depoda somut bir kusur olarak görüldü — "Nasıl çalışır" kartında süre etiketi
 * 320 dp genişlikte "15 saniy" diye kesiliyordu.
 *
 * `Satir` sarıyor, yani hiçbir şey artık kırpılmıyor. Ama sarma METNİ değil ÖĞEYİ
 * alt satıra indiriyor: başlık, yanındaki numara dairesinden kopup altına düşüyor.
 * Doğrusu metnin kendi içinde sarması.
 *
 * Bu yüzden daralma bir bağlamla veriliyor: `Yazi` yalnızca bir `Satir` içindeyken
 * `flexShrink: 1` alıyor. Her yerde açmak istemedik — yüksekliği sabit bir dikey
 * kapta daralan metin bu kez dikeyde kırpılırdı.
 */
const SatirIcinde = createContext(false);

export function Yazi({
  children,
  tur = 'govde',
  renk = 'metin',
  hizala,
  stil,
  numberOfLines,
}: BaslikProps) {
  const tema = useTema();
  const satirda = useContext(SatirIcinde);
  const olcek = tema.tipografi.olcek[tur];
  const baslikMi = tur === 'dev' || tur.startsWith('baslik');

  return (
    <Text
      numberOfLines={numberOfLines}
      /*
        Başlıklar ekran okuyucuda BAŞLIK olarak duyuruluyor.
        Depoda tek bir `accessibilityRole="header"` yoktu: görsel hiyerarşi vardı ama
        rotor boştu, yani uzun ekranlarda (karar izi, paywall, rapor) ekran okuyucu
        kullanıcısı her şeyi tek tek geçmek zorundaydı.
      */
      accessibilityRole={baslikMi ? 'header' : undefined}
      style={[
        {
          fontSize: olcek.size,
          lineHeight: olcek.lineHeight * yaziOlcegi(),
          letterSpacing: olcek.letterSpacing,
          color: tema.renk[renk],
          /**
           * `fontFamily` uzun süre HİÇ yazılmıyordu.
           *
           * `tokens.ts` Inter ve JetBrains Mono adlarını taşıyordu ama ne paketler
           * kuruluydu ne de bir yükleme çağrısı vardı; uygulamanın tamamı Android
           * sistem fontuyla çalışıyordu. `fontWeight` ile taklit edilen kalınlık,
           * gerçek bir grotesk kesim değildi.
           */
          fontFamily: baslikMi ? tema.tipografi.aileler.baslik : tema.tipografi.aileler.govde,
          // Satır içindeyken metin sarsın; satırı taşırıp kırpılmasın.
          ...(satirda ? { flexShrink: 1 } : {}),
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
/**
 * Para tutarı — sembol ARAYÜZ fontunda, rakamlar monospace'te.
 *
 * `JetBrainsMono_500Medium` U+20BA (₺) glifini İÇERMİYOR. Fontun `cmap` tablosu
 * okunarak doğrulandı: 976 kod noktası var, ₺ yok; `Inter` içinde var. Eksik glif
 * sessizce sistem yedeğine düşüyor ve ₺ paywall'da serif bir harf gibi, farklı kalınlıkta,
 * rakama yapışık çıkıyordu — "₺99" yerine "Ł99" okunuyordu.
 *
 * Türkiye önce bir üründe ödeme ekranının en büyük puntosu bu. Sayısal fontu değiştirmek
 * (IBM Plex Mono, Roboto Mono) tek satırlık bir çözüm ama uygulamadaki HER sayının
 * görünüşünü değiştirirdi; tabular hizalama iddiası JetBrains Mono ile kurulmuş.
 * Onun yerine yalnızca sembol arayüz fontunda basılıyor: rakamlar monospace kalıyor,
 * hizalama bozulmuyor, sembol doğru çiziliyor.
 *
 * Ayırma biçime bağlı değil: `Intl` para birimini başa da (`₺99`) sona da (`99 TL`)
 * koyabiliyor, dile göre değişiyor. O yüzden rakam/ayraç olmayan her şey sembol sayılıyor.
 */
export function Para({
  children,
  tur = 'govde',
  renk = 'metin',
}: {
  children: string;
  tur?: BaslikProps['tur'];
  renk?: BaslikProps['renk'];
}) {
  const tema = useTema();
  const olcek = tema.tipografi.olcek[tur ?? 'govde'];

  const parcalar = paraParcalari(children);

  return (
    <Text
      style={{
        fontSize: olcek.size,
        lineHeight: olcek.lineHeight * yaziOlcegi(),
        color: tema.renk[renk ?? 'metin'],
      }}
    >
      {parcalar.map((parca, i) => (
        <Text
          key={i}
          style={{
            fontFamily: parca.sayisal
              ? tema.tipografi.aileler.sayisal
              : tema.tipografi.aileler.baslik,
            ...(parca.sayisal ? { fontVariant: ['tabular-nums' as const] } : {}),
          }}
        >
          {parca.metin}
        </Text>
      ))}
    </Text>
  );
}

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
          // Satır yüksekliği de sistem ölçeğiyle büyümeli; gerekçe `yaziOlcegi`'nde.
          lineHeight: olcek.lineHeight * yaziOlcegi(),
          color: tema.renk[renk],
          /**
           * Sayısal veri monospace.
           *
           * `fontVariant: ['tabular-nums']` yazılıydı ama fontFamily olmadığı için
           * hiçbir şey yapmıyordu: Roboto'nun orantılı rakamlarında "1" ile "8" farklı
           * genişlikte ve sayı sütunu satırdan satıra titriyordu. Ürünün "ölçü aleti"
           * iddiasını taşıyan tek görsel ayrıntı buydu ve hiç var olmamıştı.
           */
          fontFamily: tema.tipografi.aileler.sayisal,
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
 * Okuma sütununun üst sınırı (pt).
 *
 * Satır uzunluğu okunabilirliğin ölçüsü: 45-75 karakter aralığının üstünde göz
 * satır başını kaybediyor. Gövde metnimizin genişliğinde 560 pt yaklaşık 70
 * karaktere denk geliyor.
 *
 * Dikeydeki en geniş iPhone 430 pt — yani telefonda bu sınır hiçbir zaman
 * devreye girmiyor. Yalnızca geniş tuvalde (iPad, yatay, bölünmüş ekran)
 * iş görüyor ve orada da bir şey daraltmıyor: yayılmayı durduruyor.
 */
export const OKUMA_GENISLIGI = 560;

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
 *
 * **Kap HER ZAMAN kaydırır — kapatma yolu yok.** Önce `kaydirilabilir={false}` vardı
 * ve kullanıldığı iki yerin ikisi de kusurluydu. Apple 2026-08-28'de Guideline 4 ile
 * reddetti: iPad'in iPhone uyumluluk penceresi uygulamaya **375x667 pt** veriyor,
 * karşılama ekranı o yüksekliğe sığmayınca iki düğme de ekranın dışında kalıyordu.
 * Aynı sınıf büyük yazı tipinde ve iPhone SE'de de çıkar; tek tuvalı düzeltmek
 * yetmez, kabın kendisi kırpamaz olmalı.
 *
 * Üç garanti veriyor:
 *
 *  - **`flexGrow: 1`** — yer varken içerik kabı tuvali dolduruyor, yani içindeki
 *    `flex: 1` ayırıcı çalışıyor ve alt düğmeler dibe yaslı duruyor. Yer yokken
 *    kap büyüyor ve **kaydırılıyor**. İkisinin arası — kırpma — mümkün değil.
 *  - **`ortala`** — dikey ortalama isteyen ekranlar için. Dışına
 *    `justifyContent: 'center'` bir `View` sarmak aynı şey değil: o, içerik
 *    taştığında kaydırmıyor.
 *  - **`OKUMA_GENISLIGI`** — geniş tuvalde (yatay telefon, iPad, bölünmüş ekran)
 *    satırlar ekran boyunca uzamasın. Hiçbir telefon dikeyde 430 pt'yi geçmiyor,
 *    yani küçük tuvalde bu sınır hiç devreye girmiyor.
 */
export function Ekran({
  children,
  altBoslugu = true,
  ustGuvenliAlan = false,
  ortala = false,
}: {
  children: ReactNode;
  altBoslugu?: boolean;
  /** Ekranın gezinme başlığı yoksa true: üst kenar boşluğunu bu kap verir. */
  ustGuvenliAlan?: boolean;
  /** Yer varken içeriği dikeyde ortalar; yer yokken normal kaydırmaya döner. */
  ortala?: boolean;
}) {
  const tema = useTema();
  const kenar = useSafeAreaInsets();
  const ustEk = ustGuvenliAlan ? kenar.top : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tema.renk.zemin }}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: 'center',
        padding: tema.bosluk.lg,
        paddingTop: tema.bosluk.lg + ustEk,
        paddingBottom: (altBoslugu ? tema.bosluk.xxxl : 0) + kenar.bottom,
      }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{
          width: '100%',
          maxWidth: OKUMA_GENISLIGI,
          flexGrow: 1,
          gap: tema.bosluk.lg,
          justifyContent: ortala ? 'center' : undefined,
        }}
      >
        {children}
      </View>
    </ScrollView>
  );
}

/**
 * Kart.
 *
 * `vurgulu` bir zamanlar kartın tamamını mint yeşiline boyuyordu. İki sorunu vardı:
 * aksan rengi zemine yayılınca bir şey işaret etme gücünü kaybediyor, ve renkli
 * dolgulu yuvarlak kutular üst üste binince arayüz bir ölçü aletine değil şablon bir
 * bileşen kütüphanesine benziyordu.
 *
 * Vurgu artık dolgu değil, **kenar işareti**: ölçeğin üstüne konmuş bir imleç gibi
 * solda 2 px'lik aksan çizgisi. Renk tek bir yerde ve bir şeyi gösteriyor.
 */
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

  if (vurgulu) {
    return (
      <View
        style={[
          {
            backgroundColor: tema.renk.yuzey,
            borderLeftWidth: 2,
            borderLeftColor: tema.renk.aksan,
            paddingVertical: tema.bosluk.lg,
            paddingLeft: tema.bosluk.lg,
            paddingRight: tema.bosluk.lg,
            gap: tema.bosluk.sm,
          },
          stil,
        ]}
      >
        {children}
      </View>
    );
  }

  /**
   * Kenarlık kalktı, yüzey kaldı.
   *
   * Gri zemin üstündeki beyaz yüzey kartı zaten ayırıyordu; üstüne bir de çizgi
   * çekmek her kartı iki kez sınırlıyordu. Dışarıdan gelen eleştirinin adı "iç içe
   * kutulama": ekran, içerikten çok kutu okuyordu.
   *
   * Kutuları büsbütün kaldırmak denendi ve doğru bulunmadı: program kartında artık
   * hareket fotoğrafı var ve fotoğrafın bir kabı olmak zorunda. Kural şu oldu — kart,
   * sınırı olan bir NESNEYİ tutar (bir hareket, bir öğün); sırf metni gruplamak için
   * kart açılmaz.
   */
  return (
    <View
      style={[
        {
          backgroundColor: tema.renk.yuzey,
          borderRadius: tema.yaricap.md,
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
  esnek = false,
  sar = false,
}: {
  children: ReactNode;
  arasi?: keyof Tema['bosluk'];
  hizala?: ViewStyle['alignItems'];
  dagit?: ViewStyle['justifyContent'];
  /** Başka bir satırın içindeyken daralsın — taşan öğeyi dışarı itmesin. */
  esnek?: boolean;
  /** Metin olmayan çok öğeli satırlarda alt satıra insin. */
  sar?: boolean;
}) {
  const tema = useTema();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: hizala,
        gap: tema.bosluk[arasi],
        /*
          Sarma İSTEĞE BAĞLI, daralma varsayılan.

          Bir aralık sarma varsayılan yapıldı ve YANLIŞ çıktı: Yoga önce satırı
          kırıyor, daralmaya sıra gelmiyor. Yani sığmayan bir başlık metin olarak
          sarmak yerine bir öğe olarak alt satıra düşüyordu — yanındaki numara
          dairesinden kopuyordu. Emülatörde görüldü.

          Metnin kırpılmamasını sağlayan şey sarma değil, `Yazi`nın satır içinde
          aldığı `flexShrink: 1` (bkz. `SatirIcinde`). `sar` yalnızca metin olmayan
          çok öğeli satırlar için duruyor.
        */
        ...(sar ? { flexWrap: 'wrap' as const } : {}),
        ...(esnek ? { flex: 1 } : {}),
        ...(dagit ? { justifyContent: dagit } : {}),
      }}
    >
      <SatirIcinde.Provider value={true}>{children}</SatirIcinde.Provider>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Görsel
// ---------------------------------------------------------------------------

/**
 * Fotoğraf kabı.
 *
 * `<Image>` bu sürümde ölçüsünü yalnızca SAYI olarak kabul ediyor. Yüzde de,
 * `aspectRatio` da, mutlak konumun dört kenarı da yok sayılıp fotoğrafın kendi piksel
 * ölçüsüne düşülüyor: 850 px'lik bir fotoğraf 480 dp'lik ekranda iki kat büyük çiziliyor.
 * Hareket detayında görünen buydu — kadraj hareketi yapan kişiyi tamamen dışarıda
 * bırakıyor, ekranda yalnızca aletin bir köşesi kalıyordu.
 *
 * Bu yüzden oran, ölçüsü olmayan dış `View`e veriliyor; genişlik ölçüldükten sonra
 * fotoğrafa sayı olarak geçiliyor. Ölçülmeden önce çizilmiyor — yanlış ölçekte bir kare
 * gösterip düzeltmek, boş bir kap göstermekten daha rahatsız edici.
 */
export function Gorsel({
  kaynak,
  oran,
  sigdir = false,
  yaricap: yaricapAnahtari = 'md',
  erisimEtiketi,
  genislik: sabitGenislik,
}: {
  kaynak: number;
  /** Verilmezse fotoğrafın kendi oranı okunur. */
  oran?: number;
  /** true: fotoğraf kırpılmadan kaba sığdırılır (oranı kaba uymayan az sayıda görsel). */
  sigdir?: boolean;
  yaricap?: keyof Tema['yaricap'];
  erisimEtiketi?: string;
  /** Verilirse kap bu genişlikte sabitlenir (liste küçük görselleri). */
  genislik?: number;
}) {
  const tema = useTema();
  const [olculenGenislik, setOlculenGenislik] = useState(sabitGenislik ?? 0);
  const olcu = Image.resolveAssetSource(kaynak) as { width?: number; height?: number } | undefined;
  const kapOrani = oran ?? gorselOrani(olcu?.width, olcu?.height);

  return (
    <View
      onLayout={
        sabitGenislik === undefined
          ? (olay) => setOlculenGenislik(olay.nativeEvent.layout.width)
          : undefined
      }
      style={{
        ...(sabitGenislik === undefined ? {} : { width: sabitGenislik }),
        aspectRatio: kapOrani,
        borderRadius: tema.yaricap[yaricapAnahtari],
        backgroundColor: tema.renk.yuzeyIkincil,
        overflow: 'hidden',
      }}
    >
      {olculenGenislik > 0 ? (
        <Image
          source={kaynak}
          accessibilityLabel={erisimEtiketi}
          accessibilityIgnoresInvertColors
          resizeMode={sigdir ? 'contain' : 'cover'}
          style={{ width: olculenGenislik, height: olculenGenislik / kapOrani }}
        />
      ) : null}
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
  /**
   * Kilidi hangi plan açıyor. Rozet metni bundan geliyor.
   *
   * Sabit "Temel plandan" basılıyordu; fotoğraftan yemek tanıma ise Pro özelliği.
   * Pro özelliğine "Temel plandan" demek, kullanıcıya Temel'i aldığında alamayacağı
   * bir şeyi vadetmekti.
   */
  kilitPlan?: 'temel' | 'pro';
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
  kilitPlan = 'temel',
}: DugmeProps) {
  const tema = useTema();
  const genel = useMetinler().genel;
  const kilitMetni = kilitPlan === 'pro' ? genel.proPlandan : genel.temelPlandan;

  const zeminler: Record<string, string> = {
    birincil: tema.renk.aksan,
    ikincil: tema.renk.yuzeyIkincil,
    sessiz: 'transparent',
    tehlike: tema.renk.tehlikeZemin,
  };
  const metinler: Record<string, string> = {
    // Zemin temayla değişiyor; metin de değişmek zorunda (bkz. tokens.ts aksanUstu).
    birincil: tema.renk.aksanUstu,
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
        // Kontrol kenarı `kenar`, dekoratif ayraç `cizgi`: ikincil düğmenin sınırı
        // "buraya dokunulur" bilgisinin tek taşıyıcısı ve 1,25:1'de görünmüyordu.
        borderColor: tur === 'birincil' ? tema.renk.aksan : tema.renk.kenar,
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
          {/*
            Duğme metni de uygulamanın yazı tipini kullanıyor.
            Ham `<Text>` `fontFamily` almıyor; her ana düğme sistem fontuyla çıkıyordu.
          */}
          <Text
            style={{
              color: metinler[tur],
              fontSize: 16,
              fontFamily: tema.tipografi.aileler.baslik,
            }}
          >
            {baslik}
          </Text>
          {kilitli ? (
            /*
              Kilit alt metni düğmenin KENDİ dolgusunun üstünde duruyor, zeminin değil.
              `metinSilik` orada okunmuyordu: açık temada `#5B625E` / `#14615A` = 1.16:1,
              koyu temada 1.03:1 — yani iki rengin parlaklığı neredeyse aynı. Bileşenin
              kendi açıklaması "dokunmadan önce ne olacağını bilmek" diyor; alt metin
              görünmediği için özellik hiç çalışmıyordu.

              `aksanUstu` tam bu iş için var: aksan dolgusunun üstünde okunan renk.
              Yarı saydamlık, başlıktan ayrışsın ama okunur kalsın diye.
            */
            <Text
              style={{
                color: metinler[tur],
                opacity: 0.85,
                fontSize: 11,
                letterSpacing: 0.3,
                marginTop: 2,
                fontFamily: tema.tipografi.aileler.govde,
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
        // Seçilmemiş onay kutusu 1,46:1'de fiilen yoktu.
        borderColor: secili ? tema.renk.aksan : tema.renk.kenar,
        backgroundColor: tema.renk.yuzey,
        opacity: pressed ? 0.9 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: tema.bosluk.md,
      })}
    >
      {/*
        Isaretin kendisi.

        Once yalnizca kenarlik ve zemin rengi degisiyordu: SECILMEMIS hali sade bir
        metin kutusuydu ve dokunulabilir oldugu hic belli olmuyordu. Bu bilesen KVKK
        acik rizasini da tasiyor; onayin verilip verilmedigi bakar bakmaz okunmali.
      */}
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: cokluSecim ? tema.yaricap.sm : tema.yaricap.tam,
          borderWidth: secili ? 0 : 1.5,
          borderColor: tema.renk.celik,
          backgroundColor: secili ? tema.renk.aksan : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {secili ? (
          <Text
            style={{
              color: tema.renk.aksanUstu,
              fontSize: 13,
              lineHeight: 16,
              fontFamily: tema.tipografi.aileler.baslik,
            }}
          >
            ✓
          </Text>
        ) : null}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Yazi renk="metin">{baslik}</Yazi>
        {aciklama ? (
          <Yazi tur="kucuk" renk="metinSilik">
            {aciklama}
          </Yazi>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * Liste satırı — ikincil eylemler için.
 *
 * Beslenme sekmesinde altı eylem 2×3'lük eşit ağırlıklı bir düğme ızgarasındaydı:
 * "Fotoğraftan ekle" (Pro'nun tek farkı, günde birkaç kez) ile "Alışveriş listesi"
 * (haftada bir) aynı görünüyordu. Kullanım sıklığı gözetilmeyen ızgara, "özellik
 * listesi" okur; ürünün ne yapmanı beklediğini söylemez.
 *
 * Günlük kayıt eylemleri düğme olarak kaldı; haftalık planlama işleri bu satırlara
 * taşındı. Farklı iş, farklı görsel sınıf.
 */
export function BaglantiSatiri({
  baslik,
  onPress,
  kilitli = false,
  ilk = false,
}: {
  baslik: string;
  onPress: () => void;
  kilitli?: boolean;
  ilk?: boolean;
}) {
  const tema = useTema();
  const kilitMetni = useMetinler().genel.temelPlandan;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={kilitli ? `${baslik}. ${kilitMetni}` : baslik}
      style={({ pressed }) => ({
        minHeight: tema.dokunmaHedefi,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: tema.bosluk.md,
        borderTopWidth: ilk ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: tema.renk.cizgi,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Yazi renk={kilitli ? 'metinSilik' : 'metin'}>{baslik}</Yazi>
      <Yazi tur="etiket" renk="metinSilik">
        {kilitli ? kilitMetni : '→'}
      </Yazi>
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
  const kenar = { bilgi: tema.renk.aksan, uyari: tema.renk.uyari, tehlike: tema.renk.tehlike }[tur];

  /**
   * Dolgu kalktı, kenar çizgisi kaldı.
   *
   * Krem ve mint dolgulu kutular ekranda üst üste binince ürün bir ölçü aletine değil
   * şablon bir bileşen kütüphanesine benziyordu. Uyarının işi dikkat çekmek; bunu
   * zeminini boyayarak değil, kenarına bir işaret koyarak yapıyor.
   */
  return (
    <View
      accessibilityRole="alert"
      style={{
        borderLeftWidth: 2,
        borderLeftColor: kenar,
        paddingLeft: tema.bosluk.lg,
        paddingVertical: tema.bosluk.sm,
        gap: tema.bosluk.xs,
      }}
    >
      {baslik ? (
        <Yazi tur="baslik3" renk="metin">
          {baslik}
        </Yazi>
      ) : null}
      <Yazi tur="kucuk" renk="metinYumusak">
        {govde}
      </Yazi>
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
          height: 3,
          backgroundColor: tema.renk.celikSilik,
          overflow: 'hidden',
        }}
      >
        <View style={{ width: `${guvenli}%`, height: '100%', backgroundColor: tema.renk.aksan }} />
      </View>
      {etiket ? (
        <Yazi tur="etiket" renk="metinSilik">
          {etiket}
        </Yazi>
      ) : null}
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
      <Text
        style={{
          color: renk,
          fontSize: 12,
          letterSpacing: 0.3,
          fontFamily: tema.tipografi.aileler.baslik,
        }}
      >
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
      <Yazi tur="kucuk" renk="metinSilik">
        {metin ?? metinler.genel.yukleniyor}
      </Yazi>
    </View>
  );
}

/**
 * Boş durum.
 *
 * İki şey değişti. Metin `Yazi` kullanıyor: ham `<Text>` uygulamanın yazı tipini
 * atlıyor ve o blok tek başına sistem fontuyla çıkıyordu. Ve hizalama sola alındı:
 * baştan sona sola dayalı bir arayüzün ortasında ortalanmış bir metin bloğu, ekrana
 * sonradan yapıştırılmış gibi duruyor.
 *
 * Boş ekran bir eylem davetidir; eylemin kendisi çağıran ekranda, hemen altında.
 */
export function BosDurum({ baslik, govde }: { baslik: string; govde: string }) {
  const tema = useTema();
  return (
    <View style={{ gap: tema.bosluk.sm, paddingVertical: tema.bosluk.md }}>
      <Yazi tur="baslik2">{baslik}</Yazi>
      <Yazi renk="metinYumusak">{govde}</Yazi>
    </View>
  );
}
