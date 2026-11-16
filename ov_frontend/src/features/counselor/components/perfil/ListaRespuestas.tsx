import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { ModeloPerfilEstudiante } from '@/features/counselor/hooks/usePerfilEstudiante'
import { SELECTOR_RESALTADO, textoMarcaFila, textoPorRevisar } from '@/features/counselor/lib/perfilEstudiante'
import { fechaCorta } from '@/lib/servidor/adaptadoresPanelEstudiante'
import { useRegistroPerfil } from '@/store/servidor/panelEstudiante'
import type { RegistroFila, RegistroLectura, RespuestasEstudiante } from '@/types/servidor'
import { EsperaBloque } from './EsperaBloque'
import { ItemRegistroLectura } from './ItemRegistroLectura'
import { MarcaRespuesta } from './MarcaRespuesta'

const INTENSIDAD = { REQUIERE_ATENCION: 'fuerte', SIN_CONTENIDO: 'suave' } as const

// Una fila: todo el renglón se abre y se pliega; sus ítems se piden al abrirla (los que requieren atención ya llegan).
// `item`: la pregunta a la que se desplaza al llegar desde un aviso.
function Registro({
  fila,
  estudiante,
  leido,
  abierto,
  onAlternar,
  item,
}: {
  fila: RegistroFila
  estudiante: string
  leido?: RegistroLectura
  abierto: boolean
  onAlternar: () => void
  item: string | null
}) {
  const { carga, reintentar } = useRegistroPerfil(estudiante, fila.actividad, abierto && !leido)
  const items = leido?.items ?? carga?.datos?.items ?? null
  const marca = textoMarcaFila(fila)
  useEffect(() => {
    if (abierto && items && item) document.getElementById(`pregunta-${item}`)?.scrollIntoView({ block: 'center' })
  }, [abierto, items, item])
  return (
    <li className="border-t border-border first:border-t-0">
      <button
        type="button"
        aria-expanded={abierto}
        onClick={onAlternar}
        className={`flex min-h-11 w-full items-center gap-3 px-5 py-3 text-left hover:bg-muted/60 ${abierto ? 'bg-muted/60' : ''}`}
      >
        <span className="flex w-3 justify-center">
          {fila.marca && <MarcaRespuesta intensidad={INTENSIDAD[fila.marca]} />}
        </span>
        <span className="min-w-0 flex-1 font-semibold">{fila.titulo}</span>
        {marca && fila.marca && (
          <MarcaRespuesta intensidad={INTENSIDAD[fila.marca]} sinPunto className="shrink-0">
            {marca}
          </MarcaRespuesta>
        )}
        <span className="shrink-0 text-sm text-muted-foreground">
          {fila.estado === 'EN_CURSO' ? 'En curso' : fila.fecha ? fechaCorta(fila.fecha) : ''}
        </span>
        {abierto ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </button>
      {abierto && (
        <div className="space-y-1 px-2 pb-4 sm:px-3">
          {items ? (
            items.map((i) => <ItemRegistroLectura key={i.codigo} item={i} />)
          ) : (
            <EsperaBloque carga={carga} onReintentar={reintentar} filas={2} />
          )}
        </div>
      )}
    </li>
  )
}

function AunNoLlega({ fila }: { fila: RegistroFila }) {
  return (
    <li className="flex min-h-11 items-center gap-3 border-t border-border px-5 py-3 text-muted-foreground first:border-t-0">
      <span className="w-3" />
      <span className="min-w-0 flex-1">{fila.titulo}</span>
      <span className="shrink-0 text-sm">
        {fila.tramo_numero !== null ? `Tramo ${fila.tramo_numero} · ${fila.tramo}` : 'Misión opcional'}
      </span>
    </li>
  )
}

// §2.2: las filas ya vienen ordenadas; se agrupan las seguidas del mismo grupo (y tramo).
function grupos(filas: RegistroFila[]) {
  const salida: { clave: string; titulo: string; filas: RegistroFila[] }[] = []
  for (const fila of filas) {
    const clave = fila.grupo === 'TRAMO' ? `tramo-${fila.tramo_numero}` : fila.grupo
    const titulo =
      fila.grupo === 'TRAMO'
        ? `Tramo ${fila.tramo_numero} · ${fila.tramo}`
        : fila.grupo === 'OPCIONALES'
          ? 'Misiones opcionales'
          : 'Aún no llega'
    if (salida.at(-1)?.clave === clave) salida.at(-1)!.filas.push(fila)
    else salida.push({ clave, titulo, filas: [fila] })
  }
  return salida
}

// Ajuste respuestas-orientadora §2 (bocetos 17 y 18): la lista ya cargada, por grupos; los que requieren atención
// se abren solos y un aviso abre su registro en la pregunta marcada.
export function ListaRespuestas({ datos, modelo }: { datos: RespuestasEstudiante; modelo: ModeloPerfilEstudiante }) {
  const pedida = datos.registros.find((r) => r.actividad === modelo.registroPedido)
  const [soloDestacados, setSoloDestacados] = useState(!pedida || pedida.en_destacados)
  const [abiertos, setAbiertos] = useState(
    () => new Set([...datos.leer_primero.map((r) => r.actividad), ...(pedida ? [pedida.actividad] : [])]),
  )
  const leidos = new Map(datos.leer_primero.map((r) => [r.actividad, r]))
  const destacados = datos.hay_destacados && soloDestacados
  const filas = destacados ? datos.registros.filter((r) => r.en_destacados) : datos.registros
  const porRevisar = textoPorRevisar(destacados ? datos.por_revisar_destacados : datos.por_revisar_todos)
  const alternar = (actividad: string) =>
    setAbiertos((actuales) => {
      const siguientes = new Set(actuales)
      if (!siguientes.delete(actividad)) siguientes.add(actividad)
      return siguientes
    })
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {datos.hay_destacados && (
          <SegmentedControl
            etiqueta="Qué registros ver"
            className={SELECTOR_RESALTADO}
            valor={soloDestacados ? 'destacados' : 'todos'}
            onCambiar={(v) => setSoloDestacados(v === 'destacados')}
            opciones={[
              { valor: 'destacados', texto: `Destacados · ${datos.total_destacados}` },
              { valor: 'todos', texto: `Todos · ${datos.registros.length}` },
            ]}
          />
        )}
        {porRevisar && <p className="text-sm font-semibold text-warning-text">{porRevisar}</p>}
      </div>
      {grupos(filas).map((g) => (
        <Card key={g.clave} className="gap-0 overflow-hidden rounded-xl p-0">
          <h3 className="px-5 pb-2 pt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">{g.titulo}</h3>
          <ul>
            {g.filas.map((f) =>
              f.grupo === 'AUN_NO_LLEGA' ? (
                <AunNoLlega key={f.actividad} fila={f} />
              ) : (
                <Registro
                  key={f.actividad}
                  fila={f}
                  estudiante={modelo.estudiante}
                  leido={leidos.get(f.actividad)}
                  abierto={abiertos.has(f.actividad)}
                  onAlternar={() => alternar(f.actividad)}
                  item={f.actividad === modelo.registroPedido ? modelo.itemPedido : null}
                />
              ),
            )}
          </ul>
        </Card>
      ))}
    </div>
  )
}
