/**
 * Corregir un campo o anular un registro (CU-17, HU-17, apartado 3.9.5).
 * Especificación: docs/tecnica/26-correccion-y-anulacion.md, secciones 2 a 5 y 7
 */
import { consulta, unidadDeTrabajo } from '../../datos/repositorio';
import { animalVigente, animalesVigentes, leerVigentes, vigentes } from '../../datos/vigentes';
import { aTexto, CAMPOS_CORREGIBLES, seAnula, validarValor, type CampoCorregible, type ContextoValor } from '../../dominio/camposCorregibles';
import { fechaDelPredio } from '../../dominio/fechas';
import type { Vigente } from '../../dominio/vigente';
import { MOTIVOS_CORRECCION, type EntidadCorregible, type FechaPredio, type MotivoCorreccion, type Perfil, type RegistroLocal, type Uuid } from '../../dominio/tipos';
import { PermisoDenegado, puedeCorregir } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { fechaDeLlegada } from '../destino/destino';

export const NOMBRE_MOTIVO: Record<MotivoCorreccion, string> = {
  error_digitacion: 'Error de digitación',
  animal_equivocado: 'Animal equivocado',
  fecha_equivocada: 'Fecha equivocada',
  registro_duplicado: 'Registro duplicado',
  otro: 'Otro',
};

export const LARGO_NOTA = 300;

/** Las entidades que tienen pantalla de corrección (sección 3). */
export const ENTIDADES_CON_CORRECCION = ['evento_sanitario', 'produccion_leche', 'pesaje', 'parto', 'destino_productivo', 'animal', 'medicamento'] as const;
export type EntidadConCorreccion = (typeof ENTIDADES_CON_CORRECCION)[number];

export function esEntidadConCorreccion(valor: string): valor is EntidadConCorreccion {
  return (ENTIDADES_CON_CORRECCION as readonly string[]).includes(valor);
}

/**
 * Qué ve el usuario sobre un registro (sección 4): la opción, el aviso de ventana vencida (CU-17, 2b) o nada
 * (2a). El propietario siempre la ve, salvo en un registro en conflicto: nunca llegó al servicio, así que
 * primero se resuelve el conflicto (sección 10.6, decisión C).
 */
export function opcionDeCorreccion(
  usuario: Identidad,
  registro: Pick<RegistroLocal<EntidadCorregible>, 'creado_en'> & { estado_sync?: string },
  perfilAutor: Perfil | undefined,
  ahora: Date = new Date(),
): 'mostrar' | 'vencida' | 'oculta' {
  if (registro.estado_sync === 'conflicto') return 'oculta';
  if (puedeCorregir(usuario, registro, perfilAutor, ahora)) return 'mostrar';
  return perfilAutor === 'trabajador' ? 'vencida' : 'oculta';
}

/** Los campos que este usuario puede corregir en la entidad (el costo, solo el propietario). */
export function camposPara(entidad: EntidadCorregible, perfil: Perfil): [string, CampoCorregible][] {
  return Object.entries(CAMPOS_CORREGIBLES[entidad]).filter(([, c]) => !c.soloPropietario || perfil === 'propietario');
}

type Registro = RegistroLocal<EntidadConCorreccion>;

/** El registro con sus valores vigentes, su anulación y sus correcciones; undefined si no está en el teléfono. */
export async function cargarVigente(entidad: EntidadConCorreccion, id: Uuid): Promise<Vigente<Registro> | undefined> {
  const tabla = consulta[entidad] as unknown as { get: (id: Uuid) => Promise<Registro | undefined> };
  const original = await tabla.get(id);
  if (!original) return undefined;
  return (await leerVigentes(entidad as EntidadCorregible, [original] as never))[0] as unknown as Vigente<Registro>;
}

/** Lo que necesitan las validaciones del valor nuevo: límites de fecha, sexos y catálogo (sección 3). */
export async function contextoDeValor(entidad: EntidadConCorreccion, registro: Registro, hoy: FechaPredio): Promise<ContextoValor> {
  const [animales, medicamentos] = await Promise.all([animalesVigentes(), entidad === 'evento_sanitario' ? vigentes('medicamento', await consulta.medicamento.toArray()) : Promise.resolve([])]);
  const sexos = new Map(animales.map((a) => [a.id, a.sexo]));
  const idAnimal = 'animal_id' in registro ? (registro.animal_id as Uuid) : 'madre_id' in registro && entidad === 'parto' ? (registro.madre_id as Uuid) : null;
  const animal = idAnimal ? await animalVigente(idAnimal) : undefined;
  let limite: ContextoValor['limite'] = null;
  if (animal && (entidad === 'evento_sanitario' || entidad === 'parto') && animal.fecha_nacimiento) {
    limite = { fecha: animal.fecha_nacimiento, mensaje: (f) => (entidad === 'parto' ? `La vaca nació el ${f}` : `El animal nació el ${f}`) };
  }
  if (animal && entidad === 'pesaje') {
    const llegada = fechaDeLlegada(animal);
    if (llegada) limite = { fecha: llegada, mensaje: (f) => `El animal llegó al predio el ${f}` };
  }
  return { hoy, limite, sexoDe: (id) => sexos.get(id), existeMedicamento: (id) => medicamentos.some((m) => m.id === id) };
}

export interface FormularioCorreccion {
  operacion: 'corregir' | 'anular';
  campo: string;
  valor: string;
  motivo: MotivoCorreccion | null;
  nota: string;
}

export type ErroresCorreccion = Partial<Record<'operacion' | 'campo' | 'valor' | 'motivo' | 'nota' | 'registro', string>>;

/** Las reglas de la pantalla, sin base de datos (secciones 2, 3 y 7): devuelve la corrección lista para agregar. */
export function validarCorreccion(
  entidad: EntidadConCorreccion,
  vigente: Pick<Vigente<Registro>, 'registro' | 'anulacion'>,
  f: FormularioCorreccion,
  perfil: Perfil,
  ctx: ContextoValor,
): { ok: true; correccion: { tipo: 'correccion' | 'anulacion'; campo: string | null; valor_anterior: string | null; valor_nuevo: string | null; motivo: MotivoCorreccion; nota: string | null } } | { ok: false; errores: ErroresCorreccion } {
  const errores: ErroresCorreccion = {};
  if (vigente.anulacion) return { ok: false, errores: { registro: 'Este registro está anulado. Si el dato era correcto, regístrelo de nuevo' } };
  if (f.operacion === 'anular' && !seAnula(entidad)) errores.operacion = 'Este registro no se anula: corrija el campo que está mal';
  if (!f.motivo || !MOTIVOS_CORRECCION.includes(f.motivo)) errores.motivo = 'Elija el motivo';
  const nota = f.nota.trim();
  if (f.motivo === 'otro' && nota === '') errores.nota = 'Con el motivo «otro», escriba una nota';
  else if (nota.length > LARGO_NOTA) errores.nota = `Hasta ${LARGO_NOTA} caracteres`;

  let campo: string | null = null;
  let anterior: string | null = null;
  let nuevo: string | null = null;
  if (f.operacion === 'corregir') {
    const definicion = camposPara(entidad, perfil).find(([nombre]) => nombre === f.campo)?.[1];
    if (!definicion) errores.campo = 'Elija el campo que va a corregir';
    else {
      campo = f.campo;
      anterior = aTexto((vigente.registro as unknown as Record<string, unknown>)[f.campo]);
      const v = validarValor(entidad, f.campo, definicion, f.valor, ctx);
      if (!v.ok) errores.valor = v.error;
      else if (v.texto === anterior) errores.valor = 'Es el mismo valor';
      else {
        nuevo = v.texto;
        const conflicto = conflictoConOtrosCampos(entidad, f.campo, nuevo, vigente.registro);
        if (conflicto) errores.valor = conflicto;
      }
    }
  }

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return {
    ok: true,
    correccion:
      f.operacion === 'anular'
        ? { tipo: 'anulacion', campo: null, valor_anterior: null, valor_nuevo: null, motivo: f.motivo!, nota: nota === '' ? null : nota }
        : { tipo: 'correccion', campo, valor_anterior: anterior, valor_nuevo: nuevo, motivo: f.motivo!, nota: nota === '' ? null : nota },
  };
}

/**
 * Reglas entre campos del animal (documento 13, secciones 3 y 4): madre y padre del predio o externos, nunca
 * las dos formas a la vez; el nacimiento no puede ser posterior al ingreso.
 */
function conflictoConOtrosCampos(entidad: EntidadConCorreccion, campo: string, nuevo: string, registro: Registro): string | null {
  if (entidad !== 'animal' || nuevo === '') return null;
  const animal = registro as RegistroLocal<'animal'>;
  if (campo === 'madre_id' && animal.madre_externa) return 'La madre está registrada como externa: corrija primero «Madre externa» y déjela vacía';
  if (campo === 'madre_externa' && animal.madre_id) return 'La madre es del predio: corrija primero «Madre del predio» y déjela vacía';
  if (campo === 'padre_id' && animal.padre_externo) return 'El padre está registrado como externo: corrija primero «Reproductor externo» y déjelo vacío';
  if (campo === 'padre_externo' && animal.padre_id) return 'El padre es del predio: corrija primero «Padre del predio» y déjelo vacío';
  if (campo === 'fecha_nacimiento' && animal.fecha_ingreso && nuevo > animal.fecha_ingreso) return 'La fecha de nacimiento no puede ser posterior a la de ingreso';
  if (campo === 'fecha_ingreso' && animal.fecha_nacimiento && nuevo < animal.fecha_nacimiento) return 'La fecha de ingreso no puede ser anterior a la de nacimiento';
  return null;
}

export type ResultadoCorreccion = { ok: true; correccion: RegistroLocal<'correccion'> } | { ok: false; errores: ErroresCorreccion };

class Detener extends Error {
  constructor(readonly errores: ErroresCorreccion) {
    super('Corrección no registrada');
  }
}

/**
 * Agrega la corrección o la anulación. El registro, su anulación, el permiso y el valor vigente se vuelven a
 * leer dentro de la transacción (sección 4); el servicio vuelve a aplicar el permiso.
 *
 * @throws PermisoDenegado si el perfil no puede intervenir ese registro (RD-05).
 */
export async function registrarCorreccion(
  entidad: EntidadConCorreccion,
  id: Uuid,
  formulario: FormularioCorreccion,
  usuario: Identidad,
  hoy: FechaPredio = fechaDelPredio(),
  ahora: Date = new Date(),
): Promise<ResultadoCorreccion> {
  // Los usuarios no participan en la transacción: se leen antes.
  const perfiles = new Map((await consulta.usuario.toArray()).map((u) => [u.id, u.perfil]));
  const inicial = await cargarVigente(entidad, id);
  if (!inicial) return { ok: false, errores: { registro: 'El registro no está en este teléfono' } };
  const ctx = await contextoDeValor(entidad, inicial.registro, hoy);
  if (opcionDeCorreccion(usuario, inicial.original, perfiles.get(inicial.original.autor_id), ahora) !== 'mostrar') {
    throw new PermisoDenegado(usuario.perfil, 'correccion');
  }
  try {
    const correccion = await unidadDeTrabajo(usuario.usuario_id, async (tx) => {
      const actual = await cargarVigente(entidad, id);
      if (!actual) throw new Detener({ registro: 'El registro no está en este teléfono' });
      const v = validarCorreccion(entidad, actual, formulario, usuario.perfil, ctx);
      if (!v.ok) throw new Detener(v.errores);
      return tx.crear('correccion', { entidad_afectada: entidad, registro_id: id, ...v.correccion });
    });
    return { ok: true, correccion };
  } catch (error) {
    if (error instanceof Detener) return { ok: false, errores: error.errores };
    throw error;
  }
}
