import assert from 'node:assert/strict'
import test from 'node:test'
import { importarAislado } from '../../soporte/servidor-ayudas.mjs'

// Ajuste desbloqueos: Conversaciones del apoderado se abre con la actividad que nombra su regla (p4 en `contenido`);
// la pantalla de bloqueo la toma del 409 y cuenta el avance solo hasta ella.
const { actividadApertura, avanceApertura } = await importarAislado(
  'src/features/family-conversations/lib/aperturaConversaciones.ts',
)

const RUTA = [
  ['p1', 'Acompañar no es decidir', 12],
  ['p2', 'Mis expectativas y temores', 12],
  ['p3', 'Acompañar o presionar', 12],
  ['p4', 'Lo que no se dice en casa', 12],
  ['p5', 'El panorama de hoy', 14],
  ['p6', 'Cómo conversar con mi hijo o hija', 12],
  ['p7', 'Cuando mi hijo o hija duda o cambia de opinión', 12],
  ['p8', 'Mi carta para mi hijo o hija', 10],
].map(([id, titulo, duracionEstimadaMin]) => ({ id, titulo, duracionEstimadaMin }))

const detalle = (referencia, tipo_evento = 'COMPLETA_ACTIVIDAD') => ({
  mensaje: 'Complete la actividad «Lo que no se dice en casa».',
  progreso: {
    objetivo: { tipo: 'SECCION', codigo: 'CONVERSACIONES' },
    disponible: false,
    reglas: [{
      regla: 'R-SEC-CONVERSACIONES', mensaje_bloqueo: 'Complete la actividad «Lo que no se dice en casa».',
      cumplida: false,
      condiciones: [{ tipo_evento, referencia, tipo_conteo: 'EVENTOS', actual: 0, requerido: 1, cumplida: false, texto: null }],
    }],
  },
})

test('con p3 completa, la apertura es «Lo que no se dice en casa» y el avance es 3 de 4', () => {
  const avance = avanceApertura(RUTA, ['p1', 'p2', 'p3'], actividadApertura(detalle('p4')), { completadas: 3, total: 8 })
  assert.deepEqual(avance, {
    apertura: 'Lo que no se dice en casa', completadas: 3, total: 4,
    siguiente: { titulo: 'Lo que no se dice en casa', minutos: 12 },
  })
})

test('sin la condición en el bloqueo, queda el avance de toda la ruta', () => {
  assert.equal(actividadApertura(undefined), null)
  assert.equal(actividadApertura(detalle('FAMILIA', 'COMPLETA_BLOQUE')), null)
  const avance = avanceApertura(RUTA, ['p1'], null, { completadas: 1, total: 8 })
  assert.deepEqual(avance, {
    apertura: null, completadas: 1, total: 8, siguiente: { titulo: 'Mis expectativas y temores', minutos: 12 },
  })
})
