/**
 * Görsel girdinin modele hazırlanması.
 *
 * Fotoğraf, sohbet mesajının metnine gömülemez. Gömülürse iki şey birden olur ve ikisi de
 * sessizdir: model görsel görmez (tanıma her zaman boş döner) ve base64 dizesi token
 * olarak sayılır (960×720 bir kare ~900 yerine ~90.000 token). Yani hem çalışmaz hem de
 * çalışmadığı hâliyle en pahalı istektir.
 *
 * Bu dosya o hatayı tipin kendisiyle imkânsız kılıyor: görsel ayrı bir alandan geçiyor ve
 * gateway istemcisi onu ayrı bir içerik bloğuna koyuyor.
 */

/** Modele gönderilecek tek bir görsel. `veri` her zaman ÖNEKSİZ base64. */
export interface AiGorsel {
  ortam_tipi: string;
  veri: string;
}

const VERI_URI = /^data:([^;,]+);base64,/i;

/** Sağlayıcının kabul ettiği tipler. Listede olmayan bir tipi göndermek 400 demek. */
const DESTEKLENEN = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/**
 * Base64 gövdesinin ilk baytlarından biçimi çıkarır.
 *
 * Uzantıya ya da istemcinin söylediğine güvenmiyoruz: galeriden seçilen bir dosyanın
 * adı `.jpg` olup içeriği PNG olabiliyor ve sağlayıcı bunu 400 ile reddediyor.
 * Sihirli baytlar yalan söylemiyor.
 */
export function ortamTipiCoz(base64: string): string | undefined {
  const onek = VERI_URI.exec(base64.trim());
  if (onek) {
    const tip = onek[1]!.toLowerCase();
    return DESTEKLENEN.has(tip) ? tip : undefined;
  }

  const govde = base64.replace(/\s+/g, '');
  if (govde.length < 8) return undefined;

  let bas: Buffer;
  try {
    bas = Buffer.from(govde.slice(0, 24), 'base64');
  } catch {
    return undefined;
  }
  if (bas.length < 12) return undefined;

  if (bas[0] === 0xff && bas[1] === 0xd8 && bas[2] === 0xff) return 'image/jpeg';
  if (bas[0] === 0x89 && bas[1] === 0x50 && bas[2] === 0x4e && bas[3] === 0x47) return 'image/png';
  if (bas.toString('ascii', 0, 4) === 'RIFF' && bas.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  if (bas.toString('ascii', 0, 3) === 'GIF') return 'image/gif';

  return undefined;
}

/**
 * İstemciden gelen ham dizeyi modele verilebilir hâle getirir.
 *
 * Tanınmayan içerikte `undefined` dönüyor: "herhalde jpeg'dir" demek, sağlayıcıdan
 * anlaşılmaz bir 400 almak ve kullanıcıya "bir şeyler ters gitti" göstermek olurdu.
 */
export function gorselHazirla(ham: string): AiGorsel | undefined {
  const ortam_tipi = ortamTipiCoz(ham);
  if (!ortam_tipi) return undefined;

  const veri = ham.trim().replace(VERI_URI, '').replace(/\s+/g, '');
  return { ortam_tipi, veri };
}
