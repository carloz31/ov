import assert from 'node:assert/strict'
import test from 'node:test'
import { importarAislado } from '../../soporte/servidor-ayudas.mjs'

// Ajuste panel-entrevistas-configuracion §1.2: el salón llega como promoción y sección y el front lo nombra según el
// año en curso. DATO DE PRUEBA: promociones y secciones inventadas.
const { nombreSalon, salonesConNombre } = await importarAislado('src/lib/nombreSalon.ts')

test('quinto, cuarto y tercero se nombran por su grado', () => {
  assert.equal(nombreSalon({ promocion: 2026, seccion: 'A' }, 2026), 'Quinto A')
  assert.equal(nombreSalon({ promocion: 2027, seccion: 'B' }, 2026), 'Cuarto B')
  assert.equal(nombreSalon({ promocion: 2028, seccion: 'C' }, 2026), 'Tercero C')
})

test('una promoción egresada o de segundo para abajo se nombra por su promoción', () => {
  assert.equal(nombreSalon({ promocion: 2024, seccion: 'A' }, 2026), 'Promoción 2024 A')
  assert.equal(nombreSalon({ promocion: 2029, seccion: 'D' }, 2026), 'Promoción 2029 D')
})

test('la misma promoción cambia de nombre al pasar el año', () => {
  const salon = { promocion: 2026, seccion: 'A' }
  assert.equal(nombreSalon(salon, 2026), 'Quinto A')
  assert.equal(nombreSalon(salon, 2027), 'Promoción 2026 A')
})

test('los salones de la sesión llevan su nombre sin perder sus datos', () => {
  assert.deepEqual(
    salonesConNombre([{ codigo: '5A', promocion: 2026, seccion: 'A', es_principal: true }], 2026),
    [{ codigo: '5A', promocion: 2026, seccion: 'A', es_principal: true, nombre: 'Quinto A' }],
  )
})
