/**
 * Registro de un animal (CU-02, HU-01, RF-01, RF-03, RF-04).
 * Especificación: docs/tecnica/13-registro-de-animal.md
 *
 * La validación son funciones puras, sin base de datos: la pantalla las usa mientras el usuario
 * escribe y las pruebas las ejercitan sin almacenamiento. La escritura vuelve a verificar la
 * chapeta dentro de la misma transacción que crea el animal (sección 2.2).
 */
import { consulta, unidadDeTrabajo } from '../../datos/repositorio';
import { fechaDelPredio, formatearFecha } from '../../dominio/fechas';
import { TIPOS_FOTOGRAFIA, type DatosNuevos, type FechaPredio, type RegistroLocal, type Sexo, type TipoFotografia, type Uuid } from '../../dominio/tipos';
import { PermisoDenegado, puedeCrear } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';

// ---------------------------------------------------------------------------
// Chapeta: sección 2.1
// ---------------------------------------------------------------------------

/**
 * Numeración del predio, definida por el propietario el 2026-10-12: del 1 al 9999 y, después, una
 * letra seguida de un número del 1 al 999 (A1 … A999, B1 …). La letra O no se usa, para no
 * confundirla con el cero. Es la misma expresión de la restricción del servicio (sección 8).
 */
const FORMATO_CHAPETA = /^([1-9][0-9]{0,3}|[A-NP-Z][1-9][0-9]{0,2})$/;

/**
 * Quita espacios y guiones, pasa a mayúsculas y elimina los ceros a la izquierda del número:
 * «01», « 1 » → «1»; «a-01» → «A1».
 */
export function normalizarChapeta(texto: string): string {
  return texto
    .replace(/[\s-]+/g, '')
    .toUpperCase()
    .replace(/^([A-Z]?)0+(?=[0-9])/, '$1');
}

/** Mensaje de error de una chapeta ya normalizada, o null si es válida. */
export function errorDeChapeta(chapeta: string): string | null {
  if (chapeta.length === 0) return 'Escriba el número de la chapeta';
  if (FORMATO_CHAPETA.test(chapeta)) return null;
  if (chapeta.startsWith('O')) return 'La letra O no se usa en las chapetas del predio. ¿Quiso escribir un cero?';
  return 'Use un número del 1 al 9999, o una letra seguida de un número del 1 al 999 (por ejemplo, A15)';
}

// ---------------------------------------------------------------------------
// Edad aproximada: sección 3.2
// ---------------------------------------------------------------------------

export type UnidadEdad = 'meses' | 'anios';
export const EDAD_MAXIMA_MESES = 300;

/**
 * Fecha de nacimiento estimada a partir de una edad. La resta conserva el día; si ese día no existe
 * en el mes de llegada, toma el último día del mes (31 de marzo − 1 mes = 28 o 29 de febrero).
 */
export function fechaPorEdad(hoy: FechaPredio, cantidad: number, unidad: UnidadEdad): FechaPredio {
  const meses = unidad === 'anios' ? cantidad * 12 : cantidad;
  const [anio, mes, dia] = hoy.split('-').map(Number) as [number, number, number];
  const total = anio * 12 + (mes - 1) - meses;
  const nuevoAnio = Math.floor(total / 12);
  const nuevoMes = (total % 12) + 1;
  // El día 0 del mes siguiente es el último día de este mes.
  const ultimoDia = new Date(Date.UTC(nuevoAnio, nuevoMes, 0)).getUTCDate();
  const nuevoDia = Math.min(dia, ultimoDia);
  return `${String(nuevoAnio).padStart(4, '0')}-${String(nuevoMes).padStart(2, '0')}-${String(nuevoDia).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Formulario: secciones 3 y 4
// ---------------------------------------------------------------------------

export type Origen = 'nacido' | 'comprado';
/** Cómo se conoce el nacimiento de un animal comprado. */
export type NacimientoComprado = 'desconocido' | 'edad' | 'fecha';
/** Cómo se conoce un progenitor: no se sabe, es un animal del predio o es externo al predio. */
export type FormaProgenitor = 'desconocido' | 'predio' | 'externo';

/** Lo que el usuario escribe, tal como lo escribe: los números llegan como texto. */
export interface FormularioAnimal {
  chapeta: string;
  sexo: Sexo | null;
  origen: Origen | null;
  fecha_nacimiento: string;
  fecha_nacimiento_exacta: boolean;
  fecha_ingreso: string;
  procedencia: string;
  nacimiento_comprado: NacimientoComprado;
  edad: string;
  unidad_edad: UnidadEdad;
  peso_inicial: string;
  forma_madre: FormaProgenitor;
  madre_id: string;
  madre_externa: string;
  forma_padre: FormaProgenitor;
  padre_id: string;
  padre_externo: string;
}

export type CampoFormulario =
  | 'chapeta'
  | 'sexo'
  | 'origen'
  | 'fecha_nacimiento'
  | 'fecha_ingreso'
  | 'procedencia'
  | 'edad'
  | 'peso_inicial'
  | 'madre_id'
  | 'madre_externa'
  | 'padre_id'
  | 'padre_externo';

export type ErroresFormulario = Partial<Record<CampoFormulario, string>>;

export function formularioVacio(hoy: FechaPredio = fechaDelPredio()): FormularioAnimal {
  return {
    chapeta: '',
    sexo: null,
    origen: null,
    fecha_nacimiento: hoy,
    fecha_nacimiento_exacta: true,
    fecha_ingreso: hoy,
    procedencia: '',
    nacimiento_comprado: 'edad',
    edad: '',
    unidad_edad: 'meses',
    peso_inicial: '',
    forma_madre: 'desconocido',
    madre_id: '',
    madre_externa: '',
    forma_padre: 'desconocido',
    padre_id: '',
    padre_externo: '',
  };
}

/** ¿Escribió el usuario algo? Decide si Cancelar pide confirmación (CU-02, 7a). */
export function formularioModificado(formulario: FormularioAnimal, hoy: FechaPredio = fechaDelPredio()): boolean {
  return JSON.stringify(formulario) !== JSON.stringify(formularioVacio(hoy));
}

export const LARGO_MAXIMO_TEXTO = 100;
export const PESO_MINIMO = 1;
export const PESO_MAXIMO = 1500;
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaValida(texto: string): boolean {
  if (!FORMATO_FECHA.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto);
}

/** Valida una fecha obligatoria: que exista y que no sea posterior a hoy. */
function errorDeFecha(texto: string, hoy: FechaPredio): string | null {
  if (!esFechaValida(texto)) return 'Escriba una fecha válida';
  if (texto > hoy) return 'La fecha no puede ser posterior a hoy';
  return null;
}

/** Convierte un número escrito con coma o con punto decimal. */
function leerNumero(texto: string): number {
  const limpio = texto.trim().replace(',', '.');
  return limpio === '' ? Number.NaN : Number(limpio);
}

export type ResultadoValidacion = { ok: true; datos: DatosNuevos<'animal'> } | { ok: false; errores: ErroresFormulario };

/**
 * Valida el formulario completo y lo convierte en los datos de la Tabla 24. Devuelve todos los
 * errores juntos, uno por campo, para que el usuario los corrija de una vez.
 */
export function validarFormulario(formulario: FormularioAnimal, hoy: FechaPredio = fechaDelPredio()): ResultadoValidacion {
  const errores: ErroresFormulario = {};

  const chapeta = normalizarChapeta(formulario.chapeta);
  const errorChapeta = errorDeChapeta(chapeta);
  if (errorChapeta) errores.chapeta = errorChapeta;

  if (!formulario.sexo) errores.sexo = 'Indique si es macho o hembra';

  // Origen: sección 3. Un animal sin fecha de ingreso nació en el predio (sección 3.1).
  let fechaNacimiento: FechaPredio | null = null;
  let exacta = false;
  let fechaIngreso: FechaPredio | null = null;
  let procedencia: string | null = null;

  if (formulario.origen === 'nacido') {
    const error = errorDeFecha(formulario.fecha_nacimiento, hoy);
    if (error) errores.fecha_nacimiento = error;
    fechaNacimiento = formulario.fecha_nacimiento;
    exacta = formulario.fecha_nacimiento_exacta;
  } else if (formulario.origen === 'comprado') {
    const errorIngreso = errorDeFecha(formulario.fecha_ingreso, hoy);
    if (errorIngreso) errores.fecha_ingreso = errorIngreso;
    fechaIngreso = formulario.fecha_ingreso;

    const textoProcedencia = formulario.procedencia.trim();
    if (textoProcedencia.length > LARGO_MAXIMO_TEXTO) errores.procedencia = `Hasta ${LARGO_MAXIMO_TEXTO} caracteres`;
    procedencia = textoProcedencia === '' ? null : textoProcedencia;

    if (formulario.nacimiento_comprado === 'edad') {
      const edad = leerNumero(formulario.edad);
      const meses = formulario.unidad_edad === 'anios' ? edad * 12 : edad;
      if (!Number.isInteger(edad) || meses < 0 || meses > EDAD_MAXIMA_MESES) {
        errores.edad = 'Escriba la edad en números enteros, hasta 300 meses o 25 años';
      } else {
        fechaNacimiento = fechaPorEdad(hoy, edad, formulario.unidad_edad);
      }
      exacta = false;
    } else if (formulario.nacimiento_comprado === 'fecha') {
      const error = errorDeFecha(formulario.fecha_nacimiento, hoy);
      if (error) errores.fecha_nacimiento = error;
      fechaNacimiento = formulario.fecha_nacimiento;
      exacta = formulario.fecha_nacimiento_exacta;
    }

    if (fechaNacimiento && !errores.fecha_nacimiento && !errores.edad && !errores.fecha_ingreso && fechaIngreso !== null && fechaNacimiento > fechaIngreso) {
      errores[formulario.nacimiento_comprado === 'edad' ? 'edad' : 'fecha_nacimiento'] =
        'La fecha de nacimiento no puede ser posterior a la de ingreso';
    }
  } else {
    errores.origen = 'Indique si nació en el predio o fue comprado';
  }

  // Peso inicial: opcional (sección 3.3).
  let peso: number | null = null;
  if (formulario.peso_inicial.trim() !== '') {
    peso = leerNumero(formulario.peso_inicial);
    if (!(peso >= PESO_MINIMO && peso <= PESO_MAXIMO)) errores.peso_inicial = 'El peso debe estar entre 1 y 1.500 kg';
  }

  // Genealogía: sección 4. Cada progenitor es del predio o externo, nunca las dos cosas (3.8.8).
  const madre = leerProgenitor(formulario.forma_madre, formulario.madre_id, formulario.madre_externa, errores, {
    campoId: 'madre_id',
    campoExterno: 'madre_externa',
    sinElegir: 'Elija la madre',
    sinTexto: 'Escriba el nombre o la referencia de la madre',
  });
  const padre = leerProgenitor(formulario.forma_padre, formulario.padre_id, formulario.padre_externo, errores, {
    campoId: 'padre_id',
    campoExterno: 'padre_externo',
    sinElegir: 'Elija el padre',
    sinTexto: 'Escriba el nombre o la referencia del reproductor',
  });

  if (Object.keys(errores).length > 0) return { ok: false, errores };

  return {
    ok: true,
    datos: {
      codigo_chapeta: chapeta,
      sexo: formulario.sexo!,
      fecha_nacimiento: fechaNacimiento,
      fecha_nacimiento_exacta: fechaNacimiento === null ? false : exacta,
      fecha_ingreso: fechaIngreso,
      procedencia,
      peso_inicial: peso,
      madre_id: madre.id,
      madre_externa: madre.externo,
      padre_id: padre.id,
      padre_externo: padre.externo,
    },
  };
}

/** Convierte la forma elegida (desconocido, del predio o externo) en el identificador o el texto. */
function leerProgenitor(
  forma: FormaProgenitor,
  id: string,
  externo: string,
  errores: ErroresFormulario,
  textos: { campoId: CampoFormulario; campoExterno: CampoFormulario; sinElegir: string; sinTexto: string },
): { id: Uuid | null; externo: string | null } {
  if (forma === 'predio') {
    if (id === '') errores[textos.campoId] = textos.sinElegir;
    return { id: id === '' ? null : id, externo: null };
  }
  if (forma === 'externo') {
    const texto = externo.trim();
    if (texto === '') errores[textos.campoExterno] = textos.sinTexto;
    else if (texto.length > LARGO_MAXIMO_TEXTO) errores[textos.campoExterno] = `Hasta ${LARGO_MAXIMO_TEXTO} caracteres`;
    return { id: null, externo: texto === '' ? null : texto };
  }
  return { id: null, externo: null };
}

// ---------------------------------------------------------------------------
// Consultas: secciones 2.3 y 4
// ---------------------------------------------------------------------------

/** El animal que ya tiene una chapeta, con lo necesario para mostrarlo (Tabla 31). */
export interface AnimalConChapeta {
  animal: RegistroLocal<'animal'>;
  autor: string | null;
  retirado: boolean;
}

/** Busca la chapeta entre todos los animales del teléfono, activos y retirados. */
export async function buscarPorChapeta(chapeta: string): Promise<AnimalConChapeta | null> {
  const animal = await consulta.animal.where('codigo_chapeta').equals(normalizarChapeta(chapeta)).first();
  if (!animal) return null;
  const [salidas, autor] = await Promise.all([
    consulta.salida.where('animal_id').equals(animal.id).count(),
    consulta.usuario.get(animal.autor_id),
  ]);
  return { animal, autor: autor?.nombre ?? null, retirado: salidas > 0 };
}

/** «Hembra · nacida el 4 de marzo de 2021 · registrada por José Ramos». */
export function describirAnimalConChapeta({ animal, autor }: AnimalConChapeta): string {
  const hembra = animal.sexo === 'hembra';
  const partes = [hembra ? 'Hembra' : 'Macho'];
  if (animal.fecha_nacimiento) {
    const aproximada = animal.fecha_nacimiento_exacta ? '' : ' (aproximada)';
    partes.push(`${hembra ? 'nacida' : 'nacido'} el ${formatearFecha(animal.fecha_nacimiento)}${aproximada}`);
  } else if (animal.fecha_ingreso) {
    partes.push(`ingresó el ${formatearFecha(animal.fecha_ingreso)}`);
  }
  if (autor) partes.push(`${hembra ? 'registrada' : 'registrado'} por ${autor}`);
  return partes.join(' · ');
}

export interface Progenitor {
  id: Uuid;
  codigo_chapeta: string;
  retirado: boolean;
}

/** Hembras y machos que pueden elegirse como madre o padre, ordenados por chapeta (sección 4). */
export async function listarProgenitores(): Promise<{ hembras: Progenitor[]; machos: Progenitor[] }> {
  const [animales, salidas] = await Promise.all([consulta.animal.toArray(), consulta.salida.toArray()]);
  // Orden numérico y no alfabético: 9 antes que 10, y A2 antes que A10. Los números van antes que las letras.
  animales.sort((a, b) => a.codigo_chapeta.localeCompare(b.codigo_chapeta, 'es', { numeric: true }));
  const retirados = new Set(salidas.map((s) => s.animal_id));
  const hembras: Progenitor[] = [];
  const machos: Progenitor[] = [];
  for (const a of animales) {
    (a.sexo === 'hembra' ? hembras : machos).push({ id: a.id, codigo_chapeta: a.codigo_chapeta, retirado: retirados.has(a.id) });
  }
  return { hembras, machos };
}

// ---------------------------------------------------------------------------
// Registro: sección 6
// ---------------------------------------------------------------------------

/**
 * Fotografías capturadas en el formulario, ya comprimidas, por vista (docs/tecnica/14-fotografias.md,
 * sección 5). Una vista sin foto simplemente no aparece (CU-02, flujo 6a).
 */
export type FotosCapturadas = Partial<Record<TipoFotografia, { completa: Blob; reducida: Blob }>>;

export type ResultadoRegistro =
  | { ok: true; animal: RegistroLocal<'animal'>; fotografias: number }
  | { ok: false; errores: ErroresFormulario }
  | { ok: false; chapetaAsignada: AnimalConChapeta };

class ChapetaAsignada extends Error {}

class ProgenitorInvalido extends Error {
  constructor(
    readonly campo: 'madre_id' | 'padre_id',
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/**
 * Registra un animal. Valida, y dentro de una sola transacción vuelve a verificar la chapeta y los
 * progenitores y crea el animal con su entrada en la cola. Si algo falla, no se escribe nada.
 *
 * @throws PermisoDenegado si el perfil no puede registrar animales (Tabla 27).
 */
export async function registrarAnimal(
  formulario: FormularioAnimal,
  usuario: Identidad,
  hoy: FechaPredio = fechaDelPredio(),
  fotos: FotosCapturadas = {},
): Promise<ResultadoRegistro> {
  if (!puedeCrear(usuario.perfil, 'animal')) throw new PermisoDenegado(usuario.perfil, 'animal');

  const validacion = validarFormulario(formulario, hoy);
  if (!validacion.ok) return validacion;
  const { datos } = validacion;

  try {
    const animal = await unidadDeTrabajo(usuario.usuario_id, async (tx) => {
      // Segunda verificación, dentro de la transacción (sección 2.2). Solo lee tablas de la
      // transacción: el autor del animal existente se consulta después, fuera de ella.
      if (await consulta.animal.where('codigo_chapeta').equals(datos.codigo_chapeta).count()) throw new ChapetaAsignada();
      await verificarProgenitor(datos.madre_id, 'hembra', 'madre_id');
      await verificarProgenitor(datos.padre_id, 'macho', 'padre_id');
      const animal = await tx.crear('animal', datos);
      // En la misma transacción: si el animal se rechaza, no queda ninguna fotografía ni imagen.
      for (const tipo of TIPOS_FOTOGRAFIA) {
        const foto = fotos[tipo];
        if (!foto) continue;
        const fotografia = await tx.crear('fotografia', { animal_id: animal.id, tipo });
        await tx.guardarImagen(fotografia, foto);
      }
      return animal;
    });
    return { ok: true, animal, fotografias: TIPOS_FOTOGRAFIA.filter((t) => fotos[t]).length };
  } catch (error) {
    if (error instanceof ChapetaAsignada) {
      const existente = await buscarPorChapeta(datos.codigo_chapeta);
      if (existente) return { ok: false, chapetaAsignada: existente };
    }
    if (error instanceof ProgenitorInvalido) return { ok: false, errores: { [error.campo]: error.message } };
    throw error;
  }
}

async function verificarProgenitor(id: Uuid | null, sexo: Sexo, campo: 'madre_id' | 'padre_id'): Promise<void> {
  if (id === null) return;
  const progenitor = await consulta.animal.get(id);
  const esMadre = campo === 'madre_id';
  if (!progenitor) {
    throw new ProgenitorInvalido(
      campo,
      esMadre ? 'La madre elegida no está registrada en este teléfono' : 'El padre elegido no está registrado en este teléfono',
    );
  }
  if (progenitor.sexo !== sexo) throw new ProgenitorInvalido(campo, esMadre ? 'La madre debe ser una hembra' : 'El padre debe ser un macho');
}
