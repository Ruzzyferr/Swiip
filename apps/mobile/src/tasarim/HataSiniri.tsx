import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';
import { Dugme, Yazi } from './bilesenler';
import { useTema } from './tema';

/**
 * Çizim sırasında hata olursa beyaz ekran yerine anlaşılır bir ekran.
 *
 * Depoda hiç hata sınırı yoktu — `ErrorBoundary`, `componentDidCatch`,
 * `getDerivedStateFromError` için sıfır sonuç. `CLAUDE.md`'nin en üst sıradaki
 * kuralı "Uygulama çökmez" ve gerekçesi ölçülmüş: Diyetkolik negatiflerinin %34'ü
 * teknik hataydı. O kuralın altında hiçbir ağ yoktu: herhangi bir bileşenin çizim
 * sırasında fırlattığı hata React ağacının tamamını söküyor ve kullanıcı boş bir
 * ekranla kalıyordu, kapatıp açmaktan başka yolu olmadan.
 *
 * Somut bir yol vardı: `degerlendirme/kapi.tsx` tanımsız bir `tip` için `undefined`
 * döndürüyor, hemen ardından `icerik.baslik` fırlatıyordu; `swiip://degerlendirme/kapi?tip=x`
 * ile ulaşılabiliyordu. O nokta ayrıca düzeltildi ama sınıf açık kalıyordu.
 *
 * Sınıf bileşeni olmak zorunda: React'te hata yakalamanın kanca karşılığı yok.
 * Ekranın kendisi ayrı bir işlev bileşeni, çünkü tema bir kanca ve sınıfın içinden
 * çağrılamaz. `useTema` sağlayıcıya bağlı değil — `useColorScheme()` okuyor — yani
 * hata sonrası da güvenle çalışıyor ve hata ekranı koyu temada koyu kalıyor.
 */

interface Ozellikler {
  children: ReactNode;
  /** Kullanıcıya gösterilecek metinler; sözlükten geçirilir. */
  metinler: { baslik: string; govde: string; yeniden: string };
  /** Hata raporlama bağlanınca buraya takılır. */
  bildir?: (hata: Error, bilgi: ErrorInfo) => void;
}

interface Durum {
  hata: Error | null;
}

function HataEkrani({
  metinler,
  yeniden,
}: {
  metinler: Ozellikler['metinler'];
  yeniden: () => void;
}) {
  const tema = useTema();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tema.renk.zemin,
        justifyContent: 'center',
        padding: tema.bosluk.lg,
        gap: tema.bosluk.md,
      }}
    >
      <Yazi tur="baslik1">{metinler.baslik}</Yazi>
      <Yazi renk="metinYumusak">{metinler.govde}</Yazi>
      <Dugme baslik={metinler.yeniden} onPress={yeniden} />
    </View>
  );
}

export class HataSiniri extends Component<Ozellikler, Durum> {
  override state: Durum = { hata: null };

  static getDerivedStateFromError(hata: Error): Durum {
    return { hata };
  }

  override componentDidCatch(hata: Error, bilgi: ErrorInfo): void {
    this.props.bildir?.(hata, bilgi);
  }

  private yeniden = () => {
    this.setState({ hata: null });
  };

  override render(): ReactNode {
    if (!this.state.hata) return this.props.children;
    return <HataEkrani metinler={this.props.metinler} yeniden={this.yeniden} />;
  }
}
