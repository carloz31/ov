import { useParentActivitySession } from '@/features/parent/hooks/useParentActivitySession'
import { ArrowRight, Award, BookOpen } from 'lucide-react'
import { type CSSProperties } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

import { appPaths } from '@/routes/paths'

export function ParentActivityFinish({ model }: { model: ReturnType<typeof useParentActivitySession> }) {
  const {
    navigate,
    setResources,
    celebrate,
    heading,
    resourceTrigger,
    completedIds,
    route,
    activity,
    review,
  } = model
  return (
    <Card className="parent-finish-card">
      {!review && (
        <div className="parent-finish-emblem" aria-hidden>
          <div className={`parent-finish-circle ${celebrate ? 'parent-pop' : ''}`}>
            <svg
              className={celebrate ? 'parent-draw' : ''}
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 24 21 33 36 15" />
            </svg>
          </div>
          {celebrate &&
            Array.from({ length: 14 }, (_, i) => {
              const angle = (i * Math.PI * 2) / 14,
                distance = [84, 102, 120][i % 3]
              return (
                <span
                  key={i}
                  className="parent-dot"
                  style={
                    {
                      '--dx': `${Math.round(Math.cos(angle) * distance)}px`,
                      '--dy': `${Math.round(Math.sin(angle) * distance)}px`,
                      width: `${8 + (i % 3) * 2}px`,
                      height: `${8 + (i % 3) * 2}px`,
                      background: [
                        '#FFC23D',
                        '#7C8CE0',
                        '#4CB782',
                        '#F28C5B',
                        '#9FB2FF',
                        '#FFD25C',
                        '#3949AB',
                      ][i % 7],
                      animationDelay: `${0.25 + (i % 4) * 0.05}s`,
                    } as CSSProperties
                  }
                />
              )
            })}
        </div>
      )}
      <div className={celebrate && !review ? 'parent-rise' : undefined}>
        <h2 ref={heading} tabIndex={-1} className="parent-finish-title">
          {review ? 'Terminó el repaso' : '¡Actividad completada!'}
        </h2>
        <p className="mt-4">
          {review
            ? `Repasó «${activity.titulo}». Puede volver a consultar su ficha cuando quiera.`
            : `Terminó «${activity.titulo}». La ficha quedó guardada en su material de consulta.`}
        </p>
        {!review && (
          <>
            <section className="parent-route-progress" aria-label="Avance hacia el diploma">
              <p>Su avance hacia el diploma «Conozco mi rol»</p>
              <strong>
                {route.completed} de {route.total} actividades
              </strong>
              <div className="parent-route-segments" aria-hidden>
                {route.assigned.map((entry) => (
                  <span key={entry.id} data-completed={completedIds.includes(entry.id)} />
                ))}
              </div>
            </section>
            {route.complete ? (
              <section className="parent-next-card">
                <Award size={36} aria-hidden />
                <h3>Obtuvo su diploma «Conozco mi rol»</h3>
                <Button onClick={() => navigate(`${appPaths.parent.overview}?diploma=1`)}>
                  Ver mi diploma en el inicio
                </Button>
              </section>
            ) : (
              route.next && (
                <section className="parent-next-card">
                  <p className="parent-section-label">Siguiente actividad</p>
                  <h3>{route.next.titulo}</h3>
                  <p>{route.next.subtitulo}</p>
                  <Button onClick={() => navigate(appPaths.parent.activity(route.next!.id))}>
                    Empezar <ArrowRight aria-hidden />
                  </Button>
                </section>
              )
            )}
          </>
        )}
        <div className="parent-finish-actions">
          {!!activity.recompensa?.recursoIds?.length && (
            <Button
              variant="outline"
              onClick={(event) => {
                resourceTrigger.current = event.currentTarget
                setResources(activity.recompensa?.recursoIds ?? [])
              }}
            >
              <BookOpen aria-hidden /> Abrir ficha
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate(appPaths.parent.overview)}>
            Volver al inicio
          </Button>
        </div>
      </div>
    </Card>
  )
}
