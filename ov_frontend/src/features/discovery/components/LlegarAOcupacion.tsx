import { Link } from 'react-router'
import { Parchment } from '@/components/student/Parchment'
import { nombresTipoCarrera } from '@/lib/servidor/adaptadoresCatalogo'
import type { OcupacionDetalle } from '@/types/servidor'
import type { RutasCatalogo } from '../hooks/useModoCatalogo'
import { textoCarreras } from '../lib/resultadoIntereses'

// Ajuste resultados-intereses: cómo se llega a una ocupación, por familias de carreras (boceto 05). Reemplaza
// «Carreras que llevan aquí»: la familia principal con su programa de ejemplo, las familias secundarias con los
// programas que caen en ellas y las otras ocupaciones de la familia.
const conFamilia = (base: string, familia: { codigo: string; area_codigo?: string }) =>
  `${base}?${new URLSearchParams(
    familia.area_codigo
      ? { area: familia.area_codigo, familia: familia.codigo }
      : { familia: familia.codigo },
  )}`

export function LlegarAOcupacion({
  ocupacion,
  rutas,
}: {
  ocupacion: OcupacionDetalle
  rutas: RutasCatalogo
}) {
  const familia = ocupacion.familia_principal
  if (!familia) return null
  const ejemplo = ocupacion.programa_ejemplo
  return (
    <>
      <Parchment title="Cómo se llega aquí" className="sx-c-panel sx-c-llegar">
        <p className="sx-c-conteo">
          Las carreras se agrupan en familias. Esta es la familia que forma para esta ocupación.
        </p>
        <article className="sx-c-familia-principal">
          <p className="sx-c-rotulo-familia">Familia principal</p>
          <h3>{familia.nombre}</h3>
          {familia.descripcion && <p>{familia.descripcion}</p>}
          <p className="sx-c-etiquetas">
            {familia.tipos.map((t) => (
              <span key={t} className="sx-c-etiqueta" data-tipo={t}>
                {nombresTipoCarrera[t]}
              </span>
            ))}
            <span className="sx-c-etiqueta">{textoCarreras(familia.total_carreras)}</span>
          </p>
          <Link className="sx-c-boton-familia" to={conFamilia(rutas.catalog.careers, familia)}>
            Ver sus carreras
          </Link>
        </article>
        {ejemplo && (
          <p className="sx-c-ejemplo">
            <strong>Programa de ejemplo:</strong> {ejemplo.nombre} (
            {nombresTipoCarrera[ejemplo.tipo].toLowerCase()}
            {ejemplo.duracion ? `, ${ejemplo.duracion}` : ''}).
          </p>
        )}
      </Parchment>
      {ocupacion.familias_secundarias.length > 0 && (
        <Parchment title="También puedes llegar desde" className="sx-c-panel">
          <p className="sx-c-conteo">Familias con programas que forman para esta ocupación.</p>
          {ocupacion.familias_secundarias.map((f) => (
            <Link
              key={f.codigo}
              className="sx-d-related sx-c-fila-enlace"
              to={conFamilia(rutas.catalog.careers, f)}
            >
              <span>
                <strong>{f.nombre}</strong>
                <small>
                  {f.programas.length ? `${f.programas.join(', ')} · ` : ''}
                  {textoCarreras(f.total_carreras)}
                </small>
              </span>
            </Link>
          ))}
        </Parchment>
      )}
      {ocupacion.total_ocupaciones_familia > 1 && (
        <Parchment title="Otras ocupaciones de esta familia" className="sx-c-panel">
          {ocupacion.otras_ocupaciones_de_la_familia.map((o) => (
            <Link key={o.codigo} className="sx-c-enlace" to={rutas.occupation(o.codigo)}>
              {o.titulo}
            </Link>
          ))}
          <Link
            className="sx-c-enlace sx-c-enlace-menor"
            to={`${rutas.catalog.professions}?${new URLSearchParams({ familia: familia.codigo })}`}
          >
            Ver las {ocupacion.total_ocupaciones_familia} ocupaciones que llegan a {familia.nombre} ›
          </Link>
        </Parchment>
      )}
    </>
  )
}
