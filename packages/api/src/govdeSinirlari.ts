/**
 * İstek gövdesi sınırları. Gerekçe `uygulama.ts`'te, `bodyLimit` yanında.
 *
 * Genel sınır en büyük metin isteğinin (bir kartın cevapları, koç mesajı) çok
 * üstünde; fotoğraf sınırı base64 ile birkaç pozun toplamı.
 */
export const GENEL_GOVDE_SINIRI = 256 * 1024;
export const FOTOGRAF_GOVDE_SINIRI = 12 * 1024 * 1024;
