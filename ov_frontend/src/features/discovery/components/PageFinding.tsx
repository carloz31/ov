import { Link } from 'react-router'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { TEXTO_ROMPER_SELLO } from '../lib/resultPage'
import type { HallazgoPagina } from '../types'
import { ZoneStrip } from './ZoneStrip'

// Ajuste perfil-capitulos: lo que Helena encontró, en la fila de una página descifrada del perfil.
export function PageFinding({ hallazgo }: { hallazgo: HallazgoPagina }) {
  if (hallazgo.forma === 'parejo')
    return (
      <div className="sx-d-finding-tags">
        <span className="sx-d-finding-tag" data-parejo="true">
          Resultado parejo
        </span>
      </div>
    )
  if (hallazgo.forma === 'letras') {
    const nombres = hallazgo.nombres.join(', ')
    return (
      <div className="sx-d-finding-letters">
        {hallazgo.letras.map((letra, i) => (
          <span key={i} className="sx-d-finding-letter" aria-hidden="true">
            {letra}
          </span>
        ))}
        <small title={nombres}>{nombres}</small>
      </div>
    )
  }
  if (hallazgo.forma === 'etiquetas')
    return (
      <div className="sx-d-finding-tags">
        {hallazgo.nombres.map((nombre) => (
          <span key={nombre} className="sx-d-finding-tag" title={nombre}>
            {nombre}
          </span>
        ))}
        {hallazgo.resto > 0 && (
          <span className="sx-d-finding-more" aria-label={`y ${hallazgo.resto} más`}>
            +{hallazgo.resto}
          </span>
        )}
      </div>
    )
  return (
    <div className="sx-d-finding-zones">
      <div>
        <span>Partida</span>
        <ZoneStrip zonas={hallazgo.partida} />
      </div>
      <div>
        <span>Llegada</span>
        {hallazgo.llegada ? (
          <ZoneStrip zonas={hallazgo.llegada} />
        ) : hallazgo.llegadaLista ? (
          <Link className="sx-d-finding-reveal" to={discoveryPaths.helena}>
            {TEXTO_ROMPER_SELLO}
          </Link>
        ) : (
          <span className="sx-d-zone-pending" aria-hidden="true" />
        )}
      </div>
      <small>{hallazgo.frase}</small>
    </div>
  )
}
