import { Star } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { EstadoPublicacion } from '@/types/servidor'

const TEXTO: Record<EstadoPublicacion, string> = {
  SIN_DESTACAR: 'Sin destacar',
  DESTACADA: 'Destacada',
  LEYENDA: 'Leyenda',
  OCULTA: 'Oculta',
}

// F09 (bocetos 12 y 12b): el estado de una publicación y, en rojo, sus reportes pendientes. En la tabla (`compacto`),
// una sola insignia «Con reportes» para los de la entrevista y los de sus comentarios (ajuste
// panel-orientadora-observaciones §4).
export function EstadoPublicacionBadges({
  estado,
  reportes,
  comentarios,
  compacto = false,
}: {
  estado: EstadoPublicacion
  reportes: number
  comentarios: number
  compacto?: boolean
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Badge
        variant={
          estado === 'LEYENDA'
            ? 'warning'
            : estado === 'DESTACADA'
              ? 'secondary'
              : estado === 'OCULTA'
                ? 'neutral'
                : 'outline'
        }
      >
        {estado === 'LEYENDA' && <Star className="size-3.5 shrink-0" aria-hidden="true" />}
        {TEXTO[estado]}
      </Badge>
      {compacto && reportes + comentarios > 0 && <Badge variant="attention">Con reportes</Badge>}
      {!compacto && reportes > 0 && (
        <Badge variant="attention">{reportes === 1 ? '1 reporte' : `${reportes} reportes`}</Badge>
      )}
      {!compacto && comentarios > 0 && (
        <Badge variant="attention">
          {comentarios === 1 ? '1 comentario reportado' : `${comentarios} comentarios reportados`}
        </Badge>
      )}
    </div>
  )
}
