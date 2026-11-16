"""Ajuste panel-estudiantes §9 y ajuste respuestas-orientadora: pestaña Respuestas del perfil (lista agrupada y
ordenada con sus marcas, los que requieren atención ya leídos, ítems en lectura con los valores con que respondió y
ecos resueltos) y el origen de las piezas guardado al responder. Los casos de los ejemplos del panel están en
`test_panel_respuestas_ejemplos.py`."""

import pytest
from sqlalchemy import select, update

from app import models as m
from soporte_catalogo_ruta import PERIODISMO, PSICOLOGIA
from soporte_contenido import REQUERIDAS, avanzar
from soporte_panel import fijar_ahora
from soporte_ruta import FECHA, avanzar as avanzar_ruta, item_de, leer_registro, pedir, responder_registro

PROHIBIDOS = {'tipo', 'motivo', 'tipo_final', 'primera_tipo', 'conjunto_tipo', 'pista', 'intento', 'sensible',
              'primera_motivo', 'conjunto_motivo', 'arranque', 'linea_registro'}


def claves(valor):
    if isinstance(valor, dict):
        return set(valor) | set().union(*(claves(v) for v in valor.values()))
    if isinstance(valor, list):
        return set().union(*(claves(v) for v in valor)) if valor else set()
    return set()


def pestana(cliente, ruta='', estudiante='est-ana', esperado=200):
    respuesta = cliente.get(f'/cuentas/ori-carmen/panel/estudiantes/{estudiante}/respuestas{ruta}')
    assert respuesta.status_code == esperado, respuesta.text
    return respuesta.json()


def _respuestas_de(sesion, actividad):
    return sesion.scalars(select(m.RespuestaRegistro).join(m.ProgresoActividad).join(m.Actividad).where(
        m.Actividad.codigo == actividad, m.RespuestaRegistro.vigente).order_by(m.RespuestaRegistro.id)).all()


def test_lista_con_marcas_y_los_que_requieren_atencion_ya_leidos(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    avanzar_ruta(cliente)  # responde t-expectativas (destacado de 5A)
    primera, *_ = _respuestas_de(sesion, 't-expectativas')
    primera.sensible = True
    primera.tipo_final = 'vacio'
    sesion.commit()
    datos = pestana(cliente)
    assert datos['hay_destacados'] is True
    fila = next(r for r in datos['registros'] if r['actividad'] == 't-expectativas')
    assert fila['destacado'] and fila['estado'] == 'COMPLETADO' and fila['fecha'] is not None
    # Con los dos tipos de marca, prima «Requiere atención» en la fila y en el ítem.
    assert (fila['marca'], fila['sin_contenido'], fila['grupo'], fila['en_destacados']) == (
        'REQUIERE_ATENCION', 1, 'TRAMO', True)
    assert datos['registros'][0] == fila  # va primero en su tramo, y su tramo es el primero con filas
    assert any(r['grupo'] == 'AUN_NO_LLEGA' and r['estado'] == 'AUN_NO_LLEGA' for r in datos['registros'])
    assert (datos['por_revisar_todos'], datos['por_revisar_destacados']) == (1, 1)
    leer, = datos['leer_primero']
    assert leer['actividad'] == 't-expectativas'
    item = leer['items'][0]
    assert item['numero'] == 1 and item['marca'] == 'REQUIERE_ATENCION' and item['respondido']
    assert not claves(datos) & PROHIBIDOS
    # El perfil (Resumen) cuenta las mismas etiquetas sobre los destacados.
    resumen = cliente.get('/cuentas/ori-carmen/panel/estudiantes/est-ana').json()['respuestas']
    assert (resumen['completados'], resumen['total'], resumen['requiere_atencion'], resumen['sin_contenido']) == (1, 1, 1, 1)


def test_registro_desplegado_con_aun_no_lo_sabe_y_404(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    avanzar_ruta(cliente)
    respuesta = _respuestas_de(sesion, 't-expectativas')[0]
    respuesta.estado = m.EstadoRespuestaRegistro.ABIERTO
    sesion.commit()
    registro = pestana(cliente, '/t-expectativas')
    assert registro['actividad'] == 't-expectativas'
    assert registro['items'][0]['aun_no_lo_sabe'] is True and registro['items'][0]['marca'] is None
    assert registro['items'][0]['pregunta_texto'] and registro['items'][0]['primera_respuesta']
    assert pestana(cliente)['leer_primero'] == []
    pestana(cliente, '/no-existe', esperado=404)
    pestana(cliente, '/t-expectativas', estudiante='est-beto', esperado=404)
    pestana(cliente, estudiante='est-beto', esperado=404)


@pytest.fixture
def llm(aplicacion_contenido):
    return aplicacion_contenido.state.cliente_llm


def test_pieza_guarda_su_origen_sin_cambiar_lo_que_lee_el_estudiante(aplicacion_contenido, cliente_contenido, llm,
                                                                    sesion_contenido):
    cliente = cliente_contenido
    fijar_ahora(aplicacion_contenido)
    avanzar(cliente, REQUERIDAS[0], REQUERIDAS[REQUERIDAS.index('b4-1') - 1])
    responder_registro(cliente, 'b4-1')
    guardadas = [e for r in _respuestas_de(sesion_contenido, 'b4-1') for e in r.opciones_elegidas or ()]
    piezas = [e for e in guardadas if 'origen' in e]
    assert piezas and all(e['origen'] for e in piezas)
    # El estudiante sigue recibiendo solo código y texto.
    leido = item_de(leer_registro(cliente, 'b4-1'), 'b4-1-respalda')['respuesta']['opciones_elegidas']
    assert all(set(e) == {'codigo', 'texto'} for e in leido)
    item = next(i for i in pestana(cliente, '/b4-1')['items'] if i['codigo'] == 'b4-1-respalda')
    assert item['eleccion'] == 'PIEZAS' and item['elegidas'][0]['origen'] == piezas[0]['origen']
    assert item['ecos'] and all(e['hoy'] is None for e in item['ecos'])


def test_valores_con_que_respondio_frente_a_los_de_hoy(aplicacion_contenido, cliente_contenido, llm):
    cliente = cliente_contenido
    fijar_ahora(aplicacion_contenido)
    avanzar(cliente, REQUERIDAS[0], REQUERIDAS[REQUERIDAS.index('b4-1') - 1])
    responder_registro(cliente, 'b4-1')
    antes = next(i for i in pestana(cliente, '/b4-1')['items'] if i['codigo'] == 'b4-1-respalda')
    pedir(cliente, 'POST', '/acciones/planes/ordenar', {'cuenta': 'est-ana', 'carreras': [PERIODISMO, PSICOLOGIA],
                                                        'fecha_hora': FECHA})
    despues = next(i for i in pestana(cliente, '/b4-1')['items'] if i['codigo'] == 'b4-1-respalda')
    # Se muestra con los valores de entonces y, al final de la línea, solo el dato de hoy que cambió.
    sin_hoy = lambda ecos: [{**e, 'hoy': None} for e in ecos]  # noqa: E731
    assert sin_hoy(despues['ecos']) == sin_hoy(antes['ecos']) and despues['pregunta_texto'] == antes['pregunta_texto']
    cambiado, = [e for e in despues['ecos'] if e['hoy']]
    assert cambiado['fuente'] == 'OTRO' and cambiado['hoy']['texto'] not in (None, cambiado['eco']['carrera'])


def test_sin_valores_guardados_se_muestran_los_de_hoy_sin_afirmar_que_eran_los_de_entonces(
        aplicacion_contenido, cliente_contenido, llm, sesion_contenido):
    cliente = cliente_contenido
    fijar_ahora(aplicacion_contenido)
    avanzar(cliente, REQUERIDAS[0], REQUERIDAS[REQUERIDAS.index('b4-1') - 1])
    responder_registro(cliente, 'b4-1')
    sesion_contenido.execute(update(m.RespuestaRegistro).values(valores_contexto=None))
    sesion_contenido.commit()
    item = next(i for i in pestana(cliente, '/b4-1')['items'] if i['codigo'] == 'b4-1-respalda')
    # Se muestran los de hoy y no se dice que cambiaron.
    assert item['ecos'] and all(e['hoy'] is None for e in item['ecos'])
