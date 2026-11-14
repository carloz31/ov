import { Loader2 } from 'lucide-react'
import { Link } from 'react-router'
import { PantallaCargaPortal } from '@/components/staff/PantallaCargaPortal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import type { TablaInteres as Tabla } from '@/features/counselor/hooks/usePanelSalon'
import { useListaInteres } from '@/features/counselor/hooks/useListaInteres'
import { nombresFormacion, nombresTipoInstitucionPanel } from '@/lib/servidor/adaptadoresPanel'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { PanelVerEstudiantes } from './PanelVerEstudiantes'
import { TablaInteres } from './TablaInteres'

const TEXTOS = {
  areas: {
    titulo: 'Todas las áreas de interés',
    subtitulo:
      'Cada fila cuenta estudiantes del salón. Pulse una cabecera para ordenar toda la lista por esa columna.',
    nombre: 'Área y carreras',
    filtro: 'Tipo de formación',
    conjunto: 'area',
  },
  instituciones: {
    titulo: 'Todas las instituciones de interés',
    subtitulo:
      'Cada fila cuenta estudiantes del salón; una institución repetida en varios planes del mismo estudiante cuenta una vez. Pulse una cabecera para ordenar toda la lista.',
    nombre: 'Institución',
    filtro: 'Tipo de institución',
    conjunto: 'institucion',
  },
} as const

// Ajuste panel-salon §5.4 (bocetos 03 y 04): la tabla completa, paginada con «Mostrar más».
export function ListaInteresCompleta({ tabla }: { tabla: Tabla }) {
  const l = useListaInteres(tabla)
  const textos = TEXTOS[tabla]
  const nombresTipo = tabla === 'areas' ? nombresFormacion : nombresTipoInstitucionPanel
  const lista = l.lista
  const pie =
    tabla === 'areas'
      ? `${lista?.total ?? 0} áreas con al menos un estudiante interesado. «Total interesados» suma los que la tienen en un plan y los que solo la guardaron en favoritos.`
      : `${lista?.total ?? 0} instituciones con al menos un estudiante interesado. ${lista?.planASinInstitucion ?? 0} estudiantes con Plan A aún no eligen institución.`
  return (
    <main className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-7">
      <Link
        to={l.modelo.enlaceVolver}
        className="inline-flex min-h-11 items-center font-semibold text-primary"
      >
        ← Volver a Intereses del salón
      </Link>
      <Card className="flex min-w-0 flex-col gap-4 rounded-xl border-t-4 border-t-primary p-5 sm:p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">{textos.titulo}</h1>
          <p className="text-sm text-muted-foreground">{textos.subtitulo}</p>
        </header>
        <div className="flex flex-wrap gap-2">
          <Input
            value={l.texto}
            onChange={(evento) => l.buscarTexto(evento.target.value)}
            placeholder="Buscar por nombre"
            aria-label="Buscar por nombre"
            className="min-h-11 min-w-0 flex-1"
          />
          <Select value={l.tipo || 'todos'} onValueChange={l.elegirTipo}>
            <SelectTrigger aria-label={textos.filtro} className="min-h-11 w-full bg-card sm:w-64">
              <SelectValue>
                {textos.filtro}: {l.tipo ? nombresTipo[l.tipo].toLocaleLowerCase('es') : 'todas'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {(lista?.tipos ?? []).map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {nombresTipo[tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {lista?.estado === 'error' && !lista.items.length ? (
          <PantallaCargaPortal
            enSeccion
            estado="error"
            mensaje={mensajeErrorServidor(lista.error)}
            onReintentar={l.reintentar}
          />
        ) : !lista || lista.estado === 'cargando' ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <TablaInteres
            filas={lista.items}
            columnas={['en_planes', 'plan_a', 'solo_favoritos', 'total']}
            tituloNombre={textos.nombre}
            orden={l.orden}
            onOrdenar={(columna) => l.modelo.ordenar(tabla, columna)}
            onVer={(fila) =>
              l.modelo.abrirVer({ titulo: fila.nombre, conjunto: textos.conjunto, valor: fila.codigo })
            }
            etiquetaVer="Ver estudiantes"
          />
        )}
        {lista?.estado === 'error' && lista.items.length > 0 && (
          <p role="alert" className="text-sm text-danger-text">
            {mensajeErrorServidor(lista.error)}{' '}
            <Button variant="link" className="px-0" onClick={l.reintentar}>
              Reintentar
            </Button>
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{pie}</p>
          {(l.hayMas || lista?.estado === 'mas') && (
            <Button
              variant="outline"
              className="min-h-11"
              onClick={l.mostrarMas}
              disabled={lista?.estado === 'mas'}
            >
              {lista?.estado === 'mas' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Mostrar más
            </Button>
          )}
        </div>
      </Card>
      <PanelVerEstudiantes
        pedido={l.modelo.ver}
        salon={l.modelo.salonServidor}
        onCerrar={l.modelo.cerrarVer}
      />
    </main>
  )
}
