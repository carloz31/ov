import type { InstrumentPageId } from '@/types/discovery'

// Ajuste de F03: textos de pantalla de la tarjeta lista para revelar. «descubrir» completa «Rompe el sello para
// descubrir …»; «adentro» sigue a «Adentro:». `{partes}` es el número de dimensiones que manda el backend.
export type TextosRevelado = { descubrir: string; adentro: string }

export const TEXTOS_REVELADO: Record<InstrumentPageId | 'llegada', TextosRevelado> = {
  'partida-llegada': {
    descubrir: 'tu punto de partida',
    adentro: 'tu zona en las {partes} partes de tu camino.',
  },
  llegada: {
    descubrir: 'tu punto de llegada',
    adentro: 'cómo cambió cada parte desde tu partida.',
  },
  intereses: {
    descubrir: 'tu código de interés',
    adentro: 'tu código de interés y las ocupaciones que se le parecen.',
  },
  inteligencias: {
    descubrir: 'tus inteligencias más desarrolladas',
    adentro: 'tus formas de ser inteligente más desarrolladas.',
  },
  // TEXTO PROVISIONAL: el usuario redactará el de habilidades sociales.
  habilidades: {
    descubrir: 'tus habilidades sociales',
    adentro: 'cómo te relacionas y trabajas con los demás.',
  },
}

// Sin el número de partes (el catálogo no respondió), el texto no las cuenta.
export const ADENTRO_PARTIDA_SIN_PARTES = 'tu zona en cada parte de tu camino.'

export const TEXTO_LLEGADA_LISTA = 'Helena leyó tus respuestas del cierre. Toca el sello para ver cómo llegaste.'
