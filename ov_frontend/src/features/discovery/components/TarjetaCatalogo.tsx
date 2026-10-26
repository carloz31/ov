import { Link } from 'react-router'
import { BriefcaseBusiness, GraduationCap, School } from 'lucide-react'
import { FavoriteButton } from '@/components/student/FavoriteButton'
import { Seal } from '@/components/student/Seal'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { lineaInstitucion } from '@/lib/servidor/adaptadoresCatalogo'
import type { ClaseCatalogo, ResumenCatalogo } from '@/store/servidor/catalogo'
import { dimensionNames, type RiasecDimension } from '../lib/catalogDetails'

function Sellos({ letras }: { letras: string[] }) {
  if (!letras.length) return null
  return (
    <div className="sx-d-seal-row">
      {letras.map((d) => (
        <span key={d} title={dimensionNames[d as RiasecDimension]}>
          <Seal state="revealed">{d}</Seal>
        </span>
      ))}
    </div>
  )
}

// F06: la tarjeta del catálogo del servidor, con el marcado de las del catálogo local (solo lo del resumen).
export function TarjetaCatalogo({
  item,
  obtenido = false,
  pendiente,
  onFavorito,
}: {
  item: ResumenCatalogo[ClaseCatalogo]
  obtenido?: boolean
  pendiente: boolean
  onFavorito: () => void
}) {
  const favorito = (
    <FavoriteButton compact selected={item.es_favorita} pendiente={pendiente} onToggle={onFavorito} />
  )
  if ('familia' in item)
    return (
      <article className="sx-d-parchment sx-d-atlas-card">
        {favorito}
        <Link to={discoveryPaths.career(item.codigo)} className="sx-d-card-link">
          <GraduationCap aria-hidden="true" />
          <h2>{item.nombre}</h2>
          <p className="sx-d-eyebrow">{item.familia.nombre}</p>
          <Sellos letras={item.riasec} />
        </Link>
      </article>
    )
  if ('titulo' in item)
    return (
      <article className="sx-d-parchment sx-d-atlas-card">
        {favorito}
        <Link to={discoveryPaths.occupation(item.codigo)} className="sx-d-card-link">
          <BriefcaseBusiness aria-hidden="true" />
          <h2>{item.titulo}</h2>
          <Sellos letras={item.riasec} />
          {obtenido && <span className="sx-d-tag">Ícono obtenido</span>}
        </Link>
      </article>
    )
  return (
    <article className="sx-d-parchment sx-d-atlas-card">
      {favorito}
      <Link to={discoveryPaths.institution(item.codigo)} className="sx-d-card-link">
        <School aria-hidden="true" />
        <h2>{item.nombre}</h2>
        <p>{lineaInstitucion(item)}</p>
      </Link>
    </article>
  )
}
