import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { PedidoVer } from '@/features/counselor/hooks/usePanelSalon'
import type { SeguimientoPanel } from '@/types/servidor'
import { BotonVer, ChipsNombres } from './PanelComun'

// Ajuste panel-salon §4.2: los grupos y alertas en el orden de la base; cada alerta con su cantidad, nombre,
// descripción, nombres si caben y «Ver». Solo llegan las que tienen estudiantes.
export function AQuienBuscar({
  datos,
  onVer,
}: {
  datos: SeguimientoPanel
  onVer: (pedido: PedidoVer) => void
}) {
  const { con_avisos: conAvisos, grupos } = datos.avisos
  return (
    <Card className="flex min-w-0 flex-col gap-4 rounded-xl border-warning-border bg-warning-soft p-5 sm:p-6">
      <header className="space-y-1">
        <h2 className="text-lg font-bold">A quién buscar</h2>
        <p className="text-sm text-warning-text">
          {conAvisos} de {datos.total_estudiantes} estudiantes tienen al menos un aviso. Cada aviso desaparece
          solo cuando se resuelve.
        </p>
      </header>
      {grupos.length === 0 ? (
        <p className="text-sm">Ningún estudiante tiene avisos por ahora.</p>
      ) : (
        grupos.map((grupo) => (
          <section key={grupo.codigo} aria-labelledby={`grupo-${grupo.codigo}`}>
            <h3
              id={`grupo-${grupo.codigo}`}
              className="border-b border-warning-border pb-2 text-xs font-bold tracking-wide text-warning-text uppercase"
            >
              {grupo.nombre}
            </h3>
            <ul>
              {grupo.alertas.map((alerta) => (
                <li
                  key={alerta.codigo}
                  className="flex items-center gap-4 border-b border-warning-border py-3 last:border-b-0"
                >
                  <span className="w-8 shrink-0 text-right text-2xl font-bold tabular-nums">
                    {alerta.cantidad}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{alerta.nombre}</p>
                    {alerta.descripcion && <p className="text-sm text-warning-text">{alerta.descripcion}</p>}
                    {alerta.nombres && <ChipsNombres nombres={alerta.nombres} />}
                  </div>
                  <BotonVer
                    variante="outline"
                    descripcion={alerta.nombre}
                    onClick={() => onVer({ titulo: alerta.nombre, conjunto: 'alerta', valor: alerta.codigo })}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      {conAvisos > 0 && (
        <Button
          className="min-h-11 self-start"
          onClick={() => onVer({ titulo: 'Estudiantes con avisos', conjunto: 'avisos' })}
        >
          Ver los {conAvisos} estudiantes con avisos
        </Button>
      )}
    </Card>
  )
}
