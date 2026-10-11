import { useState } from 'react'

import { Card } from '@/components/ui/Card'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/Sheet'

import { getInterestTimeline } from '@/features/counselor/lib/counselorPortalSelectors'

import { CounselorLineChart } from '@/features/counselor/components/CounselorLineChart'
import type { Interest, Student } from '@/features/counselor/types'
import { CareerRow } from '@/features/counselor/components/student-detail/CareerRow'
import { institutionTypeLabel } from '@/features/counselor/lib/labels'
import { Detail } from '@/features/counselor/components/student-detail/Detail'

export function InterestsSection({ student }: { student: Student }) {
  const timeline = getInterestTimeline(student)
  const careers = student.interests.filter((item) => item.type === 'CARRERA' && item.status === 'ACTIVO')
  const occupations = student.interests.filter(
    (item) => item.type === 'OCUPACION' && item.status === 'ACTIVO',
  )
  const [selectedCareer, setSelectedCareer] = useState<Interest>()
  const max = Math.max(
    1,
    ...timeline.map((item) => Math.max(item.careers, item.occupations, item.institutions)),
  )
  const chartData = timeline.map((item) => ({
    label: new Date(item.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
    careers: item.careers,
    occupations: item.occupations,
    institutions: item.institutions,
  }))
  const markers = ['act-12', 'act-17'].flatMap((activityId) => {
    const completedAt = student.progress.find((item) => item.activityId === activityId)?.completedAt
    return completedAt
      ? [
          {
            value: new Date(completedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
            label: activityId === 'act-12' ? 'ACT-12' : 'ACT-17',
          },
        ]
      : []
  })
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="font-bold">Evolución de intereses</h2>
        <p className="text-xs text-muted-foreground">
          Carreras, ocupaciones e instituciones agregadas durante el proceso.
        </p>
        <div className="mt-4">
          <CounselorLineChart
            data={chartData}
            domain={[0, max + 1]}
            label="Evolución de intereses"
            markers={markers}
            series={[
              { key: 'careers', label: 'Carreras', color: 'var(--primary)' },
              { key: 'occupations', label: 'Ocupaciones', color: 'var(--data-secondary)' },
              { key: 'institutions', label: 'Instituciones', color: 'var(--data-baseline)' },
            ]}
          />
        </div>
      </Card>
      <Card className="overflow-x-auto">
        <div className="border-b p-5">
          <h2 className="font-bold">Carreras de interés</h2>
        </div>
        <table className="w-full min-w-[980px] text-left text-sm [&_td:first-child]:pl-6 [&_td:last-child]:pr-8 [&_th:first-child]:pl-6 [&_th:last-child]:pr-8">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-4">Nombre</th>
              <th>Fecha agregada</th>
              <th>Código RIASEC</th>
              <th>Match RIASEC</th>
              <th>Motivación</th>
              <th>Influencias</th>
              <th>Conocimiento</th>
              <th>Preparación</th>
              <th>Presupuesto</th>
              <th className="w-24 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {careers.map((interest) => (
              <CareerRow interest={interest} key={interest.id} onView={setSelectedCareer} />
            ))}
          </tbody>
        </table>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-x-auto">
          <div className="border-b p-5">
            <h2 className="font-bold">Ocupaciones de interés</h2>
          </div>
          <table className="w-full text-left text-sm [&_td:last-child]:pr-6 [&_th:last-child]:pr-6">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-4">Nombre</th>
                <th>Fecha agregada</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {occupations.map((item) => (
                <tr key={item.id}>
                  <td className="p-4 font-medium">{item.name}</td>
                  <td>{new Date(item.addedAt).toLocaleDateString('es-PE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="overflow-x-auto">
          <div className="border-b p-5">
            <h2 className="font-bold">Instituciones de interés</h2>
          </div>
          <table className="w-full text-left text-sm [&_td:last-child]:pr-6 [&_th:last-child]:pr-6">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-4">Nombre</th>
                <th>Tipo</th>
                <th>Fecha agregada</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {student.institutions.map((item) => (
                <tr key={item.id}>
                  <td className="p-4 font-medium">{item.name}</td>
                  <td>{institutionTypeLabel(item.type)}</td>
                  <td>{new Date(item.addedAt).toLocaleDateString('es-PE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <Sheet onOpenChange={(open) => !open && setSelectedCareer(undefined)} open={Boolean(selectedCareer)}>
        <SheetContent className="overflow-y-auto" side="responsive">
          <SheetHeader>
            <SheetTitle>{selectedCareer?.name}</SheetTitle>
            <SheetDescription>Ficha de carrera construida por el estudiante.</SheetDescription>
          </SheetHeader>
          {selectedCareer && (
            <div className="mt-6 grid gap-4">
              <Detail label="Motivación" value={selectedCareer.card?.motivation} />
              <Detail
                label="Influencias"
                value={selectedCareer.card?.influences
                  .map((item) => `${item.person}: ${item.description}`)
                  .join('; ')}
              />
              <Detail label="Lo que conoce" value={selectedCareer.card?.knowledge} />
              <Detail label="Preparación" value={selectedCareer.card?.preparations.join(', ')} />
              <Detail
                label="Presupuestos"
                value={selectedCareer.card?.budgets
                  .map(
                    (item) =>
                      `${item.institution}, ${item.duration}, S/ ${item.totalCost.toLocaleString('es-PE')}`,
                  )
                  .join('; ')}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
