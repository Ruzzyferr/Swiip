import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { sorguBooleani } from './sorgu';

const sema = z.object({ acik: sorguBooleani(false) });

describe('sorguBooleani', () => {
  it('"false" dizesi yanlış demektir — z.coerce.boolean() burada doğru dönüyordu', () => {
    expect(sema.parse({ acik: 'false' }).acik).toBe(false);
    expect(sema.parse({ acik: '0' }).acik).toBe(false);
  });

  it('"true" dizesi doğru demektir', () => {
    expect(sema.parse({ acik: 'true' }).acik).toBe(true);
    expect(sema.parse({ acik: '1' }).acik).toBe(true);
  });

  it('parametre yoksa varsayılan geçerli', () => {
    expect(sema.parse({}).acik).toBe(false);
    expect(z.object({ acik: sorguBooleani(true) }).parse({}).acik).toBe(true);
  });

  it('tanınmayan değeri sessizce yutmaz', () => {
    expect(() => sema.parse({ acik: 'evet' })).toThrow();
  });
});
