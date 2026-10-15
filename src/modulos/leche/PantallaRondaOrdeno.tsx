import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { fechaDelPredio, formatearFecha } from '../../dominio/fechas';
import { compararConPromedio, formatearLitros, leerLitros, validarOrdeno } from '../../dominio/leche';
import type { Identidad } from '../../sesion/token';
import { cargarRonda, promedioDe, puedeReemplazar, registrarOrdeno, siguienteVaca, type VacaRonda } from './ronda';

/**
 * Ronda de ordeño (CU-06, HU-04). Especificación: docs/tecnica/22-ronda-de-ordeno.md, secciones 4 a 7.
 * El usuario consigna una vaca y la pantalla prepara la siguiente sin registro (3.10.4.4).
 */
export function PantallaRondaOrdeno({ identidad }: { identidad: Identidad }) {
  const [hoy] = useState(() => fechaDelPredio());
  const [fecha, setFecha] = useState(hoy);
  const [elegida, setElegida] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const vacas = useLiveQuery(() => cargarRonda(fecha), [fecha]);

  if (!vacas) return <p className="texto-secundario">Cargando…</p>;

  // CU-06, 2a: sin vacas en producción se indica y se sugiere revisar los destinos.
  if (vacas.length === 0) {
    return (
      <div className="formulario">
        <p className="titulo-seccion">Ronda de ordeño</p>
        <div className="aviso aviso--atencion aviso--en-contenido">
          <p>Ninguna vaca tiene el destino Producción de leche.</p>
          <p className="aviso__detalle">Asígnelo desde la ficha de cada vaca.</p>
        </div>
        <Link className="boton boton--secundario boton--ancho" to="/animales">
          Ir al listado de animales
        </Link>
      </div>
    );
  }

  const actual = vacas.find((v) => v.animal_id === elegida) ?? siguienteVaca(vacas);
  const registradas = vacas.filter((v) => v.existente).length;

  return (
    <div className="formulario ronda">
      <Link className="enlace" to="/">
        ← Volver al inicio
      </Link>
      <p className="titulo-seccion">Ronda de ordeño</p>

      <label className="campo">
        <span>Fecha del ordeño</span>
        <input
          type="date"
          max={hoy}
          value={fecha}
          onChange={(e) => {
            setFecha(e.target.value);
            setElegida(null);
            setUltimo(null);
          }}
        />
      </label>

      {ultimo && (
        <p className="aviso aviso--correcto aviso--en-contenido" role="status">
          {ultimo}
        </p>
      )}

      {actual ? (
        // La clave reinicia el formulario al pasar a otra vaca o a otra fecha.
        <FormularioVaca
          key={`${actual.animal_id}-${fecha}`}
          vaca={actual}
          fecha={fecha}
          hoy={hoy}
          identidad={identidad}
          alTerminar={(mensaje) => {
            setUltimo(mensaje);
            setElegida(null);
          }}
        />
      ) : (
        <p className="aviso aviso--correcto aviso--en-contenido" role="status">
          ✓ Ronda completa: {registradas} de {vacas.length} vacas
        </p>
      )}

      <section className="tarjeta">
        <h2>
          Vacas en producción · {registradas} de {vacas.length}
        </h2>
        <ul className="ronda__lista">
          {vacas.map((v) => (
            <li key={v.animal_id}>
              <button
                type="button"
                className={`ronda__vaca${actual?.animal_id === v.animal_id ? ' ronda__vaca--actual' : ''}`}
                aria-current={actual?.animal_id === v.animal_id}
                onClick={() => {
                  setElegida(v.animal_id);
                  setUltimo(null);
                }}
              >
                <span className="ronda__chapeta">{v.codigo_chapeta}</span>
                <span>{v.existente ? `✓ ${formatearLitros(v.existente.litros)} litros` : 'Sin registro'}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function FormularioVaca({
  vaca,
  fecha,
  hoy,
  identidad,
  alTerminar,
}: {
  vaca: VacaRonda;
  fecha: string;
  hoy: string;
  identidad: Identidad;
  alTerminar: (mensaje: string) => void;
}) {
  const [texto, setTexto] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const promedio = useLiveQuery(() => promedioDe(vaca.animal_id, fecha), [vaca.animal_id, fecha]);

  const { existente } = vaca;
  const permitido = !existente || puedeReemplazar(identidad, existente);
  const validacion = validarOrdeno(texto, fecha, hoy);
  const errores = intentado && !validacion.ok ? validacion.errores : {};
  const litros = leerLitros(texto);
  const igual = existente !== null && litros !== null && litros === existente.litros;
  const comparacion = litros !== null && promedio?.resultado ? compararConPromedio(litros, promedio.resultado.promedio) : null;
  const bloqueado = guardando || !permitido || (existente !== null && !igual && !confirmado);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (!validacion.ok || bloqueado) return;
    setGuardando(true);
    try {
      const r = await registrarOrdeno(vaca.animal_id, fecha, texto, identidad, confirmado, hoy);
      if (r.ok) {
        const valor = formatearLitros(validacion.litros);
        alTerminar(
          r.resultado === 'registrado'
            ? `✓ ${vaca.codigo_chapeta}: ${valor} litros registrados`
            : r.resultado === 'reemplazado'
              ? `✓ ${vaca.codigo_chapeta}: el valor se reemplazó por ${valor} litros`
              : `${vaca.codigo_chapeta} ya tenía ${valor} litros: no se guardó nada`,
        );
      } else if ('requiereConfirmacion' in r) {
        // Llegó un registro de otro teléfono entre la vista y el guardado (sección 7.1).
        setConfirmado(false);
        setAviso('Mientras escribía llegó un registro de esta vaca para esta fecha. Revíselo y confirme el reemplazo.');
      } else if ('sinPermiso' in r) setAviso('No puede reemplazar este registro: la enmienda corresponde al propietario.');
      else if (r.errores.animal) setAviso(r.errores.animal);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="tarjeta formulario" onSubmit={guardar} noValidate>
      <h2 className="ronda__titulo">
        Vaca <span className="registrado__chapeta">{vaca.codigo_chapeta}</span>
      </h2>

      {/* Sección 6.2: el promedio reciente, para comparar durante el ordeño. */}
      <p className="texto-secundario">
        {promedio === undefined
          ? 'Calculando el promedio…'
          : promedio.resultado
            ? `Promedio de los últimos ${promedio.dias} días: ${formatearLitros(promedio.resultado.promedio)} litros (${promedio.resultado.registros} ${promedio.resultado.registros === 1 ? 'registro' : 'registros'})`
            : `Sin registros en los últimos ${promedio.dias} días para comparar`}
      </p>

      {existente && permitido && (
        // CU-06, 3a: el valor ya registrado, su autor y que el nuevo lo reemplazará.
        <div className="aviso aviso--atencion aviso--en-contenido" role="alert">
          <p>
            Ya hay un registro de {vaca.codigo_chapeta} para el {formatearFecha(fecha)}: <strong>{formatearLitros(existente.litros)} litros</strong>,
            registrado por {existente.autor}. El valor nuevo lo reemplazará.
          </p>
          <label className="casilla">
            <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />
            Confirmo el reemplazo
          </label>
        </div>
      )}
      {existente && !permitido && (
        // CU-06, 3b: el trabajador no reemplaza un registro del propietario (3.9.5).
        <div className="aviso aviso--atencion aviso--en-contenido" role="alert">
          <p>
            {vaca.codigo_chapeta} ya tiene {formatearLitros(existente.litros)} litros el {formatearFecha(fecha)}, registrados por {existente.autor}.
          </p>
          <p className="aviso__detalle">No puede reemplazar este registro: la enmienda corresponde al propietario.</p>
        </div>
      )}

      <label className="campo">
        <span>Litros</span>
        <input
          className="campo__litros"
          type="text"
          inputMode="decimal"
          autoFocus
          disabled={!permitido}
          value={texto}
          aria-invalid={!!errores.litros}
          onChange={(e) => {
            setTexto(e.target.value);
            setAviso(null);
          }}
        />
        <span className="campo__ayuda">0 significa que se ordeñó y no produjo.</span>
        {errores.litros && <span className="campo__error">{errores.litros}</span>}
        {errores.fecha && <span className="campo__error">{errores.fecha}</span>}
      </label>

      {/* Sección 6.3: la diferencia en litros y en palabras; muy por debajo, en aviso de atención. */}
      {comparacion && (
        <p className={comparacion.atencion ? 'aviso aviso--atencion aviso--en-contenido' : 'texto-secundario'} role="status">
          {comparacion.atencion && '⚠ '}
          {comparacion.palabras}: {comparacion.diferencia.charAt(0).toLowerCase() + comparacion.diferencia.slice(1)}.
        </p>
      )}
      {igual && <p className="texto-secundario">Ya tiene ese valor.</p>}
      {aviso && (
        <p className="campo__error" role="alert">
          {aviso}
        </p>
      )}

      <button className="boton boton--principal boton--ancho" type="submit" disabled={bloqueado}>
        {guardando ? 'Guardando…' : igual ? 'Continuar con la siguiente' : existente ? 'Reemplazar y continuar' : 'Guardar y continuar'}
      </button>
    </form>
  );
}
