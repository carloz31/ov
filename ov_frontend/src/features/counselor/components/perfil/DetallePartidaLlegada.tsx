import { Card } from '@/components/ui/Card'
import { BloquePanel } from '@/features/counselor/components/panel/PanelComun'
import { etiquetasCuestionario } from '@/lib/servidor/adaptadoresPanel'
import {
  fechaCorta,
  fraseConteo,
  lineaFechasPartida,
  textoRespuestaBaja,
  textosZona,
} from '@/lib/servidor/adaptadoresPanelEstudiante'
import { cn } from '@/lib/utils'
import type { DetallePartidaLlegada as Detalle, DimensionDetalle } from '@/types/servidor'
import { MarcaTexto } from './MarcaTexto'

// La cabecera de la dimensión: solo partida, la zona (con marcador si es Por trabajar); con llegada, «partida →
// llegada · marcador del cambio».
function ZonasDimension({ d }: { d: DimensionDetalle }) {
  if (!d.zona_partida) return null
  if (!d.zona_llegada)
    return d.zona_partida === 'POR_TRABAJAR' ? (
      <MarcaTexto clase="POR_TRABAJAR" />
    ) : (
      <span className="text-sm">{textosZona[d.zona_partida]}</span>
    )
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">
        {textosZona[d.zona_partida]} <span aria-hidden="true">→</span>
        <span className="sr-only">ahora</span> {textosZona[d.zona_llegada]}
      </span>
      {d.clase && (
        <>
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          <MarcaTexto clase={d.clase} />
        </>
      )}
    </span>
  )
}

function TablaDimension({ d, datos }: { d: DimensionDetalle; datos: Detalle }) {
  const conLlegada = datos.estado === 'CON_LLEGADA'
  return (
    <div className="overflow-x-auto">
      <table className={conLlegada ? 'w-full min-w-[640px] text-sm' : 'w-full min-w-[300px] text-sm'}>
        <thead className="bg-muted text-left text-xs">
          <tr>
            <th scope="col" className="px-3 py-2">
              Afirmación
            </th>
            <th scope="col" className="px-3 py-2">
              {conLlegada && datos.fecha_partida ? `Partida · ${fechaCorta(datos.fecha_partida)}` : 'Partida'}
            </th>
            {conLlegada && (
              <>
                <th scope="col" className="px-3 py-2">
                  Llegada{datos.fecha_llegada && ` · ${fechaCorta(datos.fecha_llegada)}`}
                </th>
                <th scope="col" className="px-3 py-2">
                  Cambio
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {d.afirmaciones.map((a) => (
            <tr key={a.item} className="border-t border-border">
              <td className="px-3 py-2">{a.enunciado}</td>
              <td className="whitespace-nowrap px-3 py-2">
                {a.partida === null ? (
                  <span className="text-muted-foreground">Sin responder</span>
                ) : !conLlegada && a.partida_baja ? (
                  <MarcaTexto clase="BAJA">{a.partida}</MarcaTexto>
                ) : (
                  <span className={conLlegada ? 'text-foreground/80' : undefined}>{a.partida}</span>
                )}
              </td>
              {conLlegada && (
                <>
                  <td className="px-3 py-2">
                    {a.llegada ? (
                      <span className="font-medium">{a.llegada}</span>
                    ) : (
                      <span className="text-muted-foreground">Sin responder</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{a.cambio && <MarcaTexto clase={a.cambio} />}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Ajuste partida-llegada-liviano §4 (bocetos 20 y 22): el detalle por dimensión, en el orden y con la clasificación
// que entrega el servidor; zonas y respuestas en texto y solo el cambio o lo que pide atención con su marcador.
export function DetallePartidaLlegada({ datos }: { datos: Detalle }) {
  const conLlegada = datos.estado === 'CON_LLEGADA'
  const afirmaciones = datos.dimensiones.flatMap((d) => d.afirmaciones)
  const explicacion = conLlegada
    ? afirmaciones.some((a) => a.cambio === 'SIGUE_BAJA')
    : afirmaciones.some((a) => a.partida_baja)
  return (
    <>
      <BloquePanel
        titulo={`${datos.nombre} · detalle por dimensión`}
        etiqueta={etiquetasCuestionario[datos.etiqueta]}
        subtitulo={
          datos.fecha_partida ? lineaFechasPartida(datos.fecha_partida, datos.fecha_llegada) : undefined
        }
      >
        {datos.estado === 'SIN_PARTIDA' ? (
          <p className="text-muted-foreground">Aún no responde su punto de partida.</p>
        ) : (
          <>
            <p className="rounded-lg bg-muted p-3 text-sm">{datos.lectura}</p>
            <div className="space-y-1">
              <p>
                {fraseConteo(datos.conteo).map((p, i) => (
                  <span
                    key={i}
                    className={cn(
                      p.tono === 'aviso' && 'font-semibold text-warning-text',
                      p.tono === 'exito' && 'font-semibold text-success-text',
                    )}
                  >
                    {p.texto}
                  </span>
                ))}
              </p>
              {explicacion && (
                <p className="text-sm text-muted-foreground">
                  {conLlegada ? (
                    'Sigue baja: subió, pero sigue entre las respuestas más bajas.'
                  ) : (
                    <>
                      <MarcaTexto clase="BAJA">Respuesta baja:</MarcaTexto>{' '}
                      {textoRespuestaBaja(datos.opciones_bajas).replace(/^es /, '')}
                    </>
                  )}
                </p>
              )}
            </div>
          </>
        )}
      </BloquePanel>
      {datos.dimensiones.length > 0 && (
        <div className={conLlegada ? 'grid gap-4' : 'grid gap-4 xl:grid-cols-2 xl:items-start'}>
          {datos.dimensiones.map((d) => (
            <Card key={d.codigo} className="flex min-w-0 flex-col gap-4 rounded-xl p-5 sm:p-6">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">{d.nombre}</h2>
                <ZonasDimension d={d} />
              </header>
              <TablaDimension d={d} datos={datos} />
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
