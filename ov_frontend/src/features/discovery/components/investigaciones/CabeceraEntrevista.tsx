import { Crown, Loader2, Star } from 'lucide-react'
import { Link } from 'react-router'
import { fechaCorta, ordenarAutores } from '@/lib/servidor/adaptadoresInvestigaciones'
import { appPaths } from '@/routes/paths'
import { discoveryPaths } from '@/routes/discoveryPaths'
import type { ModeloDetalle } from '../../hooks/useEntrevistaDetalle'
import { AutorEntrevista } from './AutorEntrevista'
import { MenuOpciones } from './MenuOpciones'
import { VideoEntrevista } from './VideoEntrevista'

// F09 (bocetos 05 y 06): video y ficha. De un compañero: estrella y «⋯» → Reportar; propia: «Tu entrevista»,
// «Editar ficha» y «⋯» → Retirar.
export function CabeceraEntrevista({ m }: { m: ModeloDetalle }) {
  const e = m.datos!
  return (
    <section className="sx-i-panel sx-i-cabecera-detalle">
      <VideoEntrevista enlace={e.enlace} titulo={e.titulo} />
      <div className="sx-i-ficha">
        <div className="sx-i-ficha-acciones">
          <span>
            {e.propia ? (
              <span className="sx-i-insignia" data-tono="oscuro">
                Tu entrevista
              </span>
            ) : e.leyenda ? (
              <span className="sx-i-insignia" data-tono="oscuro">
                <Crown aria-hidden="true" size={14} /> Leyenda
              </span>
            ) : (
              e.destacada && <span className="sx-i-insignia">Destacada por tu orientadora</span>
            )}
            {e.reportada_por_mi && (
              <span className="sx-i-insignia" data-tono="rojo">
                Reportado
              </span>
            )}
          </span>
          <span className="sx-i-acciones">
            {e.propia ? (
              <Link className="sx-i-boton" data-tono="claro" to={appPaths.student.investigationPublish(e.codigo)}>
                Editar ficha
              </Link>
            ) : (
              <button
                type="button"
                className="sx-i-estrella"
                aria-pressed={e.favorita}
                aria-label={e.favorita ? 'Quitar de favoritas' : 'Guardar en favoritas'}
                aria-busy={m.ocupado === 'favorito' || undefined}
                onClick={m.alternarFavorito}
              >
                {m.ocupado === 'favorito' ? <Loader2 className="animate-spin" size={18} /> : <Star size={18} />}
              </button>
            )}
            <MenuOpciones
              etiqueta="Más opciones de la entrevista"
              opciones={
                e.propia
                  ? [{ texto: 'Retirar entrevista', peligro: true, onElegir: () => m.setRetirando(true) }]
                  : e.reportada_por_mi
                    ? []
                    : [{ texto: '¿Algo no está bien? Reportar', onElegir: () => m.abrirReporte({ tipo: 'entrevista' }) }]
              }
            />
          </span>
        </div>
        <p className="sx-i-kicker">
          Entrevista ·{' '}
          <Link className="sx-i-enlace-ocupacion" to={discoveryPaths.occupation(e.ocupacion.codigo)}>
            {e.ocupacion.titulo}
          </Link>{' '}
          · Publicada el {fechaCorta(e.fecha_hora)}
        </p>
        <h1>{e.titulo}</h1>
        <p className="sx-i-meta">
          Entrevista a <strong>{e.profesional}</strong> · {e.duracion}
        </p>
        <p className="sx-i-resumen">{e.resumen}</p>
        <div className="sx-i-autores">
          <span>Por</span>
          {ordenarAutores(e.autores, m.cuenta).map((a) => (
            <AutorEntrevista
              key={a.codigo}
              autor={a}
              propio={a.codigo === m.cuenta}
              conTitulo={false}
              nota={e.propia && a.codigo !== m.cuenta ? 'coautoría' : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
