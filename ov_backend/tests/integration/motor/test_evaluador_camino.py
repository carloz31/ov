"""Evaluador camino."""

from datetime import datetime
from types import SimpleNamespace
import pytest
from soporte_consultas import ContadorConsultas
from soporte_ruta import FECHA
from sqlalchemy import insert, select
from app import models as modelos
from app.core.contexto import ContextoConsultas
from app.services.motor.evaluadores import misiones_camino_sin_inicio
from app.services.motor.reglas import evaluar_regla, registrar_eventos


@pytest.mark.parametrize('minimo', [None, 0, -1, True, 1.5])
def test_evaluador_rechaza_parametros_invalidos(sesion, minimo):
    datos = ContextoConsultas(sesion)
    sesion.info['contexto_consultas'] = datos
    datos.regla_en_evaluacion = SimpleNamespace(parametro_evaluador=minimo)
    cuenta = sesion.scalar(select(modelos.Cuenta).where(modelos.Cuenta.codigo == 'est-ana'))
    with pytest.raises(ValueError, match='parámetro entero positivo'):
        misiones_camino_sin_inicio(sesion, cuenta)


def test_evaluador_exige_regla_y_sin_camino_es_falso(sesion):
    cuenta = sesion.scalar(select(modelos.Cuenta).where(modelos.Cuenta.codigo == 'est-ana'))
    with pytest.raises(ValueError, match='Debe indicar la regla'):
        misiones_camino_sin_inicio(sesion, cuenta)
    datos = ContextoConsultas(sesion)
    sesion.info['contexto_consultas'] = datos
    datos.regla_en_evaluacion = SimpleNamespace(parametro_evaluador=3)
    datos.definiciones = SimpleNamespace(por_codigo=lambda *args: None)
    assert misiones_camino_sin_inicio(sesion, cuenta) is False


def _armar_camino(sesion):
    """DATO DE PRUEBA: `ruta` no tiene bloque CAMINO; el evaluador lo exige por código."""
    bloque = modelos.Bloque(codigo='CAMINO', numero=9, nombre='DATO DE PRUEBA', espacio='MISIONES_CAMPO',
                            audiencia='ESTUDIANTE')
    sesion.add(bloque)
    sesion.flush()
    sesion.add_all(modelos.Actividad(codigo=f'cam-{n}', titulo='DATO DE PRUEBA', tipo='INFORMATIVA',
                                     contenido='prueba', orden=n, bloque_id=bloque.id) for n in range(1, 6))
    sesion.commit()


def test_evaluador_filtra_repeticiones_cuentas_ciudad_y_memoiza_por_umbral(sesion, aplicacion):
    _armar_camino(sesion)
    cuentas = {c.codigo: c for c in sesion.scalars(select(modelos.Cuenta))}
    actividades_por_codigo = {a.codigo: a for a in sesion.scalars(select(modelos.Actividad))}
    ana, luis = cuentas['est-ana'], cuentas['est-luis']
    # DATO DE PRUEBA: eventos crudos para aislar el predicado del evaluador.
    referencias = ['cam-1', 'cam-2', 'cam-2', 'cam-2', 'cam-3', 't-mision-intereses']
    filas = [{'cuenta_id': ana.id, 'tipo': modelos.TipoEventoUso.COMPLETA_ACTIVIDAD,
              'id_referencia': actividades_por_codigo[c].id, 'fecha_hora': datetime.fromisoformat(FECHA)} for c in referencias]
    filas += [{'cuenta_id': luis.id, 'tipo': modelos.TipoEventoUso.COMPLETA_ACTIVIDAD,
               'id_referencia': actividades_por_codigo['cam-4'].id, 'fecha_hora': datetime.fromisoformat(FECHA)},
              {'cuenta_id': ana.id, 'tipo': modelos.TipoEventoUso.COMPLETA_ACTIVIDAD,
               'id_referencia': None, 'fecha_hora': datetime.fromisoformat(FECHA)},
              {'cuenta_id': ana.id, 'tipo': modelos.TipoEventoUso.INGRESO,
               'id_referencia': actividades_por_codigo['cam-5'].id, 'fecha_hora': datetime.fromisoformat(FECHA)}]
    sesion.execute(insert(modelos.EventoUso), filas)
    datos = ContextoConsultas(sesion)
    sesion.info['contexto_consultas'] = datos
    with ContadorConsultas(aplicacion.state.motor_bd) as contador:
        datos.cargar_conteos([ana.id])
    assert contador.cantidad == 1
    def regla(minimo):
        return modelos.ReglaDesbloqueo(codigo=f'PRUEBA-{minimo}', nombre='DATO DE PRUEBA',
            tipo_objetivo=modelos.TipoObjetivo.INSIGNIA, id_objetivo=1,
            evaluador_especial='misiones_camino_sin_inicio', parametro_evaluador=minimo,
            condiciones=[modelos.CondicionDesbloqueo(tipo_evento=modelos.TipoEventoUso.COMPLETA_ACTIVIDAD,
                          tipo_conteo=modelos.TipoConteo.EVENTOS, cantidad_minima=1)])
    with ContadorConsultas(aplicacion.state.motor_bd) as contador:
        assert evaluar_regla(sesion, ana, regla(2)).cumple is True
        assert evaluar_regla(sesion, ana, regla(3)).cumple is False
        assert evaluar_regla(sesion, ana, regla(2)).cumple is True
    assert contador.cantidad == 0
    assert datos.especiales[ana.id] == {('misiones_camino_sin_inicio', 2): True, ('misiones_camino_sin_inicio', 3): False}
    registrar_eventos(sesion, ana, [(modelos.TipoEventoUso.COMPLETA_ACTIVIDAD, actividades_por_codigo['cam-4'].id)],
                      datetime.fromisoformat(FECHA))
    assert evaluar_regla(sesion, ana, regla(3)).cumple is True
