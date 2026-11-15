import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { columnaDe, textoInstitucion } from '@/lib/servidor/adaptadoresPanel'
import { cn } from '@/lib/utils'
import type { ColumnaInteres, FilaArea, FilaInstitucion } from '@/types/servidor'
import { BotonVer } from './PanelComun'

type Fila = FilaArea | FilaInstitucion
const esArea = (fila: Fila): fila is FilaArea => 'carreras' in fila

const TITULOS: Record<ColumnaInteres, string> = {
  nombre: '',
  en_planes: 'En sus planes',
  plan_a: 'Como Plan A',
  solo_favoritos: 'Solo en favoritos',
  total: 'Total interesados',
}

function Cabecera({
  columna,
  titulo,
  orden,
  onOrdenar,
}: {
  columna: ColumnaInteres
  titulo: string
  orden: string
  onOrdenar: (columna: ColumnaInteres) => void
}) {
  const activa = columnaDe(orden)
  const esActiva = activa.columna === columna
  const Icono = !esActiva ? ArrowUpDown : activa.descendente ? ArrowDown : ArrowUp
  return (
    <th
      scope="col"
      aria-sort={esActiva ? (activa.descendente ? 'descending' : 'ascending') : 'none'}
      className={cn('px-2 py-2 text-xs font-semibold', columna === 'nombre' ? 'text-left' : 'text-center')}
    >
      <button
        type="button"
        onClick={() => onOrdenar(columna)}
        className={cn(
          'inline-flex min-h-11 items-center gap-1 rounded-md px-1',
          esActiva ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {titulo}
        <Icono className="size-3.5" aria-hidden="true" />
      </button>
    </th>
  )
}

function Subtitulo({ fila }: { fila: Fila }) {
  if (!esArea(fila)) return <>{textoInstitucion(fila.tipo, fila.gestion)}</>
  if (!fila.carreras.length) return <>Sin planes todavía</>
  return <>{fila.carreras.map((c) => `${c.nombre} (${c.cantidad})`).join(' · ')}</>
}

// Ajuste panel-salon §5.1–5.4: tabla de áreas o instituciones; cada cabecera ordena toda la lista en el servidor.
export function TablaInteres({
  filas,
  columnas,
  tituloNombre,
  orden,
  onOrdenar,
  onVer,
  etiquetaVer = 'Ver',
}: {
  filas: Fila[]
  columnas: ColumnaInteres[]
  tituloNombre: string
  orden: string
  onOrdenar: (columna: ColumnaInteres) => void
  onVer: (fila: Fila) => void
  etiquetaVer?: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-sm">
        <thead className="bg-track/60">
          <tr>
            <Cabecera columna="nombre" titulo={tituloNombre} orden={orden} onOrdenar={onOrdenar} />
            {columnas.map((columna) => (
              <Cabecera
                key={columna}
                columna={columna}
                titulo={TITULOS[columna]}
                orden={orden}
                onOrdenar={onOrdenar}
              />
            ))}
            <th scope="col">
              <span className="sr-only">Estudiantes</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.codigo} className="border-t border-border align-top">
              <th scope="row" className="px-2 py-3 text-left font-normal">
                <span className="block font-bold">{fila.nombre}</span>
                <span className="block text-xs text-muted-foreground">
                  <Subtitulo fila={fila} />
                </span>
              </th>
              {columnas.map((columna) => (
                <td
                  key={columna}
                  className={cn(
                    'px-2 py-3 text-center font-bold tabular-nums',
                    columna === 'solo_favoritos' && 'text-muted-foreground',
                  )}
                >
                  {fila[columna]}
                </td>
              ))}
              <td className="px-2 py-1 text-right">
                <BotonVer etiqueta={etiquetaVer} descripcion={fila.nombre} onClick={() => onVer(fila)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
