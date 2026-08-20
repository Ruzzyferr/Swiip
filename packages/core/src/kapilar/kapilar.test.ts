import { describe, expect, it } from 'vitest';
import { kapilariDegerlendir } from './kapilar';
import type { Cevaplar } from '../cevaplar';

/**
 * Dört sert kapı — spec bölüm 4. Atlanamaz.
 * Sağlık bağlamında yanlış program vermek, program vermemekten çok daha kötüdür.
 */

const REFERANS_GUN = new Date('2026-08-19T00:00:00.000Z');

const temizCevaplar: Cevaplar = {
  K1: '1990-05-10',
  K6: 'Hayır',
  K7: 'Evet',
  S2: 'Hayır',
  S3: 'Hayır',
  S7: 'Hayır',
  S18: 'Hayır',
};

describe('kapilariDegerlendir', () => {
  it('temiz cevaplarda hiçbir kapı açılmaz', () => {
    const durum = kapilariDegerlendir(temizCevaplar, { bugun: REFERANS_GUN });

    expect(durum.kapilar).toEqual([]);
    expect(durum.kayit_engelli).toBe(false);
    expect(durum.program_engelli).toBe(false);
    expect(durum.sayilar_gizli).toBe(false);
  });

  describe('yaş kapısı', () => {
    it('K7 = Hayır kaydı engeller', () => {
      const durum = kapilariDegerlendir({ ...temizCevaplar, K7: 'Hayır' }, { bugun: REFERANS_GUN });

      expect(durum.kayit_engelli).toBe(true);
      expect(durum.kapilar.map((k) => k.tip)).toContain('yas');
      expect(durum.kapilar[0]!.eylem).toBe('kayit_reddet');
      expect(durum.kapilar[0]!.tetikleyen).toContain('K7');
    });

    it('K7 = Evet olsa bile doğum tarihi 18 yaş altındaysa kapı açılır', () => {
      const durum = kapilariDegerlendir(
        { ...temizCevaplar, K1: '2010-01-01', K7: 'Evet' },
        { bugun: REFERANS_GUN },
      );

      expect(durum.kayit_engelli).toBe(true);
      expect(durum.kapilar[0]!.tetikleyen).toContain('K1');
    });

    it('doğum gününe bir gün kala hâlâ 18 yaş altı sayılır', () => {
      const durum = kapilariDegerlendir(
        { ...temizCevaplar, K1: '2008-08-20' },
        { bugun: REFERANS_GUN },
      );

      expect(durum.kayit_engelli).toBe(true);
    });

    it('18. doğum gününde kapı açılmaz', () => {
      const durum = kapilariDegerlendir(
        { ...temizCevaplar, K1: '2008-08-19' },
        { bugun: REFERANS_GUN },
      );

      expect(durum.kayit_engelli).toBe(false);
    });
  });

  describe('gebelik kapısı', () => {
    it('K6 = Hamileyim program üretimini durdurur', () => {
      const durum = kapilariDegerlendir(
        { ...temizCevaplar, K6: 'Hamileyim' },
        { bugun: REFERANS_GUN },
      );

      expect(durum.program_engelli).toBe(true);
      expect(durum.kayit_engelli).toBe(false);
      expect(durum.kapilar.map((k) => k.tip)).toContain('gebelik');
    });

    it('K6 = Emziriyorum program üretimini durdurur', () => {
      const durum = kapilariDegerlendir(
        { ...temizCevaplar, K6: 'Emziriyorum' },
        { bugun: REFERANS_GUN },
      );

      expect(durum.program_engelli).toBe(true);
    });

    it('kapı mesajı suçlamaz ve verinin durduğunu söyler', () => {
      const durum = kapilariDegerlendir(
        { ...temizCevaplar, K6: 'Hamileyim' },
        { bugun: REFERANS_GUN },
      );

      const kapi = durum.kapilar.find((k) => k.tip === 'gebelik')!;
      expect(kapi.mesaj).toContain('kaldığın yerden');
    });
  });

  describe('kardiyak kapısı', () => {
    it.each(['S2', 'S3', 'S7'])('%s = Evet programı doktor onayına bağlar', (soru) => {
      const durum = kapilariDegerlendir(
        { ...temizCevaplar, [soru]: 'Evet' },
        { bugun: REFERANS_GUN },
      );

      expect(durum.program_engelli).toBe(true);
      const kapi = durum.kapilar.find((k) => k.tip === 'kardiyak')!;
      expect(kapi.eylem).toBe('doktor_onayi_bekle');
      expect(kapi.tetikleyen).toContain(soru);
    });

    it('birden fazla kardiyak bayrağı tek kapıda toplanır', () => {
      const durum = kapilariDegerlendir(
        { ...temizCevaplar, S2: 'Evet', S3: 'Evet', S7: 'Evet' },
        { bugun: REFERANS_GUN },
      );

      const kardiyak = durum.kapilar.filter((k) => k.tip === 'kardiyak');
      expect(kardiyak).toHaveLength(1);
      expect(kardiyak[0]!.tetikleyen).toEqual(['S2', 'S3', 'S7']);
    });

    it('doktor onayı yüklendiğinde program açılır', () => {
      const durum = kapilariDegerlendir(
        { ...temizCevaplar, S2: 'Evet' },
        { bugun: REFERANS_GUN, doktorOnayiVar: true },
      );

      expect(durum.program_engelli).toBe(false);
      expect(durum.kapilar).toEqual([]);
    });

    it('doktor onayı gebelik kapısını açmaz', () => {
      const durum = kapilariDegerlendir(
        { ...temizCevaplar, K6: 'Hamileyim' },
        { bugun: REFERANS_GUN, doktorOnayiVar: true },
      );

      expect(durum.program_engelli).toBe(true);
    });
  });

  describe('yeme bozukluğu kapısı', () => {
    it('S18 = Evet sayıları gizler ama programı engellemez', () => {
      const durum = kapilariDegerlendir({ ...temizCevaplar, S18: 'Evet' }, { bugun: REFERANS_GUN });

      expect(durum.sayilar_gizli).toBe(true);
      expect(durum.program_engelli).toBe(false);
      expect(durum.kapilar.find((k) => k.tip === 'yeme_bozuklugu')!.eylem).toBe('sayilari_gizle');
    });

    it('paylaşmak istemeyen kullanıcıya ED modu dayatılmaz', () => {
      const durum = kapilariDegerlendir(
        { ...temizCevaplar, S18: 'Paylaşmak istemiyorum' },
        { bugun: REFERANS_GUN },
      );

      expect(durum.sayilar_gizli).toBe(false);
    });

    it('kullanıcı ayarlardan açıkça kapatmadıkça ED modu kalıcıdır', () => {
      const durum = kapilariDegerlendir(
        { ...temizCevaplar, S18: 'Evet' },
        { bugun: REFERANS_GUN, kullaniciSayilariActi: true },
      );

      expect(durum.sayilar_gizli).toBe(false);
      expect(durum.kapilar.map((k) => k.tip)).toContain('yeme_bozuklugu');
    });
  });

  describe('birleşik davranış', () => {
    it('birden fazla kapı aynı anda açılabilir', () => {
      const durum = kapilariDegerlendir(
        { ...temizCevaplar, K6: 'Hamileyim', S2: 'Evet', S18: 'Evet' },
        { bugun: REFERANS_GUN },
      );

      expect(durum.kapilar.map((k) => k.tip)).toEqual(['gebelik', 'kardiyak', 'yeme_bozuklugu']);
      expect(durum.program_engelli).toBe(true);
      expect(durum.sayilar_gizli).toBe(true);
    });

    it('aynı girdi her zaman aynı çıktıyı verir', () => {
      const cevaplar = { ...temizCevaplar, S3: 'Evet', S18: 'Evet' };
      const a = kapilariDegerlendir(cevaplar, { bugun: REFERANS_GUN });
      const b = kapilariDegerlendir(cevaplar, { bugun: REFERANS_GUN });

      expect(a).toEqual(b);
    });

    it('tarama soruları cevaplanmadan program üretilmez, ama sahte sağlık bayrağı da uydurulmaz', () => {
      const durum = kapilariDegerlendir({}, { bugun: REFERANS_GUN });

      expect(durum.program_engelli).toBe(true);
      expect(durum.kapilar).toEqual([]);
      expect(durum.eksik_tarama).toEqual(['K6', 'K7', 'S2', 'S3', 'S7', 'S18']);
    });

    it('tarama tamamlandığında eksik listesi boşalır', () => {
      const durum = kapilariDegerlendir(temizCevaplar, { bugun: REFERANS_GUN });

      expect(durum.eksik_tarama).toEqual([]);
    });
  });
});
