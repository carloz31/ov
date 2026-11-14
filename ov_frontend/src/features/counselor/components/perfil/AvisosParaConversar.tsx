import { Button } from '@/components/ui/Button'
import { BloquePanel } from '@/features/counselor/components/panel/PanelComun'
import { enlaceDestino } from '@/lib/servidor/adaptadoresPanelEstudiante'
import type { DestinoPerfil, GrupoAvisosPerfil, TemaPerfil } from '@/types/servidor'

// Ajuste panel-estudiantes §6 (boceto 06): «Avisos» (tarjeta crema, solo si tiene) y «Para conversar».
const BOTON_AVISO: Record<DestinoPerfil, string> = {
  TESTS: 'Ver test',
  PLANES: 'Ver planes',
  RESPUESTAS: 'Ver respuestas',
  AVANCE: 'Ver avance',
}

export function AvisosParaConversar({
  avisos,
  temas,
  nombre,
  onIr,
}: {
  avisos: GrupoAvisosPerfil[]
  temas: TemaPerfil[]
  nombre: string
  onIr: (destino: DestinoPerfil) => void
}) {
  return (
    <>
      {avisos.length > 0 && (
        <section
          aria-labelledby="titulo-avisos"
          className="space-y-4 rounded-xl border border-warning-border bg-warning-soft p-5 sm:p-6"
        >
          <h2 id="titulo-avisos" className="text-lg font-bold">
            Avisos
          </h2>
          {avisos.map((grupo) => (
            <div key={grupo.codigo} className="space-y-2">
              <h3 className="border-b border-warning-border pb-1 text-xs font-bold uppercase tracking-wide text-warning-text">
                {grupo.nombre}
              </h3>
              {grupo.avisos.map((a) => (
                <div key={a.codigo} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{a.nombre}</p>
                    {a.descripcion && <p className="text-sm text-warning-text">{a.descripcion}</p>}
                  </div>
                  {a.destino && (
                    <Button variant="outline" className="min-h-11 bg-card" onClick={() => onIr(a.destino!)}>
                      {BOTON_AVISO[a.destino]}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </section>
      )}
      <BloquePanel
        titulo="Para conversar"
        subtitulo={`Puntos que la plataforma encontró en lo que ${nombre} registró. No son problemas: son entradas para la conversación.`}
      >
        {temas.length ? (
          <ul className="divide-y divide-border">
            {temas.map((t) => (
              <li key={t.codigo} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <p className="min-w-0 flex-1">{t.texto}</p>
                {t.destino && (
                  <Button
                    variant="link"
                    className="min-h-11 px-2 font-semibold"
                    onClick={() => onIr(t.destino!)}
                  >
                    {enlaceDestino[t.destino]}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            Todavía no hay puntos para conversar. Aparecerán cuando registre sus planes y responda sus
            cuestionarios.
          </p>
        )}
      </BloquePanel>
    </>
  )
}
