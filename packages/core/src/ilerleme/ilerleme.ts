import type { GeriBildirim, Hareket, IlerlemeDurumu, Karar } from '@made2fit/shared';
import { epley1rm, yukYuvarla } from '../yuk/tahmin';
import { kirp } from '../profil/olcumler';

/**
 * Çift ilerleme, deload ve geri bildirim tepkisi — spec bölüm 6 aşama 5 ve bölüm 7.
 *
 * Motor bir sonraki seansı hesaplar; 12 haftalık tablo üretmez. Kullanıcı geri bildirim
 * verene kadar gelecek haftanın ağırlıkları var olmaz.
 */

/** İki hafta üst üste zorlanma hacmi düşürür. */
const HACIM_DUSURME_ESIGI = 2;
/** Üç hafta üst üste yorgunluk sinyali deload tetikler. */
const DELOAD_YORGUNLUK_ESIGI = 3;
/** "Yapamadım" cevabında yük bu oranda düşürülür. */
const BASARISIZLIK_DUSUSU = 0.9;
/** Ağrı bildiriminde yük bu oranda düşürülür. */
const AGRI_DUSUSU = 0.8;
/** Deload haftasında yük ve hacim çarpanları. */
const DELOAD_YUK = 0.9;
const DELOAD_SET_ORANI = 0.6;
/** Boş barın altına inilmez. */
const BARBELL_TABAN_KG = 20;

/**
 * Vücut ağırlığı hareketlerinde tekrar tavanı.
 *
 * Yük eklenemeyen harekette ilerleme tekrar artırarak sürer — ama sınırsız değil.
 * Yirmi tekrarın üstünde uyaran kuvvet ve hipertrofiden dayanıklılığa kayar; kırk tekrar
 * şınav kas kazandırmaz, yalnızca zaman harcatır.
 *
 * Doğru cevap daha çok tekrar değil, daha zor varyasyon: kullanıcı hareketi değiştirmeye
 * yönlendirilir ve sebebi söylenir.
 */
export const TEKRAR_TAVANI = 20;

export interface IlerlemeGirdisi {
  durum: IlerlemeDurumu;
  hareket: Hareket;
  sonuc: GeriBildirim;
  agri: boolean;
  hafta: number;
  toparlanmaSkoru: number;
  tekrarAlt: number;
  tekrarUst: number;
  set: number;
}

export interface IlerlemeSonucu {
  durum: IlerlemeDurumu;
  /** Bir sonraki seansta set sayısına uygulanacak değişim. */
  set_degisimi: number;
  deload: boolean;
  /** Ağrı sürüyorsa hareket muadille değiştirilmeli. */
  hareket_degistir: boolean;
  /** Kullanıcıya anında gösterilen motor kararı. */
  mesaj: string;
  karar: Karar;
}

/** Toparlanma kapasitesi düştükçe deload sıklaşır. */
export function deloadAraligi(toparlanmaSkoru: number): number {
  if (toparlanmaSkoru >= 0.75) return 6;
  if (toparlanmaSkoru >= 0.5) return 5;
  return 4;
}

export interface DeloadGirdisi {
  hafta: number;
  sonDeloadHafta?: number;
  toparlanmaSkoru: number;
  ustusteZorlanma: number;
}

export function deloadGerekli(girdi: DeloadGirdisi): boolean {
  if (girdi.ustusteZorlanma >= DELOAD_YORGUNLUK_ESIGI) return true;
  const referans = girdi.sonDeloadHafta ?? 1;
  return girdi.hafta - referans >= deloadAraligi(girdi.toparlanmaSkoru);
}

export function ilerlemeUygula(girdi: IlerlemeGirdisi): IlerlemeSonucu {
  const { durum, hareket, sonuc, agri, hafta } = girdi;
  const kurallar: string[] = [];
  const mesajlar: string[] = [];

  let mevcut_kg = durum.mevcut_kg;
  let mevcut_tekrar = durum.mevcut_tekrar;
  let ustuste_basari = durum.ustuste_basari;
  let ustuste_zorlanma = durum.ustuste_zorlanma;
  let set_degisimi = 0;
  let hareket_degistir = false;

  const taban = hareket.ekipman.includes('barbell') ? BARBELL_TABAN_KG : 0;
  const artis = hareket.artis_kg > 0 ? hareket.artis_kg : 2.5;

  if (sonuc === 'tamamladim') {
    ustuste_basari += 1;
    ustuste_zorlanma = 0;
    kurallar.push('cift_ilerleme_basari');

    if (hareket.vucut_agirligi) {
      if (mevcut_tekrar >= TEKRAR_TAVANI) {
        // Tavana gelindi: tekrar eklemek yerine daha zor varyasyona geçilir.
        kurallar.push('tekrar_tavani');
        hareket_degistir = true;
        mesajlar.push(
          `${hareket.ad_tr} artık ${mevcut_tekrar} tekrarla rahat geliyor. Bundan sonrası ` +
            'dayanıklılık antrenmanı olur; daha zor bir varyasyona geçiyoruz.',
        );
      } else {
        // Yük eklenemeyen harekette ilerleme tekrar hedefini yükselterek sürer.
        mevcut_tekrar = Math.min(TEKRAR_TAVANI, mevcut_tekrar + 2);
        mesajlar.push(`${hareket.ad_tr} hedefi ${mevcut_tekrar} tekrara çıkıyor.`);
      }
    } else {
      mevcut_kg = yukYuvarla(mevcut_kg + artis, artis, taban);
      mesajlar.push(`${hareket.ad_tr} ${kgMetni(artis)} kg artıyor → ${kgMetni(mevcut_kg)} kg.`);
    }
  }

  if (sonuc === 'zorlandim') {
    ustuste_zorlanma += 1;
    ustuste_basari = 0;
    kurallar.push('cift_ilerleme_sabit');
    mesajlar.push(`${hareket.ad_tr} sabit, bir hafta daha ${kgMetni(mevcut_kg)} kg.`);

    if (ustuste_zorlanma >= HACIM_DUSURME_ESIGI) {
      set_degisimi = -1;
      kurallar.push('hacim_dusuruldu');
      mesajlar.push(
        `${hareket.ad_tr} hareketinde iki hafta üst üste zorlandın, hacmi bir set düşürdüm.`,
      );
    }
  }

  if (sonuc === 'yapamadim') {
    ustuste_zorlanma += 1;
    ustuste_basari = 0;
    kurallar.push('yuk_dusuruldu');
    if (!hareket.vucut_agirligi) {
      mevcut_kg = yukYuvarla(mevcut_kg * BASARISIZLIK_DUSUSU, artis, taban);
      mesajlar.push(`${hareket.ad_tr} ${kgMetni(mevcut_kg)} kg'a iniyor, tekrar oturtalım.`);
    } else {
      mevcut_tekrar = Math.max(3, mevcut_tekrar - 2);
      mesajlar.push(`${hareket.ad_tr} hedefi ${mevcut_tekrar} tekrara iniyor.`);
    }
  }

  if (agri) {
    kurallar.push('agri_bildirimi');
    hareket_degistir = true;
    if (!hareket.vucut_agirligi) {
      mevcut_kg = yukYuvarla(Math.min(mevcut_kg, durum.mevcut_kg * AGRI_DUSUSU), artis, taban);
    }
    mesajlar.push(
      `Bu harekette ağrı bildirdin. Yükü azalttım ve sana aynı kası çalıştıran bir muadil ` +
        `öneriyorum. Ağrı iki haftadan uzun sürerse bir hekime veya fizyoterapiste görünmeni öneririm.`,
    );
  }

  const deload = deloadGerekli({
    hafta,
    ...(durum.son_deload_hafta !== undefined ? { sonDeloadHafta: durum.son_deload_hafta } : {}),
    toparlanmaSkoru: girdi.toparlanmaSkoru,
    ustusteZorlanma: ustuste_zorlanma,
  });

  let son_deload_hafta = durum.son_deload_hafta;
  if (deload) {
    kurallar.push('deload');
    son_deload_hafta = hafta;
    ustuste_zorlanma = 0;
    ustuste_basari = 0;
    if (!hareket.vucut_agirligi) {
      mevcut_kg = yukYuvarla(mevcut_kg * DELOAD_YUK, artis, taban);
    }
    set_degisimi = Math.min(
      set_degisimi,
      -Math.max(1, Math.round(girdi.set * (1 - DELOAD_SET_ORANI))),
    );
    mesajlar.push(
      'Bu hafta bilinçli olarak hafif: yükü ve set sayısını düşürdüm. Toparlanma, kazanımın ' +
        'gerçekleştiği yerdir; sürekli üstüne binmek ilerlemeyi durdurur.',
    );
  }

  const yeniDurum: IlerlemeDurumu = {
    hareket_id: durum.hareket_id,
    mevcut_kg,
    mevcut_tekrar,
    ustuste_basari,
    ustuste_zorlanma,
    e1rm: hareket.vucut_agirligi
      ? durum.e1rm
      : Math.max(durum.e1rm, epley1rm(mevcut_kg, girdi.tekrarUst)),
  };
  if (son_deload_hafta !== undefined) yeniDurum.son_deload_hafta = son_deload_hafta;

  const mesaj = mesajlar.join(' ');

  return {
    durum: yeniDurum,
    set_degisimi,
    deload,
    hareket_degistir,
    mesaj,
    karar: {
      id: `ilerleme-${durum.hareket_id}-h${hafta}`,
      entity_tipi: 'ilerleme',
      entity_id: durum.hareket_id,
      kurallar,
      girdiler: [
        { soru_id: 'geri_bildirim', deger: sonuc },
        { soru_id: 'agri', deger: agri ? 'evet' : 'hayır' },
        { soru_id: 'hafta', deger: String(hafta) },
      ],
      parametreler: {
        hareket_adi: hareket.ad_tr,
        kg: mevcut_kg,
        tekrar: mevcut_tekrar,
        artis,
        vucut_agirligi: hareket.vucut_agirligi,
      },
      aciklama_tr: mesaj,
    },
  };
}

/** Türkçe ondalık ayırıcı virgüldür; 52.5 değil 52,5. */
export function kgMetni(kg: number): string {
  const yuvarli = Math.round(kg * 100) / 100;
  return Number.isInteger(yuvarli) ? String(yuvarli) : String(yuvarli).replace('.', ',');
}

/** Atlanan seans programı ileri kaydırır; hafta atlanmaz, plan kayar. */
export interface AtlamaSonucu {
  kaydirilan_gun: number;
  mesaj: string;
  karar: Karar;
}

export function seansAtla(gunIndeksi: number, sebep: string, hafta: number): AtlamaSonucu {
  return {
    kaydirilan_gun: gunIndeksi,
    mesaj:
      'Seansı atladın, sorun değil. Programı bir gün kaydırdım; hafta sıfırlanmıyor, ' +
      'kaldığın yerden devam ediyorsun.',
    karar: {
      id: `atlama-h${hafta}-g${gunIndeksi}`,
      entity_tipi: 'ilerleme',
      entity_id: `gun-${gunIndeksi}`,
      kurallar: ['seans_atlandi'],
      girdiler: [
        { soru_id: 'atlama_sebebi', deger: sebep },
        { soru_id: 'hafta', deger: String(hafta) },
      ],
      aciklama_tr: `"${sebep}" sebebiyle atlanan seans ileri kaydırıldı.`,
    },
  };
}

/** Deload haftasında set sayısı bu orana çekilir. */
export function deloadSetSayisi(set: number): number {
  return Math.max(1, Math.round(kirp(set * DELOAD_SET_ORANI, 1, set)));
}
