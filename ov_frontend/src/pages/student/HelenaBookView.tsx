import { HelenaBookPages } from '@/features/discovery/components/HelenaBookPages'
import { useHelenaPages } from '@/features/discovery/hooks/useHelenaPages'
import { Eye } from 'lucide-react'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { Seal } from '@/components/student/Seal'
import '@/features/discovery/styles/helena-book.css'

export function HelenaBookView() {
  const model = useHelenaPages()
  const { pages } = model

  return (
    <DiscoveryStage ambient="profile">
      <div className="sx-d-helena-book">
        <header className="sx-d-header">
          <div>
            <h1>El libro de Helena</h1>
            <p>Lo que Helena va descubriendo de ti</p>
          </div>
          <div>
            <strong>{pages.filter((p) => p.state === 'revealed').length} de 3 páginas descifradas</strong>
            <div className="sx-d-seal-row">
              {pages.map((p) => (
                <Seal key={p.id} state={p.state}>
                  {p.numeral}
                </Seal>
              ))}
            </div>
          </div>
        </header>
        <HelenaBookPages model={model} />
        <p className="sx-d-privacy">
          <Eye aria-hidden="true" />
          Tu libro lo ven tú y tu orientadora. Tu apoderado solo ve las páginas que ella habilite.
        </p>
      </div>
    </DiscoveryStage>
  )
}
