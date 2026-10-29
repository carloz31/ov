import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { fechaRelativa, iniciales, lineaReportes } from '@/lib/servidor/adaptadoresInvestigaciones'
import type { ModeloPublicacion } from '../../hooks/usePublicacionDetalle'

// F09 (boceto 12b): reacciones y comentarios, los reportados primero, con «Descartar reporte» y «Eliminar
// comentario»; su propio comentario se edita; y el cuadro para comentar a los autores.
export function ReaccionesModeradas({
  m,
  nombreSalon,
  nombresTipos,
}: {
  m: ModeloPublicacion
  nombreSalon: (codigo: string | null) => string
  nombresTipos: Record<string, string>
}) {
  const datos = m.datos!
  const ahora = new Date()
  return (
    <Card className="overflow-hidden rounded-xl p-0">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="font-semibold">Reacciones y comentarios · {datos.reacciones.length}</h2>
        <span className="text-sm text-muted-foreground">Los reportados van primero</span>
      </div>
      {datos.reacciones.length === 0 && (
        <p className="border-t px-4 py-4 text-sm text-muted-foreground">
          Todavía no hay reacciones ni comentarios.
        </p>
      )}
      <ul aria-busy={!!m.ocupado || undefined}>
        {datos.reacciones.map((r) => {
          const reportada = r.reportes.length > 0
          const orientadora = r.tipo === null
          return (
            <li
              key={r.codigo}
              className={`flex gap-3 border-t px-4 py-4 ${reportada ? 'bg-danger-soft/40' : r.propia ? 'bg-primary/5' : ''}`}
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-sm font-semibold text-primary"
                aria-hidden="true"
              >
                {r.propia ? 'Tú' : iniciales(r.autor.nombre)}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="flex flex-wrap items-center gap-2">
                  <strong>{r.propia ? 'Tú' : r.autor.nombre}</strong>
                  {orientadora ? (
                    <Badge>Orientadora</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">{nombreSalon(r.autor.salon)}</span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    · {fechaRelativa(r.editada_en ?? r.creada_en, ahora)}
                  </span>
                  {r.tipo && <Badge variant="outline">{nombresTipos[r.tipo] ?? r.tipo}</Badge>}
                  {reportada && (
                    <Badge variant="attention">{lineaReportes(r.reportes.map((x) => x.motivo))}</Badge>
                  )}
                </p>
                {r.comentario && <p className="whitespace-pre-line break-words">{r.comentario}</p>}
                {reportada && m.puedeActuar && (
                  <div className="flex flex-wrap gap-2">
                    {r.reportes.map((reporte) => (
                      <Button
                        key={reporte.codigo}
                        variant="outline"
                        className="min-h-11"
                        disabled={m.ocupado === `descartar-${reporte.codigo}`}
                        onClick={() => m.descartar(reporte.codigo)}
                      >
                        {m.ocupado === `descartar-${reporte.codigo}` && (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        )}
                        Descartar reporte
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      className="min-h-11"
                      data-tono="peligro"
                      disabled={!!m.ocupado}
                      onClick={() => m.pedirEliminarComentario(r)}
                    >
                      Eliminar comentario
                    </Button>
                  </div>
                )}
              </div>
              {!reportada && m.puedeActuar && (
                <div className="flex shrink-0 flex-wrap items-start gap-2">
                  {r.propia && (
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={!!m.ocupado}
                      onClick={() => m.editar(r)}
                    >
                      Editar
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="min-h-11"
                    data-tono="peligro"
                    disabled={!!m.ocupado}
                    onClick={() => m.pedirEliminarComentario(r)}
                  >
                    Eliminar
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {m.puedeActuar && (
        <form
          className="space-y-3 border-t px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault()
            void m.comentar()
          }}
        >
          <label className="block space-y-2">
            <span className="font-semibold">
              {m.editando ? 'Editar tu comentario' : 'Dejar un comentario a los autores'}
            </span>
            <Textarea
              value={m.comentario}
              disabled={m.ocupado === 'comentar'}
              placeholder="Lo verán los autores y el salón, con la etiqueta «Orientadora»."
              onChange={(e) => m.setComentario(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            {m.editando && (
              <Button type="button" variant="outline" className="min-h-11" onClick={() => m.editar(null)}>
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              className="min-h-11"
              disabled={!m.comentario.trim() || m.ocupado === 'comentar'}
            >
              {m.ocupado === 'comentar' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {m.editando ? 'Guardar comentario' : 'Publicar comentario'}
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}
