/**
 * Registro del parto con la cría y control reproductivo (CU-10, CU-11, HU-12).
 * Especificación: docs/tecnica/25-parto-y-control-reproductivo.md
 */
import { consulta, unidadDeTrabajo } from '../../datos/repositorio';
import { animalVigente, animalesVigentes, leerVigentes, vigentes } from '../../datos/vigentes';
import { fechaDelPredio } from '../../dominio/fechas';
import { buscarParentesco, type AnimalGenealogia, type Parentesco, type Reproductor } from '../../dominio/parentesco';
import { controlReproductivo, partoCercano, validarParto, type ContextoParto, type ErroresParto, type FormularioParto } from '../../dominio/reproduccion';
import type { FechaPredio, RegistroLocal, Sexo, Uuid } from '../../dominio/tipos';
import { PermisoDenegado, puedeCrear } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import {
  formularioVacio,
  registrarAnimal,
  siguienteNumeroLibre,
  validarFormulario,
  type AnimalConChapeta,
  type ErroresFormulario,
  type FormaProgenitor,
  type FormularioAnimal,
  type FotosCapturadas,
} from '../identificacion/registroAnimal';

export type PartoLocal = RegistroLocal<'parto'>;

/** Los datos de la cría que se escriben en el formulario del parto (sección 4). */
export interface FormularioCria {
  chapeta: string;
  sexo: Sexo | null;
  peso_inicial: string;
  forma_padre: FormaProgenitor;
  padre_id: string;
  padre_externo: string;
}

export function criaVacia(numero: string): FormularioCria {
  return { chapeta: numero, sexo: null, peso_inicial: '', forma_padre: 'desconocido', padre_id: '', padre_externo: '' };
}

/**
 * El formulario de registro de la cría: nacida en el predio el día del parto, exacta, hija de la vaca y
 * con la chapeta pendiente de poner (secciones 4 y 7).
 */
export function formularioDeCria(cria: FormularioCria, vacaId: Uuid, fecha: FechaPredio, hoy: FechaPredio): FormularioAnimal {
  return {
    ...formularioVacio(hoy),
    chapeta: cria.chapeta,
    sexo: cria.sexo,
    origen: 'nacido',
    fecha_nacimiento: fecha,
    fecha_nacimiento_exacta: true,
    peso_inicial: cria.peso_inicial,
    forma_madre: 'predio',
    madre_id: vacaId,
    forma_padre: cria.forma_padre,
    padre_id: cria.padre_id,
    padre_externo: cria.padre_externo,
    sin_chapeta_puesta: true,
  };
}

/** El reproductor indicado, para buscar parentescos; null si es desconocido o está vacío. */
export function reproductorDe(cria: FormularioCria): Reproductor | null {
  if (cria.forma_padre === 'predio' && cria.padre_id !== '') return { id: cria.padre_id };
  if (cria.forma_padre === 'externo' && cria.padre_externo.trim() !== '') return { externo: cria.padre_externo };
  return null;
}

async function contextoDe(vacaId: Uuid) {
  // Valores vigentes y sin partos anulados (documento técnico 26, sección 6.3).
  const vaca = await animalVigente(vacaId);
  if (!vaca) return null;
  const [salidas, partos] = await Promise.all([
    consulta.salida.where('animal_id').equals(vacaId).count(),
    consulta.parto.where('madre_id').equals(vacaId).toArray().then((r) => vigentes('parto', r)),
  ]);
  const contexto: ContextoParto = { esHembra: vaca.sexo === 'hembra', retirada: salidas > 0, nacimientoVaca: vaca.fecha_nacimiento };
  return { vaca, partos, contexto };
}

async function genealogia(): Promise<Map<Uuid, AnimalGenealogia>> {
  return new Map((await animalesVigentes()).map((a) => [a.id, a]));
}

/** Lo que el formulario necesita mientras se escribe: contexto, parto cercano, parentesco y número sugerido. */
export async function cargarParaParto(vacaId: Uuid, fecha: FechaPredio, reproductor: Reproductor | null) {
  const [datos, animales] = await Promise.all([contextoDe(vacaId), animalesVigentes()]);
  if (!datos) return null;
  return {
    contexto: datos.contexto,
    cercano: partoCercano(datos.partos, fecha),
    parentesco: reproductor ? buscarParentesco(new Map(animales.map((a) => [a.id, a])), vacaId, reproductor) : null,
    numeroSugerido: siguienteNumeroLibre(animales.map((a) => a.codigo_chapeta)),
    machos: animales
      .filter((a) => a.sexo === 'macho')
      .sort((a, b) => a.codigo_chapeta.localeCompare(b.codigo_chapeta, 'es', { numeric: true }))
      .map((a) => ({ id: a.id, codigo_chapeta: a.codigo_chapeta })),
  };
}

/** Las confirmaciones del formulario (secciones 4.2 y 5). */
export interface ConfirmacionesParto {
  cercano: boolean;
  parentesco: boolean;
}

export const PARTO_SIN_CONFIRMAR: ConfirmacionesParto = { cercano: false, parentesco: false };

export type ResultadoParto =
  | { ok: true; parto: PartoLocal; cria: RegistroLocal<'animal'> | null }
  | { ok: false; errores: ErroresParto; erroresCria: ErroresFormulario }
  | { ok: false; chapetaAsignada: AnimalConChapeta }
  | { ok: false; requiereConfirmacion: 'cercano' | 'parentesco'; parentesco?: Parentesco };

class Detener extends Error {
  constructor(readonly resultado: ResultadoParto) {
    super('Parto no registrado');
  }
}

/**
 * Registra un parto. Con cría viva, la cría se registra con el flujo del registro de animales (CU-02) y el
 * parto se crea en la misma transacción; si algo falla, no se guarda nada (sección 4). El parto cercano y
 * el parentesco se verifican otra vez dentro de la transacción.
 *
 * @throws PermisoDenegado si el perfil no puede registrar partos (Tabla 27).
 */
export async function registrarParto(
  vacaId: Uuid,
  formulario: FormularioParto,
  cria: FormularioCria | null,
  usuario: Identidad,
  confirmaciones: ConfirmacionesParto = PARTO_SIN_CONFIRMAR,
  hoy: FechaPredio = fechaDelPredio(),
  fotos: FotosCapturadas = {},
): Promise<ResultadoParto> {
  if (!puedeCrear(usuario.perfil, 'parto')) throw new PermisoDenegado(usuario.perfil, 'parto');
  const inicial = await contextoDe(vacaId);
  if (!inicial) return { ok: false, errores: { vaca: 'La vaca no está en este teléfono' }, erroresCria: {} };

  const v = validarParto(formulario, inicial.contexto, hoy);
  const conCria = formulario.resultado === 'cria_viva';
  const formularioCria = conCria && cria ? formularioDeCria(cria, vacaId, formulario.fecha, hoy) : null;
  const vc = formularioCria ? validarFormulario(formularioCria, hoy) : null;
  const erroresCria = vc && !vc.ok ? vc.errores : {};
  if (!v.ok || Object.keys(erroresCria).length > 0 || (conCria && !cria)) {
    return { ok: false, errores: v.ok ? {} : v.errores, erroresCria };
  }

  /** Las verificaciones que dependen de lo que hay en el teléfono, repetidas dentro de la transacción. */
  async function verificar() {
    const datos = await contextoDe(vacaId);
    if (!datos) throw new Detener({ ok: false, errores: { vaca: 'La vaca no está en este teléfono' }, erroresCria: {} });
    const otra = validarParto(formulario, datos.contexto, hoy);
    if (!otra.ok) throw new Detener({ ok: false, errores: otra.errores, erroresCria: {} });
    if (partoCercano(datos.partos, otra.fecha) && !confirmaciones.cercano) throw new Detener({ ok: false, requiereConfirmacion: 'cercano' });
    const reproductor = cria && conCria ? reproductorDe(cria) : null;
    const parentesco = reproductor ? buscarParentesco(await genealogia(), vacaId, reproductor) : null;
    if (parentesco && !confirmaciones.parentesco) throw new Detener({ ok: false, requiereConfirmacion: 'parentesco', parentesco });
    return otra;
  }

  try {
    if (formularioCria) {
      let parto: PartoLocal | null = null;
      const r = await registrarAnimal(formularioCria, usuario, hoy, fotos, async (tx, animal) => {
        const valido = await verificar();
        parto = await tx.crear('parto', { madre_id: vacaId, fecha: valido.fecha, resultado: 'cria_viva', cria_id: animal.id, observacion: valido.observacion });
      });
      if (!r.ok) return 'chapetaAsignada' in r ? { ok: false, chapetaAsignada: r.chapetaAsignada } : { ok: false, errores: {}, erroresCria: r.errores };
      return { ok: true, parto: parto!, cria: r.animal };
    }
    const parto = await unidadDeTrabajo(usuario.usuario_id, async (tx) => {
      const valido = await verificar();
      return tx.crear('parto', { madre_id: vacaId, fecha: valido.fecha, resultado: valido.resultado, cria_id: null, observacion: valido.observacion });
    });
    return { ok: true, parto, cria: null };
  } catch (error) {
    if (error instanceof Detener) return error.resultado;
    throw error;
  }
}

/** El control reproductivo de la vaca, con las crías vivas de su descendencia (CU-11, sección 8). */
export async function cargarControlReproductivo(vacaId: Uuid) {
  const [todos, usuarios] = await Promise.all([leerVigentes('parto', await consulta.parto.where('madre_id').equals(vacaId).toArray()), consulta.usuario.toArray()]);
  // Los anulados no cuentan en el número de partos ni en los intervalos, pero se muestran (documento técnico 26, sección 6).
  const control = controlReproductivo(todos.filter((v) => v.anulacion === null).map((v) => v.registro));
  const crias = (await Promise.all(control.descendencia.map((id) => animalVigente(id)))).filter((a): a is RegistroLocal<'animal'> => a !== undefined);
  const nombres = new Map(usuarios.map((u) => [u.id, u.nombre]));
  return {
    ...control,
    vigentes: new Map(todos.map((v) => [v.registro.id, v])),
    anulados: todos.filter((v) => v.anulacion !== null).map((v) => ({ vigente: v, autor: nombres.get(v.original.autor_id) ?? 'un usuario que ya no está en el predio' })),
    crias: crias.map((c) => ({ id: c.id, codigo_chapeta: c.codigo_chapeta, sexo: c.sexo, fecha_nacimiento: c.fecha_nacimiento })),
  };
}
