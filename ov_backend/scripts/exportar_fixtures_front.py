"""Exporta los fixtures `ruta-*` del contrato con el front, sin servicios externos."""

import argparse
from datetime import datetime
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit
from tempfile import TemporaryDirectory

if __package__ in (None, ''):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from datos.ruta import CARRERAS_RUTA, INSTITUCIONES_RUTA  # noqa: E402


# DATO DE PRUEBA: fecha y respuestas explícitas para reproducir los momentos de la ruta corta.
FECHA = '2026-10-07T10:00:00'
OPCIONES = {'I': 5, 'R': 4, 'A': 3, 'S': 1, 'E': 1, 'C': 1}
MISIONES_INTERESES = ('t-mision-intereses', 't-mision-intereses-2')
PARTIDA_LLEGADA = 'TEST-PARTIDA-LLEGADA'
# DATO DE PRUEBA: opción de cada ítem por dimensión (en el orden de `/items`). A no cambia en
# ningún ítem (cita de AUTO-01 en t-lee-cuestionario); B y C suben; D baja; E cambia un ítem sin cambiar de zona.
OPCIONES_PARTIDA = {'AUTO-A': (3, 3, 3, 3), 'AUTO-B': (2, 2, 2, 2), 'AUTO-C': (2, 2, 2, 2),
                    'AUTO-D': (4, 4, 4, 4), 'AUTO-E': (2, 2, 2)}
OPCIONES_LLEGADA = {'AUTO-A': (3, 3, 3, 3), 'AUTO-B': (4, 4, 4, 4), 'AUTO-C': (3, 3, 2, 2),
                    'AUTO-D': (3, 3, 3, 3), 'AUTO-E': (2, 2, 1)}
CARPETA = 'ruta'
# Carreras e instituciones de la ruta por su papel; los nombres de los fixtures conservan el slug de prueba.
PSICOLOGIA, PERIODISMO, ING_CIVIL, ENFERMERIA, ING_AMBIENTAL = (CARRERAS_RUTA[c] for c in (
    'psychology', 'journalism', 'civil-engineering', 'nursing', 'environmental-engineering'))
INST_UNI = INSTITUCIONES_RUTA['t-uni']
PREFIJO = 'ruta-'
# DATO DE PRUEBA (B17): el token y su vencimiento cambian en cada ingreso; los fixtures llevan valores fijos para
# regenerarse idénticos. El recorrido usa los tokens reales.
TOKEN_FIJO = 'TOKEN-DE-PRUEBA'
EXPIRA_FIJA = '2026-10-08T15:00:00Z'
ROLES_SESION = (('est-ana', 'estudiante'), ('apo-rosa', 'apoderado'), ('ori-carmen', 'orientadora'))
_CUENTA_EN_RUTA = re.compile(r'^/cuentas/([^/]+)')


class _ClienteConSesion:
    """Envía cada petición con el token real de la cuenta que nombra (ruta o cuerpo), como el front de cada rol."""

    def __init__(self, cliente):
        self.cliente = cliente
        self.tokens = {}

    def request(self, metodo, ruta, json=None, cuenta=None):
        if cuenta is None:
            coincidencia = _CUENTA_EN_RUTA.match(urlsplit(ruta).path)
            cuenta = (coincidencia.group(1) if coincidencia
                      else json.get('cuenta', 'est-ana') if isinstance(json, dict) else 'est-ana')
        cabeceras = {'Authorization': f'Bearer {self.tokens[cuenta]}'} if cuenta in self.tokens else {}
        return self.cliente.request(metodo, ruta, json=json, headers=cabeceras)


def _ingresar(cliente):
    """B17: ingreso real de cada rol con sus credenciales de prueba, y la consulta de la sesión."""
    from datos.ruta import CUENTAS
    credenciales = {codigo: (correo, contrasena) for codigo, _, _, _, correo, contrasena in CUENTAS}
    fixtures = {}
    for codigo, rol in ROLES_SESION:
        correo, contrasena = credenciales[codigo]
        ingreso = _pedir(cliente, 'POST', '/sesion/ingresar', {'usuario': correo, 'contrasena': contrasena})
        cliente.tokens[codigo] = ingreso['token']
        fixtures[f'sesion-ingresar-{rol}'] = {**ingreso, 'token': TOKEN_FIJO, 'expira_en': EXPIRA_FIJA}
        sesion = cliente.request('GET', '/sesion', cuenta=codigo).json()
        fixtures[f'sesion-{rol}'] = {**sesion, 'expira_en': EXPIRA_FIJA}
    error = cliente.request('POST', '/sesion/ingresar', {'usuario': credenciales['est-ana'][0], 'contrasena': 'otra'})
    if error.status_code != 401:
        raise RuntimeError(f'El ingreso con contraseña errada respondió {error.status_code}')
    fixtures['sesion-error'] = error.json()
    return fixtures


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


def _registro_con_seguimiento(cliente):
    """F01: t-valores con elección ordenada, borradores con posición y las dos preguntas de seguimiento.

    `[vaga]` pide la pregunta en el evaluador falso: se responde la primera (sigue vaga) y se omite la segunda,
    así el cierre trae `items_por_ampliar`.
    """
    accion = {'cuenta': 'est-ana', 'actividad': 't-valores', 'fecha_hora': FECHA}
    fixtures = {'items-registro-t-valores': _pedir(cliente, 'GET', '/actividades/t-valores/items-registro')}
    fixtures['borrador-t-valores'] = _pedir(cliente, 'POST', '/acciones/registro/guardar-borrador', {
        **accion, 'item': 't-val-orden', 'texto': 'DATO DE PRUEBA: crear me importa [vaga]', 'posicion': 't-val-libre',
        'opciones': [{'codigo': 'CREAR'}, {'codigo': 'LIBERTAD'}, {'codigo': 'ESTABILIDAD'}]})
    for item, posicion in (('t-val-libre', 't-val-breve'), ('t-val-breve', 't-val-breve')):
        _pedir(cliente, 'POST', '/acciones/registro/guardar-borrador', {
            **accion, 'item': item, 'posicion': posicion,
            'texto': 'DATO DE PRUEBA: una respuesta completa con su ejemplo y su razón.'})
    fixtures['entregar-t-valores-seguimiento'] = _pedir(cliente, 'POST', '/acciones/registro/entregar', accion)
    fixtures['registro-t-valores-pendiente'] = _pedir(
        cliente, 'GET', '/cuentas/est-ana/actividades/t-valores/registro')
    fixtures['responder-seguimiento-t-valores'] = _pedir(cliente, 'POST', '/acciones/registro/responder-seguimiento', {
        **accion, 'item': 't-val-orden', 'texto': 'DATO DE PRUEBA: porque sí [vaga]'})
    fixtures['continuar-sin-responder-t-valores'] = _pedir(
        cliente, 'POST', '/acciones/registro/continuar-sin-responder', {**accion, 'item': 't-val-orden'})
    # F02: la consulta del registro cerrado con un ítem por ampliar.
    fixtures['registro-t-valores-por-ampliar'] = _pedir(
        cliente, 'GET', '/cuentas/est-ana/actividades/t-valores/registro')
    return fixtures


def _completar(cliente, actividad, cuenta='est-ana'):
    return _pedir(cliente, 'POST', '/acciones/completar-actividad', {
        'cuenta': cuenta, 'actividad': actividad, 'fecha_hora': FECHA,
    })


def _responder_partida(cliente, actividad, opciones):
    items = _pedir(cliente, 'GET', f'/actividades/{actividad}/items')
    vistos = {}

    def opcion(item):
        indice = vistos[item['dimension']] = vistos.get(item['dimension'], -1) + 1
        return opciones[item['dimension']][indice]

    _pedir(cliente, 'POST', '/acciones/responder-items', {
        'cuenta': 'est-ana', 'actividad': actividad, 'fecha_hora': FECHA,
        'respuestas': [{'item': item['codigo'], 'opcion': opcion(item)} for item in items]})
    _completar(cliente, actividad)
    return items


def _guardar_seccion(cliente, carrera, seccion, datos):
    return _pedir(cliente, 'POST', '/acciones/planes/guardar-seccion', {
        'cuenta': 'est-ana', 'carrera': carrera, 'seccion': seccion, 'datos': datos, 'fecha_hora': FECHA})


def _consultas_dominio(cliente, momento, rutas):
    return {f'{ruta}-{momento}': _pedir(cliente, 'GET', f'/cuentas/est-ana/{ruta}') for ruta in rutas}


def _recorrer(cliente):
    fixtures = {'cuentas': _pedir(cliente, 'GET', '/cuentas')}
    fixtures.update(_consultas_dominio(
        cliente, 'inicial', ('resumen', 'actividades', 'avance', 'fichas', 'logros', 'secciones', 'testimonios',
                             'presentaciones')))
    # Ajuste presentaciones-vistas: cerrar la presentación del mapa; la respuesta trae todas las vistas.
    fixtures['presentacion-vista'] = _pedir(cliente, 'POST', '/acciones/presentacion-vista', {
        'cuenta': 'est-ana', 'codigo': 'missions', 'fecha_hora': FECHA})
    fixtures['avance-instrumentos-inicial'] = _pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos')
    # F03: catálogo con nombre y descripción de cada cuestionario (vista del apoderado).
    fixtures['instrumentos'] = _pedir(cliente, 'GET', '/instrumentos')
    fixtures['completar-t-inicio'] = _completar(cliente, 't-inicio')
    # B11: dos planes antes de cerrar el camino; el primero queda como opción inicial. t-inicio abre POR_QUE.
    # F07a: un plan se crea solo desde una carrera favorita; sin marcarla, 409.
    no_favorita = cliente.request('POST', '/acciones/planes/crear', json={
        'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'fecha_hora': FECHA})
    if no_favorita.status_code != 409:
        raise RuntimeError(f'Crear un plan sin favorita respondió {no_favorita.status_code}')
    fixtures['crear-plan-no-favorita'] = no_favorita.json()
    for carrera in (PSICOLOGIA, PERIODISMO):
        _pedir(cliente, 'POST', '/acciones/marcar-favorito', {
            'cuenta': 'est-ana', 'tipo': 'CARRERA', 'codigo': carrera, 'fecha_hora': FECHA})
        fixtures['crear-plan'] = _pedir(cliente, 'POST', '/acciones/planes/crear', {
            'cuenta': 'est-ana', 'carrera': carrera, 'fecha_hora': FECHA})
        fixtures['guardar-seccion-por-que'] = _guardar_seccion(cliente, carrera, 'POR_QUE', {
            'idea_origen': 'MIA', 'motivos': [{'opcion': 'AYUDAR'}, {'otro': 'Me gusta explicar'}],
            'relato': 'DATO DE PRUEBA: un día expliqué un tema a mi primo y sentí que era lo mío.'})
    # B07: el punto de partida está en T0, antes de su cierre; se revela y se cita en t-lee-cuestionario.
    fixtures['items-t-partida'] = _responder_partida(cliente, 't-partida', OPCIONES_PARTIDA)
    # Ajuste de F03: la vista con solo la partida muestra las respuestas ítem por ítem.
    fixtures['respuestas-t-partida'] = _pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-partida/respuestas')
    # F03: COMPLETADO sin resultado vigente es «listo para revelar».
    fixtures['avance-instrumentos-partida-lista'] = _pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos')
    fixtures['revelar-partida'] = _pedir(cliente, 'POST', '/acciones/revelar-resultado', {
        'cuenta': 'est-ana', 'instrumento': PARTIDA_LLEGADA, 'aplicacion': 'APL-PARTIDA', 'fecha_hora': FECHA})
    fixtures['resultado-partida'] = _pedir(
        cliente, 'GET', f'/cuentas/est-ana/instrumentos/{PARTIDA_LLEGADA}/resultado?aplicacion=APL-PARTIDA')
    fixtures['referencias-t-lee-cuestionario'] = _pedir(
        cliente, 'GET', '/cuentas/est-ana/actividades/t-lee-cuestionario/referencias')
    fixtures['completar-t-cierre-inicio'] = _completar(cliente, 't-cierre-inicio')
    fixtures['actividades-t1'] = _pedir(cliente, 'GET', '/cuentas/est-ana/actividades')
    fixtures['avance-t1'] = _pedir(cliente, 'GET', '/cuentas/est-ana/avance')
    fixtures['secciones-t1'] = _pedir(cliente, 'GET', '/cuentas/est-ana/secciones')
    fixtures['items-registro-t-expectativas'] = _pedir(cliente, 'GET', '/actividades/t-expectativas/items-registro')
    fixtures['borrador-t-expectativas'] = _pedir(cliente, 'POST', '/acciones/registro/guardar-borrador', {
        'cuenta': 'est-ana', 'actividad': 't-expectativas', 'item': 't-exp-ruta', 'fecha_hora': FECHA,
        'texto': 'DATO DE PRUEBA: borrador a medias', 'posicion': 't-exp-ruta',
        'opciones': [{'codigo': 'INSTITUTO'}, {'codigo': 'OTRA', 'texto': 'Viajar un año'}]})
    fixtures['registro-t-expectativas-borrador'] = _pedir(
        cliente, 'GET', '/cuentas/est-ana/actividades/t-expectativas/registro')
    # F02: sin entregar, t-eco no tiene qué citar.
    fixtures['referencias-t-eco-sin-dato'] = _pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-eco/referencias')
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
    fixtures['referencias-t-eco-disponible'] = _pedir(
        cliente, 'GET', '/cuentas/est-ana/actividades/t-eco/referencias')
    fixtures['actividades-ciudad'] = _pedir(cliente, 'GET', '/cuentas/est-ana/actividades')
    fixtures['avance-ciudad'] = _pedir(cliente, 'GET', '/cuentas/est-ana/avance')
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
    # Ajuste del diario (F05): borrar la respuesta de una carta la archiva; se desarchiva y se vuelve a archivar.
    _pedir(cliente, 'POST', '/acciones/borrar-entrada', {**diario, 'numero': 2})
    fixtures['desarchivar-pregunta'] = _pedir(cliente, 'POST', '/acciones/diario/desarchivar-pregunta',
                                              {**diario, 'codigo': 't-diario-personal'})
    fixtures['archivar-pregunta'] = _pedir(cliente, 'POST', '/acciones/diario/archivar-pregunta',
                                           {**diario, 'codigo': 't-diario-personal'})
    fixtures['diario-preguntas-buzon'] = _pedir(cliente, 'GET', '/cuentas/est-ana/diario/preguntas')
    for dia, nivel in ((6, 2), (7, 3)):
        _pedir(cliente, 'POST', '/acciones/check-in',
               {'cuenta': 'est-ana', 'nivel_seguridad': nivel, 'fecha_hora': f'2026-10-0{dia}T08:00:00'})
    # F05: «hoy» del servidor fijado en FECHA, para que `registrado_hoy` no dependa del día en que se exporta.
    from app.dependencies import obtener_ahora
    sobrescritas = cliente.cliente.app.dependency_overrides
    sobrescritas[obtener_ahora] = lambda: datetime.fromisoformat(FECHA)
    try:
        fixtures['check-ins'] = _pedir(cliente, 'GET', '/cuentas/est-ana/check-ins')
    finally:
        sobrescritas.pop(obtener_ahora, None)
    fixtures['tematicas'] = _pedir(cliente, 'GET', '/cuentas/est-ana/tematicas')
    ruta_avisos = '/cuentas/est-ana/desbloqueos?solo_no_vistos=true'
    avisos = _pedir(cliente, 'GET', ruta_avisos)
    fixtures['desbloqueos-no-vistos'] = avisos
    marcados = _pedir(cliente, 'POST', '/cuentas/est-ana/desbloqueos/marcar-vistos')
    if marcados['marcados'] != len(avisos) or _pedir(cliente, 'GET', ruta_avisos) != []:
        raise RuntimeError('El marcado no vació los desbloqueos no vistos')
    # B08: la batalla se pierde, se repasa y se gana; solo la victoria la completa. F04b: las preguntas del
    # intento salen del servidor (con semilla fija, para que el fixture no cambie) y se responden con ellas.
    from app.services import batallas as servicio_batallas
    servicio_batallas.azar.seed(4)
    preguntas = _pedir(cliente, 'GET', '/cuentas/est-ana/batallas/t-batalla/preguntas')
    fixtures['preguntas-batalla'] = preguntas

    def responder(aciertos):
        # F04c: el intento termina en su última respuesta; el servidor decide la victoria.
        return [{'pregunta': p['codigo'],
                 'opcion': p['correcta'] if acierta else next(
                     o['indice'] for o in p['opciones'] if o['indice'] != p['correcta'])}
                for acierta, p in zip(aciertos, preguntas)]
    batalla = {'cuenta': 'est-ana', 'actividad': 't-batalla', 'fecha_hora': FECHA}
    # Derrota: un acierto y tres errores. Victoria: un error y cinco aciertos.
    fixtures['resolver-batalla-derrota'] = _pedir(cliente, 'POST', '/acciones/resolver-batalla', {
        **batalla, 'respuestas': responder([True, False, False, False])})
    fixtures['resolver-batalla-victoria'] = _pedir(cliente, 'POST', '/acciones/resolver-batalla', {
        **batalla, 'respuestas': responder([False, True, True, True, True, True])})
    fixtures['batallas'] = _pedir(cliente, 'GET', '/cuentas/est-ana/batallas')
    # B10: catálogo, vistas y favoritos. Una carrera fuera del tipo del resultado abre t-explorar (F06), y los
    # favoritos marcados aquí aparecen con `es_favorita` en el resultado RIASEC. F06: listados paginados.
    catalogo = '/cuentas/est-ana/catalogo'
    fixtures['catalogo-carreras'] = _pedir(cliente, 'GET', f'{catalogo}/carreras?limite=4')
    fixtures['catalogo-carrera-psychology'] = _pedir(cliente, 'GET', f'{catalogo}/carreras/{PSICOLOGIA}')
    fixtures['catalogo-ocupaciones-riasec'] = _pedir(cliente, 'GET', f'{catalogo}/ocupaciones?riasec=SI')
    fixtures['catalogo-ocupacion-psychologist'] = _pedir(cliente, 'GET', f'{catalogo}/ocupaciones/psychologist')
    fixtures['catalogo-instituciones'] = _pedir(cliente, 'GET', f'{catalogo}/instituciones')
    fixtures['catalogo-institucion-t-uni'] = _pedir(cliente, 'GET', f'{catalogo}/instituciones/{INST_UNI}')
    fixtures['catalogo-familias'] = _pedir(cliente, 'GET', f'{catalogo}/familias')
    fixtures['catalogo-ubicaciones'] = _pedir(cliente, 'GET', f'{catalogo}/ubicaciones')
    # Sin resultado todavía hacen falta dos tipos: una ocupación S y después una carrera R, que abre t-explorar.
    # Una sola carrera vista, para no abrir aquí la insignia de familias ni cambiar los logros.
    fixtures['ver-ocupacion'] = _pedir(cliente, 'POST', '/acciones/ver-ocupacion', {
        'cuenta': 'est-ana', 'ocupacion': 'psychologist', 'fecha_hora': FECHA})
    fixtures['ver-carrera'] = _pedir(cliente, 'POST', '/acciones/ver-carrera', {
        'cuenta': 'est-ana', 'carrera': ING_CIVIL, 'fecha_hora': FECHA})
    for tipo, codigo in (('CARRERA', ING_CIVIL), ('OCUPACION', 'geologist'), ('INSTITUCION', INST_UNI)):
        fixtures['marcar-favorito'] = _pedir(cliente, 'POST', '/acciones/marcar-favorito', {
            'cuenta': 'est-ana', 'tipo': tipo, 'codigo': codigo, 'fecha_hora': FECHA})
    fixtures['favoritos'] = _pedir(cliente, 'GET', '/cuentas/est-ana/favoritos')
    fixtures['catalogo-carreras-favoritos'] = _pedir(cliente, 'GET', f'{catalogo}/carreras?favoritos=true')
    # B11: t-valores abre CONOCIMIENTO (dudas con sugerencias del evaluador falso) y t-explorar, REALIDAD. Con dos
    # planes listos para comparar se abre t-comparar.
    fixtures.update(_registro_con_seguimiento(cliente))
    fixtures['guardar-seccion-conocimiento'] = _guardar_seccion(cliente, PSICOLOGIA, 'CONOCIMIENTO', {
        'respuestas': {'DIA_NORMAL': 'SI', 'DONDE_TRABAJAR': 'MAS_O_MENOS', 'CURSOS': 'NO', 'INGRESO': 'SI',
                       'CONOCE_ALGUIEN': 'SI'},
        'dudas': [{'origen': 'SUGERIDA', 'opcion': 'POSTULANTES'},
                  {'origen': 'PROPIA', 'texto': 'DATO DE PRUEBA: ¿hay trabajo en Lima?'}]})
    _responder_registro(cliente, 't-explorar')
    for carrera in (PSICOLOGIA, PERIODISMO):
        fixtures['guardar-seccion-realidad'] = _guardar_seccion(cliente, carrera, 'REALIDAD', {
            'institucion': INST_UNI, 'camino': {'opcion': 'PREPARARME'},
            'gastos': [{'rubro': 'PREPARACION', 'monto': 1300, 'frecuencia': 'UNICA'},
                       {'rubro': 'PENSION', 'monto': 0, 'frecuencia': 'MENSUAL'},
                       {'rubro': 'MATRICULA', 'monto': 600, 'frecuencia': 'POR_CICLO'}],
            'financiamiento': [{'opcion': 'FAMILIA'}, {'otro': 'Trabajo de verano'}],
            'complicaciones': [{'opcion': 'ECONOMICAS'}]})
    fixtures['medidores-plan'] = _pedir(cliente, 'POST', '/acciones/planes/medidores', {
        'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'entusiasmo': 3, 'capacidad': 2, 'recursos': 2,
        'fecha_hora': FECHA})
    for mision in MISIONES_INTERESES:
        items = _pedir(cliente, 'GET', f'/actividades/{mision}/items')
        fixtures[f'items-{mision}'] = items
        _pedir(cliente, 'POST', '/acciones/responder-items', {
            'cuenta': 'est-ana', 'actividad': mision, 'fecha_hora': FECHA,
            'respuestas': [{'item': item['codigo'], 'opcion': OPCIONES[item['dimension']]} for item in items],
        })
        _completar(cliente, mision)
    fixtures['avance-instrumentos-riasec-listo'] = _pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos')
    fixtures['revelar-riasec'] = _pedir(cliente, 'POST', '/acciones/revelar-resultado', {
        'cuenta': 'est-ana', 'instrumento': 'TEST-RIASEC', 'fecha_hora': FECHA,
    })
    fixtures['resultado-riasec'] = _pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos/TEST-RIASEC/resultado')
    fixtures['referencias-t-contraste'] = _pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-contraste/referencias')
    fixtures['items-registro-t-contraste'] = _pedir(cliente, 'GET', '/actividades/t-contraste/items-registro')
    # B08: el caso falla, se reintenta y se supera; superarlo abre los testimonios y llena la colección.
    caso = {'cuenta': 'est-ana', 'actividad': 't-caso', 'fecha_hora': FECHA}
    _pedir(cliente, 'POST', '/acciones/resolver-caso', {**caso, 'puntaje': 6, 'ocupaciones': ['firefighter']})
    fixtures['resolver-caso'] = _pedir(cliente, 'POST', '/acciones/resolver-caso', {
        **caso, 'puntaje': 12, 'ocupaciones': ['firefighter', 'paramedic']})
    fixtures['casos'] = _pedir(cliente, 'GET', '/cuentas/est-ana/casos')
    fixtures['coleccion'] = _pedir(cliente, 'GET', '/cuentas/est-ana/coleccion')
    _pedir(cliente, 'POST', '/acciones/ver-testimonio',
           {'cuenta': 'est-ana', 'testimonio': 't-testimonio-1', 'fecha_hora': FECHA})
    fixtures['testimonios-final'] = _pedir(cliente, 'GET', '/cuentas/est-ana/testimonios')
    # B07: con la partida y el RIASEC prioritario del 5A revelados, T2 está abierto; la llegada se compara.
    fixtures['actividades-t2'] = _pedir(cliente, 'GET', '/cuentas/est-ana/actividades')
    fixtures['avance-t2'] = _pedir(cliente, 'GET', '/cuentas/est-ana/avance')
    # B11: comparar cita los planes y abre PASOS; un paso en el plan A abre t-proyecto, que cita el plan A.
    fixtures['referencias-t-comparar'] = _pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-comparar/referencias')
    _responder_registro(cliente, 't-comparar')
    fixtures['guardar-seccion-pasos'] = _guardar_seccion(cliente, PSICOLOGIA, 'PASOS', {
        'pasos': [{'sugerencia': 1}, {'tipo': 'visitar', 'texto': 'DATO DE PRUEBA: ir a la feria vocacional.'}],
        'sugerencias_descartadas': [2]})
    fixtures['paso-hecho'] = _pedir(cliente, 'POST', '/acciones/planes/paso-hecho', {
        'cuenta': 'est-ana', 'carrera': PSICOLOGIA, 'paso': 1, 'hallazgo': 'DATO DE PRUEBA: hay estadística.',
        'fecha_hora': FECHA})
    fixtures['referencias-t-proyecto'] = _pedir(cliente, 'GET', '/cuentas/est-ana/actividades/t-proyecto/referencias')
    fixtures['planes'] = _pedir(cliente, 'GET', '/cuentas/est-ana/planes')
    fixtures['items-t-llegada'] = _responder_partida(cliente, 't-llegada', OPCIONES_LLEGADA)
    fixtures['avance-instrumentos-llegada-lista'] = _pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos')
    fixtures['revelar-llegada'] = _pedir(cliente, 'POST', '/acciones/revelar-resultado', {
        'cuenta': 'est-ana', 'instrumento': PARTIDA_LLEGADA, 'aplicacion': 'APL-LLEGADA', 'fecha_hora': FECHA})
    fixtures['resultado-llegada'] = _pedir(
        cliente, 'GET', f'/cuentas/est-ana/instrumentos/{PARTIDA_LLEGADA}/resultado?aplicacion=APL-LLEGADA')
    fixtures['avance-instrumentos-final'] = _pedir(cliente, 'GET', '/cuentas/est-ana/instrumentos')
    fixtures['comparacion-partida-llegada'] = _pedir(
        cliente, 'GET', f'/cuentas/est-ana/instrumentos/{PARTIDA_LLEGADA}/comparacion')
    # Ajuste pasaporte-perfil: la vitrina con la primera insignia y el progreso del nivel 3 (dos condiciones).
    fixtures['vitrina'] = _pedir(cliente, 'POST', '/acciones/vitrina', {'cuenta': 'est-ana', 'codigos': ['t-ins-1']})
    fixtures['progreso-nivel-3'] = _pedir(cliente, 'GET', '/cuentas/est-ana/progreso/NIVEL/N3')
    # Ajuste mochila: el modal pide el contenido de t-ficha y, al abrirse, la deja vista (ver-ficha); t-ficha-2
    # sigue nueva en fichas-final.
    fixtures['ficha-t-ficha'] = _pedir(cliente, 'GET', '/cuentas/est-ana/fichas/t-ficha')
    fixtures['ver-ficha'] = _pedir(cliente, 'POST', '/acciones/ver-ficha',
                                   {'cuenta': 'est-ana', 'ficha': 't-ficha', 'fecha_hora': FECHA})
    # Ajuste mochila: t-ficha queda favorita en fichas-final (registra MARCA_FAVORITO_FICHA).
    fixtures['marcar-favorito-ficha'] = _pedir(cliente, 'POST', '/acciones/marcar-favorito', {
        'cuenta': 'est-ana', 'tipo': 'FICHA', 'codigo': 't-ficha', 'fecha_hora': FECHA})
    fixtures.update(_consultas_dominio(cliente, 'final', ('avance', 'fichas', 'logros')))
    return fixtures


def _recorrer_perfil_plano(cliente):
    """F03 · HU-095: est-luis responde todo igual (perfil plano), revela, reinicia y ya no puede reiniciar."""
    from datos.ruta import CUENTAS
    correo, contrasena = next((c, k) for codigo, _, _, _, c, k in CUENTAS if codigo == 'est-luis')
    cliente.tokens['est-luis'] = _pedir(
        cliente, 'POST', '/sesion/ingresar', {'usuario': correo, 'contrasena': contrasena})['token']
    luis = '/cuentas/est-luis'
    _completar(cliente, 't-inicio', 'est-luis')
    items = _pedir(cliente, 'GET', '/actividades/t-partida/items')
    _pedir(cliente, 'POST', '/acciones/responder-items', {
        'cuenta': 'est-luis', 'actividad': 't-partida', 'fecha_hora': FECHA,
        'respuestas': [{'item': item['codigo'], 'opcion': 3} for item in items]})
    for actividad in ('t-partida', 't-cierre-inicio'):
        _completar(cliente, actividad, 'est-luis')
    _responder_registro(cliente, 't-expectativas', 'est-luis')
    for mision in MISIONES_INTERESES:
        items = _pedir(cliente, 'GET', f'/actividades/{mision}/items')
        _pedir(cliente, 'POST', '/acciones/responder-items', {
            'cuenta': 'est-luis', 'actividad': mision, 'fecha_hora': FECHA,
            'respuestas': [{'item': item['codigo'], 'opcion': 3} for item in items]})
        _completar(cliente, mision, 'est-luis')
    accion = {'cuenta': 'est-luis', 'instrumento': 'TEST-RIASEC', 'fecha_hora': FECHA}
    fixtures = {'revelar-riasec-plano': _pedir(cliente, 'POST', '/acciones/revelar-resultado', accion)}
    fixtures['resultado-riasec-plano'] = _pedir(cliente, 'GET', f'{luis}/instrumentos/TEST-RIASEC/resultado')
    fixtures['historial-riasec-plano'] = _pedir(cliente, 'GET', f'{luis}/instrumentos/TEST-RIASEC/historial')
    fixtures['referencias-t-contraste-plano'] = _pedir(cliente, 'GET', f'{luis}/actividades/t-contraste/referencias')
    fixtures['reiniciar-riasec'] = _pedir(cliente, 'POST', '/acciones/reiniciar-instrumento', accion)
    fixtures['referencias-t-contraste-reiniciado'] = _pedir(
        cliente, 'GET', f'{luis}/actividades/t-contraste/referencias')
    fixtures['avance-instrumentos-reiniciado'] = _pedir(cliente, 'GET', f'{luis}/instrumentos')
    # Con el reinicio usado, el historial trae el resultado anulado con perfil plano.
    fixtures['historial-riasec'] = _pedir(cliente, 'GET', f'{luis}/instrumentos/TEST-RIASEC/historial')
    return fixtures


def _recorrer_apoderado(cliente):
    ruta, secciones = '/cuentas/apo-rosa/actividades', '/cuentas/apo-rosa/secciones'
    fixtures = {'apoderado-actividades-inicial': _pedir(cliente, 'GET', ruta),
                'apoderado-secciones-inicial': _pedir(cliente, 'GET', secciones),
                # F08: las fichas del apoderado, bloqueadas con la actividad que las da.
                'apoderado-fichas-inicial': _pedir(cliente, 'GET', '/cuentas/apo-rosa/fichas'),
                'apoderado-familia-inicial': _pedir(cliente, 'GET', '/cuentas/apo-rosa/familia')}
    # F03: sin el diploma, los resultados del hijo responden 409 con su mensaje.
    sin_diploma = cliente.request('GET', '/cuentas/apo-rosa/familia/resultados')
    if sin_diploma.status_code != 409:
        raise RuntimeError(f'Los resultados sin diploma respondieron {sin_diploma.status_code}')
    fixtures['familia-resultados-sin-diploma'] = sin_diploma.json()
    # F08: la respuesta de completar cada actividad y la ruta a mitad de camino (t-apo-2 abierta).
    fixtures['apoderado-completar-t-apo-1'] = _completar(cliente, 't-apo-1', 'apo-rosa')
    fixtures['apoderado-actividades-mitad'] = _pedir(cliente, 'GET', ruta)
    fixtures['apoderado-familia-mitad'] = _pedir(cliente, 'GET', '/cuentas/apo-rosa/familia')
    fixtures['apoderado-completar-t-apo-2'] = _completar(cliente, 't-apo-2', 'apo-rosa')
    fixtures['apoderado-actividades-final'] = _pedir(cliente, 'GET', ruta)
    fixtures['apoderado-secciones-final'] = _pedir(cliente, 'GET', secciones)
    fixtures['apoderado-fichas-final'] = _pedir(cliente, 'GET', '/cuentas/apo-rosa/fichas')
    fixtures['apoderado-ficha-t-ficha-apo'] = _pedir(cliente, 'GET', '/cuentas/apo-rosa/fichas/t-ficha-apo')
    # B12: avance, diploma e hijos (con sus cuestionarios); resultados visibles del hijo. F08: conversaciones en cada estado y regalo.
    fixtures['familia'] = _pedir(cliente, 'GET', '/cuentas/apo-rosa/familia')
    fixtures['familia-resultados'] = _pedir(cliente, 'GET', '/cuentas/apo-rosa/familia/resultados')
    # Ajuste inicio-apoderado: los resultados del segundo hijo (Luis), elegido con `?estudiante=`.
    fixtures['familia-resultados-luis'] = _pedir(
        cliente, 'GET', '/cuentas/apo-rosa/familia/resultados?estudiante=est-luis')
    fixtures['conversaciones-sin-carta'] = _pedir(cliente, 'GET', '/cuentas/apo-rosa/conversaciones')
    fixtures['conversaciones-estudiante-sin-carta'] = _pedir(cliente, 'GET', '/cuentas/est-ana/conversaciones')
    for cuenta in ('est-ana', 'apo-rosa'):
        fixtures[f'escribir-carta-{cuenta}'] = _pedir(cliente, 'POST', '/acciones/escribir-carta', {
            'cuenta': cuenta, 'texto': f'DATO DE PRUEBA: carta de {cuenta}.', 'fecha_hora': FECHA})
    # El segundo hijo (Luis), todavía sin carta de su madre.
    fixtures['apoderado-conversaciones-sin-carta'] = _pedir(
        cliente, 'GET', '/cuentas/apo-rosa/conversaciones?estudiante=est-luis')
    fixtures['conversaciones-estudiante-carta'] = _pedir(cliente, 'GET', '/cuentas/est-ana/conversaciones')
    conversacion = {'conversacion': 't-conv-1', 'fecha_hora': FECHA}
    fixtures['responder-conversacion'] = _pedir(cliente, 'POST', '/acciones/responder-conversacion', {
        **conversacion, 'cuenta': 'est-ana', 'texto': 'DATO DE PRUEBA: quiero estudiar psicología.'})
    fixtures['conversaciones-te-toca'] = _pedir(cliente, 'GET', '/cuentas/apo-rosa/conversaciones')
    fixtures['conversaciones-esperando'] = _pedir(cliente, 'GET', '/cuentas/est-ana/conversaciones')
    fixtures['responder-conversacion-segundo'] = _pedir(cliente, 'POST', '/acciones/responder-conversacion', {
        **conversacion, 'cuenta': 'apo-rosa', 'estudiante': 'est-ana',
        'texto': 'DATO DE PRUEBA: que elija lo que le guste.'})
    fixtures['conversaciones-conversada'] = _pedir(cliente, 'GET', '/cuentas/est-ana/conversaciones')
    fixtures['conversaciones-apoderado-conversada'] = _pedir(cliente, 'GET', '/cuentas/apo-rosa/conversaciones')
    # t-contraste habilita al estudiante la segunda conversación.
    _responder_registro(cliente, 't-contraste')
    conversacion['conversacion'] = 't-conv-2'
    for cuenta in ('est-ana', 'apo-rosa'):
        _pedir(cliente, 'POST', '/acciones/responder-conversacion', {
            **conversacion, 'cuenta': cuenta, 'texto': 'DATO DE PRUEBA: lo que dijo el resultado.'})
    fixtures['conversaciones-final'] = _pedir(cliente, 'GET', '/cuentas/est-ana/conversaciones')
    fixtures['conversaciones-apoderado-final'] = _pedir(cliente, 'GET', '/cuentas/apo-rosa/conversaciones')
    return fixtures


def _recorrer_planes_luis(cliente):
    """F07a: con est-luis (para no mover los planes de est-ana), dos planes de la misma familia, una sección
    bloqueada, un «por qué» corto en proceso, ordenar y eliminar. La carrera hermana es la de menor código de la
    familia de Psicología en el catálogo real."""
    luis, cuenta = '/cuentas/est-luis', {'cuenta': 'est-luis', 'fecha_hora': FECHA}
    familia = _pedir(cliente, 'GET', f'{luis}/catalogo/carreras/{PSICOLOGIA}')['familia']['codigo']
    pagina = _pedir(cliente, 'GET', f'{luis}/catalogo/carreras?familia={familia}&limite=50')
    hermana = min(c['codigo'] for c in pagina['items'] if c['codigo'] != PSICOLOGIA)
    for carrera in (PSICOLOGIA, hermana):
        _pedir(cliente, 'POST', '/acciones/marcar-favorito', {**cuenta, 'tipo': 'CARRERA', 'codigo': carrera})
        _pedir(cliente, 'POST', '/acciones/planes/crear', {**cuenta, 'carrera': carrera})
    _pedir(cliente, 'POST', '/acciones/planes/guardar-seccion', {**cuenta, 'carrera': PSICOLOGIA, 'seccion': 'POR_QUE',
           'datos': {'idea_origen': 'TEST', 'motivos': [{'opcion': 'AYUDAR'}], 'relato': 'DATO DE PRUEBA: corto.'}})
    bloqueada = cliente.request('POST', '/acciones/planes/guardar-seccion', json={
        **cuenta, 'carrera': PSICOLOGIA, 'seccion': 'REALIDAD', 'datos': {}})
    if bloqueada.status_code != 409:
        raise RuntimeError(f'Guardar una sección bloqueada respondió {bloqueada.status_code}')
    fixtures = {'guardar-seccion-bloqueada': bloqueada.json(),
                'planes-misma-familia': _pedir(cliente, 'GET', f'{luis}/planes')}
    fixtures['ordenar-planes'] = _pedir(cliente, 'POST', '/acciones/planes/ordenar', {
        **cuenta, 'carreras': [hermana, PSICOLOGIA]})
    fixtures['eliminar-plan'] = _pedir(cliente, 'POST', '/acciones/planes/eliminar', {**cuenta, 'carrera': hermana})
    fixtures['planes-tras-eliminar'] = _pedir(cliente, 'GET', f'{luis}/planes')
    return fixtures


def _recorrer_inesperada(cliente):
    """F06 · HU-042: al final, para no cambiar los logros ni el avance ya exportados. La elección es al azar
    entre las no vistas; con el catálogo real se elige la de menor código, para que el fixture sea siempre el mismo."""
    from unittest.mock import patch

    from app.services import catalogo as servicio_catalogo
    for carrera in (ENFERMERIA, ING_AMBIENTAL, PERIODISMO, PSICOLOGIA):
        _pedir(cliente, 'POST', '/acciones/ver-carrera', {'cuenta': 'est-ana', 'carrera': carrera, 'fecha_hora': FECHA})
    with patch.object(servicio_catalogo.random, 'choice', min):
        return {'catalogo-inesperada': _pedir(
            cliente, 'GET', f'/cuentas/est-ana/catalogo/carreras/inesperada?excluir={PSICOLOGIA}')}


def _recorrer_investigaciones(cliente):
    """B13: al final, para no cambiar lo ya exportado. Ana y Luis investigan la misma ocupación; Ana publica sola,
    Luis reacciona y la marca, y la orientadora comenta y la destaca. Los códigos (`ENT-`, `SUG-`, `REA-`…) salen de
    `uuid4`: aquí se fijan con un contador, para que los fixtures sean siempre los mismos."""
    from itertools import count
    from types import SimpleNamespace
    from unittest.mock import patch

    from app.services.investigaciones import acciones, orientadora, sugerencias
    numeros = count(1)

    def uuid_fijo():
        return SimpleNamespace(hex=f'{next(numeros):032x}')

    with patch.object(acciones, 'uuid4', uuid_fijo), patch.object(orientadora, 'uuid4', uuid_fijo), \
            patch.object(sugerencias, 'uuid4', uuid_fijo):
        return _recorrido_investigaciones(cliente)


def _recorrido_investigaciones(cliente):
    pienso = {'ocupacion': 'electrician', 'dia': 'DATO DE PRUEBA: revisa instalaciones de casas y edificios.',
              'necesita': 'DATO DE PRUEBA: estudiar en un instituto y practicar.', 'duda': '¿Es peligroso?'}

    def accion(nombre, datos, cuenta='est-ana'):
        return _pedir(cliente, 'POST', f'/acciones/{nombre}', {'cuenta': cuenta, 'fecha_hora': FECHA, **datos})

    fixtures = {}
    for cuenta in ('est-ana', 'est-luis'):
        _completar(cliente, 't-investigador', cuenta)
    fixtures['investigaciones-inicial'] = _pedir(cliente, 'GET', '/cuentas/est-ana/investigaciones')
    for cuenta in ('est-luis', 'est-ana'):
        accion('guardar-lo-que-pienso', pienso, cuenta)
    sugerencias = fixtures['sugerencias-guion'] = accion('pedir-sugerencias-guion', {})
    fixtures['investigaciones-en-curso'] = _pedir(cliente, 'GET', '/cuentas/est-ana/investigaciones')
    sugerida = sugerencias['sugerencias'][0]
    accion('guardar-guion', {'terminar': True, 'preguntas': [
        {'origen': 'DUDA', 'texto': pienso['duda']},
        {'origen': 'SUGERIDA', 'texto': sugerida['texto'], 'sugerencia': sugerida['codigo']}]})
    accion('guardar-guion', {'terminar': True, 'preguntas': [{'origen': 'DUDA', 'texto': pienso['duda']}]}, 'est-luis')
    fixtures['investigaciones-guia-lista'] = _pedir(cliente, 'GET', '/cuentas/est-ana/investigaciones')
    publicada = fixtures['publicar-entrevista'] = accion('publicar-entrevista', {
        'titulo': 'DATO DE PRUEBA: un día con un electricista', 'profesional': 'DATO DE PRUEBA: Rosa Quispe',
        'duracion': '20 minutos', 'enlace': 'https://youtu.be/dQw4w9WgXcQ',
        'resumen': 'DATO DE PRUEBA: nos contó cómo empezó y qué cuidados toma.', 'coautores': [], 'permiso': True})
    codigo = publicada['por_cuenta']['est-ana']['eventos_registrados'][0]['referencia']
    accion('ver-entrevista', {'entrevista': codigo}, 'est-luis')
    accion('reaccionar-entrevista', {'entrevista': codigo, 'tipo': 'APRENDI',
                                     'comentario': 'DATO DE PRUEBA: aprendí que siempre se corta la luz.'}, 'est-luis')
    accion('marcar-favorito', {'tipo': 'ENTREVISTA', 'codigo': codigo}, 'est-luis')
    accion('comentar-entrevista', {'entrevista': codigo, 'texto': 'DATO DE PRUEBA: muy buena conversación.'},
           'ori-carmen')
    accion('destacar-entrevista', {'entrevista': codigo, 'destacada': True}, 'ori-carmen')
    de_luis = next(r['codigo'] for r in _pedir(cliente, 'GET', f'/cuentas/est-ana/entrevistas/{codigo}')[
        'lista_reacciones'] if r['autor']['codigo'] == 'est-luis')
    accion('reportar', {'reaccion': de_luis, 'motivo': 'OFENSIVO'})
    fixtures['investigaciones-luis'] = _pedir(cliente, 'GET', '/cuentas/est-luis/investigaciones')
    fixtures['entrevistas-ocupacion'] = _pedir(
        cliente, 'GET', '/cuentas/est-luis/entrevistas?vista=SALON&ocupacion=electrician')
    fixtures['entrevista-detalle-propia'] = _pedir(cliente, 'GET', f'/cuentas/est-ana/entrevistas/{codigo}')
    fixtures['entrevistas-salon'] = _pedir(cliente, 'GET', '/cuentas/est-luis/entrevistas?vista=SALON')
    fixtures['entrevistas-mias'] = _pedir(cliente, 'GET', '/cuentas/est-ana/entrevistas?vista=MIAS')
    fixtures['entrevista-detalle'] = _pedir(cliente, 'GET', f'/cuentas/est-luis/entrevistas/{codigo}')
    fixtures['publicaciones'] = _pedir(cliente, 'GET', '/cuentas/ori-carmen/publicaciones')
    fixtures['publicacion-detalle'] = _pedir(cliente, 'GET', f'/cuentas/ori-carmen/publicaciones/{codigo}')
    fixtures['referencias-investigador-cierre'] = _pedir(
        cliente, 'GET', '/cuentas/est-ana/actividades/t-investigador-cierre/referencias')
    return fixtures


def _codigos_notificacion_fijos():
    """Ajuste notificaciones: los códigos `NOT-` salen de `uuid4`; se fijan con su propio contador (no el de
    investigaciones, para no mover sus códigos)."""
    from itertools import count
    from types import SimpleNamespace
    from unittest.mock import patch

    from app.services import notificaciones
    numeros = count(1)
    return patch.object(notificaciones, 'uuid4', lambda: SimpleNamespace(hex=f'{next(numeros):032x}'))


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
                with TestClient(aplicacion) as cliente_http, _codigos_notificacion_fijos():
                    cliente = _ClienteConSesion(cliente_http)
                    fixtures = _ingresar(cliente)
                    fixtures.update(_recorrer(cliente))
                    fixtures.update(_recorrer_perfil_plano(cliente))
                    fixtures.update(_recorrer_planes_luis(cliente))
                    fixtures.update(_recorrer_apoderado(cliente))
                    fixtures.update(_recorrer_inesperada(cliente))
                    fixtures.update(_recorrer_investigaciones(cliente))
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
