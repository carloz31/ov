import { useCatalogAffinity } from '@/features/discovery/hooks/useCatalogAffinity'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Search, GraduationCap, BriefcaseBusiness, School } from 'lucide-react'
import { useOccupationExplorationContext } from '@/context/occupationExplorationContext'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { FavoriteButton } from '@/components/student/FavoriteButton'
import { Seal } from '@/components/student/Seal'
import { useDiscovery } from '@/store/discoveryStore'

import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { textoAjuste } from '@/lib/servidor/adaptadores'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { careerDetails, occupationDetails, institutionDetails, dimensionNames, institutionTypeNames } from '@/features/discovery/lib/catalogDetails'
import { getFamily, matchesName } from '@/features/discovery/lib/catalogSelectors'
const sectionCopy = {
  professions: {
    title: 'Catálogo de profesiones',
    description: 'Conoce qué hacen distintos profesionales, dónde trabajan y qué habilidades utilizan.',
    placeholder: 'Buscar una profesión por nombre',
  },
  careers: {
    title: 'Catálogo de carreras',
    description: 'Explora rutas de formación y descubre los campos en los que podrías desarrollarte.',
    placeholder: 'Buscar una carrera por nombre',
  },
  institutions: {
    title: 'Instituciones educativas',
    description: 'Compara tipos de instituciones y conoce las áreas de estudio que pueden ofrecer.',
    placeholder: 'Buscar una institución por nombre',
  },
}
export function StudentCatalogView({ section }: { section: 'professions' | 'careers' | 'institutions' }) {
  const context = useOccupationExplorationContext(),
    discovery = useDiscovery(),
    [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const { coincidencias, coincidenciasAdicionales, ordenarOcupaciones, afinidadPara, textoAfinidad,
    errorAfinidad, perfilPlano, necesitaRevelar, reintentarAfinidad } = useCatalogAffinity(discovery, params.get('afines') === '1')
  const copy = sectionCopy[section]
  const obtained = (id: string) =>
    context.profiles.some((p) => p.occupationId === id && p.discoveryState !== 'unused')
  const obtainedCount = occupationDetails.filter((o) => obtained(o.id)).length
  const occupations = [
    ...occupationDetails.map((occupation) => ({
      occupation,
      match: coincidencias.find((c) => c.codigo === occupation.id),
    })),
    ...coincidenciasAdicionales.map((match) => ({ occupation: undefined, match })),
  ]
    .filter(({ occupation, match }) => matchesName(occupation?.name ?? match?.titulo ?? '', query))
    .sort(ordenarOcupaciones)
  const careers = careerDetails.filter((c) => matchesName(c.name, query)),
    institutions = institutionDetails.filter((i) => matchesName(i.name, query))
  const empty =
    section === 'professions'
      ? !occupations.length
      : section === 'careers'
        ? !careers.length
        : !institutions.length
  return (
    <DiscoveryStage ambient="atlas">
      <header className="sx-d-header">
        <div>
          <p className="sx-d-eyebrow">Atlas del mundo exterior</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        {section === 'professions' && (
          <div className="sx-d-exploration-summary">
            <span className="sx-d-eyebrow">Tu exploración</span>
            <strong>
              {obtainedCount} {obtainedCount === 1 ? 'ocupación descubierta' : 'ocupaciones descubiertas'}
            </strong>
          </div>
        )}
      </header>
      <label className="sx-d-search-row sx-d-actions">
        <Search aria-hidden="true" />
        <span className="sr-only">{copy.placeholder}</span>
        <input
          className="sx-d-input"
          placeholder={copy.placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="sx-d-columns">
        {errorAfinidad && (
          <section role="alert">
            <p>{mensajeErrorServidor(errorAfinidad)}</p>
            <button className="sx-d-action" onClick={() => void reintentarAfinidad()}>
              Reintentar consulta
            </button>
          </section>
        )}
        {perfilPlano && (
          <p>
            Tus respuestas todavía no distinguen un interés. No hay ocupaciones afines para este resultado.
          </p>
        )}
        {necesitaRevelar && (
          <Link className="sx-d-action" to="/student/profile/helena">
            Revela tu página de intereses para consultar las afinidades.
          </Link>
        )}
        {section === 'careers' &&
          careers.map((c) => (
            <article className="sx-d-parchment sx-d-atlas-card" key={c.id}>
              <FavoriteButton
                compact
                selected={context.careerInterestIds.includes(c.id)}
                onToggle={() => context.toggleCareerInterest(c.id)}
              />
              <Link to={discoveryPaths.career(c.id)} className="sx-d-card-link">
                <GraduationCap aria-hidden="true" />
                <h2>{c.name}</h2>
                <p className="sx-d-eyebrow">{getFamily(c.familyId)?.name}</p>
                <span className="sx-d-tag">{c.durationYears} años</span>
                <p className="sx-d-clamp-two">{c.description}</p>
              </Link>
            </article>
          ))}
        {section === 'professions' &&
          occupations.map(({ occupation: o, match }) =>
            o ? (
              <article className="sx-d-parchment sx-d-atlas-card" key={o.id}>
                <FavoriteButton
                  compact
                  selected={context.profiles.some((p) => p.occupationId === o.id && p.interested)}
                  onToggle={() => context.toggleOccupationInterest(o.id)}
                />
                <Link to={discoveryPaths.occupation(o.id)} className="sx-d-card-link">
                  <BriefcaseBusiness aria-hidden="true" />
                  <h2>{o.name}</h2>
                  <div className="sx-d-seal-row">
                    {o.highPoints.map((d) => (
                      <span key={d} title={dimensionNames[d]}>
                        <Seal state="revealed">{d}</Seal>
                      </span>
                    ))}
                  </div>
                  <p className="sx-d-clamp-two">{o.whatTheyDo}</p>
                  {obtained(o.id) && <span className="sx-d-tag">Ícono obtenido</span>}
                  {params.get('afines') === '1' && afinidadPara(o.id) && (
                    <p>
                      {textoAfinidad(match)}
                    </p>
                  )}
                  <small>
                    {o.contentStatus === 'pending'
                      ? 'Ficha en preparación desde O*NET'
                      : 'Perfil de intereses de demostración'}
                  </small>
                </Link>
              </article>
            ) : (
              <article className="sx-d-parchment sx-d-atlas-card" key={match!.codigo_onet}>
                <h2>{match!.titulo}</h2>
                <p>
                  Afín a tu perfil · {textoAjuste(match!.ajuste)} · posición {match!.posicion} · correlación{' '}
                  {match!.correlacion}
                </p>
                <small>Detalle aún no disponible en el catálogo.</small>
              </article>
            ),
          )}
        {section === 'institutions' &&
          institutions.map((i) => (
            <article className="sx-d-parchment sx-d-atlas-card" key={i.id}>
              <FavoriteButton
                compact
                selected={context.institutionInterestIds.includes(i.id)}
                onToggle={() => context.toggleInstitutionInterest(i.id)}
              />
              <Link to={discoveryPaths.institution(i.id)} className="sx-d-card-link">
                <School aria-hidden="true" />
                <h2>{i.name}</h2>
                <p>
                  {institutionTypeNames[i.type]} · {i.management === 'PUBLICA' ? 'Pública' : 'Privada'}
                </p>
                <p>
                  {i.location.department} · {i.careerIds.length} carreras
                </p>
                <small>Institución ficticia · Demostración</small>
              </Link>
            </article>
          ))}
        {empty && (
          <section className="sx-d-parchment">
            <h2>No encontramos resultados</h2>
            <p>No hay resultados que coincidan con tu búsqueda. Prueba con otro nombre.</p>
          </section>
        )}
      </div>
    </DiscoveryStage>
  )
}
