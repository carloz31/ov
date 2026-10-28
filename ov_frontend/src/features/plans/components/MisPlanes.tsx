import { Link } from 'react-router'
import { CircleAlert, Eye } from 'lucide-react'
import { useReturnFocus } from '@/hooks/useReturnFocus'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { PantallaCarga } from '@/components/student/PantallaCarga'
import { appPaths } from '@/routes/paths'
import { useMisPlanes } from '../hooks/useMisPlanes'
import { AvisoPlan } from './AvisoPlan'
import { DialogoCrearPlan } from './DialogoCrearPlan'
import { TarjetaPlan } from './TarjetaPlan'
import '../styles/planes.css'

// Un espacio libre, compacto. Solo el primero lleva «Desde mis favoritos» y «Buscar en el catálogo».
function EspacioPlan({
  letra,
  conAcciones,
  onCrear,
}: {
  letra: string
  conAcciones: boolean
  onCrear: () => void
}) {
  return (
    <section className="sx-d-empty-plan sx-p-espacio">
      <div className="sx-p-tarjeta-cabecera">
        <span className="sx-d-plan-letter" data-position={'ABC'.indexOf(letra)}>
          {letra}
        </span>
        <div>
          <h2>Espacio para tu plan {letra}</h2>
          {conAcciones && <p>Otra opción a la mano también es parte de decidir.</p>}
        </div>
      </div>
      {conAcciones && (
        <div className="sx-p-tarjeta-acciones">
          <button type="button" className="sx-d-action sx-d-action-gold" onClick={onCrear}>
            Desde mis favoritos
          </button>
          <Link className="sx-d-action sx-d-action-ghost" to={appPaths.student.catalog.careers}>
            Buscar en el catálogo
          </Link>
        </div>
      )}
    </section>
  )
}

// F07a · ajuste v4.2 (F07b-pantallas §2): Mis planes con los planes del servidor. El plan A es la tarjeta
// principal; B y C, «Rutas alternas» compactas a la derecha, con los espacios libres al final. Aviso de misma
// familia; crear desde favoritas, «Subir prioridad» (con confirmación) y eliminar. Ajuste: «Ruta principal» sobre
// el plan A, que ocupa el mismo alto que las rutas alternas.
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
  const { planes, opcion_inicial, avisos } = v.datos
  // Cada confirmación queda ocupada solo por su acción.
  const eliminando = !!v.ocupado?.startsWith('eliminar:'),
    subiendo = !!v.ocupado?.startsWith('ordenar:')
  const espacio = (i: number) => (
    <EspacioPlan key={i} letra={'ABC'[i]} conAcciones={i === planes.length} onCrear={v.abrirCrear} />
  )
  const tarjeta = (i: number) => (
    <TarjetaPlan
      key={planes[i].carrera.codigo}
      plan={planes[i]}
      indice={i}
      principal={i === 0}
      primerInteres={planes[i].carrera.codigo === opcion_inicial?.codigo}
      ocupado={!!v.ocupado}
      onEliminar={() => v.pedirEliminar(planes[i].carrera.codigo)}
      onSubir={() => v.pedirSubir(planes[i].carrera.codigo)}
    />
  )
  return (
    <>
      <header className="sx-d-header">
        <div>
          <h1>Mis planes</h1>
          <p>
            Las opciones que estás considerando para después del colegio. Ninguna es definitiva: puedes
            cambiarlas cuando quieras.
          </p>
        </div>
      </header>
      {avisos.map((aviso) => (
        <p className="sx-p-aviso" role="note" key={aviso.familia.codigo}>
          <CircleAlert aria-hidden="true" />
          <span>
            Tus planes {aviso.planes.join(' y ')} son de la misma familia,{' '}
            <strong>{aviso.familia.nombre}</strong>. Tener una alternativa en otra área también puede ayudarte
            a decidir. <Link to={appPaths.student.catalog.careers}>Explorar otras áreas</Link>
          </span>
        </p>
      ))}
      <div className="sx-p-mis-planes">
        <section className="sx-p-principal" aria-labelledby="sx-p-principal-titulo">
          <h2 id="sx-p-principal-titulo" className="sx-p-fila-titulo">
            Ruta principal
          </h2>
          {planes[0] ? tarjeta(0) : espacio(0)}
        </section>
        <section className="sx-p-alternas" aria-labelledby="sx-p-alternas-titulo">
          <h2 id="sx-p-alternas-titulo" className="sx-p-fila-titulo">
            Rutas alternas
          </h2>
          {[1, 2].map((i) => (planes[i] ? tarjeta(i) : espacio(i)))}
        </section>
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
      <Dialog open={!!v.porEliminar} onOpenChange={(open) => !open && !eliminando && v.pedirEliminar(null)}>
        <DialogContent {...focus} className="sx-root sx-d-dialog">
          <DialogHeader>
            <DialogTitle>
              ¿Eliminar el plan {v.porEliminar?.prioridad} · {v.porEliminar?.carrera.nombre}?
            </DialogTitle>
            <DialogDescription>
              Lo que escribiste queda guardado: si vuelves a crearlo desde tus favoritos, lo recuperas tal
              como estaba.
            </DialogDescription>
          </DialogHeader>
          <div className="sx-d-actions">
            <button
              type="button"
              className="sx-d-action sx-d-action-ghost"
              disabled={eliminando}
              onClick={() => v.pedirEliminar(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="sx-d-action"
              aria-busy={eliminando}
              disabled={eliminando}
              onClick={() => void v.confirmarEliminar()}
            >
              {eliminando ? 'Guardando…' : 'Eliminar plan'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!v.porSubir} onOpenChange={(open) => !open && !subiendo && v.pedirSubir(null)}>
        <DialogContent {...focus} className="sx-root sx-d-dialog">
          <DialogHeader>
            <DialogTitle>
              ¿Subir {v.porSubir?.carrera.nombre} al plan {v.planArriba?.prioridad}?
            </DialogTitle>
            <DialogDescription>
              {v.porSubir?.carrera.nombre} pasa a ser tu plan {v.planArriba?.prioridad} y{' '}
              {v.planArriba?.carrera.nombre} baja al plan {v.porSubir?.prioridad}. Puedes cambiarlo cuando
              quieras.
            </DialogDescription>
          </DialogHeader>
          <div className="sx-d-actions">
            <button
              type="button"
              className="sx-d-action sx-d-action-ghost"
              disabled={subiendo}
              onClick={() => v.pedirSubir(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="sx-d-action"
              aria-busy={subiendo}
              disabled={subiendo}
              onClick={() => void v.confirmarSubir()}
            >
              {subiendo ? 'Guardando…' : 'Subir prioridad'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <AvisoPlan aviso={v.aviso} onDismiss={v.cerrarAviso} />
    </>
  )
}
