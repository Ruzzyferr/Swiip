import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SORU_BANKASI, type Soru } from '@swiip/shared';
import { describe, expect, it } from 'vitest';

/**
 * Bankadaki her sorunun bir tüketicisi olmalı.
 *
 * Ölçüldü (2026-08-25): 136 sorunun **73'ünü** hiçbir kod okumuyordu ve hiçbir dal
 * açmıyorlardı. Cevapları veritabanına yazılıyor, kullanıcının dakikalarını yiyor ve
 * programa hiçbir şey katmıyorlardı. Üçü zorunluydu — yani atlanamıyordu bile.
 *
 * Sebep yapısaldı: `sorulari-derle.mjs` tipi ve şemayı doğruluyor, "bu sorunun cevabını
 * okuyan var mı" diye sormuyordu. `drives` alanı bir SÖZ'dü, doğrulanan bir şey değil:
 * `K10 -> metabolik_adaptasyon_bayrak` yazıyordu ve öyle bir hesap yoktu.
 *
 * Bu test o sözü doğrulanabilir yapıyor. Bir soru ya kodda okunuyor, ya bir dal açıyor.
 * İkisi de değilse ya bağlanır ya eklenmez.
 */

const buradan = dirname(fileURLToPath(import.meta.url));
const kok = resolve(buradan, '../../../..');

const TARANAN = [
  'packages/core/src',
  'packages/api/src',
  'packages/shared/src',
  'apps/mobile/src',
  'apps/mobile/app',
];

/** Üretilmiş banka ve testler hariç tüm kaynak, tek metin. */
function kaynagiTopla(): string {
  let metin = '';
  const gez = (dizin: string) => {
    for (const girdi of readdirSync(dizin, { withFileTypes: true })) {
      const yol = join(dizin, girdi.name);
      if (girdi.isDirectory()) {
        gez(yol);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(girdi.name)) continue;
      if (/\.test\./.test(girdi.name)) continue;
      if (/sorular\.uretilmis/.test(girdi.name)) continue;
      metin += readFileSync(yol, 'utf8') + '\n';
    }
  };
  for (const d of TARANAN) gez(resolve(kok, d));
  return metin;
}

const KAYNAK = kaynagiTopla();

/**
 * Kod bu soru kimliğine dokunuyor mu?
 *
 * Hem `'S11'` gibi tırnaklı erişim hem `cevaplar.Z3` gibi nokta erişimi sayılıyor.
 * İlk taramam yalnız tırnağa bakıyordu ve `Z3`'ü ölü sanmıştı — `takvim.ts` ona nokta
 * ile erişiyor. Tek biçime güvenmek yanlış cevap veriyor.
 *
 * `'A8:Squat'` gibi bileşik anahtarlar da sayılıyor: `${soru}:${lift}` şablonunun
 * ürettiği anahtar bir sorunun cevabıdır.
 */
function kodOkuyor(id: string): boolean {
  const bitisOk = (ch: string | undefined) => ch === undefined || !/[0-9A-Za-z_]/.test(ch);
  for (const on of ["'", '"', '`', '.']) {
    let i = -1;
    while ((i = KAYNAK.indexOf(on + id, i + 1)) !== -1) {
      const sonra = KAYNAK[i + on.length + id.length];
      if (sonra === ':' || bitisOk(sonra)) return true;
    }
  }
  return false;
}

const TUM_SORULAR: Soru[] = SORU_BANKASI.blocks.flatMap((b) => b.questions);

/**
 * Başka bir soruyu görünür yapan sorular.
 *
 * Üç yol var ve üçü de sayılıyor: `branch`, `repeatBranch` ve `conditionalOn`.
 * Sonuncusu ters yönde tanımlı — bağımlı soru kaynağı işaret ediyor — ve ilk yazdığımda
 * atlamıştım: test S1'i ölü sandı. Oysa S1'in tek işi S15'i (tansiyon kontrolü) açmak
 * ve S15 üç gerçek kısıt üretiyor. Görünürlüğü belirlemek de bir tüketimdir.
 */
const GORUNURLUK_KAYNAKLARI = new Set<string>();
for (const q of TUM_SORULAR) {
  if (q.branch !== undefined || q.repeatBranch !== undefined) GORUNURLUK_KAYNAKLARI.add(q.id);
  for (const kaynak of Object.keys(q.conditionalOn ?? {})) {
    if (kaynak !== '_bos') GORUNURLUK_KAYNAKLARI.add(kaynak);
  }
}

describe('soru bankası — her sorunun bir tüketicisi var', () => {
  it('hiçbir soru okunmadan ve dal açmadan durmuyor', () => {
    const olu = TUM_SORULAR.filter((q) => !kodOkuyor(q.id) && !GORUNURLUK_KAYNAKLARI.has(q.id)).map(
      (q) => `${q.id} (${q.text.slice(0, 40)})`,
    );

    expect(
      olu,
      'Bu sorular kullanıcının vaktini alıyor ama hiçbir şey yapmıyor. ' +
        'Ya çözücüye bağla ya bankadan çıkar:\n  ' +
        olu.join('\n  '),
    ).toEqual([]);
  });

  /**
   * Dal açan bir sorunun açtığı soruların da bir tüketicisi olmalı.
   *
   * `S1 -> S1a, S1b` tam bu tuzağa düşmüştü: S1 zinciri açıyordu, iki soru daha
   * soruluyordu ve zincirin sonunda hiçbir şey yoktu. Kullanıcı "kalp rahatsızlığım var"
   * diyor, iki soru daha cevaplıyor, program değişmiyordu.
   */
  it('hiçbir dal ölü bir zincire çıkmıyor', () => {
    const hedefler = new Map<string, string>();
    for (const q of TUM_SORULAR) {
      for (const liste of Object.values(q.branch ?? {})) {
        for (const hedef of liste) hedefler.set(hedef, q.id);
      }
      for (const hedef of q.repeatBranch ?? []) hedefler.set(hedef, q.id);
      for (const kaynak of Object.keys(q.conditionalOn ?? {})) {
        if (kaynak !== '_bos') hedefler.set(q.id, kaynak);
      }
    }

    const oluZincir = [...hedefler.entries()]
      .filter(([hedef]) => !kodOkuyor(hedef) && !GORUNURLUK_KAYNAKLARI.has(hedef))
      .map(([hedef, acan]) => `${acan} -> ${hedef}`);

    expect(oluZincir, `Bu dallar hiçbir şeye çıkmıyor:\n  ${oluZincir.join('\n  ')}`).toEqual([]);
  });

  /** Akışta görünmeyen soru zorunlu olamaz; değerlendirme asla tamamlanamazdı. */
  it('temel olmayan hiçbir soru zorunlu değil', () => {
    const hatali = TUM_SORULAR.filter((q) => q.asama && q.asama !== 'temel' && q.required).map(
      (q) => q.id,
    );
    expect(hatali).toEqual([]);
  });
});
