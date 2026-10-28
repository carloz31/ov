import { Link } from 'react-router'
import { useReturnFocus } from '@/hooks/useReturnFocus'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { nombresTipoCarrera } from '@/lib/servidor/adaptadoresCatalogo'
import { appPaths } from '@/routes/paths'
import type { CarreraResumen, PlanCarrera } from '@/types/servidor'

// F07a (F07-pantallas §3): elegir entre las carreras favoritas la del plan nuevo. Las que ya son plan quedan
// deshabilitadas; un plan solo se crea desde una favorita.
export function DialogoCrearPlan({
  abierto,
  letra,
  carreras,
  planes,
  ocupado,
  onCrear,
  onCerrar,
}: {
  abierto: boolean
  letra: string
  carreras: CarreraResumen[] | null
  planes: PlanCarrera[]
  ocupado: string | null
  onCrear: (carrera: string) => void
  onCerrar: () => void
}) {
  const focus = useReturnFocus()
  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onCerrar()}>
      <DialogContent {...focus} className="sx-root sx-d-dialog">
        <DialogHeader>
          <DialogTitle>¿Qué carrera quieres considerar?</DialogTitle>
          <DialogDescription>
            Tus carreras favoritas. La elegida será tu <strong>plan {letra}</strong>.
          </DialogDescription>
        </DialogHeader>
        {carreras?.length ? (
          <>
            <ul className="sx-p-favoritas">
              {carreras.map((c) => {
                const plan = planes.find((p) => p.carrera.codigo === c.codigo)
                return (
                  <li key={c.codigo} data-plan={!!plan}>
                    <div>
                      <strong>{c.nombre}</strong>
                      <small>
                        {c.familia.nombre} · {nombresTipoCarrera[c.tipo]}
                      </small>
                    </div>
                    {plan ? (
                      <span className="sx-p-ya-plan">Ya es tu plan {plan.prioridad}</span>
                    ) : (
                      <button
                        type="button"
                        className="sx-d-action"
                        disabled={!!ocupado}
                        onClick={() => onCrear(c.codigo)}
                      >
                        Hacer mi plan {letra}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
            <p className="sx-p-ayuda">
              ¿No está la que buscas?{' '}
              <Link to={appPaths.student.catalog.careers}>Márcala como favorita en el catálogo</Link> y vuelve aquí.
            </p>
          </>
        ) : (
          <p className="sx-p-ayuda">
            Aún no guardas carreras. Marca una como favorita en el catálogo para partir de ella.{' '}
            <Link to={appPaths.student.catalog.careers}>Explorar carreras</Link>
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
