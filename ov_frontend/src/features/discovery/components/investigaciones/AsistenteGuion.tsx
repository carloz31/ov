import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/Skeleton'
import { appPaths } from '@/routes/paths'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { useGuionInvestigacion, type PasoGuion } from '../../hooks/useGuionInvestigacion'
import { usePreguntasGuion } from '../../hooks/usePreguntasGuion'
import { AvisoInvestigaciones } from './AvisoInvestigaciones'
import { PasoGuiaLista } from './PasoGuiaLista'
import { PasoLoQuePienso } from './PasoLoQuePienso'
import { PasoMisPreguntas } from './PasoMisPreguntas'
import '../../styles/investigaciones.css'

const PASOS: [PasoGuion, string][] = [
  [1, 'Lo que pienso'],
  [2, 'Mis preguntas'],
  [3, 'Guía lista'],
]

// F09 (bocetos 09–11): el asistente del guion con su stepper; los pasos ya completados llevan el punto dorado.
export function AsistenteGuion() {
  const m = useGuionInvestigacion()
  const p = usePreguntasGuion(m.datos, m.paso === 2, () => m.irA(3))
  const completado = (paso: PasoGuion) =>
    paso === 1 ? !!m.enCurso : paso === 2 ? m.enCurso?.estado === 'GUIA_LISTA' : false
  return (
    <>
      <Link className="sx-i-volver" to={appPaths.student.investigations}>
        <ArrowLeft aria-hidden="true" size={18} /> Volver a Investigaciones
      </Link>
      <nav className="sx-i-stepper" aria-label="Pasos del guion">
        {PASOS.map(([paso, texto]) => (
          <button
            key={paso}
            type="button"
            aria-current={m.paso === paso ? 'step' : undefined}
            data-hecho={(completado(paso) && m.paso !== paso) || undefined}
            disabled={!m.permitido(paso) || p.ocupado || m.guardando}
            onClick={async () => {
              if (m.paso === paso) return
              if (m.paso === 2 && !(await p.guardarAlVolver())) return
              m.irA(paso)
            }}
          >
            {texto}
          </button>
        ))}
      </nav>
      {!m.datos ? (
        m.estado === 'error' ? (
          <section className="sx-i-error" role="alert">
            <p>{mensajeErrorServidor(m.error)}</p>
            <button type="button" className="sx-i-boton" onClick={m.reintentar}>
              Reintentar
            </button>
          </section>
        ) : (
          <div className="sx-i-esqueleto" aria-busy="true">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )
      ) : m.paso === 1 ? (
        <PasoLoQuePienso m={m} />
      ) : m.paso === 2 ? (
        <PasoMisPreguntas
          p={p}
          ocupacion={m.enCurso?.ocupacion.titulo ?? ''}
          onVolver={async () => {
            if (await p.guardarAlVolver()) m.irA(1)
          }}
        />
      ) : (
        m.enCurso && <PasoGuiaLista datos={m.datos} onEditar={() => m.irA(2)} />
      )}
      <AvisoInvestigaciones />
    </>
  )
}
