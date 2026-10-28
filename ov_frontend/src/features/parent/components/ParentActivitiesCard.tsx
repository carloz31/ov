import type { Ref } from 'react'
import { ArrowRight, Award, ClipboardCheck } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { CardIcon } from '@/components/ui/Status'
import { appPaths } from '@/routes/paths'

// Ajuste inicio-apoderado (bocetos A y B): «Tus actividades», compacta. Es la ruta del apoderado (una sola, no
// cambia con el hijo): incompleta, lo que falta y «Continuar»; completa, el diploma y un botón secundario.
export function ParentActivitiesCard({
  ruta,
  diplomaRef,
  resaltarDiploma,
}: {
  ruta: { completed: number; total: number; percent: number; complete: boolean; next?: { id: string; titulo: string } }
  diplomaRef?: Ref<HTMLDivElement>
  resaltarDiploma?: boolean
}) {
  const faltan = Math.max(ruta.total - ruta.completed, 0)
  return (
    <Card className="parent-home-card">
      <div className="parent-home-card-head">
        <CardIcon
          icon={ruta.complete ? Award : ClipboardCheck}
          className={ruta.complete ? 'bg-success-soft text-success-text' : 'rounded-xl'}
        />
        <h2 className="text-lg font-bold">Tus actividades</h2>
        {ruta.complete ? (
          <Badge variant="success" className="ml-auto">
            Ruta completada
          </Badge>
        ) : (
          faltan > 0 && (
            <Badge variant="outline" className="parent-home-aviso ml-auto">
              Te falta {faltan}
            </Badge>
          )
        )}
      </div>
      {ruta.complete ? (
        <div
          ref={diplomaRef}
          tabIndex={-1}
          className={`parent-diploma-recognition rounded-lg ${resaltarDiploma ? 'parent-diploma-highlight' : ''}`}
        >
          <p className="text-muted-foreground">
            Completaste tus {ruta.total} actividades. Tu diploma ya está listo.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {ruta.next && <p className="text-muted-foreground">Siguiente: {ruta.next.titulo}</p>}
          <Progress value={ruta.percent} aria-label="Avance de tus actividades" />
          <p className="text-sm text-muted-foreground">
            {ruta.completed} de {ruta.total} actividades · hacia tu diploma
          </p>
        </div>
      )}
      <div className="parent-home-card-action">
        {ruta.complete ? (
          <Button asChild variant="outline" className="min-h-12 px-6">
            <Link to={appPaths.parent.activities}>Ver mis actividades y diploma</Link>
          </Button>
        ) : (
          <Button asChild className="min-h-12 px-6">
            <Link to={ruta.next ? appPaths.parent.activity(ruta.next.id) : appPaths.parent.activities}>
              Continuar
              <ArrowRight className="shrink-0" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </Card>
  )
}
