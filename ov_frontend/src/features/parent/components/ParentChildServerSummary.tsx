import { BookOpenCheck, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router'
import { StaffEntityHeader } from '@/components/staff/StaffEntityHeader'
import { CardIcon } from '@/components/ui/Status'
import { StaffMetric } from '@/components/staff/StaffMetric'
import type { FamiliaApoderado } from '@/types/servidor'
import { inicialesHijo } from '../lib/familia'
import { parentResultUrl } from '../lib/selectors'
import type { useResultadosHijo } from '../hooks/useResultadosHijo'

// Resumen del hijo vinculado en api (GET /cuentas/{c}/familia). F03: con el diploma, la vista resumida de
// sus resultados (GET /cuentas/{c}/familia/resultados), con enlace a la explicada.
export function ParentChildServerSummary({
  familia,
  resultados,
}: {
  familia: FamiliaApoderado
  resultados?: ReturnType<typeof useResultadosHijo>
}) {
  const hijo = familia.estudiante
  const avance = familia.avance
  return (
    <section className="space-y-5" aria-labelledby="family-children">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="family-children" className="text-xl font-bold">
          Mis hijos
        </h2>
      </div>
      {hijo ? (
        <StaffEntityHeader
          title={hijo.nombre}
          initials={inicialesHijo(hijo.nombre)}
          heading="h3"
          metrics={
            <>
              <StaffMetric
                primary
                label={`Avance de ${hijo.nombre}`}
                value={`${Math.round(hijo.avance.porcentaje)} %`}
                percent={hijo.avance.porcentaje}
                detail={`${hijo.avance.completadas} de ${hijo.avance.total} actividades`}
              />
              <StaffMetric
                label="Su avance hacia el diploma"
                value={`${Math.round(avance.porcentaje)} %`}
                percent={avance.porcentaje}
                detail={`${avance.completadas} de ${avance.total} actividades`}
              />
            </>
          }
        >
          <div className="space-y-5 border-t pt-6">
            <h3 className="text-lg font-bold">Resultados de sus cuestionarios</h3>
            {resultados?.habilitado ? (
              <ResultadosResumidos hijo={hijo} resultados={resultados} />
            ) : (
              <div className="flex items-start gap-3 rounded-xl border p-4">
                <LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <p className="text-sm">
                  {`Podrás ver los resultados de ${hijo.nombre} cuando completes tus actividades.`}
                </p>
              </div>
            )}
          </div>
        </StaffEntityHeader>
      ) : (
        <p className="text-muted-foreground">Todavía no tienes un hijo vinculado.</p>
      )}
    </section>
  )
}

function ResultadosResumidos({
  hijo,
  resultados,
}: {
  hijo: { codigo: string; nombre: string }
  resultados: ReturnType<typeof useResultadosHijo>
}) {
  if (resultados.error)
    return (
      <div className="space-y-3" role="alert">
        <p className="text-sm">{resultados.error}</p>
        <button type="button" className="min-h-11 underline" onClick={resultados.reintentar}>
          Reintentar
        </button>
      </div>
    )
  if (!resultados.resultados) return <p className="text-sm text-muted-foreground" aria-busy="true" />
  return (
    <>
      <p className="rounded-xl border bg-muted/40 p-4 text-sm leading-relaxed">
        Estos resultados son exploratorios. Sirven para conversar con {hijo.nombre} sobre lo que le gusta y en lo
        que destaca, no para decidir qué debe estudiar.
      </p>
      {!resultados.resultados.length ? (
        <p className="text-sm text-muted-foreground">Por ahora no hay resultados compartidos con las familias.</p>
      ) : (
        <ul className="space-y-3">
          {resultados.resultados.map((r) => (
            <li key={r.instrumento}>
              <Link
                className="flex min-h-11 items-start gap-3 rounded-xl border p-4"
                to={parentResultUrl(hijo.codigo, r.instrumento)}
              >
                <CardIcon icon={BookOpenCheck} />
                <span className="space-y-1">
                  <span className="staff-list-heading block font-semibold">{r.nombre}</span>
                  <span className="block text-sm">
                    {r.perfilPlano
                      ? 'Sus respuestas no distinguen un tipo de interés.'
                      : r.protagonistas.map((d) => d.nombre).join(' · ')}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
