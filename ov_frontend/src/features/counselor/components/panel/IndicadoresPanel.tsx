import { Card } from '@/components/ui/Card'
import type { SeguimientoPanel } from '@/types/servidor'

function Indicador({
  etiqueta,
  n,
  total,
  detalle,
}: {
  etiqueta: string
  n: number
  total: number
  detalle: string
}) {
  const porcentaje = total ? Math.min(100, (n / total) * 100) : 0
  return (
    <Card className="flex min-w-0 flex-col gap-3 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{etiqueta}</p>
        <p className="shrink-0 text-2xl font-bold tabular-nums">
          {n} de {total}
        </p>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-track"
        role="img"
        aria-label={`${etiqueta}: ${n} de ${total} estudiantes`}
      >
        <span className="block h-full bg-data-primary" style={{ width: `${porcentaje}%` }} />
      </div>
      <p className="text-sm text-muted-foreground">{detalle}</p>
    </Card>
  )
}

// Ajuste panel-salon §4.1: cuatro indicadores «N de M», con barra simple y una línea de detalle.
export function IndicadoresPanel({ datos }: { datos: SeguimientoPanel }) {
  const { indicadores: i, total_estudiantes: total, test } = datos
  return (
    <section aria-label="Indicadores del salón" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Indicador
        etiqueta="Ingresaron esta semana"
        n={i.ingresaron}
        total={total}
        detalle={`${total - i.ingresaron} no entran hace ${i.dias_ingreso} días o más`}
      />
      <Indicador
        etiqueta={`${test.nombre} listo`}
        n={i.test_listo}
        total={total}
        detalle={`${i.test_por_revisar} por revisar · ${i.test_sin_terminar} sin terminar`}
      />
      <Indicador
        etiqueta="Con Plan A"
        n={i.con_plan_a}
        total={total}
        detalle={`${i.con_tres_planes} ya tienen sus tres planes`}
      />
      <Indicador
        etiqueta="Familias participando"
        n={i.familias_participando}
        total={total}
        detalle={`${i.familias_ruta_completa} terminaron su ruta · ${i.familias_conversaron} ya conversaron`}
      />
    </section>
  )
}
