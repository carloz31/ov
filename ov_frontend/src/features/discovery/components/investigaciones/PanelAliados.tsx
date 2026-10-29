import { Award } from 'lucide-react'
import { iniciales, lineaNivel } from '@/lib/servidor/adaptadoresInvestigaciones'
import type { Aliado, Aliados } from '@/types/servidor'

// F09 (boceto 03): compañeros del salón con guía lista, los de la misma ocupación primero y resaltados. Solo
// informativo: sin mensajería.
export function PanelAliados({ aliados }: { aliados: Aliados }) {
  const total = aliados.misma_ocupacion.length + aliados.otras.length
  return (
    <section className="sx-i-panel" aria-labelledby="aliados-titulo">
      <div className="sx-i-panel-cabecera">
        <h3 id="aliados-titulo">Aliados en tu salón · {total}</h3>
        <small className="sx-i-meta">Compañeros con guía lista</small>
      </div>
      <p className="sx-i-meta">
        Si alguien investiga la misma ocupación, pónganse de acuerdo fuera de la plataforma: pueden entrevistar juntos
        y publicar como coautores.
      </p>
      {total === 0 && <p>Nadie de tu salón tiene una guía lista todavía.</p>}
      {aliados.misma_ocupacion.length > 0 && (
        <>
          <p className="sx-i-grupo">Investigan lo mismo que tú</p>
          {aliados.misma_ocupacion.map((a) => (
            <FilaAliado key={a.codigo} aliado={a} misma />
          ))}
        </>
      )}
      {aliados.otras.length > 0 && (
        <>
          <p className="sx-i-grupo">También están investigando</p>
          {aliados.otras.map((a) => (
            <FilaAliado key={a.codigo} aliado={a} />
          ))}
        </>
      )}
      <small className="sx-i-letra-chica">Solo informativo: no hay mensajería. Desaparecen al publicar o cancelar.</small>
    </section>
  )
}

function FilaAliado({ aliado, misma = false }: { aliado: Aliado; misma?: boolean }) {
  const nivel = lineaNivel(aliado.nivel)
  return (
    <div className="sx-i-aliado" data-misma={misma || undefined}>
      <span className="sx-i-avatar" data-tamano="grande" aria-hidden="true">
        {iniciales(aliado.nombre)}
      </span>
      <div>
        <strong>{aliado.nombre}</strong>
        <small>{[nivel, aliado.ocupacion.titulo].filter(Boolean).join(' · ')}</small>
      </div>
      {aliado.vitrina.length ? (
        <span className="sx-i-vitrina" aria-label={`${aliado.vitrina.length} sellos en su vitrina`}>
          {aliado.vitrina.map((codigo) => (
            <span key={codigo} aria-hidden="true">
              <Award size={14} />
            </span>
          ))}
        </span>
      ) : (
        <span className="sx-i-vitrina">
          <em>Sin insignias en vitrina</em>
        </span>
      )}
    </div>
  )
}
