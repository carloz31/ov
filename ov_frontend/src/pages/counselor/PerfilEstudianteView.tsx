import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { PantallaCargaPortal } from '@/components/staff/PantallaCargaPortal'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { CabeceraPerfil } from '@/features/counselor/components/perfil/CabeceraPerfil'
import { EsperaBloque } from '@/features/counselor/components/perfil/EsperaBloque'
import { PestanaAvance } from '@/features/counselor/components/perfil/PestanaAvance'
import { PestanaPlanes } from '@/features/counselor/components/perfil/PestanaPlanes'
import { PestanaRespuestas } from '@/features/counselor/components/perfil/PestanaRespuestas'
import { PestanaResumen } from '@/features/counselor/components/perfil/PestanaResumen'
import { PestanaTests } from '@/features/counselor/components/perfil/PestanaTests'
import { usePerfilEstudiante } from '@/features/counselor/hooks/usePerfilEstudiante'
import { ResultadoInteresesPortal } from '@/features/discovery/components/ResultadoInteresesPortal'
import { QuestionnaireDetailContent } from '@/features/student-tracking/components/QuestionnaireDetailContent'
import { resultadoFamilia } from '@/lib/servidor/adaptadoresInstrumentos'
import { appPaths } from '@/routes/paths'
import { useResultadoPerfil } from '@/store/servidor/panelEstudiante'
import { mensajeErrorServidor } from '@/store/servidor/sesion'

const PESTANAS = [
  ['resumen', 'Resumen'],
  ['tests', 'Tests'],
  ['planes', 'Planes'],
  ['respuestas', 'Respuestas'],
  ['avance', 'Avance y familia'],
] as const

// El resultado completo de un cuestionario: la vista del apoderado con los textos de la orientadora (§7.1, §7.3).
function ResultadoCompleto({
  estudiante,
  aplicacion,
  nombre,
}: {
  estudiante: string
  aplicacion: string
  nombre: string
}) {
  const { carga, reintentar } = useResultadoPerfil(estudiante, aplicacion)
  const remoto = carga?.datos
  if (!remoto) return <EsperaBloque carga={carga} onReintentar={reintentar} />
  return remoto.ocupaciones?.length ? (
    <ResultadoInteresesPortal
      remoto={remoto}
      nombre={nombre.split(' ')[0]}
      rutas={appPaths.counselor.explorar}
    />
  ) : (
    <QuestionnaireDetailContent servidor={resultadoFamilia(remoto, [])} nombre={nombre} />
  )
}

// Ajuste panel-estudiantes §5 (api): el perfil del estudiante. La primera carga trae cabecera y Resumen; cada
// pestaña se pide al abrirla y espera dentro de su bloque. En local sigue `StudentDetailView`.
function PerfilEstudianteView() {
  const modelo = usePerfilEstudiante()
  const datos = modelo.carga?.datos ?? null
  const volver = (
    <Button asChild variant="link" className="min-h-11 px-0 font-semibold">
      <Link to={modelo.volver}>
        <ArrowLeft aria-hidden="true" />
        Volver a Estudiantes
      </Link>
    </Button>
  )
  if (!datos)
    return (
      <main className="min-w-0 p-4 sm:p-6 lg:p-7">
        {volver}
        <PantallaCargaPortal
          enSeccion
          estado={modelo.carga?.estado === 'error' ? 'error' : 'cargando'}
          mensaje={mensajeErrorServidor(modelo.carga?.error ?? null)}
          onReintentar={modelo.reintentar}
        />
      </main>
    )
  const nombre = datos.cabecera.nombre
  return (
    <main className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-7">
      {volver}
      <CabeceraPerfil cabecera={datos.cabecera} />
      <Tabs value={modelo.pestana} onValueChange={modelo.elegirPestana} className="space-y-6">
        <TabsList
          appearance="segmented"
          aria-label="Secciones del perfil"
          className="w-full overflow-x-auto sm:w-fit"
        >
          {PESTANAS.map(([valor, texto]) => (
            <TabsTrigger key={valor} value={valor} className="min-h-11 flex-1 sm:flex-none">
              {texto}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={modelo.pestana}>
          {modelo.pestana === 'resumen' && <PestanaResumen datos={datos} modelo={modelo} />}
          {modelo.pestana === 'tests' && (
            <PestanaTests
              modelo={modelo}
              resultado={
                modelo.resultado && (
                  <ResultadoCompleto
                    estudiante={modelo.estudiante}
                    aplicacion={modelo.resultado}
                    nombre={nombre}
                  />
                )
              }
            />
          )}
          {modelo.pestana === 'planes' && <PestanaPlanes modelo={modelo} nombre={nombre.split(' ')[0]} />}
          {modelo.pestana === 'respuestas' && <PestanaRespuestas modelo={modelo} />}
          {modelo.pestana === 'avance' && <PestanaAvance modelo={modelo} nombre={nombre.split(' ')[0]} />}
        </TabsContent>
      </Tabs>
    </main>
  )
}
export { PerfilEstudianteView }
