import { describe, expect, it } from 'vitest';
import { describirEdad, diferenciaCalendario } from './edad';

/**
 * PU-16 · Listado (parte 1: la edad). Especificación: docs/tecnica/15-listado-de-animales.md, sección 5
 */

const HOY = '2026-10-13';

describe('PU-16 · 4. Edad (sección 5)', () => {
  it.each([
    ['2026-10-13', 'Nació hoy'],
    ['2026-10-12', '1 día'],
    ['2026-09-21', '22 días'],
    ['2026-09-13', '1 mes'],
    ['2026-02-13', '8 meses'],
    ['2024-10-14', '23 meses'],
    ['2024-10-13', '2 años'],
    ['2024-05-13', '2 años y 5 meses'],
    ['2023-09-13', '3 años y 1 mes'],
    ['2016-10-13', '10 años'],
  ])('exacta, nacida el %s → «%s»', (nacimiento, esperado) => {
    expect(describirEdad(nacimiento, true, HOY)).toBe(esperado);
  });

  it.each([
    ['2026-09-21', 'Menos de 1 mes'],
    ['2026-09-13', 'Cerca de 1 mes'],
    ['2026-02-13', 'Unos 8 meses'],
    ['2024-05-13', 'Unos 2 años'],
    ['2023-09-13', 'Unos 3 años'],
  ])('aproximada, nacida el %s → «%s» (sin meses sueltos)', (nacimiento, esperado) => {
    expect(describirEdad(nacimiento, false, HOY)).toBe(esperado);
  });

  it('sin fecha de nacimiento', () => {
    expect(describirEdad(null, false, HOY)).toBe('Edad desconocida');
  });

  it('el mes se cumple solo al llegar el mismo día: 31 de enero → 28 de febrero son 28 días', () => {
    expect(diferenciaCalendario('2026-01-31', '2026-02-28')).toEqual({ anios: 0, meses: 0, dias: 28 });
    expect(diferenciaCalendario('2026-01-31', '2026-03-01')).toEqual({ anios: 0, meses: 1, dias: 1 });
  });

  it('año bisiesto: nacida el 29 de febrero de 2024, cumple 2 años el 1 de marzo de 2026', () => {
    expect(diferenciaCalendario('2024-02-29', '2026-02-28')).toEqual({ anios: 1, meses: 11, dias: 30 });
    expect(describirEdad('2024-02-29', true, '2026-03-01')).toBe('2 años');
  });

  it('una fecha futura (reloj o dato equivocado) no da una edad negativa', () => {
    expect(describirEdad('2026-11-01', true, HOY)).toBe('Nació hoy');
  });
});
