import { describe, expect, it } from 'vitest';
import { profilKur } from '../test/profilKur';
import {
  ARAC_TANIMLARI,
  baglamKur,
  kocSistemMesaji,
  profilOzeti,
  sinirKontrolu,
  yaklasikToken,
} from './koc';

describe('sinirKontrolu — tanı koymaz', () => {
  it.each([
    'Dizimde ağrı var, menisküs yırtığı mı?',
    'Belim tutuldu, fıtık olabilir mi',
    'Omzumda batma var, ne hastalığı bu?',
    'Bu semptomlar neyin belirtisi',
  ])('sağlık sorusunu yönlendirir: %s', (mesaj) => {
    const sonuc = sinirKontrolu(mesaj, { edModu: false });

    expect(sonuc.izin).toBe(false);
    expect(sonuc.kategori).toBe('tani');
    expect(sonuc.cevap).toContain('hekim');
  });

  it('yönlendirme yaparken kullanıcıyı yalnız bırakmaz', () => {
    const sonuc = sinirKontrolu('Dizimde ağrı var, ne yapmalıyım?', { edModu: false });

    expect(sonuc.cevap.toLowerCase()).toContain('program');
  });

  it('ağrı geçmeyen bir hareket sorusu da tanıya girmez ama uyarı taşır', () => {
    const sonuc = sinirKontrolu('Squat yaparken dizim ağrıyor', { edModu: false });

    expect(sonuc.izin).toBe(false);
    expect(sonuc.cevap).toContain('hekim');
  });
});

describe('sinirKontrolu — doz vermez', () => {
  it.each([
    'Günde kaç gram kreatin almalıyım?',
    'D vitamini dozu ne olmalı',
    'Bu ilacı antrenmandan önce alabilir miyim',
    'Kaç mg çinko içeyim',
  ])('takviye ve ilaç dozunu reddeder: %s', (mesaj) => {
    const sonuc = sinirKontrolu(mesaj, { edModu: false });

    expect(sonuc.izin).toBe(false);
    expect(sonuc.kategori).toBe('doz');
  });

  it('protein tozunun ne olduğu sorusu doz sorusu değildir', () => {
    const sonuc = sinirKontrolu('Protein tozu almam şart mı?', { edModu: false });

    expect(sonuc.izin).toBe(true);
  });

  /**
   * Persona koşusunda yakalandı. Tansiyon ilacı kullanan 41 yaşındaki kullanıcı
   * "bu programda dikkat etmem gereken bir şey var mı" diye sordu ve tek cevap
   * "ilaç dozu konusunda yönlendirme yapamam" oldu.
   *
   * Kullanıcı dozu sormamıştı; **kendini tanıtıyordu.** Değerlendirmede zaten yazdığı
   * bir bilgiyi koça söylediği için kapı yüzüne kapandı. Kapının yeri doğru, genişliği
   * yanlıştı: "ilaç" kelimesinin geçmesi yetiyordu.
   *
   * Sistem mesajı doz vermeyi zaten yasaklıyor; bu desenin işi soruyu ayıklamak.
   */
  it.each([
    'Tansiyon ilacı kullanıyorum. Bu programda dikkat etmem gereken bir şey var mı?',
    'Kan sulandırıcı ilaç kullanıyorum, deadlift yapabilir miyim',
    'Tiroid ilacı kullananlar için kardiyoyu nasıl ayarlıyorsun',
  ])('ilaç kullandığını söylemek doz sorusu değildir: %s', (mesaj) => {
    const sonuc = sinirKontrolu(mesaj, { edModu: false });

    expect(sonuc.izin, `kategori: ${sonuc.kategori}`).toBe(true);
  });

  it.each([
    'Tansiyon ilacımın dozunu artırmalı mıyım',
    'Bu ilacı kaç mg almalıyım',
    'İlacımı bırakmalı mıyım',
  ])('gerçek doz sorusu hâlâ reddedilir: %s', (mesaj) => {
    expect(sinirKontrolu(mesaj, { edModu: false }).kategori).toBe('doz');
  });
});

describe('sinirKontrolu — aşırı hedefi onaylamaz', () => {
  it.each([
    'Günde 800 kalori yesem ne olur?',
    'Bir ayda 15 kilo vermek istiyorum',
    'Üç günde 5 kilo nasıl veririm',
    'Hiç yemeden ne kadar dayanabilirim',
  ])('reddeder ve gerekçe verir: %s', (mesaj) => {
    const sonuc = sinirKontrolu(mesaj, { edModu: false });

    expect(sonuc.izin).toBe(false);
    expect(sonuc.kategori).toBe('asiri_hedef');
    expect(sonuc.cevap.length).toBeGreaterThan(60);
  });

  it('reddederken alternatif sunar', () => {
    const sonuc = sinirKontrolu('Günde 800 kalori yesem?', { edModu: false });

    expect(sonuc.cevap.toLowerCase()).toContain('güvenli');
  });

  it('makul kalori sorusu reddedilmez', () => {
    expect(sinirKontrolu('Günde 2200 kalori yeterli mi?', { edModu: false }).izin).toBe(true);
  });
});

describe('sinirKontrolu — kapsam dışı', () => {
  it.each([
    'Bugün hava nasıl olacak?',
    'Bana bir şiir yaz',
    'Python kodu yazar mısın',
    'Seçim sonuçları ne oldu',
  ])('kibarca reddeder: %s', (mesaj) => {
    const sonuc = sinirKontrolu(mesaj, { edModu: false });

    expect(sonuc.izin).toBe(false);
    expect(sonuc.kategori).toBe('kapsam_disi');
  });

  it('fitness sorusu kapsam içindedir', () => {
    expect(sinirKontrolu('Bench pressim takıldı, ne yapmalıyım?', { edModu: false }).izin).toBe(
      true,
    );
  });

  it('beslenme sorusu kapsam içindedir', () => {
    expect(sinirKontrolu('Kahvaltıda ne yesem protein yeter?', { edModu: false }).izin).toBe(true);
  });
});

describe('sinirKontrolu — ED modu', () => {
  it('ED modunda kalori sorusu sayıyla cevaplanmaz', () => {
    const sonuc = sinirKontrolu('Bugün kaç kalori aldım?', { edModu: true });

    expect(sonuc.izin).toBe(false);
    expect(sonuc.kategori).toBe('ed_sayi');
    expect(sonuc.cevap).not.toMatch(/\d/);
  });

  it('ED modunda kilo hedefi tartışılmaz', () => {
    const sonuc = sinirKontrolu('Kaç kiloya düşmeliyim?', { edModu: true });

    expect(sonuc.izin).toBe(false);
    expect(sonuc.kategori).toBe('ed_sayi');
  });

  it('ED modunda antrenman sorusu normal cevaplanır', () => {
    expect(sinirKontrolu('Bugün hangi hareketleri yapacağım?', { edModu: true }).izin).toBe(true);
  });

  it('ED modu kapalıyken kalori sorusu serbesttir', () => {
    expect(sinirKontrolu('Bugün kaç kalori aldım?', { edModu: false }).izin).toBe(true);
  });
});

describe('profilOzeti', () => {
  it('kalıcı özet 600 tokenın altında kalır', () => {
    const ozet = profilOzeti(profilKur());

    expect(yaklasikToken(ozet)).toBeLessThan(600);
  });

  it('motorun ihtiyaç duyduğu alanları içerir', () => {
    const ozet = profilOzeti(
      profilKur({
        kisitlar: { ...profilKur().kisitlar, kontrendikasyonlar: ['bel_fitigi'] },
      }),
    );

    expect(ozet).toContain('orta');
    expect(ozet).toContain('bel_fitigi');
  });

  it('ED modunda sayı içermez', () => {
    const ozet = profilOzeti(profilKur({ ed_modu: true }));

    expect(ozet).not.toMatch(/\d+ kg/);
    expect(ozet).not.toMatch(/\d+ kcal/);
  });

  it('aynı profil aynı özeti verir', () => {
    expect(profilOzeti(profilKur())).toBe(profilOzeti(profilKur()));
  });
});

describe('baglamKur — bellek stratejisi', () => {
  const ozet = profilOzeti(profilKur());

  function mesajlar(adet: number) {
    return Array.from({ length: adet }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `Bu ${i}. mesaj ve makul uzunlukta bir cümle içeriyor.`,
    }));
  }

  it('son 10 mesajı taşır', () => {
    const baglam = baglamKur({ ozet, gecmis: mesajlar(30) });

    expect(baglam.mesajlar.length).toBeLessThanOrEqual(10);
  });

  it('konuşma uzadıkça token maliyeti sabit kalır', () => {
    const kisa = baglamKur({ ozet, gecmis: mesajlar(10) });
    const uzun = baglamKur({ ozet, gecmis: mesajlar(200) });

    expect(uzun.tahmini_token).toBeLessThan(kisa.tahmini_token * 1.6);
  });

  it('araç verisi bağlama eklenir', () => {
    const baglam = baglamKur({
      ozet,
      gecmis: mesajlar(4),
      aracVerisi: { beslenme_gecmisi: { ortalama_kalori: 1980 } },
    });

    expect(JSON.stringify(baglam.mesajlar)).toContain('1980');
  });

  it('kalıcı özet her zaman ilk sırada durur', () => {
    const baglam = baglamKur({ ozet, gecmis: mesajlar(20) });

    expect(baglam.sistem).toContain(ozet);
  });

  it('boş geçmişte de bağlam kurulur', () => {
    expect(baglamKur({ ozet, gecmis: [] }).mesajlar).toEqual([]);
  });
});

describe('ARAC_TANIMLARI', () => {
  it('spec bölüm 11 araçlarının tamamı tanımlı', () => {
    const adlar = ARAC_TANIMLARI.map((a) => a.ad);

    for (const beklenen of [
      'profil_getir',
      'antrenman_gecmisi',
      'beslenme_gecmisi',
      'program_degistir',
      'olcum_gecmisi',
      'hareket_bilgisi',
      'besin_ara',
    ]) {
      expect(adlar).toContain(beklenen);
    }
  });

  it('her aracın açıklaması ve şeması var', () => {
    for (const arac of ARAC_TANIMLARI) {
      expect(arac.aciklama.length).toBeGreaterThan(20);
      expect(arac.parametreler).toBeDefined();
    }
  });

  it('program değiştirme dışında yazma yetkisi olan araç yok', () => {
    const yazanlar = ARAC_TANIMLARI.filter((a) => a.yazar);

    expect(yazanlar.map((a) => a.ad)).toEqual(['program_degistir']);
  });
});

describe('kocSistemMesaji', () => {
  it('sert sınırları açıkça yazar', () => {
    const mesaj = kocSistemMesaji({ ozet: 'test özeti', edModu: false });

    expect(mesaj).toContain('Tanı koyamazsın');
    expect(mesaj).toContain('doz');
    expect(mesaj.toLowerCase()).toContain('kapsam');
  });

  it('ED modunda sayı yasağı eklenir', () => {
    const mesaj = kocSistemMesaji({ ozet: 'test', edModu: true });

    expect(mesaj.toLowerCase()).toContain('sayı');
  });

  it('kullanıcının kendi verisine bakmasını şart koşar', () => {
    expect(kocSistemMesaji({ ozet: 'test', edModu: false })).toContain('araç');
  });
});

/**
 * Koçun konuştuğu dil.
 *
 * Sistem mesajı modele "Türkçe konuş" diyordu. Uygulamayı İngilizce kullanan kişi
 * İngilizce soruyor, koç Türkçe cevap veriyordu — ekranların tamamı çevrilmişken sohbet
 * çevrilmemiş kalıyordu.
 *
 * Sert sınırlar (tanı yok, doz yok, sayı uydurma yok) her dilde aynı kalmak zorunda:
 * bunlar üslup değil, sağlık kuralı.
 */
describe('koç sistem mesajı kullanıcının dilinde', () => {
  const girdi = { ozet: 'Test profili', edModu: false };

  it('Türkçe istendiğinde Türkçe konuşmasını söyler', () => {
    expect(kocSistemMesaji({ ...girdi, dil: 'tr' })).toContain('Türkçe');
  });

  it('İngilizce istendiğinde İngilizce konuşmasını söyler', () => {
    const mesaj = kocSistemMesaji({ ...girdi, dil: 'en' });

    expect(mesaj).toContain('English');
    expect(mesaj).not.toContain('Türkçe');
  });

  it('dil verilmezse Türkçe varsayılır — mevcut çağrılar kırılmaz', () => {
    expect(kocSistemMesaji(girdi)).toContain('Türkçe');
  });

  it.each(['tr', 'en'] as const)('%s dilinde sert sınırlar korunuyor', (dil) => {
    const mesaj = kocSistemMesaji({ ...girdi, dil });

    // Tanı yasağı, doz yasağı ve "sayıyı araçtan al" kuralı her dilde yazılı olmalı.
    expect(mesaj.split('\n').filter((s) => /^\d\./.test(s.trim())).length).toBe(5);
  });

  it.each(['tr', 'en'] as const)('%s dilinde ED modu kuralları ekleniyor', (dil) => {
    const acik = kocSistemMesaji({ ...girdi, dil, edModu: true });
    const kapali = kocSistemMesaji({ ...girdi, dil, edModu: false });

    expect(acik.length).toBeGreaterThan(kapali.length);
  });
});
