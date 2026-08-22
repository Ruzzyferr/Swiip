import { describe, expect, it } from 'vitest';
import { gorselHazirla, ortamTipiCoz } from './gorselGirdi';

/**
 * Fotoğrafın modele **görsel olarak** gitmesi.
 *
 * Persona koşusunda bulundu ve iki ayrı hasarı vardı:
 *
 *  1. Tanıma hiç çalışmıyordu. Sekiz net yemek fotoğrafından sıfırı tanındı; kullanıcı
 *     her seferinde "fotoğrafta tanıyabildiğim bir yemek yok" görüyordu. Pro planın
 *     tek farkı bu özellik.
 *  2. Maliyet ~90 katına çıkıyordu. Base64 metin olarak gönderilince 960×720 bir kare
 *     ~900 token yerine ~90.000 token sayılıyordu. Pro kullanıcının aylık 250 hakkı
 *     22 milyon token demekti: gelirin beş katı gider.
 *
 * Sebep tek satırdı: `kullanici: JSON.stringify({ fotograf })`. Model karşısında
 * fotoğraf değil, fotoğrafın harflerini gördü.
 */

// 1×1 saydam PNG ve minik JPEG — gerçek sihirli baytlar taşıyorlar.
const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const JPEG = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBk=';
const WEBP = 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';

describe('ortamTipiCoz', () => {
  it('JPEG sihirli baytlarını tanır', () => {
    expect(ortamTipiCoz(JPEG)).toBe('image/jpeg');
  });

  it('PNG sihirli baytlarını tanır', () => {
    expect(ortamTipiCoz(PNG)).toBe('image/png');
  });

  it('WebP sihirli baytlarını tanır', () => {
    expect(ortamTipiCoz(WEBP)).toBe('image/webp');
  });

  /**
   * İstemci bazı yollarda `data:` öneki ekliyor, bazılarında eklemiyor.
   * Öneki okumak, tahmine gerek bırakmıyor.
   */
  it('data: URI önekindeki tipi tercih eder', () => {
    expect(ortamTipiCoz(`data:image/png;base64,${JPEG}`)).toBe('image/png');
  });

  /**
   * Tanınmayan bir baytta jpeg varsaymak, modelden sessiz bir hata almak demek.
   * Bilmiyorsak bilmediğimizi söylemek daha iyi.
   */
  it('tanımadığı içerikte undefined döner', () => {
    expect(ortamTipiCoz('bu base64 bile degil')).toBeUndefined();
  });
});

describe('gorselHazirla', () => {
  it('data: önekini gövdeden ayıklar — model ham base64 bekler', () => {
    const hazir = gorselHazirla(`data:image/jpeg;base64,${JPEG}`);

    expect(hazir?.veri).toBe(JPEG);
    expect(hazir?.ortam_tipi).toBe('image/jpeg');
  });

  it('öneksiz base64 olduğu gibi geçer', () => {
    expect(gorselHazirla(PNG)).toEqual({ ortam_tipi: 'image/png', veri: PNG });
  });

  it('boşluk ve satır sonu temizlenir', () => {
    const kirli = `  ${PNG.slice(0, 20)}\n${PNG.slice(20)}  `;

    expect(gorselHazirla(kirli)?.veri).toBe(PNG);
  });

  it('tanınmayan içerik için görsel üretmez', () => {
    expect(gorselHazirla('merhaba dunya')).toBeUndefined();
  });
});
