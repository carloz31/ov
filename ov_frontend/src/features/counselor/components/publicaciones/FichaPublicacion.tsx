import { ExternalLink } from 'lucide-react'
import { VideoYoutube } from '@/components/common/VideoYoutube'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { fechaNumerica } from '@/lib/servidor/adaptadoresInvestigaciones'
import type { PublicacionDetalle } from '@/types/servidor'

function Fila({ etiqueta, children, tenue = false }: { etiqueta: string; children: React.ReactNode; tenue?: boolean }) {
  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4 border-t px-4 py-3 ${tenue ? 'bg-muted/50' : ''}`}>
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="whitespace-pre-line break-words">{children}</dd>
    </div>
  )
}

// F09 (boceto 12b): el video y la ficha en filas, con lo que pensaba cada autor antes (solo lo ve la orientadora).
export function FichaPublicacion({
  datos,
  nombreSalon,
  nombresTipos,
}: {
  datos: PublicacionDetalle
  nombreSalon: (codigo: string | null) => string
  nombresTipos: Record<string, string>
}) {
  const total = Object.values(datos.reacciones_por_tipo).reduce((a, b) => a + b, 0)
  const desglose = Object.entries(datos.reacciones_por_tipo)
    .filter(([, n]) => n > 0)
    .map(([tipo, n]) => `${nombresTipos[tipo] ?? tipo} ${n}`)
  return (
    <Card className="overflow-hidden rounded-xl p-0">
      <VideoYoutube className="bg-foreground text-background" enlace={datos.enlace} titulo={datos.titulo} />
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="font-semibold">Ficha de la entrevista</h2>
        <Button asChild variant="outline" className="min-h-11">
          <a href={datos.enlace} target="_blank" rel="noopener noreferrer">
            Ver en YouTube <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </Button>
      </div>
      <dl>
        <Fila etiqueta="Autores">
          {datos.autores.map((a) => `${a.nombre} (${nombreSalon(a.salon)})`).join(', ')}
        </Fila>
        <Fila etiqueta="Profesión u ocupación">{datos.ocupacion.titulo}</Fila>
        <Fila etiqueta="Profesional entrevistado">
          {datos.profesional} · {datos.duracion}
        </Fila>
        <Fila etiqueta="Fecha de publicación">{fechaNumerica(datos.fecha_hora)}</Fila>
        <Fila etiqueta="En pocas palabras">{datos.resumen}</Fila>
        <Fila etiqueta="Reacciones">{[String(total), ...desglose].join(' · ')}</Fila>
        <Fila etiqueta="Lo que pensaban antes" tenue>
          {datos.autores.some((a) => a.lo_que_pensaba) ? (
            datos.autores
              .filter((a) => a.lo_que_pensaba)
              .map((a) => (
                <span key={a.codigo} className="block text-sm">
                  «{a.lo_que_pensaba!.dia} {a.lo_que_pensaba!.necesita} {a.lo_que_pensaba!.duda}»{' '}
                  <span className="text-muted-foreground">({a.nombre} · solo lo ve la orientadora)</span>
                </span>
              ))
          ) : (
            <span className="text-sm text-muted-foreground">Sin registro.</span>
          )}
        </Fila>
      </dl>
    </Card>
  )
}
