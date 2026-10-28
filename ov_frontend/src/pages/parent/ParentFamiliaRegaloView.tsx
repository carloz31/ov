import { MarcoFamiliaApoderado } from '@/features/family-conversations/components/servidor/MarcoFamiliaApoderado'
import { RegaloCarta } from '@/features/family-conversations/components/servidor/RegaloCarta'
import { SelectorHijo } from '@/features/family-conversations/components/servidor/SelectorHijo'
import { useFamiliaApoderado } from '@/features/family-conversations/hooks/useFamiliaApoderado'

// F08 (A6): el regalo del apoderado, dentro del portal.
export function ParentFamiliaRegaloView() {
  const f = useFamiliaApoderado()
  return (
    <MarcoFamiliaApoderado regalo m={f.m}>
      <RegaloCarta
        m={f.m}
        selector={<SelectorHijo activo={f.hijo} hijos={f.hijos} onElegir={f.elegirHijo} />}
      />
    </MarcoFamiliaApoderado>
  )
}
