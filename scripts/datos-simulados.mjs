/**
 * Genera el conjunto de datos simulados de la evaluación (paso 6.1, apartado 1.6.3.8).
 * Especificación: supabase/datos-simulados/README.md
 *
 * Reproduce el volumen de la Ganadería JR que estima el apartado 3.8.7 (Tabla 26): unos 55 animales, 15 vacas
 * en ordeño diario, 30 animales en ceba con un pesaje cada uno o dos meses, seis eventos sanitarios al año por
 * animal, unos 12 partos y los movimientos económicos de las compras, la alimentación y los servicios.
 *
 * Es determinista (semilla fija): cada ejecución produce el mismo archivo. Las fechas no son absolutas sino
 * «días antes de hoy», y el SQL las resuelve con la fecha del predio al cargarse, de modo que el año simulado
 * siempre termina el día de la carga. Los ordeños llegan hasta ayer: la ronda de hoy queda por hacer.
 *
 * Uso: node scripts/datos-simulados.mjs  →  supabase/datos-simulados/cargar.sql
 */
import fs from 'node:fs';

// ---------------------------------------------------------------------------
// Azar reproducible
// ---------------------------------------------------------------------------
let estado = 20261024;
function azar() {
  estado = (estado + 0x6d2b79f5) | 0;
  let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const entre = (a, b) => a + azar() * (b - a);
const entero = (a, b) => Math.floor(entre(a, b + 1));
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
const medio = (x) => Math.round(x * 2) / 2; // litros de medio en medio
const decimo = (x) => Math.round(x * 10) / 10;
const mil = (x) => Math.round(x / 1000) * 1000;

const DIAS = 365; // un año de historia
const MIN_DIA = 60 * 6; // minutos desde la medianoche para la hora del registro

// Autores: P = propietario; T1 y T2 = trabajadores (Tabla 27: destinos, salidas y economía solo el propietario).
const autorOrdeno = () => (azar() < 0.7 ? 'T1' : azar() < 0.83 ? 'T2' : 'P');
const autorCampo = () => elegir(['P', 'T1', 'T1', 'T2']);

// ---------------------------------------------------------------------------
// El hato
// ---------------------------------------------------------------------------
const animales = []; // { n, chapeta, sexo, nac, exacta, ingreso, procedencia, peso, madre, padre, padreExterno, madreExterna, puesta, registro, autor }
let siguiente = 1;
function animal(datos) {
  const a = { n: siguiente++, madre: null, padre: null, padreExterno: null, madreExterna: null, puesta: true, procedencia: null, ingreso: null, peso: null, ...datos };
  animales.push(a);
  return a;
}
const PROCEDENCIAS = ['Finca El Roble, Une', 'Subasta de Fosca', 'Finca La Esperanza, Chipaque', 'Feria de Cáqueza', 'Finca San Isidro, Ubaque'];

// Toro del predio y dos novillas reproductoras.
const toro = animal({ chapeta: '301', sexo: 'macho', nac: 365 * 5 + 40, exacta: false, ingreso: 365 * 3, procedencia: 'Finca El Roble, Une', peso: 520, registro: DIAS, autor: 'P' });
const novillas = [221, 222].map((c) => animal({ chapeta: String(c), sexo: 'hembra', nac: 365 * 2 + entero(0, 120), exacta: true, registro: DIAS, autor: 'P' }));

// 15 vacas en ordeño: 9 nacidas en el predio y 6 compradas.
const vacas = [];
for (let i = 0; i < 15; i++) {
  const comprada = i >= 9;
  vacas.push(
    animal({
      chapeta: String(201 + i),
      sexo: 'hembra',
      nac: 365 * entero(4, 8) + entero(0, 300),
      exacta: !comprada,
      ingreso: comprada ? entero(500, 1500) : null,
      procedencia: comprada ? elegir(PROCEDENCIAS) : null,
      peso: comprada ? entero(380, 450) : null,
      padreExterno: comprada ? null : elegir(['Toro Normando del vecino', 'Inseminación Holstein']),
      registro: DIAS,
      autor: 'P',
      base: entre(13, 20), // litros de la vaca en el pico
    }),
  );
}

// 42 animales de ceba en el año: 14 que ya estaban y 28 comprados durante el año.
const ceba = [];
for (let i = 0; i < 42; i++) {
  const yaEstaba = i < 14;
  const ingreso = yaEstaba ? entero(370, 540) : entero(20, 355);
  // Uno de cada cinco gana menos de lo que espera el propietario (0,5 kg/día).
  const adg = azar() < 0.2 ? entre(0.3, 0.47) : entre(0.52, 0.92);
  ceba.push(
    animal({
      chapeta: String(401 + i),
      sexo: azar() < 0.85 ? 'macho' : 'hembra',
      nac: ingreso + entero(240, 500),
      exacta: false,
      ingreso,
      procedencia: elegir(PROCEDENCIAS),
      peso: entero(190, 320),
      registro: Math.min(ingreso, DIAS),
      autor: elegir(['P', 'T1']),
      adg,
    }),
  );
}

// ---------------------------------------------------------------------------
// Registros
// ---------------------------------------------------------------------------
const destinos = []; // { a, destino, desde }
const ordenos = []; // { a, dia, min, litros, autor }
const pesajes = []; // { a, dia, peso, metodo, autor }
const partos = []; // { madre, dia, resultado, cria, observacion, autor }
const colocaciones = []; // { a, dia, autor }
const eventos = []; // { a, dia, medtipo, tipo, sel, costo, sintomas, autor }
const movimientos = []; // { a, concepto, dia, valor, descripcion }
const salidas = []; // { a, dia, motivo, peso, valor, comprador, causa, observacion }
const correcciones = []; // { tabla, a, dia, tipo, campo, anterior, nuevo, motivo, nota, autor, min }
const reemplazos = []; // ordeños registrados después de anular el primero del mismo día

const fueraDesde = new Map(); // a.n → día de salida (días antes de hoy)
const presente = (a, dia) => {
  const llegada = a.ingreso ?? a.nac;
  const salida = fueraDesde.get(a.n);
  return dia <= llegada && (salida === undefined || dia > salida);
};

// Destinos de los animales que ya estaban (anteriores al año simulado).
destinos.push({ a: toro, destino: 'reproductor', desde: toro.ingreso });
for (const n of novillas) destinos.push({ a: n, destino: 'reproductora', desde: n.nac - 300 });

// --- Partos, secado y ordeños ---------------------------------------------
const diasDeParto = [12, 33, 58, 81, 104, 132, 159, 187, 214, 248, 281, 319];
const resultados = ['cria_viva', 'cria_viva', 'cria_viva', 'cria_viva', 'cria_viva', 'aborto', 'cria_viva', 'cria_viva', 'cria_nacida_muerta', 'cria_viva', 'cria_viva', 'cria_viva'];
const crias = [];
diasDeParto.forEach((dia, i) => {
  const madre = vacas[i];
  madre.parto = dia;
  const resultado = resultados[i];
  let cria = null;
  if (resultado === 'cria_viva') {
    const sexo = crias.length % 2 === 0 ? 'hembra' : 'macho';
    const conToro = azar() < 0.5;
    cria = animal({
      chapeta: String(501 + crias.length),
      sexo,
      nac: dia,
      exacta: true,
      peso: entero(28, 40),
      madre: madre.n,
      padre: conToro ? toro.n : null,
      padreExterno: conToro ? null : 'Inseminación Holstein',
      puesta: false,
      registro: dia,
      autor: autorCampo(),
    });
    crias.push(cria);
  }
  partos.push({
    madre,
    dia,
    resultado,
    cria,
    observacion: resultado === 'aborto' ? 'Aborto a los siete meses; se avisó al veterinario' : resultado === 'cria_nacida_muerta' ? 'La cría nació sin vida tras un parto largo' : null,
    autor: autorCampo(),
  });
});
// Las crías con más de 30 días ya tienen la chapeta puesta; las dos más recientes siguen pendientes.
for (const c of crias) if (c.nac > 30) colocaciones.push({ a: c, dia: c.nac - entero(10, 25), autor: autorCampo() });
// Las hembras de más de 7 meses pasan a reproductoras.
for (const c of crias) if (c.sexo === 'hembra' && c.nac > 210) destinos.push({ a: c, destino: 'reproductora', desde: c.nac - 200 });

for (const v of vacas) {
  // Destino: leche desde que llegó (o desde sus dos años), y secado de 60 días antes del parto.
  const inicioLeche = v.ingreso ?? v.nac - 730;
  destinos.push({ a: v, destino: 'leche', desde: inicioLeche });
  if (v.parto !== undefined) {
    destinos.push({ a: v, destino: 'reproductora', desde: v.parto + 60 });
    destinos.push({ a: v, destino: 'leche', desde: v.parto });
  }
  // La lactancia de las vacas sin parto en el año empezó antes.
  const partoAnterior = v.parto ?? entero(DIAS + 30, DIAS + 200);
  for (let dia = DIAS; dia >= 1; dia--) {
    if (v.parto !== undefined && dia < v.parto + 60 && dia > v.parto) continue; // seca
    const ultimoParto = v.parto !== undefined && dia <= v.parto ? v.parto : partoAnterior;
    const enLactancia = ultimoParto - dia;
    if (azar() < 0.03) continue; // días que no se anotaron (apartado 3.8.6: no son ceros)
    const curva = (0.78 + 0.32 * Math.exp(-(((enLactancia - 50) / 85) ** 2))) * Math.max(0.42, 1 - enLactancia / 720);
    ordenos.push({ a: v, dia, min: entero(0, 150), litros: Math.max(1, medio(v.base * curva * entre(0.92, 1.08))), autor: autorOrdeno() });
  }
}
// Casos para los recordatorios (documento técnico 30): una vaca sin ordeño hace 5 días y otra con una baja de
// más del 35 % ayer (parámetro variacion_atipica_leche).
const sinOrdeno = vacas[13];
for (let i = ordenos.length - 1; i >= 0; i--) if (ordenos[i].a === sinOrdeno && ordenos[i].dia <= 5) ordenos.splice(i, 1);
const conBaja = vacas[14];
const ayer = ordenos.find((o) => o.a === conBaja && o.dia === 1) ?? (ordenos.push({ a: conBaja, dia: 1, min: 60, litros: 10, autor: 'T1' }), ordenos.at(-1));
ayer.litros = Math.max(1, medio(conBaja.base * 0.45));

// --- Ceba: pesajes, ventas, una muerte y una pérdida ------------------------
const COMPRADORES = ['Frigorífico de Guadalupe', 'Comerciante de Cáqueza', 'Feria de Villavicencio', 'Vecino de la vereda'];
const muerto = ceba[20];
const robado = ceba[27];
for (const c of ceba) {
  destinos.push({ a: c, destino: 'ceba', desde: c.ingreso });
  movimientos.push({ a: c, concepto: 'compra', dia: c.ingreso, valor: mil(c.peso * entre(8600, 9400)), descripcion: `Compra en ${c.procedencia}` });
  const peso = (dia) => c.peso + c.adg * (c.ingreso - dia);
  let dia = c.ingreso - entero(30, 75);
  while (dia >= 1) {
    if (c === muerto && dia < 140) break;
    if (c === robado && dia < 95) break;
    const real = peso(dia);
    const metodo = azar() < 0.85 ? 'cinta' : 'bascula';
    const medido = decimo(real * (metodo === 'cinta' ? entre(0.985, 1.015) : entre(0.997, 1.003)));
    pesajes.push({ a: c, dia, peso: medido, metodo, autor: elegir(['P', 'T1', 'T1']) });
    if (medido >= 505) {
      // Terminado: el propietario lo pasa a venta y lo vende en las semanas siguientes.
      const venta = dia - entero(4, 18);
      if (venta >= 2) {
        destinos.push({ a: c, destino: 'venta', desde: dia - 1 });
        const pesoVenta = decimo(peso(venta));
        salidas.push({ a: c, dia: venta, motivo: 'venta', peso: pesoVenta, valor: mil(pesoVenta * entre(8300, 9000)), comprador: elegir(COMPRADORES), causa: null, observacion: null });
        fueraDesde.set(c.n, venta);
      }
      break;
    }
    dia -= entero(30, 75); // cada uno o dos meses: el propietario no pesa a diario
  }
}
for (const x of [[muerto, 130], [robado, 88]]) {
  if (fueraDesde.has(x[0].n) || x[0].ingreso <= x[1] + 30) throw new Error(`El animal ${x[0].chapeta} no sirve para la muerte o la pérdida`);
}
salidas.push({ a: muerto, dia: 130, motivo: 'muerte', peso: null, valor: null, comprador: null, causa: 'Timpanismo', observacion: null });
fueraDesde.set(muerto.n, 130);
salidas.push({ a: robado, dia: 88, motivo: 'perdida_robo', peso: null, valor: null, comprador: null, causa: null, observacion: 'No apareció en el potrero de arriba; la cerca estaba cortada' });
fueraDesde.set(robado.n, 88);

// --- Eventos sanitarios: aftosa dos veces al año, purgas, vitaminas y tratamientos ---
const todos = () => animales;
for (const ciclo of [350, 170]) {
  for (const a of todos()) if (presente(a, ciclo)) eventos.push({ a, dia: ciclo - entero(0, 3), medtipo: 'vacuna', tipo: 'vacuna', sel: 0, costo: 2500, sintomas: null, autor: autorCampo() });
}
for (const a of todos()) {
  let dia = Math.min(DIAS, a.ingreso ?? a.nac) - entero(10, 90);
  while (dia >= 1) {
    if (presente(a, dia)) eventos.push({ a, dia, medtipo: 'purga', tipo: 'purga', sel: entero(0, 5), costo: entero(4, 6) * 1000, sintomas: null, autor: autorCampo() });
    dia -= entero(100, 140);
  }
}
for (const p of partos) eventos.push({ a: p.madre, dia: Math.max(1, p.dia - 2), medtipo: 'vitamina', tipo: 'vitamina', sel: entero(0, 5), costo: 7000, sintomas: null, autor: autorCampo() });
for (const c of ceba) if (c.ingreso <= DIAS && presente(c, c.ingreso - 3)) eventos.push({ a: c, dia: c.ingreso - 3, medtipo: 'vitamina', tipo: 'vitamina', sel: entero(0, 5), costo: 7000, sintomas: null, autor: autorCampo() });
const SINTOMAS = ['Cojera en la pata trasera derecha', 'Diarrea y decaimiento', 'Fiebre, no quiere comer', 'Mastitis en un cuarto', 'Tos y secreción nasal', 'Herida en el costado'];
for (let i = 0; i < 18; i++) {
  const a = elegir(animales);
  const dia = entero(2, 360);
  if (!presente(a, dia)) continue;
  eventos.push({ a, dia, medtipo: 'antibiotico', tipo: 'tratamiento', sel: entero(0, 5), costo: entero(35, 70) * 1000, sintomas: a.sexo === 'macho' ? elegir(SINTOMAS.filter((s) => !s.startsWith('Mastitis'))) : elegir(SINTOMAS), autor: autorCampo() });
}

// --- Movimientos económicos: compras de las vacas, alimentación y servicios ---
for (const v of vacas) if (v.ingreso !== null) movimientos.push({ a: v, concepto: 'compra', dia: v.ingreso, valor: mil(v.peso * entre(9500, 10500)), descripcion: `Compra en ${v.procedencia}` });
movimientos.push({ a: toro, concepto: 'compra', dia: toro.ingreso, valor: 6500000, descripcion: `Compra en ${toro.procedencia}` });
for (let i = 0; i < 40; i++) {
  const c = elegir(ceba);
  const dia = entero(5, 360);
  if (presente(c, dia)) movimientos.push({ a: c, concepto: 'alimentacion', dia, valor: mil(entre(30000, 120000)), descripcion: elegir(['Sal mineralizada', 'Suplemento para ceba', 'Melaza']) });
}
for (const p of partos) movimientos.push({ a: p.madre, concepto: 'servicio_veterinario', dia: p.dia, valor: mil(entre(80000, 150000)), descripcion: p.resultado === 'cria_viva' ? 'Asistencia de parto' : 'Revisión después del parto' });
for (let i = 0; i < 8; i++) {
  const v = elegir(vacas);
  movimientos.push({ a: v, concepto: 'servicio_veterinario', dia: entero(10, 350), valor: mil(entre(60000, 120000)), descripcion: 'Palpación' });
}

// --- Correcciones (unas tres de cada cien, Tabla 26) ------------------------
// Litros mal escritos: el ordeño se guarda con el error y el mismo autor lo corrige ese día.
const corregibles = ordenos.filter((o) => o.autor !== 'P' && o.dia > 1 && o.litros >= 4);
for (let i = 0; i < 40; i++) {
  const o = elegir(corregibles);
  if (o.corregido) continue;
  o.corregido = true;
  const bueno = o.litros;
  o.litros = bueno * 10; // se escribió sin la coma
  correcciones.push({ tabla: 'produccion_leche', a: o.a, dia: o.dia, tipo: 'correccion', campo: 'litros', anterior: String(o.litros), nuevo: String(bueno), motivo: 'error_digitacion', nota: null, autor: o.autor, min: o.min + 30 });
}
for (let i = 0; i < 6; i++) {
  const p = elegir(pesajes);
  if (p.corregido) continue;
  p.corregido = true;
  const bueno = p.peso;
  p.peso = decimo(bueno + 100); // un dígito de más
  correcciones.push({ tabla: 'pesaje', a: p.a, dia: p.dia, tipo: 'correccion', campo: 'peso', anterior: String(p.peso), nuevo: String(bueno), motivo: 'error_digitacion', nota: null, autor: 'P', min: 240 });
}
// Tres ordeños anulados y vueltos a registrar el mismo día (documento técnico 32).
for (let i = 0; i < 3; i++) {
  const o = elegir(corregibles.filter((x) => !x.corregido));
  o.corregido = true;
  correcciones.push({ tabla: 'produccion_leche', a: o.a, dia: o.dia, tipo: 'anulacion', campo: null, anterior: null, nuevo: null, motivo: 'otro', nota: 'Se anotó en la vaca de al lado', autor: 'P', min: 300 });
  reemplazos.push({ ...o, litros: medio(o.litros * entre(0.95, 1.05)), min: o.min + 320, autor: 'P' });
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------
const q = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const valores = (filas, f) => filas.map((x) => `(${f(x).map(q).join(',')})`).join(',\n');
const FECHA = (col) => `case when v.${col} is null then null else h.d - v.${col}::int end`;
const CREADO = (dia, min) => `((h.d - v.${dia}) + make_interval(mins => v.${min} + ${MIN_DIA})) at time zone 'America/Bogota'`;

const lineas = [];
const sql = (s) => lineas.push(s);

sql(`-- =============================================================================
-- Datos simulados de la evaluación (paso 6.1, apartado 1.6.3.8)
-- Generado por scripts/datos-simulados.mjs · NO EDITAR A MANO
-- Especificación: supabase/datos-simulados/README.md
--
-- Requisitos: el predio vacío (vaciar.sql), las cuentas del propietario y de los
-- trabajadores, y el catálogo de medicamentos registrado desde la aplicación.
-- Todo corre en una sola transacción: si algo falla, no queda nada a medias.
-- =============================================================================

begin;

create temp table sim_hoy on commit drop as select (now() at time zone 'America/Bogota')::date as d;

create temp table sim_autor (rol text primary key, id uuid not null) on commit drop;
insert into sim_autor select 'P', id from public.usuario where perfil = 'propietario' order by nombre limit 1;
insert into sim_autor select 'T' || row_number() over (order by nombre), id from public.usuario
 where perfil = 'trabajador' and nombre <> 'Usuario de pruebas' order by nombre limit 2;
insert into sim_autor select 'T2', id from sim_autor where rol = 'T1' on conflict do nothing;

create temp table sim_med on commit drop as
select t.tipo, row_number() over (partition by t.tipo order by m.nombre) as k, m.id
  from (values ('vacuna'), ('purga'), ('vitamina'), ('antibiotico')) t(tipo)
  join public.medicamento m
    on m.tipo = t.tipo or not exists (select 1 from public.medicamento m2 where m2.tipo = t.tipo);
create temp table sim_med_n on commit drop as select tipo, count(*) as n from sim_med group by tipo;

do $$
begin
  if (select count(*) from sim_autor where rol in ('P', 'T1')) < 2 then
    raise exception 'Faltan las cuentas del propietario y de al menos un trabajador';
  end if;
  if not exists (select 1 from public.medicamento) then
    raise exception 'Registre primero el catálogo de medicamentos desde la aplicación';
  end if;
  if exists (select 1 from public.animal) then
    raise exception 'El predio no está vacío: ejecute primero vaciar.sql';
  end if;
end $$;

create temp table sim_animal (n int primary key, id uuid not null default gen_random_uuid()) on commit drop;
insert into sim_animal (n) select generate_series(1, ${animales.length});
`);

const insertarAnimales = (lista, titulo) => {
  sql(`-- ${titulo}
insert into public.animal (id, autor_id, creado_en, codigo_chapeta, sexo, fecha_nacimiento, fecha_nacimiento_exacta, fecha_ingreso, procedencia, peso_inicial, madre_id, padre_id, padre_externo, madre_externa, chapeta_puesta)
select s.id, a.id, ${CREADO('registro', 'minuto')}, v.chapeta, v.sexo, ${FECHA('nac')}, v.exacta, ${FECHA('ingreso')}, v.procedencia, v.peso::numeric,
       m.id, p.id, v.padre_externo, v.madre_externa, v.puesta
  from (values
${valores(lista, (x) => [x.n, x.autor, x.registro, entero(0, 600), x.chapeta, x.sexo, x.nac, x.exacta, x.ingreso, x.procedencia, x.peso, x.madre, x.padre, x.padreExterno, x.madreExterna, x.puesta])}
  ) v(n, autor, registro, minuto, chapeta, sexo, nac, exacta, ingreso, procedencia, peso, madre, padre, padre_externo, madre_externa, puesta)
  join sim_animal s on s.n = v.n join sim_autor a on a.rol = v.autor cross join sim_hoy h
  left join sim_animal m on m.n = v.madre::int left join sim_animal p on p.n = v.padre::int;
`);
};
insertarAnimales(animales.filter((a) => a.madre === null), 'Animales adultos y de ceba');
insertarAnimales(animales.filter((a) => a.madre !== null), 'Crías nacidas en el año');

const tabla = (titulo, encabezado, filas, f, columnas, seleccion, extra = '') => {
  if (filas.length === 0) return;
  sql(`-- ${titulo} (${filas.length})
insert into ${encabezado}
select ${seleccion}
  from (values
${valores(filas, f)}
  ) v(${columnas})
  join sim_animal s on s.n = v.n join sim_autor a on a.rol = v.autor cross join sim_hoy h${extra};
`);
};

tabla(
  'Destinos productivos (solo el propietario)',
  'public.destino_productivo (id, autor_id, creado_en, animal_id, destino, desde)',
  destinos,
  (d) => [d.a.n, 'P', Math.min(d.desde, DIAS), entero(600, 900), d.destino, d.desde],
  'n, autor, registro, minuto, destino, desde',
  `gen_random_uuid(), a.id, ${CREADO('registro', 'minuto')}, s.id, v.destino, ${FECHA('desde')}`,
);
tabla(
  'Partos',
  'public.parto (id, autor_id, creado_en, madre_id, fecha, resultado, cria_id, observacion)',
  partos,
  (p) => [p.madre.n, p.autor, p.dia, entero(0, 600), p.resultado, p.cria?.n ?? null, p.observacion],
  'n, autor, dia, minuto, resultado, cria, observacion',
  `gen_random_uuid(), a.id, ${CREADO('dia', 'minuto')}, s.id, ${FECHA('dia')}, v.resultado, c.id, v.observacion`,
  '\n  left join sim_animal c on c.n = v.cria::int',
);
tabla(
  'Colocación de la chapeta de las crías',
  'public.colocacion_chapeta (id, autor_id, creado_en, animal_id, fecha)',
  colocaciones,
  (c) => [c.a.n, c.autor, c.dia, entero(0, 600)],
  'n, autor, dia, minuto',
  `gen_random_uuid(), a.id, ${CREADO('dia', 'minuto')}, s.id, ${FECHA('dia')}`,
);
// Los ordeños, en tandas para no armar una sola sentencia enorme.
for (let i = 0; i < ordenos.length; i += 1500) {
  tabla(
    `Ordeños, tanda ${i / 1500 + 1}`,
    'public.produccion_leche (id, autor_id, creado_en, animal_id, fecha, litros)',
    ordenos.slice(i, i + 1500),
    (o) => [o.a.n, o.autor, o.dia, o.min, o.litros],
    'n, autor, dia, minuto, litros',
    `gen_random_uuid(), a.id, ${CREADO('dia', 'minuto')}, s.id, ${FECHA('dia')}, v.litros`,
  );
}
tabla(
  'Pesajes: cada uno o dos meses',
  'public.pesaje (id, autor_id, creado_en, animal_id, fecha, peso, metodo)',
  pesajes,
  (p) => [p.a.n, p.autor, p.dia, entero(60, 400), p.peso, p.metodo],
  'n, autor, dia, minuto, peso, metodo',
  `gen_random_uuid(), a.id, ${CREADO('dia', 'minuto')}, s.id, ${FECHA('dia')}, v.peso, v.metodo`,
);
tabla(
  'Eventos sanitarios (dosis sin registrar: no se inventan dosis veterinarias)',
  'public.evento_sanitario (id, autor_id, creado_en, animal_id, fecha, tipo, medicamento_id, dosis, costo, sintomas)',
  eventos,
  (e) => [e.a.n, e.autor, e.dia, entero(60, 600), e.tipo, e.medtipo, e.sel, e.costo, e.sintomas],
  'n, autor, dia, minuto, tipo, medtipo, sel, costo, sintomas',
  `gen_random_uuid(), a.id, ${CREADO('dia', 'minuto')}, s.id, ${FECHA('dia')}, v.tipo, md.id, null, v.costo::numeric, v.sintomas`,
  '\n  join sim_med_n mn on mn.tipo = v.medtipo join sim_med md on md.tipo = v.medtipo and md.k = 1 + v.sel % mn.n',
);
tabla(
  'Movimientos económicos (solo el propietario)',
  'public.movimiento_economico (id, autor_id, creado_en, animal_id, concepto, fecha, valor, descripcion)',
  movimientos,
  (m) => [m.a.n, 'P', Math.min(m.dia, DIAS), entero(600, 900), m.concepto, m.dia, m.valor, m.descripcion],
  'n, autor, registro, minuto, concepto, dia, valor, descripcion',
  `gen_random_uuid(), a.id, ${CREADO('registro', 'minuto')}, s.id, v.concepto, ${FECHA('dia')}, v.valor, v.descripcion`,
);
tabla(
  'Salidas: ventas de los terminados, una muerte y una pérdida (solo el propietario)',
  'public.salida (id, autor_id, creado_en, animal_id, fecha, motivo, peso_venta, valor_venta, comprador, causa_muerte, observacion)',
  salidas,
  (x) => [x.a.n, 'P', x.dia, entero(600, 900), x.motivo, x.peso, x.valor, x.comprador, x.causa, x.observacion],
  'n, autor, dia, minuto, motivo, peso, valor, comprador, causa, observacion',
  `gen_random_uuid(), a.id, ${CREADO('dia', 'minuto')}, s.id, ${FECHA('dia')}, v.motivo, v.peso::numeric, v.valor::numeric, v.comprador, v.causa, v.observacion`,
);
for (const entidad of ['produccion_leche', 'pesaje']) {
  tabla(
    `Correcciones y anulaciones de ${entidad}`,
    'public.correccion (id, autor_id, creado_en, entidad_afectada, registro_id, tipo, campo, valor_anterior, valor_nuevo, motivo, nota)',
    correcciones.filter((c) => c.tabla === entidad),
    (c) => [c.a.n, c.autor, c.dia, c.min, c.tipo, c.campo, c.anterior, c.nuevo, c.motivo, c.nota],
    'n, autor, dia, minuto, tipo, campo, anterior, nuevo, motivo, nota',
    `gen_random_uuid(), a.id, ${CREADO('dia', 'minuto')}, '${entidad}', r.id, v.tipo, v.campo, v.anterior, v.nuevo, v.motivo, v.nota`,
    `\n  join public.${entidad} r on r.animal_id = s.id and r.fecha = h.d - v.dia`,
  );
}
tabla(
  'Ordeños registrados de nuevo después de la anulación',
  'public.produccion_leche (id, autor_id, creado_en, animal_id, fecha, litros)',
  reemplazos,
  (o) => [o.a.n, o.autor, o.dia, o.min, o.litros],
  'n, autor, dia, minuto, litros',
  `gen_random_uuid(), a.id, ${CREADO('dia', 'minuto')}, s.id, ${FECHA('dia')}, v.litros`,
);
sql('commit;\n');

// Resumen
const activos = animales.filter((a) => !fueraDesde.has(a.n));
const resumen = {
  animales: animales.length,
  activos: activos.length,
  vacas: vacas.length,
  cebaActivos: ceba.filter((c) => !fueraDesde.has(c.n)).length,
  crias: crias.length,
  ordenos: ordenos.length + reemplazos.length,
  pesajes: pesajes.length,
  eventos: eventos.length,
  partos: partos.length,
  salidas: salidas.length,
  movimientos: movimientos.length,
  destinos: destinos.length,
  correcciones: correcciones.length,
  colocaciones: colocaciones.length,
  cebaBajoMeta: ceba.filter((c) => c.adg < 0.5).length,
};
const salida = 'supabase/datos-simulados/cargar.sql';
fs.mkdirSync('supabase/datos-simulados', { recursive: true });
fs.writeFileSync(salida, lineas.join('\n'));
console.log(`Escrito ${salida} (${Math.round(fs.statSync(salida).size / 1024)} KB)`);
console.log(resumen);
