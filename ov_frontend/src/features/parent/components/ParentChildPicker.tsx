import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import type { EstudianteVinculado } from '@/types/servidor'
import { inicialesHijo } from '../lib/familia'

// Ajuste inicio-apoderado: «Mis hijos» elige un hijo a la vez con chips de iniciales y nombre (solo con más de
// uno). En el teléfono, a dos columnas.
export function ParentChildPicker({
  hijos,
  elegido,
  onElegir,
}: {
  hijos: EstudianteVinculado[]
  elegido: string
  onElegir: (codigo: string) => void
}) {
  return (
    <Tabs value={elegido} onValueChange={onElegir} className="w-full sm:w-auto">
      <TabsList
        appearance="navigation"
        aria-label="Elegir hijo"
        className="parent-child-picker grid h-auto w-full grid-cols-2 sm:inline-flex sm:w-auto"
      >
        {hijos.map((hijo) => (
          <TabsTrigger key={hijo.codigo} value={hijo.codigo} className="min-h-12 gap-3 px-4">
            <span className="parent-child-chip" aria-hidden="true">
              {inicialesHijo(hijo.nombre)}
            </span>
            {hijo.nombre}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
