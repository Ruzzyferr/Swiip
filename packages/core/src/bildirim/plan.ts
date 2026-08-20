/**
 * Bildirim planı.
 *
 * Neden çekirdekte: bildirim metni ve zamanlaması bir ürün kararı, bir platform detayı
 * değil. Burada saf ve deterministik durursa hem test edilebilir hem de iOS/Android
 * adaptörleri yalnızca "kur/iptal et" işini yapar.
 *
 * Kural: bildirim bir hatırlatmadır, bir dürtme değil.
 *  - Seri bozulma uyarısı yok. Suçluluk dili yok. "Seni özledik" yok.
 *  - Sessiz saat dışına hiçbir şey kurulmaz.
 *  - Kullanıcı açmadıysa yalnızca seans hatırlatması çalışır.
 */

export interface BildirimTercihleri {
  seans_hatirlatmasi: boolean;
  /** 'HH:MM'. Bozuk biçim varsayılana düşer. */
  seans_saati: string;
  geri_bildirim_hatirlatmasi: boolean;
  haftalik_ozet: boolean;
  olcum_hatirlatmasi: boolean;
  su_hatirlatmasi: boolean;
}

export type BildirimTuru = 'seans' | 'geri_bildirim' | 'haftalik_ozet' | 'olcum' | 'su';

export type BildirimTekrari = 'haftalik' | 'dort_haftada_bir';

export interface PlanliBildirim {
  tur: BildirimTuru;
  /** 0 = Pazar … 6 = Cumartesi */
  haftaGunu: number;
  saat: number;
  dakika: number;
  tekrar: BildirimTekrari;
  baslik: string;
  govde: string;
}

export interface PlanGirdisi {
  /** Haftanın hangi günlerinde antrenman var (0 = Pazar). */
  antrenmanGunleri: number[];
}

/** Bu saatten sonra bildirim yok. */
export const SESSIZ_BASLANGIC = 22;
/**
 * Bu saatten önce bildirim yok.
 *
 * 07:00'de duruyoruz, 08:00'de değil: sabah antrenmanı yapan biri 07:30'u kendi seçer ve
 * o seçime saygı duymalıyız. 05:00 ise bizim kurduğumuz bir alarm olurdu — orası sınır.
 */
export const SESSIZ_BITIS = 7;

const VARSAYILAN_SAAT = 18;
const VARSAYILAN_DAKIKA = 0;

/** Seanstan bu kadar sonra geri bildirim sorulur — duş ve yol payı. */
const GERI_BILDIRIM_GECIKMESI_DK = 90;

const SU_SAATLERI = [11, 15, 19];

interface Zaman {
  saat: number;
  dakika: number;
}

function saatiAyristir(ham: string): Zaman {
  const eslesme = /^(\d{1,2}):(\d{2})$/.exec(ham.trim());
  if (!eslesme) return { saat: VARSAYILAN_SAAT, dakika: VARSAYILAN_DAKIKA };

  const saat = Number(eslesme[1]);
  const dakika = Number(eslesme[2]);
  if (saat > 23 || dakika > 59) return { saat: VARSAYILAN_SAAT, dakika: VARSAYILAN_DAKIKA };

  return { saat, dakika };
}

/** Sessiz saat dışına düşen bir zamanı en yakın izinli sınıra çeker. */
function sessizSaateSigdir(zaman: Zaman): Zaman {
  if (zaman.saat < SESSIZ_BITIS) return { saat: SESSIZ_BITIS, dakika: 0 };
  if (zaman.saat > SESSIZ_BASLANGIC || (zaman.saat === SESSIZ_BASLANGIC && zaman.dakika > 0)) {
    return { saat: SESSIZ_BASLANGIC, dakika: 0 };
  }
  return zaman;
}

function dakikaEkle(zaman: Zaman, ekleme: number): Zaman {
  const toplam = zaman.saat * 60 + zaman.dakika + ekleme;
  // Gün taşarsa ertesi güne atlamıyoruz: hatırlatma seansın kendi gününe ait.
  if (toplam >= 24 * 60) return { saat: 23, dakika: 59 };
  return { saat: Math.floor(toplam / 60), dakika: toplam % 60 };
}

/** Geçersiz ve tekrarlı gün numaralarını eler, sıraya koyar. */
function gunleriTemizle(gunler: number[]): number[] {
  const gecerli = gunler.filter((g) => Number.isInteger(g) && g >= 0 && g <= 6);
  return [...new Set(gecerli)].sort((a, b) => a - b);
}

/**
 * Bildirim metinleri — sözlükten geliyor, çekirdekte yazılı değil.
 *
 * Ekranlar sözlükten okuyor ve `npm run ceviri` bunu denetliyor; bildirimler o denetimin
 * kapsamı dışındaydı çünkü metin ekranda değil burada üretiliyordu. Sonuç: uygulamayı
 * İngilizce kullanan kişiye Türkçe bildirim gidiyordu.
 *
 * Bildirim, kullanıcının uygulamayı açmadan gördüğü tek yüzümüz.
 */
export interface BildirimMetni {
  baslik: string;
  govde: string;
}

export interface BildirimMetinleri {
  seans: BildirimMetni;
  geriBildirim: BildirimMetni;
  haftalikOzet: BildirimMetni;
  olcum: BildirimMetni;
  su: BildirimMetni;
}

export function bildirimPlaniHesapla(
  tercihler: BildirimTercihleri,
  girdi: PlanGirdisi,
  metinler: BildirimMetinleri,
): PlanliBildirim[] {
  const gunler = gunleriTemizle(girdi.antrenmanGunleri);
  const seansZamani = sessizSaateSigdir(saatiAyristir(tercihler.seans_saati));
  const plan: PlanliBildirim[] = [];

  if (tercihler.seans_hatirlatmasi) {
    for (const gun of gunler) {
      plan.push({
        tur: 'seans',
        haftaGunu: gun,
        saat: seansZamani.saat,
        dakika: seansZamani.dakika,
        tekrar: 'haftalik',
        baslik: metinler.seans.baslik,
        govde: metinler.seans.govde,
      });
    }
  }

  if (tercihler.geri_bildirim_hatirlatmasi) {
    const geriZamani = sessizSaateSigdir(dakikaEkle(seansZamani, GERI_BILDIRIM_GECIKMESI_DK));

    for (const gun of gunler) {
      plan.push({
        tur: 'geri_bildirim',
        haftaGunu: gun,
        saat: geriZamani.saat,
        dakika: geriZamani.dakika,
        tekrar: 'haftalik',
        baslik: metinler.geriBildirim.baslik,
        govde: metinler.geriBildirim.govde,
      });
    }
  }

  if (tercihler.haftalik_ozet) {
    plan.push({
      tur: 'haftalik_ozet',
      haftaGunu: 0,
      saat: 19,
      dakika: 0,
      tekrar: 'haftalik',
      baslik: metinler.haftalikOzet.baslik,
      govde: metinler.haftalikOzet.govde,
    });
  }

  if (tercihler.olcum_hatirlatmasi) {
    plan.push({
      tur: 'olcum',
      haftaGunu: 6,
      saat: 10,
      dakika: 0,
      tekrar: 'dort_haftada_bir',
      baslik: metinler.olcum.baslik,
      govde: metinler.olcum.govde,
    });
  }

  if (tercihler.su_hatirlatmasi) {
    for (const gun of [0, 1, 2, 3, 4, 5, 6]) {
      for (const saat of SU_SAATLERI) {
        plan.push({
          tur: 'su',
          haftaGunu: gun,
          saat,
          dakika: 0,
          tekrar: 'haftalik',
          baslik: metinler.su.baslik,
          govde: metinler.su.govde,
        });
      }
    }
  }

  return cakismalariAyir(plan);
}

/**
 * Aynı gün ve dakikaya düşen bildirimleri beşer dakika kaydırır.
 *
 * Aynı anda iki bildirim gelmesi tek bir bildirimin iki katı rahatsız edici; kullanıcı
 * ikisini birden kapatır. Öncelik sırası ekleme sırası: seans, geri bildirim, sonra
 * isteğe bağlı olanlar.
 */
function cakismalariAyir(plan: PlanliBildirim[]): PlanliBildirim[] {
  const dolu = new Set<string>();
  const sonuc: PlanliBildirim[] = [];

  for (const bildirim of plan) {
    let zaman: Zaman = { saat: bildirim.saat, dakika: bildirim.dakika };
    let anahtar = `${bildirim.haftaGunu}-${zaman.saat}-${zaman.dakika}`;

    let deneme = 0;
    while (dolu.has(anahtar) && deneme < 12) {
      zaman = dakikaEkle(zaman, 5);
      anahtar = `${bildirim.haftaGunu}-${zaman.saat}-${zaman.dakika}`;
      deneme += 1;
    }

    // Kaydırma sessiz saati aşarsa bildirimi hiç kurmayız: geceye taşmaktansa düşsün.
    const sigdirilmis = sessizSaateSigdir(zaman);
    if (sigdirilmis.saat !== zaman.saat || sigdirilmis.dakika !== zaman.dakika) continue;

    dolu.add(anahtar);
    sonuc.push({ ...bildirim, saat: zaman.saat, dakika: zaman.dakika });
  }

  return sonuc;
}

/** Adaptörlerin kullandığı sabit kimlik: aynı bildirim iki kez kurulmasın. */
export function bildirimKimligi(bildirim: PlanliBildirim): string {
  return `${bildirim.tur}-${bildirim.haftaGunu}-${bildirim.saat}-${bildirim.dakika}`;
}
