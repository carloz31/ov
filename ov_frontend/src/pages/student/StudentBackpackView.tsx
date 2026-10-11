import { BackpackHeader } from '@/features/backpack/components/BackpackHeader'
import { useBackpack } from '@/features/backpack/hooks/useBackpack'
import { appPaths } from '@/routes/paths'
import { Check, Search, Sparkles, Star } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { BackpackViewerFrame as DialogContent } from '@/features/backpack/components/BackpackViewerFrame'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { Parchment } from '@/components/student/Parchment'

import '@/styles/student/journey.css'
import '@/styles/student/resources.css'
import '@/features/backpack/styles/backpack.css'
import { BackpackCard } from '@/features/backpack/components/BackpackCard'
import { ResourceContent } from '@/features/backpack/components/ResourceContent'
const kindLabels = { sheet: 'Ficha', testimonial: 'Testimonio', interview: 'Entrevista' }
const kinds = [
  { id: 'all', label: 'Todo' },
  { id: 'sheet', label: 'Fichas' },
  { id: 'testimonial', label: 'Testimonios' },
] as const

function StudentBackpackView() {
  const model = useBackpack()
  const {
    adventure,
    journey,
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
    setIntentoRequisito,
    mostrarRequisito,
    isUnlocked,
    visible,
    cityPoints,
    chooseKind,
    toggleFavorite,
    openResource,
    clear,
    consultarRequisito,
    marcarLeida,
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
            .filter((type) => kind === 'all' || kind === type)
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
                    {type === 'testimonial' && !favoritesOnly && !query.trim() && (
                      <div className="sx-b-more">
                        <Sparkles aria-hidden="true" />
                        <h3>Más voces se suman a la ciudad</h3>
                        <p>Con cada nuevo llamado aparecerán otras historias.</p>
                      </div>
                    )}
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
      <Dialog
        open={Boolean(selected && isUnlocked(selected))}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      >
        {selected && isUnlocked(selected) && (
          <DialogContent className="resource-dialog max-w-4xl bg-[#fffdf7] p-0 md:p-0">
            <DialogHeader className="mb-0 border-b border-[#e4e0cb] p-6 pr-16 sm:p-7 sm:pr-16">
              <Badge className="mb-2 w-fit" variant="success">
                <Check className="size-3" /> {kindLabels[selected.kind]}{' '}
                {selected.kind === 'testimonial' ? 'desbloqueado' : 'desbloqueada'}
              </Badge>
              <DialogTitle className="text-[#304b3d]">{selected.title}</DialogTitle>
              {selected.author && (
                <p className="text-xs font-semibold text-[#7c805d]">
                  {selected.kind === 'interview' ? 'Compartido por ' : ''}
                  {selected.author}
                </p>
              )}
              <DialogDescription>{selected.description}</DialogDescription>
            </DialogHeader>
            <div className="p-6 sm:p-7">
              <ResourceContent resource={selected} />
              {selected.kind === 'sheet' && selected.content && (
                <Button
                  variant="outline"
                  disabled={(journey.readResourceIds ?? journey.resources).includes(selected.id)}
                  onClick={() => marcarLeida(selected)}
                >
                  <Check size={18} />
                  {(journey.readResourceIds ?? journey.resources).includes(selected.id)
                    ? 'Ficha leída'
                    : 'Leí la ficha'}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e0cb] bg-[#f4f3e8] px-6 py-4">
              <Button
                variant="outline"
                size="sm"
                aria-pressed={adventure.bookmarks.includes(selected.id)}
                onClick={() => toggleFavorite(selected.id)}
              >
                <Star
                  className={adventure.bookmarks.includes(selected.id) ? 'fill-current text-[#aa7d26]' : ''}
                />
                {adventure.bookmarks.includes(selected.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              </Button>
              {selected.source && (
                <p className="max-w-md text-xs leading-5 text-muted-foreground">Fuente: {selected.source}</p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
      {mostrarRequisito && (
        <Dialog
          open={!!requisitoId}
          onOpenChange={(open) => {
            if (!open) setRequisitoId(null)
          }}
        >
          <DialogContent className="resource-dialog max-w-xl">
            <DialogHeader>
              <DialogTitle>Cómo obtener esta ficha</DialogTitle>
              <DialogDescription>{requisito}</DialogDescription>
            </DialogHeader>
            {errorRequisito && (
              <button className="sx-secondary-button" onClick={() => setIntentoRequisito((i) => i + 1)}>
                Reintentar requisito
              </button>
            )}
            {!requisitoPendiente && (
              <button
                type="button"
                className="sx-primary-button"
                onClick={() => {
                  setRequisitoId(null)
                  navigate(appPaths.student.missions)
                }}
              >
                Volver al camino
              </button>
            )}
          </DialogContent>
        </Dialog>
      )}
    </DiscoveryStage>
  )
}

export { StudentBackpackView }
