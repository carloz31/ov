"""Ajuste panel-estudiantes §4–§6: lista de estudiantes, cabecera y Resumen del perfil, notas y acceso."""

from sqlalchemy import event, func, select

from app import models as m
from app.models import TipoEventoUso
from soporte_catalogo_ruta import ENFERMERIA, INST_UNI, PSICOLOGIA
from soporte_acceso import ROLES, token_de
from soporte_consultas import ContadorConsultas
from soporte_panel import (
    AHORA, conocimiento, cuenta, evento, fijar_ahora, medicion, nuevo_estudiante, resultado, senales, tarjeta,
)


def _cabeceras(cliente, codigo):
    # `ClienteConToken` firma solo cuentas de `ruta`; una cuenta creada en la prueba lleva su token explícito.
    return {} if codigo in ROLES else {'Authorization': f'Bearer {token_de(cliente.app, codigo)}'}


def lista(cliente, esperado=200, cuenta_o='ori-carmen', **parametros):
    parametros = {k: v for k, v in {'salon': '5A', **parametros}.items() if v is not None}
    respuesta = cliente.get(f'/cuentas/{cuenta_o}/panel/lista-estudiantes', params=parametros)
    assert respuesta.status_code == esperado, respuesta.text
    return respuesta.json()


def perfil(cliente, estudiante='est-ana', esperado=200, cuenta_o='ori-carmen'):
    respuesta = cliente.get(f'/cuentas/{cuenta_o}/panel/estudiantes/{estudiante}', headers=_cabeceras(cliente, cuenta_o))
    assert respuesta.status_code == esperado, respuesta.text
    return respuesta.json()


def accion(cliente, nombre, esperado=200, **cuerpo):
    cuerpo = {'cuenta': 'ori-carmen', 'estudiante': 'est-ana', **cuerpo}
    respuesta = cliente.post(f'/acciones/{nombre}', json=cuerpo, headers=_cabeceras(cliente, cuerpo['cuenta']))
    assert respuesta.status_code == esperado, respuesta.text
    return respuesta.json()


def _sembrar_avisos(sesion):
    for codigo in ('est-ana', 'est-luis', 'est-mia', 'est-teo'):
        evento(sesion, codigo, TipoEventoUso.INGRESO, 1)
    senales(sesion, 'est-luis', 1, 2, 2)      # conversar pronto (seguridad) + familia pendiente
    resultado(sesion, 'est-mia', plano=True)  # por revisar + familia pendiente
    # est-sol nunca ingresó: sin ingreso + familia pendiente; est-ana y est-teo, solo familia (o nada)


def test_lista_orden_inicial_aviso_principal_y_accesos(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    _sembrar_avisos(sesion)
    sesion.commit()
    datos = lista(cliente)
    codigos = [f['codigo'] for f in datos['items']]
    assert codigos[0] == 'est-luis'  # su aviso más importante es del grupo de orden 1
    luis = datos['items'][0]
    assert luis['aviso'] == 'Poca seguridad en sus últimas señales' and luis['avisos_mas'] == 1
    assert datos['salon'] == {'codigo': '5A', 'promocion': 2026, 'seccion': 'A'} and datos['total_estudiantes'] == 5
    accesos = {a['codigo']: a['cantidad'] for a in datos['accesos']}
    assert [a['codigo'] for a in datos['accesos']] == ['todos', 'con_avisos', 'conversar', 'sin_avisos']
    assert accesos['todos'] == 5 and accesos['conversar'] == 1
    assert accesos['con_avisos'] + accesos['sin_avisos'] == 5
    avisos = [f['aviso'] is None for f in datos['items']]
    assert avisos == sorted(avisos)  # sin avisos al final
    sol = next(f for f in datos['items'] if f['codigo'] == 'est-sol')
    assert sol['dias_sin_ingreso'] is None and sol['tramo']['codigo'] == 'SIN_EMPEZAR' and sol['test'] == 'SIN_EMPEZAR'
    assert set(sol) == {'codigo', 'nombre', 'salon', 'tramo', 'test', 'plan_a', 'dias_sin_ingreso', 'aviso',
                        'avisos_mas'}
    assert {a['codigo'] for a in datos['avisos']} >= {'seguridad-baja', 'sin-ingreso'}
    assert next(a for a in datos['avisos'] if a['codigo'] == 'sin-ingreso')['nombre'] == 'No ingresa hace 7 días o más'


def test_lista_filtros_orden_y_pagina(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    _sembrar_avisos(sesion)
    tarjeta(sesion, 'est-teo', PSICOLOGIA, 1)
    sesion.commit()
    assert [f['codigo'] for f in lista(cliente, acceso='conversar')['items']] == ['est-luis']
    assert [f['codigo'] for f in lista(cliente, aviso='test-por-revisar')['items']] == ['est-mia']
    assert [f['codigo'] for f in lista(cliente, test='POR_REVISAR')['items']] == ['est-mia']
    assert [f['codigo'] for f in lista(cliente, buscar='MIA')['items']] == ['est-mia']
    assert [f['codigo'] for f in lista(cliente, orden='estudiante')['items']] == [
        'est-ana', 'est-luis', 'est-mia', 'est-sol', 'est-teo']
    assert lista(cliente, orden='plan_a')['items'][0]['plan_a'] == 'Psicología'
    assert lista(cliente, orden='-ingreso')['items'][0]['codigo'] == 'est-sol'
    pagina = lista(cliente, orden='estudiante', limite=2, desde=2)
    assert pagina['total'] == 5 and [f['codigo'] for f in pagina['items']] == ['est-mia', 'est-sol']
    for parametros in ({'orden': 'otro'}, {'test': 'X'}, {'aviso': 'x'}, {'acceso': 'x'}, {'limite': 0}):
        lista(cliente, esperado=422, **parametros)
    lista(cliente, esperado=404, salon='5B')


def test_lista_sin_salon_trae_todos_y_consultas_no_crecen(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    assert lista(cliente, salon=None)['total_estudiantes'] == 5
    with ContadorConsultas(aplicacion.state.motor_bd) as pocos:
        lista(cliente)
    for i in range(15):
        estudiante = nuevo_estudiante(sesion, f'est-extra-{i}', f'Extra {i}')
        sesion.add(m.EventoUso(cuenta_id=estudiante.id, tipo=TipoEventoUso.INGRESO, fecha_hora=AHORA))
    sesion.commit()
    with ContadorConsultas(aplicacion.state.motor_bd) as muchos:
        lista(cliente)
    assert muchos.cantidad == pocos.cantidad, muchos.diagnostico


def test_perfil_cabecera_avisos_temas_y_tarjetas(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    evento(sesion, 'est-ana', TipoEventoUso.INGRESO, 0)
    senales(sesion, 'est-ana', 2, 1, 2)
    plan = tarjeta(sesion, 'est-ana', ENFERMERIA, 1, INST_UNI)
    plan.idea_origen, plan.entusiasmo = m.OrigenIdea.FAMILIA, 1
    conocimiento(sesion, plan, DIA_NORMAL='NO', CURSOS='NO', INGRESO='NO')
    tarjeta(sesion, 'est-ana', PSICOLOGIA, 2)
    medicion(sesion, 'est-ana', 'APL-PARTIDA', {'AUTO-E': 'POR_TRABAJAR', 'AUTO-B': 'FUERTE'})
    sesion.commit()
    datos = perfil(cliente)
    cabecera = datos['cabecera']
    assert cabecera['nombre'] == 'Ana' and cabecera['salon']['codigo'] == '5A' and cabecera['dias_sin_ingreso'] == 0
    assert cabecera['apoderado'] == {'nombre': 'Rosa', 'parentesco': 'madre', 'estado': 'AUN_NO_INGRESA'}
    assert cabecera['tramo']['codigo'] == 'SIN_EMPEZAR' and cabecera['tramo']['total'] >= 1
    assert [g['codigo'] for g in datos['avisos']] == ['conversar', 'atras']
    seguridad = datos['avisos'][0]['avisos'][0]
    assert seguridad == {'codigo': 'seguridad-baja', 'nombre': 'Poca seguridad en sus últimas señales',
                         'descripcion': 'Marcó 2, 1 y 2 de 5 (el 17, 18 y 19 de octubre).', 'destino': 'AVANCE'}
    # Ajuste pendientes-orientadora: las reglas definitivas (con solo la partida no hay tema) y el tope.
    assert [t['codigo'] for t in datos['temas']] == ['plan-poco-entusiasmo', 'plan-conoce-poco']
    assert datos['temas'][0] == {'codigo': 'plan-poco-entusiasmo', 'destino': 'PLANES', 'texto': (
        'Marcó «Poco» en «Me entusiasma» frente a su Plan A (Enfermería). La idea de estudiarla vino de su familia.')}
    assert datos['temas_visibles'] == 4
    assert datos['intereses']['estado'] == 'SIN_EMPEZAR' and datos['intereses']['codigo'] == []
    assert [(p['prioridad'], p['carrera'], p['en_areas']) for p in datos['planes']] == [
        (1, 'Enfermería', None), (2, 'Psicología', None)]
    assert datos['planes'][0]['institucion']['tipo'] == 'UNIVERSIDAD' and datos['planes'][1]['institucion'] is None
    partida = datos['partida']
    assert partida['estado'] == 'SOLO_PARTIDA' and partida['fecha_llegada'] is None
    zonas = {d['codigo']: (d['zona_partida'], d['zona_llegada'], d['cambio']) for d in partida['dimensiones']}
    assert zonas['AUTO-E'] == ('POR_TRABAJAR', None, None) and zonas['AUTO-B'] == ('FUERTE', None, None)
    assert datos['respuestas'] == {'destacados': True, 'completados': 0, 'total': 1, 'requiere_atencion': 0,
                                   'sin_contenido': 0, 'aun_no_lo_sabe': 0}
    assert datos['notas'] == []


def test_como_empezo_en_sus_tres_estados(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    medicion(sesion, 'est-luis', 'APL-PARTIDA', {'AUTO-D': 'FUERTE', 'AUTO-E': 'POR_TRABAJAR'}, hace_dias=30)
    medicion(sesion, 'est-luis', 'APL-LLEGADA', {'AUTO-D': 'EN_CAMINO', 'AUTO-E': 'POR_TRABAJAR', 'AUTO-A': 'FUERTE'})
    sesion.commit()
    assert perfil(cliente)['partida'] == {'estado': 'SIN_PARTIDA', 'fecha_partida': None, 'fecha_llegada': None,
                                          'dimensiones': []}
    partida = perfil(cliente, 'est-luis')['partida']
    assert partida['estado'] == 'CON_LLEGADA' and partida['fecha_llegada'] == AHORA.date().isoformat()
    cambios = {d['codigo']: d['cambio'] for d in partida['dimensiones']}
    assert cambios == {'AUTO-A': 'SUBIO', 'AUTO-B': 'IGUAL', 'AUTO-C': 'IGUAL', 'AUTO-D': 'BAJO', 'AUTO-E': 'IGUAL'}
    assert 'puntaje' not in str(partida)


def test_notas_privadas_por_orientadora(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    # DATO DE PRUEBA: otra orientadora del mismo salón.
    otra = m.Cuenta(codigo='ori-otra', nombre='Otra', rol=m.Rol.ORIENTADORA)
    sesion.add(otra)
    sesion.flush()
    sesion.add(m.OrientadoraSalon(orientadora_id=otra.id, salon_id=cuenta(sesion, 'est-ana').salon_id,
                                  es_principal=False))
    sesion.commit()
    eventos_antes = sesion.scalar(select(func.count()).select_from(m.EventoUso))
    primera = accion(cliente, 'escribir-nota', texto='  Conversamos sobre el examen.  ')
    assert primera['numero'] == 1 and primera['texto'] == 'Conversamos sobre el examen.'
    segunda = accion(cliente, 'escribir-nota', texto='DATO DE PRUEBA: segunda')
    editada = accion(cliente, 'editar-nota', nota=1, texto='Conversamos sobre el examen de admisión.')
    assert editada['texto'].endswith('admisión.') and editada['numero'] == 1
    assert [n['numero'] for n in perfil(cliente)['notas']] == [segunda['numero'], 1]
    assert perfil(cliente, cuenta_o='ori-otra')['notas'] == []
    accion(cliente, 'editar-nota', esperado=404, cuenta='ori-otra', nota=1, texto='x')
    accion(cliente, 'borrar-nota', esperado=404, cuenta='ori-otra', nota=1)
    accion(cliente, 'escribir-nota', esperado=422, texto='   ')
    accion(cliente, 'escribir-nota', esperado=422, texto='a' * 1001)
    assert accion(cliente, 'borrar-nota', nota=1) == {'nota': 1, 'borrada': True}
    accion(cliente, 'borrar-nota', esperado=404, nota=1)
    assert [n['numero'] for n in perfil(cliente)['notas']] == [segunda['numero']]
    assert sesion.scalar(select(func.count()).select_from(m.EventoUso)) == eventos_antes


def test_tope_de_la_nota_es_un_parametro(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    sesion.execute(m.Parametro.__table__.update().where(m.Parametro.codigo == 'PANEL_MAXIMO_CARACTERES_NOTA')
                   .values(valor='5'))
    sesion.commit()
    accion(cliente, 'escribir-nota', esperado=422, texto='seis!!')
    accion(cliente, 'escribir-nota', texto='cinco')


def test_estudiante_de_otro_salon_o_cuenta_no_orientadora_responde_404(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    perfil(cliente, 'est-beto', esperado=404)
    perfil(cliente, 'no-existe', esperado=404)
    perfil(cliente, 'apo-rosa', esperado=404)
    perfil(cliente, 'est-ana', esperado=404, cuenta_o='est-luis')
    lista(cliente, esperado=404, cuenta_o='apo-rosa')
    for nombre, cuerpo in (('escribir-nota', {'texto': 'x'}), ('editar-nota', {'nota': 1, 'texto': 'x'}),
                           ('borrar-nota', {'nota': 1})):
        accion(cliente, nombre, esperado=404, estudiante='est-beto', **cuerpo)


def test_el_mismo_estudiante_da_los_mismos_avisos_en_perfil_lista_e_inicio(aplicacion, cliente, sesion):
    from soporte_ruta import avanzar
    fijar_ahora(aplicacion)
    for codigo in ('est-ana', 'est-luis', 'est-mia'):
        avanzar(cliente, cuenta=codigo)  # T2; est-teo y est-sol quedan muy atrás (avance-bajo)
    evento(sesion, 'est-ana', TipoEventoUso.INGRESO, 1)
    evento(sesion, 'est-luis', TipoEventoUso.INGRESO, 2)
    evento(sesion, 'apo-rosa', TipoEventoUso.INGRESO, 1)
    senales(sesion, 'est-luis', 1, 2, 2)
    resultado(sesion, 'est-mia', plano=True)
    sesion.commit()
    filas = {f['codigo']: f for f in lista(cliente, limite=50)['items']}
    inicio = {}
    for codigo in ('respuesta-sensible', 'seguridad-baja', 'sin-ingreso', 'avance-bajo', 'test-por-revisar',
                   'familia-pendiente'):
        respuesta = cliente.get('/cuentas/ori-carmen/panel/estudiantes', params={'salon': '5A', 'conjunto': 'alerta',
                                                                              'valor': codigo})
        inicio[codigo] = {e['codigo'] for e in respuesta.json()}
    vistos = set()
    for codigo, fila in filas.items():
        avisos = [a for g in perfil(cliente, codigo)['avisos'] for a in g['avisos']]
        vistos |= {a['codigo'] for a in avisos}
        assert {a['codigo'] for a in avisos} == {c for c, quienes in inicio.items() if codigo in quienes}, codigo
        assert fila['aviso'] == (avisos[0]['nombre'] if avisos else None), codigo
        assert fila['avisos_mas'] == max(len(avisos) - 1, 0), codigo
    assert {'seguridad-baja', 'sin-ingreso', 'avance-bajo', 'test-por-revisar', 'familia-pendiente'} <= vistos


def test_las_consultas_del_perfil_no_crecen_con_el_salon(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    evento(sesion, 'est-ana', TipoEventoUso.INGRESO, 1)
    senales(sesion, 'est-ana', 2, 3)
    sesion.commit()
    with ContadorConsultas(aplicacion.state.motor_bd) as pocos:
        perfil(cliente)
    actividad = sesion.scalar(select(m.Actividad.id).where(m.Actividad.codigo == 't-inicio'))
    for i in range(15):
        # DATO DE PRUEBA: compañeros con ingresos, señales y una actividad completada (su tramo sí se lee).
        estudiante = nuevo_estudiante(sesion, f'est-extra-{i}', f'Extra {i}')
        sesion.add_all([m.EventoUso(cuenta_id=estudiante.id, tipo=TipoEventoUso.INGRESO, fecha_hora=AHORA),
                        m.CheckIn(cuenta_id=estudiante.id, fecha=AHORA.date(), nivel_seguridad=1),
                        m.ProgresoActividad(cuenta_id=estudiante.id, actividad_id=actividad,
                                            estado=m.EstadoProgreso.COMPLETADA)])
    sesion.commit()
    extras = set(sesion.scalars(select(m.Cuenta.id).where(m.Cuenta.codigo.like('est-extra-%'))))
    con_extras = []

    def espiar(conexion, cursor, sentencia, parametros, contexto, varios):
        valores = parametros.values() if isinstance(parametros, dict) else parametros or ()
        # Una consulta sobre los compañeros lleva sus quince ids (un id suelto puede coincidir con el de otra tabla).
        if extras <= {v for v in valores if isinstance(v, int)}:
            con_extras.append(' '.join(sentencia.split()))

    event.listen(aplicacion.state.motor_bd, 'before_cursor_execute', espiar)
    try:
        with ContadorConsultas(aplicacion.state.motor_bd) as muchos:
            perfil(cliente)
        assert cliente.get('/cuentas/ori-carmen/panel/estudiantes/est-ana/avance').status_code == 200
    finally:
        event.remove(aplicacion.state.motor_bd, 'before_cursor_execute', espiar)
    assert muchos.cantidad == pocos.cantidad, muchos.diagnostico
    # De los compañeros solo se lee su tramo (sus actividades completadas), una vez por lectura, nada más.
    assert len(con_extras) == 2, con_extras
    assert all(c.startswith('SELECT progreso_actividad.cuenta_id, progreso_actividad.actividad_id') for c in con_extras)
