import { Button } from '@/components/ui/Button'
import { BloquePanel } from '@/features/counselor/components/panel/PanelComun'
import { etiquetasCuestionario } from '@/lib/servidor/adaptadoresPanel'
import { fechaCorta, textosZona } from '@/lib/servidor/adaptadoresPanelEstudiante'
import { cn } from '@/lib/utils'
import type { Afirmacion, DimensionPartida, GrupoAfirmaciones, PartidaLlegada } from '@/types/servidor'
import { MarcaTexto } from './MarcaTexto'

const TITULOS: Record<GrupoAfirmaciones['codigo'], string> = {
  BAJAS: 'Respuestas bajas',
  BAJARON: 'Bajaron',
  SIGUEN_BAJAS: 'Siguen bajas',
  MEJORARON: 'Mejoraron',
}
const COLOR_GRUPO: Record<GrupoAfirmaciones['codigo'], string> = {
  BAJAS: 'text-warning-text',
  BAJARON: 'text-warning-text',
  SIGUEN_BAJAS: 'text-warning-text',
  MEJORARON: 'text-success-text',
}

// Con llegada, «partida → llegada» en texto con la llegada en negrita; solo partida, el marcador de respuesta baja.
function FilaAfirmacion({ a }: { a: Afirmacion }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className="min-w-0 flex-1">{a.enunciado}</span>
      {a.llegada !== null ? (
        <span className="text-sm">
          <span className="text-muted-foreground">{a.partida ?? '—'}</span>
          <span aria-hidden="true" className="text-muted-foreground">
            {' '}
            →{' '}
          </span>
          <span className="sr-only"> ahora </span>
          <strong className="font-semibold">{a.llegada}</strong>
        </span>
      ) : (
        <MarcaTexto clase="BAJA">{a.partida ?? '—'}</MarcaTexto>
      )}
    </li>
  )
}

function Zona({ d, llegada = false }: { d: DimensionPartida; llegada?: boolean }) {
  const zona = llegada ? d.zona_llegada : d.zona_partida
  if (!zona) return null
  // Solo partida: «Por trabajar» es lo que pide atención; con llegada, las zonas van en texto y el color es del cambio.
  if (!llegada && !d.zona_llegada && zona === 'POR_TRABAJAR') return <MarcaTexto clase="POR_TRABAJAR" />
  return <>{textosZona[zona]}</>
}

// Ajuste partida-llegada-liviano §3 (bocetos 19 y 21): zonas y respuestas en texto; solo el cambio o lo que pide
// atención lleva color, como marcador. Las dimensiones llegan ordenadas por atención desde el servidor.
export function PartidaLlegadaPerfil({
  datos,
  onVerTodas,
}: {
  datos: PartidaLlegada
  onVerTodas: () => void
}) {
  const r = datos.resumen
  const conLlegada = r.estado === 'CON_LLEGADA'
  const subtitulo =
    r.estado === 'SOLO_PARTIDA' && r.fecha_partida
      ? `${datos.mensaje} Partida respondida el ${fechaCorta(r.fecha_partida)}; aún no responde la llegada.`
      : datos.mensaje
  return (
    <BloquePanel titulo={datos.nombre} etiqueta={etiquetasCuestionario[datos.etiqueta]} subtitulo={subtitulo}>
      {r.estado === 'SIN_PARTIDA' ? (
        <p className="text-muted-foreground">Aún no responde su punto de partida.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className={cn('w-full text-sm', conLlegada ? 'min-w-[520px]' : 'min-w-[300px]')}>
              <thead className="bg-muted text-left text-xs">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    Dimensión
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Partida{r.fecha_partida && ` · ${fechaCorta(r.fecha_partida)}`}
                  </th>
                  {conLlegada && (
                    <>
                      <th scope="col" className="px-3 py-2">
                        Llegada{r.fecha_llegada && ` · ${fechaCorta(r.fecha_llegada)}`}
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Cambio
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {r.dimensiones.map((d) => (
                  <tr key={d.codigo} className="border-t border-border">
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      {d.nombre}
                    </th>
                    <td className="px-3 py-2">
                      <Zona d={d} />
                    </td>
                    {conLlegada && (
                      <>
                        <td className="px-3 py-2">
                          <Zona d={d} llegada />
                        </td>
                        <td className="px-3 py-2">{d.clase && <MarcaTexto clase={d.clase} />}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold">Afirmaciones para conversar</h3>
            {!conLlegada && (
              <p className="text-sm text-muted-foreground">
                Sus respuestas más bajas en la partida. Cuando responda la llegada, aquí irán primero las que
                bajaron.
              </p>
            )}
            {datos.grupos.length ? (
              datos.grupos.map((g) => (
                <div key={g.codigo}>
                  <h4
                    className={cn(
                      'border-b border-border pb-1 text-xs font-bold uppercase tracking-wide',
                      COLOR_GRUPO[g.codigo],
                    )}
                  >
                    {TITULOS[g.codigo]}
                  </h4>
                  <ul className="divide-y divide-border">
                    {g.afirmaciones.map((a) => (
                      <FilaAfirmacion key={a.item} a={a} />
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {conLlegada ? 'No hay respuestas bajas por ahora.' : 'No tiene respuestas bajas en la partida.'}
              </p>
            )}
          </div>
          <Button variant="outline" className="min-h-11 w-fit" onClick={onVerTodas}>
            Ver detalle por dimensión
          </Button>
        </>
      )}
    </BloquePanel>
  )
}
