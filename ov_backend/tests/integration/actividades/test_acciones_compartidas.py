"""R33–R34: acciones compartidas y SQL agrupado; DATO DE PRUEBA."""

from soporte_datos_ports import agregar_autores
from soporte_datos_ports import insignia_por_evento, preparar_conversacion
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
    datos = {'cuenta': 'est-ana', 'conversacion': 'conv-prueba'}
    # B12: se marca solo con las dos respuestas; cada uno responde tras su sección y su carta.
    rechazo = pedir(cliente, 'POST', '/acciones/completar-conversacion', datos, 409)
    assert rechazo['detail']['mensaje'] == 'Los dos deben responder la pregunta antes de marcar la conversación'
    for actividad in ('t-apo-1', 't-apo-carta'):
        completar(cliente, actividad, 'apo-rosa')
    for cuenta in ('est-ana', 'apo-rosa'):
        pedir(cliente, 'POST', '/acciones/escribir-carta', {'cuenta': cuenta, 'texto': 'DATO DE PRUEBA'})
        pedir(cliente, 'POST', '/acciones/responder-conversacion', {**datos, 'cuenta': cuenta, 'texto': 'DATO DE PRUEBA'})
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
            pedir(cliente, 'POST', '/acciones/completar-conversacion', datos)
    assert filas_base(aplicacion) == antes
    respuesta, contador = medir(cliente, aplicacion, 'POST', '/acciones/completar-conversacion', datos, limite=12)
    assert set(respuesta['por_cuenta']) == {'est-ana', 'apo-rosa'}
    # B12: el evento es solo del estudiante.
    assert [e['tipo'] for e in respuesta['por_cuenta']['est-ana']['eventos_registrados']] == ['COMPLETA_CONVERSACION']
    assert respuesta['por_cuenta']['apo-rosa']['eventos_registrados'] == []
    assert 'R-ins-prueba-conversacion' in {d['regla'] for d in respuesta['por_cuenta']['est-ana']['nuevos_desbloqueos']}
    assert respuesta['por_cuenta']['apo-rosa']['nuevos_desbloqueos'] == []
    primera = filas_base(aplicacion)
    repetida = pedir(cliente, 'POST', '/acciones/completar-conversacion', datos)
    assert all(r['eventos_registrados'] == r['nuevos_desbloqueos'] == [] for r in repetida['por_cuenta'].values())
    assert filas_base(aplicacion) == primera
    repetida = pedir(cliente, 'POST', '/acciones/completar-conversacion', {**datos, 'cuenta': 'apo-rosa'})
    assert all(r['eventos_registrados'] == r['nuevos_desbloqueos'] == [] for r in repetida['por_cuenta'].values())
    assert filas_base(aplicacion) == primera


def test_r34_coautoria_independiente_y_sql_de_dos_a_veinte(tmp_path, base_aislada):
    cantidades = []
    for cantidad in (2, 20):
        with base_aislada(tmp_path, f'autores-{cantidad}') as (aplicacion, cliente):
            autores = ['est-ana', 'est-luis']
            with aplicacion.state.fabrica_sesiones.begin() as sesion:
                agregar_autores(sesion, cantidad, autores)
                insignia_por_evento(sesion, 'ins-prueba-entrevista', 'PUBLICA_ENTREVISTA')
            # Ana ya tiene la insignia; la nueva publicación se evalúa individualmente.
            pedir(cliente, 'POST', '/acciones/publicar-entrevista', {'autores': ['est-ana'], 'resumen': 'DATO DE PRUEBA'})
            respuesta, contador = medir(cliente, aplicacion, 'POST', '/acciones/publicar-entrevista',
                {'autores': autores, 'resumen': 'DATO DE PRUEBA'})
            assert set(respuesta['por_cuenta']) == set(autores)
            for codigo, salida in respuesta['por_cuenta'].items():
                assert [e['tipo'] for e in salida['eventos_registrados']] == ['PUBLICA_ENTREVISTA']
                assert ('R-ins-prueba-entrevista' in {d['regla'] for d in salida['nuevos_desbloqueos']}) == (codigo != 'est-ana')
            cantidades.append(contador.cantidad)
    assert cantidades[0] == cantidades[1]
