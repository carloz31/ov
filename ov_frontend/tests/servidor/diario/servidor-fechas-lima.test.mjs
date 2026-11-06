import assert from 'node:assert/strict'
import test from 'node:test'
import { importarAislado } from '../../soporte/servidor-ayudas.mjs'

// Fechas del servidor: hora de Lima sin zona. Se leen con `fechaServidor` aunque el navegador esté en otra zona;
// las cadenas con zona (las del navegador en modo local) no cambian.
const fechas = await importarAislado('src/lib/servidor/fechas.ts')
const diario = await importarAislado('src/lib/servidor/adaptadoresDiario.ts')
const planes = await importarAislado('src/lib/servidor/adaptadoresPlanes.ts')
const investigaciones = await importarAislado('src/lib/servidor/adaptadoresInvestigaciones.ts')
const ZONAS = ['UTC', 'Asia/Tokyo', 'Pacific/Honolulu', 'America/Lima']

function enZona(zona, prueba) {
  const anterior = process.env.TZ
  process.env.TZ = zona
  try {
    prueba()
  } finally {
    process.env.TZ = anterior
  }
}

test('fechaServidor lee la cadena sin zona como hora de Lima en cualquier zona del navegador', () => {
  for (const zona of ZONAS)
    enZona(zona, () => {
      assert.equal(
        fechas.fechaServidor('2026-10-29T04:53:09').toISOString(),
        '2026-10-29T09:53:09.000Z',
        zona,
      )
      assert.equal(
        fechas.fechaServidor('2026-10-29T04:53:09.680568').toISOString(),
        '2026-10-29T09:53:09.680Z',
      )
      assert.equal(fechas.fechaServidor('2026-10-29').toISOString(), '2026-10-29T05:00:00.000Z')
      // Con zona, tal cual: así sirve en vistas de los dos modos.
      assert.equal(fechas.fechaServidor('2026-10-29T04:53:09Z').toISOString(), '2026-10-29T04:53:09.000Z')
      assert.equal(
        fechas.fechaServidor('2026-10-29T04:53:09+09:00').toISOString(),
        '2026-10-28T19:53:09.000Z',
      )
      assert.equal(fechas.diaLima(fechas.fechaServidor('2026-10-29T00:10:00')), '2026-10-29')
      assert.equal(fechas.diaLima(fechas.fechaServidor('2026-10-28T23:50:00')), '2026-10-28')
    })
})

test('«hoy», «ayer» y «hace N días» cuentan días de Lima, no del navegador', () => {
  // Las 22:00 del 28 en Lima son el 29 en Tokio y en UTC.
  const ahora = new Date('2026-10-29T03:00:00Z')
  for (const zona of ZONAS)
    enZona(zona, () => {
      assert.deepEqual(
        ['2026-10-28T10:00:00', '2026-10-27T23:59:00', '2026-10-25T00:01:00'].map((f) =>
          diario.fechaRelativa(f, ahora),
        ),
        ['hoy', 'ayer', 'hace 3 días'],
        zona,
      )
      assert.equal(investigaciones.fechaRelativa('2026-10-27T21:00:00', ahora), 'ayer', zona)
    })
})

test('las fechas mostradas son el día de Lima (pasaporte, planes, investigaciones)', () => {
  for (const zona of ZONAS)
    enZona(zona, () => {
      const sello = fechas
        .fechaServidor('2026-10-29T04:53:09')
        .toLocaleDateString('es-PE', { dateStyle: 'long', timeZone: fechas.ZONA_SERVIDOR })
      assert.equal(sello, '29 de octubre de 2026', zona)
      assert.equal(planes.fechaCorta('2026-10-29T04:53:09'), '29 oct', zona)
      assert.equal(investigaciones.fechaCorta('2026-10-29T23:30:00'), '29 oct', zona)
    })
})
