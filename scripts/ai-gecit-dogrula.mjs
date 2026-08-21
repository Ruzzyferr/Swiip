/**
 * Gateway'i ve model adlarını GERÇEK çağrıyla doğrular.
 *
 * Neden gerekli: uygulama AI hatasında sessizce deterministik yedeğe düşüyor. Bu doğru
 * bir tasarım — kullanıcı hiç patlamış ekran görmüyor — ama yan etkisi şu: yanlış model
 * adı, yanlış anahtar ya da bitmiş bakiye **hiçbir yerde görünmüyor.** Uygulama çalışıyor
 * gibi durur, koç "kullanılamıyor" der ve sebebini kimse bilmez.
 *
 * Bu betik o sessizliği bozar: her model seviyesine küçük bir istek atar ve tek tek
 * sonucu yazar. Dağıtımdan önce çalıştır.
 *
 *   AI_GATEWAY_URL=... AI_GATEWAY_KEY=... node scripts/ai-gecit-dogrula.mjs
 */
import { modelAdi, tumSeviyeler } from '../packages/core/src/ai/gecit.ts';

const URL_ = process.env.AI_GATEWAY_URL;
const ANAHTAR = process.env.AI_GATEWAY_KEY;

if (!URL_ || !ANAHTAR) {
  console.error('AI_GATEWAY_URL ve AI_GATEWAY_KEY tanımlı olmalı.');
  process.exit(2);
}

console.log(`  gateway: ${URL_}`);

// Aynı model birden çok seviyede kullanılıyor; her adı bir kez deniyoruz.
const adlar = new Map();
for (const seviye of tumSeviyeler()) {
  const ad = modelAdi(seviye);
  adlar.set(ad, [...(adlar.get(ad) ?? []), seviye]);
}

let hata = 0;

for (const [ad, seviyeler] of adlar) {
  const baslangic = Date.now();
  try {
    const yanit = await fetch(`${URL_}/v1/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${ANAHTAR}` },
      body: JSON.stringify({
        model: ad,
        max_tokens: 16,
        messages: [{ role: 'user', content: 'Yalnızca "tamam" yaz.' }],
      }),
    });

    const govde = await yanit.text();

    if (!yanit.ok) {
      hata++;
      console.log(`  ✗ ${ad.padEnd(30)} HTTP ${yanit.status} — ${govde.slice(0, 160)}`);
      continue;
    }

    const j = JSON.parse(govde);
    const metin = (j.content ?? []).map((p) => p.text ?? '').join('');
    const girdi = j.usage?.input_tokens ?? 0;
    const cikti = j.usage?.output_tokens ?? 0;

    // Cevap gövdesi Anthropic biçiminde değilse istemci sessizce boş metin üretir.
    if (!Array.isArray(j.content) || j.usage === undefined) {
      hata++;
      console.log(`  ✗ ${ad.padEnd(30)} cevap Anthropic biçiminde değil: ${govde.slice(0, 120)}`);
      continue;
    }

    console.log(
      `  ✓ ${ad.padEnd(30)} ${String(Date.now() - baslangic).padStart(5)}ms  ` +
        `${girdi}+${cikti} token  "${metin.trim().slice(0, 24)}"  [${seviyeler.join(', ')}]`,
    );
  } catch (h) {
    hata++;
    console.log(`  ✗ ${ad.padEnd(30)} ${String(h.message).slice(0, 140)}`);
  }
}

if (hata > 0) {
  console.error(`\n${hata} model çalışmıyor. Bu hâliyle dağıtma — uygulama sessizce yedeğe düşer.`);
  process.exit(1);
}
console.log('\nTüm modeller çalışıyor.');
