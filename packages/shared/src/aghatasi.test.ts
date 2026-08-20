import { describe, expect, it } from 'vitest';
import { BAGLANTI_KODU, baglantiSorunuMu, yeniCevaplar } from './aghatasi';

/**
 * "Bağlantı yok" ile "sunucu reddetti" ayrımı (F2.9).
 *
 * Değerlendirme ekranı her hatayı `catch` ile yakalayıp **çevrimdışı** sayıyordu:
 *
 *     catch { setCevrimdisi(true); }
 *
 * Emülatörde gerçek bir kullanıcı gibi denenince sonucu görüldü: sunucu cevabı 400 ile
 * reddederken ekranda *"Bağlantı yok — cevapların cihazında tutuluyor, bağlanınca
 * gönderilecek"* yazıyordu. Kullanıcı verisinin güvende olduğunu sanıyor; oysa hiçbir
 * cevap kaydedilmemişti (`answers_jsonb` boştu).
 *
 * Bu, projenin bir kez kapattığı "sessiz yazma hatası" sınıfının aynısı: kullanıcıya
 * yanlış bir güvence vermek, hiçbir şey söylememekten kötü.
 *
 * Ağ katmanı ikisini zaten ayırt ediyor — bağlantı hatası `durum: 0` ile geliyor.
 * Ekran o bilgiyi atıyordu.
 */

describe('baglantiSorunuMu', () => {
  it('durum 0 gerçekten bağlantı sorunu', () => {
    expect(baglantiSorunuMu({ durum: 0, kod: BAGLANTI_KODU })).toBe(true);
  });

  it('400 bağlantı sorunu değil — sunucu cevabı reddetti', () => {
    expect(baglantiSorunuMu({ durum: 400, kod: 'gecersiz_cevap' })).toBe(false);
  });

  it('401 ve 403 de bağlantı sorunu değil', () => {
    expect(baglantiSorunuMu({ durum: 401, kod: 'oturum_bitti' })).toBe(false);
    expect(baglantiSorunuMu({ durum: 403, kod: 'yasak' })).toBe(false);
  });

  it('500 bağlantı sorunu değil — sunucuya ulaşıldı', () => {
    expect(baglantiSorunuMu({ durum: 500, kod: 'sunucu' })).toBe(false);
  });

  it('tanımadığımız hata bağlantı sayılmaz — yanlış güvence vermeyiz', () => {
    expect(baglantiSorunuMu(new Error('bilinmeyen'))).toBe(false);
    expect(baglantiSorunuMu(null)).toBe(false);
    expect(baglantiSorunuMu(undefined)).toBe(false);
  });
});

/**
 * Yalnızca değişen cevapları göndermek (F2.9).
 *
 * İstemci her soruda **tüm cevap kümesini** gönderiyordu. İki sonucu vardı:
 *
 *  1. Sunucu gelen her cevabı doğruluyor. Küme içinde bir kez geçersiz bir cevap
 *     oluşursa sonraki her kayıt da reddedilir — değerlendirme kalıcı olarak zehirlenir.
 *     Kullanıcı 123 soruyu bitirir ve hiçbiri kaydedilmemiştir.
 *  2. 123 soruluk bir akışta 123 kez büyüyen bir gövde gönderilir; gereksiz.
 */
describe('yeniCevaplar', () => {
  it('yalnızca değişenleri döndürür', () => {
    expect(yeniCevaplar({ K1: 'a', K2: 'b' }, { K1: 'a' })).toEqual({ K2: 'b' });
  });

  it('değeri değişen cevap da yenidir — düzeltme gönderilmeli', () => {
    expect(yeniCevaplar({ K1: 'yeni' }, { K1: 'eski' })).toEqual({ K1: 'yeni' });
  });

  it('hiçbir şey değişmediyse boş döner', () => {
    expect(yeniCevaplar({ K1: 'a' }, { K1: 'a' })).toEqual({});
  });

  it('gönderilmiş hiçbir şey yoksa hepsi yenidir', () => {
    expect(yeniCevaplar({ K1: 'a', K2: 'b' }, {})).toEqual({ K1: 'a', K2: 'b' });
  });

  it('nesne ve dizi cevaplar derin karşılaştırılır', () => {
    expect(yeniCevaplar({ F1: { bel_cm: 86 } }, { F1: { bel_cm: 86 } })).toEqual({});
    expect(yeniCevaplar({ F1: { bel_cm: 87 } }, { F1: { bel_cm: 86 } })).toEqual({
      F1: { bel_cm: 87 },
    });
    expect(yeniCevaplar({ S1: ['a', 'b'] }, { S1: ['a', 'b'] })).toEqual({});
    expect(yeniCevaplar({ S1: ['a'] }, { S1: ['a', 'b'] })).toEqual({ S1: ['a'] });
  });

  it('silinen cevap gönderilmez — sunucu birleştirme yapıyor', () => {
    // Sunucu {...mevcut, ...gelen} ile birleştiriyor; burada silme kavramı yok.
    expect(yeniCevaplar({}, { K1: 'a' })).toEqual({});
  });
});
