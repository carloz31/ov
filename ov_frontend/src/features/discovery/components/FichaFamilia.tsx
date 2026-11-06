import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/Skeleton'
import { nombresTipoCarrera } from '@/lib/servidor/adaptadoresCatalogo'
import { useFichaFamilia, cargarFichaFamilia } from '@/store/servidor/catalogo'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { FamiliaFicha, TipoInstitucionServidor } from '@/types/servidor'
import type { RutasCatalogo } from '../hooks/useModoCatalogo'
import { textoCarreras, textoVerOcupaciones } from '../lib/resultadoIntereses'

// Ajuste resultados-intereses: la ficha de la familia elegida en el catálogo de carreras (boceto 04), antes de
// la lista. Solo el estudiante ve si está entre sus familias recomendadas. Se quita con «Limpiar filtros».
const PLURALES: Record<TipoInstitucionServidor, string> = {
  UNIVERSIDAD: 'universitarias',
  INSTITUTO: 'técnicas',
  FFAA_POLICIA: 'de FF. AA. y Policía',
}
const soles = (monto: number) => `S/ ${monto.toLocaleString('es-PE').replace(/,/g, ' ')}`

function Ingresos({ ingresos }: { ingresos: FamiliaFicha['ingresos'] }) {
  if (!ingresos.length) return null
  if (ingresos.length === 1)
    return (
      <span className="sx-c-etiqueta">Egresados jóvenes: {soles(ingresos[0].promedio_jovenes)} promedio</span>
    )
  return ingresos.map((i) => (
    <span key={i.tipo} className="sx-c-etiqueta">
      Egresados jóvenes ({nombresTipoCarrera[i.tipo].toLowerCase()}): {soles(i.promedio_jovenes)}
    </span>
  ))
}

export function FichaFamilia({
  codigo,
  rutas,
  conRecomendacion,
}: {
  codigo: string
  rutas: RutasCatalogo
  conRecomendacion: boolean
}) {
  const ficha = useFichaFamilia(codigo)
  if (!ficha || ficha.estado === 'cargando')
    return (
      <section
        className="sx-d-parchment sx-c-ficha-familia"
        aria-busy="true"
        aria-label="Familia de carreras"
      >
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </section>
    )
  if (ficha.estado === 'error' || !ficha.datos)
    return (
      <section className="sx-d-parchment sx-c-ficha-familia" role="alert">
        <p>{mensajeErrorServidor(ficha.error)}</p>
        <button type="button" className="sx-d-action" onClick={() => cargarFichaFamilia(codigo, true)}>
          Reintentar
        </button>
      </section>
    )
  const f = ficha.datos
  const ocupaciones = f.ocupaciones_principales + f.ocupaciones_secundarias
  return (
    <section className="sx-d-parchment sx-c-ficha-familia" aria-labelledby="titulo-ficha-familia">
      <div className="sx-c-ficha-texto">
        <p className="sx-c-ficha-rotulo">
          Familia de carreras
          {conRecomendacion && f.recomendada_posicion && (
            <span className="sx-c-etiqueta sx-c-afinidad">
              Recomendada por tu test · {f.recomendada_posicion}.ª de 5
            </span>
          )}
        </p>
        <h2 id="titulo-ficha-familia">{f.nombre}</h2>
        <p className="sx-c-ficha-area">
          Área: {f.area_nombre} · código CINE {f.codigo}
        </p>
        {f.descripcion && <p>{f.descripcion}</p>}
        <p className="sx-c-etiquetas">
          <span className="sx-c-etiqueta">{textoCarreras(f.total_carreras)}</span>
          {Object.entries(f.carreras_por_tipo).map(([tipo, cantidad]) => (
            <span key={tipo} className="sx-c-etiqueta" data-tipo={tipo}>
              {cantidad} {PLURALES[tipo as TipoInstitucionServidor]}
            </span>
          ))}
          <Ingresos ingresos={f.ingresos} />
        </p>
      </div>
      <div className="sx-c-ficha-acciones">
        {ocupaciones > 0 && (
          <>
            <Link
              className="sx-c-boton-familia"
              to={`${rutas.catalog.professions}?${new URLSearchParams({ familia: f.codigo })}`}
            >
              {textoVerOcupaciones(ocupaciones)}
            </Link>
            <small>Abre el catálogo de profesiones filtrado por esta familia</small>
          </>
        )}
        {f.vecinas.length > 0 && (
          <p>
            <strong>Familias vecinas en {f.area_nombre}:</strong>{' '}
            {f.vecinas.map((v, i) => (
              <span key={v.codigo}>
                {i > 0 && ' · '}
                <Link
                  to={`${rutas.catalog.careers}?${new URLSearchParams({ area: v.area_codigo, familia: v.codigo })}`}
                >
                  {v.nombre}
                </Link>
              </span>
            ))}
          </p>
        )}
      </div>
    </section>
  )
}
