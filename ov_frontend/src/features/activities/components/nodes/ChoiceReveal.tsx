import { useState, type ReactNode } from 'react'
import type { OpcionElegida } from '@/types/servidor'
import type { ReglasEleccion } from '../../lib/eleccionGuiada'
import '../../styles/registro-guiado.css'

// Elección guiada (F01; ajuste vista del ítem): las opciones como chips que se alternan al tocarlas, en filas
// que se acomodan; las exclusivas en una fila aparte bajo una línea fina. Con el máximo alcanzado, las demás se
// atenúan pero siguen siendo pulsables. «+ Otra» muestra su campo debajo de las opciones. La etiqueta de lo
// elegido (o de lo elegido la vez pasada) va dentro del chip, a la derecha del texto. Debajo, `reaccion`.
export function ChoiceReveal({
  opciones,
  seleccion,
  reglas,
  etiquetaElegida,
  error,
  errorOtra,
  onAlternar,
  onTextoOtra,
  soloLectura,
  anteriores = [],
  etiquetaAnterior,
  reaccion,
}: {
  opciones: { codigo: string; texto: string }[]
  seleccion: OpcionElegida[]
  reglas: ReglasEleccion
  etiquetaElegida?: string
  error?: string
  errorOtra?: string
  onAlternar: (codigo: string) => void
  onTextoOtra: (texto: string) => void
  // Consulta (F02): lo elegido se ve marcado y no se cambia.
  soloLectura?: boolean
  // F02: lo elegido la vez pasada lleva su propia etiqueta, se mantenga o no.
  anteriores?: string[]
  etiquetaAnterior?: string
  reaccion?: ReactNode
}) {
  const [tocada, setTocada] = useState<string>()
  const elegidas = seleccion.filter((o) => !reglas.exclusivas.includes(o.codigo)).length
  const lleno = reglas.maxima > 1 && elegidas >= reglas.maxima
  const otra = seleccion.find((o) => o.codigo === 'OTRA')
  function alternar(codigo: string) {
    if (soloLectura) return
    setTocada(codigo)
    onAlternar(codigo)
  }
  function chip(o: { codigo: string; texto: string }) {
    const elegida = seleccion.some((s) => s.codigo === o.codigo)
    const esOtra = o.codigo === 'OTRA'
    const etiqueta =
      etiquetaAnterior && anteriores.includes(o.codigo) ? etiquetaAnterior : elegida ? etiquetaElegida : undefined
    return (
      <div
        key={o.codigo}
        role="button"
        tabIndex={0}
        aria-pressed={elegida}
        aria-disabled={soloLectura || undefined}
        aria-label={o.texto}
        className={`sx-choice-card sx-chip ${elegida ? 'is-selected' : ''} ${lleno && !elegida ? 'is-dimmed' : ''} ${tocada === o.codigo ? 'is-toggled' : ''} ${esOtra ? 'is-otra' : ''} ${etiqueta ? 'has-badge' : ''}`}
        onClick={() => alternar(o.codigo)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          alternar(o.codigo)
        }}
      >
        <span className="sx-choice-name">
          {elegida ? <span aria-hidden="true">✓ </span> : esOtra && <span aria-hidden="true">+ </span>}
          {o.texto}
        </span>
        {etiqueta && <small className="sx-choice-badge">{etiqueta}</small>}
      </div>
    )
  }
  const normales = opciones.filter((o) => !reglas.exclusivas.includes(o.codigo))
  const exclusivas = opciones.filter((o) => reglas.exclusivas.includes(o.codigo))
  return (
    <div className="sx-choice-wrap">
      <div className="sx-choice-grid sx-chips">{normales.map(chip)}</div>
      {exclusivas.length > 0 && <div className="sx-chips sx-chips-exclusivas">{exclusivas.map(chip)}</div>}
      {otra && (
        <span className="sx-choice-other">
          <input
            className="sx-submission-textarea"
            aria-label="¿Cuál?"
            placeholder="¿Cuál?"
            value={otra.texto ?? ''}
            disabled={soloLectura}
            onChange={(event) => onTextoOtra(event.target.value)}
          />
          {errorOtra && (
            <span role="alert" className="sx-submission-error">
              {errorOtra}
            </span>
          )}
        </span>
      )}
      {error && (
        <p role="alert" className="sx-submission-error">
          {error}
        </p>
      )}
      {reaccion}
    </div>
  )
}
