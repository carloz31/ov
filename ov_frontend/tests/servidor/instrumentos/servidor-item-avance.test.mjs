import assert from 'node:assert/strict'
import test from 'node:test'
import { elementos, fixtureServidor } from '../../soporte/servidor-ayudas.mjs'

// F01 · ajuste: preguntas con avance automático (ItemNode), iguales en api y en local.
const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
// DATO DE PRUEBA: una pregunta con cuatro opciones.
const opciones = [1, 2, 3, 4].map((value) => ({ value, text: `Opción ${value}` }))

for (const api of [true, false]) {
  const modo = api ? 'api' : 'local'
  function montar(props) {
    const app = fixtureServidor({ api })
    const { ItemNode } = app.load('src/features/activities/components/nodes/ItemNode.tsx')
    const llamadas = { respuestas: [], continuar: 0 }
    const vista = app.mount(ItemNode, {
      node: { id: 'i1', tipo: 'item', instrumentoId: 'x', itemId: 'i1', hablanteId: 'companero' },
      text: '¿Qué tanto?',
      options: opciones,
      direct: true,
      onAnswer: (valor) => llamadas.respuestas.push(valor),
      onContinue: () => llamadas.continuar++,
      ...props,
    })
    const opcion = (valor) =>
      elementos(vista.render(), (e) => e.type === 'button' && e.key === String(valor))[0]
    const principal = () =>
      elementos(vista.render(), (e) => e.type === 'button' && e.props.className === 'sx-primary-button')[0]
    return { vista, llamadas, opcion, principal }
  }
  const texto = (boton) =>
    [boton.props.children]
      .flat()
      .filter((c) => typeof c === 'string')
      .join('')
      .trim()

  test(`${modo}: elegir marca la opción y avanza tras el retardo, sin doble respuesta`, async () => {
    const { vista, llamadas, opcion } = montar()
    opcion(2).props.onClick()
    assert.equal(opcion(2).props['aria-pressed'], true)
    opcion(3).props.onClick()
    assert.deepEqual(llamadas.respuestas, [])
    await pausa(350)
    assert.deepEqual(llamadas.respuestas, [2])
    vista.unmount()
  })

  test(`${modo}: al volver, tocar la misma opción o «Siguiente» avanza sin cambiar la respuesta`, async () => {
    const igual = montar({ existing: { valor: 2 } })
    assert.equal(igual.opcion(2).props['aria-pressed'], true)
    assert.equal(texto(igual.principal()), 'Siguiente')
    igual.opcion(2).props.onClick()
    await pausa(350)
    assert.deepEqual(igual.llamadas, { respuestas: [], continuar: 1 })
    igual.vista.unmount()
    const siguiente = montar({ existing: { valor: 2 } })
    siguiente.principal().props.onClick()
    assert.deepEqual(siguiente.llamadas, { respuestas: [], continuar: 1 })
    siguiente.vista.unmount()
  })

  test(`${modo}: al volver, elegir otra opción la reemplaza`, async () => {
    const { vista, llamadas, opcion } = montar({ existing: { valor: 2 } })
    opcion(4).props.onClick()
    await pausa(350)
    assert.deepEqual(llamadas, { respuestas: [4], continuar: 0 })
    vista.unmount()
  })

  test(`${modo}: la última pregunta no avanza ni envía sola; lo hace el botón de cierre`, async () => {
    const { vista, llamadas, opcion, principal } = montar({ ultima: true, cierre: 'Ver resultado' })
    assert.equal(principal(), undefined)
    opcion(3).props.onClick()
    await pausa(350)
    assert.deepEqual(llamadas, { respuestas: [], continuar: 0 })
    assert.equal(texto(principal()), 'Ver resultado')
    principal().props.onClick()
    principal()?.props.onClick()
    assert.deepEqual(llamadas, { respuestas: [3], continuar: 0 })
    vista.unmount()
  })
}
