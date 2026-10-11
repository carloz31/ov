import { Progress } from '@/components/ui/Progress'

export function ColoredProgress({
  value,
  tone = 'primary',
  label,
}: {
  value: number
  tone?: 'primary' | 'secondary' | 'baseline'
  label: string
}) {
  return <Progress intent="data" dataTone={tone} aria-label={label} value={value} />
}
