import { embedYoutube } from '@/lib/servidor/adaptadoresInvestigaciones'

// F09: un video de YouTube incrustado (sin cookies) en un marco 16:9; sin un enlace válido, un aviso.
export function VideoYoutube({
  enlace,
  titulo,
  className,
}: {
  enlace: string
  titulo: string
  className?: string
}) {
  const embed = embedYoutube(enlace)
  return (
    <div className={className} style={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden' }}>
      {embed ? (
        <iframe
          src={embed}
          title={`Video: ${titulo}`}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      ) : (
        <p style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          No pudimos incrustar este video.
        </p>
      )}
    </div>
  )
}
