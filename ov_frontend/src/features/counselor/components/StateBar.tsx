import { SegmentBar } from '@/features/counselor/components/SegmentBar'

export function StateBar({
  completed,
  progress,
  pending,
}: {
  completed: number
  progress: number
  pending: number
}) {
  return (
    <SegmentBar
      labels={['Completado', 'En progreso', 'No iniciado']}
      values={[completed, progress, pending]}
      legend={false}
    />
  )
}
