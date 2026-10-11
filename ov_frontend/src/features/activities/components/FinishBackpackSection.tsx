import { Backpack, ChevronRight, FileText } from 'lucide-react'
import { Link } from 'react-router'
import { appPaths } from '@/routes/paths'
import type { ResumenCierre } from '../lib/finishSummary'

export function FinishBackpackSection({ resumen }: { resumen: ResumenCierre }) {
  const resources = appPaths.student.resources
  const mixto = resumen.fichas.length > 0 && resumen.testimonios.length > 0
  return (
    <section className="sx-finish-backpack" aria-labelledby="finish-backpack-title">
      <header>
        <h3 id="finish-backpack-title">
          <Backpack size={19} /> Nuevo en tu mochila{' '}
          <span className="sx-finish-count">{resumen.totalRecursos}</span>
        </h3>
        <Link to={resources}>Abrir mochila</Link>
      </header>
      {resumen.fichas.length > 0 && (
        <div>
          {mixto && <h4>{resumen.fichas.length} fichas</h4>}
          <div className="sx-finish-sheets">
            {resumen.fichasVisibles.map((f) => (
              <Link
                className="sx-finish-sheet"
                key={f.codigo}
                to={`${resources}?${new URLSearchParams({ ficha: f.codigo })}`}
              >
                <FileText size={22} />
                <span>
                  <small>Ficha</small>
                  <strong>{f.nombre}</strong>
                </span>
                <ChevronRight size={16} />
              </Link>
            ))}
            {resumen.fichasOcultas > 0 && (
              <Link className="sx-finish-sheet sx-finish-more" to={`${resources}?kind=sheet`}>
                +{resumen.fichasOcultas} fichas más <ChevronRight size={16} />
              </Link>
            )}
          </div>
        </div>
      )}
      {resumen.testimonios.length > 0 && (
        <div>
          {mixto && <h4>{resumen.testimonios.length} testimonios</h4>}
          <div className="sx-finish-testimonials">
            {resumen.testimoniosVisibles.map((t) => (
              <Link
                className="sx-finish-testimonial"
                key={t.codigo}
                to={`${resources}?${new URLSearchParams({ kind: 'testimonial', ficha: t.codigo })}`}
              >
                <span className="sx-finish-initial">{(t.persona ?? t.nombre).slice(0, 1)}</span>
                <span>
                  <small>Testimonio</small>
                  <strong>{t.persona ? `${t.persona}${t.rol ? ` · ${t.rol}` : ''}` : t.nombre}</strong>
                  {t.cita && <q>{t.cita}</q>}
                </span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
          {resumen.testimoniosOcultos > 0 && (
            <Link className="sx-finish-more-testimonials" to={`${resources}?kind=testimonial`}>
              Ver {resumen.testimoniosOcultos}{' '}
              {resumen.testimoniosOcultos === 1 ? 'testimonio' : 'testimonios'} más <ChevronRight size={14} />
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
