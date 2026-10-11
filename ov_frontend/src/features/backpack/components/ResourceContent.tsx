import { ExternalLink, FileText, MessageSquareQuote } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ResourceText } from '@/components/student/ResourceText'
import {
  resourceFileUrl,
  youtubeEmbedUrl,
  type TravelResource,
} from '@/features/backpack/lib/travelerResources'
export function ResourceContent({ resource }: { resource: TravelResource }) {
  const videoUrl = youtubeEmbedUrl(resource.url)
  const fileUrl = resourceFileUrl(resource.url)
  const isPdf = fileUrl && (resource.fileFormat === 'pdf' || /\.pdf(?:[?#]|$)/i.test(fileUrl))
  const placeholderUrl = fileUrl && /^https:\/\/example\.com(?:\/|$)/.test(fileUrl)
  return (
    <div className="space-y-5">
      {resource.kind === 'sheet' ? (
        <>
          {resource.content && <ResourceText text={resource.content} />}
          {isPdf && (
            <iframe
              src={fileUrl}
              title={`PDF: ${resource.title}`}
              className="h-[55vh] w-full rounded-xl border bg-white"
            />
          )}
          {fileUrl && (
            <Button asChild variant="outline">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <FileText />
                {isPdf
                  ? 'Abrir PDF en otra pestaña'
                  : resource.fileFormat === 'archivo'
                    ? 'Abrir archivo'
                    : 'Abrir fuente del recurso'}
                <ExternalLink />
              </a>
            </Button>
          )}
          {!resource.content && !fileUrl && (
            <p className="rounded-xl bg-[#f4f3e8] p-4 text-sm">
              El contenido de esta ficha estará disponible próximamente.
            </p>
          )}
        </>
      ) : (
        <>
          {videoUrl ? (
            <div className="aspect-video overflow-hidden rounded-2xl bg-black">
              <iframe
                className="size-full"
                src={videoUrl}
                title={resource.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="grid aspect-video place-items-center rounded-2xl border border-dashed border-[#d9dbc8] bg-[#f0f1e4] p-6 text-center">
              <div>
                <MessageSquareQuote className="mx-auto size-10 text-[#809477]" />
                <p className="mt-4 text-sm font-semibold">
                  {!fileUrl || placeholderUrl
                    ? 'El video de esta entrevista está pendiente'
                    : 'Esta entrevista se abre desde su enlace original'}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {!fileUrl || placeholderUrl
                    ? 'Puedes leer el resumen compartido mientras se incorpora su enlace.'
                    : 'Abre el enlace para visualizar el contenido compartido.'}
                </p>
              </div>
            </div>
          )}
          {fileUrl && !placeholderUrl && (
            <Button asChild variant="outline">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                {videoUrl ? 'Ver en YouTube' : 'Abrir entrevista'}
                <ExternalLink />
              </a>
            </Button>
          )}
        </>
      )}
    </div>
  )
}
