import { Link } from 'react-router'
import { Backpack, Map, Navigation } from 'lucide-react'
import { Parchment } from '@/components/student/Parchment'
import { appPaths } from '@/routes/paths'
import { useBackpack } from '@/features/backpack/hooks/useBackpack'
import { SinResultados } from './SinResultados'
import { TarjetaFicha } from './TarjetaFicha'
import { TarjetaPunteada } from './TarjetaPunteada'

// Ajuste mochila: solo las fichas obtenidas, por tramo, con el cierre «Más adelante» (cuántas faltan, sin
// nombrar la misión) y el estado vacío.
export function CompartimentoFichas({ model }: { model: ReturnType<typeof useBackpack> }) {
  const { adventure, gruposFichas, fichasObtenidas, fichasPendientes, sheets, vacio, sinResultados } = model
  const { esNueva, openResource, toggleFavorite, clear } = model
  return (
    <Parchment className="sx-b-compartment" label="Compartimento de fichas" title="Lo que aprendiste en el camino">
      {vacio ? (
        <TarjetaPunteada
          variante="vacio"
          icono={<Backpack />}
          titulo="Tu mochila está lista, pero todavía vacía"
          texto={`Las fichas no se buscan: se encuentran. Cada misión informativa del mapa deja una al terminarla, con lo que aprendiste en ella. Hay ${sheets.length} esperando en el camino; la primera aparecerá aquí cuando la encuentres.`}
          accion={
            <Link className="sx-d-action sx-b-primario" to={appPaths.student.exploration}>
              <Map aria-hidden="true" size={18} />
              Ir al mapa
            </Link>
          }
        />
      ) : (
        <>
          <div className="sx-b-compartment-heading">
            <p>También puedes abrirlas desde la misión donde las obtuviste.</p>
            <strong>{fichasObtenidas.length} fichas</strong>
          </div>
          {sinResultados ? (
            <SinResultados texto="Ninguna ficha coincide con tu búsqueda" onLimpiar={clear} />
          ) : (
            gruposFichas.map((grupo) => (
              <section key={grupo.clave} className="sx-b-grupo" aria-label={grupo.rotulo ?? undefined}>
                {grupo.rotulo && <h3 className="sx-b-separador">{grupo.rotulo}</h3>}
                <div className="sx-b-grid sx-b-grid-sheet">
                  {grupo.fichas.map((resource) => (
                    <TarjetaFicha
                      key={resource.id}
                      resource={resource}
                      favorita={adventure.bookmarks.includes(resource.id)}
                      nueva={esNueva(resource)}
                      onOpen={() => openResource(resource)}
                      onFavorite={() => toggleFavorite(resource.id)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
          {fichasPendientes > 0 && (
            <section className="sx-b-grupo" aria-label="Más adelante">
              <h3 className="sx-b-separador sx-b-separador-gris">Más adelante</h3>
              <div className="sx-b-grid sx-b-grid-sheet">
                <TarjetaPunteada
                  icono={<Navigation />}
                  titulo="Más fichas te esperan en el camino"
                  texto={`${fichasPendientes} ${fichasPendientes === 1 ? 'ficha más te espera' : 'fichas más te esperan'} en el camino. Las misiones informativas dejan una al terminarlas.`}
                />
              </div>
            </section>
          )}
        </>
      )}
    </Parchment>
  )
}
