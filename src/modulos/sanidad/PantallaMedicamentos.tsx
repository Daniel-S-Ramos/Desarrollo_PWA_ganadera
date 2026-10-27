import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { TIPOS_MEDICAMENTO } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { DistintivoSync } from '../../ui/componentes/DistintivoSync';
import { listarCatalogo } from './catalogo';
import { filtrarPorNombre, NOMBRE_TIPO } from '../../dominio/medicamentos';
import { Buscador } from '../../ui/componentes/Buscador';
import { FormularioMedicamento } from './FormularioMedicamento';
import { EnlaceCorregir } from '../correcciones/MarcaCorreccion';
import { ResolverConflictoMedicamento } from '../correcciones/ResolverConflicto';
import { TituloPantalla } from '../../ui/componentes/TituloPantalla';
import { JeringaFrasco } from '../../ui/componentes/Ilustraciones';

/**
 * Catálogo de medicamentos del predio (docs/tecnica/18-catalogo-de-medicamentos.md, sección 6).
 * Para ambos perfiles: sirve para cargar el catálogo antes de usarlo en el registro sanitario.
 */
export function PantallaMedicamentos({ identidad, puedeAgregar }: { identidad: Identidad; puedeAgregar: boolean }) {
  const catalogo = useLiveQuery(() => listarCatalogo(), []);
  const [agregando, setAgregando] = useState(false);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [texto, setTexto] = useState('');

  if (!catalogo) return <p className="texto-secundario">Cargando…</p>;
  const visibles = filtrarPorNombre(catalogo, texto);

  return (
    <div className="listado">
      <Link className="enlace" to="/">
        ← Volver al inicio
      </Link>
      <TituloPantalla dibujo={<JeringaFrasco tamano={34} />}>Medicamentos</TituloPantalla>
      <p className="texto-secundario">
        {catalogo.length === 1 ? '1 medicamento' : `${catalogo.length} medicamentos`} en el catálogo del predio.
      </p>

      {ultimo && <p className="aviso aviso--correcto aviso--en-contenido">✓ {ultimo}</p>}

      {agregando ? (
        <FormularioMedicamento
          identidad={identidad}
          alTerminar={(m) => {
            setAgregando(false);
            setUltimo(`${m.nombre} está en el catálogo.`);
          }}
          alCancelar={() => setAgregando(false)}
        />
      ) : (
        puedeAgregar && (
          <div className="medicamentos__acciones">
            {/*
              El propietario buscó aplicar un medicamento desde aquí (sesión C). El evento sanitario se registra en la
              ficha del animal (CU-04), así que el botón lleva a Animales con una guía en lugar de duplicar el registro.
            */}
            <Link className="boton boton--principal boton--ancho boton--ilustrado" to="/animales?guia=medicamento">
              <span className="boton__ilustracion">
                <JeringaFrasco tamano={30} />
              </span>
              <span>Aplicar medicamento a un animal</span>
            </Link>
            <button
              type="button"
              className="boton boton--secundario boton--ancho"
              onClick={() => {
                setUltimo(null);
                setAgregando(true);
              }}
            >
              Agregar medicamento al catálogo
            </button>
          </div>
        )
      )}

      {catalogo.length === 0 && !agregando && <p>Todavía no hay medicamentos. Agregue los que se usan en el predio.</p>}

      {catalogo.length > 0 && <Buscador valor={texto} alCambiar={setTexto} etiqueta="Buscar un medicamento" marcador="Nombre del medicamento" porChapeta={false} />}
      {catalogo.length > 0 && visibles.length === 0 && <p className="texto-secundario">Ningún medicamento del catálogo se llama así.</p>}

      {TIPOS_MEDICAMENTO.map((tipo) => {
        const delTipo = visibles.filter((m) => m.tipo === tipo);
        if (delTipo.length === 0) return null;
        return (
          <section key={tipo} className="tarjeta">
            <h2>{NOMBRE_TIPO[tipo]}</h2>
            <ul className="medicamentos">
              {delTipo.map((m) => (
                <li key={m.id} className="medicamento">
                  <span className="medicamento__nombre">{m.nombre}</span>
                  <span className="texto-secundario">
                    Dosis en {m.unidad} · advierte si se repite antes de {m.intervalo_advertencia_dias === 1 ? '1 día' : `${m.intervalo_advertencia_dias} días`}
                  </span>
                  <DistintivoSync estado={m.estado_sync} {...(m.detalle_conflicto ? { detalle: m.detalle_conflicto } : {})} />
                  {/* Documento técnico 26, sección 10.2. */}
                  <ResolverConflictoMedicamento medicamento={m} identidad={identidad} />
                  {/* Documento técnico 26, sección 3: tipo, unidad e intervalo se corrigen. */}
                  <EnlaceCorregir entidad="medicamento" registro={m} identidad={identidad} texto="Corregir" />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
