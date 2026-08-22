import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import {
  aramaAnahtari,
  tarihBirlestir,
  tarihParcala,
  type Soru,
  type TarihParcalari,
} from '@swiip/shared';
import { Ayirac, Kart, Sayi, Satir, SecimDugmesi, Yazi } from '../tasarim/bilesenler';
import { useTema } from '../tasarim/tema';
import { useMetinler } from '../durum/Oturum';
import { VucutHaritasi } from './VucutHaritasi';
import { HedefVucutSecimi } from './HedefVucutSecimi';
import { EkipmanEnvanteri } from './EkipmanEnvanteri';

/**
 * Soru tipi başına bileşen (F2.2).
 *
 * Cevap yukarıda tutulur ve kaydedilen tek doğruluk kaynağı odur; kaldığı yerden devam
 * eden akışta ekran ile veri ayrışmasın diye.
 *
 * İstisna: birden çok metin kutusundan **tek bir cevap** üreten alanlar (tarih, sayı)
 * kendi ham metnini yerelde tutar. Çünkü "14" ile "1992" arasında geçen anda cevap
 * henüz geçerli değil ve yukarıya `null` yazılır; ham metin de yukarıdan okunursa
 * kullanıcının yazdığı silinir. Tarih alanı tam bu yüzden hiç tamamlanamıyordu.
 */

export type CevapDegeri = unknown;

export interface SoruAlaniProps {
  soru: Soru & { kalem?: string };
  deger: CevapDegeri;
  onDegisim: (deger: CevapDegeri) => void;
  hata?: string;
}

export function SoruAlani({ soru, deger, onDegisim, hata }: SoruAlaniProps) {
  const tema = useTema();
  const m = useMetinler().degerlendirme;

  return (
    <View style={{ gap: tema.bosluk.md }}>
      <View style={{ gap: tema.bosluk.xs }}>
        <Yazi tur="baslik2">{soru.text}</Yazi>
        {soru.optional ? (
          <Yazi tur="kucuk" renk="metinSilik">
            {m.istersenAtla}
          </Yazi>
        ) : null}
      </View>

      <Alan soru={soru} deger={deger} onDegisim={onDegisim} />

      {hata ? (
        <Yazi tur="kucuk" renk="tehlike">
          {hata}
        </Yazi>
      ) : null}
    </View>
  );
}

function Alan({ soru, deger, onDegisim }: Omit<SoruAlaniProps, 'hata'>) {
  switch (soru.type) {
    case 'single':
      return <TekSecim soru={soru} deger={deger} onDegisim={onDegisim} />;
    case 'multi':
      return <CokluSecim soru={soru} deger={deger} onDegisim={onDegisim} />;
    case 'scale':
      return <Olcek soru={soru} deger={deger} onDegisim={onDegisim} />;
    case 'number':
      return <SayiGirisi soru={soru} deger={deger} onDegisim={onDegisim} />;
    case 'date':
      return <TarihGirisi deger={deger} onDegisim={onDegisim} />;
    case 'time':
      return <SaatGirisi deger={deger} onDegisim={onDegisim} />;
    case 'text':
      return <MetinGirisi deger={deger} onDegisim={onDegisim} cokSatir={false} />;
    case 'longtext':
      return <MetinGirisi deger={deger} onDegisim={onDegisim} cokSatir />;
    case 'measure':
      return <OlcuGrubu soru={soru} deger={deger} onDegisim={onDegisim} />;
    case 'liftinput':
      return <YukGirisi soru={soru} deger={deger} onDegisim={onDegisim} />;
    case 'bodymap':
      return <VucutHaritasi soru={soru} deger={deger} onDegisim={onDegisim} />;
    case 'imagechoice':
      return <HedefVucutSecimi soru={soru} deger={deger} onDegisim={onDegisim} />;
    case 'consent':
      return <RizaOnayi soru={soru} deger={deger} onDegisim={onDegisim} />;
    case 'daterange':
      return <TarihAraligi deger={deger} onDegisim={onDegisim} />;
    default:
      return <MetinGirisi deger={deger} onDegisim={onDegisim} cokSatir={false} />;
  }
}

// ---------------------------------------------------------------------------

/** Bu sayıdan uzun listeler aranarak seçilir; kaydırarak seçmek işkence olur. */
const ARAMALI_ESIK = 12;

function TekSecim({ soru, deger, onDegisim }: Omit<SoruAlaniProps, 'hata'>) {
  const tema = useTema();

  // Ekipman envanteri görsel çoklu seçim olarak ayrı ele alınır.
  if (soru.id === 'E3') {
    return <EkipmanEnvanteri soru={soru} deger={deger} onDegisim={onDegisim} />;
  }

  const secenekler = soru.options ?? [];

  // 81 il için 81 düğme çizmek, kullanıcıyı ekranda gezdirmek demek.
  if (secenekler.length > ARAMALI_ESIK) {
    return <AramaliSecim soru={soru} deger={deger} onDegisim={onDegisim} />;
  }

  return (
    <View style={{ gap: tema.bosluk.sm }}>
      {secenekler.map((secenek) => (
        <SecimDugmesi
          key={secenek}
          baslik={secenek}
          secili={deger === secenek}
          onPress={() => onDegisim(secenek)}
        />
      ))}
    </View>
  );
}

/**
 * Uzun listeden arayarak seçim.
 *
 * Arama şapkasız çalışıyor: acele eden kullanıcı "istanbul" yazar, "İstanbul" bulunur.
 * Katlama `aramaAnahtari` ile — besin aramasıyla aynı kural, aynı kod. İki ayrı katlama
 * yazmak, ikisinin ayrışmasını beklemek demek.
 */
function AramaliSecim({ soru, deger, onDegisim }: Omit<SoruAlaniProps, 'hata'>) {
  const tema = useTema();
  const m = useMetinler().degerlendirme;
  const [sorgu, setSorgu] = useState('');

  const secenekler = soru.options ?? [];
  const secili = typeof deger === 'string' ? deger : undefined;

  const anahtar = aramaAnahtari(sorgu.trim());
  const eslesen =
    anahtar === ''
      ? secenekler.slice(0, ARAMALI_ESIK)
      : secenekler.filter((s) => aramaAnahtari(s).includes(anahtar)).slice(0, ARAMALI_ESIK);

  return (
    <View style={{ gap: tema.bosluk.sm }}>
      <TextInput
        value={sorgu}
        onChangeText={setSorgu}
        placeholder={m.listeAra}
        placeholderTextColor={tema.renk.metinSilik}
        accessibilityLabel={m.listeAra}
        style={{
          minHeight: tema.dokunmaHedefi,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tema.renk.cizgi,
          borderRadius: tema.yaricap.md,
          paddingHorizontal: tema.bosluk.lg,
          fontSize: 16,
          fontFamily: tema.tipografi.aileler.govde,
          color: tema.renk.metin,
          backgroundColor: tema.renk.yuzey,
        }}
      />

      {secili && !eslesen.includes(secili) ? (
        <SecimDugmesi baslik={secili} secili onPress={() => onDegisim(secili)} />
      ) : null}

      {eslesen.length === 0 ? (
        <Yazi tur="kucuk" renk="metinSilik">
          {m.listeSonucYok}
        </Yazi>
      ) : (
        eslesen.map((secenek) => (
          <SecimDugmesi
            key={secenek}
            baslik={secenek}
            secili={secili === secenek}
            onPress={() => onDegisim(secenek)}
          />
        ))
      )}
    </View>
  );
}

function CokluSecim({ soru, deger, onDegisim }: Omit<SoruAlaniProps, 'hata'>) {
  const tema = useTema();
  const m = useMetinler().degerlendirme;
  if (soru.id === 'E3') {
    return <EkipmanEnvanteri soru={soru} deger={deger} onDegisim={onDegisim} />;
  }

  const secili = Array.isArray(deger) ? (deger as string[]) : [];
  const secenekler = soru.options ?? [];
  // "Yok" / "Hayır" gibi dışlayıcı seçenekler diğerleriyle birlikte işaretlenemez.
  const dislayicilar = ['Yok', 'Hayır', 'Hiçbiri, vücut ağırlığı'];

  const degistir = (secenek: string) => {
    if (dislayicilar.includes(secenek)) {
      onDegisim(secili.includes(secenek) ? [] : [secenek]);
      return;
    }
    const temiz = secili.filter((s) => !dislayicilar.includes(s));
    onDegisim(temiz.includes(secenek) ? temiz.filter((s) => s !== secenek) : [...temiz, secenek]);
  };

  return (
    <View style={{ gap: tema.bosluk.sm }}>
      {soru.maxSelect ? (
        <Yazi tur="kucuk" renk="metinSilik">
          {m.enFazlaSecim(soru.maxSelect)}
        </Yazi>
      ) : null}
      {secenekler.map((secenek) => (
        <SecimDugmesi
          key={secenek}
          baslik={secenek}
          secili={secili.includes(secenek)}
          onPress={() => degistir(secenek)}
          cokluSecim
        />
      ))}
    </View>
  );
}

function Olcek({ soru, deger, onDegisim }: Omit<SoruAlaniProps, 'hata'>) {
  const tema = useTema();
  const alt = soru.min ?? 1;
  const ust = soru.max ?? 10;
  const degerler = Array.from({ length: ust - alt + 1 }, (_, i) => alt + i);
  const secili = typeof deger === 'number' ? deger : undefined;

  return (
    <View style={{ gap: tema.bosluk.sm }}>
      <Satir arasi="xs" dagit="space-between">
        {degerler.map((d) => (
          <Pressable
            key={d}
            onPress={() => onDegisim(d)}
            accessibilityRole="radio"
            accessibilityLabel={`${d}`}
            accessibilityState={{ checked: secili === d }}
            style={{
              flex: 1,
              minHeight: tema.dokunmaHedefi,
              borderRadius: tema.yaricap.sm,
              borderWidth: secili === d ? 2 : StyleSheet.hairlineWidth,
              borderColor: secili === d ? tema.renk.aksan : tema.renk.cizgi,
              backgroundColor: secili === d ? tema.renk.aksanZemin : tema.renk.yuzey,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sayi tur="kucuk" renk={secili === d ? 'aksan' : 'metinYumusak'}>
              {d}
            </Sayi>
          </Pressable>
        ))}
      </Satir>

      {soru.labels ? (
        <Satir dagit="space-between">
          <Yazi tur="etiket" renk="metinSilik">
            {soru.labels[String(alt)] ?? ''}
          </Yazi>
          <Yazi tur="etiket" renk="metinSilik">
            {soru.labels[String(ust)] ?? ''}
          </Yazi>
        </Satir>
      ) : null}
    </View>
  );
}

/**
 * Sayı girişi.
 *
 * Alan sıradan bir metin kutusu gibi duruyordu ve bunun en büyük sebebi yer tutucuydu:
 * içinde "120-230" yazan bir kutu, bir form alanı okur — okunacak bir değer değil.
 * Geçerli aralık artık yer tutucu değil, alanın altında duran sessiz bir künye satırı;
 * kutunun içinde yalnızca kullanıcının kendi sayısı var.
 *
 * Sayı monospace ve sağa dayalı: birim tam yanında sabit bir sütunda duruyor, alan bir
 * gösterge penceresi gibi okunuyor.
 */
function SayiGirisi({ soru, deger, onDegisim }: Omit<SoruAlaniProps, 'hata'>) {
  const tema = useTema();
  const [metin, setMetin] = useState(deger === undefined || deger === null ? '' : String(deger));
  const aralikVar = soru.min !== undefined && soru.max !== undefined;

  return (
    <View style={{ gap: tema.bosluk.xs }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: tema.dokunmaHedefi,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tema.renk.cizgi,
          borderRadius: tema.yaricap.md,
          backgroundColor: tema.renk.yuzey,
          paddingHorizontal: tema.bosluk.lg,
          gap: tema.bosluk.sm,
        }}
      >
        <TextInput
          value={metin}
          onChangeText={(yeni) => {
            setMetin(yeni);
            const temiz = yeni.replace(',', '.');
            const sayi = Number(temiz);
            onDegisim(temiz === '' || !Number.isFinite(sayi) ? null : sayi);
          }}
          keyboardType="decimal-pad"
          accessibilityLabel={soru.text}
          style={{
            flex: 1,
            minHeight: tema.dokunmaHedefi,
            fontSize: 22,
            fontFamily: tema.tipografi.aileler.sayisal,
            textAlign: 'right',
            color: tema.renk.metin,
          }}
        />
        {soru.unit ? (
          <Yazi tur="baslik3" renk="metinSilik">
            {soru.unit}
          </Yazi>
        ) : null}
      </View>

      {aralikVar ? (
        <Sayi tur="etiket" renk="metinSilik">
          {soru.min}–{soru.max}
          {soru.unit ? ` ${soru.unit}` : ''}
        </Sayi>
      ) : null}
    </View>
  );
}

function MetinGirisi({
  deger,
  onDegisim,
  cokSatir,
}: {
  deger: CevapDegeri;
  onDegisim: (d: CevapDegeri) => void;
  cokSatir: boolean;
}) {
  const tema = useTema();

  return (
    <TextInput
      value={typeof deger === 'string' ? deger : ''}
      onChangeText={(yeni) => onDegisim(yeni === '' ? null : yeni)}
      multiline={cokSatir}
      numberOfLines={cokSatir ? 5 : 1}
      style={{
        minHeight: cokSatir ? 120 : tema.dokunmaHedefi,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: tema.renk.cizgi,
        borderRadius: tema.yaricap.md,
        padding: tema.bosluk.lg,
        fontSize: 16,
        fontFamily: tema.tipografi.aileler.govde,
        color: tema.renk.metin,
        backgroundColor: tema.renk.yuzey,
        textAlignVertical: cokSatir ? 'top' : 'center',
      }}
    />
  );
}

/**
 * Gün / ay / yıl girişi.
 *
 * Üç parça **yerel durumda** tutulur. Daha önce üçü de üst durumdan okunuyordu, ama
 * eksik girişte üst duruma `null` yazılıyordu: gün yazılınca ay ve yıl siliniyor,
 * ay yazılınca gün siliniyordu. Üç parça hiçbir zaman aynı anda bilinemediği için
 * tarih tamamlanamıyor ve değerlendirmenin **ilk sorusunda** "Devam et" hiç açılmıyordu.
 *
 * Birleştirme ve doğrulama `tarihBirlestir` içinde, saf ve test edilmiş.
 */
function TarihGirisi({
  deger,
  onDegisim,
}: {
  deger: CevapDegeri;
  onDegisim: (d: CevapDegeri) => void;
}) {
  const tema = useTema();
  const m = useMetinler().degerlendirme;
  const baslangic = tarihParcala(typeof deger === 'string' ? deger : null);
  const [parca, setParca] = useState<TarihParcalari>(baslangic);

  const guncelle = (yeni: Partial<TarihParcalari>) => {
    const sonraki = { ...parca, ...yeni };
    setParca(sonraki);
    onDegisim(tarihBirlestir(sonraki.gun, sonraki.ay, sonraki.yil));
  };

  const { gun, ay, yil } = parca;

  const alanStili = {
    minHeight: tema.dokunmaHedefi,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tema.renk.cizgi,
    borderRadius: tema.yaricap.md,
    paddingHorizontal: tema.bosluk.md,
    fontSize: 18,
    fontVariant: ['tabular-nums'] as 'tabular-nums'[],
    color: tema.renk.metin,
    backgroundColor: tema.renk.yuzey,
    textAlign: 'center' as const,
  };

  return (
    <Satir arasi="sm">
      <TextInput
        value={gun}
        onChangeText={(v) => guncelle({ gun: v })}
        placeholder={m.gunKisa}
        placeholderTextColor={tema.renk.metinSilik}
        keyboardType="number-pad"
        maxLength={2}
        accessibilityLabel={m.gun}
        style={[alanStili, { flex: 1 }]}
      />
      <TextInput
        value={ay}
        onChangeText={(v) => guncelle({ ay: v })}
        placeholder={m.ayKisa}
        placeholderTextColor={tema.renk.metinSilik}
        keyboardType="number-pad"
        maxLength={2}
        accessibilityLabel={m.ay}
        style={[alanStili, { flex: 1 }]}
      />
      <TextInput
        value={yil}
        onChangeText={(v) => guncelle({ yil: v })}
        placeholder={m.yilKisa}
        placeholderTextColor={tema.renk.metinSilik}
        keyboardType="number-pad"
        maxLength={4}
        accessibilityLabel={m.yil}
        style={[alanStili, { flex: 1.6 }]}
      />
    </Satir>
  );
}

function SaatGirisi({
  deger,
  onDegisim,
}: {
  deger: CevapDegeri;
  onDegisim: (d: CevapDegeri) => void;
}) {
  const tema = useTema();
  const m = useMetinler().degerlendirme;
  return (
    <TextInput
      value={typeof deger === 'string' ? deger : ''}
      onChangeText={(v) => onDegisim(v === '' ? null : v)}
      placeholder="18:30"
      placeholderTextColor={tema.renk.metinSilik}
      keyboardType="numbers-and-punctuation"
      maxLength={5}
      accessibilityLabel={m.saat}
      style={{
        minHeight: tema.dokunmaHedefi,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: tema.renk.cizgi,
        borderRadius: tema.yaricap.md,
        paddingHorizontal: tema.bosluk.lg,
        fontSize: 18,
        fontFamily: tema.tipografi.aileler.sayisal,
        fontVariant: ['tabular-nums'],
        color: tema.renk.metin,
        backgroundColor: tema.renk.yuzey,
      }}
    />
  );
}

function TarihAraligi({
  deger,
  onDegisim,
}: {
  deger: CevapDegeri;
  onDegisim: (d: CevapDegeri) => void;
}) {
  const m = useMetinler().degerlendirme;
  const mevcut = (deger ?? {}) as { baslangic?: string; bitis?: string };

  return (
    <View style={{ gap: 12 }}>
      <Yazi tur="kucuk" renk="metinSilik">
        {m.baslangic}
      </Yazi>
      <TarihGirisi
        deger={mevcut.baslangic ?? null}
        onDegisim={(v) => onDegisim({ ...mevcut, baslangic: v as string })}
      />
      <Yazi tur="kucuk" renk="metinSilik">
        {m.bitis}
      </Yazi>
      <TarihGirisi
        deger={mevcut.bitis ?? null}
        onDegisim={(v) => onDegisim({ ...mevcut, bitis: v as string })}
      />
    </View>
  );
}

function OlcuGrubu({ soru, deger, onDegisim }: Omit<SoruAlaniProps, 'hata'>) {
  const tema = useTema();
  const m = useMetinler().degerlendirme;
  const etiket = (alan: string) => m.alanEtiketleri[alan as keyof typeof m.alanEtiketleri] ?? alan;
  const mevcut = (deger ?? {}) as Record<string, number | null>;
  const alanlar = soru.fields ?? [];

  return (
    <View style={{ gap: tema.bosluk.md }}>
      {alanlar.map((alan) => (
        <View key={alan} style={{ gap: tema.bosluk.xs }}>
          <Yazi tur="kucuk" renk="metinYumusak">
            {etiket(alan)}
          </Yazi>
          <TextInput
            defaultValue={
              mevcut[alan] === undefined || mevcut[alan] === null ? '' : String(mevcut[alan])
            }
            onChangeText={(v) => {
              const sayi = Number(v.replace(',', '.'));
              onDegisim({ ...mevcut, [alan]: v === '' || !Number.isFinite(sayi) ? null : sayi });
            }}
            keyboardType="decimal-pad"
            accessibilityLabel={etiket(alan)}
            style={{
              minHeight: tema.dokunmaHedefi,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: tema.renk.cizgi,
              borderRadius: tema.yaricap.md,
              paddingHorizontal: tema.bosluk.lg,
              fontSize: 18,
              fontFamily: tema.tipografi.aileler.sayisal,
              fontVariant: ['tabular-nums'],
              color: tema.renk.metin,
              backgroundColor: tema.renk.yuzey,
            }}
          />
        </View>
      ))}
    </View>
  );
}

function YukGirisi({ soru, deger, onDegisim }: Omit<SoruAlaniProps, 'hata'>) {
  const tema = useTema();
  const m = useMetinler().degerlendirme;
  const mevcut = (deger ?? {}) as { kg?: number | null; tekrar?: number | null };

  return (
    <Kart>
      <Yazi tur="kucuk" renk="metinSilik">
        {soru.kalem ?? 'Hareket'} — en iyi setin
      </Yazi>
      <Satir arasi="md">
        <View style={{ flex: 1, gap: tema.bosluk.xs }}>
          <Yazi tur="etiket" renk="metinSilik">
            {m.agirlikBasligi}
          </Yazi>
          <TextInput
            defaultValue={mevcut.kg ? String(mevcut.kg) : ''}
            onChangeText={(v) => {
              const sayi = Number(v.replace(',', '.'));
              onDegisim({ ...mevcut, kg: Number.isFinite(sayi) && v !== '' ? sayi : null });
            }}
            keyboardType="decimal-pad"
            accessibilityLabel={m.agirlikErisim}
            style={girisStili(tema)}
          />
        </View>
        <View style={{ flex: 1, gap: tema.bosluk.xs }}>
          <Yazi tur="etiket" renk="metinSilik">
            {m.tekrarBasligi}
          </Yazi>
          <TextInput
            defaultValue={mevcut.tekrar ? String(mevcut.tekrar) : ''}
            onChangeText={(v) => {
              const sayi = Number(v);
              onDegisim({ ...mevcut, tekrar: Number.isFinite(sayi) && v !== '' ? sayi : null });
            }}
            keyboardType="number-pad"
            accessibilityLabel={m.tekrarErisim}
            style={girisStili(tema)}
          />
        </View>
      </Satir>
    </Kart>
  );
}

function girisStili(tema: ReturnType<typeof useTema>) {
  return {
    minHeight: tema.dokunmaHedefi,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tema.renk.cizgi,
    borderRadius: tema.yaricap.md,
    paddingHorizontal: tema.bosluk.md,
    fontSize: 18,
    fontVariant: ['tabular-nums'] as 'tabular-nums'[],
    color: tema.renk.metin,
    backgroundColor: tema.renk.zemin,
  };
}

function RizaOnayi({ soru, deger, onDegisim }: Omit<SoruAlaniProps, 'hata'>) {
  const tema = useTema();
  const m = useMetinler().degerlendirme;
  const metin = typeof soru.metin === 'string' ? soru.metin : '';

  return (
    <View style={{ gap: tema.bosluk.md }}>
      <Kart>
        <Yazi tur="kucuk" renk="metinYumusak">
          {metin}
        </Yazi>
      </Kart>
      <Ayirac />
      <SecimDugmesi
        baslik={m.okudumRizaVeriyorum}
        secili={deger === true}
        onPress={() => onDegisim(deger === true ? null : true)}
        cokluSecim
      />
    </View>
  );
}
