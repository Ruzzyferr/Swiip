/**
 * data/sorular.json dosyasını doğrular ve paketlerin kullanabileceği TS modülüne çevirir.
 * React Native dosya sistemine erişemediği için soru bankası koda gömülür.
 *
 * Çalıştırma:  node scripts/sorulari-derle.mjs [--kontrol]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const kokDizin = join(dirname(fileURLToPath(import.meta.url)), '..');
const kaynak = join(kokDizin, 'data', 'sorular.json');
const tsHedefi = join(kokDizin, 'packages', 'shared', 'src', 'sorular.uretilmis.ts');

const TIPLER = new Set([
  'date',
  'number',
  'single',
  'multi',
  'scale',
  'text',
  'longtext',
  'bodymap',
  'imagechoice',
  'measure',
  'consent',
  'time',
  'daterange',
  'liftinput',
  'photo',
]);

const KAPI_EYLEMLERI = new Set([
  'kayit_reddet',
  'program_uretme',
  'medikal_onay_zorunlu',
  'onay_belgesi_iste',
  'ed_modu_ac',
]);

const hatalar = [];
const kontrol = (kosul, mesaj) => {
  if (!kosul) hatalar.push(mesaj);
};

const veri = JSON.parse(await readFile(kaynak, 'utf8'));
const tumIdler = new Set();
const gorunurluk = new Map(); // hedef soru -> onu açan sorular

for (const blok of veri.blocks) {
  kontrol(typeof blok.id === 'string' && blok.id.length > 0, 'blok id eksik');
  kontrol(typeof blok.title === 'string', `${blok.id} — başlık eksik`);
  kontrol(Array.isArray(blok.questions) && blok.questions.length > 0, `${blok.id} — soru yok`);

  for (const soru of blok.questions) {
    kontrol(!tumIdler.has(soru.id), `${soru.id} — id tekrar ediyor`);
    tumIdler.add(soru.id);

    kontrol(TIPLER.has(soru.type), `${soru.id} — bilinmeyen tip: ${soru.type}`);
    kontrol(typeof soru.text === 'string' && soru.text.length > 3, `${soru.id} — metin eksik`);

    // "Sürücüsü olmayan soru sorulmaz" — spec bölüm 3.
    kontrol(
      Array.isArray(soru.drives) && soru.drives.length > 0,
      `${soru.id} — drives eksik: sürücüsü olmayan soru sorulmaz`,
    );

    if (soru.type === 'single' || soru.type === 'multi') {
      // Şehir gibi listeler dış kaynaktan gelir; çıkış yolu tek seçenekli olabilir.
      const asgari = soru.cikisYolu ? 1 : 2;
      kontrol(
        soru.dataSource !== undefined ||
          (Array.isArray(soru.options) && soru.options.length >= asgari),
        `${soru.id} — seçenek listesi en az ${asgari} olmalı`,
      );
    }

    if (soru.type === 'number' || soru.type === 'scale') {
      kontrol(
        typeof soru.min === 'number' && typeof soru.max === 'number' && soru.min < soru.max,
        `${soru.id} — min/max aralığı geçersiz`,
      );
    }

    if (soru.gate) {
      kontrol(Array.isArray(soru.gate.if), `${soru.id} — gate.if dizi olmalı`);
      kontrol(KAPI_EYLEMLERI.has(soru.gate.action), `${soru.id} — bilinmeyen kapı eylemi`);
      for (const deger of soru.gate.if ?? []) {
        kontrol(
          !soru.options || soru.options.includes(deger),
          `${soru.id} — gate değeri seçeneklerde yok: ${deger}`,
        );
      }
    }

    for (const [anahtar, hedefler] of Object.entries(soru.branch ?? {})) {
      if (anahtar !== '_notYok') {
        kontrol(
          !soru.options || soru.options.includes(anahtar),
          `${soru.id} — branch anahtarı seçeneklerde yok: ${anahtar}`,
        );
      }
      for (const hedef of hedefler) {
        gorunurluk.set(hedef, [...(gorunurluk.get(hedef) ?? []), soru.id]);
      }
    }

    for (const hedef of soru.repeatBranch ?? []) {
      gorunurluk.set(hedef, [...(gorunurluk.get(hedef) ?? []), soru.id]);
    }
  }
}

// Koşullu her sorunun onu açan bir kaynağı olmalı; yoksa kullanıcı o soruyu hiç göremez.
for (const blok of veri.blocks) {
  for (const soru of blok.questions) {
    if (soru.conditional && !soru.conditionalOn) {
      kontrol(
        gorunurluk.has(soru.id),
        `${soru.id} — koşullu ama hiçbir branch onu açmıyor: kullanıcı bu soruyu asla göremez`,
      );
    }
    for (const hedef of Object.values(soru.branch ?? {}).flat()) {
      kontrol(tumIdler.has(hedef), `${soru.id} — branch bilinmeyen soruya işaret ediyor: ${hedef}`);
    }
    for (const hedef of soru.repeatBranch ?? []) {
      kontrol(tumIdler.has(hedef), `${soru.id} — repeatBranch bilinmeyen soru: ${hedef}`);
    }
    for (const [bagimli] of Object.entries(soru.conditionalOn ?? {})) {
      if (bagimli === '_bos') continue;
      kontrol(tumIdler.has(bagimli), `${soru.id} — conditionalOn bilinmeyen soru: ${bagimli}`);
    }
  }
}

if (hatalar.length > 0) {
  console.error(`\n${hatalar.length} doğrulama hatası:\n`);
  for (const hata of hatalar) console.error(`  • ${hata}`);
  process.exit(1);
}

const toplamSoru = veri.blocks.reduce((t, b) => t + b.questions.length, 0);
const kosullu = veri.blocks.reduce(
  (t, b) => t + b.questions.filter((q) => q.conditional || q.conditionalOn).length,
  0,
);

if (!process.argv.includes('--kontrol')) {
  const ts = [
    '// ÜRETİLMİŞ DOSYA — elle düzenleme.',
    '// Kaynak: data/sorular.json · Derleyici: scripts/sorulari-derle.mjs',
    "import type { SoruBankasi } from './degerlendirme';",
    '',
    `export const SORU_BANKASI: SoruBankasi = ${JSON.stringify(veri, null, 2)} as SoruBankasi;`,
    '',
  ].join('\n');
  await writeFile(tsHedefi, ts, 'utf8');
}

console.log(`${toplamSoru} soru doğrulandı (${kosullu} koşullu, ${veri.blocks.length} blok).`);
