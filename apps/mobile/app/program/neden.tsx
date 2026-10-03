import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { grupAdi } from '@swiip/core';
import type { HacimGrubu, Karar as DomainKarar, KararParametreleri, Metinler } from '@swiip/shared';
import { girdiDegeri, girdiSorusu, kararGirdisiMetni, kararMetni } from '@swiip/shared';
import {
  BosDurum,
  Dugme,
  Ekran,
  Etiket,
  Kart,
  Sayi,
  Satir,
  Yazi,
  Yukleniyor,
} from '../../src/tasarim/bilesenler';
import { useTema } from '../../src/tasarim/tema';
import { istek } from '../../src/veri/api';
import { useDil, useMetinler } from '../../src/durum/Oturum';

/**
 * "Neden bu program" — karar izinin tamamı.
 *
 * Rakibin veremediği şey program değil, o programın neden sana ait olduğunun kanıtı.
 * Bu ekran o kanıtı ham hâliyle gösterir: hangi kural ateşlendi, hangi cevaptan doğdu.
 */

interface ProgramCevabi {
  hafta: number;
  split: { tip: string; gerekce: string; gun_sayisi: number };
  butce: Record<string, number>;
  uyarilar: string[];
}

interface Karar {
  entity_type: string;
  entity_id: string;
  rule_fired: string[];
  inputs_jsonb: Array<{ soru_id: string; deger: string }>;
  parametreler_jsonb?: KararParametreleri;
  explanation_tr: string;
}

/**
 * Karar izinden kullanıcının dilinde cümle kurar.
 *
 * Motor metin üretmiyor; kural kimliği ve parametre üretiyor. `explanation_tr` motorun
 * Türkçe izi ve kayıtta duran o; çeviremediğimiz bir kararda cümle uydurmak yerine ona
 * düşüyoruz — sağlık bağlamında yanlış bir gerekçe, yabancı dilde doğru olandan kötüdür.
 */
function kararCumlesi(karar: Karar, gerekce: Metinler['gerekce']): string {
  return kararMetni(
    {
      id: karar.entity_id,
      entity_tipi: karar.entity_type as DomainKarar['entity_tipi'],
      entity_id: karar.entity_id,
      kurallar: karar.rule_fired,
      girdiler: karar.inputs_jsonb,
      parametreler: karar.parametreler_jsonb,
      aciklama_tr: karar.explanation_tr,
    },
    gerekce,
  );
}

export default function NedenBuProgram() {
  const tema = useTema();
  const m = useMetinler().program.neden;
  const mk = useMetinler().program.keskinlestirme;
  const [program, setProgram] = useState<ProgramCevabi | null>(null);
  const [kararlar, setKararlar] = useState<Karar[]>([]);
  const [keskinlestirilebilir, setKeskinlestirilebilir] = useState(0);
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    void (async () => {
      const p = await istek<ProgramCevabi>('/v1/program/aktif').catch(() => null);
      const d = await istek<{ kararlar: Karar[] }>('/v1/hesap/disa-aktar').catch(() => null);
      const k = await istek<{ teklifler: unknown[] }>('/v1/degerlendirme/keskinlestirme').catch(
        () => null,
      );
      setProgram(p);
      setKararlar(d?.kararlar ?? []);
      setKeskinlestirilebilir(k?.teklifler.length ?? 0);
      setHazir(true);
    })();
  }, []);

  if (!hazir) {
    return (
      <View style={{ flex: 1, backgroundColor: tema.renk.zemin, justifyContent: 'center' }}>
        <Yukleniyor />
      </View>
    );
  }

  const havuzKararlari = kararlar.filter((k) => k.entity_type === 'havuz');
  const hacimKararlari = kararlar.filter((k) => k.entity_type === 'hacim');
  const hareketKararlari = kararlar.filter((k) => k.entity_type === 'hareket');

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: m.sayfaBasligi }} />
      <Ekran>
        <Yazi tur="baslik1">{m.baslik}</Yazi>
        <Yazi renk="metinYumusak">{m.girisMetni}</Yazi>

        {program ? (
          <Kart vurgulu>
            <Yazi tur="etiket" renk="aksan">
              {m.programYapisi}
            </Yazi>
            <Yazi renk="metinYumusak">{program.split.gerekce}</Yazi>
          </Kart>
        ) : null}

        {program && Object.keys(program.butce).length > 0 ? (
          <Kart>
            <Yazi tur="baslik3">{m.hacimButcesi}</Yazi>
            <Yazi tur="kucuk" renk="metinSilik">
              {m.hacimButcesiNotu}
            </Yazi>
            <View style={{ gap: tema.bosluk.xs, marginTop: tema.bosluk.sm }}>
              {Object.entries(program.butce)
                .sort(([, a], [, b]) => b - a)
                .map(([grup, set]) => (
                  <Satir key={grup} dagit="space-between">
                    <Yazi tur="kucuk">{grupAdi(grup as HacimGrubu)}</Yazi>
                    <Sayi tur="kucuk" renk="aksan">
                      {set} {m.setBirimi}
                    </Sayi>
                  </Satir>
                ))}
            </View>
          </Kart>
        ) : null}

        {hacimKararlari.length > 0 ? (
          <Kart>
            <Yazi tur="baslik3">{m.hacimDuzeltmeleri}</Yazi>
            {hacimKararlari.map((karar, i) => (
              <KararSatiri key={i} karar={karar} />
            ))}
          </Kart>
        ) : null}

        {havuzKararlari.length > 0 ? (
          <Kart>
            <Yazi tur="baslik3">{m.havuzdanCikanlar}</Yazi>
            <Yazi tur="kucuk" renk="metinSilik">
              {m.havuzdanCikanlarNotu}
            </Yazi>
            {havuzKararlari.map((karar, i) => (
              <KararSatiri key={i} karar={karar} />
            ))}

            {/*
              Karar izinin tersi: bu elemelerin bir kısmı CEVAPLANMAMIŞ bir sorudan
              doğuyor. Kullanıcıya "daha çok soru cevapla" demek yerine, bedeli görünen
              bir teklif veriyoruz — ve teklif ancak gerçekten bir karar buna dayanıyorsa
              çıkıyor.
            */}
            {keskinlestirilebilir > 0 ? (
              <View style={{ marginTop: tema.bosluk.md, gap: tema.bosluk.xs }}>
                <Yazi tur="kucuk" renk="metinYumusak">
                  {mk.girisMetni}
                </Yazi>
                <Dugme
                  baslik={mk.sayfaBasligi}
                  tur="ikincil"
                  onPress={() => router.push('/program/keskinlestir')}
                />
              </View>
            ) : null}
          </Kart>
        ) : null}

        {hareketKararlari.length > 0 ? (
          <Kart>
            <Yazi tur="baslik3">{m.hareketSecimleri}</Yazi>
            {hareketKararlari.slice(0, 20).map((karar, i) => (
              <KararSatiri key={i} karar={karar} />
            ))}
          </Kart>
        ) : (
          <BosDurum baslik={m.bosBaslik} govde={m.bosGovde} />
        )}
      </Ekran>
    </>
  );
}

function KararSatiri({ karar }: { karar: Karar }) {
  const tema = useTema();
  const m = useMetinler().program.neden;
  const gerekce = useMetinler().gerekce;
  const dil = useDil();

  return (
    <View
      style={{
        gap: tema.bosluk.xs,
        paddingVertical: tema.bosluk.sm,
        borderTopWidth: 1,
        borderTopColor: tema.renk.cizgi,
      }}
    >
      <Yazi tur="kucuk" renk="metinYumusak">
        {kararCumlesi(karar, gerekce)}
      </Yazi>
      {/* Kural etiketleri SARIYOR: dört etiket dar ekranda sağdan taşıyordu. */}
      <Satir arasi="xs" sar>
        {karar.rule_fired.slice(0, 4).map((kural) => (
          <Etiket key={kural} metin={m.kuralAdlari[kural as keyof typeof m.kuralAdlari] ?? kural} />
        ))}
      </Satir>
      {karar.inputs_jsonb.length > 0 ? (
        <Yazi tur="etiket" renk="metinSilik">
          {/* Kimlik değil soru; değer kullanıcının dilinde (bkz. `hareket.tsx`). */}
          {karar.inputs_jsonb
            .map(
              (g) =>
                `${girdiSorusu(g.soru_id, dil) ?? g.soru_id}: ${kararGirdisiMetni(
                  girdiDegeri(g.soru_id, g.deger, dil),
                  gerekce,
                )}`,
            )
            .join(' · ')}
        </Yazi>
      ) : null}
    </View>
  );
}
