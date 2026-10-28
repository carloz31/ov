import type { ReactNode } from 'react'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { AvisoToast } from '@/components/student/AvisoToast'
import { PantallaCargaPortal } from '@/components/staff/PantallaCargaPortal'
import type { ModeloFamilia } from '../../types'
import { MarcoFamilia } from './MarcoFamilia'

// F08: el marco de Conversaciones del apoderado: la carga y el error del portal dentro de la vista (spec §7) y los
// avisos como toasts.
export function MarcoFamiliaApoderado({
  m,
  regalo,
  children,
}: {
  m: ModeloFamilia
  regalo?: boolean
  children: ReactNode
}) {
  return (
    <MarcoFamilia
      m={m}
      regalo={regalo}
      carga={
        <PantallaCargaPortal
          enSeccion
          estado={m.estado === 'error' ? 'error' : 'cargando'}
          mensaje={m.mensajeError}
          onReintentar={m.reintentar}
        />
      }
      aviso={
        m.aviso && (
          <AvisoToast
            key={m.aviso.id}
            descripcion={m.aviso.descripcion}
            etiqueta="Conversaciones"
            icono={m.aviso.error ? TriangleAlert : CircleCheck}
            titulo={m.aviso.titulo}
            onDismiss={m.cerrarAviso}
          />
        )
      }
    >
      {children}
    </MarcoFamilia>
  )
}
