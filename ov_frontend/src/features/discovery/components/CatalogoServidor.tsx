import { Skeleton } from '@/components/ui/Skeleton'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { useCatalogoServidor, type SeccionCatalogo } from '../hooks/useCatalogoServidor'
import { AvisoFavorito } from './AvisoFavorito'
import { FiltrosCatalogo } from './FiltrosCatalogo'
import { TarjetaCatalogo } from './TarjetaCatalogo'

function Esqueletos() {
  return (
    <>
      {[0, 1, 2].map((n) => (
        <article className="sx-d-parchment sx-d-atlas-card" key={`esqueleto-${n}`} aria-hidden="true">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </article>
      ))}
    </>
  )
}

// F06: la pestaña del catálogo en api. La lista se pide al mostrarse, de a 20, y crece con «Mostrar más».
export function CatalogoServidor({
  section,
  query,
  obtenido,
}: {
  section: SeccionCatalogo
  query: string
  obtenido: (codigo: string) => boolean
}) {
  const catalogo = useCatalogoServidor(section, query)
  const { lista } = catalogo
  return (
    <>
      <FiltrosCatalogo
        clase={catalogo.clase}
        filtros={catalogo.filtros}
        opciones={catalogo.opciones}
        onCambiar={catalogo.cambiar}
        onLetra={catalogo.alternarLetra}
        onFavoritos={catalogo.alternarFavoritos}
      />
      <div className="sx-d-columns" aria-busy={catalogo.cargando || lista?.estado === 'mas'}>
        {lista?.items.map((item) => (
          <TarjetaCatalogo
            key={item.codigo}
            item={item}
            obtenido={obtenido(item.codigo)}
            pendiente={catalogo.favorito.pendiente(item.codigo)}
            onFavorito={() => catalogo.favorito.alternar(item.codigo, !item.es_favorita)}
          />
        ))}
        {(catalogo.cargando || lista?.estado === 'mas') && <Esqueletos />}
        {lista?.estado === 'error' && (
          <section role="alert">
            <p>{mensajeErrorServidor(lista.error)}</p>
            <button type="button" className="sx-d-action" onClick={catalogo.reintentar}>
              Reintentar
            </button>
          </section>
        )}
        {catalogo.sinResultados && (
          <section className="sx-d-parchment">
            <h2>No encontramos resultados</h2>
            <p>No hay resultados que coincidan con tu búsqueda. Prueba con otro nombre.</p>
          </section>
        )}
      </div>
      {catalogo.hayMas && lista?.estado === 'listo' && (
        <button type="button" className="sx-d-action sx-d-action-ghost" onClick={catalogo.mostrarMas}>
          Mostrar más
        </button>
      )}
      <AvisoFavorito aviso={catalogo.favorito.aviso} onDismiss={catalogo.favorito.cerrarAviso} />
    </>
  )
}
