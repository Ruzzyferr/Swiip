import { useColorScheme } from 'react-native';
import { bosluk, dokunmaHedefi, gecis, renkler, tipografi, yaricap } from '@swiip/shared';

/**
 * Tema. Tek kaynak paylaşılan tasarım tokenleri.
 *
 * Kurallar:
 *  - Neon veya turuncu yok.
 *  - Oyunlaştırma rengi yok: kutlama, rozet, seri rengi tanımlı değil.
 *  - Dokunma hedefi 44 px altına inmez.
 */

export interface Tema {
  koyu: boolean;
  renk: {
    zemin: string;
    yuzey: string;
    yuzeyIkincil: string;
    metin: string;
    metinYumusak: string;
    metinSilik: string;
    aksan: string;
    aksanZemin: string;
    /** Aksan zemini üstündeki metin — temayla değişir. */
    aksanUstu: string;
    cizgi: string;
    /** Kontrol kenari (giris alani, ikincil dugme, onay kutusu). Dekoratif ayrac icin . */
    kenar: string;
    /** Ölçeğin gövdesi: eksen ve pasif çentikler. Aksan yalnızca okumayı gösterir. */
    celik: string;
    celikSilik: string;
    uyari: string;
    uyariZemin: string;
    tehlike: string;
    tehlikeZemin: string;
    basari: string;
  };
  bosluk: typeof bosluk;
  yaricap: typeof yaricap;
  tipografi: typeof tipografi;
  dokunmaHedefi: number;
  gecis: typeof gecis;
}

const acikTema: Tema = {
  koyu: false,
  renk: {
    zemin: renkler.zemin,
    yuzey: renkler.yuzey,
    yuzeyIkincil: renkler.yuzeyIkincil,
    metin: renkler.murekkep,
    metinYumusak: renkler.murekkepYumusak,
    metinSilik: renkler.murekkepSilik,
    aksan: renkler.aksan,
    aksanZemin: renkler.aksanAcik,
    aksanUstu: renkler.aksanUstu,
    cizgi: renkler.cizgi,
    kenar: renkler.kenar,
    celik: renkler.celik,
    celikSilik: renkler.celikSilik,
    uyari: renkler.uyari,
    uyariZemin: renkler.uyariZemin,
    tehlike: renkler.tehlike,
    tehlikeZemin: renkler.tehlikeZemin,
    basari: renkler.basari,
  },
  bosluk,
  yaricap,
  tipografi,
  dokunmaHedefi,
  gecis,
};

const koyuTema: Tema = {
  ...acikTema,
  koyu: true,
  renk: {
    zemin: renkler.koyu.zemin,
    yuzey: renkler.koyu.yuzey,
    yuzeyIkincil: renkler.koyu.yuzeyIkincil,
    metin: renkler.koyu.murekkep,
    metinYumusak: renkler.koyu.murekkepYumusak,
    metinSilik: renkler.koyu.murekkepSilik,
    aksan: renkler.koyu.aksan,
    aksanZemin: renkler.koyu.aksanAcik,
    aksanUstu: renkler.koyu.aksanUstu,
    cizgi: renkler.koyu.cizgi,
    kenar: renkler.koyu.kenar,
    celik: renkler.koyu.celik,
    celikSilik: renkler.koyu.celikSilik,
    uyari: renkler.koyu.uyari,
    uyariZemin: renkler.koyu.uyariZemin,
    tehlike: '#E0796C',
    tehlikeZemin: '#311A17',
    basari: '#5FB287',
  },
};

export function useTema(): Tema {
  return useColorScheme() === 'dark' ? koyuTema : acikTema;
}

export { acikTema, koyuTema };
