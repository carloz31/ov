"""R33–R34: acciones compartidas y SQL agrupado; DATO DE PRUEBA."""

from soporte_datos_ports import agregar_autores
from soporte_datos_ports import insignia_por_evento, preparar_conversacion
from soporte_investigaciones import FICHA, OCUPACION, guia_lista, guias_listas_directas, guion, pensar
import pytest
from app.services import comun
from soporte_ruta import avanzar, completar, filas_base, pedir
from soporte_retiro import medir


def test_r33_conversacion_actor_disponible_repeticion_y_rollback(cliente, aplicacion, monkeypatch):
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        preparar_conversacion(sesion)
        insignia_por_evento(sesion, 'ins-prueba-conversacion', 'COMPLETA_CONVERSACION')
    avanzar(cliente)
    assert pedir(cliente, 'GET', '/cuentas/apo-rosa/secciones/CONVERSACIONES')['estado'] == 'BLOQUEADA'
    datos = {'cuenta': 'est-ana', 'conversacion': 'conv-prueba', 'texto': 'DATO DE PRUEBA'}
    # B12: cada uno responde tras su sección y su carta. F08: responder el segundo la conversa en ambas cuentas.
    rechazo = pedir(cliente, 'POST', '/acciones/responder-conversacion', datos, 409)
    assert rechazo['detail']['mensaje'] == 'Escribe tu carta para empezar las conversaciones'
    for actividad in ('t-apo-1', 't-apo-2'):
        completar(cliente, actividad, 'apo-rosa')
    for cuenta in ('est-ana', 'apo-rosa'):
        pedir(cliente, 'POST', '/acciones/escribir-carta', {'cuenta': cuenta, 'texto': 'DATO DE PRUEBA'})
    pedir(cliente, 'POST', '/acciones/responder-conversacion', datos)
    segunda = {**datos, 'cuenta': 'apo-rosa'}
    antes = filas_base(aplicacion)
    original = comun.registrar_eventos
    def fallar(sesion, cuenta, eventos, fecha):
        salida = original(sesion, cuenta, eventos, fecha)
        if cuenta.codigo == 'apo-rosa':
            raise RuntimeError('DATO DE PRUEBA: segunda cuenta')
        return salida
    with monkeypatch.context() as parche:
        parche.setattr(comun, 'registrar_eventos', fallar)
        with pytest.raises(RuntimeError, match='segunda cuenta'):
            pedir(cliente, 'POST', '/acciones/responder-conversacion', segunda)
    assert filas_base(aplicacion) == antes
    respuesta, contador = medir(cliente, aplicacion, 'POST', '/acciones/responder-conversacion', segunda, limite=14)
    assert set(respuesta['por_cuenta']) == {'est-ana', 'apo-rosa'}
    for cuenta in ('est-ana', 'apo-rosa'):
        assert [e['tipo'] for e in respuesta['por_cuenta'][cuenta]['eventos_registrados']] == ['COMPLETA_CONVERSACION']
    assert 'R-ins-prueba-conversacion' in {d['regla'] for d in respuesta['por_cuenta']['est-ana']['nuevos_desbloqueos']}
    assert respuesta['por_cuenta']['apo-rosa']['nuevos_desbloqueos'] == []
    # Con las dos respuestas, responder de nuevo se rechaza sin efectos.
    primera = filas_base(aplicacion)
    for cuenta in ('est-ana', 'apo-rosa'):
        pedir(cliente, 'POST', '/acciones/responder-conversacion', {**datos, 'cuenta': cuenta}, 409)
    assert filas_base(aplicacion) == primera


def test_r34_coautoria_independiente_y_sql_de_dos_a_veinte(tmp_path, base_aislada):
    cantidades = []
    for cantidad in (2, 20):
        with base_aislada(tmp_path, f'autores-{cantidad}') as (aplicacion, cliente):
            # B13: Ana publica sola primero (ya tiene la insignia); la publicación conjunta evalúa a cada autor.
            guia_lista(cliente)
            pedir(cliente, 'POST', '/acciones/publicar-entrevista', {'cuenta': 'est-ana', **FICHA})
            pensar(cliente)
            guion(cliente)
            autores = ['est-ana', 'est-luis']
            with aplicacion.state.fabrica_sesiones.begin() as sesion:
                agregar_autores(sesion, cantidad, autores)
                guias_listas_directas(sesion, autores[1:], OCUPACION)
            respuesta, contador = medir(cliente, aplicacion, 'POST', '/acciones/publicar-entrevista',
                {'cuenta': 'est-ana', **FICHA, 'coautores': autores[1:]}, limite=40)
            assert set(respuesta['por_cuenta']) == set(autores)
            for codigo, salida in respuesta['por_cuenta'].items():
                assert [e['tipo'] for e in salida['eventos_registrados']] == ['PUBLICA_ENTREVISTA']
                assert ('R-t-ins-entrevista' in {d['regla'] for d in salida['nuevos_desbloqueos']}) == (codigo != 'est-ana')
            cantidades.append(contador.cantidad)
    assert cantidades[0] == cantidades[1]
