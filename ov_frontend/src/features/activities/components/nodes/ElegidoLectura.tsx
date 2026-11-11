import type { ItemRegistroCuenta } from '@/types/servidor'
import { esOtra } from '@/lib/servidor/adaptadoresRegistro'
import { RankingPodium } from './RankingPodium'
import { esTopN, puestosDesde, rotuloPuesto } from '../../lib/podio'
import { esItemPiezas, lineasPieza } from '../../lib/formasEco'

// Ajuste front de registros (lote 2, §5 «En lectura»): lo elegido, sin nada que mover. El podio con sus puestos (lo
// escrito, si era una «Otra»); la pieza elegida y su origen como texto; o lo marcado como fichas sin acción (una
// «Otra», con lo que el estudiante escribió).
export function ElegidoLectura({ item }: { item: ItemRegistroCuenta }) {
  const elegidas = item.respuesta!.opciones_elegidas
  if (esTopN(item))
    return (
      <RankingPodium
        opciones={elegidas}
        puestos={puestosDesde(elegidas.map((o) => o.codigo), item.eleccion!.maxima)}
        etiquetaPrimero={rotuloPuesto(0)}
        onChange={() => {}}
        soloLectura
      />
    )
  const pieza = esItemPiezas(item) && item.opciones.find((o) => o.origen && o.codigo === elegidas[0]?.codigo)
  if (pieza)
    return (
      <div className="sx-eco">
        {lineasPieza(pieza).map((l, i) => (
          <p key={i} className="sx-eco-linea">
            {l}
          </p>
        ))}
        {pieza.origen && <p className="sx-eco-origen">{pieza.origen}</p>}
      </div>
    )
  return (
    <div className="sx-chips">
      {elegidas.map((o) => (
        <span key={o.codigo} className={`sx-chip is-selected ${esOtra(o.codigo) ? 'is-escrita' : ''}`}>
          {o.texto}
        </span>
      ))}
    </div>
  )
}
