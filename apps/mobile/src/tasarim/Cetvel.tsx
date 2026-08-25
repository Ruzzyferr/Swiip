import { Pressable, View } from 'react-native';
import { Yazi } from './bilesenler';
import { useTema } from './tema';

/**
 * Taksimat cetveli — değerlendirme ilerlemesi.
 *
 * İşaretin kendisi bir ölçü aleti: logodaki S iki yaydan kuruluyor ve dış kavislerinde
 * taksimat var. Bu bileşen o fikrin arayüzdeki tek taşıyıcısı.
 *
 * Yerini aldığı şey 3 px'lik jenerik bir dolan çubuktu. O çubuk iki soruyu da
 * cevaplamıyordu: kaç bölüm var, ben hangisindeyim. Cetvel ikisini de gösteriyor —
 * on blok on ana çentik, aradaki sorular küçük çentikler.
 *
 * Süse dönüşmemesinin tek şartı: bir MEKANİZMA olması. Dolayısıyla ana çentikler
 * dokunulabilir; tamamlanmış bir bloğa dokunup cevaplarını gözden geçirebiliyorsun.
 * Dokunulamayan bir cetvel yalnızca çizilmiş bir cetveldir.
 *
 * Kural: ekranda aynı anda yalnızca BİR cetvel olur. İkincisi konduğu anda arayüz
 * kumpas değil, bozuk bir ses mikseri gibi görünür.
 */

export interface CetvelBolumu {
  id: string;
  /** Ana çentiğin altındaki kısa ad. Uzunsa ilk harf gösterilir. */
  ad: string;
  toplam: number;
  cevaplanan: number;
}

export interface CetvelProps {
  bolumler: CetvelBolumu[];
  aktifId: string;
  /** Tamamlanmış bir bölüme dönüş. Verilmezse cetvel yalnızca okunur. */
  onBolumSec?: (id: string) => void;
}

/** Ana çentik yüksekliği. Küçük çentik bunun yarısı — gerçek bir cetveldeki gibi. */
const ANA_CENTIK = 16;
const KUCUK_CENTIK = 8;

/**
 * Bir bölümün içindeki küçük çentik sayısı — her bölümde AYNI.
 *
 * Önce soru sayısına bağlıydı ve bölmeler farklı sıklıkta çıkıyordu: bir cetvelin
 * santimleri farklı sayıda milimetreye bölünmez. Bölüm içi ilerlemeyi çentik SAYISI
 * değil, kaçının dolu olduğu taşıyor.
 */
const KUCUK_ADET = 9;

export function Cetvel({ bolumler, aktifId, onBolumSec }: CetvelProps) {
  const tema = useTema();
  const aktifSira = bolumler.findIndex((b) => b.id === aktifId);

  return (
    <View style={{ gap: tema.bosluk.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        {bolumler.map((bolum, sira) => {
          const bitti = bolum.cevaplanan >= bolum.toplam;
          const aktif = bolum.id === aktifId;
          const gecildi = sira < aktifSira;
          // Geçilmiş ya da bitmiş bölüme dönülebilir; ileri atlanamaz.
          const donulebilir = Boolean(onBolumSec) && (gecildi || bitti) && !aktif;

          const anaRenk = aktif
            ? tema.renk.aksan
            : gecildi || bitti
              ? tema.renk.celik
              : tema.renk.celikSilik;

          return (
            <Pressable
              key={bolum.id}
              disabled={!donulebilir}
              onPress={() => onBolumSec?.(bolum.id)}
              /**
               * Dönülemeyen bölüm ekran okuyucudan TAMAMEN gizleniyor.
               *
               * `accessibilityRole="none"` ögeyi kaldırmıyor: etiketi olan bir görünüm
               * hâlâ odaklanabilir. Sonuç, her soru ekranında ilk soruya varmadan önce
               * her kart için ayrı bir "Beslenme: 0/9" duyurusunu geçmekti — akış boyunca çok
               * fazla kaydırma. Aktif ve dönülebilir bölümler duyurulmaya devam ediyor;
               * taşıdıkları bilgi gerçek.
               */
              accessible={donulebilir || aktif}
              importantForAccessibility={donulebilir || aktif ? 'yes' : 'no-hide-descendants'}
              accessibilityElementsHidden={!donulebilir && !aktif}
              accessibilityRole={donulebilir ? 'button' : undefined}
              accessibilityLabel={`${bolum.ad}: ${bolum.cevaplanan}/${bolum.toplam}`}
              accessibilityState={{ selected: aktif }}
              /**
               * Dokunma alanı çentiğin boyu değil.
               *
               * Çentik 16 px yüksekliğinde ve bölüm ~35 px genişliğinde; dokunma hedefi
               * bu kadardı ve `hitSlop` yoktu. Tamamlanmış bir bölüme dönmenin TEK yolu
               * burası ve bileşenin kendi açıklaması "Dokunulamayan bir cetvel yalnızca
               * çizilmiş bir cetveldir" diyor — pratikte çizilmiş bir cetveldi.
               */
              hitSlop={{ top: 16, bottom: 16, left: 4, right: 4 }}
              /**
               * Bölümler EŞİT genişlikte.
               *
               * Önce soru sayısıyla orantılıydı ve iki şey birden bozuluyordu: az
               * sorulu bölümler eziliyor, etiketleri üst üste biniyordu ("Kimli...H A").
               * Bir cetvelin ana bölmeleri zaten eşit aralıklıdır; bölüm içindeki
               * ayrıntıyı küçük çentikler taşıyor.
               */
              style={{ flex: 1, alignItems: 'flex-start' }}
            >
              {/* Ana çentik: bölümün başlangıcı. */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: ANA_CENTIK }}>
                <View style={{ width: 2, height: ANA_CENTIK, backgroundColor: anaRenk }} />
                <KucukCentikler
                  toplam={bolum.toplam}
                  cevaplanan={bolum.cevaplanan}
                  doluRenk={aktif ? tema.renk.aksan : tema.renk.celik}
                  bosRenk={tema.renk.celikSilik}
                />
              </View>
            </Pressable>
          );
        })}
        {/* Cetvelin bittiği yer de bir çentikle biter; açık uçlu ölçek olmaz. */}
        <View style={{ width: 2, height: ANA_CENTIK, backgroundColor: tema.renk.celikSilik }} />
      </View>

      {/*
        Etiket her zaman bölüm harfi.
        Blok adları ("Kimlik ve kapı") çentik aralığına sığmıyor ve kırpılınca cetvel
        bilgi taşıyan bir ölçek olmaktan çıkıp süse dönüşüyordu. Bölümün tam adı zaten
        hemen altta, başlıkta yazıyor.
      */}
      <View style={{ flexDirection: 'row' }}>
        {bolumler.map((bolum) => (
          <View key={bolum.id} style={{ flex: 1 }}>
            {/*
              Etiket bölüm harfi — ama ham blok anahtarı DEĞİL.
              `bolum.id` doğrudan basılıyordu ve kullanıcı `K H A S E Z Y B T F`
              görüyordu: on harf, hiçbirinin karşılığı ekranda yok. Harf artık bölüm
              adının baş harfinden geliyor, yani altındaki başlıkla aynı kelimeye
              bağlanıyor.
            */}
            <Yazi tur="etiket" renk={bolum.id === aktifId ? 'aksan' : 'metinSilik'}>
              {bolum.ad.slice(0, 1).toLocaleUpperCase('tr')}
            </Yazi>
          </View>
        ))}
        <View style={{ width: 2 }} />
      </View>
    </View>
  );
}

/**
 * Bölüm içindeki küçük çentikler.
 *
 * Çentik sayısı soru sayısına EŞİT değil, ona orantılı. Yirmi beş soruluk bir blok
 * yirmi beş çentikle çizilince çentikler birbirine girip gri bir şeride dönüşüyordu;
 * on ikiden fazlası hiç çizilmeyince de bölümün yerinde boşluk kalıyor ve cetvel
 * kırıkmış gibi görünüyordu. Şimdi her bölüm aynı sayıda çentikle çiziliyor ve dolu
 * çentik oranı ilerlemeyi gösteriyor.
 */
function KucukCentikler({
  toplam,
  cevaplanan,
  doluRenk,
  bosRenk,
}: {
  toplam: number;
  cevaplanan: number;
  doluRenk: string;
  bosRenk: string;
}) {
  if (toplam <= 1) return null;

  const oran = cevaplanan / toplam;
  const dolu = Math.round(oran * KUCUK_ADET);

  return (
    <View style={{ flexDirection: 'row', flex: 1, alignItems: 'flex-end' }}>
      {Array.from({ length: KUCUK_ADET }, (_, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'flex-start' }}>
          <View
            style={{
              width: 1,
              height: KUCUK_CENTIK,
              backgroundColor: i < dolu ? doluRenk : bosRenk,
            }}
          />
        </View>
      ))}
    </View>
  );
}
