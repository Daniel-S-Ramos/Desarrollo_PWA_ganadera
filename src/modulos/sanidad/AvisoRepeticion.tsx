import { formatearFecha } from '../../dominio/fechas';
import { describirHace } from '../../dominio/repeticion';
import { describirDosis } from '../../dominio/sanidad';
import type { FechaPredio } from '../../dominio/tipos';
import { DistintivoSync } from '../../ui/componentes/DistintivoSync';
import type { VerificacionRepeticion } from './eventos';

/**
 * La última aplicación del medicamento al animal, en dos niveles, y la nota sobre los registros del
 * teléfono (docs/tecnica/21-advertencia-por-repeticion.md, secciones 3, 4 y 6; Figura 19).
 */
export function AvisoRepeticion({
  verificacion,
  chapeta,
  hoy,
  confirmado,
  alConfirmar,
  cargaIncompleta,
}: {
  verificacion: VerificacionRepeticion;
  chapeta: string;
  hoy: FechaPredio;
  confirmado: boolean;
  alConfirmar: (confirmado: boolean) => void;
  cargaIncompleta: boolean;
}) {
  const { repeticion, medicamento, unidad, intervalo, autor } = verificacion;
  const nota = (
    <p className="aviso__detalle">
      La verificación se hace con los registros que hay en este teléfono.
      {cargaIncompleta && ' La información del predio todavía está llegando: puede haber aplicaciones que aún no aparecen.'}
    </p>
  );

  if (repeticion.nivel === 'ninguno') {
    return (
      <div className="aviso aviso--en-contenido aviso--neutro" role="status">
        <p>
          Sin aplicaciones anteriores de <strong>{medicamento}</strong> a este animal en este teléfono.
        </p>
        {nota}
      </div>
    );
  }

  const { aplicacion } = repeticion;
  const cuando = `${formatearFecha(aplicacion.fecha)} (${describirHace(aplicacion.fecha, hoy)})`;
  // La dosis que se registró la vez anterior, como dato (Tabla 30: la aplicación recupera la última dosis
  // registrada y no formula recomendación alguna). Pedido del autor en la sesión B, 2026-10-25.
  const dosis = aplicacion.dosis === null ? 'sin dosis registrada' : `con ${describirDosis(aplicacion.dosis, unidad)}`;
  const estado = <DistintivoSync estado={aplicacion.estado_sync} {...(aplicacion.detalle_conflicto ? { detalle: aplicacion.detalle_conflicto } : {})} />;

  if (repeticion.nivel === 'informacion') {
    return (
      <div className="aviso aviso--en-contenido aviso--neutro" role="status">
        <p>
          Última aplicación de <strong>{medicamento}</strong> a este animal: <strong>{cuando}</strong>, <strong>{dosis}</strong>, registrada por {autor}
        </p>
        {estado}
        {nota}
      </div>
    );
  }

  return (
    <div className="aviso aviso--atencion aviso--en-contenido" role="alert">
      <p>
        ⚠{' '}
        <strong>
          {medicamento} ya se aplicó a {chapeta} el {cuando}, {dosis}
        </strong>
        {repeticion.posterior ? ', después de la fecha que está registrando' : ''}, registrada por {autor}
      </p>
      {estado}
      <p>
        El intervalo de este medicamento es de {intervalo === 1 ? '1 día' : `${intervalo} días`}.
      </p>
      <label className="casilla">
        <input type="checkbox" checked={confirmado} onChange={(e) => alConfirmar(e.target.checked)} />
        Confirmo que esta nueva aplicación es correcta
      </label>
      {nota}
    </div>
  );
}
