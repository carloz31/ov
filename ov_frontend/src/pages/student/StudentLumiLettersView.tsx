import { ArrowLeft, BookOpen, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { appPaths } from '@/routes/paths'
import { AvisoToast } from '@/components/student/AvisoToast'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { useCartasLumi, type BandejaVista } from '@/features/journal/hooks/useCartasLumi'
import { FilaCarta } from '@/features/journal/components/FilaCarta'
import { FilaCartaCompacta } from '@/features/journal/components/FilaCartaCompacta'
import { BotonActualizar } from '@/features/journal/components/BotonActualizar'
import '@/features/journal/styles/journal.css'

const chips: [BandejaVista, string][] = [
  ['PENDIENTE', 'Por responder'],
  ['RESPONDIDA', 'Respondidas'],
  ['ARCHIVADA', 'Archivadas'],
]

// Ajuste del diario (F05): todas las cartas de Lumi, por bandeja. En local, solo las por responder.
function StudentLumiLettersView() {
  const c = useCartasLumi()
  const lista = c.enBandeja(c.bandeja)
  return (
    <DiscoveryStage ambient="journal">
      {c.aviso && (
        <AvisoToast
          key={c.aviso.id}
          icono={c.aviso.error ? TriangleAlert : BookOpen}
          etiqueta="Mi diario"
          titulo={c.aviso.titulo}
          descripcion={c.aviso.descripcion}
          onDismiss={c.cerrarAviso}
        />
      )}
      <Link className="sx-d-back" to={appPaths.student.journal}>
        <ArrowLeft aria-hidden="true" />
        Volver al diario
      </Link>
      <header className="sx-d-header">
        <div>
          <h1>Cartas de Lumi</h1>
          <p>
            Todas las cartas que Lumi te ha dejado en el camino. Las que ya respondiste están en tu cuaderno.
          </p>
        </div>
      </header>
      <section className="sx-j-cartas" aria-label="Cartas de Lumi">
        {c.conBandejas && (
          <div className="sx-j-cartas-chips" role="group" aria-label="Filtrar cartas">
            {chips.map(([valor, etiqueta]) => (
              <button
                type="button"
                key={valor}
                aria-pressed={c.bandeja === valor}
                onClick={() => c.setBandeja(valor)}
              >
                {`${etiqueta} · ${c.conteos[valor]}`}
              </button>
            ))}
          </div>
        )}
        <div className="sx-j-cartas-head">
          <h2>{chips.find(([valor]) => valor === c.bandeja)?.[1]}</h2>
          {c.conBandejas && c.bandeja === 'PENDIENTE' && <BotonActualizar {...c.buzon.actualizar} />}
        </div>
        {lista.length ? (
          <ul className="sx-j-buzon-list">
            {c.bandeja === 'PENDIENTE'
              ? lista.map((carta) => (
                  <FilaCarta
                    key={carta.codigo}
                    carta={carta}
                    ahora={c.ahora}
                    redactando={c.buzon.enRedaccion.includes(carta.codigo)}
                    acciones={{
                      onResponder: c.responder,
                      onAbrir: c.buzon.abrir,
                      onArchivar: c.buzon.archivar,
                    }}
                    completa
                  />
                ))
              : lista.map((carta) => (
                  <FilaCartaCompacta
                    key={carta.codigo}
                    carta={carta}
                    onLeer={c.bandeja === 'RESPONDIDA' ? c.leer : undefined}
                    onDesarchivar={c.bandeja === 'ARCHIVADA' ? c.desarchivar : undefined}
                  />
                ))}
          </ul>
        ) : (
          <p className="sx-j-empty">
            {c.bandeja === 'PENDIENTE'
              ? 'Lumi te dejará una carta al terminar tu próxima actividad.'
              : 'Aún no hay cartas aquí.'}
          </p>
        )}
      </section>
    </DiscoveryStage>
  )
}

export { StudentLumiLettersView }
