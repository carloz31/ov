import type { Instrumento } from '@/types/activities'

export const compassInstrument: Instrumento = {
  id: 'brujula-personal',
  nombre: 'Mi brújula personal',
  version: '1.0',
  visibilidad: 'estudiante_orientadora',
  items: [
    {
      id: 'brujula-interes',
      codigo: '1',
      texto: '¿Qué actividad te gustaría explorar primero?',
      formato: {
        tipo: 'opcion_unica',
        opciones: [
          'Crear algo',
          'Investigar un problema',
          'Acompañar a otras personas',
          'Organizar un proyecto',
        ].map((texto) => ({ valor: texto, texto })),
      },
    },
    {
      id: 'brujula-aprendizaje',
      codigo: '2',
      texto: '¿Cómo prefieres acercarte a algo nuevo?',
      formato: {
        tipo: 'opcion_unica',
        opciones: ['Probándolo', 'Leyendo o mirando ejemplos', 'Conversando', 'Todavía no lo sé'].map(
          (texto) => ({ valor: texto, texto }),
        ),
      },
    },
    {
      id: 'brujula-apoyo',
      codigo: '3',
      texto: '¿Sientes que puedes conversar sobre tus opciones?',
      formato: {
        tipo: 'opcion_unica',
        opciones: ['Sí', 'A veces', 'No', 'Prefiero no responder'].map((texto) => ({ valor: texto, texto })),
      },
    },
    {
      id: 'brujula-preparacion',
      codigo: '4',
      texto: '¿Qué te gustaría hacer a continuación?',
      formato: {
        tipo: 'opcion_unica',
        opciones: ['Conocer profesiones', 'Hablar con alguien', 'Conocerme mejor', 'Tomarme un tiempo'].map(
          (texto) => ({ valor: texto, texto }),
        ),
      },
    },
  ],
  clave: { dimensiones: [], asignacion: [] },
}
