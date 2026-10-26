import { Link } from 'react-router'
import { Building2, Megaphone } from 'lucide-react'
import { Parchment } from '@/components/student/Parchment'
import { appPaths } from '@/routes/paths'
import { useBackpack } from '@/features/backpack/hooks/useBackpack'
import { SinResultados } from './SinResultados'
import { TarjetaPunteada } from './TarjetaPunteada'
import { TarjetaTestimonio } from './TarjetaTestimonio'
import { VozPorDescubrir } from './VozPorDescubrir'

// Ajuste mochila: las voces abiertas, las que esperan un llamado ya disponible y una tarjeta de cierre que
// cuenta las de llamados que aún no se abren.
export function CompartimentoVoces({ model }: { model: ReturnType<typeof useBackpack> }) {
  const { esFavorita, voces, voices, vocesVisibles, vacio, sinResultados, centralAbierta } = model
  const { favoritoPendiente, isUnlocked, esNueva, casoVoz, openResource, toggleFavorite, consultarRequisito, clear } = model
  const faltan = voces.abiertas.length < voices.length
  return (
    <Parchment className="sx-b-compartment sx-d-dark" label="Compartimento de testimonios" title="Voces de la ciudad">
      {vacio ? (
        <TarjetaPunteada
          variante="vacio"
          icono={<Megaphone />}
          titulo="Las voces llegan con los llamados"
          texto={`Cada llamado que superas en la Central de Casos te presenta a alguien que ya recorrió un camino. Hay ${voices.length} voces en la ciudad.`}
          accion={
            centralAbierta ? (
              <Link className="sx-d-action sx-b-primario" to={appPaths.student.exploration}>
                Ir a la Central de Casos
              </Link>
            ) : (
              <button type="button" className="sx-d-action sx-b-primario" disabled>
                Ir a la Central de Casos
              </button>
            )
          }
        />
      ) : (
        <>
          <div className="sx-b-compartment-heading">
            <p>
              Personas reales que cuentan cómo llegaron a lo que hacen. Cada llamado que atiendes en la Central de
              Casos te acerca a una.
            </p>
            <strong>
              {voces.abiertas.length} de {voices.length} voces
            </strong>
          </div>
          {sinResultados ? (
            <SinResultados texto="Ninguna voz coincide con tu búsqueda" onLimpiar={clear} />
          ) : (
            <div className="sx-b-grid sx-b-grid-testimonial">
              {vocesVisibles.map((resource) => {
                const caso = casoVoz(resource)
                if (!isUnlocked(resource))
                  return (
                    <VozPorDescubrir
                      key={resource.id}
                      titulo={resource.title}
                      pista={resource.summary}
                      caso={caso.titulo}
                      hrefCaso={caso.href}
                      onRequisito={() => consultarRequisito(resource)}
                    />
                  )
                const [nombre, ...rol] = resource.author?.split(' · ') ?? []
                return (
                  <TarjetaTestimonio
                    key={resource.id}
                    nombre={nombre}
                    rol={rol.join(' · ')}
                    titulo={resource.title}
                    cita={resource.summary}
                    regalo={caso.titulo ?? 'de la ciudad'}
                    nueva={esNueva(resource)}
                    favorita={esFavorita(resource)}
                    pendiente={favoritoPendiente(resource.id)}
                    onEscuchar={() => openResource(resource)}
                    onFavorite={() => toggleFavorite(resource.id)}
                  />
                )
              })}
              {faltan && (
                <TarjetaPunteada
                  variante="centrada"
                  icono={<Building2 />}
                  titulo={voces.pendientes > 0 ? 'Más voces se suman a la ciudad' : undefined}
                  texto={
                    voces.pendientes > 0
                      ? `${voces.pendientes} ${voces.pendientes === 1 ? 'voz más espera' : 'voces más esperan'} en llamados que aún no se abren. Aparecerán aquí cuando la Central los publique.`
                      : 'Con cada nuevo llamado aparecerán otras historias.'
                  }
                />
              )}
            </div>
          )}
        </>
      )}
    </Parchment>
  )
}
