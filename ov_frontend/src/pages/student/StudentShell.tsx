import { useServerSession } from '@/features/adventure/hooks/useServerSession'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { Outlet } from 'react-router'
import { StudentModuleLayout } from '@/features/adventure/components/StudentModuleLayout'
import { OverlayQueue } from '@/features/adventure/components/overlays/OverlayQueue'
import { PantallaCarga } from '@/components/student/PantallaCarga'
import { VisorRecursoHost } from '@/features/backpack/components/VisorRecursoHost'
import '@/styles/student/adventure.css'
import '@/styles/student/student-base.css'
import '@/styles/student/student-logbook.css'
import '@/styles/student/student-targets.css'
import '@/styles/student/student-progress.css'
import '@/styles/student/reflection.css'
export function StudentShell() {
  const {
    context,
    storageError,
    view,
    isMap,
    activityOpen,
    esperandoIngreso,
    errorIngreso,
    errorConsulta,
    cargando,
    reintentarIngreso,
    reintentarConsulta,
    volverAIngresar,
  } = useServerSession()

  const outlet = <Outlet context={context} />
  if (esperandoIngreso)
    return (
      <div className="sx-root sx-shell">
        <PantallaCarga
          estado={errorIngreso ? 'error' : 'cargando'}
          titulo="Preparando tu camino"
          frase="Lumi está buscando el mapa…"
          mensaje={mensajeErrorServidor(errorIngreso)}
          ocupado={cargando}
          onReintentar={() => void reintentarIngreso()}
          volver={{ texto: 'Volver a ingresar', onClick: volverAIngresar }}
        />
      </div>
    )
  return (
    <div className="sx-root sx-shell">
      {errorConsulta && (
        <p className="sx-storage-warning" role="alert">
          {mensajeErrorServidor(errorConsulta)}{' '}
          <button type="button" disabled={cargando} onClick={() => void reintentarConsulta()}>
            Reintentar consulta
          </button>
        </p>
      )}
      {storageError && (
        <p role="alert" className="sx-storage-warning">
          No se pudo guardar el avance en este navegador. Evita cerrar la página hasta liberar espacio o
          permitir el almacenamiento.
        </p>
      )}
      <OverlayQueue view={view} activityOpen={activityOpen}>
        {isMap ? (
          outlet
        ) : (
          <StudentModuleLayout key={view} view={view}>
            {outlet}
          </StudentModuleLayout>
        )}
      </OverlayQueue>
      {/* F04d: el visor de fichas, encima de cualquier pantalla del portal y sin navegar. */}
      <VisorRecursoHost />
    </div>
  )
}
