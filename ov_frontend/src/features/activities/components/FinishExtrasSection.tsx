import { Award, Compass, KeyRound, Map, MessageCircle, TrendingUp } from 'lucide-react'
import { Link } from 'react-router'
import { appPaths } from '@/routes/paths'
import type { ExtraCierre } from '../lib/finishSummary'

const iconos = {
  NIVEL: TrendingUp,
  INSIGNIA: Award,
  BLOQUE: Map,
  ACTIVIDAD: Compass,
  CONVERSACIONES: MessageCircle,
  pieza: KeyRound,
}
const rotulos = {
  NIVEL: 'Nivel',
  INSIGNIA: 'Insignia',
  BLOQUE: 'Zona',
  ACTIVIDAD: 'Actividad',
  CONVERSACIONES: 'Conversaciones',
  pieza: 'Pieza',
}

export function FinishExtrasSection({ extras, tarjetas }: { extras: ExtraCierre[]; tarjetas: boolean }) {
  return (
    <section className="sx-finish-extras" aria-labelledby="finish-extras-title">
      <h3 id="finish-extras-title">También ocurrió</h3>
      <ul className={tarjetas ? 'sx-finish-extra-grid' : 'sx-finish-chips'}>
        {extras.map((e) => {
          const Icon = iconos[e.tipo]
          const contenido = (
            <>
              <Icon size={17} />
              <span>
                {tarjetas && <small>{rotulos[e.tipo]}</small>}
                {e.texto}
              </span>
            </>
          )
          return (
            <li key={`${e.tipo}:${e.codigo}`}>
              {e.tipo === 'INSIGNIA' ? <Link to={appPaths.student.passport}>{contenido}</Link> : contenido}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
