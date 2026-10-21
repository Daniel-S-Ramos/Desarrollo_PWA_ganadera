-- =============================================================================
-- Observación de la salida por pérdida o robo
-- Especificación: docs/tecnica/29-salida-y-venta.md, sección 4
--
-- CU-13, flujo 3b: si el motivo de la salida es una pérdida o un robo, el sistema omite los campos
-- económicos y admite una observación. La tabla salida no tenía dónde guardarla.
-- La columna es opcional para todos los motivos; la aplicación solo la ofrece en la pérdida o el robo.
-- =============================================================================

alter table public.salida
  add column observacion text check (observacion is null or length(observacion) <= 300);

comment on column public.salida.observacion is
  'Observación opcional de una salida por pérdida o robo (CU-13, 3b; docs/tecnica/29-salida-y-venta.md, sección 4).';
