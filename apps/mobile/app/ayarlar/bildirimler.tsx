import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { Stack } from 'expo-router';
import type { Metinler } from '@swiip/shared';
import { Ayirac, Dugme, Ekran, Kart, Satir, Uyari, Yazi } from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { ANAHTARLAR, oku, yaz } from '../../src/veri/onbellek';
import { useMetinler, useSayilarGizli } from '../../src/durum/Oturum';
import { istek } from '../../src/veri/api';
import { bildirimleriKur, type ZamanlayiciDurumu } from '../../src/bildirim/zamanlayici';

/**
 * Bildirim ayarları (T7).
 *
 * Tasarım kuralı: bildirim bir hatırlatmadır, bir dürtme değil. Seri bozulma uyarısı,
 * suçluluk dili ve "seni özledik" bildirimi yok — bunlar oyunlaştırmanın bildirim
 * kılığına girmiş hâli.
 *
 * Varsayılan: seans hatırlatması AÇIK, geri kalan her şey KAPALI. Kullanıcı istediğini açar.
 */

interface Tercihler {
  seans_hatirlatmasi: boolean;
  seans_saati: string;
  geri_bildirim_hatirlatmasi: boolean;
  haftalik_ozet: boolean;
  olcum_hatirlatmasi: boolean;
  su_hatirlatmasi: boolean;
}

const VARSAYILAN: Tercihler = {
  seans_hatirlatmasi: true,
  seans_saati: '18:00',
  geri_bildirim_hatirlatmasi: true,
  haftalik_ozet: false,
  olcum_hatirlatmasi: false,
  su_hatirlatmasi: false,
};

export default function Bildirimler() {
  const m = useMetinler().bildirimAyarlari;
  const genel = useMetinler().genel;
  // Bildirim metinleri kullanıcının dilinden gelir; cihazın dilinden değil.
  const bildirimMetinleri = useMetinler().bildirim;
  const sayilarGizli = useSayilarGizli();

  const [tercihler, setTercihler] = useState<Tercihler>(VARSAYILAN);
  const [antrenmanGunleri, setAntrenmanGunleri] = useState<number[]>([]);
  const [zamanlayici, setZamanlayici] = useState<ZamanlayiciDurumu | null>(null);
  const [kaydedildi, setKaydedildi] = useState(false);
  /**
   * Program çekilemedi mi?
   *
   * Çekilemezse `antrenmanGunleri` boş kalıyor ve hiçbir seans hatırlatması kurulmuyor.
   * Ekran bunu "Şu an kurulu bildirim yok" diye gösteriyordu: doğru ama eksik — kullanıcı
   * programı olmadığı için mi yoksa bağlanamadığımız için mi olduğunu bilemiyordu.
   */
  const [programaUlasilamadi, setProgramaUlasilamadi] = useState(false);

  useEffect(() => {
    void oku<Tercihler>(ANAHTARLAR.bildirimTercihleri).then((kayit) => {
      if (kayit && typeof kayit === 'object' && 'seans_hatirlatmasi' in kayit) {
        setTercihler(kayit);
      }
    });

    // Hangi günlerde antrenman var: hatırlatma yalnızca o günlere kurulur.
    void istek<{ takvim: { gunler: number[] } }>('/v1/program/aktif')
      .then((program) => setAntrenmanGunleri(program.takvim?.gunler ?? []))
      .catch(() => {
        setAntrenmanGunleri([]);
        setProgramaUlasilamadi(true);
      });
  }, []);

  const degistir = <A extends keyof Tercihler>(anahtar: A, deger: Tercihler[A]) => {
    setTercihler((m) => ({ ...m, [anahtar]: deger }));
    setKaydedildi(false);
  };

  const kaydet = async () => {
    await yaz(ANAHTARLAR.bildirimTercihleri, tercihler);
    setZamanlayici(await bildirimleriKur(tercihler, antrenmanGunleri, bildirimMetinleri));
    setKaydedildi(true);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        <Yazi renk="metinYumusak">{m.girisMetni}</Yazi>

        <Kart>
          <Anahtar
            baslik={m.seansBaslik}
            aciklama={m.seansAciklama}
            deger={tercihler.seans_hatirlatmasi}
            onDegisim={(v) => degistir('seans_hatirlatmasi', v)}
          />

          {tercihler.seans_hatirlatmasi ? (
            <>
              <Ayirac />
              <Yazi tur="etiket" renk="metinSilik">
                {genel.saatBasligi}
              </Yazi>
              <Satir arasi="sm">
                {['07:00', '12:00', '18:00', '20:00'].map((saat) => (
                  <View key={saat} style={{ flex: 1 }}>
                    <Dugme
                      baslik={saat}
                      tur={tercihler.seans_saati === saat ? 'birincil' : 'ikincil'}
                      onPress={() => degistir('seans_saati', saat)}
                    />
                  </View>
                ))}
              </Satir>
            </>
          ) : null}
        </Kart>

        <Kart>
          <Anahtar
            baslik={m.geriBildirimBaslik}
            aciklama={m.geriBildirimAciklama}
            deger={tercihler.geri_bildirim_hatirlatmasi}
            onDegisim={(v) => degistir('geri_bildirim_hatirlatmasi', v)}
          />
          <Ayirac />
          <Anahtar
            baslik={m.ozetBaslik}
            aciklama={m.ozetAciklama}
            deger={tercihler.haftalik_ozet}
            onDegisim={(v) => degistir('haftalik_ozet', v)}
          />
          <Ayirac />
          <Anahtar
            baslik={m.olcumBaslik}
            aciklama={sayilarGizli ? m.olcumAciklamaEd : m.olcumAciklama}
            deger={tercihler.olcum_hatirlatmasi}
            onDegisim={(v) => degistir('olcum_hatirlatmasi', v)}
          />
          <Ayirac />
          <Anahtar
            baslik={m.suBaslik}
            aciklama={m.suAciklama}
            deger={tercihler.su_hatirlatmasi}
            onDegisim={(v) => degistir('su_hatirlatmasi', v)}
          />
        </Kart>

        <Uyari govde={m.durusNotu} />

        {kaydedildi ? (
          <Uyari
            tur={programaUlasilamadi ? 'uyari' : 'bilgi'}
            govde={
              programaUlasilamadi && kurulanAdet(zamanlayici) === 0
                ? m.kaydedildiProgramYok
                : kaydetNotu(m, zamanlayici)
            }
          />
        ) : null}

        <Dugme baslik={genel.kaydet} onPress={() => void kaydet()} />
      </Ekran>
    </>
  );
}

/**
 * Kaydetme sonrası ne olduğunu açıkça söyleriz.
 *
 * "Kaydedildi" deyip bildirimin hiç kurulmadığını gizlemek, kullanıcının haftalar sonra
 * fark edeceği sessiz bir hata olurdu.
 */
/** Kaç bildirim kurulabildi. İzin yoksa sıfır: o dalda `adet` alanı yok. */
function kurulanAdet(durum: ZamanlayiciDurumu | null): number {
  return durum?.durum === 'kuruldu' ? durum.adet : 0;
}

function kaydetNotu(m: Metinler['bildirimAyarlari'], durum: ZamanlayiciDurumu | null): string {
  // `durum` yalnızca kaydetmeden önce null; kaydet notu ancak kaydettikten sonra gösterilir.
  if (!durum) return m.kaydedildiBos;
  if (durum.durum === 'izin_yok') return m.kaydedildiIzinYok;
  if (durum.adet === 0) return m.kaydedildiBos;
  return m.kaydedildiKuruldu;
}

function Anahtar({
  baslik,
  aciklama,
  deger,
  onDegisim,
}: {
  baslik: string;
  aciklama: string;
  deger: boolean;
  onDegisim: (deger: boolean) => void;
}) {
  const tema = useTema();

  return (
    <Satir dagit="space-between" hizala="flex-start">
      <View style={{ flex: 1, gap: 2, paddingRight: tema.bosluk.md }}>
        <Yazi tur="kucuk">{baslik}</Yazi>
        <Yazi tur="etiket" renk="metinSilik">
          {aciklama}
        </Yazi>
      </View>
      <Switch
        value={deger}
        onValueChange={onDegisim}
        accessibilityLabel={baslik}
        trackColor={{ true: tema.renk.aksan, false: tema.renk.cizgi }}
      />
    </Satir>
  );
}
