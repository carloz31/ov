"""Ajuste panel-salon §3: alertas configurables en la base y sus evaluadores, con sus bordes."""

import logging

from sqlalchemy import select, update

from app import models as m
from app.models import TipoEventoUso
from soporte_panel import AHORA, alerta, evento, fijar_ahora, panel, senales, ver


def test_seguridad_baja_alerta_con_tres_senales_bajas_y_no_con_dos(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    senales(sesion, 'est-ana', 4, 2, 1)
    senales(sesion, 'est-luis', 1, 2, 2)
    senales(sesion, 'est-mia', 2, 4, 1)  # una alta en medio corta la racha
    sesion.commit()
    fila = alerta(panel(cliente), 'seguridad-baja')
    assert fila['cantidad'] == 1 and fila['nombres'] == ['Luis']
    assert fila['descripcion'] == ('Sus 3 últimas señales registradas fueron 2 o menos, sin importar cada cuánto '
                                   'ingresan.')
    assert ver(cliente, 'alerta', 'seguridad-baja') == ['est-luis']


def test_cambiar_el_parametro_en_la_base_cambia_el_resultado_y_el_texto(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    senales(sesion, 'est-ana', 4, 2, 1)
    sesion.execute(update(m.Alerta).where(m.Alerta.codigo == 'seguridad-baja').values(
        parametros={'senales': 2, 'nivel_maximo': 2}))
    sesion.execute(update(m.Alerta).where(m.Alerta.codigo == 'sin-ingreso').values(parametros={'dias': 3}))
    for codigo, dias in (('est-ana', 1), ('est-luis', 4), ('est-mia', 2), ('est-teo', 2), ('est-sol', 2)):
        evento(sesion, codigo, TipoEventoUso.INGRESO, dias)
    sesion.commit()
    datos = panel(cliente)
    assert alerta(datos, 'seguridad-baja')['nombres'] == ['Ana']
    assert alerta(datos, 'seguridad-baja')['descripcion'].startswith('Sus 2 últimas señales')
    assert alerta(datos, 'sin-ingreso') == {'codigo': 'sin-ingreso', 'nombre': 'No ingresan hace 3 días o más',
                                             'descripcion': None, 'cantidad': 1, 'nombres': ['Luis']}


def test_sin_ingreso_cuenta_a_quien_nunca_ingreso_y_usa_la_hora_de_lima(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    evento(sesion, 'est-ana', TipoEventoUso.INGRESO, 6)
    evento(sesion, 'est-luis', TipoEventoUso.INGRESO, 7)
    sesion.commit()
    datos = panel(cliente)
    assert set(ver(cliente, 'alerta', 'sin-ingreso')) == {'est-luis', 'est-mia', 'est-teo', 'est-sol'}
    assert datos['indicadores']['ingresaron'] == 1 and datos['indicadores']['dias_ingreso'] == 7
    assert datos['fecha'] == AHORA.date().isoformat()


def test_alerta_inactiva_no_aparece_y_una_fila_nueva_con_evaluador_existente_aparece_sola(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    sesion.execute(update(m.Alerta).where(m.Alerta.codigo == 'sin-ingreso').values(activa=False))
    grupo = sesion.scalar(select(m.GrupoAlerta).where(m.GrupoAlerta.codigo == 'conversar'))
    # DATO DE PRUEBA: una variante de un evaluador existente, sin la clave `nivel_maximo` (toma su defecto, 2).
    sesion.add(m.Alerta(codigo='t-una-senal', grupo_id=grupo.id, nombre='Última señal baja',
                        descripcion='Su última {senales} fue {nivel_maximo} o menos.', evaluador='seguridad_baja',
                        parametros={'senales': 1}, orden=9))
    senales(sesion, 'est-teo', 2)
    sesion.commit()
    datos = panel(cliente)
    assert alerta(datos, 'sin-ingreso') is None
    nueva = alerta(datos, 't-una-senal')
    assert nueva['nombres'] == ['Teo'] and nueva['descripcion'] == 'Su última 1 fue 2 o menos.'
    [conversar] = [g for g in datos['avisos']['grupos'] if g['codigo'] == 'conversar']
    assert [a['codigo'] for a in conversar['alertas']][-1] == 't-una-senal'


def test_evaluador_inexistente_se_omite_con_aviso_en_el_log(aplicacion, cliente, sesion, caplog):
    fijar_ahora(aplicacion)
    sesion.execute(update(m.Alerta).where(m.Alerta.codigo == 'familia-pendiente').values(evaluador='no_existe'))
    sesion.commit()
    with caplog.at_level(logging.WARNING):
        datos = panel(cliente)
    assert alerta(datos, 'familia-pendiente') is None
    assert alerta(datos, 'sin-ingreso') is not None
    assert 'no_existe' in caplog.text


def test_grupos_y_alertas_en_el_orden_de_la_base_y_sin_cantidades_cero(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    senales(sesion, 'est-ana', 1, 1, 1)
    sesion.commit()
    datos = panel(cliente)
    assert [g['codigo'] for g in datos['avisos']['grupos']] == ['conversar', 'atras']
    assert [a['codigo'] for a in datos['avisos']['grupos'][1]['alertas']] == ['sin-ingreso', 'familia-pendiente']
    assert datos['avisos']['con_avisos'] == 5
    assert set(ver(cliente, 'avisos')) == {'est-ana', 'est-luis', 'est-mia', 'est-teo', 'est-sol'}


def test_nombres_solo_si_caben(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    sesion.execute(update(m.Parametro).where(m.Parametro.codigo == 'PANEL_NOMBRES_VISIBLES_ALERTA').values(valor='4'))
    sesion.commit()
    assert alerta(panel(cliente), 'sin-ingreso') == {
        'codigo': 'sin-ingreso', 'nombre': 'No ingresan hace 7 días o más', 'descripcion': None, 'cantidad': 5,
        'nombres': None}


def test_familia_pendiente_sin_vinculo_o_sin_ingreso_del_apoderado(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    assert set(ver(cliente, 'alerta', 'familia-pendiente')) == {'est-ana', 'est-luis', 'est-mia', 'est-teo', 'est-sol'}
    evento(sesion, 'apo-rosa', TipoEventoUso.INGRESO, 30)
    sesion.commit()
    assert set(ver(cliente, 'alerta', 'familia-pendiente')) == {'est-mia', 'est-teo', 'est-sol'}
    assert panel(cliente)['indicadores']['familias_participando'] == 2
