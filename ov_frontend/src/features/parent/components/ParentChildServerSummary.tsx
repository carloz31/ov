import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaffEntityHeader } from '@/components/staff/StaffEntityHeader'
import { StaffMetric } from '@/components/staff/StaffMetric'
import type { EstudianteVinculado, FamiliaApoderado } from '@/types/servidor'
import { inicialesHijo, resultadoDeInstrumento } from '../lib/familia'
import { tieneResultado } from '../lib/inicio'
import { parentResultUrl } from '../lib/selectors'
import type { useResultadosHijo } from '../hooks/useResultadosHijo'
import { ParentChildPicker } from './ParentChildPicker'
import { ParentQuestionnaireRow } from './ParentQuestionnaireRow'

// «Mis hijos» en api (ajuste inicio-apoderado, bocetos A y B): el selector (con más de un hijo) y la tarjeta del
// hijo elegido con su avance y sus cuestionarios (GET /cuentas/{c}/familia). Con el diploma, la clave y «Ver
// resultado» (GET /cuentas/{c}/familia/resultados?estudiante=); sin él, el candado.
export function ParentChildServerSummary({
  familia,
  hijo,
  onElegir,
  resultados,
}: {
  familia: FamiliaApoderado | null
  hijo: EstudianteVinculado | null
  onElegir: (codigo: string) => void
  resultados: ReturnType<typeof useResultadosHijo>
}) {
  if (familia && !hijo)
    return (
      <Card className="space-y-2 p-6">
        <h2 id="family-children" className="text-xl font-bold">
          Mis hijos
        </h2>
        <p className="text-muted-foreground">
          Todavía no tienes un hijo vinculado. Pídele a la orientadora del colegio que te vincule.
        </p>
      </Card>
    )
  return (
    <section className="space-y-4" aria-labelledby="family-children">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="family-children" className="text-xl font-bold">
          Mis hijos
        </h2>
        {familia && hijo && familia.estudiantes.length > 1 && (
          <ParentChildPicker hijos={familia.estudiantes} elegido={hijo.codigo} onElegir={onElegir} />
        )}
      </div>
      {familia && hijo ? (
        <TarjetaHijo hijo={hijo} diploma={familia.diploma.obtenido} resultados={resultados} />
      ) : (
        <Card className="staff-entity-header" aria-busy="true" aria-label="Cargando a tu hijo">
          <div className="flex flex-wrap items-center justify-between gap-6 p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-15 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <Skeleton className="h-24 w-full max-w-89 rounded-2xl" />
          </div>
        </Card>
      )}
    </section>
  )
}

function TarjetaHijo({
  hijo,
  diploma,
  resultados,
}: {
  hijo: EstudianteVinculado
  diploma: boolean
  resultados: ReturnType<typeof useResultadosHijo>
}) {
  const conResultado = (c: EstudianteVinculado['cuestionarios'][number]) => diploma && tieneResultado(c)
  return (
    <StaffEntityHeader
      className="parent-child-card"
      title={hijo.nombre}
      initials={inicialesHijo(hijo.nombre)}
      heading="h3"
      details={hijo.nivel_actual && <p className="text-base">Título actual: {hijo.nivel_actual.titulo}</p>}
      metrics={
        <StaffMetric
          primary
          label={`Avance de ${hijo.nombre}`}
          value={`${Math.round(hijo.avance.porcentaje)} %`}
          percent={hijo.avance.porcentaje}
          detail={`${hijo.avance.completadas} de ${hijo.avance.total} actividades`}
        />
      }
    >
      <div className="space-y-2 border-t pt-6">
        <h3 className="text-lg font-bold">Sus cuestionarios</h3>
        {!hijo.cuestionarios.length ? (
          <p className="pt-2 text-muted-foreground">Por ahora no hay cuestionarios compartidos con las familias.</p>
        ) : (
          <ul className="parent-questionnaire-list">
            {hijo.cuestionarios.map((c) => (
              <ParentQuestionnaireRow
                key={c.instrumento}
                cuestionario={c}
                accion={
                  conResultado(c)
                    ? { tipo: 'ver', enlace: parentResultUrl(hijo.codigo, c.instrumento) }
                    : tieneResultado(c)
                      ? { tipo: 'candado' }
                      : null
                }
                clave={
                  conResultado(c)
                    ? {
                        resultado: resultados.resultados && resultadoDeInstrumento(resultados.resultados, c.instrumento),
                        error: resultados.error,
                        reintentar: resultados.reintentar,
                      }
                    : undefined
                }
              />
            ))}
          </ul>
        )}
        {hijo.cuestionarios.some(conResultado) && (
          <p className="mt-4 rounded-xl bg-muted/60 p-4 text-sm leading-relaxed">
            Estos resultados son exploratorios. Sirven para conversar con {hijo.nombre} sobre lo que le gusta y en lo
            que destaca, no para decidir qué debe estudiar.
          </p>
        )}
      </div>
    </StaffEntityHeader>
  )
}
