import { useSelectedSalon } from '@/features/counselor/hooks/useSelectedSalon'
import { Progress } from '@/components/ui/Progress'

import { Bell, Gauge, ListFilter, Search, UsersRound } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { projectStudents, type ExampleStudent } from '@/features/counselor/data/exampleStudents'
import { studentProfiles } from '@/data/demo/studentProfiles'
import { usePriorityCatalog } from '@/features/counselor/hooks/usePrioritySettings'
import { priorityProgress, relativeAccess as lastAccess } from '@/features/student-tracking/lib/selectors'
import { profileUrl } from '@/features/student-tracking/lib/navigation'

const collator = new Intl.Collator('es', { sensitivity: 'base' })
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')

import { AlertList } from '@/features/counselor/components/AlertList'

function StudentsView() {
  const { activities, questionnaires } = usePriorityCatalog()
  const exampleStudents = projectStudents(activities, questionnaires)
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const { salon, setSalon, salons } = useSelectedSalon()
  const requestedAlertFilter = params.get('alertas') ?? 'all'
  const alertFilter = ['with', 'without'].includes(requestedAlertFilter) ? requestedAlertFilter : 'all'
  const query = params.get('q') ?? ''
  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (!value || value === 'all') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }
  const setAlertFilter = (value: string) => updateFilter('alertas', value)
  const setQuery = (value: string) => updateFilter('q', value)
  const selected = exampleStudents.filter((student) => salon === 'all' || student.salon === salon)
  const average = selected.length
    ? Math.round(
        studentProfiles
          .filter((student) => salon === 'all' || student.salon === salon)
          .reduce(
            (sum, student) => sum + priorityProgress(student, activities, questionnaires).rawPercent,
            0,
          ) / selected.length,
      )
    : 0
  const normalizedQuery = normalize(query.trim())
  const visible = selected
    .filter(
      (student) =>
        (alertFilter === 'all' || (alertFilter === 'with') === student.alertas.length > 0) &&
        normalize(`${student.nombres} ${student.apellidos}`).includes(normalizedQuery),
    )
    .sort(
      (a, b) =>
        Number(b.alertas.length > 0) - Number(a.alertas.length > 0) ||
        collator.compare(a.apellidos, b.apellidos) ||
        collator.compare(a.nombres, b.nombres),
    )
  const emptyMessage = selected.length
    ? 'No hay estudiantes que coincidan. Cambia el salón o quita los filtros.'
    : 'Todavía no hay estudiantes en este salón.'
  const profileButton = (student: ExampleStudent, fullWidth = false) => (
    <Button
      variant="outline"
      className={`min-h-11 border-input bg-card text-base text-foreground shadow-none hover:bg-muted ${fullWidth ? 'w-full' : ''}`}
      aria-label={`Ver perfil de ${student.nombres} ${student.apellidos}`}
      onClick={() => navigate(profileUrl(student.id, location.pathname + location.search))}
    >
      Ver perfil
    </Button>
  )

  return (
    <main className="min-w-0 px-5 py-4 text-base sm:px-8 sm:py-6 lg:px-10 lg:py-8">
      <div className="w-full space-y-4">
        <h1 className="text-2xl font-bold">Mis estudiantes</h1>
        <div className="grid gap-2.5 sm:grid-cols-3" aria-label="Indicadores del salón seleccionado">
          {(
            [
              ['Estudiantes', selected.length, UsersRound, 'bg-[var(--primary-soft)] text-primary'],
              [
                'Con alertas',
                `${selected.filter((student) => student.alertas.length > 0).length} de ${selected.length}`,
                Bell,
                'bg-[var(--primary-soft)] text-primary',
              ],
              ['Avance prioritario promedio', `${average} %`, Gauge, 'bg-[var(--primary-soft)] text-primary'],
            ] as const
          ).map(([label, value, Icon, iconColor]) => (
            <Card
              key={label}
              className="flex min-h-[76px] items-center gap-3 rounded-xl border bg-card px-3 py-3.5"
            >
              <span
                className={`flex size-[60px] shrink-0 items-center justify-center rounded-full ${iconColor}`}
              >
                <Icon aria-hidden="true" className="size-[30px]" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-xl font-bold leading-tight">{value}</p>
              </div>
            </Card>
          ))}
        </div>
        <div className="flex items-center gap-3 overflow-x-auto">
          <div className="relative min-w-[180px] flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="Buscar estudiante"
              placeholder="Buscar estudiante"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-11 bg-card pl-10 text-base placeholder:text-muted-foreground"
            />
          </div>
          <Select value={salon} onValueChange={setSalon}>
            <SelectTrigger
              aria-label="Filtrar por salón"
              className="min-h-11 w-auto shrink-0 gap-2 bg-card text-base"
            >
              <ListFilter aria-hidden="true" className="size-4 shrink-0" />
              <span className="text-left">
                Salón: <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos mis salones</SelectItem>
              {salons.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={alertFilter} onValueChange={setAlertFilter}>
            <SelectTrigger
              aria-label="Filtrar alertas"
              className="min-h-11 w-[220px] shrink-0 gap-2 bg-card text-base"
            >
              <ListFilter aria-hidden="true" className="size-4 shrink-0" />
              <span className="flex-1 text-left">
                Alertas:{' '}
                {alertFilter === 'all' ? 'Todos' : alertFilter === 'with' ? 'Con alertas' : 'Sin alertas'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="with">Con alertas</SelectItem>
              <SelectItem value="without">Sin alertas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Card className="overflow-hidden rounded-xl">
          {visible.length ? (
            <>
              <div className="hidden md:block">
                <Table className="table-fixed text-left text-base [&_th:first-child]:pl-2.5 [&_td:first-child]:pl-2.5 [&_th:last-child]:pr-2.5 [&_td:last-child]:pr-2.5">
                  <TableHeader className="bg-muted">
                    <TableRow className="hover:bg-transparent">
                      <TableHead
                        scope="col"
                        className="w-[30%] px-2.5 py-2.5 text-base font-semibold text-muted-foreground"
                      >
                        Nombre
                      </TableHead>
                      {salon === 'all' && (
                        <TableHead
                          scope="col"
                          className="w-[8%] px-2.5 py-2.5 text-base font-semibold text-muted-foreground"
                        >
                          Salón
                        </TableHead>
                      )}
                      <TableHead
                        scope="col"
                        className="w-[10%] px-2.5 py-2.5 text-center text-base font-semibold whitespace-normal break-words text-muted-foreground"
                      >
                        Avance prioritario
                      </TableHead>
                      <TableHead
                        scope="col"
                        className="w-[16%] px-2.5 py-2.5 text-center text-base font-semibold text-muted-foreground"
                      >
                        Último acceso
                      </TableHead>
                      <TableHead
                        scope="col"
                        className="w-[24%] px-2.5 py-2.5 text-center text-base font-semibold text-muted-foreground"
                      >
                        Alertas
                      </TableHead>
                      <TableHead
                        scope="col"
                        className="w-[12%] px-2.5 py-2.5 text-center text-base font-semibold text-muted-foreground"
                      >
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((student) => (
                      <TableRow key={student.id} className="border-t hover:bg-transparent">
                        <TableCell className="px-2.5 py-2 break-words">
                          {student.nombres} {student.apellidos}
                        </TableCell>
                        {salon === 'all' && <TableCell className="px-2.5 py-2">{student.salon}</TableCell>}
                        <TableCell className="px-2.5 py-2 text-center">
                          <div className="mx-auto max-w-24 space-y-1.5">
                            <span>{student.avance} %</span>
                            <Progress
                              aria-label={`Avance prioritario de ${student.nombres}`}
                              value={student.avance}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="px-2.5 py-2 text-center text-muted-foreground">
                          {lastAccess(student.ultimoIngreso)}
                        </TableCell>
                        <TableCell className="px-2.5 py-2 text-center">
                          <AlertList alertas={student.alertas} centered />
                        </TableCell>
                        <TableCell className="px-2.5 py-2 text-center">{profileButton(student)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3 p-3 md:hidden">
                {visible.map((student) => (
                  <Card key={student.id} className="space-y-3 rounded-xl p-4">
                    <h2 className="text-lg font-bold">
                      {student.nombres} {student.apellidos}
                    </h2>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                      {salon === 'all' && (
                        <>
                          <dt className="text-muted-foreground">Salón</dt>
                          <dd>{student.salon}</dd>
                        </>
                      )}
                      <dt className="text-muted-foreground">Avance prioritario</dt>
                      <dd className="space-y-1.5">
                        <span>{student.avance} %</span>
                        <Progress
                          aria-label={`Avance prioritario de ${student.nombres}`}
                          value={student.avance}
                        />
                      </dd>
                      <dt className="text-muted-foreground">Último acceso</dt>
                      <dd>{lastAccess(student.ultimoIngreso)}</dd>
                      <dt className="text-muted-foreground">Alertas</dt>
                      <dd className="min-w-0">
                        <AlertList alertas={student.alertas} />
                      </dd>
                    </dl>
                    {profileButton(student, true)}
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="p-8 text-center">{emptyMessage}</div>
          )}
        </Card>
      </div>
    </main>
  )
}

export { StudentsView }
