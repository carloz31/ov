"""Ajuste pasaporte-perfil: páginas, pistas, fecha de obtención, textos de condición y vitrina."""

from soporte_ruta import completar, pedir, progreso

FECHA = '2026-10-20T10:00:00'


def logros(cliente, cuenta='est-ana'):
    return pedir(cliente, 'GET', f'/cuentas/{cuenta}/logros')


def vitrina(cliente, codigos, esperado=200, cuenta='est-ana'):
    return pedir(cliente, 'POST', '/acciones/vitrina', {'cuenta': cuenta, 'codigos': codigos}, esperado)


def test_insignias_por_pagina_y_orden_con_las_secretas_en_su_pagina(cliente):
    insignias = logros(cliente)['insignias']
    assert [(i['grupo']['codigo'], i['orden']) for i in insignias] == [
        ('G1', 1), ('G1', 2), ('G2', 1), ('G2', 2), ('G2', 3)]
    assert insignias[0]['grupo'] == {'codigo': 'G1', 'nombre': 'La luz que despeja caminos', 'orden': 1}
    secreta = insignias[1]
    assert secreta['codigo'] == '???' and secreta['nombre'] == 'Logro oculto'
    assert secreta['descripcion'] is None and secreta['requisito'] is None and secreta['obtenida_en'] is None
    assert secreta['pista'].startswith('No todo brillo sobrevive')
    assert insignias[0]['pista'] is None


def test_obtenida_en_es_la_fecha_del_desbloqueo(cliente):
    assert logros(cliente)['insignias'][0]['obtenida_en'] is None
    pedir(cliente, 'POST', '/acciones/completar-actividad',
          {'cuenta': 'est-ana', 'actividad': 't-inicio', 'fecha_hora': FECHA})
    primera = logros(cliente)['insignias'][0]
    assert primera['codigo'] == 't-ins-1' and primera['estado'] == 'OBTENIDA'
    assert primera['obtenida_en'] == FECHA


def test_niveles_con_descripcion_y_tercer_nivel_de_dos_condiciones(cliente):
    datos = logros(cliente)
    assert [n['numero'] for n in datos['niveles']] == [1, 2, 3]
    assert datos['niveles'][0]['descripcion'].startswith('Estás aprendiendo a mirar')
    resumen = pedir(cliente, 'GET', '/cuentas/est-ana/resumen')
    assert resumen['nivel_actual']['descripcion'] == datos['niveles'][0]['descripcion']
    condiciones = progreso(cliente, 'NIVEL', 'N3')['reglas'][0]['condiciones']
    assert [(c['texto'], c['cumplida'], c['requerido']) for c in condiciones] == [
        ('Termina el bloque de inicio', False, 1), ('Mira tres carreras distintas', False, 3)]


def test_texto_de_la_condicion_en_el_progreso_de_insignia(cliente):
    condicion = progreso(cliente, 'INSIGNIA', 't-ins-1')['reglas'][0]['condiciones'][0]
    assert condicion['texto'] == 'Completa la misión de inicio'


def test_vitrina_vacia_por_defecto_y_reemplazo_completo(cliente):
    assert logros(cliente)['vitrina'] == []
    completar(cliente, 't-inicio')
    assert vitrina(cliente, ['t-ins-1']) == {'vitrina': ['t-ins-1']}
    assert logros(cliente)['vitrina'] == ['t-ins-1']
    assert vitrina(cliente, []) == {'vitrina': []}
    assert logros(cliente)['vitrina'] == []


def test_vitrina_rechaza_entradas_invalidas_y_no_obtenidas(cliente):
    completar(cliente, 't-inicio')
    vitrina(cliente, ['t-ins-1', 't-ins-1'], 422)
    vitrina(cliente, ['t-ins-1', 'no-existe'], 422)
    vitrina(cliente, ['t-ins-1'] * 4, 422)
    vitrina(cliente, ['t-ins-oculta'], 409)
    assert logros(cliente)['vitrina'] == []

