import { useEffect, useRef, useState } from 'react'

// El mapa (imagen, camino y nodos) no se muestra hasta que su imagen está cargada y decodificada: nunca los
// nodos sobre un fondo vacío. Si la imagen falla, se muestra igual. `imagen` va en el <img> del lienzo.
export function useImagenMapa(src: string) {
  const imagen = useRef<HTMLImageElement>(null)
  const [lista, setLista] = useState<string | null>(null)
  useEffect(() => {
    const actual = imagen.current
    if (!actual) return
    let vigente = true
    const listo = () => {
      if (vigente) setLista(src)
    }
    const alCargar = () => void actual.decode().then(listo, listo)
    // Ya en caché, `load` pudo pasar antes del efecto.
    if (actual.complete) alCargar()
    else {
      actual.addEventListener('load', alCargar, { once: true })
      actual.addEventListener('error', listo, { once: true })
    }
    return () => {
      vigente = false
      actual.removeEventListener('load', alCargar)
      actual.removeEventListener('error', listo)
    }
  }, [src])
  return { imagen, mostrarMapa: lista === src }
}
