import { PenLine } from 'lucide-react'

// Modo lectura de una consigna en la consulta del registro (F02): la respuesta entregada como cita y, si el
// ítem se puede editar, «Modificar», que abre el componente de siempre.
export function RespuestaConsulta({ texto, onModificar }: { texto: string; onModificar?: () => void }) {
  return (
    <div className="sx-registro-lectura">
      {texto.trim() && <blockquote className="sx-followup-original">{texto}</blockquote>}
      {onModificar && (
        <button type="button" className="sx-secondary-button" onClick={onModificar}>
          <PenLine size={16} aria-hidden="true" />
          Modificar
        </button>
      )}
    </div>
  )
}
