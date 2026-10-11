import { Link } from 'react-router'
import { Target } from 'lucide-react'
import { appPaths } from '@/routes/paths'
import { type StudentMapPoint } from '@/features/adventure/lib/mapPoints'
export function CollapsedAdventurePanel({
  progress,
  recommended,
  onSelect,
}: {
  progress: number
  recommended?: StudentMapPoint
  onSelect: (id: string) => void
}) {
  return (
    <div className="sx-panel-strip">
      <Link to={appPaths.student.profile} aria-label="Mi perfil">
        <span className="sx-panel-avatar">AL</span>
      </Link>
      <strong aria-label="Avance de la zona">{Math.round(Math.min(100, Math.max(0, progress)))}%</strong>
      {recommended && (
        <button
          className="sx-strip-next"
          type="button"
          aria-label={`Siguiente paso: ${recommended.title}`}
          onClick={() => onSelect(recommended.id)}
        >
          <Target aria-hidden="true" size={22} />
        </button>
      )}
    </div>
  )
}
