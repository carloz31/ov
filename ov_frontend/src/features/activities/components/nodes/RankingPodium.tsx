import { useRef, useState } from 'react'
import { completo, faltan, quitar, colocar, intercambiar, type Puestos } from '../../lib/podio'
import { iconoRegistro } from '../../data/iconosRegistro'
import '../../styles/podium.css'

// Podio genérico de «elegir y ordenar top N» (F01): N puestos, el primero más grande, y las opciones
// como fichas. Tocar una ficha la coloca en el primer puesto libre; tocar un puesto la devuelve;
// en desktop, arrastrar un puesto sobre otro los intercambia (atajo, nunca la única forma).
export function RankingPodium({
  opciones,
  puestos,
  etiquetaPrimero,
  iconos,
  error,
  onChange,
}: {
  opciones: { codigo: string; texto: string }[]
  puestos: Puestos
  etiquetaPrimero: string
  iconos?: Record<string, string>
  error?: string
  onChange: (puestos: Puestos) => void
}) {
  const [anuncio, setAnuncio] = useState('')
  const [nuevo, setNuevo] = useState<number>()
  const arrastrado = useRef<number>(undefined)
  const texto = (codigo: string) => opciones.find((o) => o.codigo === codigo)?.texto ?? codigo
  const lleno = completo(puestos)
  function cambiar(siguiente: Puestos, mensaje: string, indiceNuevo?: number) {
    onChange(siguiente)
    setAnuncio(mensaje)
    setNuevo(indiceNuevo)
  }
  function elegir(codigo: string) {
    const siguiente = colocar(puestos, codigo)
    if (siguiente === puestos) return
    const indice = siguiente.indexOf(codigo)
    cambiar(siguiente, `${texto(codigo)} en el puesto ${indice + 1}. ${pendientes(siguiente)}`, indice)
  }
  function devolver(indice: number) {
    const codigo = puestos[indice]
    if (!codigo) return
    cambiar(
      quitar(puestos, indice),
      `${texto(codigo)} volvió a las opciones. ${pendientes(quitar(puestos, indice))}`,
    )
  }
  function soltar(destino: number) {
    const origen = arrastrado.current
    arrastrado.current = undefined
    if (origen === undefined || origen === destino) return
    const siguiente = intercambiar(puestos, origen, destino)
    cambiar(siguiente, `Intercambiaste los puestos ${origen + 1} y ${destino + 1}.`)
  }
  return (
    <div className="sx-podium-wrap">
      <ol className="sx-podium" style={{ gridTemplateColumns: `1.25fr repeat(${puestos.length - 1}, 1fr)` }}>
        {puestos.map((codigo, i) => {
          const Icon = codigo ? iconoRegistro(iconos?.[codigo]) : undefined
          const etiqueta = i === 0 ? etiquetaPrimero : `${i + 1}º lugar`
          return (
            <li key={i}>
              <button
                type="button"
                className={`sx-podium-slot ${i === 0 ? 'is-first' : ''} ${codigo ? 'is-filled' : ''} ${nuevo === i ? 'is-new' : ''}`}
                aria-label={
                  codigo ? `Puesto ${i + 1}: ${texto(codigo)}. Pulsa para quitar` : `Puesto ${i + 1}: vacío`
                }
                aria-disabled={!codigo}
                draggable={!!codigo}
                onClick={() => devolver(i)}
                onDragStart={(event) => {
                  arrastrado.current = i
                  event.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  soltar(i)
                }}
              >
                <span className="sx-podium-number">{i + 1}</span>
                <small>{etiqueta}</small>
                {codigo && Icon && (
                  <span className="sx-podium-value">
                    <Icon size={20} aria-hidden="true" />
                    <strong>{texto(codigo)}</strong>
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
      <p className="sx-podium-hint">
        Toca un puesto para devolver la ficha
        <span className="sx-podium-drag-hint"> · arrastra para intercambiar</span>
      </p>
      {error && (
        <p role="alert" className="sx-submission-error">
          {error}
        </p>
      )}
      {!lleno && (
        <div className="sx-podium-chips">
          {opciones.map((o) => {
            const Icon = iconoRegistro(iconos?.[o.codigo])
            const colocada = puestos.includes(o.codigo)
            return (
              <button
                type="button"
                key={o.codigo}
                className="sx-podium-chip"
                style={colocada ? { visibility: 'hidden' } : undefined}
                aria-hidden={colocada || undefined}
                tabIndex={colocada ? -1 : undefined}
                onClick={() => elegir(o.codigo)}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{o.texto}</span>
              </button>
            )
          })}
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {anuncio}
      </p>
    </div>
  )
}

function pendientes(puestos: Puestos) {
  const n = faltan(puestos)
  return n === 0 ? 'Podio completo.' : n === 1 ? 'Falta 1 puesto.' : `Faltan ${n} puestos.`
}
