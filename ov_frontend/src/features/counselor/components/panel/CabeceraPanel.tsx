import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { TODOS_LOS_SALONES, type ModeloPanelSalon } from '@/features/counselor/hooks/usePanelSalon'
import { fechaPanel } from '@/lib/servidor/adaptadoresPanel'
import { appPaths } from '@/routes/paths'

// Ajuste panel-salon §4: título, salón, número de estudiantes y fecha de los datos; selector de salón y la lista
// de estudiantes con el salón elegido (ajuste panel-estudiantes §4).
export function CabeceraPanel({
  modelo,
  total,
  fecha,
}: {
  modelo: ModeloPanelSalon
  total: number | null
  fecha: string | null
}) {
  const detalle = [
    modelo.nombreSalon,
    total === null ? null : `${total} estudiantes`,
    fecha ? `datos al ${fechaPanel(fecha)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-t-4 border-t-primary p-5 sm:p-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">Inicio</h1>
        <p className="text-sm text-muted-foreground">{detalle}</p>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <Select value={modelo.salon} onValueChange={modelo.elegirSalon}>
          <SelectTrigger aria-label="Elegir salón" className="min-h-11 w-full bg-card sm:w-48">
            <SelectValue>{modelo.nombreSalon}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {modelo.salones.map((s) => (
              <SelectItem key={s.codigo} value={s.codigo}>
                {s.nombre}
              </SelectItem>
            ))}
            {modelo.salones.length > 1 && (
              <SelectItem value={TODOS_LOS_SALONES}>Todos mis salones</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Button asChild variant="outline" className="min-h-11">
          <Link to={`${appPaths.counselor.students}?${new URLSearchParams({ salon: modelo.salon })}`}>
            Ver lista de estudiantes
          </Link>
        </Button>
      </div>
    </Card>
  )
}
