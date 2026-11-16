import { MARCAS_ITEM } from '@/features/counselor/lib/perfilEstudiante'
import { lineaEcoPanel, type PiezaEco } from '@/lib/servidor/adaptadoresPanelEstudiante'
import { cn } from '@/lib/utils'
import type { ItemLectura } from '@/types/servidor'
import { MarcaRespuesta } from './MarcaRespuesta'

function Piezas({ piezas }: { piezas: PiezaEco[] }) {
  return piezas.map((p, i) =>
    p.estilo === 'fuerte' ? (
      <strong key={i} className="font-semibold">
        {p.texto}
      </strong>
    ) : p.estilo === 'cursiva' ? (
      <em key={i}>{p.texto}</em>
    ) : (
      <span key={i}>{p.texto}</span>
    ),
  )
}

// §3.4: una línea gris por eco, encima de la pregunta; lo que cambió hoy, al final y en un gris más oscuro.
function Ecos({ item }: { item: ItemLectura }) {
  const lineas = item.ecos.map(lineaEcoPanel).filter((l) => l !== null)
  return lineas.map((l, i) => (
    <p key={i} className="text-sm text-muted-foreground">
      <Piezas piezas={l.piezas} />
      {l.hoy.length > 0 && (
        <span className="text-foreground/80">
          <Piezas piezas={l.hoy} />
        </span>
      )}
    </p>
  ))
}

function Eleccion({ item }: { item: ItemLectura }) {
  if (!item.elegidas.length) return null
  if (item.eleccion === 'ORDENADA')
    return (
      <ol className="list-decimal space-y-0.5 pl-5 text-foreground">
        {item.elegidas.map((e, i) => (
          <li key={i}>
            {e.texto}
            {e.otra && <span className="text-muted-foreground"> (lo escribió el estudiante)</span>}
          </li>
        ))}
      </ol>
    )
  if (item.eleccion === 'PIEZAS')
    return (
      <ul className="space-y-0.5">
        {item.elegidas.map((e, i) => (
          <li key={i}>
            <strong className="font-semibold">{e.texto}</strong>
            {e.otra ? (
              <span className="text-muted-foreground"> (lo escribió el estudiante)</span>
            ) : (
              e.origen && <span className="text-muted-foreground"> {e.origen.toLocaleLowerCase('es')}</span>
            )}
          </li>
        ))}
      </ul>
    )
  return (
    <p>
      {item.elegidas.map((e, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          <strong className="font-semibold">{e.texto}</strong>
          {e.otra && <span className="text-muted-foreground"> (lo escribió el estudiante)</span>}
        </span>
      ))}
    </p>
  )
}

function Respuesta({ item }: { item: ItemLectura }) {
  if (!item.respondido) return <p className="italic text-muted-foreground">No lo respondió</p>
  if (item.aun_no_lo_sabe && !item.primera_respuesta)
    return <p className="italic text-muted-foreground">Aún no lo sabe</p>
  return (
    <>
      {item.primera_respuesta && <p>{item.primera_respuesta}</p>}
      {item.aun_no_lo_sabe && <p className="text-sm text-muted-foreground">Marcó que aún no lo sabe</p>}
      {item.segunda_respuesta && (
        <>
          {item.repregunta && (
            <p className="pt-1 text-sm text-muted-foreground">Lumi le preguntó: {item.repregunta}</p>
          )}
          <p>{item.segunda_respuesta}</p>
        </>
      )}
    </>
  )
}

// Ajuste respuestas-orientadora §3.2 y §3.3 (boceto 18): una pregunta en lectura, con el número en una columna
// estrecha y, si tiene marca, en un recuadro (crema con borde ámbar o blanco con borde ámbar punteado). Es propio del
// portal: no reutiliza el reproductor del estudiante.
export function ItemRegistroLectura({ item }: { item: ItemLectura }) {
  const marca = item.marca ? MARCAS_ITEM[item.marca] : null
  return (
    <article
      id={`pregunta-${item.codigo}`}
      className={cn(
        'flex scroll-mt-24 gap-4 rounded-lg px-3 py-3',
        marca?.intensidad === 'fuerte' && 'border border-warning-border bg-warning-soft',
        marca?.intensidad === 'suave' && 'border border-dashed border-warning-border bg-card',
      )}
    >
      <span className="w-4 shrink-0 text-sm font-semibold text-muted-foreground tabular-nums">{item.numero}</span>
      <div className="min-w-0 flex-1 space-y-1.5">
        {marca && (
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-warning-text">
            <MarcaRespuesta intensidad={marca.intensidad}>{marca.titulo}</MarcaRespuesta>
            <span>· {marca.explicacion}</span>
          </p>
        )}
        <Ecos item={item} />
        {item.pregunta_eleccion && <p className="text-muted-foreground">{item.pregunta_eleccion}</p>}
        <Eleccion item={item} />
        <p className="pt-1 text-muted-foreground">{item.pregunta_texto}</p>
        <Respuesta item={item} />
      </div>
    </article>
  )
}
