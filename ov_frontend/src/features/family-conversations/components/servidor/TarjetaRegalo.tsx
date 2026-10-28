import { Link } from 'react-router'
import { Gift } from 'lucide-react'
import { puntosRegalo } from '@/lib/servidor/adaptadoresConversaciones'
import { enLetras } from '../../data/textosFamilia'
import type { ModeloFamilia } from '../../types'
import { PuntosRegalo } from './PuntosRegalo'

// F08 (E4/A4): el regalo sellado con su avance. Nada dice que es una carta: con todas conversadas, el sello se
// rompe y lleva a la pantalla del regalo.
export function TarjetaRegalo({ m }: { m: ModeloFamilia }) {
  const { textos: t, datos } = m
  if (!datos) return null
  return (
    <section className="fam-panel fam-regalo">
      <span className="fam-regalo-sello">
        <Gift aria-hidden="true" size={44} />
      </span>
      <div>
        <p className="fam-kicker">{t.regaloKicker}</p>
        <h2>{datos.cartas_disponibles ? t.regaloRoto : t.regaloConteo(datos.completadas, datos.total)}</h2>
        <PuntosRegalo puntos={puntosRegalo(datos)} />
      </div>
      <div>
        <p>{datos.cartas_disponibles ? t.regaloRotoTexto : t.regaloTexto(enLetras(datos.total))}</p>
        {datos.cartas_disponibles && (
          <Link className="fam-btn fam-btn--oro" to={m.rutas.regalo}>
            {t.regaloAbrir}
          </Link>
        )}
        {t.cartaEnRegalo && (
          <Link className="fam-link fam-link--subrayado" to={m.rutas.carta}>
            {t.enlaceCarta}
          </Link>
        )}
      </div>
    </section>
  )
}
