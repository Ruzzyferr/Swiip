import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { disaAktarmaDosyaAdi, disaAktarmaMetni } from '@swiip/shared';

/**
 * Veriyi dosyaya yazıp paylaşım sayfasını açar.
 *
 * Sunucudan gelen JSON'u ekranda göstermek ya da "hazırlandı" deyip bırakmak dışa aktarma
 * sayılmaz: kullanıcı verisini eline almadıysa taşınabilirlik diye bir şey yok. Bu yüzden
 * akış dosyayla bitiyor — kullanıcı onu bulut deposuna, e-postaya, nereye isterse oraya
 * gönderiyor.
 *
 * Dosya uygulamanın kendi önbellek klasöründe duruyor. Orası uygulamaya özel; başka
 * uygulamalar okuyamıyor, yani veritabanımızın kendisinden daha açık bir yer değil. Yine de
 * çıkışta siliniyor (`disaAktarmaArtiklariniSil`), çünkü hesabını silen birinin cihazında
 * sağlık verisi dolu bir dosya kalması verdiğimiz sözle çelişirdi.
 */

export type PaylasmaSonucu = 'paylasildi' | 'paylasim_yok';

function dosyaYolu(damga: string): string {
  return `${FileSystem.cacheDirectory ?? ''}${disaAktarmaDosyaAdi(damga)}`;
}

export async function veriyiPaylas(
  veri: unknown,
  damga: string,
  baslik: string,
): Promise<PaylasmaSonucu> {
  const yol = dosyaYolu(damga);

  await FileSystem.writeAsStringAsync(yol, disaAktarmaMetni(veri), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) return 'paylasim_yok';

  await Sharing.shareAsync(yol, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: baslik,
  });

  return 'paylasildi';
}

/**
 * Önbellekte kalmış dışa aktarma dosyalarını siler. Çıkışta ve hesap silmede çağrılıyor.
 * Dosya adı tarihli olduğu için tek bir yolu silmek yetmiyor; klasör taranıyor.
 */
export async function disaAktarmaArtiklariniSil(): Promise<void> {
  const klasor = FileSystem.cacheDirectory;
  if (!klasor) return;

  try {
    const dosyalar = await FileSystem.readDirectoryAsync(klasor);
    await Promise.all(
      dosyalar
        .filter((ad) => ad.startsWith('swiip-verilerim') && ad.endsWith('.json'))
        .map((ad) => FileSystem.deleteAsync(`${klasor}${ad}`, { idempotent: true })),
    );
  } catch {
    // Temizlik başarısız olduğunda kullanıcıya gösterilecek bir şey yok; çıkış akışını
    // buna takılıp bırakmak, çözdüğünden çok sorun yaratır.
  }
}
