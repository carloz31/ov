"""Contrato de las consultas por dominio."""

import pytest
from sqlalchemy import select

from app.models import Actividad, Bloque, Cuenta, EstadoProgreso, ProgresoActividad, Visibilidad
from datos.fijos import SECCIONES
from datos.ruta import (
    ACTIVIDADES, BLOQUES, FICHAS, INSIGNIAS, NIVELES, PREGUNTAS_DIARIO, PROPIEDADES, REGLAS, TESTIMONIOS, contenido,
)
from soporte_ruta import BLOQUE_FAMILIA, avanzar, completar, pedir, responder


# Estados de cada actividad del estudiante, al inicio y con la Ciudad abierta.
ESTADOS = {
    False: {'t-inicio': 'DISPONIBLE', 't-partida': 'DISPONIBLE', 't-llegada': 'BLOQUEADA', 't-cierre-inicio': 'BLOQUEADA', 't-expectativas': 'BLOQUEADA',
            't-opcional': 'BLOQUEADA', 't-valores': 'BLOQUEADA', 't-mision-intereses': 'BLOQUEADA', 't-mision-intereses-2': 'BLOQUEADA',
            't-caso': 'BLOQUEADA', 't-contraste': 'BLOQUEADA', 't-adicional': 'BLOQUEADA', 't-eco': 'BLOQUEADA',
            't-lee-cuestionario': 'BLOQUEADA', 't-batalla': 'BLOQUEADA', 't-explorar': 'BLOQUEADA'},
    True: {'t-inicio': 'COMPLETADA', 't-partida': 'COMPLETADA', 't-llegada': 'BLOQUEADA', 't-cierre-inicio': 'COMPLETADA', 't-expectativas': 'COMPLETADA',
           't-opcional': 'DISPONIBLE', 't-valores': 'DISPONIBLE', 't-mision-intereses': 'DISPONIBLE', 't-mision-intereses-2': 'BLOQUEADA',
           't-caso': 'BLOQUEADA', 't-contraste': 'BLOQUEADA', 't-adicional': 'DISPONIBLE', 't-eco': 'DISPONIBLE',
           't-lee-cuestionario': 'DISPONIBLE', 't-batalla': 'DISPONIBLE', 't-explorar': 'BLOQUEADA'},
}
# Secciones del estudiante abiertas con la Ciudad abierta (al inicio, todas bloqueadas).
SECCIONES_ESTUDIANTE = [codigo for codigo, _, audiencia in sorted(SECCIONES) if audiencia == 'ESTUDIANTE']
MENSAJES = {objetivo: mensaje for _, tipo, objetivo, mensaje, _ in REGLAS if tipo == 'SECCION'}


RUTAS = ('resumen', 'actividades', 'fichas', 'logros', 'testimonios', 'diario/preguntas', 'secciones')


def consultar(cliente, ruta, cuenta='est-ana'):
    respuesta = cliente.get(f'/cuentas/{cuenta}/{ruta}')
    if ruta == 'diario/preguntas' and respuesta.status_code == 409:
        return respuesta.json()['detail']['mensaje']
    assert respuesta.status_code == 200, respuesta.text
    datos = respuesta.json()
    if ruta == 'actividades':
        # `bloqueo` se comprueba aparte (test_bloqueo_actividades.py); aquí, solo que acompaña a BLOQUEADA.
        for bloque in datos:
            assert (bloque.pop('bloqueo') is None) == (bloque['estado'] == 'DISPONIBLE')
            for actividad in bloque['actividades']:
                assert (actividad.pop('bloqueo') is None) == (actividad['estado'] != 'BLOQUEADA')
    if ruta == 'secciones':
        return [(seccion['codigo'], seccion['estado'], seccion['bloqueo'] is None) for seccion in datos]
    return datos


def esperado(ruta, completo):
    if ruta == 'resumen':
        numero = 2 if completo else 1
        return {'cuenta': {'codigo': 'est-ana', 'nombre': 'Ana', 'rol': 'ESTUDIANTE'},
                'nivel_actual': {'numero': numero, 'titulo': NIVELES[numero - 1][1]}}
    if ruta == 'actividades':
        return [{
            'codigo': bloque, 'nombre': nombre, 'numero': numero, 'espacio': espacio,
            'estado': 'DISPONIBLE' if bloque == 'T0' or completo and bloque != 'T2' else 'BLOQUEADA',
            'actividades': [
                {'codigo': actividad, 'titulo': titulo, 'tipo': tipo, 'orden': orden,
                 'contenido': contenido(actividad),
                 'visibilidad': PROPIEDADES.get(actividad, {}).get('visibilidad', 'SIEMPRE'),
                 'visible': 'visibilidad' not in PROPIEDADES.get(actividad, {}) or ESTADOS[completo][actividad] != 'BLOQUEADA',
                 'estado': ESTADOS[completo][actividad],
                 'requerida': PROPIEDADES.get(actividad, {}).get('requerida', True),
                 'duracion_estimada_min': duracion,
                 'descripcion': PROPIEDADES.get(actividad, {}).get('descripcion')}
                for orden, (actividad, _, titulo, tipo, _, duracion) in enumerate(
                    (fila for fila in ACTIVIDADES if fila[1] == bloque), 1)
            ],
        } for bloque, numero, nombre, espacio, audiencia in BLOQUES if audiencia == 'ESTUDIANTE']
    if ruta == 'fichas':
        return [{'codigo': codigo, 'titulo': titulo, 'estado': 'DISPONIBLE' if completo else 'BLOQUEADA'}
                for codigo, titulo, _, audiencia in sorted(FICHAS) if audiencia == 'ESTUDIANTE']
    if ruta == 'logros':
        insignias = []
        for codigo, nombre, descripcion, requisito, oculta in sorted(INSIGNIAS):
            insignias.append(
                {'codigo': '???', 'nombre': 'Logro oculto', 'descripcion': None, 'requisito': None, 'estado': 'BLOQUEADA'}
                if oculta else {'codigo': codigo, 'nombre': nombre, 'descripcion': descripcion,
                                'requisito': requisito, 'estado': 'OBTENIDA' if completo and codigo == 't-ins-1' else 'BLOQUEADA'}
            )
        return {'insignias': insignias, 'niveles': [
            {'numero': numero, 'titulo': titulo, 'estado': 'OBTENIDO' if numero <= (2 if completo else 1) else 'BLOQUEADO'}
            for numero, titulo in NIVELES
        ], 'afinidad': 0.0}
    if ruta == 'testimonios':
        # Se abren al superar el caso, que en este recorrido sigue sin resolverse.
        return [{'codigo': codigo, 'titulo': titulo, 'estado': 'BLOQUEADA', 'visto': False, 'pista': pista,
                 'descripcion': None, 'enlace': None}
                for codigo, titulo, _, _, pista in sorted(TESTIMONIOS)]
    if ruta == 'secciones':
        return [(codigo, 'DISPONIBLE' if completo else 'BLOQUEADA', completo) for codigo in SECCIONES_ESTUDIANTE]
    if ruta == 'diario/preguntas':
        if not completo:
            return MENSAJES['DIARIO']
        # B09: el recorrido abre las dos desbloqueables; la personalizada queda por redactar hasta abrirla.
        return [{'codigo': codigo, 'nombre': nombre, 'estado': 'DISPONIBLE', 'personalizada': personalizada,
                 'redactada': not personalizada, 'respondida': False}
                for codigo, nombre, _, uso, personalizada, _ in sorted(PREGUNTAS_DIARIO) if uso == 'DESBLOQUEABLE']
    return []


@pytest.mark.parametrize('ruta', RUTAS)
@pytest.mark.parametrize('completo', [False, True], ids=['inicio', 'ciudad_abierta'])
def test_contrato_y_valores_ruta(cliente, ruta, completo):
    if completo:
        avanzar(cliente)
    assert consultar(cliente, ruta) == esperado(ruta, completo)


@pytest.mark.parametrize('ruta', RUTAS)
def test_cuenta_inexistente(cliente, ruta):
    respuesta = cliente.get(f'/cuentas/no-existe/{ruta}')
    assert respuesta.status_code == 404
    assert respuesta.json() == {'detail': 'Cuenta no encontrada'}


@pytest.mark.parametrize('ruta', RUTAS)
def test_apoderado_sin_listas_estudiantiles(cliente, ruta):
    respuesta = consultar(cliente, ruta, 'apo-rosa')
    if ruta == 'resumen':
        assert respuesta == {'cuenta': {'codigo': 'apo-rosa', 'nombre': 'Rosa', 'rol': 'APODERADO'}, 'nivel_actual': None}
    elif ruta == 'logros':
        assert respuesta == {'insignias': [], 'niveles': []}
    elif ruta == 'secciones':
        assert respuesta == [('CONVERSACIONES', 'BLOQUEADA', False)]
    elif ruta == 'fichas':
        assert respuesta == [{'codigo': 't-ficha-apo', 'titulo': 'Ficha del apoderado', 'estado': 'BLOQUEADA'}]
    elif ruta == 'actividades':
        assert respuesta == [{**{clave: valor for clave, valor in BLOQUE_FAMILIA.items() if clave != 'bloqueo'},
                              'actividades': [{clave: valor for clave, valor in actividad.items() if clave != 'bloqueo'}
                                              for actividad in BLOQUE_FAMILIA['actividades']]}]
    else:
        assert respuesta == []


@pytest.mark.parametrize('visibilidad', list(Visibilidad))
@pytest.mark.parametrize('estado', ['BLOQUEADA', 'DISPONIBLE', 'EN_CURSO', 'COMPLETADA'])
def test_visibilidad_no_oculta_filas_ni_titulos(sesion, cliente, visibilidad, estado):
    codigo = 't-cierre-inicio' if estado == 'BLOQUEADA' else 't-inicio'
    actividad = sesion.scalar(select(Actividad).where(Actividad.codigo == codigo))
    actividad.visibilidad = visibilidad  # DATO DE PRUEBA: variante temporal, sin cambiar la ruta.
    if estado in ('EN_CURSO', 'COMPLETADA'):
        ana = sesion.scalar(select(Cuenta).where(Cuenta.codigo == 'est-ana'))
        sesion.add(ProgresoActividad(cuenta_id=ana.id, actividad_id=actividad.id, estado=EstadoProgreso(estado)))
    sesion.commit()
    actividades = consultar(cliente, 'actividades')[0]['actividades']
    assert len(actividades) == 3
    recibida = next(fila for fila in actividades if fila['codigo'] == codigo)
    assert recibida['titulo'] == actividad.titulo
    assert recibida['estado'] == estado
    assert recibida['visibilidad'] == visibilidad.value
    assert recibida['visible'] is (visibilidad == Visibilidad.SIEMPRE or estado != 'BLOQUEADA')


def test_actividad_al_desbloquear_cambia_de_visible_con_la_accion(sesion, cliente):
    actividad = sesion.scalar(select(Actividad).where(Actividad.codigo == 't-cierre-inicio'))
    actividad.visibilidad = Visibilidad.AL_DESBLOQUEAR  # DATO DE PRUEBA.
    sesion.commit()
    assert consultar(cliente, 'actividades')[0]['actividades'][2]['visible'] is False
    completar(cliente, 't-inicio')
    recibida = consultar(cliente, 'actividades')[0]['actividades'][2]
    assert recibida['estado'] == 'DISPONIBLE' and recibida['visible'] is True


@pytest.mark.parametrize('codigo', ['t-cierre-inicio', 't-mision-intereses'], ids=['actividad_bloqueada', 'bloque_bloqueado'])
def test_bloqueo_prevalece_sobre_progreso(sesion, cliente, codigo):
    ana = sesion.scalar(select(Cuenta).where(Cuenta.codigo == 'est-ana'))
    actividad = sesion.scalar(select(Actividad).where(Actividad.codigo == codigo))
    sesion.add(ProgresoActividad(cuenta_id=ana.id, actividad_id=actividad.id, estado=EstadoProgreso.COMPLETADA))
    sesion.commit()
    recibida = next(a for b in consultar(cliente, 'actividades') for a in b['actividades'] if a['codigo'] == codigo)
    assert recibida['estado'] == 'BLOQUEADA'


def test_cuestionario_en_curso_y_lecturas_aisladas_por_cuenta(cliente):
    avanzar(cliente)
    responder(cliente, 't-mision-intereses', fin=3)
    assert consultar(cliente, 'actividades')[3]['actividades'][0]['estado'] == 'EN_CURSO'
    for ruta in RUTAS:
        luis = consultar(cliente, ruta, 'est-luis')
        if ruta == 'resumen':
            inicial = esperado(ruta, False)
            inicial['cuenta'] = {'codigo': 'est-luis', 'nombre': 'Luis', 'rol': 'ESTUDIANTE'}
        else:
            inicial = esperado(ruta, False)
        assert luis == inicial


def test_orden_por_numero_y_codigo_y_por_orden_y_codigo(sesion, cliente):
    # DATO DE PRUEBA: el empate y el orden inverso distinguen ambas claves de ordenación.
    ciudad = sesion.scalar(select(Bloque).where(Bloque.codigo == 'CIUDAD'))
    ciudad.numero = 0
    inicio = sesion.scalar(select(Actividad).where(Actividad.codigo == 't-inicio'))
    inicio.orden = 3
    sesion.commit()
    bloques = consultar(cliente, 'actividades')
    assert [b['codigo'] for b in bloques] == ['CIUDAD', 'T0', 'T1', 'T2']
    assert [a['codigo'] for a in bloques[1]['actividades']] == ['t-partida', 't-cierre-inicio', 't-inicio']
    ciudad.numero = 2
    sesion.commit()
    assert [b['codigo'] for b in consultar(cliente, 'actividades')] == ['T0', 'CIUDAD', 'T1', 'T2']


def test_insignia_oculta_solo_se_revela_al_obtenerse(cliente):
    ocultas = [i for i in consultar(cliente, 'logros')['insignias'] if i['codigo'] == '???']
    # B10: además de t-ins-oculta, tres logros ocultos por vistas diversas del catálogo.
    assert ocultas == [{'codigo': '???', 'nombre': 'Logro oculto', 'descripcion': None, 'requisito': None, 'estado': 'BLOQUEADA'}] * 4
    pedir(cliente, 'POST', '/eventos', {'cuenta': 'est-ana', 'tipo': 'VENCE_DESAFIO_INTACTO'})
    insignias = consultar(cliente, 'logros')['insignias']
    assert len([i for i in insignias if i['codigo'] == '???']) == 3
    revelada = next(i for i in insignias if i['codigo'] == 't-ins-oculta')
    assert revelada['estado'] == 'OBTENIDA' and revelada['descripcion'] and revelada['requisito']
