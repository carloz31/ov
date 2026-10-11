import { LockKeyhole } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'

import { Card } from '@/components/ui/Card'

import { formatRelative } from '@/features/counselor/lib/counselorPortalSelectors'
import { useCounselorPortal } from '@/features/counselor/context/counselorPortalContext'
import { CounselorLineChart } from '@/features/counselor/components/CounselorLineChart'
import type { Student } from '@/features/counselor/types'
import { Stat } from '@/features/counselor/components/student-detail/Stat'

export function JournalSection({ student }: { student: Student }) {
  const { state } = useCounselorPortal()
  const points = [...student.checkIns].sort((a, b) => a.date.localeCompare(b.date))
  const chartData = points.map((item) => ({
    label: new Date(item.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
    safety: item.value,
  }))
  const weeklyAverage = student.diaryUsage.weekly.length
    ? student.diaryUsage.weekly.reduce((a, b) => a + b, 0) / student.diaryUsage.weekly.length
    : 0
  return (
    <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
      <div className="space-y-4">
        <Card className="flex gap-3 p-5">
          <LockKeyhole className="size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-bold">El contenido del diario es privado del estudiante.</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              La orientadora solo puede consultar indicadores agregados y check-ins. Esta vista nunca recibe
              el texto ni los tags de las entradas.
            </p>
          </div>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Stat label="Entradas totales" value={student.diaryUsage.total} />
          <Stat
            label="Espontáneas / prompt"
            value={`${student.diaryUsage.spontaneous} / ${student.diaryUsage.prompted}`}
          />
          <Stat
            label="Última entrada"
            value={
              student.diaryUsage.lastEntry
                ? formatRelative(student.diaryUsage.lastEntry, state.referenceDate)
                : 'Sin entradas'
            }
          />
          <Stat label="Frecuencia semanal" value={`${weeklyAverage.toFixed(1)} prom.`} />
        </div>
      </div>
      <Card className="p-5">
        <h2 className="font-bold">Check-in de seguridad · escala 1 a 5</h2>
        <p className="text-xs text-muted-foreground">
          Cada registro corresponde a una fecha y hora específica. Los valores iguales o menores a 2 aparecen
          sobre el área sombreada.
        </p>
        <div className="mt-4">
          <CounselorLineChart
            data={chartData}
            domain={[1, 5]}
            label="Seguridad vocacional en el tiempo"
            lowAreaMax={2}
            series={[{ key: 'safety', label: 'Seguridad', color: 'var(--primary)' }]}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {points.map((item) => (
            <Badge key={item.id} variant="neutral">
              {new Date(item.date).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })} ·{' '}
              {item.value}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  )
}
