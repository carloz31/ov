"""B11 · Referencias PLANES, PLAN (con cita), PASOS_PLAN_A y OPCION_INICIAL, solo con datos de la cuenta."""

from soporte_planes import RELATO, abrir_planes, abrir_secciones, crear, guardar, por_que_lista
from soporte_ruta import pedir
from soporte_catalogo_ruta import PERIODISMO, PSICOLOGIA


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
    crear(cliente, PSICOLOGIA)
    crear(cliente, PERIODISMO)
    guardar(cliente, PSICOLOGIA, 'POR_QUE', por_que_lista())
    # Ajuste registros llm (lote 2): PLANES y PLAN traen además cada plan con institución, camino, idea, motivos y
    # relato (lo leen los ecos de los registros).
    motivos = [{'codigo': 'AYUDAR', 'texto': 'Ayudar a otros'}, {'codigo': 'OTRA', 'texto': 'Me gusta explicar'}]
    plan_a = {'prioridad': 1, 'codigo': PSICOLOGIA, 'carrera': 'Psicología', 'institucion': None, 'camino': None,
              'idea_origen': 'MIA', 'motivos': motivos, 'relato': RELATO}
    plan_b = {'prioridad': 2, 'codigo': PERIODISMO, 'carrera': 'Ciencias de la Comunicación', 'institucion': None,
              'camino': None, 'idea_origen': None, 'motivos': [], 'relato': None}
    assert referencias(cliente, 't-comparar')['t-ref-planes'] == {
        'codigo': 't-ref-planes', 'tipo': 'PLANES', 'estado': 'DISPONIBLE',
        'opciones': [{'codigo': PSICOLOGIA, 'texto': 'Psicología'}, {'codigo': PERIODISMO, 'texto': 'Ciencias de la Comunicación'}],
        'planes': [plan_a, plan_b]}
    proyecto = referencias(cliente, 't-proyecto')
    assert proyecto['t-ref-plan-a'] == {
        'codigo': 't-ref-plan-a', 'tipo': 'PLAN', 'estado': 'DISPONIBLE', 'texto': 'Psicología', 'cita': RELATO,
        'opciones': motivos, 'planes': [plan_a]}
    assert proyecto['t-ref-pasos-plan-a']['estado'] == 'SIN_DATO'
    assert proyecto['t-ref-opcion-inicial'] | {'codigo': None} == {
        'codigo': None, 'tipo': 'OPCION_INICIAL', 'estado': 'DISPONIBLE', 'texto': 'Psicología'}
    guardar(cliente, PSICOLOGIA, 'PASOS', {'pasos': [{'tipo': 'visitar', 'texto': 'Ir a la feria.'},
                                                       {'tipo': 'curso', 'texto': 'Taller de verano.'}]})
    assert referencias(cliente, 't-proyecto')['t-ref-pasos-plan-a']['opciones'] == [
        {'codigo': 'visitar', 'texto': 'Ir a la feria.', 'estado': 'PENDIENTE'},
        {'codigo': 'curso', 'texto': 'Taller de verano.', 'estado': 'PENDIENTE'}]
    # Sin plan A propio, otra cuenta no ve los datos de Ana.
    assert {r['estado'] for r in referencias(cliente, 't-proyecto', cuenta='est-luis').values()} == {'SIN_DATO'}
