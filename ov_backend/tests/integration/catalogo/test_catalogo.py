"""B10 · HU-037 a HU-039 y ajuste catalogo-datos-reales: búsquedas, filtros y detalle del catálogo real, y
vistas para «qué exploré»."""

from datetime import datetime

import pytest
from sqlalchemy import select

from app import models as m
from soporte_catalogo_ruta import ENFERMERIA, INST_TECNICO, INST_UNI, PSICOLOGIA, UBIC_CUSCO, UBIC_LIMA
from soporte_retiro import buscar, medir
from soporte_ruta import completar, filas_base, pedir


BASE = '/cuentas/est-ana/catalogo'
PUCP = 'inst-3'
DIRECTORES = 'onet-11-1011-00'
RUTAS_CONSULTA = (f'{BASE}/carreras', f'{BASE}/carreras/{PSICOLOGIA}', f'{BASE}/ocupaciones',
                  f'{BASE}/ocupaciones/psychologist', f'{BASE}/instituciones', f'{BASE}/instituciones/{INST_UNI}',
                  f'{BASE}/familias', f'{BASE}/ubicaciones', f'{BASE}/grupos', f'{BASE}/carreras/inesperada',
                  f'{BASE}/ocupaciones/inesperada')
VISTAS = (('ver-carrera', 'carrera', PSICOLOGIA, 'VISTA_CARRERA'),
          ('ver-ocupacion', 'ocupacion', 'psychologist', 'VISTA_OCUPACION'),
          ('ver-institucion', 'institucion', INST_UNI, 'VISTA_INSTITUCION'))


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


def test_hu037_busca_carreras_por_nombre_tipo_area_familia_y_letras(abierto):
    todas = pedir(abierto, 'GET', f'{BASE}/carreras')
    assert (todas['total'], todas['total_dominio'], len(todas['items'])) == (603, 603, 20)
    nombres = [c['nombre'] for c in todas['items']]
    assert nombres[0].startswith('Abastecimiento')
    # «admin» distingue la carrera universitaria de la de las Fuerzas Armadas por el tipo.
    admin = pedir(abierto, 'GET', f'{BASE}/carreras?buscar=ADMINISTRACION&limite=50')
    administracion = [(c['codigo'], c['tipo']) for c in admin['items'] if c['nombre'] == 'Administración']
    assert sorted(administracion) == [('mtpe-275', 'UNIVERSIDAD'), ('mtpe-601', 'FFAA_POLICIA')]
    assert admin['total_dominio'] == 603
    psicologia = next(c for c in pedir(abierto, 'GET', f'{BASE}/carreras?buscar=psicologia')['items']
                      if c['codigo'] == PSICOLOGIA)
    assert psicologia == {
        'codigo': PSICOLOGIA, 'nombre': 'Psicología', 'tipo': 'UNIVERSIDAD', 'duracion': '5 años', 'riasec': ['S', 'I', 'A'],
        'es_favorita': False,
        'familia': {'codigo': '313', 'nombre': 'Psicología', 'area_codigo': '3',
                    'area_nombre': 'Ciencias Sociales, Comerciales y Derecho'}}
    institutos = pedir(abierto, 'GET', f'{BASE}/carreras?tipo=INSTITUTO&area=5&limite=50')
    assert institutos['total'] == 43
    assert all(c['tipo'] == 'INSTITUTO' and c['familia']['area_codigo'] == '5' for c in institutos['items'])
    familia = pedir(abierto, 'GET', f'{BASE}/carreras?familia=313&tipo=UNIVERSIDAD')
    assert PSICOLOGIA in codigos(familia) and familia['total'] == 3
    for texto in ('%25', '_'):
        assert pedir(abierto, 'GET', f'{BASE}/carreras?buscar={texto}')['total'] == 0
    assert pedir(abierto, 'GET', f'{BASE}/carreras?familia=no-existe')['total'] == 0
    error = pedir(abierto, 'GET', f'{BASE}/carreras?tipo=ESCUELA', esperado=422)
    assert error['detail']['mensaje'].startswith('Filtro tipo inválido')


def test_filtro_riasec_exige_letras_seguidas_y_en_orden(abierto, sesion):
    # DATO DE PRUEBA: carreras con códigos elegidos para recorrer los ejemplos de la spec (las reales aún no traen
    # letras RIASEC).
    familia = sesion.scalars(select(m.FamiliaCarrera)).first()
    for codigo in ('I', 'RI', 'IS', 'RIS', 'ARI', 'IR', 'RSI'):
        sesion.add(m.Carrera(codigo=f'zz-{codigo.lower()}', nombre=f'Zz Carrera {codigo}', familia_id=familia.id,
                             tipo='UNIVERSIDAD', codigo_cine='000000', codigo_riasec=codigo))
    sesion.commit()

    def con(letras):
        encontradas = codigos(pedir(abierto, 'GET', f'{BASE}/carreras?riasec={letras}&limite=50'))
        return sorted(c.removeprefix('zz-').upper() for c in encontradas if c.startswith('zz-'))

    assert con('I') == ['ARI', 'I', 'IR', 'IS', 'RI', 'RIS', 'RSI']
    assert con('RI') == ['ARI', 'RI', 'RIS']
    for invalido in ('X', 'RR', 'RIAS', '', 'R1'):
        error = pedir(abierto, 'GET', f'{BASE}/carreras?riasec={invalido}', esperado=422)
        assert error['detail']['mensaje'] == 'El filtro riasec admite de 1 a 3 letras RIASEC distintas'
        pedir(abierto, 'GET', f'{BASE}/ocupaciones?riasec={invalido}', esperado=422)


def test_hu037_detalle_de_carrera(abierto):
    detalle = pedir(abierto, 'GET', f'{BASE}/carreras/{PSICOLOGIA}')
    assert detalle['descripcion'].startswith('Estudia el comportamiento humano')
    assert (detalle['duracion'], detalle['nombre_cine'], detalle['riasec']) == ('5 años', None, ['S', 'I', 'A'])
    assert len(detalle['ambito_laboral']) > 1 and not any('¿' in linea for linea in detalle['ambito_laboral'])
    assert codigos(detalle['ocupaciones']) == ['psychologist', 'social-worker', 'sociologist', 'teacher']
    assert len(detalle['instituciones']) == 32
    nombres = [i['nombre'] for i in detalle['instituciones']]
    assert nombres == sorted(nombres, key=lambda n: n.lower().replace('ú', 'u').replace('í', 'i'))
    unfv = next(i for i in detalle['instituciones'] if i['codigo'] == INST_UNI)
    assert unfv == {'codigo': INST_UNI, 'nombre': 'Universidad Nacional Federico Villarreal', 'tipo': 'UNIVERSIDAD',
                    'gestion': 'PUBLICA', 'distrito': 'Lima', 'es_favorita': False,
                    'ubicacion': {'codigo': UBIC_LIMA, 'nombre': 'Lima'},
                    'ingreso': {'promedio': 4130, 'minimo': 1223, 'maximo': 9200}}
    ingreso = detalle['ingreso']
    assert ingreso['fuente'] == 'Ponte en Carrera (MTPE)'
    assert ingreso['nacional'] == {'ubicacion': None, 'jovenes': {'promedio': 2824, 'minimo': 1240, 'maximo': 5359},
                                   'adultos': {**ingreso['nacional']['adultos'], 'promedio': 5033}}
    departamentos = [d['ubicacion']['nombre'] for d in ingreso['departamentos']]
    assert len(departamentos) == 19 and 'Lima' in departamentos
    assert departamentos == sorted(departamentos, key=lambda n: n.lower().replace('á', 'a').replace('í', 'i'))
    assert detalle['parecidas']['total'] == 2 and len(detalle['parecidas']['carreras']) == 2
    assert all(c['familia']['codigo'] == '313' and c['codigo'] != PSICOLOGIA
               for c in detalle['parecidas']['carreras'])
    # Las carreras de FF. AA. y Policía no tienen ingreso; las de los campos 011 y 012, tampoco ocupaciones.
    assert pedir(abierto, 'GET', f'{BASE}/carreras/mtpe-601')['ingreso'] is None
    oficiales = pedir(abierto, 'GET', f'{BASE}/carreras/mtpe-518')
    assert (oficiales['familia']['codigo'], oficiales['ingreso'], oficiales['ocupaciones']) == ('011', None, [])
    assert pedir(abierto, 'GET', f'{BASE}/carreras/no-existe', esperado=404)['detail']['mensaje'] == (
        'Carrera no encontrada en el catálogo')


def test_hu038_busca_ocupaciones_por_nombre_otros_nombres_y_grupo(abierto):
    todas = pedir(abierto, 'GET', f'{BASE}/ocupaciones')
    assert (todas['total'], todas['total_dominio']) == (923, 923)
    # «presidente» encuentra a Directores Ejecutivos por sus otros nombres.
    assert DIRECTORES in codigos(pedir(abierto, 'GET', f'{BASE}/ocupaciones?buscar=PRESIDENTE'))
    salud = pedir(abierto, 'GET', f'{BASE}/ocupaciones?grupo=29&limite=50')
    assert salud['total'] == 89 and all(o['grupo'] == '29' for o in salud['items'])
    assert all('SI' in ''.join(o['riasec']) for o in pedir(abierto, 'GET', f'{BASE}/ocupaciones?riasec=SI')['items'])
    assert all(len(o['resumen']) <= 140 for o in salud['items'])


def test_hu038_detalle_de_ocupacion(abierto):
    detalle = pedir(abierto, 'GET', f'{BASE}/ocupaciones/psychologist')
    assert (detalle['codigo_onet'], detalle['riasec'], detalle['job_zone'], detalle['grupo']) == (
        '19-3033.00', ['S', 'I'], 5, '19')
    assert detalle['resumen'].startswith('Evalúan, diagnostican y tratan') and detalle['resumen'].endswith('…')
    assert detalle['puntajes'] == {'R': 1, 'I': 76, 'A': 34, 'S': 93, 'E': 27, 'C': 42}
    # Psicología por `ruta`; las demás, por la relación provisional al azar.
    assert PSICOLOGIA in codigos(detalle['carreras'])
    assert 'lugares_trabajo' not in detalle and 'habilidades' not in detalle
    directores = pedir(abierto, 'GET', f'{BASE}/ocupaciones/{DIRECTORES}')
    assert directores['titulo'] == 'Directores Ejecutivos' and 'Presidente' in directores['tambien_llamado']
    assert directores['estilos_trabajo'][0] == {'codigo': 'tolerancia-ambiguedad',
                                                'nombre': directores['estilos_trabajo'][0]['nombre']}
    assert all(e['nombre'] for e in directores['estilos_trabajo'])
    assert directores['tareas'] and directores['aptitudes'] and directores['conocimientos'][:2] == [
        'Administración', 'Recursos humanos']
    assert directores['personalidad'].startswith('A las personas interesadas en este trabajo')
    pedir(abierto, 'GET', f'{BASE}/ocupaciones/no-existe', esperado=404)


def test_hu039_busca_instituciones_por_nombre_tipo_gestion_y_ubicacion(abierto):
    todas = pedir(abierto, 'GET', f'{BASE}/instituciones')
    assert (todas['total'], todas['total_dominio']) == (706, 706)
    assert INST_UNI in codigos(pedir(abierto, 'GET', f'{BASE}/instituciones?buscar=villarreal'))
    assert pedir(abierto, 'GET', f'{BASE}/instituciones?gestion=PUBLICA')['total'] == 359
    cusco = pedir(abierto, 'GET', f'{BASE}/instituciones?ubicacion={UBIC_CUSCO}&tipo=UNIVERSIDAD')
    assert cusco['total'] == 3 and all(i['ubicacion']['codigo'] == UBIC_CUSCO for i in cusco['items'])
    publicas = pedir(abierto, 'GET', f'{BASE}/instituciones?ubicacion={UBIC_LIMA}&gestion=PUBLICA&limite=50')
    assert all(i['gestion'] == 'PUBLICA' and i['ubicacion']['codigo'] == UBIC_LIMA for i in publicas['items'])
    for filtro in ('tipo=ESCUELA', 'gestion=MIXTA'):
        pedir(abierto, 'GET', f'{BASE}/instituciones?{filtro}', esperado=422)
    pedir(abierto, 'GET', f'{BASE}/instituciones/no-existe', esperado=404)


def test_hu039_detalle_de_institucion_con_ingreso_por_familia(abierto):
    pucp = pedir(abierto, 'GET', f'{BASE}/instituciones/{PUCP}')
    assert (pucp['nombre'], pucp['gestion'], pucp['distrito']) == (
        'Pontificia Universidad Católica del Perú', 'PRIVADA', 'San Miguel')
    assert pucp['direccion'] == 'Av. Universitaria N° 1801' and pucp['pagina_web'] == 'https://www.pucp.edu.pe/'
    con_ingreso = [c for c in pucp['carreras'] if c['ingreso'] is not None]
    assert con_ingreso and all(c['ingreso']['minimo'] <= c['ingreso']['maximo'] for c in con_ingreso)
    administracion = [c for c in pucp['carreras'] if c['familia']['codigo'] == '331']
    assert all(c['ingreso'] == {'promedio': 10812, 'minimo': 1500, 'maximo': 29627} for c in administracion)
    nombres = [c['nombre'] for c in pucp['carreras']]
    assert len(nombres) == len(set(c['codigo'] for c in pucp['carreras']))


def test_f06_los_listados_se_paginan(abierto):
    primera = pedir(abierto, 'GET', f'{BASE}/carreras?limite=4')
    segunda = pedir(abierto, 'GET', f'{BASE}/carreras?limite=4&desde=4')
    assert (primera['total'], segunda['total']) == (603, 603)
    assert codigos(primera) + codigos(segunda) == codigos(pedir(abierto, 'GET', f'{BASE}/carreras?limite=8'))
    assert pedir(abierto, 'GET', f'{BASE}/carreras?desde=700')['items'] == []
    # El total cuenta los filtros, no la página.
    assert pedir(abierto, 'GET', f'{BASE}/instituciones?tipo=FFAA_POLICIA&limite=1')['total'] == 8
    for consulta in ('limite=0', 'limite=51', 'desde=-1'):
        for lista in ('carreras', 'ocupaciones', 'instituciones'):
            pedir(abierto, 'GET', f'{BASE}/{lista}?{consulta}', esperado=422)


def test_f06_el_filtro_favoritos_se_combina_con_los_demas(abierto):
    for tipo, codigo in (('CARRERA', PSICOLOGIA), ('CARRERA', ENFERMERIA), ('OCUPACION', 'psychologist'),
                         ('INSTITUCION', INST_TECNICO)):
        pedir(abierto, 'POST', '/acciones/marcar-favorito', {'cuenta': 'est-ana', 'tipo': tipo, 'codigo': codigo})
    favoritas = pedir(abierto, 'GET', f'{BASE}/carreras?favoritos=true')
    assert (favoritas['total'], codigos(favoritas)) == (2, [ENFERMERIA, PSICOLOGIA])
    assert all(c['es_favorita'] for c in favoritas['items'])
    assert codigos(pedir(abierto, 'GET', f'{BASE}/carreras?favoritos=true&buscar=psico')) == [PSICOLOGIA]
    assert pedir(abierto, 'GET', f'{BASE}/carreras?favoritos=true&limite=1')['total'] == 2
    assert codigos(pedir(abierto, 'GET', f'{BASE}/ocupaciones?favoritos=true')) == ['psychologist']
    assert codigos(pedir(abierto, 'GET', f'{BASE}/instituciones?favoritos=true&tipo=INSTITUTO')) == [INST_TECNICO]
    assert pedir(abierto, 'GET', f'{BASE}/instituciones?favoritos=true&tipo=FFAA_POLICIA')['total'] == 0
    # Los favoritos son de la cuenta: otra cuenta no los ve.
    completar(abierto, 't-inicio', cuenta='est-luis')
    assert pedir(abierto, 'GET', '/cuentas/est-luis/catalogo/carreras?favoritos=true')['total'] == 0


def test_f06_opciones_de_los_filtros(abierto):
    familias = pedir(abierto, 'GET', f'{BASE}/familias')
    # Solo las familias con carreras, por área y nombre; de ellas salen las 9 áreas.
    assert len(familias) == 83 and len({f['area_codigo'] for f in familias}) == 9
    assert [f['area_codigo'] for f in familias] == sorted(f['area_codigo'] for f in familias)
    assert {'codigo': '313', 'nombre': 'Psicología', 'area_codigo': '3',
            'area_nombre': 'Ciencias Sociales, Comerciales y Derecho'} in familias
    # Solo los departamentos con instituciones: Lima Provincias solo tiene ingresos.
    ubicaciones = pedir(abierto, 'GET', f'{BASE}/ubicaciones')
    assert len(ubicaciones) == 25 and 'Lima Provincias' not in [u['nombre'] for u in ubicaciones]
    assert ubicaciones[:2] == [{'codigo': 'dep-1', 'nombre': 'Amazonas'}, {'codigo': 'dep-2', 'nombre': 'Áncash'}]
    grupos = pedir(abierto, 'GET', f'{BASE}/grupos')
    assert len(grupos) == 22 and grupos[0] == {'codigo': '45', 'nombre': 'Agricultura, pesca y bosques'}


def _ver_todas_menos(sesion, modelo, evento, quedan):
    """DATO DE PRUEBA: registra vistas de est-ana de todo el catálogo salvo `quedan`, sin pedirlas una a una."""
    cuenta = buscar(sesion, m.Cuenta, 'est-ana')
    sesion.add_all(m.EventoUso(cuenta_id=cuenta.id, tipo=evento, fecha_hora=datetime(2026, 10, 7, 10),
                               id_referencia=id_)
                   for id_, codigo in sesion.execute(select(modelo.id, modelo.codigo)) if codigo not in quedan)
    sesion.commit()


def test_hu042_lugar_inesperado_elige_lo_no_visto(abierto, sesion):
    elegida = pedir(abierto, 'GET', f'{BASE}/carreras/inesperada?excluir={PSICOLOGIA}')
    assert elegida['revisitando'] is False and elegida['codigo'] != PSICOLOGIA
    _ver_todas_menos(sesion, m.Carrera, 'VISTA_CARRERA', {PSICOLOGIA, ENFERMERIA})
    assert pedir(abierto, 'GET', f'{BASE}/carreras/inesperada?excluir={PSICOLOGIA}') == {
        'codigo': ENFERMERIA, 'revisitando': False}
    pedir(abierto, 'POST', '/acciones/ver-carrera', {'cuenta': 'est-ana', 'carrera': ENFERMERIA})
    # Vio todas menos la actual: revisita una distinta de la actual.
    for _ in range(5):
        revisita = pedir(abierto, 'GET', f'{BASE}/carreras/inesperada?excluir={PSICOLOGIA}')
        assert revisita['revisitando'] is True and revisita['codigo'] != PSICOLOGIA
    # Sin la actual vista, la actual sí es candidata desde otra.
    assert pedir(abierto, 'GET', f'{BASE}/carreras/inesperada?excluir={ENFERMERIA}') == {
        'codigo': PSICOLOGIA, 'revisitando': False}


def test_hu042_lugar_inesperado_de_ocupaciones(abierto, sesion):
    elegida = pedir(abierto, 'GET', f'{BASE}/ocupaciones/inesperada?excluir=psychologist')
    assert elegida['revisitando'] is False and elegida['codigo'] != 'psychologist'
    _ver_todas_menos(sesion, m.Ocupacion, 'VISTA_OCUPACION', {'teacher'})
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
    # DATO DE PRUEBA: carreras, ocupaciones, instituciones e ingresos propios para medir pocas contra muchas.
    psicologia = buscar(sesion, m.Carrera, PSICOLOGIA)
    ubicacion = buscar(sesion, m.Ubicacion, UBIC_LIMA)
    uni = buscar(sesion, m.Institucion, INST_UNI)
    psicologo = buscar(sesion, m.Ocupacion, 'psychologist')
    for n in range(cantidad):
        carrera = m.Carrera(codigo=f'extra-{n}', nombre=f'Carrera extra {n}', familia_id=psicologia.familia_id,
                            tipo='UNIVERSIDAD', codigo_cine='313016', codigo_riasec='S')
        ocupacion = m.Ocupacion(codigo=f'extra-{n}', codigo_onet=f'99-{n:04}.00', titulo=f'Ocupación extra {n}',
                                grupo='19', codigo_riasec='S', estilos_trabajo=['iniciativa'])
        institucion = m.Institucion(codigo=f'extra-{n}', nombre=f'Institución extra {n}', tipo='INSTITUTO',
                                    ubicacion_id=ubicacion.id)
        sesion.add_all([carrera, ocupacion, institucion])
        sesion.flush()
        sesion.add_all([m.CarreraOcupacion(carrera_id=carrera.id, ocupacion_id=psicologo.id),
                        m.CarreraOcupacion(carrera_id=psicologia.id, ocupacion_id=ocupacion.id),
                        m.InstitucionCarrera(institucion_id=institucion.id, carrera_id=psicologia.id),
                        m.InstitucionCarrera(institucion_id=uni.id, carrera_id=carrera.id),
                        m.IngresoInstitucion(institucion_id=institucion.id, familia_id=psicologia.familia_id,
                                             promedio=1000, minimo=500, maximo=2000)])


def test_presupuesto_de_consultas_del_catalogo(tmp_path, base_aislada):
    conteos = []
    for extra in (0, 60):
        with base_aislada(tmp_path, f'catalogo-{extra}') as (aplicacion, cliente):
            with aplicacion.state.fabrica_sesiones.begin() as sesion:
                catalogo_extra(sesion, extra)
            completar(cliente, 't-inicio')
            # B17: +1 por la cuenta del actor que carga el guardia.
            pedir(cliente, 'POST', '/acciones/marcar-favorito',
                  {'cuenta': 'est-ana', 'tipo': 'CARRERA', 'codigo': PSICOLOGIA})
            rutas = (*RUTAS_CONSULTA, f'{BASE}/carreras?favoritos=true',
                     f'{BASE}/carreras?tipo=UNIVERSIDAD&area=3&familia=313',
                     f'{BASE}/instituciones?gestion=PUBLICA&ubicacion={UBIC_LIMA}', f'{BASE}/ocupaciones?grupo=19',
                     f'{BASE}/instituciones/{PUCP}', f'{BASE}/ocupaciones/{DIRECTORES}')
            conteos.append([medir(cliente, aplicacion, 'GET', ruta, limite=18)[1].cantidad for ruta in rutas])
    assert conteos[0] == conteos[1]
