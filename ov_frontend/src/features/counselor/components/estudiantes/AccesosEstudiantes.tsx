import { Button } from '@/components/ui/Button'
import type { AccesoLista } from '@/types/servidor'

const NOMBRES: Record<string, string> = { todos: 'Todos', con_avisos: 'Con avisos', sin_avisos: 'Sin avisos' }

// Ajuste panel-estudiantes §4: accesos rápidos con su conteo (Todos · Con avisos · grupos del Inicio · Sin avisos).
export function AccesosEstudiantes({
  accesos,
  activo,
  onElegir,
}: {
  accesos: AccesoLista[]
  activo: string
  onElegir: (codigo: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Accesos rápidos">
      {accesos.map((a) => {
        const elegido = (activo || 'todos') === a.codigo
        return (
          <Button
            key={a.codigo}
            variant={elegido ? 'default' : 'outline'}
            aria-pressed={elegido}
            className="min-h-11"
            onClick={() => onElegir(a.codigo)}
          >
            {a.nombre ?? NOMBRES[a.codigo] ?? a.codigo} · {a.cantidad}
          </Button>
        )
      })}
    </div>
  )
}
