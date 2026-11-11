import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { OpcionOfrecida } from '@/types/servidor'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { gruposPiezas, lineasPieza, recortar } from '../../lib/formasEco'
import { ELECCION } from '../../lib/textosRegistro'
import '../../styles/registro-ecos.css'

// Un texto de pieza de más de unos 90 caracteres se recorta.
const LARGO = 90

// Ajuste front de registros (lote 2, §5): el selector de piezas (b4-1, b5-3). Un botón de ancho completo: vacío dice
// «Elige una»; con una pieza, su contenido y su origen. Al tocarlo se abre la ventana (el diálogo de la plataforma)
// con la pregunta como título, «Cerrar» y las piezas por grupo, en el orden en que llegan; la elegida, resaltada.
// Elegir una pieza cierra la ventana. Un texto largo se recorta y se ve completo con «ver completa».
export function SelectorPiezas({
  titulo,
  piezas,
  elegida,
  onElegir,
}: {
  titulo: string
  piezas: OpcionOfrecida[]
  elegida?: string
  onElegir: (codigo: string) => void
}) {
  const [abierta, setAbierta] = useState(false)
  const [abiertas, setAbiertas] = useState<string[]>([])
  const pieza = piezas.find((p) => p.codigo === elegida)
  return (
    <>
      <button
        type="button"
        className={`sx-selector ${pieza ? 'is-elegida' : ''}`}
        aria-haspopup="dialog"
        onClick={() => setAbierta(true)}
      >
        <span className="sx-selector-cuerpo">
          {pieza ? lineasPieza(pieza).map((l, i) => <span key={i}>{l}</span>) : ELECCION.eligeUna}
          {pieza?.origen && <small>{pieza.origen}</small>}
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      <Dialog open={abierta} onOpenChange={setAbierta}>
        <DialogContent className="sx-root sx-ventana-piezas" showCloseButton={false}>
          <div className="sx-ventana-cabeza">
            <DialogTitle className="sx-ventana-titulo">{titulo}</DialogTitle>
            <button type="button" className="sx-eco-enlace" onClick={() => setAbierta(false)}>
              {ELECCION.cerrar}
            </button>
          </div>
          {gruposPiezas(piezas).map((g, i) => (
            <div key={`${i}-${g.grupo ?? ''}`} className="sx-ventana-grupo" role="group" aria-label={g.grupo ?? titulo}>
              {g.grupo && <p className="sx-eco-rotulo">{g.grupo}</p>}
              {g.piezas.map((p) => (
                <div key={p.codigo} className={`sx-pieza ${p.codigo === elegida ? 'is-elegida' : ''}`}>
                  <button
                    type="button"
                    className="sx-pieza-elegir"
                    aria-pressed={p.codigo === elegida}
                    onClick={() => {
                      onElegir(p.codigo)
                      setAbierta(false)
                    }}
                  >
                    {lineasPieza(p).map((l, j) => (
                      <span key={j}>{abiertas.includes(p.codigo) ? l : recortar(l, LARGO).corto}</span>
                    ))}
                    {p.origen && <small>{p.origen}</small>}
                  </button>
                  {!abiertas.includes(p.codigo) && lineasPieza(p).some((l) => recortar(l, LARGO).recortado) && (
                    <button type="button" className="sx-eco-enlace" onClick={() => setAbiertas([...abiertas, p.codigo])}>
                      {ELECCION.verPieza}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </DialogContent>
      </Dialog>
    </>
  )
}
