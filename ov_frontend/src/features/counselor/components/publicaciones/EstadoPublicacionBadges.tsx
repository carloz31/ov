import { Badge } from '@/components/ui/Badge'
import type { EstadoPublicacion } from '@/types/servidor'

const TEXTO: Record<EstadoPublicacion, string> = {
  SIN_DESTACAR: 'Sin destacar',
  DESTACADA: 'Destacada',
  LEYENDA: 'Leyenda',
}

// F09 (bocetos 12 y 12b): el estado de una publicación y, en rojo, sus reportes pendientes.
export function EstadoPublicacionBadges({
  estado,
  reportes,
  comentarios,
}: {
  estado: EstadoPublicacion
  reportes: number
  comentarios: number
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Badge variant={estado === 'LEYENDA' ? 'warning' : estado === 'DESTACADA' ? 'secondary' : 'outline'}>
        {TEXTO[estado]}
      </Badge>
      {reportes > 0 && <Badge variant="attention">{reportes === 1 ? '1 reporte' : `${reportes} reportes`}</Badge>}
      {comentarios > 0 && (
        <Badge variant="attention">
          {comentarios === 1 ? '1 comentario reportado' : `${comentarios} comentarios reportados`}
        </Badge>
      )}
    </div>
  )
}
