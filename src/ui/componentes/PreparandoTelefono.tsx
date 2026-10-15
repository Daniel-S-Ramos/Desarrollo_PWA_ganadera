import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { contarLoDescargado } from '../../sync/cargaInicial';
import { pasosDeCarga, type EstadoPaso } from '../estadoSincronizacion';
import { useEnLinea, useEstadoMotor } from '../useEstadoMotor';

const ICONO: Record<EstadoPaso, string> = { hecho: '✓', en_curso: '↻', pendiente: '○' };

/**
 * «Preparando este teléfono»: el avance de la carga inicial (documento técnico 17, secciones 4 y 5).
 * Mientras se muestra no se puede registrar; sí consultar lo que ya llegó.
 */
export function PreparandoTelefono() {
  const motor = useEstadoMotor();
  const enLinea = useEnLinea();
  // Lo que ya hay en el teléfono: no se reinicia si la descarga se corta y se reanuda.
  const descargado = useLiveQuery(() => contarLoDescargado(), [], { usuarios: 0, animales: 0, registros: 0 });
  const pasos = pasosDeCarga({ sincronizando: motor.sincronizando, tabla: motor.avance?.datos?.tabla ?? null, ...descargado });
  const interrumpida = !motor.sincronizando && (!enLinea || motor.ultima?.estado === 'sin_red' || motor.ultima?.estado === 'error_bajada');

  return (
    <section className="tarjeta preparando" aria-live="polite">
      <h2>Preparando este teléfono</h2>
      <p className="texto-secundario">Está llegando la información del predio. Mientras tanto puede consultar, pero no registrar.</p>

      <ul className="preparando__pasos">
        <li>
          <span aria-hidden="true">{ICONO[pasos.referencia]}</span> Usuarios y parámetros
        </li>
        <li>
          <span aria-hidden="true">{ICONO[pasos.animales]}</span> Animales: {descargado.animales}
        </li>
        <li>
          <span aria-hidden="true">{ICONO[pasos.registros]}</span> Registros: {descargado.registros}
          {pasos.registros === 'en_curso' ? '…' : ''}
        </li>
        <li>
          <span aria-hidden="true">{ICONO.pendiente}</span> Fotos de los animales (llegan después, sin impedir registrar)
        </li>
      </ul>

      {interrumpida ? (
        <p className="aviso aviso--atencion aviso--en-contenido">
          ⚠ {enLinea ? 'La descarga se interrumpió; se reintentará en unos minutos.' : 'Sin conexión: la descarga continuará donde quedó cuando vuelva la señal.'}
        </p>
      ) : (
        <p>Mantenga la conexión. Si se corta, la descarga continuará donde quedó.</p>
      )}

      <Link className="boton boton--secundario boton--ancho" to="/animales">
        Ver los animales que ya llegaron
      </Link>
    </section>
  );
}

/** Lo que se muestra en lugar del formulario de registro durante la carga inicial (sección 5). */
export function RegistroEnEspera({
  titulo = 'Registrar animal',
  razon = 'Así se evita registrar una chapeta que ya existe en otro teléfono.',
}: {
  titulo?: string;
  razon?: string;
}) {
  return (
    <div className="formulario">
      <p className="titulo-seccion">{titulo}</p>
      <p className="aviso aviso--atencion aviso--en-contenido">Espere a que termine de llegar la información del predio para registrar. {razon}</p>
      <Link className="boton boton--secundario boton--ancho" to="/">
        Volver al inicio
      </Link>
    </div>
  );
}
