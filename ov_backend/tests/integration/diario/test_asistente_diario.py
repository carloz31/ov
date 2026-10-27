"""B09: preguntas personalizadas (HU-029) y pregunta del día (HU-030), con el evaluador falso."""

from dataclasses import asdict
from datetime import date, datetime, timedelta
import json

import pytest
from sqlalchemy import select

from app import models as m
from soporte_ruta import FECHA, avanzar, completar, pedir
from soporte_catalogo_ruta import ING_CIVIL


PERSONAL = 't-diario-personal'


@pytest.fixture
def asistente(aplicacion):
    return aplicacion.state.evaluador_respuestas


def abrir(cliente, codigo=PERSONAL, cuenta='est-ana', esperado=200):
    return pedir(cliente, 'POST', '/acciones/diario/abrir-pregunta', {'cuenta': cuenta, 'codigo': codigo}, esperado)


def del_dia(cliente, dia=7, cuenta='est-ana', esperado=200):
    return pedir(cliente, 'POST', '/acciones/diario/pregunta-del-dia',
                 {'cuenta': cuenta, 'fecha_hora': f'2026-10-{dia:02d}T09:00:00'}, esperado)


def recomendaciones(sesion, tipo):
    sesion.expire_all()
    return sesion.scalars(select(m.Recomendacion).where(m.Recomendacion.tipo == tipo).order_by(m.Recomendacion.id)).all()


def test_la_personalizada_guarda_el_contexto_al_desbloquearse_y_se_redacta_una_vez(cliente, sesion, asistente):
    respuesta = avanzar(cliente)
    assert respuesta['entradas_desbloqueadas'] == [
        {'codigo': PERSONAL, 'nombre': 'Lo que espero', 'personalizada': True, 'texto': None}]
    [recomendacion] = [r for r in recomendaciones(sesion, 'DESBLOQUEADA') if r.texto is None]
    viejo = recomendacion.contexto[0]['texto']
    pedir(cliente, 'POST', '/acciones/escribir-entrada',
          {'cuenta': 'est-ana', 'pregunta': PERSONAL, 'texto': 'Aún no'}, 409)
    # El estudiante cambia su respuesta después: la pregunta usa la de ese momento.
    pedir(cliente, 'POST', '/acciones/registro/editar', {'cuenta': 'est-ana', 'actividad': 't-expectativas',
          'fecha_hora': FECHA, 'items': [{'item': 't-exp-espera', 'texto': 'Una respuesta nueva, distinta.'}]})
    primera = abrir(cliente)
    assert primera == {'codigo': PERSONAL, 'nombre': 'Lo que espero', 'respondida': False,
                       'texto': f'Sobre «{viejo[:60]}»: ¿Cómo te sientes con lo que esperas de este camino?'}
    assert abrir(cliente) == primera
    assert asistente.llamadas_diario == 1
    [enviado] = asistente.contextos_diario
    assert [dato.texto for dato in enviado.datos] == [viejo]
    assert recomendaciones(sesion, 'DESBLOQUEADA')[-1].origen == m.OrigenRedaccion.LLM
    pedir(cliente, 'POST', '/acciones/escribir-entrada', {'cuenta': 'est-ana', 'pregunta': PERSONAL, 'texto': 'Ya'})
    assert abrir(cliente)['respondida'] is True


def test_al_llm_solo_van_la_base_y_los_datos_declarados(cliente, asistente):
    avanzar(cliente)
    pedir(cliente, 'POST', '/acciones/escribir-entrada', {'cuenta': 'est-ana', 'texto': 'SECRETO DEL DIARIO'})
    abrir(cliente)
    [enviado] = asistente.contextos_diario
    serializado = json.dumps(asdict(enviado), ensure_ascii=False)
    assert set(asdict(enviado)) == {'pregunta_base', 'datos'}
    assert all(set(asdict(dato)) == {'tipo', 'texto', 'opciones'} for dato in enviado.datos)
    for prohibido in ('est-ana', 'Ana', 'SECRETO DEL DIARIO', 't-ref-diario-espera'):
        assert prohibido not in serializado


def test_si_el_llm_falla_se_guarda_la_base(cliente, sesion, asistente):
    avanzar(cliente)
    asistente.falla_diario = True
    assert abrir(cliente)['texto'] == '¿Cómo te sientes con lo que esperas de este camino?'
    assert recomendaciones(sesion, 'DESBLOQUEADA')[-1].origen == m.OrigenRedaccion.FIJA
    asistente.falla_diario = False
    abrir(cliente)
    assert asistente.llamadas_diario == 1


def test_contexto_vacio_guarda_la_base_sin_llamar_al_llm(cliente, sesion, asistente):
    completar(cliente, 't-inicio')
    # Evento crudo: se desbloquea la personalizada sin que exista la respuesta que cita.
    respuesta = pedir(cliente, 'POST', '/eventos',
                      {'cuenta': 'est-ana', 'tipo': 'COMPLETA_ACTIVIDAD', 'referencia': 't-expectativas'})
    assert 'R-t-diario-personal' in {d['regla'] for d in respuesta['nuevos_desbloqueos']}
    [recomendacion] = [r for r in recomendaciones(sesion, 'DESBLOQUEADA') if r.origen is not None and r.contexto is None
                       and r.texto.startswith('¿Cómo')]
    assert recomendacion.origen == m.OrigenRedaccion.FIJA
    assert abrir(cliente)['texto'] == '¿Cómo te sientes con lo que esperas de este camino?'
    assert asistente.llamadas_diario == 0


def test_pregunta_del_dia_una_por_vigencia_y_la_vencida_no_se_responde(cliente, sesion):
    completar(cliente, 't-inicio')
    primera = del_dia(cliente, 7)
    assert primera['fecha'] == '2026-10-07' and primera['respondida'] is False
    assert del_dia(cliente, 7) == primera
    assert len(recomendaciones(sesion, 'DIARIA')) == 1
    pedir(cliente, 'POST', '/acciones/escribir-entrada',
          {'cuenta': 'est-ana', 'del_dia': True, 'texto': 'Ayer', 'fecha_hora': '2026-10-08T09:00:00'}, 409)
    pedir(cliente, 'POST', '/acciones/escribir-entrada',
          {'cuenta': 'est-ana', 'del_dia': True, 'texto': 'Hoy', 'fecha_hora': '2026-10-07T20:00:00'})
    assert del_dia(cliente, 7)['respondida'] is True
    pedir(cliente, 'POST', '/acciones/escribir-entrada',
          {'cuenta': 'est-ana', 'del_dia': True, 'texto': 'Otra vez', 'fecha_hora': '2026-10-07T21:00:00'}, 409)
    segunda = del_dia(cliente, 8)
    assert segunda['fecha'] == '2026-10-08' and segunda['respondida'] is False
    entrada = pedir(cliente, 'GET', '/cuentas/est-ana/diario/entradas')[0]
    assert (entrada['origen'], entrada['pregunta']) == ('RECOMENDACION_DIA', primera['texto'])


def test_pregunta_del_dia_exige_el_diario_y_es_solo_de_estudiantes(cliente):
    del_dia(cliente, esperado=409)
    del_dia(cliente, cuenta='apo-rosa', esperado=409)


def sembrar_partida(sesion, puntajes):
    """DATO DE PRUEBA: resultado de partida con el promedio indicado por dimensión."""
    cuenta = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == 'est-ana'))
    aplicacion = sesion.scalar(select(m.Aplicacion).where(m.Aplicacion.codigo == 'APL-PARTIDA'))
    resultado = m.ResultadoInstrumento(cuenta_id=cuenta.id, aplicacion_id=aplicacion.id, calculado_en=datetime(2026, 10, 1))
    sesion.add(resultado)
    sesion.flush()
    for codigo, promedio in puntajes.items():
        dimension = sesion.scalar(select(m.Dimension).where(m.Dimension.codigo == codigo))
        items = len(sesion.scalars(select(m.ItemInstrumento.id).where(m.ItemInstrumento.dimension_id == dimension.id)).all())
        sesion.add(m.ResultadoDimension(resultado_id=resultado.id, dimension_id=dimension.id, puntaje=promedio * items,
                                        puntaje_maximo=4 * items, porcentaje=promedio * 25))
    sesion.commit()


def dimensiones_sorteadas(sesion, cliente, dias):
    for dia in range(1, dias + 1):
        fecha = (date(2026, 10, 1) + timedelta(days=dia)).isoformat()
        pedir(cliente, 'POST', '/acciones/diario/pregunta-del-dia', {'cuenta': 'est-ana', 'fecha_hora': f'{fecha}T09:00:00'})
    preguntas = {p.id: p for p in sesion.scalars(select(m.PreguntaDiario))}
    dimensiones = {d.id: d.codigo for d in sesion.scalars(select(m.Dimension))}
    return [(preguntas[r.pregunta_diario_id].codigo, dimensiones.get(preguntas[r.pregunta_diario_id].dimension_id))
            for r in recomendaciones(sesion, 'DIARIA')]


def test_la_dimension_mas_baja_sale_mas_seguido(cliente, sesion, monkeypatch):
    monkeypatch.setattr('app.services.diario.acciones.N_SIN_REPETIR_DIARIA', 0)
    completar(cliente, 't-inicio')
    sembrar_partida(sesion, {f'AUTO-{c}': 4 for c in 'ABCDE'} | {'AUTO-A': 1})
    sorteadas = [dimension for _, dimension in dimensiones_sorteadas(sesion, cliente, 40)]
    assert sorteadas.count('AUTO-A') > sorteadas.count('AUTO-B') + sorteadas.count(None)


def test_no_repite_las_recientes_ni_elige_una_sin_datos(cliente, sesion):
    from app.core.parametros import N_SIN_REPETIR_DIARIA
    completar(cliente, 't-inicio')
    codigos = [codigo for codigo, _ in dimensiones_sorteadas(sesion, cliente, 12)]
    assert 't-dia-favoritos' not in codigos
    for indice, codigo in enumerate(codigos):
        assert codigo not in codigos[max(0, indice - N_SIN_REPETIR_DIARIA):indice]


def test_la_diaria_de_favoritos_cita_los_favoritos(cliente, sesion, asistente, monkeypatch):
    completar(cliente, 't-inicio')
    pedir(cliente, 'POST', '/acciones/marcar-favorito', {'cuenta': 'est-ana', 'tipo': 'CARRERA', 'codigo': ING_CIVIL})
    sorteadas = dimensiones_sorteadas(sesion, cliente, 12)
    assert ('t-dia-favoritos', 'AUTO-B') in sorteadas
    favoritos = next(r for r in recomendaciones(sesion, 'DIARIA') if r.origen == m.OrigenRedaccion.LLM)
    assert favoritos.contexto[0]['tipo'] == 'FAVORITOS' and favoritos.contexto[0]['opciones']
    assert favoritos.contexto[0]['opciones'][0] in favoritos.texto
