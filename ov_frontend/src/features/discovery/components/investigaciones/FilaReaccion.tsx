import {
  etiquetaComentario,
  fechaRelativa,
  iniciales,
  lineaNivel,
} from '@/lib/servidor/adaptadoresInvestigaciones'
import type { ReaccionPublica, TipoReaccionPublico } from '@/types/servidor'
import { MenuOpciones } from './MenuOpciones'

// F09 (bocetos 05 y 06): una reacción (o un comentario de la orientadora, sin tipo). La propia, con «Editar» y
// «⋯» → Eliminar; una ajena, «⋯» → Reportar comentario (y «Reportado» para quien ya la reportó).
export function FilaReaccion({
  reaccion,
  tipos,
  ahora,
  soloLectura,
  onEditar,
  onEliminar,
  onReportar,
}: {
  reaccion: ReaccionPublica
  tipos: TipoReaccionPublico[]
  ahora: Date
  soloLectura: boolean
  onEditar: () => void
  onEliminar: () => void
  onReportar: () => void
}) {
  const tipo = tipos.find((t) => t.codigo === reaccion.tipo)
  const orientadora = reaccion.tipo === null
  const propia = reaccion.propia && !orientadora && !soloLectura
  const opciones = propia
    ? [{ texto: 'Eliminar', peligro: true, onElegir: onEliminar }]
    : orientadora || reaccion.reportada_por_mi || reaccion.propia
      ? []
      : [{ texto: 'Reportar comentario', onElegir: onReportar }]
  return (
    <li className="sx-i-reaccion" data-propia={propia || undefined}>
      <span className="sx-i-avatar" data-tamano="grande" aria-hidden="true">
        {reaccion.propia ? 'Tú' : iniciales(reaccion.autor.nombre)}
      </span>
      <div>
        <p className="sx-i-reaccion-cabecera">
          <strong>{reaccion.propia ? 'Tú' : reaccion.autor.nombre}</strong>
          {!orientadora && <span className="sx-i-meta">{lineaNivel(reaccion.autor.nivel)}</span>}
          {orientadora ? (
            <span className="sx-i-insignia" data-tono="azul">
              Orientadora
            </span>
          ) : (
            tipo && <span className="sx-i-insignia">{tipo.nombre}</span>
          )}
          <span className="sx-i-meta">{fechaRelativa(reaccion.editada_en ?? reaccion.creada_en, ahora)}</span>
          {reaccion.reportada_por_mi && (
            <span className="sx-i-insignia" data-tono="rojo">
              Reportado
            </span>
          )}
        </p>
        {reaccion.comentario && (
          <p>
            {tipo && <span className="sx-i-meta">{etiquetaComentario(tipo)}: </span>}
            {reaccion.comentario}
          </p>
        )}
      </div>
      <span className="sx-i-acciones">
        {propia && (
          <button type="button" className="sx-i-boton" data-tono="claro" onClick={onEditar}>
            Editar
          </button>
        )}
        <MenuOpciones etiqueta="Más opciones del comentario" opciones={opciones} />
      </span>
    </li>
  )
}
