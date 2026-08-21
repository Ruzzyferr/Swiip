import { describe, expect, it } from 'vitest';

import { disaAktarmaDosyaAdi, disaAktarmaMetni } from './disaAktarma';

describe('disaAktarmaDosyaAdi', () => {
  it('ISO damgasından tarihli bir ad üretiyor', () => {
    expect(disaAktarmaDosyaAdi('2026-08-20T14:33:00.000Z')).toBe('swiip-verilerim-2026-08-20.json');
  });

  it('saat taşımayan tarihi de kabul ediyor', () => {
    expect(disaAktarmaDosyaAdi('2026-08-20')).toBe('swiip-verilerim-2026-08-20.json');
  });

  it('aynı gün iki kez çağrılınca aynı adı veriyor', () => {
    const bir = disaAktarmaDosyaAdi('2026-08-20T01:00:00.000Z');
    const iki = disaAktarmaDosyaAdi('2026-08-20T23:59:00.000Z');
    expect(bir).toBe(iki);
  });

  // Dosya adı Android'de paylaşım sayfasına, oradan da kullanıcının seçtiği herhangi bir
  // uygulamaya gidiyor. Windows'ta yasak olan karakterlerden biri kaçarsa dosya karşı
  // tarafta hiç açılmıyor.
  it('hiçbir dosya sisteminde yasak karakter içermiyor', () => {
    const ad = disaAktarmaDosyaAdi('2026-08-20T14:33:00.000Z');
    expect(ad).not.toMatch(/[<>:"/\\|?*\s]/);
  });

  it('okunamayan damgada bile geçerli bir ad döndürüyor', () => {
    const ad = disaAktarmaDosyaAdi('bilinmiyor');
    expect(ad).toBe('swiip-verilerim.json');
    expect(ad).not.toMatch(/[<>:"/\\|?*\s]/);
  });
});

describe('disaAktarmaMetni', () => {
  it('okunabilir biçimde JSON üretiyor', () => {
    const metin = disaAktarmaMetni({ kullanici: { email: 'a@b.co' } });
    expect(metin).toContain('\n');
    expect(JSON.parse(metin)).toEqual({ kullanici: { email: 'a@b.co' } });
  });

  // Kullanıcı dosyayı bir dosya yöneticisiyle açacak. Tek satırlık JSON teknik olarak
  // doğru ama insana verilen bir kopya olarak işe yaramaz.
  it('girinti kullanıyor', () => {
    expect(disaAktarmaMetni({ a: { b: 1 } })).toBe('{\n  "a": {\n    "b": 1\n  }\n}');
  });

  it('Türkçe karakterleri kaçış dizisine çevirmiyor', () => {
    expect(disaAktarmaMetni({ ad: 'Şişli' })).toContain('Şişli');
  });
});
