import { Button } from '@/components/ui/Button'
import { BloquePanel } from '@/features/counselor/components/panel/PanelComun'
import { etiquetasCuestionario } from '@/lib/servidor/adaptadoresPanel'
import { fechaCorta, textosCambio, textosZona } from '@/lib/servidor/adaptadoresPanelEstudiante'
import type { Afirmacion, GrupoAfirmaciones, PartidaLlegada } from '@/types/servidor'
import { ChipPerfil, type TonoChip } from './ChipPerfil'
import { TONO_CAMBIO, TONO_ZONA } from '@/features/counselor/lib/perfilEstudiante'

const TITULOS: Record<GrupoAfirmaciones['codigo'], string> = {
  BAJAS: '',
  BAJARON: 'Bajaron',
  SIGUEN_BAJAS: 'Siguen bajas',
  MEJORARON: 'Mejoraron',
}
const TONO_GRUPO: Record<GrupoAfirmaciones['codigo'], TonoChip> = {
  BAJAS: 'aviso',
  BAJARON: 'aviso',
  SIGUEN_BAJAS: 'aviso',
  MEJORARON: 'exito',
}

function FilaAfirmacion({ a, tono }: { a: Afirmacion; tono: TonoChip }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className="min-w-0 flex-1">«{a.enunciado}»</span>
      <span className="flex items-center gap-2">
        {a.llegada !== null && <ChipPerfil>{a.partida ?? '—'}</ChipPerfil>}
        {a.llegada !== null && <span aria-hidden="true">→</span>}
        <ChipPerfil tono={tono}>{a.llegada ?? a.partida ?? '—'}</ChipPerfil>
      </span>
    </li>
  )
}

// Ajuste panel-estudiantes §7.2 (bocetos 07 y 08): zonas por dimensión y afirmaciones para conversar, siempre en
// palabras (la etiqueta que marcó), nunca puntajes.
export function PartidaLlegadaPerfil({
  datos,
  onVerTodas,
}: {
  datos: PartidaLlegada
  onVerTodas: () => void
}) {
  const r = datos.resumen
  const conLlegada = r.estado === 'CON_LLEGADA'
  return (
    <BloquePanel
      titulo={datos.nombre}
      etiqueta={etiquetasCuestionario[datos.etiqueta]}
      subtitulo={datos.mensaje}
    >
      {r.estado === 'SIN_PARTIDA' ? (
        <p className="text-muted-foreground">Aún no responde su punto de partida.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted text-left text-xs">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    Dimensión
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Partida{r.fecha_partida && ` · ${fechaCorta(r.fecha_partida)}`}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Llegada{r.fecha_llegada && ` · ${fechaCorta(r.fecha_llegada)}`}
                  </th>
                  {conLlegada && (
                    <th scope="col" className="px-3 py-2">
                      Cambio
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {r.dimensiones.map((d) => (
                  <tr key={d.codigo} className="border-t border-border">
                    <th scope="row" className="px-3 py-2 text-left font-bold">
                      {d.nombre}
                    </th>
                    <td className="px-3 py-2">
                      {d.zona_partida && (
                        <ChipPerfil tono={TONO_ZONA[d.zona_partida]}>{textosZona[d.zona_partida]}</ChipPerfil>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {d.zona_llegada ? (
                        <ChipPerfil tono={TONO_ZONA[d.zona_llegada]}>{textosZona[d.zona_llegada]}</ChipPerfil>
                      ) : (
                        <span className="text-muted-foreground">Aún no responde</span>
                      )}
                    </td>
                    {conLlegada && (
                      <td className="px-3 py-2">
                        {d.cambio && (
                          <ChipPerfil tono={TONO_CAMBIO[d.cambio]}>{textosCambio[d.cambio]}</ChipPerfil>
                        )}
                      </td>
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
                  {TITULOS[g.codigo] && (
                    <h4 className="border-b border-border pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {TITULOS[g.codigo]}
                    </h4>
                  )}
                  <ul className="divide-y divide-border">
                    {g.afirmaciones.map((a) => (
                      <FilaAfirmacion key={a.item} a={a} tono={TONO_GRUPO[g.codigo]} />
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No hay respuestas bajas por ahora.</p>
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
