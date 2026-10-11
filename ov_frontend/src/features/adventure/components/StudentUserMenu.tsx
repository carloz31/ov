import { useStudentAccount } from '../hooks/useStudentAccount'
import { LogOut, UserRound } from 'lucide-react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { appPaths } from '@/routes/paths'

export function StudentUserMenu() {
  const { nombre, navigate, confirmar, setConfirmar, ocupado, error, reiniciar, iniciales, puedeReiniciar } = useStudentAccount()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="sx-user-menu" aria-label={`Menú de ${nombre}`}>
            <span className="sx-user-avatar" aria-hidden="true">
              {iniciales}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="sx-root sx-user-dropdown">
          <DropdownMenuItem onSelect={() => navigate(appPaths.student.profile)}>
            <UserRound size={16} /> Mi perfil
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate(appPaths.home)}>
            <LogOut size={16} /> Cerrar sesión
          </DropdownMenuItem>
          {puedeReiniciar && (
            <DropdownMenuItem onSelect={() => setConfirmar(true)}>Reiniciar datos de prueba</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={confirmar}
        onOpenChange={(open) => {
          if (!ocupado) setConfirmar(open)
        }}
      >
        <DialogContent className="sx-root sx-glass-dark sx-player-exit">
          <DialogTitle>¿Reiniciar los datos de prueba?</DialogTitle>
          <DialogDescription>
            Se borrará el progreso de las cuentas de prueba del servidor y las copias de este navegador en
            modo API.
          </DialogDescription>
          {error && <p role="alert">{error}</p>}
          <div className="sx-player-actions">
            <button
              type="button"
              className="sx-secondary-button"
              disabled={ocupado}
              onClick={() => setConfirmar(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="sx-primary-button"
              disabled={ocupado}
              onClick={() => void reiniciar()}
            >
              {ocupado ? 'Reiniciando…' : 'Reiniciar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
