"""B10 · HU-037 a HU-039: búsquedas y detalle del catálogo, y vistas para «qué exploré». DATO DE PRUEBA."""

import pytest
from sqlalchemy import select

from app import models as m
from soporte_retiro import buscar, medir
from soporte_ruta import completar, filas_base, pedir


BASE = '/cuentas/est-ana/catalogo'
RUTAS_CONSULTA = (f'{BASE}/carreras', f'{BASE}/carreras/psychology', f'{BASE}/ocupaciones',
                  f'{BASE}/ocupaciones/psychologist', f'{BASE}/instituciones', f'{BASE}/instituciones/t-uni')
VISTAS = (('ver-carrera', 'carrera', 'psychology', 'VISTA_CARRERA'),
          ('ver-ocupacion', 'ocupacion', 'psychologist', 'VISTA_OCUPACION'),
          ('ver-institucion', 'institucion', 't-uni', 'VISTA_INSTITUCION'))


@pytest.fixture
def abierto(cliente):
    completar(cliente, 't-inicio')
    return cliente


def codigos(respuesta):
    return [fila['codigo'] for fila in respuesta]


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
    assert todas[0] == {'codigo': 'civil-engineering', 'nombre': 'Ingeniería Civil', 'riasec': ['R', 'I'],
                        'familia': {'codigo': 'family-civil-engineering', 'nombre': 'Ingeniería e infraestructura'}}
    assert todas[-1]['riasec'] == []
    for texto in ('INGENIERIA', 'ingeniería', ' Ingenier '):
        assert codigos(pedir(abierto, 'GET', f'{BASE}/carreras?buscar={texto}')) == [
            'civil-engineering', 'environmental-engineering']
    for texto in ('%25', '_'):
        assert pedir(abierto, 'GET', f'{BASE}/carreras?buscar={texto}') == []
    assert codigos(pedir(abierto, 'GET', f'{BASE}/carreras?familia=family-nursing')) == ['nursing']
    assert pedir(abierto, 'GET', f'{BASE}/carreras?familia=no-existe') == []
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


def test_hu037_detalle_de_carrera(abierto):
    detalle = pedir(abierto, 'GET', f'{BASE}/carreras/psychology')
    assert detalle['descripcion'].startswith('Comprende el comportamiento humano')
    assert detalle['duracion'] == '5 años aproximadamente'
    assert detalle['riasec'] == ['S', 'I', 'A']
    assert codigos(detalle['ocupaciones']) == ['psychologist', 'social-worker', 'sociologist', 'teacher']
    assert detalle['instituciones'] == [{'codigo': 't-uni', 'nombre': 'Universidad Nacional de Prueba',
                                         'tipo': 'UNIVERSIDAD', 'ubicacion': {'codigo': 't-lima',
                                                                              'nombre': 'Lima de prueba'}}]
    assert detalle['ingreso'] == {'promedio_mensual': 3200, 'fuente': 'Fuente de prueba', 'anio': 2025, 'rangos': [
        {'minimo': 0, 'maximo': 2000, 'porcentaje': 30.0}, {'minimo': 2000, 'maximo': 4000, 'porcentaje': 50.0},
        {'minimo': 4000, 'maximo': None, 'porcentaje': 20.0}]}
    sin_datos = pedir(abierto, 'GET', f'{BASE}/carreras/veterinary-medicine')
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
        'descripcion': 'Escucha, evalúa necesidades emocionales y diseña estrategias de acompañamiento.',
        'lugares_trabajo': 'Centros de salud, colegios, organizaciones, empresas y consulta privada.',
        'conocimientos': ['Psicología', 'Terapia y orientación'],
        'habilidades': ['Escucha activa', 'Contención emocional', 'Evaluación', 'Empatía'],
        'carreras': [{'codigo': 'psychology', 'nombre': 'Psicología', 'riasec': ['S', 'I', 'A'],
                      'familia': {'codigo': 'family-psychology', 'nombre': 'Ciencias sociales y salud'}}]}
    sin_texto = pedir(abierto, 'GET', f'{BASE}/ocupaciones/firefighter')
    assert (sin_texto['descripcion'], sin_texto['conocimientos'], sin_texto['habilidades']) == (None, [], [])
    pedir(abierto, 'GET', f'{BASE}/ocupaciones/no-existe', esperado=404)


def test_hu039_busca_instituciones_por_nombre_tipo_y_ubicacion(abierto):
    assert codigos(pedir(abierto, 'GET', f'{BASE}/instituciones')) == ['t-ffaa', 't-uni']
    assert codigos(pedir(abierto, 'GET', f'{BASE}/instituciones?buscar=universidad')) == ['t-uni']
    assert codigos(pedir(abierto, 'GET', f'{BASE}/instituciones?tipo=FFAA_POLICIA')) == ['t-ffaa']
    assert pedir(abierto, 'GET', f'{BASE}/instituciones?tipo=INSTITUTO') == []
    assert codigos(pedir(abierto, 'GET', f'{BASE}/instituciones?ubicacion=t-cusco')) == ['t-ffaa']
    pedir(abierto, 'GET', f'{BASE}/instituciones?tipo=ESCUELA', esperado=422)
    detalle = pedir(abierto, 'GET', f'{BASE}/instituciones/t-ffaa')
    assert (detalle['tipo'], detalle['pagina_web'], codigos(detalle['carreras'])) == (
        'FFAA_POLICIA', 'https://example.test/escuela', ['civil-engineering', 'nursing'])
    pedir(abierto, 'GET', f'{BASE}/instituciones/no-existe', esperado=404)


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
            conteos.append([medir(cliente, aplicacion, 'GET', ruta)[1].cantidad for ruta in RUTAS_CONSULTA])
    assert conteos[0] == conteos[1]
