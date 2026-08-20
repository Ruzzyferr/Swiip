import { describe, expect, it } from 'vitest';
import { SORU_BANKASI } from './sorular.uretilmis';

/**
 * Seçim sorusunun seçeneği olmalı (F2.2).
 *
 * K9 "Yaşadığın şehir" `type: 'single'` ve `dataSource: 'tr_iller'` ile tanımlıydı.
 * `dataSource` mekanizması **hiçbir yerde uygulanmamıştı**: soru bankası doğrulaması onu
 * seçeneklerin yerine geçen bir gerekçe sayıyor, derleme onu açmıyor, ekran da
 * `soru.options ?? []` ile boş liste çiziyordu.
 *
 * Emülatörde görüldü: soru başlığı var, altında hiçbir şey yok, yalnızca "Bu soruyu atla".
 * Soru `salon_zinciri_tespiti` ve `birim_sistemi` sürücülerini besliyor — atlanınca ikisi
 * de boş kalıyordu. Yani ekipman ön doldurma özelliği hiç çalışmıyordu.
 *
 * Liste artık derleme zamanında açılıyor: motor doğrulaması, sunucu ve arayüz aynı listeyi
 * görüyor. Çalışma zamanında çözülen bir liste üçünde ayrışabilirdi.
 */

const SECIM_SORULARI = SORU_BANKASI.blocks.flatMap((b) =>
  b.questions.filter((q) => q.type === 'single' || q.type === 'multi'),
);

describe('seçim sorularının seçenekleri', () => {
  it('seçim sorusu var — test boşa dönmüyor', () => {
    expect(SECIM_SORULARI.length).toBeGreaterThan(20);
  });

  it.each(SECIM_SORULARI.map((q) => [q.id, q]))('%s en az bir seçenek taşıyor', (_id, soru) => {
    expect(
      soru.options?.length ?? 0,
      `${soru.id} seçim sorusu ama seçeneği yok: ekranda başlıktan başka hiçbir şey ` +
        'çizilmez ve soru cevaplanamaz.',
    ).toBeGreaterThan(0);
  });

  it('şehir sorusu 81 ili taşıyor', () => {
    const sehir = SECIM_SORULARI.find((q) => q.id === 'K9');

    expect(sehir?.options).toHaveLength(81);
    expect(sehir?.options).toContain('İstanbul');
    expect(sehir?.options).toContain('Düzce');
  });

  it('dataSource kalan bir soru yok — hepsi açılmış olmalı', () => {
    const acilmamis = SECIM_SORULARI.filter(
      (q) => (q as { dataSource?: string }).dataSource && (q.options?.length ?? 0) === 0,
    );

    expect(acilmamis.map((q) => q.id)).toEqual([]);
  });
});
