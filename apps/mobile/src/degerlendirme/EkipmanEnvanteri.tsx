import { Pressable, View } from 'react-native';
import type { Soru } from '@swiip/shared';
import { Dugme, Satir, Uyari, Yazi } from '../tasarim/bilesenler';
import { useTema } from '../tasarim/tema';
import { useMetinler } from '../durum/Oturum';

/**
 * Ekipman envanteri (F2.5).
 *
 * Görsel çoklu seçim + salon zincirine göre ön doldurma. Ön doldurma bir varsayımdır,
 * kısıt değil: kullanıcı onaylayana kadar bağlayıcı olmaz, tikleri kaldırabilir.
 */

const SIMGELER: Record<string, string> = {
  'Barbell ve plaka': '🏋',
  Dumbbell: '🔩',
  Kettlebell: '🔔',
  'Leg press': '🦵',
  'Hack squat': '⛰',
  'Lat pulldown': '⬇',
  'Kablo makinesi': '🔗',
  'Smith makinesi': '⛓',
  'Barfiks barı': '➖',
  'Dip barı': '⊓',
  'Düz bench': '🛏',
  'Eğimli bench': '📐',
  'Ayarlanabilir bench': '🪑',
  'Direnç bandı': '➰',
  'Koşu bandı': '🏃',
  'Sabit bisiklet': '🚲',
  'Kürek makinesi': '🚣',
  Merdiven: '🪜',
  'TRX / askı': '🪢',
  'Squat rack': '🗜',
  'Göğüs presi makinesi': '🎛',
  'Sırt makinesi': '🎚',
  'Omuz presi makinesi': '🎛',
  'Bacak ekstansiyon / curl makinesi': '🦿',
  'Baldır makinesi': '🦶',
  'Abduktor / adduktor makinesi': '↔',
  'Preacher bench': '💪',
  'Roma sandalyesi / hiperekstansiyon': '🪑',
  'Plyo box': '📦',
  'Hiçbiri, vücut ağırlığı': '🧍',
};

/**
 * E1 ("Nerede antrenman yapacaksın?") cevabına göre ön doldurma.
 *
 * Eskiden E2'ye (salon zinciri: MACFit, B-Fit…) bakıyordu ve o soru bankadan çıktı:
 * cevabını hiçbir hesap okumuyordu. Ama ön doldurmanın kendisi ZATEN çalışmıyordu —
 * `salon` prop'u hiçbir yerden geçilmiyordu, yani kod dört yıl boyunca ölüydü ve
 * salon seçen kullanıcı 30 kutucuğu tek tek işaretliyordu.
 *
 * Artık E1'den geliyor ve gerçekten geçiliyor. Ön doldurma bir VARSAYIM, kısıt değil:
 * kullanıcı tikleri kaldırabilir. Ev ve açık havada varsayım yapılmıyor — orada
 * ekipman gerçekten olmayabilir.
 */
const KONUM_SETLERI: Record<string, string[]> = {
  'Spor salonu': DAR_SET(),
  Karma: DAR_SET(),
};

function DAR_SET(): string[] {
  return [
    'Barbell ve plaka',
    'Dumbbell',
    'Lat pulldown',
    'Kablo makinesi',
    'Barfiks barı',
    'Düz bench',
    'Eğimli bench',
    'Squat rack',
    'Leg press',
    'Koşu bandı',
  ];
}

/** Dışlayıcı seçenek: diğerleriyle bir arada duramaz. */
const VUCUT_AGIRLIGI = 'Hiçbiri, vücut ağırlığı';

export interface EkipmanEnvanteriProps {
  soru: Soru;
  deger: unknown;
  onDegisim: (deger: unknown) => void;
  /** E1 cevabı; salon ya da karma ise ön doldurma önerilir. */
  konum?: string;
}

export function EkipmanEnvanteri({ soru, deger, onDegisim, konum }: EkipmanEnvanteriProps) {
  const tema = useTema();
  const m = useMetinler().degerlendirme.ekipman;
  const secili = Array.isArray(deger) ? (deger as string[]) : [];
  const secenekler = soru.options ?? [];
  const onDolduSet = konum ? KONUM_SETLERI[konum] : undefined;

  const degistir = (secenek: string) => {
    if (secenek === VUCUT_AGIRLIGI) {
      onDegisim(secili.includes(secenek) ? [] : [secenek]);
      return;
    }
    const temiz = secili.filter((s) => s !== VUCUT_AGIRLIGI);
    onDegisim(temiz.includes(secenek) ? temiz.filter((s) => s !== secenek) : [...temiz, secenek]);
  };

  return (
    <View style={{ gap: tema.bosluk.md }}>
      {/*
        Öneri bloğu SEÇİM YAPILINCA KAYBOLMUYOR.

        Koşulu `secili.length === 0` idi: ilk kutucuğa dokunulduğu anda uyarı ve
        düğme (birlikte 261 px) yok oluyor, ızgaranın tamamı parmağın altından
        yukarı kayıyordu. Emülatörde ölçüldü — "Barbell ve plaka" sonra "Dumbbell"
        seçmeye çalışan kullanıcı "Barbell ve plaka" ile "Leg press"i işaretlemiş
        oluyordu. Kullanıcının "tek bir tane seçebiliyorum" dediği kusur buydu;
        seçim mantığı doğruydu, zemin kayıyordu.

        Kural: bir listenin ÜSTÜNDEKİ hiçbir şey, o listeye verilen cevap yüzünden
        belirip kaybolmaz.

        Düğme artık ezmiyor, EKLİYOR: elle işaretlenmiş ekipman kaybolmadan salon
        seti üstüne biniyor. Kaybolan bir kısayolu geri getirmenin yolu yoktu;
        kalıcı olunca "aslında standart salon setini de ekle" demek de mümkün oldu.
      */}
      {onDolduSet ? (
        <View style={{ gap: tema.bosluk.sm }}>
          <Uyari govde={m.onDoldurmaOnerisi()} />
          <Dugme
            baslik={m.salonumaGoreDoldur}
            tur="ikincil"
            onPress={() =>
              // "Hiçbiri" ile salon seti bir arada duramaz; birleştirme onu düşürüyor.
              onDegisim([
                ...new Set([...secili.filter((s) => s !== VUCUT_AGIRLIGI), ...onDolduSet]),
              ])
            }
          />
        </View>
      ) : null}

      {/*
        Sayaç satırının yüksekliği SABİT.

        "Temizle" yalnızca seçim varken çıkıyor ve dokunma hedefi 44 px; satır ilk
        seçimde 20 px'ten 44'e büyüyüp ızgarayı 24 px aşağı itiyordu. Aynı sınıf
        kusurun küçük hali — ölçüyü satıra vererek kapatıyoruz.
      */}
      <Satir dagit="space-between" stil={{ minHeight: tema.dokunmaHedefi }}>
        <Yazi tur="kucuk" renk="metinSilik">
          {m.secili(secili.length)}
        </Yazi>
        {secili.length > 0 ? (
          /*
            Hiç stili yoktu: dokunma alanı 14 px'lik metnin sınırları kadardı ve bu
            düğme tüm ekipman seçimini siliyor. Küçük hedef + geri alınamayan işlem
            kötü bir ikili.
          */
          <Pressable
            onPress={() => onDegisim([])}
            accessibilityRole="button"
            accessibilityLabel={m.temizle}
            hitSlop={12}
            style={{
              minHeight: tema.dokunmaHedefi,
              justifyContent: 'center',
              paddingHorizontal: tema.bosluk.sm,
            }}
          >
            <Yazi tur="kucuk" renk="aksan">
              {m.temizle}
            </Yazi>
          </Pressable>
        ) : null}
      </Satir>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.bosluk.sm }}>
        {secenekler.map((secenek) => {
          const isaretli = secili.includes(secenek);
          return (
            <Pressable
              key={secenek}
              onPress={() => degistir(secenek)}
              accessibilityRole="checkbox"
              accessibilityLabel={secenek}
              accessibilityState={{ checked: isaretli }}
              style={{
                width: '47%',
                minHeight: tema.dokunmaHedefi + 20,
                borderRadius: tema.yaricap.md,
                borderWidth: isaretli ? 2 : 1,
                borderColor: isaretli ? tema.renk.aksan : tema.renk.cizgi,
                backgroundColor: isaretli ? tema.renk.aksanZemin : tema.renk.yuzey,
                padding: tema.bosluk.md,
                gap: 4,
                justifyContent: 'center',
              }}
            >
              <Yazi tur="baslik3">{SIMGELER[secenek] ?? '•'}</Yazi>
              <Yazi tur="kucuk" renk={isaretli ? 'aksan' : 'metinYumusak'}>
                {secenek}
              </Yazi>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
