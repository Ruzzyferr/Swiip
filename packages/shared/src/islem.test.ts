import { describe, expect, it } from 'vitest';
import { islemHatasiMetni, YAZMA_ISLEMLERI } from './islem';

/**
 * Yazma işlemi hata metinleri.
 *
 * Kullanıcının başlattığı bir yazma sessizce başarısız olursa, kullanıcı kaydettiğini
 * sanır. Kilo girer, ekran kapanır, ertesi gün kayıt yoktur. "Uygulama çökmez" kuralı
 * hatayı gizlemek anlamına gelmiyor — tersine, çökmemek için hatayı söylemek gerekiyor.
 *
 * Her işlemin kendi cümlesi var: "bir şeyler ters gitti" kullanıcıya ne kaybettiğini
 * söylemiyor.
 */

describe('islemHatasiMetni', () => {
  it('bilinen işlem için o işleme özgü cümle verir', () => {
    const metin = islemHatasiMetni('kilo_kaydet', 'tr');

    expect(metin.toLocaleLowerCase('tr-TR')).toContain('kilo');
    expect(metin.length).toBeGreaterThan(20);
  });

  it('her işlem için hem Türkçe hem İngilizce metin var', () => {
    for (const islem of YAZMA_ISLEMLERI) {
      expect(islemHatasiMetni(islem, 'tr').length, islem).toBeGreaterThan(20);
      expect(islemHatasiMetni(islem, 'en').length, islem).toBeGreaterThan(20);
    }
  });

  it('İngilizce metinlerde Türkçe karakter kalmamış', () => {
    for (const islem of YAZMA_ISLEMLERI) {
      expect(islemHatasiMetni(islem, 'en'), islem).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);
    }
  });

  /**
   * Suçlayıcı dil yasak: kullanıcı bir şeyi yanlış yapmadı, biz yazamadık.
   */
  it('hiçbir metin kullanıcıyı suçlamıyor', () => {
    for (const islem of YAZMA_ISLEMLERI) {
      const metin = islemHatasiMetni(islem, 'tr').toLocaleLowerCase('tr-TR');
      for (const yasak of ['yanlış yaptın', 'hatalı giriş', 'geçersiz'])
        expect(metin, islem).not.toContain(yasak);
    }
  });

  it('her metin ne yapılacağını söylüyor', () => {
    for (const islem of YAZMA_ISLEMLERI) {
      const metin = islemHatasiMetni(islem, 'tr').toLocaleLowerCase('tr-TR');
      expect(metin, islem).toMatch(/tekrar|yeniden|dene/);
    }
  });

  it('tanımsız işlem için genel ama yine de eyleme dönük bir metin verir', () => {
    const metin = islemHatasiMetni('olmayan_islem' as never, 'tr');

    expect(metin).toMatch(/tekrar/i);
  });
});
