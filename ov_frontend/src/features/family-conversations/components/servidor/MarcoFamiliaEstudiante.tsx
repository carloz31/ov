import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { AvisoToast } from '@/components/student/AvisoToast'
import { PantallaCarga } from '@/components/student/PantallaCarga'
import { appPaths } from '@/routes/paths'
import { useStudentUi } from '@/store/studentUiStore'
import type { ModeloFamilia } from '../../types'
import { MarcoFamilia } from './MarcoFamilia'

// F08: el marco de las pantallas de Familia del estudiante: carga y error en la sección, y avisos como toasts. El error
// (p. ej. una cuenta sin vínculo familiar) ofrece también volver al último mapa, para no quedar sin salida.
export function MarcoFamiliaEstudiante({
  m,
  regalo,
  children,
}: {
  m: ModeloFamilia
  regalo?: boolean
  children: ReactNode
}) {
  const navigate = useNavigate()
  const ui = useStudentUi()
  const mapa = ui.lastMap === 'central' ? appPaths.student.exploration : appPaths.student.missions
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
          volver={{ texto: 'Volver al mapa', onClick: () => navigate(mapa) }}
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
