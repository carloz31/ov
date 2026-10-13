"""R18 y R24: rollback después de persistir cálculo o reinicio."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app import models as m
from app.services import actividades as servicio_actividades
from app.services.instrumentos import resultados as servicio_resultados
from soporte_ruta import INTERESES_FINAL, completar, filas_base, pedir, revelar
from soporte_retiro import ciclo, preparar_ultimo


def test_r18_fallo_despues_de_guardar_resultado_revierte_toda_accion(cliente, aplicacion, monkeypatch):
    preparar_ultimo(cliente)
    completar(cliente, INTERESES_FINAL)
    antes = filas_base(aplicacion)
    original = servicio_resultados.guardar_resultados
    def fallar(sesion, calculos):
        original(sesion, calculos)
        assert sesion.scalar(select(m.ResultadoInstrumento.id)) is not None
        assert sesion.scalar(select(m.ResultadoDimension.resultado_id)) is not None
        assert sesion.scalar(select(m.Coincidencia.resultado_id)) is not None
        raise IntegrityError('DATO DE PRUEBA', {}, RuntimeError('fallo después de guardar'))
    monkeypatch.setattr(servicio_resultados, 'guardar_resultados', fallar)
    revelar(cliente, esperado=409)
    assert filas_base(aplicacion) == antes


def test_r24_reinicio_parcial_y_completo_revierte_despues_del_evento(tmp_path, monkeypatch, base_aislada):
    original = servicio_actividades.responder_con_eventos
    def fallar(sesion, cuenta, eventos, fecha):
        salida = original(sesion, cuenta, eventos, fecha)
        assert salida.eventos_registrados[0].tipo == 'REINICIA_INSTRUMENTO'
        raise IntegrityError('DATO DE PRUEBA', {}, RuntimeError('fallo después del evento'))
    # B06: solo se reinicia un perfil plano revelado.
    for cuenta in ('est-ana', 'est-luis'):
        with base_aislada(tmp_path, f'reinicio-{cuenta}') as (aplicacion, cliente):
            ciclo(cliente, cuenta=cuenta, opcion=3)
            antes = filas_base(aplicacion)
            with monkeypatch.context() as parche:
                parche.setattr(servicio_actividades, 'responder_con_eventos', fallar)
                pedir(cliente, 'POST', '/acciones/reiniciar-instrumento',
                    {'cuenta': cuenta, 'instrumento': 'TEST-RIASEC'}, 409)
            assert filas_base(aplicacion) == antes
