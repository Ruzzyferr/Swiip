/**
 * Yayın hattının sonucunu bildirir: e-posta (Resend) ve istenirse Telegram.
 *
 * Neden gerekli: GitHub'ın kendi e-postası yalnızca **başarısızlıkta** ve yalnızca
 * commit'i atan kişiye gidiyor, üstelik kişinin GitHub bildirim ayarına bağlı.
 * Yayın hattı mağazaya paket gönderiyor; "gitti mi gitmedi mi" sorusunun cevabı
 * kimsenin ayarına bağlı olmamalı.
 *
 * Posta yolu ürünün zaten kullandığı yol: Resend, `bilgi@send.swiip.app`. Yeni bir
 * servis, yeni bir hesap, yeni bir fatura yok.
 *
 * Telegram BOT_TOKEN + SOHBET_ID verilirse ek olarak oraya da gidiyor; verilmezse
 * sessizce atlanıyor. İkisi de yoksa betik hata veriyor — "bildirim kurdum" deyip
 * hiçbir yere göndermemek, bildirimin olmamasından kötü.
 *
 *   node scripts/bildirim-gonder.mjs
 *
 * Ortam: DURUM, BASLIK, AYRINTI, BAGLANTI
 *        POSTA_API_KEY, POSTA_API_URL, POSTA_GONDEREN, BILDIRIM_ALICI
 *        TELEGRAM_BOT_TOKEN, TELEGRAM_SOHBET_ID   (isteğe bağlı)
 */
const {
  DURUM = 'bilinmiyor',
  BASLIK = 'Swiip yayın',
  AYRINTI = '',
  BAGLANTI = '',
  POSTA_API_KEY,
  POSTA_API_URL = 'https://api.resend.com/emails',
  POSTA_GONDEREN = 'Swiip <bilgi@send.swiip.app>',
  BILDIRIM_ALICI,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_SOHBET_ID,
} = process.env;

const basarili = DURUM === 'success';
const isaret = basarili ? '✅' : DURUM === 'skipped' ? '⏭️' : '❌';
const konu = `${isaret} ${BASLIK}`;

const duzMetin = [konu, '', AYRINTI, BAGLANTI && `\nKoşu: ${BAGLANTI}`].filter(Boolean).join('\n');

const kacir = (m) => String(m).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Mürekkep ve çam yeşili; neon ve turuncu yok. Kutlama yok, sadece durum. */
const html = `
<div style="font-family:-apple-system,Segoe UI,system-ui,sans-serif;color:#131614;max-width:560px">
  <p style="font-size:17px;margin:0 0 14px"><strong>${kacir(konu)}</strong></p>
  <pre style="background:#F6F7F5;border-left:2px solid #14615A;padding:12px 14px;
              white-space:pre-wrap;font-size:13px;margin:0 0 14px">${kacir(AYRINTI)}</pre>
  ${BAGLANTI ? `<p style="font-size:13px;margin:0"><a href="${kacir(BAGLANTI)}" style="color:#14615A">Koşuyu aç</a></p>` : ''}
</div>`;

const sonuclar = [];

if (POSTA_API_KEY && BILDIRIM_ALICI) {
  const y = await fetch(POSTA_API_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${POSTA_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: POSTA_GONDEREN,
      to: [BILDIRIM_ALICI],
      subject: konu,
      text: duzMetin,
      html,
    }),
  });
  const govde = await y.text();
  sonuclar.push({
    kanal: 'e-posta',
    tamam: y.ok,
    ayrinti: y.ok ? 'gönderildi' : govde.slice(0, 200),
  });
} else {
  sonuclar.push({ kanal: 'e-posta', tamam: null, ayrinti: 'POSTA_API_KEY/BILDIRIM_ALICI yok' });
}

if (TELEGRAM_BOT_TOKEN && TELEGRAM_SOHBET_ID) {
  const y = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_SOHBET_ID,
      text: duzMetin,
      disable_web_page_preview: true,
    }),
  });
  const govde = await y.text();
  sonuclar.push({
    kanal: 'telegram',
    tamam: y.ok,
    ayrinti: y.ok ? 'gönderildi' : govde.slice(0, 200),
  });
} else {
  sonuclar.push({ kanal: 'telegram', tamam: null, ayrinti: 'kurulmadı (isteğe bağlı)' });
}

for (const s of sonuclar) {
  console.log(
    `${s.kanal.padEnd(9)} ${s.tamam === null ? '—' : s.tamam ? 'tamam' : 'HATA'} · ${s.ayrinti}`,
  );
}

const denenen = sonuclar.filter((s) => s.tamam !== null);
if (!denenen.length) {
  console.error('Hiçbir kanal kurulu değil; bildirim gitmedi.');
  process.exit(1);
}
if (denenen.some((s) => !s.tamam)) {
  console.error('En az bir kanal başarısız.');
  process.exit(1);
}
