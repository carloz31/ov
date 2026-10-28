import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { LockKeyhole, PenLine } from 'lucide-react'
import { etiquetaTramo } from '@/lib/servidor/adaptadoresConversaciones'
import { enLetras } from '../../data/textosFamilia'
import type { ModeloFamilia } from '../../types'
import { CabeceraFamilia } from './CabeceraFamilia'
import { SobreSellado } from './SobreSellado'

// F08 (E2/A2): la sección sin carta propia. El sobre sellado invita a escribirla; debajo, los tres pasos y las tres
// primeras conversaciones apagadas (solo bloque y tema).
export function CartaPendiente({ m, selector }: { m: ModeloFamilia; selector?: ReactNode }) {
  const { textos: t, datos } = m
  if (!datos) return null
  const n = enLetras(datos.total)
  return (
    <div className="fam-container">
      <CabeceraFamilia
        kicker={t.kickerPendiente}
        titulo={t.titulo}
        subtitulo={t.subtituloPendiente}
        accion={selector}
      />
      <section className="fam-card fam-hero">
        <SobreSellado />
        <div>
          <p className="fam-kicker">{t.heroKicker}</p>
          <h2>{t.heroTitulo}</h2>
          <p>{t.heroTexto}</p>
          <div className="fam-hero-accion">
            <Link className="fam-btn" to={m.rutas.carta}>
              <PenLine aria-hidden="true" size={20} />
              {t.heroBoton}
            </Link>
            <span className="fam-nota">{t.heroNota}</span>
          </div>
        </div>
      </section>
      <ol className="fam-grid-3 fam-pasos fam-lista-limpia">
        {t.pasos(n).map((paso, i) => (
          <li key={paso.titulo} className="fam-panel fam-paso">
            <span className="fam-paso-numero">{i + 1}</span>
            <div>
              <h3>{paso.titulo}</h3>
              <p>{paso.texto}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="fam-candado">
        <LockKeyhole aria-hidden="true" size={20} />
        {t.candado}
      </p>
      <ul className="fam-grid-3 fam-lista-limpia">
        {datos.conversaciones.slice(0, 3).map((c) => (
          <li key={c.codigo} className="fam-apagada">
            {etiquetaTramo(c) && <span className="fam-chip">{etiquetaTramo(c)}</span>}
            <h3>{c.tema}</h3>
          </li>
        ))}
      </ul>
    </div>
  )
}
