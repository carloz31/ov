import { ExternalLink } from 'lucide-react'
import { VideoYoutube } from '@/components/common/VideoYoutube'

// F09 (bocetos 05 y 06): el video incrustado (YouTube, «no listado») y «Ver en YouTube» de respaldo.
export function VideoEntrevista({ enlace, titulo }: { enlace: string; titulo: string }) {
  return (
    <div className="sx-i-video">
      <VideoYoutube className="sx-i-video-marco" enlace={enlace} titulo={titulo} />
      <div className="sx-i-video-pie">
        <a className="sx-i-boton" data-tono="claro" href={enlace} target="_blank" rel="noopener noreferrer">
          Ver en YouTube <ExternalLink aria-hidden="true" size={16} />
        </a>
        <small className="sx-i-letra-chica">Si el video no carga, usa este enlace.</small>
      </div>
    </div>
  )
}
