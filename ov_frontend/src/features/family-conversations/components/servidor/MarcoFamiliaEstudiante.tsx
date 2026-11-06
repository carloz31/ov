import type { ReactNode } from 'react'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { AvisoToast } from '@/components/student/AvisoToast'
import { PantallaCarga } from '@/components/student/PantallaCarga'
import type { ModeloFamilia } from '../../types'
import { MarcoFamilia } from './MarcoFamilia'

// F08: el marco de las pantallas de Familia del estudiante: carga y error en la sección, y avisos como toasts.
export function MarcoFamiliaEstudiante({
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
        <PantallaCarga
          enSeccion
          estado={m.estado === 'error' ? 'error' : 'cargando'}
          frase={m.textos.cargandoFrase}
          mensaje={m.mensajeError}
          titulo={m.textos.cargandoTitulo}
          onReintentar={m.reintentar}
        />
      }
      aviso={
        m.aviso && (
          <AvisoToast
            key={m.aviso.id}
            descripcion={m.aviso.descripcion}
            etiqueta="Familia"
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
