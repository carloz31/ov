"""B11 · Referencias PLANES, PLAN (con cita), PASOS_PLAN_A y OPCION_INICIAL, solo con datos de la cuenta."""

from soporte_planes import RELATO, abrir_planes, abrir_secciones, crear, guardar, por_que_lista
from soporte_ruta import pedir


def referencias(cliente, actividad, cuenta='est-ana'):
    return {r['codigo']: r for r in pedir(
        cliente, 'GET', f'/cuentas/{cuenta}/actividades/{actividad}/referencias')['referencias']}


def test_sin_planes_todas_sin_dato(cliente):
    abrir_planes(cliente)
    resueltas = {**referencias(cliente, 't-comparar'), **referencias(cliente, 't-proyecto')}
    assert {codigo: r['estado'] for codigo, r in resueltas.items()} == dict.fromkeys(
        ('t-ref-planes', 't-ref-plan-a', 't-ref-pasos-plan-a', 't-ref-opcion-inicial'), 'SIN_DATO')
    assert all(set(r) == {'codigo', 'tipo', 'estado'} for r in resueltas.values())


def test_referencias_de_planes_con_dato_y_aisladas_por_cuenta(cliente):
    abrir_planes(cliente)
    abrir_secciones(cliente, 'PASOS')
    crear(cliente, 'psychology')
    crear(cliente, 'journalism')
    guardar(cliente, 'psychology', 'POR_QUE', por_que_lista())
    assert referencias(cliente, 't-comparar')['t-ref-planes'] == {
        'codigo': 't-ref-planes', 'tipo': 'PLANES', 'estado': 'DISPONIBLE',
        'opciones': [{'codigo': 'psychology', 'texto': 'Psicología'}, {'codigo': 'journalism', 'texto': 'Periodismo'}]}
    proyecto = referencias(cliente, 't-proyecto')
    assert proyecto['t-ref-plan-a'] == {
        'codigo': 't-ref-plan-a', 'tipo': 'PLAN', 'estado': 'DISPONIBLE', 'texto': 'Psicología', 'cita': RELATO,
        'opciones': [{'codigo': 'AYUDAR', 'texto': 'Ayudar a otros'}, {'codigo': 'OTRA', 'texto': 'Me gusta explicar'}]}
    assert proyecto['t-ref-pasos-plan-a']['estado'] == 'SIN_DATO'
    assert proyecto['t-ref-opcion-inicial'] | {'codigo': None} == {
        'codigo': None, 'tipo': 'OPCION_INICIAL', 'estado': 'DISPONIBLE', 'texto': 'Psicología'}
    guardar(cliente, 'psychology', 'PASOS', {'pasos': [{'tipo': 'visitar', 'texto': 'Ir a la feria.'},
                                                       {'tipo': 'curso', 'texto': 'Taller de verano.'}]})
    assert referencias(cliente, 't-proyecto')['t-ref-pasos-plan-a']['opciones'] == [
        {'codigo': 'visitar', 'texto': 'Ir a la feria.'}, {'codigo': 'curso', 'texto': 'Taller de verano.'}]
    # Sin plan A propio, otra cuenta no ve los datos de Ana.
    assert {r['estado'] for r in referencias(cliente, 't-proyecto', cuenta='est-luis').values()} == {'SIN_DATO'}
