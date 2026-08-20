/**
 * Kimlik uçları için ortak istek havuzu.
 *
 * `@fastify/rate-limit` her uç için ayrı sayaç tutuyor. Kimlikte bu yetmez: uç başına
 * ayrı hak, saldırgana on giriş denemesi **ve ardından** on parola sıfırlama isteği verir.
 * Havuz ortak olduğunda sınır gerçekten sınır olur.
 *
 * Zaman dışarıdan veriliyor: sayaç deterministik, test gerçek saat beklemiyor.
 *
 * SINIRI: bellekte tutuluyor, yani tek süreç içindir. Locked karar gereği tek VPS'te
 * çalışıyoruz; yatay ölçeklenince paylaşılan bir depo (Redis) gerekir. Bunu şimdi
 * kurmak, olmayan bir sorunu çözmek olurdu.
 */

export interface IstekSayaciSecenekleri {
  sinir: number;
  pencereMs: number;
}

export interface IstekSayaci {
  /** Bu istek geçebilir mi? Geçerse sayılır. */
  izinVar(anahtar: string, simdi: number): boolean;
  /** İzlenen anahtar sayısı — bellek büyümesini görünür tutmak için. */
  boyut(): number;
}

export function istekSayaciKur(secenekler: IstekSayaciSecenekleri): IstekSayaci {
  const { sinir, pencereMs } = secenekler;

  /** Anahtar → pencere içindeki istek zamanları. */
  const kayitlar = new Map<string, number[]>();

  /**
   * Süreç uzun yaşar; temizlenmeyen sayaç sessiz bir bellek sızıntısıdır.
   * Her çağrıda tüm sözlüğü taramak pahalı olurdu, bu yüzden aralıklı süpürüyoruz.
   */
  let sonSupurme = Number.NEGATIVE_INFINITY;

  const supur = (simdi: number) => {
    if (simdi - sonSupurme < pencereMs) return;
    sonSupurme = simdi;

    for (const [anahtar, zamanlar] of kayitlar) {
      if (zamanlar.every((z) => simdi - z >= pencereMs)) kayitlar.delete(anahtar);
    }
  };

  return {
    izinVar(anahtar, simdi) {
      supur(simdi);

      const zamanlar = (kayitlar.get(anahtar) ?? []).filter((z) => simdi - z < pencereMs);

      if (zamanlar.length >= sinir) {
        kayitlar.set(anahtar, zamanlar);
        return false;
      }

      zamanlar.push(simdi);
      kayitlar.set(anahtar, zamanlar);
      return true;
    },

    boyut() {
      return kayitlar.size;
    },
  };
}
