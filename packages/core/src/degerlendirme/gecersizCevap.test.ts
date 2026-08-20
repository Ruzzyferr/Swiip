import { describe, expect, it } from 'vitest';
import { blokIlerlemesi, cevabiDogrula, gorunurSorular, sonrakiSoru } from './motor';
import type { Cevaplar } from '../cevaplar';

/**
 * Geçersiz bir cevap, cevap sayılmaz (F2.9).
 *
 * `sonrakiSoru` yalnızca "değer var mı" diye bakıyordu. Aralık dışında bir sayı da bir
 * değerdir; soru cevaplanmış sayılıp **atlanıyordu.**
 *
 * Sonucu emülatörde gerçek bir kullanıcı gibi kullanırken çıktı: boy alanına aralık
 * dışında bir değer girildi, ekran hata gösterdi, ama sonraki açılışta soru atlandı.
 * Cihazdaki taslakta geçersiz değer kaldı, sunucu her kaydı reddetti ve kullanıcı o
 * soruya bir daha **hiç dönemedi**. Değerlendirme kalıcı olarak kilitlendi.
 *
 * Bu, ürünün en pahalı hata sınıfı: kullanıcı 123 soruyu yanıtlıyor ve hiçbiri
 * kaydedilmiyor. Üstelik sessiz — ekranda ilerleme çubuğu doluyor.
 */

const TEMEL: Cevaplar = {
  K1: '1992-03-14',
  K2: 'Erkek',
};

describe('geçersiz cevap atlanmaz', () => {
  it('aralık dışı boy, sıradaki soru olarak geri gelir', () => {
    const cevaplar: Cevaplar = { ...TEMEL, K3: 39 };

    expect(sonrakiSoru(cevaplar)?.id).toBe('K3');
  });

  it('geçerli boy girilince soru geçilir', () => {
    const cevaplar: Cevaplar = { ...TEMEL, K3: 178 };

    expect(sonrakiSoru(cevaplar)?.id).not.toBe('K3');
  });

  it('listede olmayan bir seçenek de cevap sayılmaz', () => {
    const cevaplar: Cevaplar = { K1: '1992-03-14', K2: 'Kırmızı' };

    expect(sonrakiSoru(cevaplar)?.id).toBe('K2');
  });

  it('geçersiz cevap bloğu tamamlanmış göstermez', () => {
    const hepsi: Cevaplar = {};
    for (const soru of gorunurSorular({})) {
      if (soru.blok_id !== 'K') continue;
      hepsi[soru.id] = ornekCevap(soru) as Cevaplar[string];
    }
    const gecerliIlerleme = blokIlerlemesi(hepsi);
    expect(gecerliIlerleme.tamamlanan_bloklar).toContain('K');

    // Tek bir alanı bozmak bloğu tamamlanmamış yapmalı.
    const bozuk: Cevaplar = { ...hepsi, K3: 39 };
    expect(blokIlerlemesi(bozuk).tamamlanan_bloklar).not.toContain('K');
  });

  it('boş bırakılmış isteğe bağlı soru hâlâ sıradaki sorudur — davranış değişmedi', () => {
    // Geçersizlik kontrolü, cevaplanmamış soruları etkilemiyor.
    const cevaplar: Cevaplar = { K1: '1992-03-14' };

    expect(sonrakiSoru(cevaplar)?.id).toBe('K2');
  });
});

/** Soru tipine göre kabul edilebilir bir örnek cevap üretir. */
function ornekCevap(soru: ReturnType<typeof gorunurSorular>[number]): unknown {
  if (soru.options?.length) return soru.options[0];
  if (soru.type === 'number') return soru.min ?? 1;
  if (soru.type === 'scale') return soru.min ?? 1;
  if (soru.type === 'date') return '1992-03-14';
  if (soru.type === 'multi') return soru.options ? [soru.options[0]] : ['x'];
  return 'x';
}

describe('doğrulama ile tutarlılık', () => {
  it('sonrakiSoru, cevabiDogrula ile aynı kararı verir', () => {
    const cevaplar: Cevaplar = { ...TEMEL, K3: 39 };
    const soru = gorunurSorular(cevaplar).find((s) => s.id === 'K3')!;

    expect(cevabiDogrula(soru, cevaplar.K3 as never).gecerli).toBe(false);
    expect(sonrakiSoru(cevaplar)?.id).toBe('K3');
  });
});
