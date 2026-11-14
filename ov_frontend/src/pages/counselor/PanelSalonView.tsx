import { PantallaCargaPortal } from '@/components/staff/PantallaCargaPortal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AQuienBuscar } from '@/features/counselor/components/panel/AQuienBuscar'
import { CabeceraPanel } from '@/features/counselor/components/panel/CabeceraPanel'
import { ComoSeSienten, PorDondeVa } from '@/features/counselor/components/panel/CaminoPanel'
import { BloqueTest, OtrosCuestionarios } from '@/features/counselor/components/panel/CuestionariosPanel'
import { IndicadoresPanel } from '@/features/counselor/components/panel/IndicadoresPanel'
import { PanelVerEstudiantes } from '@/features/counselor/components/panel/PanelVerEstudiantes'
import { PestanaIntereses } from '@/features/counselor/components/panel/PestanaIntereses'
import { usePanelSalon } from '@/features/counselor/hooks/usePanelSalon'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { useSeguimientoPanel } from '@/store/servidor/panel'

// Ajuste panel-salon (api): Inicio de la orientadora con las pestañas Seguimiento e Intereses del salón. En local
// sigue `CounselorDashboardView`.
function PanelSalonView() {
  const modelo = usePanelSalon()
  const { carga, reintentar } = useSeguimientoPanel(modelo.salonServidor)
  const datos = carga?.datos ?? null
  return (
    <main className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-7">
      <CabeceraPanel modelo={modelo} total={datos?.total_estudiantes ?? null} fecha={datos?.fecha ?? null} />
      <Tabs value={modelo.seccion} onValueChange={modelo.elegirSeccion} className="space-y-6">
        <TabsList appearance="segmented" aria-label="Vista del inicio" className="w-full sm:w-fit">
          <TabsTrigger value="tracking" className="min-h-11 flex-1 sm:flex-none">
            Seguimiento
          </TabsTrigger>
          <TabsTrigger value="interests" className="min-h-11 flex-1 sm:flex-none">
            Intereses del salón
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tracking">
          {!datos ? (
            <PantallaCargaPortal
              enSeccion
              estado={carga?.estado === 'error' ? 'error' : 'cargando'}
              mensaje={mensajeErrorServidor(carga?.error ?? null)}
              onReintentar={reintentar}
            />
          ) : (
            <div className="space-y-6">
              {carga?.estado === 'error' && (
                <p role="alert" className="text-sm text-danger-text">
                  {mensajeErrorServidor(carga.error)} Se muestran los últimos datos cargados.
                </p>
              )}
              <IndicadoresPanel datos={datos} />
              <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
                <AQuienBuscar datos={datos} onVer={modelo.abrirVer} />
                <div className="grid min-w-0 gap-6">
                  <BloqueTest datos={datos} onVer={modelo.abrirVer} />
                  <OtrosCuestionarios datos={datos} />
                </div>
                <PorDondeVa datos={datos} onVer={modelo.abrirVer} />
                <ComoSeSienten datos={datos} onVer={modelo.abrirVer} />
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="interests">
          {modelo.seccion === 'interests' && <PestanaIntereses modelo={modelo} />}
        </TabsContent>
      </Tabs>
      <PanelVerEstudiantes pedido={modelo.ver} salon={modelo.salonServidor} onCerrar={modelo.cerrarVer} />
    </main>
  )
}
export { PanelSalonView }
