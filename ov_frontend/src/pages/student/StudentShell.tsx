import { useServerSession } from '@/features/adventure/hooks/useServerSession'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { Outlet } from 'react-router'
import { StudentModuleLayout } from '@/features/adventure/components/StudentModuleLayout'
import { OverlayQueue } from '@/features/adventure/components/overlays/OverlayQueue'
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
  } = useServerSession()

  const outlet = <Outlet context={context} />
  if (esperandoIngreso)
    return (
      <div className="sx-root sx-shell">
        <section className="sx-glass sx-player-card" aria-live="polite">
          <h1>Tu aventura</h1>
          {errorIngreso ? (
            <>
              <p role="alert">{mensajeErrorServidor(errorIngreso)}</p>
              <button
                className="sx-primary-button"
                type="button"
                disabled={cargando}
                onClick={() => void reintentarIngreso()}
              >
                Reintentar
              </button>
            </>
          ) : (
            <p role="status">Consultando tu camino en el servidor…</p>
          )}
        </section>
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
    </div>
  )
}
