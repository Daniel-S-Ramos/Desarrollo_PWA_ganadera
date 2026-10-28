-- =============================================================================
-- Peso de finalización de la ceba · docs/tecnica/34-produccion-de-carne.md, sección 6 bis
--
-- El propietario da por terminado un animal de ceba desde los 500 kg (aclaración del
-- 2026-10-24; el apartado 2.2.7 recoge que suelen venderse por encima de 600 kg). Como
-- los demás umbrales de la Tabla 30, su definición corresponde al propietario (3.10.4.6).
-- =============================================================================

insert into public.parametro (clave, valor, unidad, descripcion) values
  ('peso_final_ceba', 500, 'kg', 'Peso mínimo con el que el propietario da por terminado un animal de ceba');
