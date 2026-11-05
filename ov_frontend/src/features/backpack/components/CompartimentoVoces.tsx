import { Link } from 'react-router'
import { Building2, Megaphone } from 'lucide-react'
import { Parchment } from '@/components/student/Parchment'
import { appPaths } from '@/routes/paths'
import { useBackpack } from '@/features/backpack/hooks/useBackpack'
import { SinResultados } from './SinResultados'
import { TarjetaPunteada } from './TarjetaPunteada'
import { TarjetaTestimonio } from './TarjetaTestimonio'
import { VozPorDescubrir } from './VozPorDescubrir'

// Ajuste mochila: las voces abiertas, las que esperan un origen ya disponible y una tarjeta de cierre que
// cuenta las que aún no se abren.
export function CompartimentoVoces({ model }: { model: ReturnType<typeof useBackpack> }) {
  const { esFavorita, voces, voices, vocesVisibles, textosVoces, vacio, sinResultados, centralAbierta } = model
  const { favoritoPendiente, isUnlocked, esNueva, origenVoz, openResource, toggleFavorite, consultarRequisito, clear } = model
  const faltan = voces.abiertas.length < voices.length
  return (
    <Parchment className="sx-b-compartment sx-d-dark" label="Compartimento de testimonios" title="Voces de la ciudad">
      {vacio ? (
        <TarjetaPunteada
          variante="vacio"
          icono={<Megaphone />}
          titulo="Las voces llegan con los llamados"
          texto={textosVoces.vacio}
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
            <p>{textosVoces.encabezado}</p>
            <strong>
              {voces.abiertas.length} de {voices.length} voces
            </strong>
          </div>
          {sinResultados ? (
            <SinResultados texto="Ninguna voz coincide con tu búsqueda" onLimpiar={clear} />
          ) : (
            <div className="sx-b-grid sx-b-grid-testimonial">
              {vocesVisibles.map((resource) => {
                const origen = origenVoz(resource)
                if (!isUnlocked(resource))
                  return (
                    <VozPorDescubrir
                      key={resource.id}
                      titulo={resource.title}
                      pista={resource.summary}
                      caso={origen.titulo}
                      hrefCaso={origen.href}
                      deActividad={origen.deActividad}
                      onRequisito={() => consultarRequisito(resource)}
                    />
                  )
                const [nombre, ...rol] = resource.author?.split(' · ') ?? []
                return (
                  <TarjetaTestimonio
                    key={resource.id}
                    nombre={nombre}
                    rol={rol.join(' · ')}
                    contexto={resource.contexto}
                    titulo={resource.title}
                    cita={resource.summary}
                    regalo={origen.titulo ?? 'de la ciudad'}
                    deActividad={origen.deActividad}
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
                  texto={textosVoces.cierre}
                />
              )}
            </div>
          )}
        </>
      )}
    </Parchment>
  )
}
