import { Link } from 'react-router'
import { Parchment } from '@/components/student/Parchment'
import type { FamiliaPublica, OcupacionesDeLaFamilia as Ocupaciones } from '@/types/servidor'
import type { RutasCatalogo } from '../hooks/useModoCatalogo'
import { SellosRiasec } from './SellosRiasec'

// Ajuste resultados-intereses: «Ocupaciones a las que lleva su familia» del detalle de carrera (boceto 06).
// Reemplaza «Profesiones a las que conduce»: la relación es por familia, con la vía principal en tarjetas (y
// «Muy afín a ti» en las afines del estudiante) y la alternativa en chips.
export function OcupacionesDeLaFamilia({
  ocupaciones,
  familia,
  rutas,
}: {
  ocupaciones: Ocupaciones
  familia: FamiliaPublica
  rutas: RutasCatalogo
}) {
  const { principales, secundarias } = ocupaciones
  const total = principales.length + secundarias.length
  if (!total) return null
  return (
    <Parchment className="sx-c-ocupaciones-familia">
      <div className="sx-c-ocupaciones-cabecera">
        <div>
          <h2>Ocupaciones a las que lleva su familia</h2>
          <p className="sx-c-conteo">
            La relación es por familia: las carreras de <strong>{familia.nombre}</strong> son la vía principal
            de {principales.length} {principales.length === 1 ? 'ocupación' : 'ocupaciones'}
            {secundarias.length > 0 && ` y una vía alternativa de ${secundarias.length} más`}. Cada carrera
            cubre mejor unas que otras; revisa su plan de estudios.
          </p>
        </div>
        <Link
          className="sx-c-enlace"
          to={`${rutas.catalog.professions}?${new URLSearchParams({ familia: familia.codigo })}`}
        >
          {total === 1 ? 'Ver esta ocupación' : `Ver estas ${total} ocupaciones`} en el catálogo ›
        </Link>
      </div>
      {principales.length > 0 && (
        <>
          <h3 className="sx-c-via">Vía principal · {principales.length}</h3>
          <div className="sx-c-via-principal">
            {principales.map((o) => (
              <Link key={o.codigo} className="sx-c-ocupacion-familia" to={rutas.occupation(o.codigo)}>
                <strong>{o.titulo}</strong>
                <span className="sx-c-sellos-afinidad">
                  <SellosRiasec letras={o.riasec} />
                  {o.afinidad?.banda === 'MUY_AFIN' && <small className="sx-c-muy-afin">Muy afín a ti</small>}
                  {o.afinidad?.banda === 'AFIN' && <small className="sx-c-muy-afin">Afín a ti</small>}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
      {secundarias.length > 0 && (
        <>
          <h3 className="sx-c-via">Vía alternativa · {secundarias.length}</h3>
          <p className="sx-c-via-alternativa">
            {secundarias.map((o) => (
              <Link key={o.codigo} className="sx-c-chip-ocupacion" to={rutas.occupation(o.codigo)}>
                {o.titulo}
              </Link>
            ))}
          </p>
        </>
      )}
    </Parchment>
  )
}
