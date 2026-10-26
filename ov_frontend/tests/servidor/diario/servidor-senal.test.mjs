import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { fixtureServidor, jsonServidor } from '../../soporte/servidor-ayudas.mjs'

// F05: el check-in en api. El aviso al ingresar solo aparece con CHECK_IN abierta y sin check-in de hoy.
const checkIns = jsonServidor('ruta/ruta-check-ins')
const listo = (datos) => ({ datos, estado: 'listo', error: null })
const error = { tipo: 'sin_conexion' }

function senal(estado) {
  const app = fixtureServidor()
  app.load('src/store/servidor/sesion.ts').publicar(estado)
  const { useSenalServidor } = app.load('src/features/adventure/hooks/useSenalServidor.ts')
  let resultado
  renderToStaticMarkup(
    React.createElement(() => {
      resultado = useSenalServidor()
      return null
    }),
  )
  return { app, resultado }
}
function aviso(app, checkInPendiente) {
  const { getNextOverlay } = app.load('src/features/adventure/context/overlayContext.ts')
  // Sin la Ciudad abierta ni intros pendientes: solo queda decidir la señal.
  const adventure = { readinessCheckIns: [], completedMissionIds: [] }
  const ui = { introsSeen: { missions: true }, cityArrivalSeen: true }
  return getNextOverlay({ adventure, ui, view: 'missions', activityOpen: false, checkInPendiente })
}

test('con CHECK_IN bloqueada no hay aviso ni se piden los check-ins', () => {
  const { app, resultado } = senal({ secciones: listo(jsonServidor('ruta/ruta-secciones-inicial')) })
  assert.equal(resultado.abierta, false)
  assert.equal(resultado.pendiente, false)
  assert.equal(aviso(app, resultado.pendiente), null)
  assert.equal(app.requests.filter((r) => r.url.endsWith('/check-ins')).length, 0)
})

test('mientras secciones o check-ins cargan, o si fallan, no hay aviso', () => {
  const t1 = jsonServidor('ruta/ruta-secciones-t1')
  for (const estado of [
    { secciones: { datos: null, estado: 'cargando', error: null } },
    { secciones: { datos: null, estado: 'error', error } },
    { secciones: listo(t1), checkIns: { datos: null, estado: 'cargando', error: null } },
    { secciones: listo(t1), checkIns: { datos: null, estado: 'error', error } },
  ]) {
    const { app, resultado } = senal(estado)
    assert.equal(resultado.pendiente, false)
    assert.equal(aviso(app, resultado.pendiente), null)
  }
})

test('abierta y sin registro de hoy, aviso; con registrado_hoy, sin aviso', () => {
  const t1 = jsonServidor('ruta/ruta-secciones-t1')
  const sinHoy = senal({ secciones: listo(t1), checkIns: listo({ ...checkIns, registrado_hoy: false }) })
  assert.equal(sinHoy.resultado.pendiente, true)
  assert.equal(aviso(sinHoy.app, sinHoy.resultado.pendiente)?.kind, 'check-in')
  assert.equal(sinHoy.resultado.hoy, undefined)
  const conHoy = senal({ secciones: listo(t1), checkIns: listo(checkIns) })
  assert.equal(conHoy.resultado.pendiente, false)
  assert.equal(aviso(conHoy.app, conHoy.resultado.pendiente), null)
  assert.equal(conHoy.resultado.hoy.value, 3)
  assert.equal(conHoy.resultado.diasRegistrados, 2)
})

test('nunca encima de una actividad abierta', () => {
  const app = fixtureServidor()
  const { getNextOverlay } = app.load('src/features/adventure/context/overlayContext.ts')
  assert.equal(
    getNextOverlay({ adventure: {}, ui: {}, view: 'missions', activityOpen: true, checkInPendiente: true }),
    null,
  )
})

// El diálogo vive en un portal (no se pinta en el servidor de pruebas): se comprueba su fuente.
test('el diálogo usa la escala del servidor y, como en local, la señal se cambia durante el día', () => {
  const fuente = readFileSync('src/features/adventure/components/overlays/CheckInContent.tsx', 'utf8')
  assert.match(fuente, /const escala = servidor\?\.escala \?\? 10/)
  assert.match(fuente, /Array\.from\(\{ length: escala \}/)
  // Ajuste del panel (F05): una por día, editable ese día (el servidor sobrescribe la del día).
  assert.match(fuente, /¿Qué tan seguro te sientes de tu próximo paso\? Puedes cambiar esta respuesta durante el día\./)
  assert.doesNotMatch(fuente, /servidor\s*\?\s*'¿Qué tan seguro/)
  assert.match(fuente, /servidor\?\.error &&/)
  const cola = readFileSync('src/features/adventure/components/overlays/OverlayQueue.tsx', 'utf8')
  assert.match(cola, /void registrarCheckIn\(value\)/)
  assert.match(
    cola,
    /servidor=\{senal\.activo \? \{ escala: senal\.escala, error: errorSenal \} : undefined\}/,
  )
})

test('la evolución grafica la serie 1–5 con los días registrados y sin «Cambiar»', () => {
  const app = fixtureServidor()
  app.load('src/store/servidor/sesion.ts').publicar({
    secciones: listo(jsonServidor('ruta/ruta-secciones-t1')),
    checkIns: listo(checkIns),
  })
  const { StudentSignalsView } = app.load('src/pages/student/StudentSignalsView.tsx')
  const html = renderToStaticMarkup(
    React.createElement(MemoryRouter, {}, React.createElement(StudentSignalsView)),
  )
  assert.match(html, /Escala del 1 al 5/)
  assert.match(html, /2 días registrados/)
  assert.match(html, /aria-label="3 de 5"/)
  assert.doesNotMatch(html, /Cambiar mi señal|Registrar mi señal/)
  // Ajuste tras la prueba manual: se vuelve al mapa, no al diario.
  assert.match(html, /href="\/student\/missions"[^>]*>.*Volver al mapa/)
  assert.doesNotMatch(html, /Volver a mi diario/)
})

test('las insignias del pasaporte no muestran su código', () => {
  const vista = readFileSync('src/features/discovery/components/StudentPassportView.tsx', 'utf8')
  assert.doesNotMatch(vista, /sx-p-badge-code/)
  const dialogo = readFileSync('src/features/discovery/components/PassportBadgeDialog.tsx', 'utf8')
  // Ajuste pasaporte-perfil: la línea del grupo dice «Página X · {grupo}», sin el código de la insignia.
  assert.match(dialogo, /<p className="sx-p-badge-code">\s*Página \{numeroPagina\(groupIndex\)\} · \{group\}\s*<\/p>/)
  assert.doesNotMatch(dialogo, /badge\.code\}/)
})
