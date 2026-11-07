import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { DestinoCierre } from '../lib/destinoRegistro'

// Ajuste registros: el destino sugerido al cerrar un registro, junto a «Volver al mapa».
export function IrAlDestino({ destino }: { destino: DestinoCierre }) {
  const navegar = useNavigate()
  return (
    <button className="sx-secondary-button" onClick={() => navegar(destino.ruta)}>
      {destino.texto} <ArrowRight size={18} />
    </button>
  )
}
