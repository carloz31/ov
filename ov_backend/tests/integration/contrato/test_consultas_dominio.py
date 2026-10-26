"""Contrato de las consultas por dominio."""

from unittest.mock import ANY

import pytest
from sqlalchemy import select

from app.models import Actividad, Bloque, Cuenta, EstadoProgreso, ProgresoActividad, Visibilidad
from datos.fijos import SECCIONES
from datos.ruta import (
    ACTIVIDADES, BLOQUES, DESCRIPCIONES, FICHAS, CITAS_LUMI, GRUPOS_INSIGNIA, INSIGNIAS, NIVELES, PAGINAS_INSIGNIAS, PISTAS_INSIGNIAS,
    TEXTOS_INSIGNIAS,
    PREGUNTAS_DIARIO, PROPIEDADES, RECUERDOS_LUMI,
    REGLAS, TESTIMONIOS, contenido,
)
from soporte_ruta import BLOQUE_FAMILIA, avanzar, completar, pedir, responder


# Estados de cada actividad del estudiante, al inicio y con la Ciudad abierta.
ESTADOS = {
    False: {'t-inicio': 'DISPONIBLE', 't-partida': 'BLOQUEADA', 't-llegada': 'BLOQUEADA', 't-comparar': 'BLOQUEADA', 't-proyecto': 'BLOQUEADA', 't-cierre-inicio': 'BLOQUEADA', 't-expectativas': 'BLOQUEADA',
            't-opcional': 'BLOQUEADA', 't-valores': 'BLOQUEADA', 't-mision-intereses': 'BLOQUEADA', 't-mision-intereses-2': 'BLOQUEADA',
            't-caso': 'BLOQUEADA', 't-contraste': 'BLOQUEADA', 't-adicional': 'BLOQUEADA', 't-eco': 'BLOQUEADA',
            't-lee-cuestionario': 'BLOQUEADA', 't-batalla': 'BLOQUEADA', 't-explorar': 'BLOQUEADA'},
    True: {'t-inicio': 'COMPLETADA', 't-partida': 'COMPLETADA', 't-llegada': 'BLOQUEADA', 't-comparar': 'BLOQUEADA', 't-proyecto': 'BLOQUEADA', 't-cierre-inicio': 'COMPLETADA', 't-expectativas': 'COMPLETADA',
           't-opcional': 'DISPONIBLE', 't-valores': 'DISPONIBLE', 't-mision-intereses': 'DISPONIBLE', 't-mision-intereses-2': 'BLOQUEADA',
           't-caso': 'BLOQUEADA', 't-contraste': 'BLOQUEADA', 't-adicional': 'DISPONIBLE', 't-eco': 'DISPONIBLE',
           't-lee-cuestionario': 'DISPONIBLE', 't-batalla': 'DISPONIBLE', 't-explorar': 'BLOQUEADA'},
}
# Ajuste del diario (F05): los recuerdos de Lumi siguen bloqueados mientras no se escriba en el diario.
for _estados in ESTADOS.values():
    _estados.update(dict.fromkeys(RECUERDOS_LUMI, 'BLOQUEADA'))
    # Ajuste mochila: el segundo caso se abre con el proyecto, que esta ruta no alcanza.
    _estados['t-caso-2'] = 'BLOQUEADA'
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
    if ruta == 'diario/preguntas':
        # Ajuste del diario (F05): los campos de la carta recibida se comprueban en tests/integration/diario.
        recibida = ('recibida_en', 'texto', 'entrada', 'respondida_en', 'bandeja', 'archivada_en', 'actividad')
        datos = [{k: v for k, v in pregunta.items() if k not in recibida} for pregunta in datos]
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
                'nivel_actual': {'numero': numero, 'titulo': NIVELES[numero - 1][1],
                                 'descripcion': NIVELES[numero - 1][2], 'cita_lumi': CITAS_LUMI[numero]}}
    if ruta == 'actividades':
        return [{
            'codigo': bloque, 'nombre': nombre, 'numero': numero, 'espacio': espacio,
            # El bloque LUMI no tiene regla: está abierto; lo que se abre son sus recuerdos.
            'estado': 'DISPONIBLE' if bloque in ('T0', 'LUMI') or completo and bloque != 'T2' else 'BLOQUEADA',
            'actividades': [
                {'codigo': actividad, 'titulo': titulo, 'tipo': tipo, 'orden': orden,
                 'contenido': contenido(actividad),
                 'visibilidad': PROPIEDADES.get(actividad, {}).get('visibilidad', 'SIEMPRE'),
                 'visible': 'visibilidad' not in PROPIEDADES.get(actividad, {}) or ESTADOS[completo][actividad] != 'BLOQUEADA',
                 'estado': ESTADOS[completo][actividad],
                 'requerida': PROPIEDADES.get(actividad, {}).get('requerida', True),
                 'duracion_estimada_min': duracion,
                 'descripcion': DESCRIPCIONES.get(actividad)}
                for orden, (actividad, _, titulo, tipo, _, duracion) in enumerate(
                    (fila for fila in ACTIVIDADES if fila[1] == bloque), 1)
            ],
        } for bloque, numero, nombre, espacio, audiencia in BLOQUES if audiencia == 'ESTUDIANTE']
    if ruta == 'fichas':
        # Ajuste mochila: las dos de t-inicio (T0) se obtienen; la de t-opcional sigue bloqueada y sin detalle.
        bloque = next(fila for fila in BLOQUES if fila[0] == 'T0')
        return [{'codigo': codigo, 'titulo': titulo, 'estado': 'DISPONIBLE', 'tema': tema, 'descripcion': descripcion,
                 'obtenida_en': ANY, 'visto': False, 'es_favorita': False,
                 'actividad': {'codigo': 't-inicio', 'titulo': 'Inicio de prueba'},
                 'tramo': {'codigo': 'T0', 'nombre': bloque[2], 'numero': bloque[1]}}
                if completo and codigo != 't-ficha-3' else
                {'codigo': codigo, 'titulo': titulo, 'estado': 'BLOQUEADA', 'tema': None, 'descripcion': None,
                 'obtenida_en': None, 'visto': False, 'es_favorita': False, 'actividad': None,
                 'tramo': None}
                for codigo, titulo, descripcion, tema, _texto, audiencia in sorted(FICHAS) if audiencia == 'ESTUDIANTE']
    if ruta == 'logros':
        # Ajuste pasaporte-perfil: por página y orden; la oculta conserva su página, su orden y su pista.
        grupos = {codigo: {'codigo': codigo, 'nombre': nombre, 'orden': orden} for codigo, nombre, orden in GRUPOS_INSIGNIA}
        insignias = []
        for codigo, nombre, descripcion, requisito, oculta in sorted(
                INSIGNIAS, key=lambda fila: (grupos[PAGINAS_INSIGNIAS[fila[0]][0]]['orden'], PAGINAS_INSIGNIAS[fila[0]][1])):
            grupo, orden = PAGINAS_INSIGNIAS[codigo]
            obtenida = completo and codigo == 't-ins-1'
            comunes = {'grupo': grupos[grupo], 'orden': orden, 'pista': PISTAS_INSIGNIAS.get(codigo),
                       'obtenida_en': ANY if obtenida else None}
            frase, logro = TEXTOS_INSIGNIAS[codigo]
            insignias.append(
                {'codigo': '???', 'nombre': 'Logro oculto', 'descripcion': None, 'requisito': None, 'estado': 'BLOQUEADA',
                 'frase': None, 'logro': None, **comunes}
                if oculta else {'codigo': codigo, 'nombre': nombre, 'descripcion': descripcion,
                                'requisito': requisito, 'estado': 'OBTENIDA' if obtenida else 'BLOQUEADA',
                                'frase': frase, 'logro': logro, **comunes}
            )
        return {'insignias': insignias, 'niveles': [
            {'numero': numero, 'titulo': titulo, 'descripcion': descripcion, 'cita_lumi': CITAS_LUMI[numero],
             'estado': 'OBTENIDO' if numero <= (2 if completo else 1) else 'BLOQUEADO'}
            for numero, titulo, descripcion in NIVELES
        ], 'vitrina': [], 'afinidad': 0.0}
    if ruta == 'testimonios':
        # Se abren al superar el caso, que en este recorrido sigue sin resolverse.
        # Ajustes Central (7): bloqueados, sin quién lo cuenta y con el caso que los regala.
        # Ajuste mochila: el tercero y el cuarto los regala el segundo caso; ningún caso está disponible aún.
        casos = {'t-testimonio-3': ('t-caso-2', 'La traductora apurada'),
                 't-testimonio-4': ('t-caso-2', 'La traductora apurada')}
        return [{'codigo': codigo, 'titulo': titulo, 'estado': 'BLOQUEADA', 'visto': False, 'pista': pista,
                 'descripcion': None, 'enlace': None, 'persona': None, 'ocupacion': None,
                 'anios_experiencia': None, 'cita': None,
                 'caso': dict(zip(('codigo', 'titulo'), casos.get(codigo, ('t-caso', 'Caso de prueba')))),
                 'caso_disponible': False, 'es_favorita': False}
                for codigo, titulo, _, _, pista, *_ in sorted(TESTIMONIOS)]
    if ruta == 'secciones':
        return [(codigo, 'DISPONIBLE' if completo else 'BLOQUEADA', completo) for codigo in SECCIONES_ESTUDIANTE]
    if ruta == 'diario/preguntas':
        if not completo:
            return MENSAJES['DIARIO']
        # B09: el recorrido abre las dos desbloqueables; la personalizada queda por redactar hasta abrirla.
        # B12: la de después de conversar sigue bloqueada.
        return [{'codigo': codigo, 'nombre': nombre, 'personalizada': personalizada, 'respondida': False,
                 **({'estado': 'BLOQUEADA', 'redactada': False} if codigo == 't-diario-tras-conversar'
                    else {'estado': 'DISPONIBLE', 'redactada': not personalizada})}
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
        assert respuesta == {'insignias': [], 'niveles': [], 'vitrina': []}
    elif ruta == 'secciones':
        assert respuesta == [('CONVERSACIONES', 'BLOQUEADA', False)]
    elif ruta == 'fichas':
        assert respuesta == [{'codigo': 't-ficha-apo', 'titulo': 'Ficha del apoderado', 'estado': 'BLOQUEADA',
                              'tema': None, 'descripcion': None, 'obtenida_en': None,
                              'visto': False, 'es_favorita': False, 'actividad': None, 'tramo': None}]
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
    # T0 en orden (F00): completar t-inicio abre t-partida.
    actividad = sesion.scalar(select(Actividad).where(Actividad.codigo == 't-partida'))
    actividad.visibilidad = Visibilidad.AL_DESBLOQUEAR  # DATO DE PRUEBA.
    sesion.commit()
    assert consultar(cliente, 'actividades')[0]['actividades'][1]['visible'] is False
    completar(cliente, 't-inicio')
    recibida = consultar(cliente, 'actividades')[0]['actividades'][1]
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
    assert [b['codigo'] for b in bloques] == ['CIUDAD', 'T0', 'T1', 'T2', 'LUMI']
    assert [a['codigo'] for a in bloques[1]['actividades']] == ['t-partida', 't-cierre-inicio', 't-inicio']
    ciudad.numero = 2
    sesion.commit()
    assert [b['codigo'] for b in consultar(cliente, 'actividades')] == ['T0', 'CIUDAD', 'T1', 'T2', 'LUMI']


def test_insignia_oculta_solo_se_revela_al_obtenerse(cliente):
    ocultas = [i for i in consultar(cliente, 'logros')['insignias'] if i['codigo'] == '???']
    # B10: además de t-ins-oculta, tres logros ocultos por vistas diversas del catálogo.
    assert [{clave: valor for clave, valor in i.items() if clave in ('codigo', 'nombre', 'descripcion', 'requisito', 'estado')}
            for i in ocultas] == [{'codigo': '???', 'nombre': 'Logro oculto', 'descripcion': None, 'requisito': None,
                                   'estado': 'BLOQUEADA'}] * 4
    assert all(i['pista'] and i['grupo'] for i in ocultas)
    pedir(cliente, 'POST', '/eventos', {'cuenta': 'est-ana', 'tipo': 'VENCE_DESAFIO_INTACTO'})
    insignias = consultar(cliente, 'logros')['insignias']
    assert len([i for i in insignias if i['codigo'] == '???']) == 3
    revelada = next(i for i in insignias if i['codigo'] == 't-ins-oculta')
    assert revelada['estado'] == 'OBTENIDA' and revelada['descripcion'] and revelada['requisito']
