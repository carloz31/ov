import { Card } from '@/components/ui/Card'
import { BloquePanel } from '@/features/counselor/components/panel/PanelComun'
import { TONO_CAMBIO, TONO_CAMBIO_AFIRMACION, TONO_ZONA } from '@/features/counselor/lib/perfilEstudiante'
import { etiquetasCuestionario } from '@/lib/servidor/adaptadoresPanel'
import {
  fechaCorta,
  lineaFechasPartida,
  textoConteo,
  textoRespuestaBaja,
  textosCambio,
  textosCambioAfirmacion,
  textosZona,
} from '@/lib/servidor/adaptadoresPanelEstudiante'
import type {
  CambioAfirmacion,
  ConteoDetalle,
  DetallePartidaLlegada as Detalle,
  DimensionDetalle,
  ZonaPerfil,
} from '@/types/servidor'
import { ChipPerfil } from './ChipPerfil'

const LEYENDA_CAMBIO: CambioAfirmacion[] = ['BAJO', 'SIGUE_BAJA', 'MEJORO', 'IGUAL']
const ZONAS = new Set<string>(['POR_TRABAJAR', 'EN_CAMINO', 'FUERTE'])

function tonoConteo(c: ConteoDetalle) {
  return ZONAS.has(c.codigo)
    ? TONO_ZONA[c.codigo as ZonaPerfil]
    : TONO_CAMBIO[c.codigo as keyof typeof TONO_CAMBIO]
}

// La zona de la dimensión: solo partida, su chip; con llegada, «partida → llegada» y el chip del cambio.
function ZonasDimension({ d }: { d: DimensionDetalle }) {
  if (!d.zona_partida) return null
  return (
    <span className="flex flex-wrap items-center gap-2">
      <ChipPerfil tono={d.zona_llegada ? 'neutro' : TONO_ZONA[d.zona_partida]}>
        {textosZona[d.zona_partida]}
      </ChipPerfil>
      {d.zona_llegada && (
        <>
          <span aria-hidden="true">→</span>
          <span className="sr-only">ahora</span>
          <ChipPerfil tono={TONO_ZONA[d.zona_llegada]}>{textosZona[d.zona_llegada]}</ChipPerfil>
          {d.cambio && <ChipPerfil tono={TONO_CAMBIO[d.cambio]}>{textosCambio[d.cambio]}</ChipPerfil>}
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
          {d.afirmaciones.map((a) => {
            const tono = a.cambio ? TONO_CAMBIO_AFIRMACION[a.cambio] : 'neutro'
            return (
              <tr key={a.item} className="border-t border-border">
                <td className="px-3 py-2">{a.enunciado}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <ChipPerfil tono={!conLlegada && a.partida_baja ? 'aviso' : 'neutro'}>
                    {a.partida ?? 'Sin responder'}
                  </ChipPerfil>
                </td>
                {conLlegada && (
                  <>
                    <td className="px-3 py-2">
                      <ChipPerfil tono={a.llegada ? tono : 'neutro'}>
                        {a.llegada ?? 'Sin responder'}
                      </ChipPerfil>
                    </td>
                    <td className="px-3 py-2">
                      {a.cambio && <ChipPerfil tono={tono}>{textosCambioAfirmacion[a.cambio]}</ChipPerfil>}
                    </td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Ajuste color-partida-llegada §2 (bocetos 13 y 14): el detalle por dimensión, en el orden y con la clasificación
// que entrega el servidor; el front solo pinta. Sin puntajes.
export function DetallePartidaLlegada({ datos }: { datos: Detalle }) {
  const conLlegada = datos.estado === 'CON_LLEGADA'
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
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {datos.conteo.map((c) => (
                <ChipPerfil key={c.codigo} tono={tonoConteo(c)}>
                  {textoConteo(c.codigo, c.cantidad)}
                </ChipPerfil>
              ))}
              <span aria-hidden="true" className="w-2" />
              {conLlegada ? (
                LEYENDA_CAMBIO.map((c) => (
                  <ChipPerfil key={c} tono={TONO_CAMBIO_AFIRMACION[c]}>
                    {textosCambioAfirmacion[c]}
                  </ChipPerfil>
                ))
              ) : (
                <span className="text-muted-foreground">
                  <ChipPerfil tono="aviso">Respuesta baja</ChipPerfil>{' '}
                  {textoRespuestaBaja(datos.opciones_bajas)}
                </span>
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
