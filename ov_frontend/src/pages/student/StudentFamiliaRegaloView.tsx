import { MarcoFamiliaEstudiante } from '@/features/family-conversations/components/servidor/MarcoFamiliaEstudiante'
import { RegaloCarta } from '@/features/family-conversations/components/servidor/RegaloCarta'
import { useFamiliaEstudiante } from '@/features/family-conversations/hooks/useFamiliaEstudiante'

// F08 (E8): el regalo, una pantalla propia de Familia.
export function StudentFamiliaRegaloView() {
  const m = useFamiliaEstudiante()
  return (
    <MarcoFamiliaEstudiante regalo m={m}>
      <RegaloCarta m={m} />
    </MarcoFamiliaEstudiante>
  )
}
