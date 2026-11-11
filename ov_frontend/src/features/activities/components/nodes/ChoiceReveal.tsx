import { useState, type ReactNode } from 'react'
import type { OpcionElegida } from '@/types/servidor'
import { esOtra } from '@/lib/servidor/adaptadoresRegistro'
import type { ReglasEleccion } from '../../lib/eleccionGuiada'
import { ELECCION } from '../../lib/textosRegistro'
import '../../styles/registro-guiado.css'

// Configuración de la «Otra» de un ítem (ajuste front de registros, lote 2): la etiqueta, si se puede agregar una
// más (se apaga al llegar al máximo) y cómo agregarla y escribir su texto.
export type OtraEleccion = {
  etiqueta: string
  puedeAgregar: boolean
  onAgregar: () => void
  onTexto: (codigo: string, texto: string) => void
}

// Elección guiada (F01; ajuste vista del ítem): las opciones como chips que se alternan al tocarlas, en filas
// que se acomodan; las exclusivas en una fila aparte bajo una línea fina. Con el máximo alcanzado, las demás se
// atenúan pero siguen siendo pulsables. Lote 2: cada «Otra» marcada va en su propia fila, con su campo «¿Cuál?» a la
// derecha (tocar la ficha la desmarca y borra su texto), y «+ Otra» es una ficha de borde punteado al final.
export function ChoiceReveal({
  opciones,
  seleccion,
  reglas,
  error,
  errorOtra,
  onAlternar,
  otra,
  soloLectura,
  reaccion,
}: {
  opciones: { codigo: string; texto: string; origen?: string | null }[]
  seleccion: OpcionElegida[]
  reglas: ReglasEleccion
  error?: string
  errorOtra?: string
  onAlternar: (codigo: string) => void
  otra?: OtraEleccion
  // Consulta (F02): lo elegido se ve marcado y no se cambia.
  soloLectura?: boolean
  reaccion?: ReactNode
}) {
  const [tocada, setTocada] = useState<string>()
  const elegidas = seleccion.filter((o) => !reglas.exclusivas.includes(o.codigo)).length
  const lleno = reglas.maxima > 1 && elegidas >= reglas.maxima
  const otras = seleccion.filter((o) => esOtra(o.codigo))
  function alternar(codigo: string) {
    if (soloLectura) return
    setTocada(codigo)
    onAlternar(codigo)
  }
  function chip(o: { codigo: string; texto: string; origen?: string | null }) {
    const elegida = seleccion.some((s) => s.codigo === o.codigo)
    const etiqueta = o.origen ?? undefined
    return (
      <div
        key={o.codigo}
        role="button"
        tabIndex={0}
        aria-pressed={elegida}
        aria-disabled={soloLectura || undefined}
        aria-label={o.texto}
        className={`sx-choice-card sx-chip ${elegida ? 'is-selected' : ''} ${lleno && !elegida ? 'is-dimmed' : ''} ${tocada === o.codigo ? 'is-toggled' : ''} ${etiqueta ? 'has-badge' : ''}`}
        onClick={() => alternar(o.codigo)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          alternar(o.codigo)
        }}
      >
        <span className="sx-choice-name">
          {elegida && <span aria-hidden="true">✓ </span>}
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
      {normales.length > 0 && <div className="sx-choice-grid sx-chips">{normales.map(chip)}</div>}
      {otra &&
        otras.map((o) => (
          <div key={o.codigo} className="sx-choice-other">
            {chip({ codigo: o.codigo, texto: otra.etiqueta })}
            <input
              className="sx-submission-textarea"
              aria-label={ELECCION.cual}
              placeholder={ELECCION.cual}
              value={o.texto ?? ''}
              disabled={soloLectura}
              onChange={(event) => otra.onTexto(o.codigo, event.target.value)}
            />
          </div>
        ))}
      {otra && !soloLectura && (reglas.maxima > 1 || otras.length === 0) && (
        <div className="sx-chips">
          <button
            type="button"
            className="sx-chip is-otra"
            disabled={!otra.puedeAgregar}
            onClick={() => {
              setTocada(undefined)
              otra.onAgregar()
            }}
          >
            {ELECCION.agregarOtra(otra.etiqueta)}
          </button>
        </div>
      )}
      {errorOtra && (
        <span role="alert" className="sx-submission-error">
          {errorOtra}
        </span>
      )}
      {exclusivas.length > 0 && <div className="sx-chips sx-chips-exclusivas">{exclusivas.map(chip)}</div>}
      {error && (
        <p role="alert" className="sx-submission-error">
          {error}
        </p>
      )}
      {reaccion}
    </div>
  )
}
