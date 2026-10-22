import { BloquePorAmpliar } from './followup/BloquePorAmpliar'
import { useRegistroPorAmpliar } from '../hooks/useRegistroPorAmpliar'
import { textoPorAmpliar } from '../lib/porAmpliar'

// Bloque del drawer de un registro completado con ítems por ampliar (F01). Sin ítems, no se muestra.
export function RegistroPorAmpliar({ codigo }: { codigo: string }) {
  const filas = useRegistroPorAmpliar(codigo)
  if (!filas.length) return null
  return (
    <BloquePorAmpliar
      texto={textoPorAmpliar(filas.length, { volver: false })}
      filas={filas}
      conPista={false}
      compacto
    />
  )
}
