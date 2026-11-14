import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import type { ModeloEstudiantesLista } from '@/features/counselor/hooks/useEstudiantesLista'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { AccesosEstudiantes } from './AccesosEstudiantes'
import { FiltrosEstudiantes } from './FiltrosEstudiantes'
import { TablaEstudiantes } from './TablaEstudiantes'

// Ajuste panel-estudiantes §4 (boceto 05): la lista «Estudiantes». Al cambiar filtro u orden, la tabla espera dentro
// del bloque; título, accesos y filtros no saltan.
export function ListaEstudiantes({ modelo }: { modelo: ModeloEstudiantesLista }) {
  const { lista } = modelo
  const pagina = lista?.pagina ?? null
  const detalle = [modelo.nombreSalon, pagina ? `${pagina.total_estudiantes} estudiantes` : null]
    .filter(Boolean)
    .join(' · ')
  return (
    <Card className="space-y-4 rounded-xl border-t-4 border-t-primary p-5 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Estudiantes</h1>
        <p className="text-sm text-muted-foreground">{detalle}. Primero aparecen quienes tienen avisos.</p>
      </header>
      {pagina && (
        <AccesosEstudiantes
          accesos={pagina.accesos}
          activo={modelo.filtros.acceso}
          onElegir={modelo.elegirAcceso}
        />
      )}
      <FiltrosEstudiantes modelo={modelo} avisos={pagina?.avisos ?? []} />
      {lista?.estado === 'error' && (
        <div role="alert" className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-danger-text">{mensajeErrorServidor(lista.error)}</p>
          <Button variant="outline" className="min-h-11" onClick={modelo.reintentar}>
            Reintentar
          </Button>
        </div>
      )}
      {!pagina ? (
        lista?.estado !== 'error' && (
          <div className="space-y-2" aria-busy="true" role="status" aria-label="Cargando estudiantes">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )
      ) : pagina.items.length ? (
        <div aria-busy={lista?.estado === 'cargando'}>
          <TablaEstudiantes filas={pagina.items} modelo={modelo} />
        </div>
      ) : (
        <p className="py-6 text-center text-muted-foreground">Ningún estudiante cumple estos filtros.</p>
      )}
      {pagina && pagina.items.length > 0 && (
        <footer className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Mostrando {pagina.items.length} de {pagina.total} estudiantes.
          </p>
          {pagina.items.length < pagina.total && (
            <Button
              variant="outline"
              className="min-h-11"
              onClick={modelo.mostrarMas}
              disabled={lista?.estado === 'mas'}
            >
              {lista?.estado === 'mas' && <Loader2 className="animate-spin" aria-hidden="true" />}
              Mostrar más
            </Button>
          )}
        </footer>
      )}
    </Card>
  )
}
