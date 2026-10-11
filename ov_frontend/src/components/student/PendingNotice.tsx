import { useEffect } from 'react'
import { X } from 'lucide-react'
export function PendingNotice({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 7000)
    return () => clearTimeout(timer)
  }, [onClose])
  return (
    <div className="sx-d-notice" role="status">
      El armado de esta sección llega pronto.
      <button type="button" aria-label="Cerrar aviso" onClick={onClose}>
        <X />
      </button>
    </div>
  )
}
