import { lineaEco, textosEtiqueta } from '@/lib/servidor/adaptadoresPanelEstudiante'
import type { ItemLectura } from '@/types/servidor'
import { ChipPerfil } from './ChipPerfil'

function Ecos({ item }: { item: ItemLectura }) {
  const lineas = item.ecos.map(lineaEco).filter((l) => l !== null)
  const hoy = item.ecos_hoy?.map(lineaEco).filter((l) => l !== null) ?? []
  if (!lineas.length) return null
  return (
    <div className="space-y-1 border-l-2 border-border pl-3 text-sm">
      {lineas.map((l, i) => (
        <div key={i}>
          <p>
            <strong>Tenía a la vista:</strong> {l.texto}
            {hoy.length > 0 && i === lineas.length - 1 && (
              <span className="text-muted-foreground">
                {' '}
                (cuando respondió; hoy: {hoy.map((h) => h.texto).join(' — ')})
              </span>
            )}
            {item.ecos_de_hoy && <span className="text-muted-foreground"> (lo que tiene hoy)</span>}
          </p>
          {l.cita && <p className="italic text-muted-foreground">«{l.cita}»</p>}
          {l.chips.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {l.chips.map((c) => (
                <ChipPerfil key={c} tono="primario">
                  {c}
                </ChipPerfil>
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function Eleccion({ item }: { item: ItemLectura }) {
  if (!item.elegidas.length) return null
  if (item.eleccion === 'ORDENADA')
    return (
      <ol className="space-y-0.5">
        {item.elegidas.map((e, i) => (
          <li key={i}>
            <strong>{i + 1}.</strong> {e.texto}
            {e.otra && <span className="text-muted-foreground"> · lo escribió el estudiante</span>}
          </li>
        ))}
      </ol>
    )
  return (
    <ul className="flex flex-wrap items-center gap-2">
      {item.elegidas.map((e, i) => (
        <li key={i} className="flex flex-wrap items-center gap-2">
          <ChipPerfil tono="primario">{e.otra ? `«${e.texto}»` : e.texto}</ChipPerfil>
          {e.otra ? (
            <span className="text-sm text-muted-foreground">lo escribió el estudiante</span>
          ) : (
            e.origen && (
              <span className="text-sm text-muted-foreground">{e.origen.toLocaleLowerCase('es')}</span>
            )
          )}
        </li>
      ))}
    </ul>
  )
}

// Ajuste panel-estudiantes §9: un ítem de registro en lectura, siempre en el mismo orden (encabezado, contexto,
// «Tenía a la vista», la elección y la respuesta). Es propio del portal: no reutiliza el reproductor del estudiante.
export function ItemRegistroLectura({ item }: { item: ItemLectura }) {
  return (
    <article className="space-y-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h4 className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Pregunta {item.numero} · {item.nombre}
        {item.etiquetas.map((e) => (
          <ChipPerfil key={e} tono={e === 'AUN_NO_LO_SABE' ? 'neutro' : 'aviso'}>
            {textosEtiqueta[e]}
          </ChipPerfil>
        ))}
      </h4>
      {item.dialogo && <p className="text-sm italic text-muted-foreground">{item.dialogo}</p>}
      <Ecos item={item} />
      {item.pregunta_eleccion && <p className="font-bold">{item.pregunta_eleccion}</p>}
      <Eleccion item={item} />
      <p className="font-bold">{item.pregunta_texto}</p>
      {item.respondido ? (
        <div className="rounded-lg bg-muted p-3">
          <p>{item.primera_respuesta}</p>
          {item.segunda_respuesta && (
            <div className="mt-2 border-t border-dashed border-border pt-2">
              {item.repregunta && (
                <p className="text-sm text-muted-foreground">
                  Lumi le preguntó: <span className="text-foreground">{item.repregunta}</span>
                </p>
              )}
              <p>{item.segunda_respuesta}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground">No lo respondió.</p>
      )}
    </article>
  )
}
