import { Heart, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { useCatalogoServidor, type SeccionCatalogo } from '../hooks/useCatalogoServidor'
import { AvisoFavorito } from './AvisoFavorito'
import { BotonLimpiar } from './BotonLimpiar'
import { FilaResultado } from './FilaResultado'
import { FiltrosCatalogo } from './FiltrosCatalogo'
import { PieListado } from './PieListado'
import { TarjetaCatalogo } from './TarjetaCatalogo'
import { UnexpectedPlace } from './UnexpectedPlace'
import '../styles/catalogo.css'

const textos: Record<
  SeccionCatalogo,
  { titulo: string; buscar: string; descripcion: (total: string) => string }
> = {
  careers: {
    titulo: 'Catálogo de carreras',
    buscar: 'Buscar una carrera por nombre…',
    descripcion: (total) =>
      `${total}carreras universitarias, técnicas y de las Fuerzas Armadas y Policía, con lo que estudian, dónde se dictan y cuánto ganan sus egresados.`,
  },
  professions: {
    titulo: 'Catálogo de profesiones',
    buscar: 'Buscar una profesión por nombre…',
    descripcion: () =>
      'Conoce qué hacen distintos profesionales, qué habilidades usan y a qué tipo de persona le atrae cada trabajo.',
  },
  institutions: {
    titulo: 'Instituciones educativas',
    buscar: 'Buscar una institución por nombre…',
    descripcion: (total) =>
      `${total}universidades, institutos y escuelas de las FF. AA. y la Policía de todo el país, con las carreras que ofrecen y cuánto ganan sus egresados.`,
  },
}
const nombreItems: Record<SeccionCatalogo, [string, string]> = {
  careers: ['carrera', 'carreras'],
  professions: ['profesión', 'profesiones'],
  institutions: ['institución', 'instituciones'],
}

function Esqueletos() {
  return (
    <>
      {[0, 1, 2].map((n) => (
        <article className="sx-d-parchment sx-c-tarjeta" key={`esqueleto-${n}`} aria-hidden="true">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </article>
      ))}
    </>
  )
}

// F06 · ajuste catalogo-datos-reales (F6a): la pestaña del catálogo en api. Cabecera con el total del dominio,
// buscador y «Mis favoritos», filtros, contador, grilla de 3, pie con «Mostrar 20 más» y, en carreras y
// profesiones, el lugar inesperado. La lista se pide al mostrarse, de a 20.
export function CatalogoServidor({
  section,
  obtenido,
  iconosRevelados,
}: {
  section: SeccionCatalogo
  obtenido: (codigo: string) => boolean
  iconosRevelados: number | null
}) {
  const catalogo = useCatalogoServidor(section)
  const { lista, totalDominio } = catalogo
  const copia = textos[section]
  const total = totalDominio === null ? '' : `${totalDominio.toLocaleString('es-PE')} `
  return (
    <>
      <header className="sx-d-header" id="inicio-catalogo">
        <div>
          <p className="sx-d-eyebrow">Atlas del mundo exterior</p>
          <h1>{copia.titulo}</h1>
          <p>{copia.descripcion(total)}</p>
        </div>
        {section === 'professions' && iconosRevelados !== null && totalDominio !== null && (
          <div className="sx-d-exploration-summary">
            <span className="sx-d-eyebrow">Tu exploración</span>
            <strong>
              {iconosRevelados} de {totalDominio} íconos revelados
            </strong>
          </div>
        )}
      </header>
      <div className="sx-c-buscador">
        <label className="sx-d-search-row sx-c-busqueda">
          <Search aria-hidden="true" />
          <span className="sr-only">{copia.buscar}</span>
          <input
            className="sx-d-input"
            placeholder={copia.buscar}
            value={catalogo.texto}
            onChange={(e) => catalogo.buscar(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="sx-c-chip sx-c-favoritos"
          aria-pressed={!!catalogo.filtros.favoritos}
          onClick={catalogo.alternarFavoritos}
        >
          <Heart aria-hidden="true" size={18} /> Mis favoritos
        </button>
      </div>
      <FiltrosCatalogo
        clase={catalogo.clase}
        filtros={catalogo.filtros}
        letras={catalogo.letras}
        afinesDisponibles={catalogo.afinesDisponibles}
        opciones={catalogo.opciones}
        onCambiar={catalogo.cambiar}
        onLetra={catalogo.alternarLetra}
        onAfines={catalogo.alternarAfines}
      />
      <FilaResultado
        buscando={catalogo.buscando}
        total={lista?.total ?? null}
        nombres={nombreItems[section]}
        activos={catalogo.activos}
        onLimpiar={catalogo.limpiar}
      />
      <div className="sx-d-columns" aria-busy={catalogo.buscando || catalogo.cargandoMas}>
        {!catalogo.buscando &&
          lista?.items.map((item) => (
            <TarjetaCatalogo
              key={item.codigo}
              item={item}
              obtenido={obtenido(item.codigo)}
              pendiente={catalogo.favorito.pendiente(item.codigo)}
              onFavorito={() => catalogo.favorito.alternar(item.codigo, !item.es_favorita)}
            />
          ))}
        {(catalogo.buscando || catalogo.cargandoMas) && <Esqueletos />}
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
            <p>
              No hay resultados que coincidan con tu búsqueda. Prueba con otro nombre o quita algún filtro.
            </p>
            {catalogo.activos > 0 && <BotonLimpiar onLimpiar={catalogo.limpiar} />}
          </section>
        )}
      </div>
      {lista && lista.items.length > 0 && !catalogo.buscando && (
        <PieListado
          mostrados={lista.items.length}
          total={lista.total}
          cargando={catalogo.cargandoMas}
          hayMas={catalogo.hayMas}
          onMas={catalogo.mostrarMas}
        />
      )}
      {section !== 'institutions' && (
        <UnexpectedPlace kind={section === 'careers' ? 'career' : 'occupation'} currentId="" />
      )}
      <AvisoFavorito aviso={catalogo.favorito.aviso} onDismiss={catalogo.favorito.cerrarAviso} />
    </>
  )
}
