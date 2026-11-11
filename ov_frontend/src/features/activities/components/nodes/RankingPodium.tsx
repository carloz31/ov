import { useRef, useState, type ReactNode } from 'react'
import { completo, faltan, quitar, colocar, intercambiar, rotuloPuesto, type Puestos } from '../../lib/podio'
import '../../styles/podium.css'

// Podio genérico de «elegir y ordenar top N» (F01; ajuste vista del ítem): N huecos numerados arriba y las
// opciones como chips debajo. Tocar una ficha la coloca en el primer puesto libre; tocar un puesto la devuelve;
// en desktop, arrastrar un puesto sobre otro los intercambia (atajo, nunca la única forma).
export function RankingPodium({
  opciones,
  puestos,
  etiquetaPrimero,
  error,
  onChange,
  soloLectura,
  otra,
  bajoPodio,
}: {
  opciones: { codigo: string; texto: string }[]
  puestos: Puestos
  etiquetaPrimero: string
  error?: string
  onChange: (puestos: Puestos) => void
  // Consulta (F02): el podio se ve completo y no se cambia; sin la ayuda para cambiarlo.
  soloLectura?: boolean
  // Ajuste front de registros (lote 2): «+ Otra» entre las fichas (ocupa el siguiente puesto libre, con el código que
  // da `codigo`) y, debajo del podio, los campos de las «Otra» colocadas.
  otra?: { etiqueta: string; codigo: () => string | undefined }
  bajoPodio?: ReactNode
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
          const etiqueta = i === 0 ? etiquetaPrimero : rotuloPuesto(i)
          return (
            <li key={i}>
              <button
                type="button"
                className={`sx-podium-slot ${i === 0 ? 'is-first' : ''} ${codigo ? 'is-filled' : ''} ${nuevo === i ? 'is-new' : ''}`}
                aria-label={
                  codigo ? `Puesto ${i + 1}: ${texto(codigo)}. Pulsa para quitar` : `Puesto ${i + 1}: vacío`
                }
                aria-disabled={!codigo}
                disabled={soloLectura}
                draggable={!!codigo && !soloLectura}
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
                {codigo && (
                  <span className="sx-podium-value">
                    <strong>{texto(codigo)}</strong>
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
      {bajoPodio}
      {!soloLectura && (
        <p className="sx-podium-hint">
          Toca un puesto para devolver la ficha
          <span className="sx-podium-drag-hint"> · arrastra para intercambiar</span>
        </p>
      )}
      {error && (
        <p role="alert" className="sx-submission-error">
          {error}
        </p>
      )}
      {!lleno && (
        <div className="sx-podium-chips sx-chips">
          {/* Ajuste vista del ítem: el chip colocado sale de la lista y los demás se reacomodan (sin huecos). */}
          {opciones
            .filter((o) => !puestos.includes(o.codigo))
            .map((o) => (
              <button
                type="button"
                key={o.codigo}
                className="sx-podium-chip sx-chip"
                aria-label={o.texto}
                onClick={() => elegir(o.codigo)}
              >
                <span>{o.texto}</span>
              </button>
            ))}
          {otra && (
            <button
              type="button"
              className="sx-podium-chip sx-chip is-otra"
              disabled={!otra.codigo()}
              onClick={() => {
                const codigo = otra.codigo()
                if (codigo) elegir(codigo)
              }}
            >
              <span>{`+ ${otra.etiqueta}`}</span>
            </button>
          )}
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
