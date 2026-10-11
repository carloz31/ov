import { useStudentProfile } from '@/features/discovery/hooks/useStudentProfile'
import { Link } from 'react-router'
import { Eye, Heart, Sparkles } from 'lucide-react'
import { appPaths } from '@/routes/paths'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { Parchment } from '@/components/student/Parchment'
import { Seal } from '@/components/student/Seal'
import { TrailBar } from '@/components/student/TrailBar'
import { CollectionSlot } from '@/components/student/CollectionSlot'
import { achievementIcons } from '@/features/discovery/lib/passport'
import { getPlanCompleteness } from '@/features/discovery/lib/plans'
export function StudentProfileView() {
  const {
    context,
    nombre,
    iniciales,
    level,
    recorrido,
    ciudad,
    afinidadCiudad,
    badges,
    visibleBadges,
    pages,
    plans,
    extraFavorites,
  } = useStudentProfile()
  return (
    <DiscoveryStage ambient="profile">
      <Parchment className="sx-d-dark">
        <div className="sx-d-traveler">
          <span className="sx-d-avatar">{iniciales}</span>
          <div>
            <p className="sx-d-eyebrow">Ficha del viajero</p>
            <h1>{nombre}</h1>
            {level ? (
              <div className="sx-d-row">
                <span className="sx-level-medallion">
                  <span>NIVEL</span>
                  <strong>{String(level.number).padStart(2, '0')}</strong>
                </span>
                <strong>{level.label}</strong>
              </div>
            ) : (
              <p>No hay un nivel disponible en el servidor.</p>
            )}
            <p>
              Todo lo que vas descubriendo en el viaje se reúne aquí: lo que has logrado, lo que Helena lee de
              ti y los caminos que estás considerando.
            </p>
          </div>
          <aside>
            <p>Lo que muestras a tus compañeros</p>
            <div className="sx-d-seal-row">
              {[0, 1, 2].map((i) => {
                const badge = visibleBadges[i]
                const Icon = badge ? achievementIcons[badge.icon] : Sparkles
                return (
                  <CollectionSlot key={i} compact collected={!!badge} icon={<Icon />}>
                    {badge?.title ?? 'Espacio libre'}
                  </CollectionSlot>
                )
              })}
            </div>
            <Link className="sx-d-action sx-d-action-ghost" to={appPaths.student.passport}>
              Elegir qué muestro
            </Link>
          </aside>
        </div>
      </Parchment>
      <div className="sx-d-columns">
        <Parchment label="Capítulo I" title="Lo que he logrado">
          {level && (
            <div className="sx-d-quote">
              <strong>
                {level.number === 5
                  ? 'Llegaste al último nivel del viaje'
                  : `Para el nivel ${level.number + 1}`}
              </strong>
              <p>{level.number !== 5 && level.nextStep}</p>
            </div>
          )}
          <TrailBar label="Recorrido" value={recorrido} />
          <TrailBar
            label="Afinidad con la ciudad"
            value={afinidadCiudad}
            text={ciudad ? undefined : 'Se abre al llegar a la ciudad'}
            muted
          />
          <div className="sx-d-row">
            <strong>Logros recientes</strong>
            <span>{badges.length} obtenidos</span>
          </div>
          <div className="sx-d-achievements">
            {badges.slice(-4).map((b) => {
              const Icon = achievementIcons[b.icon]
              return (
                <CollectionSlot key={b.code} group={b.group} icon={<Icon />}>
                  <span data-group={b.group}>{b.title}</span>
                </CollectionSlot>
              )
            })}
          </div>
          {!badges.length && <p>Tu primera insignia te espera en el camino.</p>}
          <Link className="sx-d-action" to={appPaths.student.passport}>
            Ver mis logros
          </Link>
        </Parchment>
        <Parchment label="Capítulo II" title="Lo que Helena descubre de mí" className="sx-d-highlight">
          {pages.map((p) => (
            <div className="sx-d-row" key={p.id}>
              <Seal state={p.state}>{p.result?.areas.map((a) => a.code).join('') ?? <Sparkles />}</Seal>
              <div>
                <strong>{p.title}</strong>
                <p className="sx-d-muted">
                  {p.state === 'sealed'
                    ? `Sellada · ${p.missions.done} de ${p.missions.total} misiones`
                    : p.state === 'ready'
                      ? 'Lista para revelar'
                      : 'Descifrada'}
                </p>
                {p.demo && p.state !== 'sealed' && <small>Demostración</small>}
              </div>
            </div>
          ))}
          <Link className="sx-d-action sx-d-action-gold" to={discoveryPaths.helena}>
            Abrir el libro de Helena
          </Link>
        </Parchment>
        <Parchment label="Capítulo III" title="Hacia dónde voy">
          {[0, 1, 2].map((i) => (
            <div className="sx-d-row" key={i}>
              <span className="sx-d-plan-letter" data-position={i}>
                {'ABC'[i]}
              </span>
              <strong>{plans[i]?.name ?? 'Espacio libre'}</strong>
              {plans[i] && (
                <small>
                  {getPlanCompleteness(plans[i]) === 4
                    ? 'Opción real'
                    : `${getPlanCompleteness(plans[i])} de 4`}
                </small>
              )}
            </div>
          ))}
          <h3>Lo que guardaste en el camino</h3>
          <div className="sx-d-stack">
            {[
              [context.careerInterestIds.length, 'carreras'],
              [context.profiles.filter((p) => p.interested).length, 'ocupaciones'],
              [context.institutionInterestIds.length, 'instituciones'],
            ].map(([n, label]) => (
              <CollectionSlot key={label} icon={<Heart />}>
                {n} {label}
              </CollectionSlot>
            ))}
          </div>
          {extraFavorites > 0 && plans.length < 3 && (
            <p>Tienes {extraFavorites} carreras favoritas que aún no son un plan.</p>
          )}
          <Link className="sx-d-action" to={appPaths.student.decisions}>
            Ver mis planes y favoritos
          </Link>
        </Parchment>
      </div>
      <p className="sx-d-privacy">
        <Eye aria-hidden="true" />
        Tus compañeros solo ven tu nivel y hasta tres insignias que elijas. Lo demás lo ven tú y tu
        orientadora.
      </p>
    </DiscoveryStage>
  )
}
