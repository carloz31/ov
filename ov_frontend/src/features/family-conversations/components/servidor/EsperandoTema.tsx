import { Link } from 'react-router'
import { PenLine } from 'lucide-react'
import { etiquetaTramo, respondieron } from '@/lib/servidor/adaptadoresConversaciones'
import type { ConversacionCuenta } from '@/types/servidor'
import type { ModeloFamilia } from '../../types'
import { CajaEsperando } from './CajaEsperando'

// F08 (E6): la mirada propia guardada, editable mientras el otro no responda, y la caja de espera.
export function EsperandoTema({
  m,
  c,
  onEditar,
}: {
  m: ModeloFamilia
  c: ConversacionCuenta
  onEditar: () => void
}) {
  const { textos: t } = m
  const tramo = etiquetaTramo(c)
  return (
    <section className="fam-card fam-tema-detalle">
      {tramo && <span className="fam-chip">{tramo}</span>}
      <p className="fam-kicker">{c.tema}</p>
      <h2>{t.miradaGuardada}</h2>
      <div className="fam-grid-2">
        <div className="fam-mirada">
          <p className="fam-mirada-titulo">{t.tuMirada}</p>
          <h3>{c.pregunta}</h3>
          <p className="fam-mirada-texto">{c.mi_respuesta}</p>
          <button className="fam-link" type="button" onClick={onEditar}>
            <PenLine aria-hidden="true" size={18} />
            {t.editar}
          </button>
        </div>
        <CajaEsperando
          avatares={respondieron(c, m.rol)}
          letra={t.letraEstudiante}
          titulo={t.esperandoTitulo}
          texto={t.esperandoTexto}
        />
      </div>
      <Link className="fam-btn" to={m.rutas.lista}>
        {t.volverLista}
      </Link>
    </section>
  )
}
