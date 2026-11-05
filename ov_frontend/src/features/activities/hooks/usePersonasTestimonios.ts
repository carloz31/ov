import { useTestimoniosServidor } from '@/store/servidor/secciones'
import type { RecursoCierre } from '../lib/finishSummary'

// Ajuste testimonios: quién cuenta cada voz, para los cierres. El desbloqueo solo trae código y título; lo demás sale
// de la sección de testimonios. Mientras carga, el cierre muestra el título.
export function usePersonasTestimonios(activo: boolean) {
  const testimonios = useTestimoniosServidor(activo).datos
  const personas: Record<string, Pick<RecursoCierre, 'persona' | 'rol' | 'contexto'>> = {}
  for (const t of testimonios ?? []) {
    if (t.persona)
      personas[t.codigo] = {
        persona: t.persona,
        ...(t.ocupacion ? { rol: t.ocupacion.titulo } : {}),
        ...(t.contexto ? { contexto: t.contexto } : {}),
      }
  }
  return personas
}
