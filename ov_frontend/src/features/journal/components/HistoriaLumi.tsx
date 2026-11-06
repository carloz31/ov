import { useState } from 'react'
import { ChevronLeft, ChevronRight, LockKeyhole, Sparkles } from 'lucide-react'
import type { CapituloLumi } from '@/features/journal/hooks/useHistoriaLumi'

const POR_PAGINA = 3

// Ajuste del diario (F05): «La historia de Lumi» dentro de su tarjeta, de 3 en 3 con flechas. Un capítulo abierto se
// vuelve a ver en el reproductor de actividades; uno recién desbloqueado brilla con «Nuevo recuerdo» hasta que el
// estudiante lo abre (nunca se abre solo), y uno bloqueado muestra su título como adelanto y su requisito.
export function HistoriaLumi({
  capitulos,
  onVer,
}: {
  capitulos: CapituloLumi[]
  onVer: (capitulo: CapituloLumi) => void
}) {
  const primeroNuevo = capitulos.findIndex((c) => c.nuevo)
  const [pagina, setPagina] = useState(primeroNuevo > 0 ? Math.floor(primeroNuevo / POR_PAGINA) : 0)
  const paginas = Math.max(1, Math.ceil(capitulos.length / POR_PAGINA))
  const desde = pagina * POR_PAGINA
  const visibles = capitulos.slice(desde, desde + POR_PAGINA)
  const abiertos = capitulos.filter((c) => c.desbloqueado).length
  return (
    <section className="sx-j-historia" aria-labelledby="historia-lumi">
      <div className="sx-j-historia-head">
        <h3 id="historia-lumi">La historia de Lumi</h3>
        <strong>{`${abiertos} de ${capitulos.length}`}</strong>
      </div>
      <ol className="sx-j-historia-list">
        {visibles.map((c) =>
          c.desbloqueado ? (
            <li key={c.codigo} className="sx-j-capitulo" data-estado={c.nuevo ? 'nuevo' : 'abierto'}>
              <button type="button" className="sx-j-capitulo-ver" onClick={() => onVer(c)}>
                <span className="sx-j-capitulo-num">{c.numero}</span>
                <span className="sx-j-capitulo-copy">
                  <span className="sx-j-capitulo-title">{c.titulo}</span>
                  {c.nuevo ? (
                    <small>
                      <Sparkles aria-hidden="true" size={12} /> Nuevo recuerdo · Toca para verlo
                    </small>
                  ) : (
                    <small>Volver a ver</small>
                  )}
                </span>
              </button>
            </li>
          ) : (
            <li key={c.codigo} className="sx-j-capitulo" data-estado="bloqueado">
              <span className="sx-j-capitulo-lock">
                <LockKeyhole aria-hidden="true" size={14} />
              </span>
              <span className="sx-j-capitulo-copy">
                <span className="sx-j-capitulo-title">{c.titulo || `Recuerdo ${c.numero}`}</span>
                {c.requisito && (
                  <small>
                    {c.requisito === 1 ? 'Al llegar a 1 carta' : `Al llegar a ${c.requisito} cartas`}
                  </small>
                )}
              </span>
            </li>
          ),
        )}
      </ol>
      {paginas > 1 && (
        <div className="sx-j-historia-nav">
          <span>{`Capítulos ${desde + 1}–${desde + visibles.length} de ${capitulos.length}`}</span>
          <button
            type="button"
            aria-label="Capítulos anteriores"
            disabled={pagina === 0}
            onClick={() => setPagina((p) => p - 1)}
          >
            <ChevronLeft aria-hidden="true" size={18} />
          </button>
          <button
            type="button"
            aria-label="Capítulos siguientes"
            disabled={pagina >= paginas - 1}
            onClick={() => setPagina((p) => p + 1)}
          >
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </div>
      )}
    </section>
  )
}
