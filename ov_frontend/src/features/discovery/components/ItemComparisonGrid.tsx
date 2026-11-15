import type { ItemPartidaLlegada } from '../lib/partidaLlegada'
import '../styles/partida-llegada.css'

// Ajuste de F03: rejilla única de ítems (enunciado | Al inicio | flecha | Al cierre). «cambio»: partida → llegada
// resaltada; «igual»: partida = «Igual»; «partida»: la respuesta y, atenuado, «Al final». Ajuste
// color-partida-llegada: en «partida», una respuesta baja va en ámbar; en «cambio», la de cierre va en verde si subió
// y en ámbar si bajó (aunque siga baja: para el estudiante cuenta que avanzó).
const TONO_DIRECCION = { SUBIO: ' sx-d-pl-chip-exito', BAJO: ' sx-d-pl-chip-aviso' } as const
export function ItemComparisonGrid({
  modo,
  items,
  cabecera = false,
}: {
  modo: 'cambio' | 'igual' | 'partida'
  items: ItemPartidaLlegada[]
  cabecera?: boolean
}) {
  return (
    <div className="sx-d-pl-scroll">
      <div className={`sx-d-pl-items sx-d-pl-items-${modo}`} role="table">
        {cabecera && (
          <div className="sx-d-pl-items-head" role="row">
            <span role="columnheader" />
            <span role="columnheader">Al inicio</span>
            <span aria-hidden="true" />
            <span role="columnheader">Al cierre</span>
          </div>
        )}
        {items.map((item) => (
          <div key={item.item} className="sx-d-pl-item" role="row">
            <span role="cell">{item.enunciado}</span>
            <span role="cell">
              <span className={`sx-d-pl-chip${modo === 'partida' && item.baja ? ' sx-d-pl-chip-aviso' : ''}`}>
                {item.partida}
              </span>
            </span>
            <span className="sx-d-pl-sign" aria-hidden="true">
              {modo === 'igual' ? '=' : '→'}
            </span>
            <span role="cell">
              {modo === 'cambio' ? (
                <span className={`sx-d-pl-chip${item.direccion ? TONO_DIRECCION[item.direccion] : ''}`}>
                  {item.llegada}
                </span>
              ) : modo === 'igual' ? (
                <span className="sx-d-pl-chip sx-d-pl-chip-outline">Igual</span>
              ) : (
                <span className="sx-d-pl-chip sx-d-pl-chip-pending">Al final</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
