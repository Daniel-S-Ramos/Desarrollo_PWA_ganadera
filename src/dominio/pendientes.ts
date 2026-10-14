/**
 * Cómo se nombra lo que falta por enviar (documentos técnicos 11, 12 y 14).
 *
 * Una foto viaja en dos partes: la fila de datos (quién la tomó, cuándo, qué vista) y la imagen. Para
 * el usuario es una sola cosa, una fotografía, así que la fila de datos de una foto no se cuenta entre
 * los «registros»: un animal con una foto es «1 registro y 1 fotografía» (decisión del 2026-10-13,
 * tras PE-22). La fila de una foto pendiente implica su imagen pendiente, porque la imagen sube
 * después de la fila (documento 14, sección 6.2).
 */

/** «1 registro», «3 fotografías», «1 registro y 3 fotografías». */
export function describirPendientes(registros: number, fotografias: number): string {
  const partes: string[] = [];
  if (registros > 0 || fotografias === 0) partes.push(registros === 1 ? '1 registro' : `${registros} registros`);
  if (fotografias > 0) partes.push(fotografias === 1 ? '1 fotografía' : `${fotografias} fotografías`);
  return partes.join(' y ');
}
