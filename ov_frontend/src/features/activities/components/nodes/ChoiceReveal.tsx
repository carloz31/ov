import { useState } from 'react'
import type { OpcionElegida } from '@/types/servidor'
import { iconoRegistro } from '../../data/iconosRegistro'
import type { ReglasEleccion } from '../../lib/eleccionGuiada'
import '../../styles/registro-guiado.css'

// Elección guiada genérica (F01): las opciones como tarjetas que se alternan al tocarlas (sin casillas).
// Con el máximo alcanzado, las demás se atenúan pero siguen siendo pulsables; «Otra» muestra su campo
// dentro de la misma tarjeta.
export function ChoiceReveal({
  opciones,
  seleccion,
  reglas,
  etiquetaElegida,
  iconos,
  error,
  errorOtra,
  onAlternar,
  onTextoOtra,
  soloLectura,
  anteriores = [],
  etiquetaAnterior,
}: {
  opciones: { codigo: string; texto: string }[]
  seleccion: OpcionElegida[]
  reglas: ReglasEleccion
  etiquetaElegida?: string
  iconos?: Record<string, string>
  error?: string
  errorOtra?: string
  onAlternar: (codigo: string) => void
  onTextoOtra: (texto: string) => void
  // Consulta (F02): lo elegido se ve marcado y no se cambia.
  soloLectura?: boolean
  // F02: lo elegido la vez pasada lleva su propia etiqueta, se mantenga o no.
  anteriores?: string[]
  etiquetaAnterior?: string
}) {
  const [tocada, setTocada] = useState<string>()
  const elegidas = seleccion.filter((o) => !reglas.exclusivas.includes(o.codigo)).length
  const lleno = reglas.maxima > 1 && elegidas >= reglas.maxima
  function alternar(codigo: string) {
    if (soloLectura) return
    setTocada(codigo)
    onAlternar(codigo)
  }
  return (
    <div className="sx-choice-wrap">
      <div className="sx-choice-grid">
        {opciones.map((o) => {
          const elegida = seleccion.find((s) => s.codigo === o.codigo)
          const Icon = iconoRegistro(iconos?.[o.codigo])
          const etiqueta =
            etiquetaAnterior && anteriores.includes(o.codigo)
              ? etiquetaAnterior
              : elegida
                ? etiquetaElegida
                : undefined
          return (
            <div
              key={o.codigo}
              role="button"
              tabIndex={0}
              aria-pressed={!!elegida}
              aria-disabled={soloLectura || undefined}
              aria-label={o.texto}
              className={`sx-choice-card ${elegida ? 'is-selected' : ''} ${lleno && !elegida ? 'is-dimmed' : ''} ${tocada === o.codigo ? 'is-toggled' : ''} ${etiqueta ? 'has-badge' : ''}`}
              onClick={() => alternar(o.codigo)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                alternar(o.codigo)
              }}
            >
              <span className="sx-choice-icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="sx-choice-name">{o.texto}</span>
              {etiqueta && <small className="sx-choice-badge">{etiqueta}</small>}
              {elegida && o.codigo === 'OTRA' && (
                <span className="sx-choice-other">
                  <input
                    className="sx-submission-textarea"
                    aria-label="¿Cuál?"
                    placeholder="¿Cuál?"
                    value={elegida.texto ?? ''}
                    disabled={soloLectura}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    onChange={(event) => onTextoOtra(event.target.value)}
                  />
                  {errorOtra && (
                    <span role="alert" className="sx-submission-error">
                      {errorOtra}
                    </span>
                  )}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="sx-submission-error">
          {error}
        </p>
      )}
    </div>
  )
}
