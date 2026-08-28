import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Dugme, Ekran, Yazi } from './bilesenler';

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
  /*
    Kap `Ekran` — düz bir `View` DEĞİL.

    Burası uygulamanın son çıkışı: "Yeniden dene" düğmesi görünmezse kullanıcının
    uygulamayı silmekten başka yolu kalmaz. Düz `View` içerik sığmayınca kırpıyordu
    ve bu ekranın uzunluğu sabit değil — hata metni dile göre, yazı tipi ölçeği
    kullanıcı ayarına göre değişiyor. `kapi.tsx` ile aynı gerekçe, aynı çözüm.

    `ustGuvenliAlan`: bu ekran gezinme yığınının DIŞINDA çiziliyor, yani üst boşluğu
    verecek bir başlık yok. Yoksa başlık çentiğin altında kalır.
  */
  return (
    <Ekran ustGuvenliAlan ortala>
      <Yazi tur="baslik1">{metinler.baslik}</Yazi>
      <Yazi renk="metinYumusak">{metinler.govde}</Yazi>
      <Dugme baslik={metinler.yeniden} onPress={yeniden} />
    </Ekran>
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
