import { Link } from 'react-router'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { Progress } from '@/components/ui/Progress'

const ENCONTRARA = [
  {
    titulo: 'Una carta para su hijo o hija',
    texto:
      'Antes de los temas, le pedimos escribir unas líneas que él o ella leerá en algún momento del camino.',
  },
  {
    titulo: 'Temas, dos miradas',
    texto: 'Responden por separado; luego ven la respuesta del otro y una guía para conversar.',
  },
  {
    titulo: 'Un regalo al final',
    texto: 'Al conversar todos los temas se rompe un sello. Qué hay detrás, lo descubrirá entonces.',
  },
]

// F08 (A1): Conversaciones cerrada para el apoderado. El avance de su ruta y lo que falta, con el enlace a Mis
// actividades; debajo, lo que encontrará (sin decir que el regalo es una carta). Sin diálogo de Lumi.
export function BloqueoConversaciones({
  completadas,
  total,
  siguiente,
  rutaActividades,
}: {
  completadas: number
  total: number
  siguiente: { titulo: string; minutos: number } | null
  rutaActividades: string
}) {
  return (
    <div className="fam fam--apoderado">
      <section className="fam-container fam-card">
        <p className="fam-kicker">Conversaciones en familia</p>
        <h2 className="fam-bloqueo-titulo">Dos miradas, una conversación</h2>
        <p>
          Temas para conversar con su hijo o hija sobre su decisión vocacional. Cada uno responde por separado
          y, cuando están las dos respuestas, la plataforma les da una guía para hablar en casa.
        </p>
        <div className="fam-bloqueo-portal">
          <span className="fam-bloqueo-candado">
            <LockKeyhole aria-hidden="true" size={36} />
          </span>
          <div>
            <h3>Se abre al terminar sus actividades</h3>
            <p>
              Primero le pedimos unas lecturas cortas sobre cómo acompañar sin decidir por él o ella. Con eso,
              las conversaciones tendrán mucho más sentido.
            </p>
            <Progress className="my-3 max-w-md" value={total ? (completadas / total) * 100 : 0} />
            <p className="fam-bloqueo-avance">
              {completadas} de {total} actividades completadas
              {siguiente && ` · falta «${siguiente.titulo}» (${siguiente.minutos} min)`}
            </p>
          </div>
          <Link className="fam-btn" to={rutaActividades}>
            Ir a Mis actividades
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
        <ol className="fam-grid-3 fam-lista-limpia">
          {ENCONTRARA.map((item, i) => (
            <li key={item.titulo} className="fam-apagada">
              <h3>
                {i + 1} · {item.titulo}
              </h3>
              <p>{item.texto}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
