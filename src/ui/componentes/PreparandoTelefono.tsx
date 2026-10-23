import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { contarLoDescargado } from '../../sync/cargaInicial';
import { pasosDeCarga, porcentajeDeCarga, type EstadoPaso } from '../estadoSincronizacion';
import vaca from '../imagenes/vaca-preparando.webp';
import { IconoFlecha } from './Iconos';
import { CaraVaca, Senal4G } from './Ilustraciones';
import { useEnLinea, useEstadoMotor } from '../useEstadoMotor';

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
  // La barra solo se muestra mientras la descarga avanza; interrumpida, lo dice el aviso.
  const porcentaje = motor.sincronizando ? porcentajeDeCarga(motor.avance?.datos) : null;

  return (
    <section className="tarjeta preparando" aria-live="polite">
      <img className="preparando__dibujo" src={vaca} alt="" width={640} height={310} />
      <h2 className="preparando__titulo">Preparando este teléfono</h2>
      <p className="texto-secundario preparando__explicacion">Está llegando la información del predio. Mientras tanto puede consultar, pero no registrar.</p>

      {porcentaje !== null && (
        <div className="preparando__avance">
          <div className="preparando__avance-texto">
            <span>Avance de la descarga</span>
            <strong>{porcentaje} %</strong>
          </div>
          <div className="barra-avance" role="progressbar" aria-label="Avance de la descarga" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje}>
            <div className="barra-avance__relleno" style={{ width: `${porcentaje}%` }} />
          </div>
        </div>
      )}

      <ul className="preparando__pasos">
        <Paso estado={pasos.referencia}>Usuarios y parámetros</Paso>
        <Paso estado={pasos.animales}>Animales: {descargado.animales}</Paso>
        <Paso estado={pasos.registros}>
          Registros: {descargado.registros}
          {pasos.registros === 'en_curso' ? '…' : ''}
        </Paso>
        <Paso estado="pendiente" detalle="Llegan después, sin impedir registrar.">
          Fotos de los animales
        </Paso>
      </ul>

      {interrumpida ? (
        <p className="aviso aviso--atencion aviso--en-contenido">
          ⚠ {enLinea ? 'La descarga se interrumpió; se reintentará en unos minutos.' : 'Sin conexión: la descarga continuará donde quedó cuando vuelva la señal.'}
        </p>
      ) : (
        <div className="preparando__conexion">
          <span className="preparando__conexion-icono" aria-hidden="true">
            <Senal4G />
          </span>
          <p>
            <strong>Mantenga la conexión.</strong>
            <br />
            Si se corta, la descarga continuará donde quedó.
          </p>
        </div>
      )}

      <Link className="boton boton--secundario boton--ancho boton--ilustrado" to="/animales">
        <span className="boton__ilustracion">
          <CaraVaca tamano={34} conFondo={false} />
        </span>
        <span>Ver los animales que ya llegaron</span>
        <span className="boton__flecha">
          <IconoFlecha />
        </span>
      </Link>
    </section>
  );
}

const NOMBRE_ESTADO: Record<EstadoPaso, string> = { hecho: 'listo', en_curso: 'en curso', pendiente: 'pendiente' };

/** Un paso de la carga, con su ícono de estado: listo, en curso o pendiente. */
function Paso({ estado, detalle, children }: { estado: EstadoPaso; detalle?: string; children: React.ReactNode }) {
  return (
    <li className="preparando__paso">
      <span className={`preparando__estado preparando__estado--${estado}`} role="img" aria-label={NOMBRE_ESTADO[estado]}>
        {estado === 'hecho' && (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        )}
        {estado === 'en_curso' && (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 11a8 8 0 0 0-14.3-4.6L4 8" />
            <path d="M4 3.5V8h4.5" />
            <path d="M4 13a8 8 0 0 0 14.3 4.6L20 16" />
            <path d="M20 20.5V16h-4.5" />
          </svg>
        )}
      </span>
      <span>
        {children}
        {detalle && <span className="preparando__detalle">{detalle}</span>}
      </span>
    </li>
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
