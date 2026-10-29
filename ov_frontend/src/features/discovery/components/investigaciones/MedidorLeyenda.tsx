import { Check } from 'lucide-react'
import { medidorLeyenda } from '@/lib/servidor/adaptadoresInvestigaciones'

// F09: «Camino a Leyenda» compacto (tarjeta de Mis investigaciones): favoritos X de N, destacada y la barra.
export function MedidorLeyenda({
  favoritos,
  favoritosLeyenda,
  destacada,
  leyenda,
  detalle,
}: {
  favoritos: number
  favoritosLeyenda: number
  destacada: boolean
  leyenda: boolean
  detalle?: string
}) {
  const medidor = medidorLeyenda({ favoritos, favoritosLeyenda, destacada, leyenda })
  return (
    <div className="sx-i-medidor">
      <div className="sx-i-medidor-fila">
        <strong>{leyenda ? 'Leyenda' : 'Camino a Leyenda'}</strong>
        <span>
          {medidor.favoritos} de {medidor.requeridos} favoritos ·{' '}
          {destacada ? (
            <>
              Destacada <Check aria-hidden="true" size={14} />
            </>
          ) : (
            'Sin destacar'
          )}
        </span>
      </div>
      <div
        className="sx-i-barra"
        role="progressbar"
        aria-label="Camino a Leyenda"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={medidor.porcentaje}
      >
        <span style={{ width: `${medidor.porcentaje}%` }} />
      </div>
      {detalle && <small className="sx-i-meta">{detalle}</small>}
    </div>
  )
}
