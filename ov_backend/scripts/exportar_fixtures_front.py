"""Exporta los fixtures `ruta-*` del contrato con el front, sin servicios externos."""

import argparse
import json
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory

if __package__ in (None, ''):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


# DATO DE PRUEBA: fecha y respuestas explícitas para reproducir los momentos de la ruta corta.
FECHA = '2026-10-07T10:00:00'
OPCIONES = {'I': 5, 'R': 4, 'A': 3, 'S': 1, 'E': 1, 'C': 1}
MISIONES_INTERESES = ('t-mision-intereses', 't-mision-intereses-2')
PARTIDA_LLEGADA = 'TEST-PARTIDA-LLEGADA'
CARPETA = 'ruta'
PREFIJO = 'ruta-'


def _pedir(cliente, metodo, ruta, datos=None):
    respuesta = cliente.request(metodo, ruta, json=datos)
    if respuesta.status_code != 200:
        raise RuntimeError(f'{metodo} {ruta} respondió {respuesta.status_code}: {respuesta.text}')
    return respuesta.json()


def eleccion_minima(item):
    eleccion = item['eleccion']
    return [] if eleccion is None else [{'codigo': o['codigo']} for o in eleccion['opciones'][:eleccion['minima']]]


def _responder_registro(cliente, actividad, cuenta='est-ana'):
    for item in _pedir(cliente, 'GET', f'/actividades/{actividad}/items-registro'):
        _pedir(cliente, 'POST', '/acciones/registro/guardar-borrador', {
            'cuenta': cuenta, 'actividad': actividad, 'item': item['codigo'], 'fecha_hora': FECHA,
            'texto': 'DATO DE PRUEBA: una respuesta completa con su ejemplo y su razón.',
            'opciones': eleccion_minima(item)})
    return _pedir(cliente, 'POST', '/acciones/registro/entregar',
                  {'cuenta': cuenta, 'actividad': actividad, 'fecha_hora': FECHA})


def _completar(cliente, actividad, cuenta='est-ana'):
    return _pedir(cliente, 'POST', '/acciones/completar-actividad', {
        'cuenta': cuenta, 'actividad': actividad, 'fecha_hora': FECHA,
    })


def _responder_partida(cliente, actividad, opcion):
    items = _pedir(cliente, 'GET', f'/actividades/{actividad}/items')
    _pedir(cliente, 'POST', '/acciones/responder-items', {
        'cuenta': 'est-ana', 'actividad': actividad, 'fecha_hora': FECHA,
        'respuestas': [{'item': item['codigo'], 'opcion': opcion} for item in items]})
    _completar(cliente, actividad)
    return items


def _consultas_dominio(cliente, momento, rutas):
    return {f'{ruta}-{momento}': _pedir(cliente, 'GET', f'/cuentas/est-ana/{ruta}') for ruta in rutas}


def _recorrer(cliente):
    fixtures = {'cuentas': _pedir(cliente, 'GET', '/cuentas')}
    fixtures.update(_consultas_dominio(
        cliente, 'inicial', ('resumen', 'actividades', 'fichas', 'logros', 'secciones', 'testimonios')))
    fixtures['completar-t-inicio'] = _completar(cliente, 't-inicio')
    # B07: el punto de partida está en T0, antes de su cierre; se revela y se cita en t-lee-cuestionario.
    fixtures['items-t-partida'] = _responder_partida(cliente, 't-partida', 3)
    fixtures['revelar-partida'] = _pedir(cliente, 'POST', '/acciones/revelar-resultado', {
        'cuenta': 'est-ana', 'instrumento': PARTIDA_LLEGADA, 'aplicacion': 'APL-PARTIDA', 'fecha_hora': FECHA})
    fixtures['resultado-partida'] = _pedir(
        cliente, 'GET', f'/cuentas/est-ana/instrumentos/{PARTIDA_LLEGADA}/resultado?aplicacion=APL-PARTIDA')
    fixtures['referencias-t-lee-cuestionario'] = _pedir(
        cliente, 'GET', '/cuentas/est-ana/actividades/t-lee-cuestionario/referencias')
    fixtures['completar-t-cierre-inicio'] = _completar(cliente, 't-cierre-inicio')
    fixtures['actividades-t1'] = _pedir(cliente, 'GET', '/cuentas/est-ana/actividades')
    fixtures['secciones-t1'] = _pedir(cliente, 'GET', '/cuentas/est-ana/secciones')
    fixtures['items-registro-t-expectativas'] = _pedir(cliente, 'GET', '/actividades/t-expectativas/items-registro')
    fixtures['borrador-t-expectativas'] = _pedir(cliente, 'POST', '/acciones/registro/guardar-borrador', {
        'cuenta': 'est-ana', 'actividad': 't-expectativas', 'item': 't-exp-ruta', 'fecha_hora': FECHA,
        'texto': 'DATO DE PRUEBA: borrador a medias', 'posicion': 't-exp-ruta',
        'opciones': [{'codigo': 'INSTITUTO'}, {'codigo': 'OTRA', 'texto': 'Viajar un año'}]})
    fixtures['registro-t-expectativas-borrador'] = _pedir(
        cliente, 'GET', '/cuentas/est-ana/actividades/t-expectativas/registro')
    fixtures['entregar-t-expectativas'] = _responder_registro(cliente, 't-expectativas')
    fixtures['registro-t-expectativas-cerrado'] = _pedir(
        cliente, 'GET', '/cuentas/est-ana/actividades/t-expectativas/registro')
    # B04: editar abre un intento con su pregunta de seguimiento ([vaga] la pide en el evaluador falso).
    accion_registro = {'cuenta': 'est-ana', 'actividad': 't-expectativas', 'fecha_hora': FECHA}
    fixtures['editar-t-expectativas'] = _pedir(cliente, 'POST', '/acciones/registro/editar', {
        **accion_registro, 'items': [{'item': 't-exp-ruta', 'texto': 'DATO DE PRUEBA: ahora quiero viajar [vaga]'}]})
    _pedir(cliente, 'POST', '/acciones/registro/responder-seguimiento', {
        **accion_registro, 'item': 't-exp-ruta', 'texto': 'DATO DE PRUEBA: porque quiero conocer otras culturas'})
    # B05: con t-exp-espera poco desarrollada (edición pendiente), t-eco la ve «por desarrollar» y la elección, lista.
    fixtures['items-registro-t-eco'] = _pedir(cliente, 'GET', '/actividades/t-eco/items-registro')
    _pedir(cliente, 'POST', '/acciones/registro/editar', {
        **accion_registro, 'items': [{'item': 't-exp-espera', 'texto': 'DATO DE PRUEBA: no lo sé [vaga]'}]})
    fixtures['referencias-t-eco'] = _pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-eco/referencias')
    _pedir(cliente, 'POST', '/acciones/registro/responder-seguimiento', {
        **accion_registro, 'item': 't-exp-espera', 'texto': 'DATO DE PRUEBA: esperan que estudie, porque confían en mí'})
    fixtures['actividades-ciudad'] = _pedir(cliente, 'GET', '/cuentas/est-ana/actividades')
    # B09: diario. t-inicio dejó la pregunta fija y t-expectativas la personalizada, que se redacta al abrirla.
    diario = {'cuenta': 'est-ana', 'fecha_hora': FECHA}
    fixtures['diario-preguntas'] = _pedir(cliente, 'GET', '/cuentas/est-ana/diario/preguntas')
    fixtures['abrir-pregunta-personal'] = _pedir(cliente, 'POST', '/acciones/diario/abrir-pregunta',
                                                 {**diario, 'codigo': 't-diario-personal'})
    fixtures['pregunta-del-dia'] = _pedir(cliente, 'POST', '/acciones/diario/pregunta-del-dia', diario)
    fixtures['escribir-entrada-fija'] = _pedir(cliente, 'POST', '/acciones/escribir-entrada', {
        **diario, 'pregunta': 't-diario-fija', 'texto': 'DATO DE PRUEBA: quiero descubrir qué me apasiona'})
    _pedir(cliente, 'POST', '/acciones/escribir-entrada', {
        **diario, 'pregunta': 't-diario-personal', 'titulo': 'Lo que siento', 'texto': 'DATO DE PRUEBA: tranquila'})
    _pedir(cliente, 'POST', '/acciones/escribir-entrada', {**diario, 'del_dia': True, 'texto': 'DATO DE PRUEBA: hoy'})
    fixtures['escribir-entrada-libre'] = _pedir(cliente, 'POST', '/acciones/escribir-entrada', {
        **diario, 'texto': 'DATO DE PRUEBA: una entrada libre'})
    fixtures['editar-entrada'] = _pedir(cliente, 'POST', '/acciones/editar-entrada', {
        **diario, 'numero': 4, 'titulo': 'Mi tarde', 'texto': 'DATO DE PRUEBA: una entrada libre, corregida'})
    _pedir(cliente, 'POST', '/acciones/escribir-entrada', {**diario, 'texto': 'DATO DE PRUEBA: para borrar'})
    _pedir(cliente, 'POST', '/acciones/borrar-entrada', {**diario, 'numero': 5})
    fixtures['diario-entradas'] = _pedir(cliente, 'GET', '/cuentas/est-ana/diario/entradas')
    fixtures['diario-amistad'] = _pedir(cliente, 'GET', '/cuentas/est-ana/diario/amistad')
    for dia, nivel in ((6, 2), (7, 3)):
        _pedir(cliente, 'POST', '/acciones/check-in',
               {'cuenta': 'est-ana', 'nivel_seguridad': nivel, 'fecha_hora': f'2026-10-0{dia}T08:00:00'})
    fixtures['check-ins'] = _pedir(cliente, 'GET', '/cuentas/est-ana/check-ins')
    fixtures['tematicas'] = _pedir(cliente, 'GET', '/cuentas/est-ana/tematicas')
    ruta_avisos = '/cuentas/est-ana/desbloqueos?solo_no_vistos=true'
    avisos = _pedir(cliente, 'GET', ruta_avisos)
    fixtures['desbloqueos-no-vistos'] = avisos
    marcados = _pedir(cliente, 'POST', '/cuentas/est-ana/desbloqueos/marcar-vistos')
    if marcados['marcados'] != len(avisos) or _pedir(cliente, 'GET', ruta_avisos) != []:
        raise RuntimeError('El marcado no vació los desbloqueos no vistos')
    # B08: la batalla se pierde, se repasa y se gana; solo la victoria la completa.
    batalla = {'cuenta': 'est-ana', 'actividad': 't-batalla', 'fecha_hora': FECHA}
    fixtures['resolver-batalla-derrota'] = _pedir(cliente, 'POST', '/acciones/resolver-batalla', {
        **batalla, 'victoria': False, 'aciertos': 1, 'preguntas': 4})
    fixtures['resolver-batalla-victoria'] = _pedir(cliente, 'POST', '/acciones/resolver-batalla', {
        **batalla, 'victoria': True, 'aciertos': 3, 'preguntas': 4})
    fixtures['batallas'] = _pedir(cliente, 'GET', '/cuentas/est-ana/batallas')
    # B10: catálogo, vistas y favoritos. Una ocupación fuera del tipo de la carrera vista abre t-explorar, y los
    # favoritos marcados aquí aparecen con `es_favorita` en el resultado RIASEC.
    catalogo = '/cuentas/est-ana/catalogo'
    fixtures['catalogo-carreras'] = _pedir(cliente, 'GET', f'{catalogo}/carreras')
    fixtures['catalogo-carrera-psychology'] = _pedir(cliente, 'GET', f'{catalogo}/carreras/psychology')
    fixtures['catalogo-ocupaciones-riasec'] = _pedir(cliente, 'GET', f'{catalogo}/ocupaciones?riasec=SI')
    fixtures['catalogo-ocupacion-psychologist'] = _pedir(cliente, 'GET', f'{catalogo}/ocupaciones/psychologist')
    fixtures['catalogo-instituciones'] = _pedir(cliente, 'GET', f'{catalogo}/instituciones')
    fixtures['catalogo-institucion-t-uni'] = _pedir(cliente, 'GET', f'{catalogo}/instituciones/t-uni')
    _pedir(cliente, 'POST', '/acciones/ver-carrera', {'cuenta': 'est-ana', 'carrera': 'nursing', 'fecha_hora': FECHA})
    fixtures['ver-ocupacion'] = _pedir(cliente, 'POST', '/acciones/ver-ocupacion', {
        'cuenta': 'est-ana', 'ocupacion': 'civil-engineer', 'fecha_hora': FECHA})
    for tipo, codigo in (('CARRERA', 'civil-engineering'), ('OCUPACION', 'geologist'), ('INSTITUCION', 't-uni')):
        fixtures['marcar-favorito'] = _pedir(cliente, 'POST', '/acciones/marcar-favorito', {
            'cuenta': 'est-ana', 'tipo': tipo, 'codigo': codigo, 'fecha_hora': FECHA})
    fixtures['favoritos'] = _pedir(cliente, 'GET', '/cuentas/est-ana/favoritos')
    for mision in MISIONES_INTERESES:
        items = _pedir(cliente, 'GET', f'/actividades/{mision}/items')
        if mision == MISIONES_INTERESES[0]:
            fixtures[f'items-{mision}'] = items
        _pedir(cliente, 'POST', '/acciones/responder-items', {
            'cuenta': 'est-ana', 'actividad': mision, 'fecha_hora': FECHA,
            'respuestas': [{'item': item['codigo'], 'opcion': OPCIONES[item['dimension']]} for item in items],
        })
        _completar(cliente, mision)
    fixtures['revelar-riasec'] = _pedir(cliente, 'POST', '/acciones/revelar-resultado', {
        'cuenta': 'est-ana', 'instrumento': 'TEST-RIASEC', 'fecha_hora': FECHA,
    })
    fixtures['resultado-riasec'] = _pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado')
    fixtures['referencias-t-contraste'] = _pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-contraste/referencias')
    # B08: el caso falla, se reintenta y se supera; superarlo abre los testimonios y llena la colección.
    caso = {'cuenta': 'est-ana', 'actividad': 't-caso', 'fecha_hora': FECHA}
    _pedir(cliente, 'POST', '/acciones/resolver-caso', {**caso, 'puntaje': 40, 'ocupaciones': ['firefighter']})
    fixtures['resolver-caso'] = _pedir(cliente, 'POST', '/acciones/resolver-caso', {
        **caso, 'puntaje': 80, 'ocupaciones': ['firefighter', 'paramedic']})
    fixtures['casos'] = _pedir(cliente, 'GET', '/cuentas/est-ana/casos')
    fixtures['coleccion'] = _pedir(cliente, 'GET', '/cuentas/est-ana/coleccion')
    _pedir(cliente, 'POST', '/acciones/ver-testimonio',
           {'cuenta': 'est-ana', 'testimonio': 't-testimonio-1', 'fecha_hora': FECHA})
    fixtures['testimonios-final'] = _pedir(cliente, 'GET', '/cuentas/est-ana/testimonios')
    # B07: con la partida y el RIASEC prioritario del 5A revelados, T2 está abierto; la llegada se compara.
    fixtures['actividades-t2'] = _pedir(cliente, 'GET', '/cuentas/est-ana/actividades')
    _responder_partida(cliente, 't-llegada', 4)
    _pedir(cliente, 'POST', '/acciones/revelar-resultado', {
        'cuenta': 'est-ana', 'instrumento': PARTIDA_LLEGADA, 'aplicacion': 'APL-LLEGADA', 'fecha_hora': FECHA})
    fixtures['comparacion-partida-llegada'] = _pedir(
        cliente, 'GET', f'/cuentas/est-ana/instrumentos/{PARTIDA_LLEGADA}/comparacion')
    fixtures.update(_consultas_dominio(cliente, 'final', ('fichas', 'logros')))
    return fixtures


def _recorrer_apoderado(cliente):
    ruta, secciones = '/cuentas/apo-rosa/actividades', '/cuentas/apo-rosa/secciones'
    fixtures = {'apoderado-actividades-inicial': _pedir(cliente, 'GET', ruta),
                'apoderado-secciones-inicial': _pedir(cliente, 'GET', secciones)}
    for actividad in ('t-apo-1', 't-apo-carta'):
        _completar(cliente, actividad, 'apo-rosa')
    fixtures['apoderado-actividades-final'] = _pedir(cliente, 'GET', ruta)
    fixtures['apoderado-secciones-final'] = _pedir(cliente, 'GET', secciones)
    return fixtures


def exportar_fixtures(destino: Path) -> list[Path]:
    """Exporta los fixtures de `ruta` en `destino/ruta/`, con nombres `ruta-*.json`.

    Usa una base temporal. Se termina todo el recorrido antes de escribir archivos,
    y nunca se abre DATABASE_URL ni se usa el evaluador real.
    """
    evaluador_anterior = os.environ.get('EVALUADOR')
    os.environ['EVALUADOR'] = 'falso'
    try:
        from fastapi.testclient import TestClient
        from app.main import crear_aplicacion
        from datos.cargar import preparar_base

        with TemporaryDirectory(prefix='ov-fixtures-front-') as temporal:
            url = f'sqlite:///{(Path(temporal) / "ruta.db").as_posix()}'
            preparar_base(url, 'ruta', crear_tablas=True)
            aplicacion = crear_aplicacion(url)
            try:
                with TestClient(aplicacion) as cliente:
                    fixtures = _recorrer(cliente)
                    fixtures.update(_recorrer_apoderado(cliente))
            finally:
                aplicacion.state.motor_bd.dispose()
    finally:
        if evaluador_anterior is None:
            os.environ.pop('EVALUADOR', None)
        else:
            os.environ['EVALUADOR'] = evaluador_anterior
    carpeta = Path(destino) / CARPETA
    carpeta.mkdir(parents=True, exist_ok=True)
    archivos = []
    for nombre, respuesta in fixtures.items():
        ruta = carpeta / f'{PREFIJO}{nombre}.json'
        ruta.write_text(json.dumps(respuesta, ensure_ascii=False, indent=2, sort_keys=True) + '\n',
                        encoding='utf-8', newline='\n')
        archivos.append(ruta)
    return archivos


def main() -> None:
    argumentos = argparse.ArgumentParser(
        description='Genera los fixtures ruta-* en tests/fixtures/servidor/ruta de ov_frontend.',
    )
    argumentos.add_argument('--destino', type=Path,
                           help='Carpeta tests/fixtures/servidor de ov_frontend; se crea ruta/ dentro.')
    opciones = argumentos.parse_args()
    if opciones.destino is None:
        argumentos.error('Falta --destino: indica la carpeta tests/fixtures/servidor de ov_frontend.')
    try:
        archivos = exportar_fixtures(opciones.destino)
    except (OSError, ValueError, RuntimeError) as error:
        argumentos.exit(1, f'No se pudieron exportar los fixtures: {error}\n')
    print(f'Exportados {len(archivos)} fixtures en {(opciones.destino / CARPETA).resolve()}')


if __name__ == '__main__':
    main()
