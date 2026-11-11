import { citado, type PlanEco } from '../../lib/formasEco'
import { ECOS } from '../../lib/textosRegistro'
import { TextoRecortable } from './TextoRecortable'

// Ajuste front de registros (lote 2, §6): el eco de plan. El rótulo, la carrera como título (con la institución si
// viene) y, si vienen, los motivos, de quién fue la idea y el relato recortado.
export function EcoPlan({ plan }: { plan: PlanEco }) {
  return (
    <div className="sx-eco">
      <span className="sx-eco-rotulo">{plan.rotulo}</span>
      <strong className="sx-eco-titulo">{[plan.carrera, plan.institucion].filter(Boolean).join(' · ')}</strong>
      {plan.motivos.length > 0 && (
        <p className="sx-eco-linea">
          {ECOS.porQue} {plan.motivos.join(' · ')}
        </p>
      )}
      {plan.idea && <p className="sx-eco-linea">{plan.idea}</p>}
      {plan.relato && (
        <TextoRecortable className="sx-eco-linea" texto={citado(plan.relato)} maximo={110} enlace={ECOS.verCompleto} />
      )}
    </div>
  )
}
