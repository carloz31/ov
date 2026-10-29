import { Eye, Loader2, Search } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/common/PageHeader'
import { PantallaCargaPortal } from '@/components/staff/PantallaCargaPortal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { fechaNumerica } from '@/lib/servidor/adaptadoresInvestigaciones'
import { appPaths } from '@/routes/paths'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { EstadoPublicacion, FilaPublicacion } from '@/types/servidor'
import type { ModeloPublicaciones } from '../../hooks/usePublicacionesServidor'
import { EstadoPublicacionBadges } from './EstadoPublicacionBadges'

const ESTADOS: [EstadoPublicacion | 'todos', string][] = [
  ['todos', 'Estado: todos'],
  ['SIN_DESTACAR', 'Sin destacar'],
  ['DESTACADA', 'Destacada'],
  ['LEYENDA', 'Leyenda'],
]
const ANCHOS = ['w-[17%]', 'w-[10%]', 'w-[15%]', 'w-[12%]', 'w-[10%]', 'w-[9%]', 'w-[15%]', 'w-[12%]']
const COLUMNAS = [
  'Autores',
  'Salón',
  'Profesión u ocupación',
  'Fecha de publicación',
  'Reacciones',
  'Favoritos',
  'Estado',
  'Acciones',
]

function Fila({
  fila,
  m,
  favoritosLeyenda,
}: {
  fila: FilaPublicacion
  m: ModeloPublicaciones
  favoritosLeyenda: number
}) {
  const salones = [...new Set(fila.autores.map((a) => a.salon))]
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="px-2.5 py-3 whitespace-normal break-words">
        {fila.autores.map((a) => a.nombre).join(', ')}
      </TableCell>
      <TableCell className="px-2.5 py-3 whitespace-normal">
        {fila.de_sus_salones ? salones.map(m.nombreSalon).join(', ') : 'Promoción anterior'}
      </TableCell>
      <TableCell className="px-2.5 py-3 whitespace-normal break-words">{fila.ocupacion.titulo}</TableCell>
      <TableCell className="px-2.5 py-3">{fechaNumerica(fila.fecha_hora)}</TableCell>
      <TableCell className="px-2.5 py-3 text-center">{fila.reacciones}</TableCell>
      <TableCell className="px-2.5 py-3 text-center">
        {fila.favoritos}
        {fila.estado !== 'LEYENDA' && (
          <span className="text-sm text-muted-foreground"> / {favoritosLeyenda}</span>
        )}
      </TableCell>
      <TableCell className="px-2.5 py-3">
        <EstadoPublicacionBadges
          estado={fila.estado}
          reportes={fila.reportes_pendientes}
          comentarios={fila.comentarios_reportados}
        />
      </TableCell>
      <TableCell className="px-2.5 py-3 text-center">
        <Button asChild variant="outline" className="min-h-11">
          <Link
            className="h-auto whitespace-normal"
            to={`${appPaths.counselor.interview(fila.codigo)}${m.salon ? `?salon=${m.salon}` : ''}`}
          >
            <Eye className="size-4 shrink-0" aria-hidden="true" /> Ver entrevista
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  )
}

// F09 (api, boceto 12 · HU-062 y HU-064): la tabla de publicaciones de sus salones; las Leyendas de otros salones
// van al final como «Promoción anterior».
export function TablaPublicaciones({ m }: { m: ModeloPublicaciones }) {
  const lista = m.lista
  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Publicaciones"
        eyebrow="Contenido"
        description="Revisa las entrevistas publicadas por tus estudiantes, sus reacciones y reportes."
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-64 flex-1">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="sr-only">Buscar por autor, ocupación o título</span>
          <Input
            className="min-h-11 bg-card pl-9"
            placeholder="Buscar por autor, ocupación o título…"
            value={m.texto}
            onChange={(e) => m.buscarTexto(e.target.value)}
          />
        </label>
        <Select value={m.salon || 'todos'} onValueChange={(v) => m.elegirSalon(v === 'todos' ? '' : v)}>
          <SelectTrigger aria-label="Filtrar por salón" className="min-h-11 w-full bg-card sm:w-52">
            <SelectValue>{m.salon ? m.nombreSalon(m.salon) : 'Todos los salones'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los salones</SelectItem>
            {m.salones.map((s) => (
              <SelectItem key={s.codigo} value={s.codigo}>
                {s.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={m.estado || 'todos'}
          onValueChange={(v) => m.setEstado(v === 'todos' ? '' : (v as EstadoPublicacion))}
        >
          <SelectTrigger aria-label="Filtrar por estado" className="min-h-11 w-full bg-card sm:w-52">
            <SelectValue>{ESTADOS.find(([v]) => v === (m.estado || 'todos'))?.[1]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ESTADOS.map(([valor, texto]) => (
              <SelectItem key={valor} value={valor}>
                {texto}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={m.conReportes ? 'si' : 'todas'} onValueChange={(v) => m.setConReportes(v === 'si')}>
          <SelectTrigger
            aria-label="Filtrar por reportes"
            className={`min-h-11 w-full sm:w-52 ${m.reportadas ? 'border-danger-soft bg-danger-soft/40' : 'bg-card'}`}
          >
            <SelectValue>
              {m.conReportes ? 'Solo con reportes' : 'Con reportes'}
              {m.reportadas !== null && ` · ${m.reportadas}`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="si">Solo con reportes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {lista?.estado === 'error' && !lista.items.length ? (
        <PantallaCargaPortal
          enSeccion
          estado="error"
          mensaje={mensajeErrorServidor(lista.error)}
          onReintentar={m.reintentar}
        />
      ) : (
        <Card className="overflow-x-auto rounded-xl">
          <Table className="min-w-[880px] table-fixed text-base">
            <TableHeader className="bg-muted">
              <TableRow className="hover:bg-transparent">
                {COLUMNAS.map((c, i) => (
                  <TableHead
                    key={c}
                    scope="col"
                    className={`px-2.5 py-2.5 text-base font-semibold whitespace-normal text-muted-foreground ${i >= 4 ? 'text-center' : ''} ${ANCHOS[i]}`}
                  >
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody aria-busy={m.cargando || undefined}>
              {m.cargando
                ? [0, 1, 2].map((n) => (
                    <TableRow key={n}>
                      <TableCell colSpan={8} className="px-2.5 py-3">
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : lista?.items.map((fila) => (
                    <Fila key={fila.codigo} fila={fila} m={m} favoritosLeyenda={lista.favoritosLeyenda} />
                  ))}
            </TableBody>
          </Table>
          {!m.cargando && lista?.items.length === 0 && (
            <p className="p-6 text-muted-foreground">No hay entrevistas publicadas con estos filtros.</p>
          )}
        </Card>
      )}
      {lista && lista.items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Mostrando {lista.items.length} de {lista.total}
          </span>
          {(m.hayMas || m.cargandoMas) && (
            <Button variant="outline" className="min-h-11" disabled={m.cargandoMas} onClick={m.mostrarMas}>
              {m.cargandoMas && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Mostrar más
            </Button>
          )}
        </div>
      )}
      {lista?.estado === 'error' && lista.items.length > 0 && (
        <p role="alert" className="text-sm text-danger-text">
          {mensajeErrorServidor(lista.error)}{' '}
          <Button variant="link" onClick={m.reintentar}>
            Reintentar
          </Button>
        </p>
      )}
    </div>
  )
}
