import { describe, expect, it } from 'vitest';
import { SORU_BANKASI } from './sorular.uretilmis';

/**
 * Seçim sorusunun seçeneği olmalı (F2.2).
 *
 * Bir zamanlar K9 ("Yaşadığın şehir") `dataSource: 'tr_iller'` ile tanımlıydı ve o
 * mekanizma hiçbir yerde uygulanmamıştı: ekran `soru.options ?? []` ile boş liste
 * çiziyor, kullanıcı yalnızca "Bu soruyu atla" diyebiliyordu. Liste derleme zamanında
 * açılarak düzeltildi.
 *
 * K9 bugün bankada yok — cevabını hiçbir hesap okumuyordu (bkz. soruTuketimi.test.ts).
 * Mekanizma duruyor ve bu test onu koruyor: `dataSource` taşıyan bir soru eklendiğinde
 * seçenekleri açılmış olmalı.
 */

const SECIM_SORULARI = SORU_BANKASI.blocks.flatMap((b) =>
  b.questions.filter((q) => q.type === 'single' || q.type === 'multi'),
);

describe('seçim sorularının seçenekleri', () => {
  it('seçim sorusu var — test boşa dönmüyor', () => {
    expect(SECIM_SORULARI.length).toBeGreaterThan(15);
  });

  it.each(SECIM_SORULARI.map((q) => [q.id, q]))('%s en az bir seçenek taşıyor', (_id, soru) => {
    expect(
      soru.options?.length ?? 0,
      `${soru.id} seçim sorusu ama seçeneği yok: ekranda başlıktan başka hiçbir şey ` +
        'çizilmez ve soru cevaplanamaz.',
    ).toBeGreaterThan(0);
  });

  it('dataSource kalan bir soru yok — hepsi açılmış olmalı', () => {
    const acilmamis = SECIM_SORULARI.filter(
      (q) => (q as { dataSource?: string }).dataSource && (q.options?.length ?? 0) === 0,
    );

    expect(acilmamis.map((q) => q.id)).toEqual([]);
  });
});
