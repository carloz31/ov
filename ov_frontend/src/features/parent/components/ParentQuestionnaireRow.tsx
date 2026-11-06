import { CircleCheck, Clock3, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { displayDate } from '@/features/student-tracking/lib/selectors'
import type { ResultadoFamilia } from '@/lib/servidor/adaptadoresInstrumentos'
import type { CuestionarioHijo } from '@/types/servidor'
import { chipsCuestionario } from '../lib/inicio'

// La fecha del servidor viene sin zona (hora de Lima): se muestra solo el día.
const fecha = (valor: string) => displayDate(valor.slice(0, 10))

// Ajuste inicio-apoderado: una fila de «Sus cuestionarios». Los chips se ven siempre; con el diploma y algún
// resultado, la clave y «Ver resultado»; sin el diploma, el candado. Sin resultado, nada a la derecha.
export function ParentQuestionnaireRow({
  cuestionario,
  accion,
  clave,
}: {
  cuestionario: CuestionarioHijo
  accion: { tipo: 'ver'; enlace: string } | { tipo: 'candado' } | null
  // Con «Ver resultado»: el resultado del servidor (llegada si existe), cargando (`null`) o un error.
  clave?: { resultado: ResultadoFamilia | null | undefined; error: string; reintentar: () => void }
}) {
  return (
    <li className="parent-questionnaire-row">
      <div className="min-w-0 space-y-2">
        <h4 className="font-semibold">{cuestionario.nombre}</h4>
        <ul className="flex flex-wrap gap-2" aria-label={`Estado de ${cuestionario.nombre}`}>
          {chipsCuestionario(cuestionario, fecha).map((chip) => (
            <li key={chip.texto}>
              <Badge variant={chip.completado ? 'success' : 'neutral'} className="parent-questionnaire-chip">
                {chip.completado ? <CircleCheck aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
                {chip.texto}
              </Badge>
            </li>
          ))}
        </ul>
        {clave && <Clave {...clave} />}
      </div>
      {accion?.tipo === 'ver' && (
        <Button asChild variant="outline" className="min-h-12 shrink-0 px-6">
          <Link to={accion.enlace}>Ver resultado</Link>
        </Button>
      )}
      {accion?.tipo === 'candado' && (
        <p className="flex items-start gap-2 text-muted-foreground">
          <LockKeyhole className="mt-1 size-4 shrink-0" aria-hidden="true" />
          Verás su resultado cuando completes tus actividades
        </p>
      )}
    </li>
  )
}

function Clave({
  resultado,
  error,
  reintentar,
}: {
  resultado: ResultadoFamilia | null | undefined
  error: string
  reintentar: () => void
}) {
  if (error)
    return (
      <p role="alert" className="text-sm">
        {error}{' '}
        <button type="button" className="min-h-11 font-semibold underline" onClick={reintentar}>
          Reintentar
        </button>
      </p>
    )
  if (resultado === null) return <Skeleton className="h-5 w-64 max-w-full" aria-busy="true" />
  if (!resultado) return null
  if (resultado.perfilPlano)
    return <p className="text-sm">Sus respuestas no distinguen un tipo de interés.</p>
  if (!resultado.protagonistas.length) return null
  return (
    <p className="text-sm">
      Lo que más destaca: <strong>{resultado.protagonistas.map((d) => d.nombre).join(' · ')}</strong>
    </p>
  )
}
