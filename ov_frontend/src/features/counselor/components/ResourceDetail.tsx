import { ArrowLeft, ExternalLink, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

import type { AdventureNotice } from '@/types/adventure'

type ResourceMeta = {
  topic: string
  minutes: number
  url: string
  organizer?: string
  modality?: string
  content?: string[]
}
const metadata: Record<string, ResourceMeta> = {
  'changing-work': {
    topic: 'Mundo laboral',
    minutes: 4,
    url: 'https://www.ilo.org/es/temas/empleo',
    content: [
      'El mundo del trabajo cambia, pero no todas las novedades significan que una profesión desaparece. Muchas veces cambian las herramientas, las tareas y los equipos con los que se trabaja.',
      'Lee esta publicación pensando en una pregunta: ¿qué habilidades te gustaría seguir desarrollando sin importar la ruta que elijas? La curiosidad, la comunicación y aprender a aprender aparecen una y otra vez.',
    ],
  },
  'ask-before-choosing': {
    topic: 'Decisiones',
    minutes: 3,
    url: 'https://www.minedu.gob.pe/',
    content: [
      'Elegir no es adivinar el futuro; es hacer buenas preguntas y reunir pistas. Una conversación, una visita o una entrevista pueden mostrarte aspectos que no aparecen en un nombre de carrera.',
      'Puedes anotar las preguntas que más te sirvan y llevarlas a tu siguiente conversación con alguien que trabaje en un área que te interese.',
    ],
  },
  'scholarships-update': {
    topic: 'Formación',
    minutes: 2,
    url: 'https://www.pronabec.gob.pe/',
    content: [
      'Aparecieron nuevas sesiones informativas para entender las alternativas de financiamiento. No necesitas decidir nada hoy: esta es una oportunidad para conocer requisitos, fechas y fuentes confiables.',
      'Si algo no se entiende, anota la pregunta y llévala a orientación o a la sesión informativa.',
    ],
  },
  'future-fair': {
    topic: 'Exploración',
    minutes: 2,
    url: 'https://www.gob.pe/minedu',
    organizer: 'Red local de orientación',
    modality: 'Presencial · ingreso libre',
    content: [
      'En esta feria podrás conversar con instituciones, profesionales y estudiantes. No tienes que llegar con una decisión tomada: llegar con curiosidad y dos o tres preguntas es suficiente.',
      'Te recomendamos recorrer más de un stand y comparar lo que escuchas. A veces una pregunta nueva vale más que una respuesta rápida.',
    ],
  },
  'career-route-forum': {
    topic: 'Decisiones',
    minutes: 2,
    url: 'https://www.gob.pe/minedu',
    organizer: 'Orientación vocacional del colegio',
    modality: 'Presencial · actividad realizada',
    content: [
      'En este foro, egresados y estudiantes compartieron cómo fueron tomando decisiones al terminar el colegio. Hubo rutas universitarias, técnicas y experiencias de emprendimiento.',
      'La idea no era encontrar una ruta correcta para todas las personas, sino escuchar qué preguntas, apoyos y experiencias ayudaron a cada participante.',
    ],
  },
  'science-lab-visit': {
    topic: 'Ciencia',
    minutes: 2,
    url: 'https://www.gob.pe/minedu',
    organizer: 'Centro de ciencias aplicadas',
    modality: 'Presencial · actividad realizada',
    content: [
      'La visita mostró experiencias prácticas de química, biología y tecnología. Las estaciones estuvieron abiertas para que cada estudiante pudiera hacer preguntas a los equipos del laboratorio.',
      'Aunque no hayas marcado interés antes, puedes registrar si asististe y lo que descubriste.',
    ],
  },
  'design-open-house': {
    topic: 'Creatividad',
    minutes: 2,
    url: 'https://www.gob.pe/minedu',
    organizer: 'Instituto de Diseño del Sur',
    modality: 'Presencial · cupos limitados',
    content: [
      'Visita los talleres y prueba pequeñas experiencias de animación, diseño y desarrollo web. Conocer los espacios y conversar con estudiantes ayuda a imaginar cómo podría ser aprender allí.',
      'Recuerda preguntar por proyectos reales, cursos iniciales y las diferentes especialidades que ofrece la institución.',
    ],
  },
  'financial-aid-workshop': {
    topic: 'Formación',
    minutes: 2,
    url: 'https://www.pronabec.gob.pe/',
    organizer: 'Equipo de orientación y Pronabec',
    modality: 'Híbrido · gratuito',
    content: [
      'Este taller explica con ejemplos cómo se organizan las becas, los requisitos y los cronogramas. Puedes asistir aunque todavía estés explorando alternativas de estudio.',
      'Trae preguntas sobre fechas, documentos y las opciones que podrían acompañar tu propia ruta de formación.',
    ],
  },
}
export function ResourceDetail({
  item,
  saved,
  past,
  interested,
  outcome,
  onBack,
  onFavorite,
  onExternal,
  onEventOutcome,
  previewMode = false,
  metaOverride,
}: {
  item: AdventureNotice
  saved: boolean
  past: boolean
  interested: boolean
  outcome?: 'attended' | 'missed'
  onBack: () => void
  onFavorite: () => void
  onExternal: () => void
  onEventOutcome: (item: AdventureNotice, outcome: 'attended' | 'missed') => void
  previewMode?: boolean
  metaOverride?: Partial<ResourceMeta>
}) {
  const meta = { ...(metadata[item.id] ?? { topic: 'Actualidad', minutes: 3, url: '' }), ...metaOverride }
  const isEvent = item.kind === 'event'
  const content = meta.content ?? [item.body]
  return (
    <div className="adventure-page min-h-full p-4 sm:p-8">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft /> Volver a {isEvent ? 'Eventos' : 'Publicaciones'}
      </Button>
      <article className="mx-auto mt-5 max-w-6xl">
        <header className="rounded-t-3xl bg-muted p-7 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="secondary">{meta.topic}</Badge>
              <h1 className="mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">{item.title}</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {isEvent
                  ? 'Evento publicado por tu orientadora'
                  : meta.minutes + ' min de lectura · Publicado por tu orientadora'}
              </p>
            </div>
            {!previewMode && (
              <Button variant="outline" onClick={onFavorite}>
                <Star className={saved ? 'fill-current' : ''} />
                {isEvent
                  ? saved
                    ? 'Ya me interesa'
                    : 'Me interesa'
                  : saved
                    ? 'En favoritos'
                    : 'Agregar a favoritos'}
              </Button>
            )}
          </div>
          {isEvent && (
            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl bg-card/80 p-4">
                <b>Fecha</b>
                <br />
                {new Date(item.date + 'T12:00:00').toLocaleDateString('es-PE', { dateStyle: 'long' })}
              </div>
              <div className="rounded-2xl bg-card/80 p-4">
                <b>Organiza</b>
                <br />
                {meta.organizer ?? 'Orientación'}
              </div>
              <div className="rounded-2xl bg-card/80 p-4">
                <b>Modalidad</b>
                <br />
                {meta.modality ?? 'Consulta detalles'}
              </div>
            </div>
          )}
        </header>
        <div
          className={`grid gap-8 rounded-b-3xl bg-card p-7 shadow-sm sm:p-10 ${meta.url ? 'lg:grid-cols-[minmax(0,1fr)_18rem]' : ''}`}
        >
          <div className="space-y-5 text-[1.02rem] leading-8">
            {content.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          {meta.url && (
            <aside className="h-fit space-y-4">
              <div className="rounded-2xl border bg-muted p-5">
                <p className="text-sm font-semibold">Enlace principal</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Abre el recurso externo recomendado por tu orientadora.
                </p>
                <Button className="mt-4 w-full" onClick={onExternal}>
                  Abrir recurso <ExternalLink />
                </Button>
              </div>
              {!previewMode && isEvent && past && !outcome && (
                <div className="rounded-2xl border border-border bg-muted p-5">
                  <h2 className="font-bold">{interested ? '¿Asististe al evento?' : '¿Fuiste al evento?'}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {interested
                      ? 'Cuéntanos qué pasó para cerrar tu registro de interés.'
                      : 'Aunque no lo marcaras antes, puedes registrar tu experiencia si fuiste.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => onEventOutcome(item, 'attended')}>
                      Sí, asistí
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onEventOutcome(item, 'missed')}>
                      No asistí
                    </Button>
                  </div>
                </div>
              )}
              {!previewMode && isEvent && outcome && (
                <div className="rounded-2xl bg-muted p-5 text-sm leading-6">
                  <b>
                    {outcome === 'attended' ? 'Registraste que asististe.' : 'Registraste que no asististe.'}
                  </b>
                  <br />
                  Tu respuesta quedó guardada.
                </div>
              )}
            </aside>
          )}
        </div>
      </article>
    </div>
  )
}
