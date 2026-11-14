"""Ajuste panel-salon §5: Intereses del salón, listas completas de áreas e instituciones y su orden."""

from sqlalchemy import select, update

from app import models as m
from app.models import TipoFavorito
from app.services.instrumentos.consultas import resultado_intereses
from soporte_catalogo_ruta import (
    ENFERMERIA, INST_FFAA, INST_PRIVADA, INST_TECNICO, INST_UNI, ING_AMBIENTAL, ING_CIVIL, PERIODISMO, PSICOLOGIA,
)
from soporte_consultas import ContadorConsultas
from soporte_panel import (
    AHORA, complicacion, cuenta, familia_de, favorito, fijar_ahora, intereses, nuevo_estudiante, tarjeta, ver,
)
from soporte_retiro import ciclo


def _por_codigo(filas):
    return {f['codigo']: f for f in filas}


def test_estudiantes_distintos_planes_plan_a_y_solo_favoritos(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    # Ana tiene la misma institución en sus tres planes: cuenta una vez.
    tarjeta(sesion, 'est-ana', ING_AMBIENTAL, 1, INST_UNI)
    tarjeta(sesion, 'est-ana', ING_CIVIL, 2, INST_UNI)
    tarjeta(sesion, 'est-ana', PSICOLOGIA, 3, INST_UNI)
    tarjeta(sesion, 'est-luis', PSICOLOGIA, 1)
    tarjeta(sesion, 'est-luis', ENFERMERIA, 2, INST_PRIVADA, activa=False)  # inactiva: no cuenta
    favorito(sesion, 'est-mia', TipoFavorito.CARRERA, PSICOLOGIA)
    favorito(sesion, 'est-ana', TipoFavorito.CARRERA, PSICOLOGIA)          # ya la tiene en un plan
    favorito(sesion, 'est-mia', TipoFavorito.INSTITUCION, INST_UNI)
    sesion.add(m.Favorito(cuenta_id=cuenta(sesion, 'est-teo').id, tipo=TipoFavorito.OCUPACION,  # no cuenta
                          id_referencia=sesion.scalar(select(m.Ocupacion.id).limit(1)), fecha_hora=AHORA))
    sesion.commit()
    datos = intereses(cliente)
    assert (datos['con_planes'], datos['con_favoritos']) == (2, 2)
    psicologia = _por_codigo(datos['areas']['filas'])[familia_de(sesion, PSICOLOGIA)]
    assert (psicologia['en_planes'], psicologia['plan_a'], psicologia['solo_favoritos'], psicologia['total']) == (
        2, 1, 1, 3)
    uni = _por_codigo(datos['instituciones']['filas'])[INST_UNI]
    assert (uni['en_planes'], uni['plan_a'], uni['solo_favoritos'], uni['total']) == (1, 1, 1, 2)
    assert datos['instituciones']['plan_a_sin_institucion'] == 1
    assert INST_PRIVADA not in _por_codigo(datos['instituciones']['filas'])
    assert set(ver(cliente, 'area', familia_de(sesion, PSICOLOGIA))) == {'est-ana', 'est-luis', 'est-mia'}
    assert set(ver(cliente, 'institucion', INST_UNI)) == {'est-ana', 'est-mia'}
    ver(cliente, 'institucion', INST_PRIVADA, esperado=422)


def test_el_orden_se_aplica_a_toda_la_lista_antes_de_cortar(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    sesion.execute(update(m.Parametro).where(m.Parametro.codigo == 'PANEL_TOP_INTERESES').values(valor='1'))
    tarjeta(sesion, 'est-ana', PSICOLOGIA, 1, INST_UNI)
    tarjeta(sesion, 'est-luis', ING_CIVIL, 1, INST_UNI)
    for codigo in ('est-mia', 'est-teo', 'est-sol'):
        favorito(sesion, codigo, TipoFavorito.INSTITUCION, INST_PRIVADA)
    sesion.commit()
    inicial = intereses(cliente)['instituciones']
    assert [f['codigo'] for f in inicial['filas']] == [INST_UNI] and inicial['total'] == 2
    por_favoritos = intereses(cliente, orden_instituciones='-solo_favoritos')['instituciones']
    assert [f['codigo'] for f in por_favoritos['filas']] == [INST_PRIVADA]
    al_reves = intereses(cliente, orden_instituciones='solo_favoritos')['instituciones']
    assert [f['codigo'] for f in al_reves['filas']] == [INST_UNI]
    intereses(cliente, esperado=422, orden_areas='-otra')


def test_formacion_complicaciones_y_plan_a_sin_institucion(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    a = tarjeta(sesion, 'est-ana', PSICOLOGIA, 1, INST_UNI)
    b = tarjeta(sesion, 'est-luis', ENFERMERIA, 1, INST_PRIVADA)
    c = tarjeta(sesion, 'est-mia', PERIODISMO, 1)
    otra = tarjeta(sesion, 'est-teo', ING_CIVIL, 2, INST_TECNICO)  # no es Plan A
    complicacion(sesion, a, 'ECONOMICAS')
    complicacion(sesion, a, 'ACADEMICAS', numero=2)
    complicacion(sesion, b, 'ECONOMICAS')
    complicacion(sesion, c, otro='DATO DE PRUEBA: mi abuela')
    complicacion(sesion, otra, 'DISTANCIA')
    sesion.commit()
    datos = intereses(cliente)
    assert datos['formacion'] == {'con_plan_a': 3, 'filas': [{'tipo': 'UNIVERSIDAD', 'cantidad': 3, 'desglose': [
        {'tipo': 'UNIVERSIDAD', 'gestion': 'PRIVADA', 'cantidad': 1},
        {'tipo': 'UNIVERSIDAD', 'gestion': 'PUBLICA', 'cantidad': 1},
        {'tipo': None, 'gestion': None, 'cantidad': 1}]}]}
    assert datos['complicaciones'] == {'filas': [{'texto': 'Económicas', 'cantidad': 2},
                                                 {'texto': 'Académicas', 'cantidad': 1}], 'otra': 1}


def test_planes_frente_al_test_con_las_familias_recomendadas(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    for codigo in ('est-ana', 'est-luis'):
        ciclo(cliente, cuenta=codigo)
    ciclo(cliente, cuenta='est-mia', opcion=3)  # perfil plano: no entra en la base
    recomendadas = [f.codigo for f in resultado_intereses(sesion, cuenta(sesion, 'est-ana')).familias]
    dentro = sesion.scalar(select(m.Carrera.codigo).join(m.FamiliaCarrera).where(
        m.FamiliaCarrera.codigo == recomendadas[0]).order_by(m.Carrera.codigo).limit(1))
    fuera = sesion.scalar(select(m.Carrera.codigo).join(m.FamiliaCarrera).where(
        m.FamiliaCarrera.codigo.not_in(recomendadas)).order_by(m.Carrera.codigo).limit(1))
    tarjeta(sesion, 'est-ana', dentro, 1)
    tarjeta(sesion, 'est-luis', fuera, 1)
    tarjeta(sesion, 'est-mia', dentro, 1)
    sesion.commit()
    frente = intereses(cliente)['frente_test']
    assert (frente['base'], frente['coinciden'], frente['no_coinciden'], frente['resultados_listos']) == (2, 1, 1, 2)
    letra = resultado_intereses(sesion, cuenta(sesion, 'est-ana')).codigo_interes.codigo[0]
    assert frente['codigos'] == [{'letra': letra, 'nombre': frente['codigos'][0]['nombre'], 'cantidad': 2}]
    assert ver(cliente, 'plan_fuera_test') == ['est-luis']


def test_listas_completas_paginadas_con_busqueda_filtro_y_columnas(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    tarjeta(sesion, 'est-ana', PSICOLOGIA, 1, INST_UNI)
    tarjeta(sesion, 'est-luis', ING_CIVIL, 1, INST_FFAA)
    favorito(sesion, 'est-mia', TipoFavorito.INSTITUCION, INST_TECNICO)
    sesion.commit()

    def lista(tipo_lista, **parametros):
        respuesta = cliente.get(f'/cuentas/ori-carmen/panel/{tipo_lista}', params={'salon': '5A', **parametros})
        assert respuesta.status_code == 200, respuesta.text
        return respuesta.json()

    todas = lista('instituciones')
    assert todas['total'] == 3 and todas['tipos'] == ['UNIVERSIDAD', 'INSTITUTO', 'FFAA_POLICIA']
    assert set(todas['items'][0]) == {'codigo', 'nombre', 'tipo', 'gestion', 'en_planes', 'plan_a', 'solo_favoritos',
                                      'total'}
    assert lista('instituciones', tipo='INSTITUTO')['total'] == 1
    pagina = lista('instituciones', limite=2, desde=2, orden='-total')
    assert pagina['total'] == 3 and len(pagina['items']) == 1
    nombre = todas['items'][0]['nombre']
    assert lista('instituciones', buscar=nombre[:5].upper())['items'][0]['nombre'] == nombre
    areas = lista('areas', orden='nombre')
    assert areas['total'] == 2 and [a['nombre'] for a in areas['items']] == sorted(a['nombre'] for a in areas['items'])
    assert areas['items'][0]['carreras'][0]['cantidad'] == 1
    assert cliente.get('/cuentas/ori-carmen/panel/areas', params={'limite': 99}).status_code == 422
    assert cliente.get('/cuentas/ori-carmen/panel/areas', params={'tipo': 'OTRO'}).status_code == 422
    assert cliente.get('/cuentas/ori-carmen/panel/areas', params={'salon': '5B'}).status_code == 404


def test_el_numero_de_consultas_de_intereses_no_crece_con_el_salon(aplicacion, cliente, sesion):
    fijar_ahora(aplicacion)
    tarjeta(sesion, 'est-ana', PSICOLOGIA, 1, INST_UNI)
    sesion.commit()

    def contar():
        with ContadorConsultas(aplicacion.state.motor_bd) as contador:
            intereses(cliente)
            cliente.get('/cuentas/ori-carmen/panel/areas', params={'salon': '5A'})
        return contador.cantidad

    pocas = contar()
    for indice, carrera in enumerate((PSICOLOGIA, ING_CIVIL, ENFERMERIA, PERIODISMO) * 3):
        nuevo = nuevo_estudiante(sesion, f't-panel-{indice}', f'Estudiante {indice}')
        sesion.flush()
        tarjeta(sesion, nuevo.codigo, carrera, 1, INST_PRIVADA)
        favorito(sesion, nuevo.codigo, TipoFavorito.INSTITUCION, INST_UNI)
    sesion.commit()
    assert contar() == pocas
