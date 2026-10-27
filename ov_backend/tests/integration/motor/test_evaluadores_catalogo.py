"""B10: `t-explorar` se abre con una vista fuera del perfil; logros ocultos por vistas diversas. DATO DE PRUEBA."""

from app import models as m
from soporte_retiro import buscar, ciclo, resultado
from soporte_ruta import actividades, avanzar, pedir, reglas, respuestas_batalla
from soporte_catalogo_ruta import ENFERMERIA, ING_CIVIL, INST_FFAA, INST_UNI, PSICOLOGIA, UBIC_LIMA


EXPLORAR = {'R-t-explorar-carrera', 'R-t-explorar-ocupacion'}


def ver(cliente, clase, codigo, cuenta='est-ana'):
    return pedir(cliente, 'POST', f'/acciones/ver-{clase}', {'cuenta': cuenta, clase: codigo})


def vencer(cliente):
    return pedir(cliente, 'POST', '/acciones/resolver-batalla', {'cuenta': 'est-ana', 'actividad': 't-batalla',
                                                                 'respuestas': respuestas_batalla(True, 1)})


def test_sin_resultado_hacen_falta_vistas_de_dos_tipos(cliente):
    avanzar(cliente, 't-cierre-inicio')
    assert reglas(vencer(cliente)) == set()
    # nursing y psychology son de tipo S; psychologist también, y la vista repetida no suma.
    for clase, codigo in (('carrera', ENFERMERIA), ('carrera', PSICOLOGIA), ('ocupacion', 'psychologist'),
                          ('ocupacion', 'psychologist')):
        assert not reglas(ver(cliente, clase, codigo)) & EXPLORAR
    assert actividades(cliente)['t-explorar'] == 'BLOQUEADA'
    assert reglas(ver(cliente, 'ocupacion', 'civil-engineer')) & EXPLORAR == {'R-t-explorar-ocupacion'}
    assert actividades(cliente)['t-explorar'] == 'DISPONIBLE'


def test_con_resultado_basta_una_vista_fuera_del_tipo_principal(cliente):
    ciclo(cliente)
    letra = resultado(cliente)['codigo_interes']['codigo'][0]
    ocupaciones = pedir(cliente, 'GET', '/cuentas/est-ana/catalogo/ocupaciones?limite=50')['items']
    propias = [o['codigo'] for o in ocupaciones if o['riasec'][0] == letra]
    ajena = next(o['codigo'] for o in ocupaciones if o['riasec'][0] != letra)
    assert len(propias) >= 2
    vencer(cliente)
    for codigo in (*propias[:2], propias[0]):
        assert not reglas(ver(cliente, 'ocupacion', codigo)) & EXPLORAR
    assert actividades(cliente)['t-explorar'] == 'BLOQUEADA'
    assert reglas(ver(cliente, 'ocupacion', ajena)) & EXPLORAR == {'R-t-explorar-ocupacion'}


def test_la_vista_previa_abre_al_vencer_la_batalla(cliente):
    avanzar(cliente, 't-cierre-inicio')
    ver(cliente, 'carrera', ENFERMERIA)
    ver(cliente, 'carrera', ING_CIVIL)
    assert actividades(cliente)['t-explorar'] == 'BLOQUEADA'
    assert reglas(vencer(cliente)) == {'R-t-explorar-carrera'}


def test_logros_ocultos_por_vistas_diversas(cliente, sesion):
    pedir(cliente, 'POST', '/acciones/completar-actividad', {'cuenta': 'est-ana', 'actividad': 't-inicio'})
    # Umbral 2: dos familias distintas; repetir la misma carrera no suma.
    for _ in range(3):
        assert 'R-t-ins-familias' not in reglas(ver(cliente, 'carrera', ENFERMERIA))
    assert 'R-t-ins-familias' in reglas(ver(cliente, 'carrera', PSICOLOGIA))
    # Umbral 2: dos letras distintas en el high point 1.
    assert 'R-t-ins-letras' not in reglas(ver(cliente, 'ocupacion', 'psychologist'))
    assert 'R-t-ins-letras' not in reglas(ver(cliente, 'ocupacion', 'social-worker'))
    assert 'R-t-ins-letras' in reglas(ver(cliente, 'ocupacion', 'civil-engineer'))
    # Umbral nulo: todos los tipos con al menos una institución, incluido el que se agrega ahora.
    # DATO DE PRUEBA: un instituto que la ruta no trae.
    sesion.add(m.Institucion(codigo='t-instituto', nombre='Instituto de prueba', tipo='INSTITUTO',
                             ubicacion_id=buscar(sesion, m.Ubicacion, UBIC_LIMA).id))
    sesion.commit()
    for codigo in (INST_UNI, INST_FFAA, INST_UNI):
        assert 'R-t-ins-instituciones' not in reglas(ver(cliente, 'institucion', codigo))
    assert 'R-t-ins-instituciones' in reglas(ver(cliente, 'institucion', 't-instituto'))
