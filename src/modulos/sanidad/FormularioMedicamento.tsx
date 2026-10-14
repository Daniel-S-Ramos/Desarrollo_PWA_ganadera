import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { formularioMedicamentoVacio, NOMBRE_TIPO, validarMedicamento, type FormularioMedicamento as Formulario } from '../../dominio/medicamentos';
import { TIPOS_MEDICAMENTO, UNIDADES_DOSIS, type TipoMedicamento, type UnidadDosis } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { buscarCoincidencias, crearMedicamento, listarCatalogo, type MedicamentoLocal } from './catalogo';

/**
 * Agregar un medicamento al catálogo (docs/tecnica/18-catalogo-de-medicamentos.md, secciones 4 y 5).
 * Lo usan la pantalla Medicamentos y, desde el paso 3.3, el registro sanitario (Tabla 31).
 * Si el nombre ya existe con otra escritura, ofrece el existente en lugar de crear un duplicado.
 */
export function FormularioMedicamento({
  identidad,
  alTerminar,
  alCancelar,
}: {
  identidad: Identidad;
  /** Recibe el medicamento creado, o el existente que eligió el usuario. */
  alTerminar: (medicamento: MedicamentoLocal) => void;
  alCancelar: () => void;
}) {
  const [formulario, setFormulario] = useState<Formulario>(formularioMedicamentoVacio);
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const catalogo = useLiveQuery(() => listarCatalogo(), [], []);

  const validacion = validarMedicamento(formulario);
  const errores = intentado && !validacion.ok ? validacion.errores : {};
  const { exacta, parecidos } = buscarCoincidencias(formulario.nombre, catalogo);
  const cambiar = (cambios: Partial<Formulario>) => setFormulario((f) => ({ ...f, ...cambios }));

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setIntentado(true);
    if (!validacion.ok || exacta) return;
    setGuardando(true);
    try {
      const resultado = await crearMedicamento(formulario, identidad);
      if (resultado.ok) alTerminar(resultado.medicamento);
      else if ('existente' in resultado) alTerminar(resultado.existente);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="formulario tarjeta" onSubmit={guardar} noValidate>
      <h2>Agregar medicamento</h2>

      <label className="campo">
        <span>Nombre</span>
        <input type="text" maxLength={60} autoFocus value={formulario.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} />
        <Error texto={errores.nombre} />
      </label>

      {exacta && (
        // Tabla 31: se ofrece el existente en lugar de crear un duplicado.
        <div className="aviso aviso--atencion aviso--en-contenido">
          <p>
            Ya existe <strong>{exacta.nombre}</strong>.
          </p>
          <button type="button" className="boton boton--principal boton--ancho" onClick={() => alTerminar(exacta)}>
            Usar {exacta.nombre}
          </button>
        </div>
      )}
      {!exacta && parecidos.length > 0 && (
        <div className="aviso aviso--atencion aviso--en-contenido">
          <p>¿Es alguno de estos? Si es otro producto, puede agregarlo igual.</p>
          <div className="aviso__acciones aviso__acciones--columna">
            {parecidos.map((m) => (
              <button key={m.id} type="button" className="boton boton--secundario" onClick={() => alTerminar(m)}>
                Usar {m.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      <Opciones<TipoMedicamento>
        leyenda="Tipo"
        valor={formulario.tipo}
        opciones={TIPOS_MEDICAMENTO.map((t) => [t, NOMBRE_TIPO[t]])}
        alElegir={(tipo) => cambiar({ tipo })}
        error={errores.tipo}
      />
      <Opciones<UnidadDosis>
        leyenda="Unidad de dosis"
        valor={formulario.unidad}
        opciones={UNIDADES_DOSIS.map((u) => [u, u])}
        alElegir={(unidad) => cambiar({ unidad })}
        error={errores.unidad}
      />

      <label className="campo">
        <span>Intervalo de advertencia, en días</span>
        <span className="campo__ayuda">¿Cada cuántos días como mínimo puede repetirse en el mismo animal? Consúltelo con el veterinario.</span>
        <input type="text" inputMode="numeric" value={formulario.intervalo} onChange={(e) => cambiar({ intervalo: e.target.value })} />
        <Error texto={errores.intervalo} />
      </label>

      <div className="acciones-formulario">
        <button className="boton boton--principal boton--ancho" type="submit" disabled={guardando || !!exacta}>
          {guardando ? 'Guardando…' : 'Agregar medicamento'}
        </button>
        <button className="boton boton--secundario boton--ancho" type="button" onClick={alCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Opciones<T extends string>({
  leyenda,
  valor,
  opciones,
  alElegir,
  error,
}: {
  leyenda: string;
  valor: T | null;
  opciones: [T, string][];
  alElegir: (valor: T) => void;
  error: string | undefined;
}) {
  return (
    <div className="campo">
      <fieldset className="opciones">
        <legend>{leyenda}</legend>
        {opciones.map(([clave, texto]) => (
          <button key={clave} type="button" className="opcion" aria-pressed={valor === clave} onClick={() => alElegir(clave)}>
            {texto}
          </button>
        ))}
      </fieldset>
      <Error texto={error} />
    </div>
  );
}

function Error({ texto }: { texto: string | undefined }) {
  return texto ? <span className="campo__error">{texto}</span> : null;
}

