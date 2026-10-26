"""B10 · HU-037 a HU-039: búsquedas y detalle del catálogo, y vistas para «qué exploré». DATO DE PRUEBA."""

import pytest
from sqlalchemy import select

from app import models as m
from soporte_retiro import buscar, medir
from soporte_ruta import completar, filas_base, pedir


BASE = '/cuentas/est-ana/catalogo'
RUTAS_CONSULTA = (f'{BASE}/carreras', f'{BASE}/carreras/psychology', f'{BASE}/ocupaciones',
                  f'{BASE}/ocupaciones/psychologist', f'{BASE}/instituciones', f'{BASE}/instituciones/t-uni',
                  f'{BASE}/familias', f'{BASE}/ubicaciones', f'{BASE}/carreras/inesperada',
                  f'{BASE}/ocupaciones/inesperada')
VISTAS = (('ver-carrera', 'carrera', 'psychology', 'VISTA_CARRERA'),
          ('ver-ocupacion', 'ocupacion', 'psychologist', 'VISTA_OCUPACION'),
          ('ver-institucion', 'institucion', 't-uni', 'VISTA_INSTITUCION'))


@pytest.fixture
def abierto(cliente):
    completar(cliente, 't-inicio')
    return cliente


def codigos(respuesta):
    """Códigos de una lista o de los `items` de una página (F06)."""
    filas = respuesta['items'] if isinstance(respuesta, dict) else respuesta
    return [fila['codigo'] for fila in filas]


def test_catalogo_cerrado_responde_409_en_cada_ruta(cliente, aplicacion):
    antes = filas_base(aplicacion)
    for ruta in RUTAS_CONSULTA:
        cerrado = pedir(cliente, 'GET', ruta, esperado=409)
        assert cerrado['detail']['mensaje'] == 'Completa el inicio para abrir el catálogo.'
    for accion, campo, codigo, _ in VISTAS:
        pedir(cliente, 'POST', f'/acciones/{accion}', {'cuenta': 'est-ana', campo: codigo}, 409)
    assert filas_base(aplicacion) == antes
    for ruta in RUTAS_CONSULTA:
        pedir(cliente, 'GET', ruta.replace('est-ana', 'apo-rosa'), esperado=404)


def test_hu037_busca_carreras_por_nombre_familia_y_letras(abierto):
    todas = pedir(abierto, 'GET', f'{BASE}/carreras')
    assert codigos(todas) == ['civil-engineering', 'environmental-engineering', 'journalism', 'nursing',
                              'psychology', 'veterinary-medicine']
    assert todas['total'] == 6
    assert todas['items'][0] == {
        'codigo': 'civil-engineering', 'nombre': 'Ingeniería Civil', 'riasec': ['R', 'I'],
        'familia': {'codigo': 'family-civil-engineering', 'nombre': 'Ingeniería e infraestructura'},
        'es_favorita': False}
    assert todas['items'][-1]['riasec'] == ['I', 'R', 'S']
    for texto in ('INGENIERIA', 'ingeniería', ' Ingenier '):
        assert codigos(pedir(abierto, 'GET', f'{BASE}/carreras?buscar={texto}')) == [
            'civil-engineering', 'environmental-engineering']
    for texto in ('%25', '_'):
        assert pedir(abierto, 'GET', f'{BASE}/carreras?buscar={texto}') == {'total': 0, 'items': []}
    assert codigos(pedir(abierto, 'GET', f'{BASE}/carreras?familia=family-nursing')) == ['nursing']
    assert pedir(abierto, 'GET', f'{BASE}/carreras?familia=no-existe') == {'total': 0, 'items': []}
    assert codigos(pedir(abierto, 'GET', f'{BASE}/carreras?riasec=ri')) == ['civil-engineering']
    assert codigos(pedir(abierto, 'GET', f'{BASE}/carreras?buscar=ingenieria&riasec=I')) == [
        'civil-engineering', 'environmental-engineering']


def test_filtro_riasec_exige_letras_seguidas_y_en_orden(abierto, sesion):
    # DATO DE PRUEBA: carreras con códigos elegidos para recorrer los ejemplos de la spec.
    familia = sesion.scalars(select(m.FamiliaCarrera)).first()
    for codigo in ('I', 'RI', 'IS', 'RIS', 'ARI', 'IR', 'RSI'):
        sesion.add(m.Carrera(codigo=f'zz-{codigo.lower()}', nombre=f'Carrera {codigo}', familia_id=familia.id,
                             codigo_riasec=codigo))
    sesion.commit()

    def con(letras):
        encontradas = codigos(pedir(abierto, 'GET', f'{BASE}/carreras?riasec={letras}'))
        return [c.removeprefix('zz-').upper() for c in encontradas if c.startswith('zz-')]

    assert con('I') == ['ARI', 'I', 'IR', 'IS', 'RI', 'RIS', 'RSI']
    assert con('RI') == ['ARI', 'RI', 'RIS']
    for invalido in ('X', 'RR', 'RIAS', '', 'R1'):
        error = pedir(abierto, 'GET', f'{BASE}/carreras?riasec={invalido}', esperado=422)
        assert error['detail']['mensaje'] == 'El filtro riasec admite de 1 a 3 letras RIASEC distintas'
        pedir(abierto, 'GET', f'{BASE}/ocupaciones?riasec={invalido}', esperado=422)


def test_hu037_detalle_de_carrera(abierto, sesion):
    # DATO DE PRUEBA: una carrera sin letras, instituciones ni ingreso (F06: las de la ruta ya los tienen todas).
    sesion.add(m.Carrera(codigo='zz-sin-datos', nombre='Carrera sin datos',
                         familia_id=sesion.scalars(select(m.FamiliaCarrera)).first().id))
    sesion.commit()
    detalle = pedir(abierto, 'GET', f'{BASE}/carreras/psychology')
    assert detalle['descripcion'].startswith('Comprende el comportamiento humano')
    assert detalle['duracion'] == '5 años aproximadamente'
    assert detalle['riasec'] == ['S', 'I', 'A']
    assert codigos(detalle['ocupaciones']) == ['psychologist', 'social-worker', 'sociologist', 'teacher']
    assert codigos(detalle['instituciones']) == ['t-cusco-privada', 't-uni']
    assert detalle['instituciones'][1] == {'codigo': 't-uni', 'nombre': 'Universidad Nacional de Prueba',
                                           'tipo': 'UNIVERSIDAD', 'gestion': 'PUBLICA', 'es_favorita': False,
                                           'ubicacion': {'codigo': 't-lima', 'nombre': 'Lima de prueba'}}
    assert detalle['ingreso'] == {'promedio_mensual': 3200, 'fuente': 'Fuente de prueba', 'anio': 2025, 'rangos': [
        {'minimo': 0, 'maximo': 2000, 'porcentaje': 30.0}, {'minimo': 2000, 'maximo': 4000, 'porcentaje': 50.0},
        {'minimo': 4000, 'maximo': None, 'porcentaje': 20.0}]}
    sin_datos = pedir(abierto, 'GET', f'{BASE}/carreras/zz-sin-datos')
    assert (sin_datos['riasec'], sin_datos['instituciones'], sin_datos['ingreso']) == ([], [], None)
    assert pedir(abierto, 'GET', f'{BASE}/carreras/no-existe', esperado=404)['detail']['mensaje'] == (
        'Carrera no encontrada en el catálogo')


def test_hu038_busca_ocupaciones_y_consulta_su_detalle(abierto, sesion):
    # DATO DE PRUEBA: una ocupación O*NET sin código del front no aparece en el catálogo.
    sesion.add(m.Ocupacion(codigo=None, codigo_onet='99-0000.00', titulo='Psicólogo sin código'))
    sesion.commit()
    assert codigos(pedir(abierto, 'GET', f'{BASE}/ocupaciones?buscar=PSICOLOGO')) == ['psychologist']
    assert codigos(pedir(abierto, 'GET', f'{BASE}/ocupaciones?riasec=RIC')) == [
        'agricultural-engineer', 'civil-engineer', 'veterinarian']
    detalle = pedir(abierto, 'GET', f'{BASE}/ocupaciones/psychologist')
    assert detalle == {
        'codigo': 'psychologist', 'codigo_onet': '19-3033.00', 'titulo': 'Psicólogo/a', 'riasec': ['S', 'I', 'C'],
        'es_favorita': False,
        'descripcion': 'Escucha, evalúa necesidades emocionales y diseña estrategias de acompañamiento.',
        'lugares_trabajo': 'Centros de salud, colegios, organizaciones, empresas y consulta privada.',
        'conocimientos': ['Psicología', 'Terapia y orientación'],
        'habilidades': ['Escucha activa', 'Contención emocional', 'Evaluación', 'Empatía'],
        'carreras': [{'codigo': 'psychology', 'nombre': 'Psicología', 'riasec': ['S', 'I', 'A'],
                      'familia': {'codigo': 'family-psychology', 'nombre': 'Ciencias sociales y salud'},
                      'es_favorita': False}]}
    sin_texto = pedir(abierto, 'GET', f'{BASE}/ocupaciones/firefighter')
    assert (sin_texto['descripcion'], sin_texto['conocimientos'], sin_texto['habilidades']) == (None, [], [])
    pedir(abierto, 'GET', f'{BASE}/ocupaciones/no-existe', esperado=404)


def test_hu039_busca_instituciones_por_nombre_tipo_y_ubicacion(abierto):
    assert codigos(pedir(abierto, 'GET', f'{BASE}/instituciones')) == [
        't-cusco-privada', 't-ffaa', 't-privada', 't-tecnico', 't-uni']
    assert codigos(pedir(abierto, 'GET', f'{BASE}/instituciones?buscar=universidad')) == ['t-cusco-privada', 't-uni']
    assert codigos(pedir(abierto, 'GET', f'{BASE}/instituciones?tipo=FFAA_POLICIA')) == ['t-ffaa']
    assert codigos(pedir(abierto, 'GET', f'{BASE}/instituciones?tipo=INSTITUTO')) == ['t-tecnico']
    assert codigos(pedir(abierto, 'GET', f'{BASE}/instituciones?ubicacion=t-cusco')) == ['t-cusco-privada', 't-ffaa']
    assert codigos(pedir(abierto, 'GET', f'{BASE}/instituciones?ubicacion=t-cusco&tipo=UNIVERSIDAD')) == [
        't-cusco-privada']
    pedir(abierto, 'GET', f'{BASE}/instituciones?tipo=ESCUELA', esperado=422)
    detalle = pedir(abierto, 'GET', f'{BASE}/instituciones/t-ffaa')
    assert (detalle['tipo'], detalle['pagina_web'], codigos(detalle['carreras'])) == (
        'FFAA_POLICIA', 'https://example.test/escuela', ['civil-engineering', 'nursing'])
    pedir(abierto, 'GET', f'{BASE}/instituciones/no-existe', esperado=404)


def test_f06_los_listados_se_paginan(abierto):
    primera = pedir(abierto, 'GET', f'{BASE}/carreras?limite=4')
    segunda = pedir(abierto, 'GET', f'{BASE}/carreras?limite=4&desde=4')
    assert (primera['total'], segunda['total']) == (6, 6)
    assert codigos(primera) + codigos(segunda) == codigos(pedir(abierto, 'GET', f'{BASE}/carreras'))
    assert len(codigos(primera)) == 4
    assert pedir(abierto, 'GET', f'{BASE}/carreras?desde=10') == {'total': 6, 'items': []}
    # El total cuenta los filtros, no la página.
    assert pedir(abierto, 'GET', f'{BASE}/instituciones?tipo=UNIVERSIDAD&limite=1')['total'] == 3
    assert pedir(abierto, 'GET', f'{BASE}/ocupaciones?limite=50')['total'] == len(
        codigos(pedir(abierto, 'GET', f'{BASE}/ocupaciones?limite=50')))
    for consulta in ('limite=0', 'limite=51', 'desde=-1'):
        for lista in ('carreras', 'ocupaciones', 'instituciones'):
            pedir(abierto, 'GET', f'{BASE}/{lista}?{consulta}', esperado=422)


def test_f06_el_filtro_favoritos_se_combina_con_los_demas(abierto):
    for tipo, codigo in (('CARRERA', 'psychology'), ('CARRERA', 'nursing'), ('OCUPACION', 'psychologist'),
                         ('INSTITUCION', 't-tecnico')):
        pedir(abierto, 'POST', '/acciones/marcar-favorito', {'cuenta': 'est-ana', 'tipo': tipo, 'codigo': codigo})
    favoritas = pedir(abierto, 'GET', f'{BASE}/carreras?favoritos=true')
    assert (favoritas['total'], codigos(favoritas)) == (2, ['nursing', 'psychology'])
    assert all(c['es_favorita'] for c in favoritas['items'])
    assert codigos(pedir(abierto, 'GET', f'{BASE}/carreras?favoritos=true&buscar=psico')) == ['psychology']
    assert pedir(abierto, 'GET', f'{BASE}/carreras?favoritos=true&limite=1')['total'] == 2
    assert codigos(pedir(abierto, 'GET', f'{BASE}/ocupaciones?favoritos=true')) == ['psychologist']
    assert codigos(pedir(abierto, 'GET', f'{BASE}/instituciones?favoritos=true&tipo=INSTITUTO')) == ['t-tecnico']
    assert pedir(abierto, 'GET', f'{BASE}/instituciones?favoritos=true&tipo=FFAA_POLICIA')['total'] == 0
    # Los favoritos son de la cuenta: otra cuenta no los ve.
    completar(abierto, 't-inicio', cuenta='est-luis')
    assert pedir(abierto, 'GET', '/cuentas/est-luis/catalogo/carreras?favoritos=true')['total'] == 0


def test_f06_opciones_de_los_filtros(abierto):
    familias = pedir(abierto, 'GET', f'{BASE}/familias')
    assert {'codigo': 'family-nursing', 'nombre': 'Salud'} in familias
    assert [f['nombre'] for f in familias] == sorted(f['nombre'] for f in familias)
    assert pedir(abierto, 'GET', f'{BASE}/ubicaciones') == [
        {'codigo': 't-arequipa', 'nombre': 'Arequipa de prueba'}, {'codigo': 't-cusco', 'nombre': 'Cusco de prueba'},
        {'codigo': 't-lima', 'nombre': 'Lima de prueba'}]


def test_hu042_lugar_inesperado_elige_lo_no_visto(abierto):
    carreras = set(codigos(pedir(abierto, 'GET', f'{BASE}/carreras')))
    vistas = set()
    for _ in range(len(carreras)):
        elegida = pedir(abierto, 'GET', f'{BASE}/carreras/inesperada?excluir=psychology')
        if elegida['revisitando']:
            break
        assert elegida['codigo'] in carreras - vistas - {'psychology'}
        pedir(abierto, 'POST', '/acciones/ver-carrera', {'cuenta': 'est-ana', 'carrera': elegida['codigo']})
        vistas.add(elegida['codigo'])
    assert vistas == carreras - {'psychology'}
    # Vio todas menos la actual: revisita una distinta de la actual.
    for _ in range(5):
        revisita = pedir(abierto, 'GET', f'{BASE}/carreras/inesperada?excluir=psychology')
        assert revisita['revisitando'] is True
        assert revisita['codigo'] in carreras - {'psychology'}
    # Sin la actual vista, la actual sí es candidata desde otra.
    sin_ver = pedir(abierto, 'GET', f'{BASE}/carreras/inesperada?excluir=nursing')
    assert sin_ver == {'codigo': 'psychology', 'revisitando': False}


def test_hu042_lugar_inesperado_de_ocupaciones(abierto):
    ocupaciones = set(codigos(pedir(abierto, 'GET', f'{BASE}/ocupaciones?limite=50')))
    elegida = pedir(abierto, 'GET', f'{BASE}/ocupaciones/inesperada?excluir=psychologist')
    assert elegida['revisitando'] is False
    assert elegida['codigo'] in ocupaciones - {'psychologist'}
    for codigo in ocupaciones - {'teacher'}:
        pedir(abierto, 'POST', '/acciones/ver-ocupacion', {'cuenta': 'est-ana', 'ocupacion': codigo})
    assert pedir(abierto, 'GET', f'{BASE}/ocupaciones/inesperada?excluir=psychologist') == {
        'codigo': 'teacher', 'revisitando': False}
    # Pedir el lugar inesperado no cuenta como vista: teacher sigue sin ver.
    assert pedir(abierto, 'GET', f'{BASE}/ocupaciones/inesperada?excluir=psychologist')['codigo'] == 'teacher'
    assert pedir(abierto, 'GET', f'{BASE}/ocupaciones/inesperada?excluir=teacher')['revisitando'] is True


def test_las_vistas_registran_su_evento_con_referencia(abierto):
    for accion, campo, codigo, evento in VISTAS:
        vista = pedir(abierto, 'POST', f'/acciones/{accion}', {'cuenta': 'est-ana', campo: codigo})
        assert [(e['tipo'], e['referencia']) for e in vista['eventos_registrados']] == [(evento, codigo)]
        pedir(abierto, 'POST', f'/acciones/{accion}', {'cuenta': 'est-ana', campo: 'no-existe'}, 404)


def catalogo_extra(sesion, cantidad):
    # DATO DE PRUEBA: carreras, ocupaciones e instituciones propias para medir pocas contra muchas.
    familia = sesion.scalars(select(m.FamiliaCarrera)).first()
    ubicacion = buscar(sesion, m.Ubicacion, 't-lima')
    psicologia = buscar(sesion, m.Carrera, 'psychology')
    uni = buscar(sesion, m.Institucion, 't-uni')
    psicologo = buscar(sesion, m.Ocupacion, 'psychologist')
    for n in range(cantidad):
        carrera = m.Carrera(codigo=f'extra-{n}', nombre=f'Carrera extra {n}', familia_id=familia.id,
                            codigo_riasec='S')
        ocupacion = m.Ocupacion(codigo=f'extra-{n}', codigo_onet=f'99-{n:04}.00', titulo=f'Ocupación extra {n}',
                                codigo_riasec='S')
        institucion = m.Institucion(codigo=f'extra-{n}', nombre=f'Institución extra {n}', tipo='INSTITUTO',
                                    ubicacion_id=ubicacion.id)
        sesion.add_all([carrera, ocupacion, institucion])
        sesion.flush()
        sesion.add_all([m.CarreraOcupacion(carrera_id=carrera.id, ocupacion_id=psicologo.id),
                        m.CarreraOcupacion(carrera_id=psicologia.id, ocupacion_id=ocupacion.id),
                        m.InstitucionCarrera(institucion_id=institucion.id, carrera_id=psicologia.id),
                        m.InstitucionCarrera(institucion_id=uni.id, carrera_id=carrera.id)])


def test_presupuesto_de_consultas_del_catalogo(tmp_path, base_aislada):
    conteos = []
    for extra in (0, 60):
        with base_aislada(tmp_path, f'catalogo-{extra}') as (aplicacion, cliente):
            with aplicacion.state.fabrica_sesiones.begin() as sesion:
                catalogo_extra(sesion, extra)
            completar(cliente, 't-inicio')
            # B17: +1 por la cuenta del actor que carga el guardia.
            pedir(cliente, 'POST', '/acciones/marcar-favorito',
                  {'cuenta': 'est-ana', 'tipo': 'CARRERA', 'codigo': 'psychology'})
            rutas = (*RUTAS_CONSULTA, f'{BASE}/carreras?favoritos=true')
            conteos.append([medir(cliente, aplicacion, 'GET', ruta, limite=11)[1].cantidad for ruta in rutas])
    assert conteos[0] == conteos[1]
