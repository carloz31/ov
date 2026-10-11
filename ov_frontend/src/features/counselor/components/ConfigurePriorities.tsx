import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'

export function ConfigurePriorities() {
  return (
    <Button asChild variant="outline" className="min-h-11 self-start">
      <Link to="/counselor/priorities">Configurar prioritarios</Link>
    </Button>
  )
}
