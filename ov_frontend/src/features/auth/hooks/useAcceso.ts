import { useSesionAcceso } from '@/store/accesoStore'

/** Cuenta con sesión, para las guardas de `routes/` (que no leen `store/`). */
export function useAcceso() {
  return { cuenta: useSesionAcceso()?.cuenta ?? null }
}
