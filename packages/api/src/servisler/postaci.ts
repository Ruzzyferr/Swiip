/**
 * E-posta gönderimi.
 *
 * AI geçidiyle aynı desen: arayüz sabit, sağlayıcı takılabilir. SMTP yapılandırılmamışsa
 * uygulama açılır ve akış çalışır — kod loglanır, kullanıcıya "gönderdik" denmez.
 *
 * Sessizce başarısız olmak en kötü seçenek olurdu: kullanıcı parolasını sıfırlayamaz ve
 * neden olduğunu anlamaz.
 */

export interface Posta {
  alici: string;
  konu: string;
  govde: string;
}

export interface PostaSonucu {
  gonderildi: boolean;
  sebep?: string;
}

export interface Postaci {
  gonder(posta: Posta): Promise<PostaSonucu>;
}

/** SMTP yokken: kod sunucu logunda görünür, kullanıcıya yanlış vaat verilmez. */
export function loglayanPostaci(log: (mesaj: string) => void): Postaci {
  return {
    async gonder(posta) {
      log(`[posta yapılandırılmadı] ${posta.alici} · ${posta.konu}\n${posta.govde}`);
      return { gonderildi: false, sebep: 'smtp_yok' };
    },
  };
}

/** Testler için: gönderilenleri bellekte tutar. */
export function testPostacisi(): Postaci & { kutu: Posta[] } {
  const kutu: Posta[] = [];
  return {
    kutu,
    async gonder(posta) {
      kutu.push(posta);
      return { gonderildi: true };
    },
  };
}

export interface HttpPostaciSecenekleri {
  /** Sağlayıcının gönderim ucu (Resend, Postmark, Mailgun vb.). */
  url: string;
  anahtar: string;
  gonderen: string;
  zamanAsimiMs?: number;
}

/**
 * HTTP tabanlı postacı.
 *
 * Sağlayıcıya özel SDK yerine düz HTTP: tek bağımlılık eklemiyoruz ve sağlayıcı
 * değiştiğinde yalnızca URL ile gövde biçimi değişiyor. Çoğu sağlayıcı
 * `{from, to, subject, text}` gövdesini kabul ediyor.
 *
 * Zaman aşımı kısa: posta gecikirse kullanıcı isteği beklemesin — kod zaten
 * veritabanına yazıldı, kullanıcı "tekrar gönder" diyebilir.
 */
export function httpPostaci(secenekler: HttpPostaciSecenekleri): Postaci {
  const zamanAsimi = secenekler.zamanAsimiMs ?? 8000;

  return {
    async gonder(posta) {
      const durdurucu = new AbortController();
      const zamanlayici = setTimeout(() => durdurucu.abort(), zamanAsimi);

      try {
        const yanit = await fetch(secenekler.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${secenekler.anahtar}`,
          },
          body: JSON.stringify({
            from: secenekler.gonderen,
            to: posta.alici,
            subject: posta.konu,
            text: posta.govde,
          }),
          signal: durdurucu.signal,
        });

        return yanit.ok
          ? { gonderildi: true }
          : { gonderildi: false, sebep: `saglayici_${yanit.status}` };
      } catch (hata) {
        return {
          gonderildi: false,
          sebep: hata instanceof Error && hata.name === 'AbortError' ? 'zaman_asimi' : 'aglar',
        };
      } finally {
        clearTimeout(zamanlayici);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Şablonlar
// ---------------------------------------------------------------------------

/**
 * Kod e-postaları bilinçli olarak sade.
 *
 * Kimlik doğrulama e-postasına pazarlama koymayız: bu mesaj bir güvenlik adımıdır,
 * bir dokunuş fırsatı değil. Bağlantı yerine kod gönderiyoruz — kod, tıklama alışkanlığı
 * kazandırmadığı için kimlik avına karşı daha dayanıklı.
 */
export function parolaSifirlamaPostasi(alici: string, kod: string, dakika: number): Posta {
  return {
    alici,
    konu: 'Made2Fit parola sıfırlama kodun',
    govde: [
      `Parolanı sıfırlamak için kodun: ${kod}`,
      '',
      `Kod ${dakika} dakika geçerli.`,
      '',
      'Bu isteği sen yapmadıysan bir şey yapmana gerek yok; parolan değişmedi.',
      'Kimse senden bu kodu istemeyecek. Biz de istemeyiz.',
    ].join('\n'),
  };
}

export function epostaDogrulamaPostasi(alici: string, kod: string, dakika: number): Posta {
  return {
    alici,
    konu: 'Made2Fit e-posta doğrulama kodun',
    govde: [
      `E-posta adresini doğrulamak için kodun: ${kod}`,
      '',
      `Kod ${dakika} dakika geçerli.`,
      '',
      'Doğrulama, hesabını kaybettiğinde geri almanı sağlar. Zorunlu değil ama öneririz.',
    ].join('\n'),
  };
}
