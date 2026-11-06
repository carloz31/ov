import { CircleCheck, TriangleAlert } from 'lucide-react'
import { AvisoToast } from '@/components/student/AvisoToast'
import { cerrarAvisoInvestigacion, useAvisoInvestigacion } from '../../store/avisoInvestigaciones'

// F09: el toast de Investigaciones; cada vista de la sección lo monta.
export function AvisoInvestigaciones() {
  const aviso = useAvisoInvestigacion()
  if (!aviso) return null
  return (
    <AvisoToast
      key={aviso.id}
      icono={aviso.error ? TriangleAlert : CircleCheck}
      etiqueta="Investigaciones"
      titulo={aviso.titulo}
      descripcion={aviso.descripcion}
      onDismiss={cerrarAvisoInvestigacion}
    />
  )
}
