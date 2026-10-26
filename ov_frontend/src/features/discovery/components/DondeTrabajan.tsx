import { Parchment } from '@/components/student/Parchment'

// F06: los lugares de trabajo de una ocupación (`lugares_trabajo` del servidor).
export function DondeTrabajan({ lugares }: { lugares: string | null }) {
  if (!lugares) return null
  return (
    <Parchment title="Dónde trabajan">
      <p>{lugares}</p>
    </Parchment>
  )
}
