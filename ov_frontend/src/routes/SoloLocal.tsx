import { modoApi } from '@/config/env'

function SoloLocal({ children }: { children: React.ReactNode }) {
  return modoApi ? (
    <section className="sx-glass sx-player-card">
      <p>Disponible en una próxima iteración.</p>
    </section>
  ) : (
    children
  )
}

export { SoloLocal }
