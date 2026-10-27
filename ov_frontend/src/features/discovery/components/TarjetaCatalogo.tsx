import { Link } from 'react-router'
import { MapPin } from 'lucide-react'
import { FavoriteButton } from '@/components/student/FavoriteButton'
import { appPaths } from '@/routes/paths'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { nombresTipoCarrera, nombresTipoInstitucion, textoGestion } from '@/lib/servidor/adaptadoresCatalogo'
import type { ClaseCatalogo, ResumenCatalogo } from '@/store/servidor/catalogo'
import { IconoProfesion } from './IconoProfesion'
import { SellosRiasec } from './SellosRiasec'

// Ajuste catalogo-datos-reales (F6a): la tarjeta de cada listado del catálogo del servidor. Carrera: tipo,
// nombre, familia (enlace al listado filtrado), sellos y duración. Profesión: sellos, ícono, título y resumen.
// Institución: tipo y gestión, nombre y «Departamento · Distrito».
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
      <article className="sx-d-parchment sx-c-tarjeta">
        <div className="sx-c-tarjeta-cabeza">
          <span className="sx-c-etiqueta" data-tipo={item.tipo}>
            {nombresTipoCarrera[item.tipo]}
          </span>
          {favorito}
        </div>
        <h2>
          <Link to={discoveryPaths.career(item.codigo)}>{item.nombre}</Link>
        </h2>
        <Link
          className="sx-c-familia"
          to={`${appPaths.student.catalog.careers}?familia=${item.familia.codigo}`}
        >
          {item.familia.nombre}
        </Link>
        <div className="sx-c-tarjeta-pie">
          <SellosRiasec letras={item.riasec} />
          {item.duracion && <span className="sx-c-duracion">{item.duracion}</span>}
        </div>
      </article>
    )
  if ('titulo' in item)
    return (
      <article className="sx-d-parchment sx-c-tarjeta">
        <div className="sx-c-tarjeta-cabeza">
          <SellosRiasec letras={item.riasec} />
          {favorito}
        </div>
        <div className="sx-c-profesion">
          <IconoProfesion grupo={item.grupo} revelado={obtenido} />
          <h2>
            <Link to={discoveryPaths.occupation(item.codigo)}>{item.titulo}</Link>
          </h2>
        </div>
        {item.resumen && <p className="sx-d-clamp-two">{item.resumen}</p>}
      </article>
    )
  const gestion = textoGestion(item.gestion)
  return (
    <article className="sx-d-parchment sx-c-tarjeta">
      <div className="sx-c-tarjeta-cabeza">
        <span className="sx-c-etiquetas">
          <span className="sx-c-etiqueta" data-tipo={item.tipo}>
            {nombresTipoInstitucion[item.tipo]}
          </span>
          {gestion && <span className="sx-c-etiqueta">{gestion}</span>}
        </span>
        {favorito}
      </div>
      <h2>
        <Link to={discoveryPaths.institution(item.codigo)}>{item.nombre}</Link>
      </h2>
      <p className="sx-c-lugar">
        <MapPin aria-hidden="true" size={16} />
        {[item.ubicacion.nombre, item.distrito].filter(Boolean).join(' · ')}
      </p>
    </article>
  )
}
