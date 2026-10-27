import { Link } from 'react-router'
import { FavoriteButton } from '@/components/student/FavoriteButton'
import { Parchment } from '@/components/student/Parchment'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { nombresTipoCarrera } from '@/lib/servidor/adaptadoresCatalogo'
import { useOpcionesCatalogo } from '@/store/servidor/catalogo'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { useDetalleServidor } from '../hooks/useDetalleServidor'
import { useColeccionIconos } from '../hooks/useIconosObtenidos'
import { preparacionJobZone } from '../data/catalogoTextos'
import { AtlasNavigation } from './AtlasNavigation'
import { AvisoFavorito } from './AvisoFavorito'
import { CatalogRevisitNotice } from './CatalogRevisitNotice'
import { DiscoveryStage } from './DiscoveryStage'
import { EntrevistasOcupacion } from './EntrevistasOcupacion'
import { EsperaDetalle } from './EsperaDetalle'
import { FuentesCatalogo } from './FuentesCatalogo'
import { IconoProfesion } from './IconoProfesion'
import { PerfilIntereses } from './PerfilIntereses'
import { SellosRiasec } from './SellosRiasec'
import { UnexpectedPlace } from './UnexpectedPlace'
import '../styles/catalogo.css'

const TAREAS_VISIBLES = 5

function Etiquetas({ titulo, items }: { titulo: string; items: string[] }) {
  if (!items.length) return null
  return (
    <Parchment title={titulo}>
      <div className="sx-d-tags">
        {items.map((s) => (
          <span className="sx-d-tag" key={s}>
            {s}
          </span>
        ))}
      </div>
    </Parchment>
  )
}

// F06 · ajuste catalogo-datos-reales (F6b): el detalle de profesión en api. Cabecera con el ícono (revelado o
// por revelar), grupo, preparación y otros nombres; qué hacen, perfil de intereses, a quién atrae,
// conocimientos y aptitudes; al lado, las carreras, las entrevistas del salón y el lugar inesperado.
export function DetalleOcupacionServidor({ codigo }: { codigo: string }) {
  const { datos: ocupacion, favorito, ...estado } = useDetalleServidor('ocupaciones', codigo)
  const iconos = useColeccionIconos()
  const opciones = useOpcionesCatalogo(true)
  const servidor = useEstadoServidor()
  if (!ocupacion) return <EsperaDetalle {...estado} onReintentar={estado.reintentar} />
  const revelado = iconos.obtenido(ocupacion.codigo)
  const caso = iconos.coleccion?.find((c) => c.ocupacion === ocupacion.codigo)?.caso
  const tituloCaso = (servidor.actividades.datos ?? [])
    .flatMap((b) => b.actividades)
    .find((a) => a.codigo === caso)?.titulo
  const grupo = opciones?.grupos.find((g) => g.codigo === ocupacion.grupo)?.nombre
  const resultado = servidor.resultadoRiasec?.codigo_interes?.codigo
  return (
    <DiscoveryStage ambient="atlas" navegacion={false}>
      <AtlasNavigation section="professions" migas={false} />
      <CatalogRevisitNotice />
      <Parchment className="sx-d-dark sx-c-cabecera">
        <div className="sx-c-cabecera-fila">
          <IconoProfesion grupo={ocupacion.grupo} revelado={revelado} grande />
          <div className="sx-c-cabecera-texto">
            <div className="sx-c-etiquetas">
              {grupo && <span className="sx-c-etiqueta sx-c-etiqueta-oscura">Grupo: {grupo}</span>}
              {ocupacion.job_zone && (
                <span className="sx-c-etiqueta sx-c-etiqueta-oscura">
                  Preparación: {preparacionJobZone[ocupacion.job_zone]} ({ocupacion.job_zone} de 5)
                </span>
              )}
              {revelado && (
                <span className="sx-c-etiqueta sx-c-etiqueta-dorada">
                  {tituloCaso ? `Ícono revelado en el caso «${tituloCaso}»` : 'Ícono revelado en la Central de Casos'}
                </span>
              )}
            </div>
            <h1 className="sx-d-detail-title" tabIndex={-1}>
              {ocupacion.titulo}
            </h1>
            {ocupacion.tambien_llamado.length > 0 && (
              <p>
                También se le llama <strong>{ocupacion.tambien_llamado.slice(0, 4).join(', ')}</strong>
              </p>
            )}
            <SellosRiasec letras={ocupacion.riasec} conNombres />
          </div>
          <div className="sx-c-cabecera-acciones">
            <FavoriteButton
              selected={ocupacion.es_favorita}
              pendiente={favorito.pendiente('ocupaciones', ocupacion.codigo)}
              onToggle={() => favorito.alternar('ocupaciones', ocupacion.codigo, !ocupacion.es_favorita)}
            />
          </div>
        </div>
      </Parchment>
      <div className="sx-d-detail-grid">
        <main className="sx-d-stack">
          {(ocupacion.descripcion || ocupacion.tareas.length > 0) && (
            <Parchment title="Qué hacen">
              {ocupacion.descripcion && <p>{ocupacion.descripcion}</p>}
              {ocupacion.tareas.length > 0 && (
                <ul className="sx-c-vinetas">
                  {ocupacion.tareas.slice(0, TAREAS_VISIBLES).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </Parchment>
          )}
          {Object.keys(ocupacion.puntajes).length > 0 && (
            <PerfilIntereses
              puntajes={ocupacion.puntajes}
              codigo={ocupacion.riasec}
              resultado={resultado ? [...resultado] : null}
            />
          )}
          {(ocupacion.personalidad || ocupacion.estilos_trabajo.length > 0) && (
            <Parchment title="A qué tipo de persona le suele atraer">
              {ocupacion.personalidad && <p>{ocupacion.personalidad}</p>}
              {ocupacion.estilos_trabajo.length > 0 && (
                <>
                  <p className="sx-c-conteo">Les va bien a quienes son…</p>
                  <div className="sx-d-tags">
                    {ocupacion.estilos_trabajo.map((e) => (
                      <span className="sx-d-tag" key={e.codigo}>
                        {e.nombre}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </Parchment>
          )}
          <div className="sx-d-two">
            <Etiquetas titulo="Conocimientos que usan" items={ocupacion.conocimientos} />
            {ocupacion.aptitudes.length > 0 && (
              <Parchment title="Aptitudes que necesitan">
                <ul className="sx-c-vinetas">
                  {ocupacion.aptitudes.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </Parchment>
            )}
          </div>
        </main>
        <aside className="sx-d-stack">
          {ocupacion.carreras.length > 0 && (
            <Parchment title="Carreras que llevan aquí" className="sx-c-panel">
              <p className="sx-c-conteo">
                {ocupacion.carreras.length} {ocupacion.carreras.length === 1 ? 'carrera' : 'carreras'}
              </p>
              {ocupacion.carreras.map((c) => (
                <Link key={c.codigo} className="sx-d-related sx-c-fila-enlace" to={discoveryPaths.career(c.codigo)}>
                  <span>
                    <strong>{c.nombre}</strong>
                    {c.duracion && <small>{c.duracion}</small>}
                  </span>
                  <span className="sx-c-etiqueta" data-tipo={c.tipo}>
                    {nombresTipoCarrera[c.tipo]}
                  </span>
                </Link>
              ))}
            </Parchment>
          )}
          <EntrevistasOcupacion codigo={ocupacion.codigo} />
          <UnexpectedPlace kind="occupation" currentId={ocupacion.codigo} />
        </aside>
      </div>
      <FuentesCatalogo de="profesion" />
      <AvisoFavorito aviso={favorito.aviso} onDismiss={favorito.cerrarAviso} />
    </DiscoveryStage>
  )
}
