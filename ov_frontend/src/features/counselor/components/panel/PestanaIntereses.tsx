import { Link } from 'react-router'
import { PantallaCargaPortal } from '@/components/staff/PantallaCargaPortal'
import { Button } from '@/components/ui/Button'
import type { ModeloPanelSalon } from '@/features/counselor/hooks/usePanelSalon'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { useInteresesPanel } from '@/store/servidor/panel'
import { BloquePanel } from './PanelComun'
import { Complicaciones, PlanesFrenteTest, TipoFormacion } from './ResumenIntereses'
import { TablaInteres } from './TablaInteres'

// Ajuste panel-salon §5: lo que el salón está considerando. El orden de cada tabla lo aplica el servidor sobre
// toda la lista antes de cortar el top.
export function PestanaIntereses({ modelo }: { modelo: ModeloPanelSalon }) {
  const { carga, reintentar } = useInteresesPanel(
    modelo.salonServidor,
    modelo.ordenAreas,
    modelo.ordenInstituciones,
  )
  const datos = carga?.datos
  if (!datos)
    return (
      <PantallaCargaPortal
        enSeccion
        estado={carga?.estado === 'error' ? 'error' : 'cargando'}
        mensaje={mensajeErrorServidor(carga?.error ?? null)}
        onReintentar={reintentar}
      />
    )
  const { areas, instituciones } = datos
  return (
    <div className="space-y-6">
      {carga?.estado === 'error' && (
        <p role="alert" className="text-sm text-danger-text">
          {mensajeErrorServidor(carga.error)} Se muestran los últimos datos cargados.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Lo que el salón está considerando hoy:{' '}
        <strong>{datos.con_planes} estudiantes ya tienen planes</strong> y {datos.con_favoritos} guardaron
        favoritos. Todos los números cuentan estudiantes, no planes. «Solo en favoritos» son estudiantes que
        la guardaron pero todavía no la tienen en un plan.
      </p>
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
        <BloquePanel
          titulo="Áreas que más interesan"
          subtitulo="Carreras parecidas van juntas, para pensar un taller o una charla por área."
        >
          <TablaInteres
            filas={areas.filas}
            columnas={['en_planes', 'plan_a', 'solo_favoritos']}
            tituloNombre="Área y carreras"
            orden={modelo.ordenAreas}
            onOrdenar={(columna) => modelo.ordenar('areas', columna)}
            onVer={(fila) => modelo.abrirVer({ titulo: fila.nombre, conjunto: 'area', valor: fila.codigo })}
          />
          <PieTabla
            texto={`Las ${areas.filas.length} primeras de ${areas.total}, según la columna elegida.`}
            enlace={modelo.enlaceLista('areas')}
            boton="Ver todas las áreas"
          />
        </BloquePanel>
        <BloquePanel
          titulo="Instituciones que más consideran"
          subtitulo="Útil para proponer visitas o invitar a una charla informativa."
        >
          <TablaInteres
            filas={instituciones.filas}
            columnas={['en_planes', 'solo_favoritos']}
            tituloNombre="Institución"
            orden={modelo.ordenInstituciones}
            onOrdenar={(columna) => modelo.ordenar('instituciones', columna)}
            onVer={(fila) =>
              modelo.abrirVer({ titulo: fila.nombre, conjunto: 'institucion', valor: fila.codigo })
            }
          />
          <PieTabla
            texto={`Las ${instituciones.filas.length} primeras de ${instituciones.total}. ${instituciones.plan_a_sin_institucion} estudiantes con Plan A aún no eligen institución.`}
            enlace={modelo.enlaceLista('instituciones')}
            boton="Ver todas las instituciones"
          />
        </BloquePanel>
      </div>
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-3">
        <TipoFormacion datos={datos} />
        <Complicaciones datos={datos} />
        <PlanesFrenteTest datos={datos} onVer={modelo.abrirVer} />
      </div>
    </div>
  )
}

function PieTabla({ texto, enlace, boton }: { texto: string; enlace: string; boton: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
      <p className="text-sm text-muted-foreground">{texto}</p>
      <Button asChild variant="outline" className="min-h-11">
        <Link to={enlace}>{boton}</Link>
      </Button>
    </div>
  )
}
