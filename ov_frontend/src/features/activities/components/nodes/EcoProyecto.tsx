import { useState } from 'react'
import { resumenPasos, type PasoEco } from '../../lib/formasEco'
import { ECOS } from '../../lib/textosRegistro'

const VISIBLES = 3

// Ajuste front de registros (lote 2, §6): el eco de proyecto (b5-1). Carrera e institución como título, el camino,
// el resumen de los pasos (siempre, también plegado) y la lista, plegada a tres con «ver los N pasos» / «ver menos».
export function EcoProyecto({
  rotulo,
  carrera,
  institucion,
  camino,
  pasos,
}: {
  rotulo: string
  carrera: string
  institucion?: string
  camino?: string
  pasos?: PasoEco[]
}) {
  const [abierto, setAbierto] = useState(false)
  const lista = pasos ?? []
  const plegable = lista.length > VISIBLES
  const visibles = plegable && !abierto ? lista.slice(0, VISIBLES) : lista
  return (
    <div className="sx-eco">
      <span className="sx-eco-rotulo">{rotulo}</span>
      <strong className="sx-eco-titulo">{[carrera, institucion].filter(Boolean).join(' · ')}</strong>
      {camino && (
        <p className="sx-eco-linea">
          {ECOS.camino} {camino}
        </p>
      )}
      {lista.length > 0 && (
        <>
          <p className="sx-eco-origen">{resumenPasos(lista)}</p>
          <ul className="sx-eco-pasos">
            {visibles.map((paso, i) => (
              <li key={`${i}-${paso.texto}`}>
                <b>{paso.hecho ? ECOS.pasoHecho : ECOS.pasoPendiente}</b>
                <span>{paso.texto}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {plegable && (
        <button type="button" className="sx-eco-enlace" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
          {abierto ? ECOS.verMenos : ECOS.verPasos(lista.length)}
        </button>
      )}
    </div>
  )
}
