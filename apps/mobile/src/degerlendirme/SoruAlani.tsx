import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { Soru } from '@made2fit/shared';
import { Ayirac, Kart, Sayi, Satir, SecimDugmesi, Yazi } from '../tasarim/bilesenler';
import { useTema } from '../tasarim/tema';
import { useMetinler } from '../durum/Oturum';
import { VucutHaritasi } from './VucutHaritasi';
import { HedefVucutSecimi } from './HedefVucutSecimi';
import { EkipmanEnvanteri } from './EkipmanEnvanteri';

/**
 * Soru tipi başına bileşen (F2.2).
 * Değer yukarıda tutulur; bu bileşen durumsuzdur, böylece kaldığı yerden devam eden
 * akışta ekran ile veri hiçbir zaman ayrışmaz.
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

function TekSecim({ soru, deger, onDegisim }: Omit<SoruAlaniProps, 'hata'>) {
  const tema = useTema();

  // Ekipman envanteri görsel çoklu seçim olarak ayrı ele alınır.
  if (soru.id === 'E3') {
    return <EkipmanEnvanteri soru={soru} deger={deger} onDegisim={onDegisim} />;
  }

  const secenekler = soru.options ?? [];

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

function SayiGirisi({ soru, deger, onDegisim }: Omit<SoruAlaniProps, 'hata'>) {
  const tema = useTema();
  const [metin, setMetin] = useState(deger === undefined || deger === null ? '' : String(deger));

  return (
    <Satir arasi="sm">
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
        placeholder={soru.min !== undefined ? `${soru.min}-${soru.max}` : ''}
        placeholderTextColor={tema.renk.metinSilik}
        style={{
          flex: 1,
          minHeight: tema.dokunmaHedefi,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tema.renk.cizgi,
          borderRadius: tema.yaricap.md,
          paddingHorizontal: tema.bosluk.lg,
          fontSize: 20,
          fontVariant: ['tabular-nums'],
          color: tema.renk.metin,
          backgroundColor: tema.renk.yuzey,
        }}
      />
      {soru.unit ? (
        <Yazi tur="baslik3" renk="metinSilik">
          {soru.unit}
        </Yazi>
      ) : null}
    </Satir>
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
        color: tema.renk.metin,
        backgroundColor: tema.renk.yuzey,
        textAlignVertical: cokSatir ? 'top' : 'center',
      }}
    />
  );
}

function TarihGirisi({
  deger,
  onDegisim,
}: {
  deger: CevapDegeri;
  onDegisim: (d: CevapDegeri) => void;
}) {
  const tema = useTema();
  const m = useMetinler().degerlendirme;
  const mevcut = typeof deger === 'string' ? deger : '';
  const [gun, ay, yil] = mevcut ? mevcut.split('-').reverse() : ['', '', ''];

  const guncelle = (g: string, a: string, y: string) => {
    if (g.length === 2 && a.length === 2 && y.length === 4) {
      onDegisim(`${y}-${a.padStart(2, '0')}-${g.padStart(2, '0')}`);
    } else {
      onDegisim(null);
    }
  };

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
        defaultValue={gun ?? ''}
        onChangeText={(v) => guncelle(v, ay ?? '', yil ?? '')}
        placeholder={m.gunKisa}
        placeholderTextColor={tema.renk.metinSilik}
        keyboardType="number-pad"
        maxLength={2}
        accessibilityLabel={m.gun}
        style={[alanStili, { flex: 1 }]}
      />
      <TextInput
        defaultValue={ay ?? ''}
        onChangeText={(v) => guncelle(gun ?? '', v, yil ?? '')}
        placeholder={m.ayKisa}
        placeholderTextColor={tema.renk.metinSilik}
        keyboardType="number-pad"
        maxLength={2}
        accessibilityLabel={m.ay}
        style={[alanStili, { flex: 1 }]}
      />
      <TextInput
        defaultValue={yil ?? ''}
        onChangeText={(v) => guncelle(gun ?? '', ay ?? '', v)}
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
