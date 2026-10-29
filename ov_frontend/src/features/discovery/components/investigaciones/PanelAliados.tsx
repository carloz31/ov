import { iniciales, lineaNivel } from '@/lib/servidor/adaptadoresInvestigaciones'
import type { Aliado, Aliados } from '@/types/servidor'
import { achievementIcons } from '../../lib/passport'

type Sellos = (codigos: string[]) => { codigo: string; nombre: string }[]

// F09 (boceto 03): compañeros del salón con guía lista, los de la misma ocupación primero y resaltados. Solo
// informativo: sin mensajería.
export function PanelAliados({ aliados, sellos }: { aliados: Aliados; sellos: Sellos }) {
  const total = aliados.misma_ocupacion.length + aliados.otras.length
  return (
    <section className="sx-i-panel" aria-labelledby="aliados-titulo">
      <div className="sx-i-panel-cabecera">
        <h3 id="aliados-titulo">Aliados en tu salón · {total}</h3>
        <small className="sx-i-meta">Compañeros con guía lista</small>
      </div>
      <p className="sx-i-meta">
        Si alguien investiga la misma ocupación, pónganse de acuerdo fuera de la plataforma: pueden
        entrevistar juntos y publicar como coautores.
      </p>
      {total === 0 && <p>Nadie de tu salón tiene una guía lista todavía.</p>}
      {aliados.misma_ocupacion.length > 0 && (
        <>
          <p className="sx-i-grupo">Investigan lo mismo que tú</p>
          {aliados.misma_ocupacion.map((a) => (
            <FilaAliado key={a.codigo} aliado={a} sellos={sellos} misma />
          ))}
        </>
      )}
      {aliados.otras.length > 0 && (
        <>
          <p className="sx-i-grupo">También están investigando</p>
          {aliados.otras.map((a) => (
            <FilaAliado key={a.codigo} aliado={a} sellos={sellos} />
          ))}
        </>
      )}
      <small className="sx-i-letra-chica">
        Solo informativo: no hay mensajería. Desaparecen al publicar o cancelar.
      </small>
    </section>
  )
}

// Los sellos se ven con el ícono del pasaporte y su nombre al pasar el puntero (y para los lectores de pantalla).
function FilaAliado({ aliado, sellos, misma = false }: { aliado: Aliado; sellos: Sellos; misma?: boolean }) {
  const Sello = achievementIcons.sparkles
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
        <ul className="sx-i-vitrina" aria-label={`Vitrina de ${aliado.nombre}`}>
          {sellos(aliado.vitrina).map((s) => (
            <li key={s.codigo} title={s.nombre}>
              <Sello aria-hidden="true" size={14} />
              <span className="sr-only">{s.nombre}</span>
            </li>
          ))}
        </ul>
      ) : (
        <span className="sx-i-vitrina">
          <em>Sin insignias en vitrina</em>
        </span>
      )}
    </div>
  )
}
