import { useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/Input'

type Elegido = { clave: string; texto: string }

// F07a (ajuste de motivos): una elección de varios chips en dos filas. Arriba, los elegidos en su orden (con su
// número si `numerado`) y una «✕»; abajo, los disponibles y «+ Otro». Marcar uno de abajo lo sube al final; la
// «✕» lo baja (o lo borra si es propio). «+ Otro» abre un campo: al confirmarlo (Enter o salir con texto) el texto
// sube como chip propio y el botón vuelve a su estado inicial. F07b lo reutiliza sin números.
export function ChipsElegibles({
  titulo,
  vacio,
  elegidos,
  disponibles,
  numerado = false,
  textoOtro,
  ayuda,
  onMarcar,
  onQuitar,
  onOtro,
}: {
  titulo: string
  vacio: string
  elegidos: Elegido[]
  disponibles: { codigo: string; texto: string }[]
  numerado?: boolean
  textoOtro: string
  ayuda?: string
  onMarcar: (codigo: string) => void
  onQuitar: (indice: number) => void
  onOtro: (texto: string) => void
}) {
  const [otro, setOtro] = useState<string | null>(null)
  const confirmar = () => {
    const texto = otro?.trim() ?? ''
    setOtro(null)
    if (texto) onOtro(texto)
  }
  return (
    <div className="sx-p-elegibles">
      <div className="sx-p-fila" data-fila="elegidos">
        <small className="sx-p-fila-titulo">{titulo}</small>
        {elegidos.length ? (
          <div className="sx-p-chips">
            {elegidos.map((e, i) => (
              <span className="sx-p-chip" data-elegido="true" key={e.clave}>
                {numerado && <span className="sx-p-orden">{i + 1}</span>}
                {e.texto}
                <button
                  type="button"
                  className="sx-p-quitar"
                  aria-label={`Quitar ${e.texto}`}
                  onClick={() => onQuitar(i)}
                >
                  <X aria-hidden="true" size={14} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="sx-p-ayuda">{vacio}</p>
        )}
      </div>
      <div className="sx-p-fila" data-fila="disponibles">
        <small className="sx-p-fila-titulo">Para elegir</small>
        <div className="sx-p-chips">
          {disponibles.map((d) => (
            <button type="button" className="sx-p-chip" key={d.codigo} onClick={() => onMarcar(d.codigo)}>
              {d.texto}
            </button>
          ))}
          {otro !== null ? (
            <Input
              className="sx-p-otro"
              aria-label={textoOtro}
              placeholder="Escribe y pulsa Enter"
              autoFocus
              value={otro}
              onChange={(e) => setOtro(e.target.value)}
              onBlur={confirmar}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  confirmar()
                }
              }}
            />
          ) : (
            <button type="button" className="sx-p-chip sx-p-chip-nuevo" onClick={() => setOtro('')}>
              + {textoOtro}
            </button>
          )}
        </div>
      </div>
      {ayuda && <p className="sx-p-ayuda">{ayuda}</p>}
    </div>
  )
}
