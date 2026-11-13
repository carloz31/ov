"""Ajuste cartas-diario: las cartas del diario de `contenido` en el recorrido, sin LLM."""

from datetime import date, datetime, timedelta

from sqlalchemy import select

from app import models as m
from app.core.contexto import usar_contexto
from app.services.diario.cartas import armar_carta
from soporte_catalogo_ruta import PERIODISMO, PSICOLOGIA
from soporte_contenido import avanzar, completar
from soporte_ruta import FECHA, eleccion_minima, item_de, leer_registro, pedir, responder_item, terminar
from datos import contenido


VARIANTES = contenido.VARIANTES_DIARIO


def texto_de(carta, variante, **huecos):
    texto = next(v['texto'] for v in VARIANTES[carta]['variantes'] if v['codigo'] == variante)
    for nombre, valor in huecos.items():
        texto = texto.replace(f'{{{nombre}}}', valor)
    return texto


def respaldo(carta):
    return next(p[2] for p in contenido.PREGUNTAS_DIARIO if p[0] == carta)


def responder_con(elegidas):
    """`completar_con` que responde los ítems de `elegidas` con esas opciones (códigos) y los demás con la mínima."""
    def completar_con(cliente, codigo):
        if not any(fila[1] in elegidas for fila in contenido.ITEMS_REGISTRO if fila[0] == codigo):
            return completar(cliente, codigo)
        registro = leer_registro(cliente, codigo)
        while registro['item_actual'] is not None:
            item = item_de(registro, registro['item_actual'])
            opciones = ([{'codigo': c} for c in elegidas[item['codigo']]] if item['codigo'] in elegidas
                        else eleccion_minima(item))
            registro = responder_item(cliente, codigo, item['codigo'], opciones)['registro']
        return terminar(cliente, codigo)
    return completar_con


def cartas(cliente):
    return {p['codigo']: p for p in pedir(cliente, 'GET', '/cuentas/est-ana/diario/preguntas')}


def recomendacion(aplicacion, codigo):
    with aplicacion.state.fabrica_sesiones() as sesion:
        return sesion.scalar(select(m.Recomendacion).join(
            m.PreguntaDiario, m.PreguntaDiario.id == m.Recomendacion.pregunta_diario_id).join(
            m.Cuenta, m.Cuenta.id == m.Recomendacion.cuenta_id).where(
            m.PreguntaDiario.codigo == codigo, m.Cuenta.codigo == 'est-ana'))


def nombre_carrera(aplicacion, codigo):
    with aplicacion.state.fabrica_sesiones() as sesion:
        return sesion.scalar(select(m.Carrera.nombre).where(m.Carrera.codigo == codigo))


def test_b0_2_deja_la_primera_carta_y_b1_3_trae_la_voz_con_su_persona(cliente_contenido, aplicacion_contenido):
    cliente = cliente_contenido
    avanzar(cliente, 'b0-1', 'b0-2')
    llego = cartas(cliente)['d-llego']
    assert (llego['estado'], llego['texto']) == ('DISPONIBLE', respaldo('d-llego'))
    assert llego['actividad']['codigo'] == 'b0-2'
    # El recorrido marca MAMA en b1-3-voz y UNIVERSIDAD en b1-3-mia.
    avanzar(cliente, 'b0-3', 'b1-3')
    voces = recomendacion(aplicacion_contenido, 'd-voces')
    assert (voces.variante, voces.texto) == ('PERSONA_RUTA', texto_de('d-voces', 'PERSONA_RUTA', persona='tu mamá'))
    assert cartas(cliente)['d-voces']['texto'] == voces.texto


def test_b1_3_sin_voz_y_sin_ruta_trae_nadie_duda(cliente_contenido, aplicacion_contenido):
    avanzar(cliente_contenido, 'b0-1', 'b1-3',
            completar_con=responder_con({'b1-3-voz': ['NADIE'], 'b1-3-mia': ['AUN_NO']}))
    voces = recomendacion(aplicacion_contenido, 'd-voces')
    assert (voces.variante, voces.texto) == ('NADIE_DUDA', texto_de('d-voces', 'NADIE_DUDA'))


def test_b2_4_cita_lo_que_mejor_le_sale_y_b4_5_los_dos_planes_con_que_respondio(cliente_contenido, aplicacion_contenido):
    avanzar(cliente_contenido, 'b0-1', 'b4-5', completar_con=responder_con({'b4-5-moneda': ['TAMBIEN']}))
    sale = recomendacion(aplicacion_contenido, 'd-sale-gusta')
    with aplicacion_contenido.state.fabrica_sesiones() as sesion:
        marcadores = {codigo: valores['marcadores'] for codigo, valores in sesion.execute(
            select(m.ItemRegistro.codigo, m.RespuestaRegistro.valores_contexto).join(
                m.ItemRegistro, m.ItemRegistro.id == m.RespuestaRegistro.item_registro_id).where(
                m.ItemRegistro.codigo.in_(('b2-4-cruce', 'b4-5-moneda')), m.RespuestaRegistro.vigente))}
    assert sale.variante == 'SI'
    assert sale.texto == texto_de('d-sale-gusta', 'SI', primera=marcadores['b2-4-cruce']['primera'])
    moneda = recomendacion(aplicacion_contenido, 'd-moneda')
    plan_a, plan_b = nombre_carrera(aplicacion_contenido, PSICOLOGIA), nombre_carrera(aplicacion_contenido, PERIODISMO)
    assert (marcadores['b4-5-moneda']['plan_a'], marcadores['b4-5-moneda']['plan_b']) == (plan_a, plan_b)
    assert (moneda.variante, moneda.texto) == ('TAMBIEN', texto_de('d-moneda', 'TAMBIEN', plan_a=plan_a, plan_b=plan_b))


@usar_contexto
def _armar(sesion, cuenta, codigo):
    cuenta = sesion.scalar(select(m.Cuenta).where(m.Cuenta.codigo == cuenta))
    return armar_carta(sesion, cuenta, sesion.scalar(select(m.PreguntaDiario).where(m.PreguntaDiario.codigo == codigo)))


def armar(aplicacion, codigo, cuenta='est-ana'):
    with aplicacion.state.fabrica_sesiones() as sesion:
        return _armar(sesion, cuenta, codigo)


def fijar_opcion_inicial(aplicacion, carrera):
    with aplicacion.state.fabrica_sesiones.begin() as sesion:
        carrera_id = None if carrera is None else sesion.scalar(select(m.Carrera.id).where(m.Carrera.codigo == carrera))
        sesion.execute(m.Cuenta.__table__.update().where(m.Cuenta.codigo == 'est-ana').values(
            opcion_inicial_id=carrera_id))


def test_b5_3_compara_la_opcion_inicial_con_el_plan_a(cliente_contenido, aplicacion_contenido):
    avanzar(cliente_contenido, 'b0-1', 'b5-2')
    fijar_opcion_inicial(aplicacion_contenido, PSICOLOGIA)
    completar(cliente_contenido, 'b5-3')
    plan_a, otra = nombre_carrera(aplicacion_contenido, PSICOLOGIA), nombre_carrera(aplicacion_contenido, PERIODISMO)
    salir = recomendacion(aplicacion_contenido, 'd-antes-de-salir')
    assert (salir.variante, salir.texto) == ('MISMA', texto_de('d-antes-de-salir', 'MISMA', plan_a=plan_a))
    fijar_opcion_inicial(aplicacion_contenido, PERIODISMO)
    assert armar(aplicacion_contenido, 'd-antes-de-salir') == (
        texto_de('d-antes-de-salir', 'OTRA', plan_a=plan_a, primera_opcion=otra), 'OTRA')
    fijar_opcion_inicial(aplicacion_contenido, None)
    assert armar(aplicacion_contenido, 'd-antes-de-salir') == (
        texto_de('d-antes-de-salir', 'SIN_OPCION', plan_a=plan_a), 'SIN_OPCION')
    # La carta ya guardada no cambia.
    assert recomendacion(aplicacion_contenido, 'd-antes-de-salir').texto == salir.texto


def test_sin_plan_a_antes_de_salir_va_el_respaldo(aplicacion_contenido):
    assert armar(aplicacion_contenido, 'd-antes-de-salir', cuenta='est-luis') == (respaldo('d-antes-de-salir'), None)


def test_la_pregunta_del_dia_no_repite_en_doce_dias(cliente_contenido):
    avanzar(cliente_contenido, 'b0-1', 'b0-2')
    for dia in range(12):
        fecha = (date(2026, 10, 10) + timedelta(days=dia)).isoformat()
        pedir(cliente_contenido, 'POST', '/acciones/diario/pregunta-del-dia',
              {'cuenta': 'est-ana', 'fecha_hora': f'{fecha}T09:00:00'})
        pedir(cliente_contenido, 'POST', '/acciones/escribir-entrada',
              {'cuenta': 'est-ana', 'del_dia': True, 'texto': 'DATO DE PRUEBA', 'fecha_hora': f'{fecha}T10:00:00'})
    entradas = pedir(cliente_contenido, 'GET', '/cuentas/est-ana/diario/entradas')
    preguntas = [e['pregunta'] for e in entradas if e['origen'] == 'RECOMENDACION_DIA']
    pool = {p[2] for p in contenido.PREGUNTAS_DIARIO if p[3] == 'DIARIA'}
    assert len(preguntas) == 12 and set(preguntas) == pool


# Ajuste coherencia-lumi: todos los niveles de amistad se alcanzan escribiendo, en dos días.
def test_los_cinco_recuerdos_de_lumi_se_abren_con_cinco_cartas_en_dos_dias(cliente_contenido):
    cliente = cliente_contenido
    avanzar(cliente, 'b0-1', 'b0-2')

    def escribir(fecha):
        return pedir(cliente, 'POST', '/acciones/escribir-entrada',
                     {'cuenta': 'est-ana', 'fecha_hora': fecha, 'texto': 'DATO DE PRUEBA'})

    def abiertos(respuesta):
        return [d['objetivo']['codigo'] for d in respuesta['nuevos_desbloqueos'] if d['tipo_objetivo'] == 'ACTIVIDAD']

    def amistad():
        return pedir(cliente, 'GET', '/cuentas/est-ana/diario/amistad')

    hoy = datetime.fromisoformat(FECHA)
    manana = (hoy + timedelta(days=1)).isoformat()
    assert [abiertos(escribir(hoy.isoformat())) for _ in range(3)] == [['lumi-1'], ['lumi-2'], ['lumi-3']]
    assert amistad()['nivel'] == 3
    assert abiertos(escribir(hoy.isoformat())) == []
    assert [abiertos(escribir(manana)) for _ in range(2)] == [['lumi-4'], ['lumi-5']]
    assert amistad() == {'puntos': 5, 'nivel': 5, 'siguiente_en': None}
    [lumi] = [b for b in pedir(cliente, 'GET', '/cuentas/est-ana/actividades') if b['codigo'] == 'LUMI']
    assert [a['codigo'] for a in lumi['actividades']] == list(contenido.RECUERDOS_LUMI)
    resumen = pedir(cliente, 'GET', '/cuentas/est-ana/resumen')
    for codigo in contenido.RECUERDOS_LUMI:
        assert completar(cliente, codigo)['nuevos_desbloqueos'] == []
    assert pedir(cliente, 'GET', '/cuentas/est-ana/resumen') == resumen
