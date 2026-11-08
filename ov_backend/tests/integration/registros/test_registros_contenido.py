"""Ajuste registros §4.3, §4.5 y §4.6: los registros definitivos de `contenido` recorridos con el evaluador falso.

Opciones propias (criterio informado y nulo), estado abierto (uno es adecuado, dos no) y su efecto en ma3, la
salvaguarda sensible fuera de su actividad, el orden de reglas de b4-1 y b4-5 y las seis cartas. La mecánica fina
(contrato del evaluador, `ecos_llm`, respaldo, edición, referencias en vivo, instrucciones en el texto) la prueban
`registro/test_registro_referencia.py` y `unit/registro`. Los textos son DATO DE PRUEBA; las marcas (`[vaga]`,
`[abierto]`, `[sensible]`) las interpreta el evaluador falso.
"""

from sqlalchemy import select

from app import models as m
from soporte_catalogo_ruta import PERIODISMO, PSICOLOGIA
from soporte_contenido import REQUERIDAS, avanzar, completar, revelar_para_b4
from soporte_planes import crear, guardar, por_que_lista
from soporte_ruta import FECHA, pedir


ADECUADO = 'DATO DE PRUEBA: una respuesta completa con su ejemplo y su razón.'


def accion(actividad):
    return {'cuenta': 'est-ana', 'actividad': actividad, 'fecha_hora': FECHA}


def borrador(cliente, actividad, item, texto, opciones=()):
    return pedir(cliente, 'POST', '/acciones/registro/guardar-borrador',
                 {**accion(actividad), 'item': item, 'texto': texto, 'opciones': list(opciones)})


def entregar(cliente, actividad, respuestas):
    """`respuestas`: {ítem: (texto, [códigos])}."""
    for item, (texto, codigos) in respuestas.items():
        borrador(cliente, actividad, item, texto, [{'codigo': c} for c in codigos])
    return pedir(cliente, 'POST', '/acciones/registro/entregar', accion(actividad))


def responder(cliente, actividad, item, texto):
    return pedir(cliente, 'POST', '/acciones/registro/responder-seguimiento',
                 {**accion(actividad), 'item': item, 'texto': texto})


def estados(cliente):
    return {a['codigo']: a['estado'] for b in pedir(cliente, 'GET', '/cuentas/est-ana/actividades')
            for a in b['actividades']}


def referencia(cliente, actividad, codigo):
    return next(r for r in pedir(cliente, 'GET', f'/cuentas/est-ana/actividades/{actividad}/referencias')[
        'referencias'] if r['codigo'] == codigo)


def adecuado(respuesta, actividad):
    return ('REGISTRO_ADECUADO', actividad) in {(e['tipo'], e['referencia']) for e in respuesta['eventos_registrados']}


def carta(aplicacion, codigo):
    with aplicacion.state.fabrica_sesiones() as sesion:
        return sesion.scalar(select(m.Recomendacion).join(
            m.PreguntaDiario, m.PreguntaDiario.id == m.Recomendacion.pregunta_diario_id).where(
            m.PreguntaDiario.codigo == codigo))


def enviado(aplicacion, codigo):
    for contexto in reversed(aplicacion.state.evaluador_respuestas.contextos):
        for item in getattr(contexto, 'items', ()):
            if item.item == codigo:
                return item
    return None


def test_b1_3_opciones_propias_y_su_carta(cliente_contenido, aplicacion_contenido):
    cliente = cliente_contenido
    avanzar(cliente, 'b0-1', 'b1-2')
    voz, mia, contraste = pedir(cliente, 'GET', '/actividades/b1-3/items-registro')
    assert contraste['eleccion']['premarcar_si'] == {'item': 'b1-3-voz', 'opcion': 'NADIE', 'marca': 'SIN_COMPARAR'}
    entrega = entregar(cliente, 'b1-3', {'b1-3-voz': ('', ['NADIE']), 'b1-3-mia': ('DATO DE PRUEBA no sé [vaga]', ['AUN_NO']),
                                         'b1-3-contraste': ('', ['SIN_COMPARAR'])})
    # Las salidas con `criterio: null` no van al evaluador; AUN_NO va con su propio criterio y texto base.
    assert enviado(aplicacion_contenido, 'b1-3-voz') is None and enviado(aplicacion_contenido, 'b1-3-contraste') is None
    salida = enviado(aplicacion_contenido, 'b1-3-mia')
    assert salida.guia.que_busca.startswith('Qué lo hace dudar') and [c.tipo for c in salida.criterios] == ['RAZON']
    pendiente = next(r for r in entrega['respuestas'] if r['item'] == 'b1-3-mia')
    assert pendiente['conversacion'][-1]['texto'].endswith('¿Hay algo que descartarías seguro? A veces se empieza por ahí.')
    cierre = responder(cliente, 'b1-3', 'b1-3-mia', 'DATO DE PRUEBA: dudo entre diseño y enfermería')
    assert cierre['estado'] == 'COMPLETADA' and adecuado(cierre, 'b1-3')
    c1 = carta(aplicacion_contenido, 'C1')
    assert c1 is not None and c1.texto is None
    assert any('dudo entre diseño' in (d.get('texto') or '') for d in c1.contexto)


def test_sensible_es_adecuado_y_no_entra_en_la_carta(cliente_contenido, aplicacion_contenido):
    cliente = cliente_contenido
    avanzar(cliente, 'b0-1', 'b1-2')
    cierre = entregar(cliente, 'b1-3', {
        'b1-3-voz': (ADECUADO, ['MAMA']), 'b1-3-mia': ('DATO DE PRUEBA algo delicado en casa [sensible] [vaga]', ['UNIVERSIDAD']),
        'b1-3-contraste': (ADECUADO, ['CHOCAN'])})
    assert cierre['estado'] == 'COMPLETADA' and adecuado(cierre, 'b1-3')
    mia = next(r for r in cierre['respuestas'] if r['item'] == 'b1-3-mia')
    assert mia['conversacion'][-1]['tipo'] == 'aviso'
    contexto = carta(aplicacion_contenido, 'C1').contexto
    assert not any('delicado' in (d.get('texto') or '') for d in contexto)
    # La ELECCION sí queda (la retoma b5-3); solo su texto no se cita.
    assert any(d.get('opciones') == ['Mamá'] for d in contexto)


def test_un_abierto_es_adecuado_y_ma3_trabaja_con_el_dia(cliente_contenido, aplicacion_contenido):
    cliente = cliente_contenido
    avanzar(cliente, 'b0-1', 'b1-6')
    entregar(cliente, 'b1-7', {'b1-7-dia': ('DATO DE PRUEBA: me despierto en Lima y voy a mi taller', ['TRABAJO']),
                               'b1-7-hito': ('DATO DE PRUEBA no tengo idea [abierto]', []),
                               'b1-7-freno': (ADECUADO, ['ECONOMICAS'])})
    cierre = responder(cliente, 'b1-7', 'b1-7-hito', 'DATO DE PRUEBA depende de si ingreso [abierto]')
    assert cierre['items_abiertos'] == ['b1-7-hito'] and cierre['items_por_ampliar'] == []
    assert adecuado(cierre, 'b1-7') and estados(cliente)['ma3'] == 'DISPONIBLE'
    assert referencia(cliente, 'ma3', 'ma3-ref-hito')['estado'] == 'ABIERTA'
    assert referencia(cliente, 'ma3', 'ma3-ref-dia')['estado'] == 'DISPONIBLE'
    final = entregar(cliente, 'ma3', {'ma3-pasos': (ADECUADO, []), 'ma3-falta': (ADECUADO, [])})
    # El hito abierto no llega al evaluador: solo el día que imaginó.
    assert [(e.nombre, e.texto) for e in enviado(aplicacion_contenido, 'ma3-pasos').ecos] == [
        ('Tu día a los 23', 'DATO DE PRUEBA: me despierto en Lima y voy a mi taller')]
    assert final['estado'] == 'COMPLETADA'


def test_ma3_recibe_hito_y_dia_con_el_nombre_de_su_item_fuente(cliente_contenido, aplicacion_contenido):
    cliente = cliente_contenido
    avanzar(cliente, 'b0-1', 'b1-6')
    entregar(cliente, 'b1-7', {'b1-7-dia': ('DATO DE PRUEBA: me despierto en Lima y voy a mi taller', ['TRABAJO']),
                               'b1-7-hito': ('DATO DE PRUEBA: estaré en un instituto de mecánica', []),
                               'b1-7-freno': (ADECUADO, ['ECONOMICAS'])})
    entregar(cliente, 'ma3', {'ma3-pasos': (ADECUADO, []), 'ma3-falta': (ADECUADO, [])})
    assert [(e.nombre, e.texto) for e in enviado(aplicacion_contenido, 'ma3-pasos').ecos] == [
        ('Tu hito a un año', 'DATO DE PRUEBA: estaré en un instituto de mecánica'),
        ('Tu día a los 23', 'DATO DE PRUEBA: me despierto en Lima y voy a mi taller')]


def test_duda_sin_admite_abierto_queda_poco_desarrollada(cliente_contenido):
    cliente = cliente_contenido
    avanzar(cliente, 'b0-1', 'b1-6')
    entregar(cliente, 'b1-7', {'b1-7-dia': ('DATO DE PRUEBA no sé [abierto]', ['TRABAJO']),
                               'b1-7-hito': ('DATO DE PRUEBA no sé [abierto]', []),
                               'b1-7-freno': (ADECUADO, ['ECONOMICAS'])})
    segunda = responder(cliente, 'b1-7', 'b1-7-dia', 'DATO DE PRUEBA de verdad no sé [abierto]')
    # Sin `admite_abierto`, b1-7-dia queda poco desarrollada y la segunda repregunta va al hito.
    assert next(r for r in segunda['respuestas'] if r['estado'] == 'PENDIENTE_SEGUIMIENTO')['item'] == 'b1-7-hito'
    cierre = responder(cliente, 'b1-7', 'b1-7-hito', 'DATO DE PRUEBA sigo sin saber [abierto]')
    assert [i['item'] for i in cierre['items_por_ampliar']] == ['b1-7-dia'] and cierre['items_abiertos'] == ['b1-7-hito']
    assert not adecuado(cierre, 'b1-7') and estados(cliente)['ma3'] == 'BLOQUEADA'


def test_camino_con_reglas_de_planes_dos_abiertos_y_las_seis_cartas(cliente_contenido, aplicacion_contenido):
    """b4-1 pide el Plan A con «Por qué»; b4-5, dos planes creados (el segundo, vacío); dos abiertos en b4-1 no son
    adecuados; cada uno de los seis registros deja su carta."""
    cliente = cliente_contenido
    for codigo in REQUERIDAS:
        if codigo == 'b3-10':
            revelar_para_b4(cliente)
        if codigo == 'b4-1':
            assert estados(cliente)['b4-1'] == 'BLOQUEADA'
            crear(cliente, PSICOLOGIA)
            guardar(cliente, PSICOLOGIA, 'POR_QUE', por_que_lista())
            assert estados(cliente)['b4-1'] == 'DISPONIBLE'
            entregar(cliente, 'b4-1', {'b4-1-respalda': ('DATO DE PRUEBA no sé bien [abierto]', ['INTERESES']),
                                       'b4-1-menos': ('DATO DE PRUEBA no sé qué pensar [abierto]', ['ME_SALE_BIEN']),
                                       'b4-1-familia': (ADECUADO, ['TODAS'])})
            responder(cliente, 'b4-1', 'b4-1-respalda', 'DATO DE PRUEBA no sé bien por qué [abierto]')
            cierre = responder(cliente, 'b4-1', 'b4-1-menos', 'DATO DE PRUEBA sigo sin saber [abierto]')
            assert cierre['items_abiertos'] == ['b4-1-respalda', 'b4-1-menos'] and not adecuado(cierre, 'b4-1')
            continue
        if codigo == 'b4-5':
            assert estados(cliente)['b4-5'] == 'BLOQUEADA'
            crear(cliente, PERIODISMO)
            assert estados(cliente)['b4-5'] == 'DISPONIBLE'
        completar(cliente, codigo)
        if codigo == 'b4-5':
            guardar(cliente, PSICOLOGIA, 'PASOS', {'pasos': [{'tipo': 'conversar', 'texto': 'Hablar con una psicóloga.'}]})
    assert estados(cliente)['b5-5'] == 'COMPLETADA'
    for codigo in ('C1', 'C2', 'C3', 'C4', 'C5', 'C6'):
        assert carta(aplicacion_contenido, codigo) is not None, codigo
    # Las actividades retiradas no existen.
    assert not {'b2-6', 'ma6', 'b4-a', 'ma9'} & set(estados(cliente))
