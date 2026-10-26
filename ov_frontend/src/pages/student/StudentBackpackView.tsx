import { BackpackHeader } from '@/features/backpack/components/BackpackHeader'
import { useBackpack } from '@/features/backpack/hooks/useBackpack'
import { appPaths } from '@/routes/paths'
import { Search, Star } from 'lucide-react'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { Parchment } from '@/components/student/Parchment'

import '@/styles/student/journey.css'
import '@/styles/student/resources.css'
import '@/features/backpack/styles/backpack.css'
import { BackpackCard } from '@/features/backpack/components/BackpackCard'
import { VisorRecurso } from '@/features/backpack/components/VisorRecurso'
import { FichaModal } from '@/features/backpack/components/FichaModal'
import { RequisitoRecurso } from '@/features/backpack/components/RequisitoRecurso'
const kinds = [
  { id: 'sheet', label: 'Fichas' },
  { id: 'testimonial', label: 'Testimonios' },
] as const

function StudentBackpackView() {
  const model = useBackpack()
  const {
    adventure,
    navigate,
    kind,
    tabs,
    query,
    setQuery,
    favoritesOnly,
    setFavoritesOnly,
    selected,
    setSelectedId,
    requisitoId,
    setRequisitoId,
    requisito,
    requisitoPendiente,
    errorRequisito,
    reintentarRequisito,
    mostrarRequisito,
    tituloRequisito,
    isUnlocked,
    visible,
    cityPoints,
    chooseKind,
    toggleFavorite,
    openResource,
    clear,
    consultarRequisito,
  } = model

  return (
    <DiscoveryStage ambient="backpack">
      <BackpackHeader model={model} />
      <section aria-label="Mi mochila">
        <div className="sx-b-controls">
          <div className="sx-b-tabs" role="tablist" aria-label="Tipo de recurso">
            {kinds.map((item, i) => (
              <button
                key={item.id}
                ref={(node) => {
                  tabs.current[i] = node
                }}
                type="button"
                id={`sx-backpack-tab-${item.id}`}
                role="tab"
                aria-selected={kind === item.id}
                tabIndex={kind === item.id ? 0 : -1}
                aria-controls="sx-backpack-compartments"
                onClick={() => chooseKind(item.id)}
                onKeyDown={(event) => {
                  let index = i
                  if (event.key === 'ArrowRight') index = (i + 1) % kinds.length
                  else if (event.key === 'ArrowLeft') index = (i + kinds.length - 1) % kinds.length
                  else if (event.key === 'Home') index = 0
                  else if (event.key === 'End') index = kinds.length - 1
                  else return
                  event.preventDefault()
                  chooseKind(kinds[index].id)
                  tabs.current[index]?.focus()
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="sx-b-search">
            <Search aria-hidden="true" size={18} />
            <span className="sr-only">Buscar recursos</span>
            <input
              className="sx-d-input"
              placeholder="Buscar en tu mochila…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            className="sx-d-action sx-d-action-ghost"
            type="button"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly(!favoritesOnly)}
          >
            <Star aria-hidden="true" fill={favoritesOnly ? 'currentColor' : 'none'} />
            Mis favoritos
          </button>
        </div>
        <div
          id="sx-backpack-compartments"
          role="tabpanel"
          aria-labelledby={`sx-backpack-tab-${kind}`}
          className="sx-d-stack"
        >
          {(['sheet', 'testimonial'] as const)
            .filter((type) => kind === type)
            .map((type) => {
              const items = visible.filter((r) => r.kind === type)
              return (
                <Parchment
                  key={type}
                  className={`sx-b-compartment ${type === 'testimonial' ? 'sx-d-dark' : ''}`}
                  label={type === 'sheet' ? 'Compartimento de fichas' : 'Compartimento de testimonios'}
                  title={type === 'sheet' ? 'Lo que aprendiste en el camino' : 'Voces de la ciudad'}
                >
                  <div className="sx-b-compartment-heading">
                    <p>
                      {type === 'sheet'
                        ? 'Puedes abrirlas también desde las actividades, cuando las necesites.'
                        : 'Personas reales que cuentan cómo llegaron a lo que hacen. Cada llamado que atiendes en la Central de Casos te acerca a una.'}
                    </p>
                    <strong>
                      {items.length} {type === 'sheet' ? 'fichas' : 'voces'}
                    </strong>
                  </div>
                  <div className={`sx-b-grid sx-b-grid-${type}`}>
                    {items.map((resource) => (
                      <BackpackCard
                        key={resource.id}
                        resource={resource}
                        unlocked={isUnlocked(resource)}
                        saved={adventure.bookmarks.includes(resource.id)}
                        visited={adventure.visits.includes(resource.id)}
                        playable={
                          'caseId' in resource.requirement &&
                          !!cityPoints.find(
                            (p) =>
                              p.id ===
                              ('caseId' in resource.requirement ? resource.requirement.caseId : undefined),
                          )?.actionEnabled
                        }
                        onOpen={() => openResource(resource)}
                        onFavorite={() => toggleFavorite(resource.id)}
                        onRequirement={() => consultarRequisito(resource)}
                      />
                    ))}
                  </div>
                  {!items.length && (
                    <div className="sx-b-empty">
                      <p>
                        {favoritesOnly
                          ? `Aún no marcas ${type === 'sheet' ? 'fichas' : 'voces'} como favoritas. Toca la estrella para guardarlas aquí.`
                          : 'No encontramos recursos con estos filtros'}
                      </p>
                      <button className="sx-d-action sx-d-action-ghost" onClick={clear} type="button">
                        Limpiar filtros
                      </button>
                    </div>
                  )}
                </Parchment>
              )
            })}
        </div>
      </section>
      <p className="sx-b-footer">
        <Star aria-hidden="true" size={18} />
        Las estrellas son tuyas: guarda lo que quieras encontrar rápido cuando armes tus planes.
      </p>
      <VisorRecurso
        resource={selected?.kind !== 'sheet' && selected && isUnlocked(selected) ? selected : undefined}
        onClose={() => setSelectedId(null)}
      />
      <FichaModal
        abierto={selected?.kind === 'sheet' && isUnlocked(selected)}
        resource={selected}
        enlazarActividad
        onClose={() => setSelectedId(null)}
      />
      {mostrarRequisito && (
        <RequisitoRecurso
          abierto={!!requisitoId}
          titulo={tituloRequisito}
          texto={requisito}
          pendiente={requisitoPendiente}
          error={errorRequisito}
          onReintentar={reintentarRequisito}
          onClose={() => setRequisitoId(null)}
          onVolver={() => {
            setRequisitoId(null)
            navigate(appPaths.student.missions)
          }}
        />
      )}
    </DiscoveryStage>
  )
}

export { StudentBackpackView }
