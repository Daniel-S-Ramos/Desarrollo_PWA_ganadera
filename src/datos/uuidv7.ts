/**
 * Generador de identificadores UUID versión 7 conforme a la RFC 9562 (apartado 3.7.1).
 *
 * Estructura de los 128 bits:
 *   48 bits  marca temporal Unix en milisegundos
 *    4 bits  versión (0111)
 *   12 bits  rand_a: contador que garantiza el orden dentro del mismo milisegundo
 *    2 bits  variante (10)
 *   62 bits  rand_b: aleatorio criptográfico
 *
 * Se usa el método 1 de la sección 6.2 de la RFC (contador en rand_a) para que dos
 * identificadores generados en el mismo dispositivo y el mismo milisegundo conserven
 * el orden de creación.
 */

let ultimoMs = -1;
let contador = 0;

export function uuidv7(ahora: number = Date.now()): string {
  let ms = ahora;
  if (ms <= ultimoMs) {
    // Mismo milisegundo, o reloj que retrocedió: se reutiliza la última marca y se avanza el contador.
    ms = ultimoMs;
    contador++;
    if (contador > 0xfff) {
      // Contador agotado: se avanza la marca un milisegundo para no perder el orden.
      ms = ultimoMs + 1;
      contador = 0;
    }
  } else {
    contador = 0;
  }
  ultimoMs = ms;

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // 48 bits de marca temporal (big-endian). Se divide para no exceder la precisión de los enteros de 32 bits.
  const alto = Math.floor(ms / 0x10000);
  const bajo = ms % 0x10000;
  bytes[0] = (alto >>> 24) & 0xff;
  bytes[1] = (alto >>> 16) & 0xff;
  bytes[2] = (alto >>> 8) & 0xff;
  bytes[3] = alto & 0xff;
  bytes[4] = (bajo >>> 8) & 0xff;
  bytes[5] = bajo & 0xff;

  // Versión 7 y los 12 bits del contador.
  bytes[6] = 0x70 | ((contador >>> 8) & 0x0f);
  bytes[7] = contador & 0xff;

  // Variante RFC: los dos bits más significativos en 10.
  bytes[8] = 0x80 | (bytes[8]! & 0x3f);

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Recupera la marca temporal en milisegundos codificada en un UUID v7. */
export function marcaTemporalDeUuidv7(id: string): number {
  const hex = id.replace(/-/g, '').slice(0, 12);
  return parseInt(hex, 16);
}
