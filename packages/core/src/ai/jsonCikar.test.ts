import { describe, expect, it } from 'vitest';
import { jsonCikar } from './jsonCikar';

/**
 * Model çıktısından JSON çıkarma.
 *
 * Persona koşusunda bulundu ve ilk hatayı gizliyordu: fotoğraf modele gerçekten görsel
 * olarak gitmeye başladıktan sonra bile tanıma "fotoğrafta yemek yok" demeye devam etti.
 * Model yemeği görüyordu; cevabı ```json çitiyle sarıyordu ve `JSON.parse` ilk karakterde
 * patlıyordu. Hata sessizce yutulup boş listeye dönüşüyordu.
 *
 * "Yalnızca JSON döndür" demek yetmiyor — modeller çiti alışkanlıkla ekliyor. Sözü
 * modelden beklemek yerine çıktıyı temizlemek, tek doğru yer.
 */

describe('jsonCikar', () => {
  it('düz JSON aynen çözülür', () => {
    expect(jsonCikar('{"a":1}')).toEqual({ a: 1 });
  });

  it('```json çitini soyar — hatanın kendisi', () => {
    const ham = '```json\n{\n  "kalemler": [{"ad": "menemen"}]\n}\n```';

    expect(jsonCikar(ham)).toEqual({ kalemler: [{ ad: 'menemen' }] });
  });

  it('dilsiz ``` çitini de soyar', () => {
    expect(jsonCikar('```\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it('JSON öncesi ve sonrasındaki cümleleri atar', () => {
    const ham = 'Tabakta şunlar var:\n{"kalemler":[]}\nUmarım yardımcı olur.';

    expect(jsonCikar(ham)).toEqual({ kalemler: [] });
  });

  it('baştaki ve sondaki boşluk sorun değil', () => {
    expect(jsonCikar('  \n {"a":3}  \n ')).toEqual({ a: 3 });
  });

  /**
   * Hiç JSON yoksa `undefined`: uydurulmuş bir nesne döndürmek, modelin söylemediği
   * şeyi söylemiş saymak olurdu.
   */
  it('JSON yoksa undefined döner', () => {
    expect(jsonCikar('Bu fotoğrafta bir şey göremedim.')).toBeUndefined();
  });

  it('bozuk JSON undefined döner, patlamaz', () => {
    expect(jsonCikar('```json\n{"a": \n```')).toBeUndefined();
  });

  it('dizi kök de çözülür', () => {
    expect(jsonCikar('```json\n[1,2]\n```')).toEqual([1, 2]);
  });
});
