import { Pencil, Save } from 'lucide-react'
import { AvisoPortal } from '@/components/staff/AvisoPortal'
import { PantallaCargaPortal } from '@/components/staff/PantallaCargaPortal'
import { Button } from '@/components/ui/Button'
import { ConfirmarConfiguracion } from '@/features/counselor/components/configuracion/ConfirmarConfiguracion'
import { CuestionariosConfiguracion } from '@/features/counselor/components/configuracion/CuestionariosConfiguracion'
import { RegistrosDestacados } from '@/features/counselor/components/configuracion/RegistrosDestacados'
import { useConfiguracionColegio } from '@/features/counselor/hooks/useConfiguracionColegio'
import { mensajeErrorServidor } from '@/store/servidor/sesion'

// Ajuste panel-entrevistas-configuracion §2.5 (api): «Configuración» de la orientadora, una sola para todos sus
// salones. En local sigue `PrioritiesView`.
function ConfiguracionServidorView() {
  const m = useConfiguracionColegio()
  return (
    <main className="mx-auto min-w-0 max-w-6xl space-y-6 px-5 py-4 text-base break-words sm:px-8 sm:py-6 lg:px-10 lg:py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p>Aplica a todos sus salones. Sus estudiantes siguen realizando todas las actividades.</p>
        </div>
        {m.datos && (
          <div className="flex flex-wrap gap-2">
            {m.editando ? (
              <>
                <Button variant="outline" className="min-h-11" disabled={m.guardando} onClick={m.cancelar}>
                  Cancelar
                </Button>
                <Button className="min-h-11" disabled={!m.cambiado || m.guardando} onClick={m.pedirGuardar}>
                  <Save aria-hidden />
                  Guardar cambios
                </Button>
              </>
            ) : (
              <Button variant="outline" className="min-h-11" onClick={m.editar}>
                <Pencil aria-hidden />
                Editar
              </Button>
            )}
          </div>
        )}
      </header>
      {!m.datos ? (
        <PantallaCargaPortal
          enSeccion
          estado={m.carga?.estado === 'error' ? 'error' : 'cargando'}
          mensaje={mensajeErrorServidor(m.carga?.error ?? null)}
          onReintentar={m.reintentar}
        />
      ) : (
        <>
          {m.carga?.estado === 'error' && (
            <p role="alert" className="text-sm text-danger-text">
              {mensajeErrorServidor(m.carga.error)} Se muestran los últimos datos cargados.
            </p>
          )}
          <CuestionariosConfiguracion m={m} />
          <RegistrosDestacados m={m} />
        </>
      )}
      <ConfirmarConfiguracion m={m} />
      {m.aviso && (
        <AvisoPortal
          titulo={m.aviso.titulo}
          descripcion={m.aviso.descripcion}
          error={m.aviso.error}
          onCerrar={m.cerrarAviso}
        />
      )}
    </main>
  )
}
export { ConfiguracionServidorView }
