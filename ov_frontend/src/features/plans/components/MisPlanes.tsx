import { Link } from 'react-router'
import { CircleAlert, Eye, Star } from 'lucide-react'
import { useReturnFocus } from '@/hooks/useReturnFocus'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { PantallaCarga } from '@/components/student/PantallaCarga'
import { appPaths } from '@/routes/paths'
import { useMisPlanes } from '../hooks/useMisPlanes'
import { AvisoPlan } from './AvisoPlan'
import { DialogoCrearPlan } from './DialogoCrearPlan'
import { TarjetaPlan } from './TarjetaPlan'
import '../styles/planes.css'

// F07a (F07-pantallas §2): Mis planes con los planes del servidor. Tres espacios A, B y C; el aviso de misma
// familia; crear desde favoritas, ordenar y eliminar.
export function MisPlanes() {
  const focus = useReturnFocus()
  const v = useMisPlanes()
  if (!v.datos)
    return (
      <PantallaCarga
        estado={v.estado === 'error' ? 'error' : 'cargando'}
        titulo="Abriendo tus planes"
        frase="Lumi está buscando tus tarjetas…"
        mensaje={v.mensajeError}
        onReintentar={v.reintentar}
        enSeccion
      />
    )
  const { planes, opciones, opcion_inicial, maximo_planes, avisos } = v.datos
  const primerVacio = planes.length
  return (
    <>
      <header className="sx-d-header">
        <div>
          <h1>Mis planes</h1>
          <p>
            Las opciones que estás considerando para después del colegio. Ninguna es definitiva: puedes cambiarlas
            cuando quieras.
          </p>
        </div>
        <strong>
          <Star aria-hidden="true" />
          {v.listos} de {maximo_planes} planes listos para comparar
        </strong>
      </header>
      {avisos.map((aviso) => (
        <p className="sx-p-aviso" role="note" key={aviso.familia.codigo}>
          <CircleAlert aria-hidden="true" />
          <span>
            Tus planes {aviso.planes.join(' y ')} son de la misma familia, <strong>{aviso.familia.nombre}</strong>.
            Tener una alternativa en otra área también puede ayudarte a decidir.{' '}
            <Link to={appPaths.student.catalog.careers}>Explorar otras áreas</Link>
          </span>
        </p>
      ))}
      <div className="sx-d-columns">
        {[0, 1, 2].map((i) =>
          planes[i] ? (
            <TarjetaPlan
              key={planes[i].carrera.codigo}
              plan={planes[i]}
              indice={i}
              total={planes.length}
              primerInteres={planes[i].carrera.codigo === opcion_inicial?.codigo}
              opciones={opciones}
              ocupado={!!v.ocupado}
              onEliminar={() => v.pedirEliminar(planes[i].carrera.codigo)}
              onMover={(direccion) => void v.mover(planes, i, direccion)}
            />
          ) : (
            <section className="sx-d-empty-plan" key={i}>
              <span className="sx-d-plan-letter" data-position={i}>
                {'ABC'[i]}
              </span>
              <h2>Espacio para tu plan {'ABC'[i]}</h2>
              {i === primerVacio && (
                <>
                  <p>
                    Tener otra opción a la mano también es parte de decidir. Puedes partir de una carrera que
                    marcaste como favorita.
                  </p>
                  <button type="button" className="sx-d-action sx-d-action-gold" onClick={v.abrirCrear}>
                    Desde mis favoritos
                  </button>
                  <Link className="sx-d-action sx-d-action-ghost" to={appPaths.student.catalog.careers}>
                    Buscar en el catálogo
                  </Link>
                </>
              )}
            </section>
          ),
        )}
      </div>
      <p className="sx-d-privacy">
        <Eye aria-hidden="true" />
        Tus planes los ven tú y tu orientadora. Tus compañeros no los ven.
      </p>
      <DialogoCrearPlan
        abierto={v.creando}
        letra={v.letraLibre}
        carreras={v.favoritas}
        planes={planes}
        ocupado={v.ocupado}
        onCrear={(carrera) => void v.crearDesdeDialogo(carrera)}
        onCerrar={v.cerrarCrear}
      />
      <Dialog open={!!v.porEliminar} onOpenChange={(open) => !open && v.pedirEliminar(null)}>
        <DialogContent {...focus} className="sx-root sx-d-dialog">
          <DialogHeader>
            <DialogTitle>
              ¿Eliminar el plan {v.porEliminar?.prioridad} · {v.porEliminar?.carrera.nombre}?
            </DialogTitle>
            <DialogDescription>
              Se borrará lo que escribiste en sus secciones. Podrás volver a crearlo desde tus favoritos.
            </DialogDescription>
          </DialogHeader>
          <div className="sx-d-actions">
            <button type="button" className="sx-d-action sx-d-action-ghost" onClick={() => v.pedirEliminar(null)}>
              Cancelar
            </button>
            <button type="button" className="sx-d-action" onClick={() => void v.confirmarEliminar()}>
              Eliminar plan
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <AvisoPlan aviso={v.aviso} onDismiss={v.cerrarAviso} />
    </>
  )
}
