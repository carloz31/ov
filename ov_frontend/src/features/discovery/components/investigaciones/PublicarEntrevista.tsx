import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/Skeleton'
import { noDisponible } from '@/lib/servidor/adaptadoresInvestigaciones'
import { appPaths } from '@/routes/paths'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { usePublicarEntrevista } from '../../hooks/usePublicarEntrevista'
import { AvisoInvestigaciones } from './AvisoInvestigaciones'
import { FormularioPublicar } from './FormularioPublicar'
import '../../styles/investigaciones.css'

// F09 (boceto 04): publicar (o editar la ficha) con la vista previa de la tarjeta y qué pasa al publicar.
export function PublicarEntrevista() {
  const m = usePublicarEntrevista()
  const autores = [
    'Tú',
    ...m.autoresActuales.filter((a) => a.codigo !== m.cuenta).map((a) => a.nombre),
    ...m.coautores.map((a) => a.nombre),
  ]
  return (
    <>
      <Link className="sx-i-volver" to={m.volver}>
        <ArrowLeft aria-hidden="true" size={18} />{' '}
        {m.editar ? 'Volver a tu entrevista' : 'Volver a Investigaciones'}
      </Link>
      {m.cargando ? (
        <div className="sx-i-esqueleto" aria-busy="true">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : m.errorCarga ? (
        <section className="sx-i-error" role="alert">
          <p>{noDisponible(m.errorCarga) ?? mensajeErrorServidor(m.errorCarga)}</p>
          {noDisponible(m.errorCarga) && (
            <Link className="sx-i-boton" to={`${appPaths.student.investigations}?vista=mias`}>
              Ir a Mis investigaciones
            </Link>
          )}
        </section>
      ) : !m.disponible ? (
        <section className="sx-i-error">
          <p>
            {m.editar
              ? 'Solo los autores pueden editar la ficha de esta entrevista.'
              : m.sinInvestigacion
                ? 'No tienes una investigación en curso. Si un compañero publicó contigo como coautor, la entrevista ya está en Mis investigaciones.'
                : 'Para publicar necesitas terminar tu guion: la guía lista es el paso previo a entrevistar.'}
          </p>
          <Link
            className="sx-i-boton"
            to={
              m.editar
                ? appPaths.student.investigations
                : m.sinInvestigacion
                  ? `${appPaths.student.investigations}?vista=mias`
                  : appPaths.student.investigationGuide()
            }
          >
            {m.editar
              ? 'Ir a Investigaciones'
              : m.sinInvestigacion
                ? 'Ir a Mis investigaciones'
                : 'Ir a mi guion'}
          </Link>
        </section>
      ) : (
        <div className="sx-i-asistente" data-columnas="publicar">
          <FormularioPublicar m={m} />
          <aside className="sx-i-lateral">
            <section className="sx-i-panel">
              <p className="sx-i-kicker">Así se verá tu tarjeta</p>
              <div className="sx-i-previa-banda" aria-hidden="true" />
              <p className="sx-i-kicker">Entrevista · {m.ocupacion?.titulo}</p>
              <h3 data-vacio={!m.ficha.titulo.trim() || undefined}>
                {m.ficha.titulo.trim() || '[Título de tu entrevista]'}
              </h3>
              <p className="sx-i-meta">
                {m.ficha.profesional.trim() || '[Profesional]'} · {m.ficha.duracion.trim() || '[Duración]'}
              </p>
              <p className="sx-i-meta">{m.ficha.resumen.trim() || '[En pocas palabras…]'}</p>
              <p className="sx-i-meta">
                Por{' '}
                {autores.map((nombre, i) => (
                  <span key={nombre}>
                    {i > 0 && (i === autores.length - 1 ? ' y ' : ', ')}
                    <strong>{nombre}</strong>
                  </span>
                ))}
              </p>
            </section>
            <section className="sx-i-panel sx-i-panel-nota">
              <h3>{m.editar ? 'Al guardar' : 'Al publicar'}</h3>
              <p>
                {m.editar
                  ? 'Tus compañeros verán la ficha actualizada. Los coautores que agregues la reciben como suya.'
                  : 'Tu salón y tu orientadora la verán de inmediato. Si es tu primera entrevista, en la Ciudad se abre una misión para contrastar lo que pensabas con lo que descubriste.'}
              </p>
              <small>
                Los coautores reciben la entrevista como suya, con los mismos permisos: editar la ficha o
                retirarla.
              </small>
            </section>
          </aside>
        </div>
      )}
      <AvisoInvestigaciones />
    </>
  )
}
