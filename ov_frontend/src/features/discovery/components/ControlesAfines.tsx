import type { FiltroPreparacion, VistaOcupaciones } from '../lib/resultadoIntereses'

// Corrección del ajuste resultados-intereses: los dos controles de las ocupaciones afines, cada uno con su rótulo
// encima, en el estudiante (`sx-r`) y en el portal (`sx-p`). Las opciones de preparación sin ocupaciones no se
// muestran; «Todas» siempre.
const FILTROS: { valor: FiltroPreparacion; texto: string }[] = [
  { valor: 'AMPLIA', texto: 'Amplia' },
  { valor: 'INTERMEDIA', texto: 'Intermedia' },
  { valor: 'TODAS', texto: 'Todas' },
]

export function ControlesAfines({
  prefijo,
  vista,
  elegirVista,
  filtro,
  filtrar,
  conteos,
}: {
  prefijo: 'sx-r' | 'sx-p'
  vista: VistaOcupaciones
  elegirVista: (vista: VistaOcupaciones) => void
  filtro: FiltroPreparacion
  filtrar: (filtro: FiltroPreparacion) => void
  conteos: Record<FiltroPreparacion, number>
}) {
  return (
    <div className={`${prefijo}-controles`}>
      <div className={`${prefijo}-control`}>
        <span id={`${prefijo}-rotulo-vista`}>Cómo verlas</span>
        <div className={`${prefijo}-segmentos`} role="group" aria-labelledby={`${prefijo}-rotulo-vista`}>
          {(['lista', 'area'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={vista === v} onClick={() => elegirVista(v)}>
              {v === 'lista' ? 'Lista' : 'Por área'}
            </button>
          ))}
        </div>
      </div>
      <div className={`${prefijo}-control`}>
        <span id={`${prefijo}-rotulo-preparacion`}>Preparación que suele pedir el trabajo</span>
        <div className={`${prefijo}-segmentos`} role="group" aria-labelledby={`${prefijo}-rotulo-preparacion`}>
          {FILTROS.filter((f) => f.valor === 'TODAS' || conteos[f.valor]).map((f) => (
            <button key={f.valor} type="button" aria-pressed={filtro === f.valor} onClick={() => filtrar(f.valor)}>
              {f.texto} · {conteos[f.valor]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
