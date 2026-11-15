import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { ModeloPerfilEstudiante } from '@/features/counselor/hooks/usePerfilEstudiante'
import { letraPlan } from '@/lib/servidor/adaptadoresPanelEstudiante'
import { usePlanesPerfil, usePlanPerfil } from '@/store/servidor/panelEstudiante'
import { EsperaBloque } from './EsperaBloque'
import { PlanCompletoPerfil } from './PlanCompletoPerfil'
import { VistazoPlanes } from './VistazoPlanes'

// El plan abierto: se pide al abrirlo; el selector cambia entre los planes activos sin salir de la pestaña.
function PlanAbierto({
  modelo,
  prioridad,
  nombre,
}: {
  modelo: ModeloPerfilEstudiante
  prioridad: number
  nombre: string
}) {
  const { carga, reintentar } = usePlanPerfil(modelo.estudiante, prioridad)
  const planes = carga?.datos?.planes ?? []
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="link" className="min-h-11 px-0 font-semibold" onClick={() => modelo.abrirPlan(null)}>
          ← Resumen de planes
        </Button>
        {planes.length > 1 && (
          <SegmentedControl
            etiqueta="Elegir plan"
            valor={prioridad}
            onCambiar={modelo.abrirPlan}
            opciones={planes.map((p) => ({ valor: p, texto: letraPlan(p) }))}
          />
        )}
      </div>
      {carga?.datos ? (
        <PlanCompletoPerfil plan={carga.datos} nombre={nombre} />
      ) : (
        <EsperaBloque carga={carga} onReintentar={reintentar} filas={4} />
      )}
    </div>
  )
}

// Ajuste panel-estudiantes §8: la pestaña Planes, pedida al abrirla; el plan completo es una vista dentro de ella.
export function PestanaPlanes({ modelo, nombre }: { modelo: ModeloPerfilEstudiante; nombre: string }) {
  const { carga, reintentar } = usePlanesPerfil(modelo.estudiante, !modelo.plan)
  if (modelo.plan) return <PlanAbierto modelo={modelo} prioridad={modelo.plan} nombre={nombre} />
  if (!carga?.datos) return <EsperaBloque carga={carga} onReintentar={reintentar} />
  return <VistazoPlanes datos={carga.datos} onAbrir={modelo.abrirPlan} />
}
