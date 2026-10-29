import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/Skeleton'
import { noDisponible } from '@/lib/servidor/adaptadoresInvestigaciones'
import { appPaths } from '@/routes/paths'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { useEntrevistaDetalle } from '../../hooks/useEntrevistaDetalle'
import { AvisoInvestigaciones } from './AvisoInvestigaciones'
import { CabeceraEntrevista } from './CabeceraEntrevista'
import { CaminoLeyenda } from './CaminoLeyenda'
import { ConfirmarInvestigacion } from './ConfirmarInvestigacion'
import { DialogoReaccion } from './DialogoReaccion'
import { DialogoReporte } from './DialogoReporte'
import { ReaccionesEntrevista } from './ReaccionesEntrevista'
import '../../styles/investigaciones.css'

// F09 (bocetos 05–08): el detalle de una entrevista de un compañero o propia, con sus pop ups.
export function DetalleEntrevista() {
  const m = useEntrevistaDetalle()
  const e = m.datos
  const coautores = e?.autores.filter((a) => a.codigo !== m.cuenta).map((a) => a.nombre) ?? []
  const reportando = m.reportando
  return (
    <>
      <Link
        className="sx-i-volver"
        to={
          m.desdeMias || e?.propia
            ? `${appPaths.student.investigations}?vista=mias`
            : appPaths.student.investigations
        }
      >
        <ArrowLeft aria-hidden="true" size={18} />{' '}
        {m.desdeMias || e?.propia ? 'Volver a Mis investigaciones' : 'Volver a Investigaciones'}
      </Link>
      {!e ? (
        m.estado === 'error' ? (
          <section className="sx-i-error" role="alert">
            <p>{noDisponible(m.error) ?? mensajeErrorServidor(m.error)}</p>
            {noDisponible(m.error) ? (
              <Link className="sx-i-boton" to={appPaths.student.investigations}>
                Ir a Investigaciones
              </Link>
            ) : (
              <button type="button" className="sx-i-boton" onClick={m.reintentar}>
                Reintentar
              </button>
            )}
          </section>
        ) : (
          <div className="sx-i-esqueleto" aria-busy="true">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )
      ) : (
        <>
          <CabeceraEntrevista m={m} />
          {e.propia ? (
            <div className="sx-i-en-curso" data-columnas="propia">
              <CaminoLeyenda entrevista={e} />
              <ReaccionesEntrevista m={m} />
            </div>
          ) : (
            <ReaccionesEntrevista m={m} />
          )}
        </>
      )}
      <DialogoReaccion
        abierto={!!m.reaccionando}
        titulo={e?.titulo ?? ''}
        tipos={m.tipos}
        inicial={m.reaccionando === 'nueva' ? null : m.reaccionando}
        ocupado={m.ocupado === 'reaccion'}
        onPublicar={(tipo, comentario) => void m.reaccionar(tipo, comentario)}
        onCerrar={m.cerrarReaccion}
      />
      <DialogoReporte
        abierto={!!reportando}
        contexto={
          reportando?.tipo === 'reaccion'
            ? `Comentario de ${reportando.reaccion.autor.nombre}`
            : 'La entrevista completa'
        }
        ocupado={m.ocupado === 'reporte'}
        onEnviar={(motivo, detalle) => void m.reportar(motivo, detalle)}
        onCerrar={() => m.abrirReporte(null)}
      />
      <ConfirmarInvestigacion
        abierto={!!m.eliminando}
        titulo="¿Eliminar tu reacción?"
        descripcion="Se borra tu reacción y su comentario. Podrás dejar otra cuando quieras."
        confirmar="Eliminar"
        ocupado={m.ocupado === 'eliminar'}
        onConfirmar={() => void m.eliminar()}
        onCerrar={() => m.pedirEliminar(null)}
      />
      <ConfirmarInvestigacion
        abierto={m.retirando}
        titulo="¿Retirar tu entrevista?"
        descripcion={`Se ocultará para todos${coautores.length ? `, también para ${coautores.join(' y ')}` : ''}. Para volver a compartirla, tendrás que publicarla desde cero.`}
        confirmar="Retirar entrevista"
        ocupado={m.ocupado === 'retirar'}
        onConfirmar={() => void m.retirar()}
        onCerrar={() => m.setRetirando(false)}
      />
      <AvisoInvestigaciones />
    </>
  )
}
