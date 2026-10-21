import { useEffect, useState } from 'react'
import { CharacterAvatar } from './CharacterAvatar'

type Accion = { texto: string; onClick: () => void }

// Espera o fallo de una carga del servidor, con el estilo de la transición de zona y el avatar de Lumi.
// La espera solo se muestra si pasa de ~300 ms; el error, de inmediato.
export function PantallaCarga({
  estado,
  titulo,
  frase,
  mensaje,
  onReintentar,
  volver,
  ocupado = false,
  enSeccion = false,
}: {
  estado: 'cargando' | 'error'
  titulo: string
  frase: string
  mensaje?: string
  onReintentar?: () => void
  volver?: Accion
  ocupado?: boolean
  enSeccion?: boolean
}) {
  const [visible, setVisible] = useState(estado === 'error')
  useEffect(() => {
    if (estado === 'error') {
      setVisible(true)
      return
    }
    const espera = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(espera)
  }, [estado])
  if (!visible) return null
  const error = estado === 'error'
  return (
    <div
      className={`sx-zone-transition sx-pantalla-carga${enSeccion ? ' is-seccion' : ''}`}
      role={error ? 'alert' : 'status'}
      aria-live="polite"
    >
      <CharacterAvatar id="companero" size="lg" />
      <strong>{error ? 'Algo se cruzó en el camino' : titulo}</strong>
      <span>{error ? mensaje : frase}</span>
      {error ? (
        <div className="sx-carga-acciones">
          {onReintentar && (
            <button type="button" className="sx-primary-button" disabled={ocupado} onClick={onReintentar}>
              Reintentar
            </button>
          )}
          {volver && (
            <button type="button" className="sx-secondary-button" onClick={volver.onClick}>
              {volver.texto}
            </button>
          )}
        </div>
      ) : (
        <span className="sx-carga-indicador" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
    </div>
  )
}
