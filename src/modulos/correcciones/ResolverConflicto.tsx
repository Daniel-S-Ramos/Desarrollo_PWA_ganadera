import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { RegistroLocal, Uuid } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { useUrlDeImagen } from '../../ui/useUrlDeImagen';
import { consolidarFicha } from '../consulta/ficha';
import { describirAnimalConChapeta } from '../identificacion/registroAnimal';
import {
  cargarConflictoDeChapeta,
  describirMovimientos,
  medicamentoExistente,
  puedeResolver,
  resolverCambiandoNumero,
  resolverColocacion,
  resolverMedicamento,
  resolverUniendo,
  type Resultado,
} from './conflictos';

/** Ejecuta una resolución mostrando «Guardando…» y el error si se detuvo. */
function useResolucion() {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function ejecutar(trabajo: () => Promise<Resultado>, alTerminar?: () => void) {
    setGuardando(true);
    setError(null);
    try {
      const r = await trabajo();
      if (r.ok) alTerminar?.();
      else setError(r.error);
    } finally {
      setGuardando(false);
    }
  }
  return { guardando, error, setError, ejecutar };
}

/**
 * La chapeta repetida en la ficha del animal en conflicto, para el propietario o quien lo registró (documento
 * técnico 26, sección 10.1): el animal que ya tiene el número y las dos opciones de la regla del propietario.
 */
export function ResolverConflictoChapeta({ animalId, numero, identidad }: { animalId: Uuid; numero: string; identidad: Identidad }) {
  const conflicto = useLiveQuery(() => cargarConflictoDeChapeta(animalId), [animalId]);
  const fichaExistente = useLiveQuery(async () => (conflicto?.existente ? await consolidarFicha(conflicto.existente.animal.id) : undefined), [conflicto?.existente?.animal.id]);
  const foto = useUrlDeImagen(fichaExistente?.fotoPrincipal);
  const [opcion, setOpcion] = useState<'numero' | 'unir' | null>(null);
  const [nuevo, setNuevo] = useState('');
  const { guardando, error, setError, ejecutar } = useResolucion();
  const navegar = useNavigate();

  if (!conflicto || !puedeResolver(identidad, conflicto.autor_id)) return null;
  const { existente, plan } = conflicto;
  const pasan = describirMovimientos(plan, 'pasar');
  const descartados = describirMovimientos(plan, 'descartar');

  return (
    <section className="tarjeta aviso--atencion conflicto" aria-label="Resolver el conflicto">
      <h2>Resolver el conflicto</h2>
      <p>
        Otro teléfono registró antes un animal con el número <strong>{numero}</strong>. Este animal todavía no llegó al servicio.
      </p>

      {existente ? (
        <div className="conflicto__existente">
          {foto ? <img className="conflicto__foto" src={foto} alt={`Animal ${existente.animal.codigo_chapeta}`} /> : <div className="conflicto__foto fila-animal__sin-foto">Sin foto</div>}
          <div>
            <p>
              <Link className="enlace" to={`/animales/${existente.animal.id}`}>
                {existente.animal.codigo_chapeta}
              </Link>{' '}
              ya registrado
            </p>
            <p className="texto-secundario">{describirAnimalConChapeta(existente)}</p>
            {existente.retirado && <p className="texto-secundario">{existente.animal.sexo === 'hembra' ? 'Retirada' : 'Retirado'} del predio</p>}
          </div>
        </div>
      ) : (
        <p className="texto-secundario">
          El animal que ya tiene ese número todavía no llegó a este teléfono. Puede cambiar el número ahora, o esperar a que llegue para unirlos.
        </p>
      )}

      {opcion === null && (
        <div className="conflicto__opciones">
          <button type="button" className="boton boton--secundario boton--ancho" onClick={() => setOpcion('numero')}>
            Son animales distintos: cambiar el número
          </button>
          {existente && (
            <button type="button" className="boton boton--secundario boton--ancho" onClick={() => setOpcion('unir')}>
              Es el mismo animal: unir con {existente.animal.codigo_chapeta}
            </button>
          )}
        </div>
      )}

      {opcion === 'numero' && (
        // No es un <form>: la ficha no lo es, pero así puede usarse dentro de otro sin recargar (PE-25).
        <div className="formulario" role="group" aria-label="Cambiar el número">
          <label className="campo">
            <span>Número nuevo de la chapeta</span>
            <input
              type="text"
              autoCapitalize="characters"
              value={nuevo}
              onChange={(e) => {
                setNuevo(e.target.value);
                setError(null);
              }}
            />
            {error && <span className="campo__error">{error}</span>}
          </label>
          <p className="texto-secundario">El animal se volverá a enviar con el número nuevo, junto con sus fotos y registros.</p>
          <div className="aviso__acciones">
            <button type="button" className="boton boton--principal" disabled={guardando} onClick={() => void ejecutar(() => resolverCambiandoNumero(animalId, nuevo, identidad))}>
              {guardando ? 'Guardando…' : 'Cambiar el número'}
            </button>
            <button type="button" className="boton boton--secundario" onClick={() => setOpcion(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {opcion === 'unir' && existente && (
        <div className="formulario" role="group" aria-label="Unir con el animal registrado">
          <p>
            <strong>Pasarán a {existente.animal.codigo_chapeta}:</strong> {pasan || 'ningún registro'}.
          </p>
          {descartados && (
            <p className="texto-secundario">
              Se descartan, porque solo describían a este animal: {descartados}.
            </p>
          )}
          <p className="texto-secundario">Este animal se retira del teléfono. No se puede deshacer.</p>
          {error && <p className="campo__error">{error}</p>}
          <div className="aviso__acciones">
            <button
              type="button"
              className="boton boton--principal"
              disabled={guardando}
              onClick={() => void ejecutar(() => resolverUniendo(animalId, existente.animal.id, identidad), () => void navegar(`/animales/${existente.animal.id}`, { replace: true }))}
            >
              {guardando ? 'Guardando…' : 'Confirmar la unión'}
            </button>
            <button type="button" className="boton boton--secundario" onClick={() => setOpcion(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** «Usar el que ya existe» en el catálogo, para el propietario o quien lo registró (sección 10.2). */
export function ResolverConflictoMedicamento({ medicamento, identidad }: { medicamento: RegistroLocal<'medicamento'>; identidad: Identidad }) {
  const existente = useLiveQuery(() => medicamentoExistente(medicamento), [medicamento.id, medicamento.nombre]);
  const { guardando, error, ejecutar } = useResolucion();
  if (medicamento.estado_sync !== 'conflicto' || !puedeResolver(identidad, medicamento.autor_id)) return null;
  if (!existente) return <span className="texto-secundario">El medicamento registrado todavía no llegó a este teléfono.</span>;
  return (
    <span>
      <button type="button" className="boton boton--secundario" disabled={guardando} onClick={() => void ejecutar(() => resolverMedicamento(medicamento.id, identidad))}>
        {guardando ? 'Guardando…' : `Usar el que ya existe (${existente.nombre})`}
      </button>
      {error && <span className="campo__error"> {error}</span>}
    </span>
  );
}

/** «Descartar» la chapeta puesta que otro teléfono registró primero, para el propietario o quien la registró (sección 10.3). */
export function ResolverConflictoColocacion({ colocacion, identidad }: { colocacion: RegistroLocal<'colocacion_chapeta'>; identidad: Identidad }) {
  const { guardando, error, ejecutar } = useResolucion();
  if (!puedeResolver(identidad, colocacion.autor_id)) return null;
  return (
    <span>
      <button type="button" className="boton boton--secundario" disabled={guardando} onClick={() => void ejecutar(() => resolverColocacion(colocacion.id, identidad))}>
        {guardando ? 'Guardando…' : 'Descartar'}
      </button>
      {error && <span className="campo__error"> {error}</span>}
    </span>
  );
}
