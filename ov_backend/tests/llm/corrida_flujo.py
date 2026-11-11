"""Corrida corta del flujo de registros con Haiku real (ajuste registros llm, lote 3, §11). No es pytest.

Un estudiante de prueba recorre el camino de `contenido` en una base temporal y responde los 12 registros requeridos
(22 ítems) por los mismos servicios que usan los endpoints (TestClient sobre `crear_aplicacion`): con la repregunta
respondida en algunos ítems y saltada en otros, ediciones y un cambio de Plan A que deja un eco cambiado. Los casos de
regresión van dentro del recorrido: el estudiante tiene el contexto que tenían en el runner (Plan A, piezas, ecos).

    uv run python tests/llm/corrida_flujo.py --mostrar   # las respuestas y las llamadas estimadas; no llama
    uv run python tests/llm/corrida_flujo.py --seco      # el recorrido con el cliente de prueba (sin red)
    uv run python tests/llm/corrida_flujo.py --correr    # con Haiku real (ANTHROPIC_API_KEY del .env del backend)

Con `--correr` escribe el informe en `tests/llm/resultados/flujo/` (en seco solo lo imprime). Los textos son DATO DE PRUEBA.
"""

import argparse
import sys
from datetime import datetime
from pathlib import Path
from tempfile import TemporaryDirectory

RAIZ = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(RAIZ), str(RAIZ / 'tests' / 'soporte')]

from sqlalchemy import select, update  # noqa: E402

from app import models as m  # noqa: E402
from app.config import cargar_configuracion  # noqa: E402
from app.main import crear_aplicacion  # noqa: E402
from app.services.registro.llm import ClienteClaude  # noqa: E402
from datos.cargar import preparar_base  # noqa: E402

RESULTADOS = Path(__file__).resolve().parent / 'resultados' / 'flujo'
FIN = 'b5-3'

# DATO DE PRUEBA: las carreras del estudiante. Plan A Ingeniería Industrial y Plan B Odontología (los Plan A de R3 y
# R14 de b4-1 v7.8e); la opción inicial es Medicina (b5-3 v7.12 #17).
PLAN_A, PLAN_B, INICIAL = 'ingenieria industrial', 'odontologia', 'medicina'

# DATO DE PRUEBA: {ítem: [(opciones, texto, seguimiento o None, caso de regresión o None, esperado o None)]}. Más de
# una entrada en un ítem es una edición. `opciones` None: la elección mínima; ('PIEZA', código): la pieza ofrecida.
RECORRIDO = {
    'b1-1-gustos': [(None, 'jugar fútbol', 'jugaba de arquero en la canchita de mi barrio con mis primos', None,
                     None)],
    'b1-1-logro': [([{'codigo': 'ORGANIZAR'}], 'En tercero organicé la colecta para un compañero que se quemó la mano '
                    'y juntamos 400 soles', None, None, None)],
    'b1-1-dificultad': [(None, 'Me jalaron en matemática en segundo y me quedé en las tardes con una profesora hasta '
                         'que entendí', None, None, None)],
    'b1-3-voz': [([{'codigo': 'PAPA'}], 'Que me quede en Arequipa y entre a la UNSA', None, None, None)],
    'b1-3-mia': [([{'codigo': 'UNIVERSIDAD'}], 'Quiero irme a Lima porque allá está lo que quiero estudiar', None, None,
                  None)],
    'b1-3-contraste': [([{'codigo': 'CHOCAN'}], 'Chocamos bastante', 'En que ella quiere que me quede en Arequipa',
                        'b1-3 v7.2c #16', 'general → conjunto propio → final propio')],
    'b1-6-mito': [([{'codigo': 'PADRES_SABEN'}], 'Mi tía lo repite en cada reunión, dice que los papás ven lo que uno '
                   'no ve', None, None, None)],
    'b1-7-dia': [([{'codigo': 'CLARO'}], 'Me despierto temprano, voy a una planta y reviso que las máquinas no se '
                  'paren', 'Estoy en Arequipa, en una fábrica de cemento, con casco y una tablet', None, None)],
    'b1-7-hito': [(None, 'Estaré en la academia preparándome para el examen de admisión', None, None, None)],
    'b1-7-freno': [(None, 'Que no alcance la plata para la academia', None, None, None)],
    'b2-3-valores': [([{'codigo': 'ESTABILIDAD'}, {'codigo': 'INGRESOS'}, {'codigo': 'APRENDER'}],
                      'Porque en mi casa hubo años en que mi papá no tenía trabajo fijo y era difícil', None, None,
                      None)],
    'b2-4-bien': [([{'codigo': 'MATEMATICA'}, {'codigo': 'COMPUTACION'}, {'codigo': 'ORGANIZAR'}],
                   'Saco 18 en los exámenes y mis compañeros me piden que les explique', None, None, None)],
    'b2-4-cuesta': [([{'codigo': 'COMUNICACION'}], 'Redactar ensayos largos, me trabo al ordenar las ideas', None,
                     None, None)],
    'b2-4-cruce': [([{'codigo': 'SI'}], 'Me gusta que cada problema tiene una respuesta y puedo comprobarla', None,
                    None, None)],
    'b3-4-necesito': [(None, 'los sueldos', None, None, None)],
    'b3-4-quien': [([{'codigo': 'OTRO_FAMILIAR'}], 'Mi tío es ingeniero en una minera y sabe cómo es el trabajo de '
                    'verdad', None, None, None)],
    'b4-1-respalda': [(('PIEZA', 'BIEN-1'), 'Se llevan cálculo y estadística desde el primer ciclo', None,
                       'b4-1-respalda v7.8e R3', 'propio')],
    'b4-1-menos': [(('PIEZA', 'HAB-LID'), 'En la industrial casi todo es con máquinas y números, no tanto organizar '
                    'gente', None, 'pieza con frase nueva (liderazgo)', 'sin esperado: revisar a mano')],
    'b4-2-estilo': [([{'codigo': 'PREGUNTO'}], 'Cuando tuve que elegir entre el taller de robótica y el de teatro, '
                     'pregunté a los que ya estaban y probé una clase de cada uno', None, None, None)],
    'b4-5-moneda': [([{'codigo': 'TAMBIEN'}], 'Me harían falta los números y las máquinas, en odontología casi todo '
                     'es con pacientes', None, None, None)],
    'b5-1-seguridad': [
        ([{'codigo': 'BASTANTE'}], 'Voy a buscar universidades', None, 'b5-1 «Voy a buscar universidades»',
         'fuera_de_tema'),
        ([{'codigo': 'BASTANTE'}], 'Porque me fascina la carrera', None, 'b5-1 «Porque me fascina la carrera»',
         'propio')],
    'b5-3-cambio': [
        (('PIEZA', 'INI-OPCION'), 'Ahora quiero ser chef', None, 'b5-3 v7.12 #17 (frase + pregunta)',
         'general, con la forma (1): frase que lo retoma y la pregunta'),
        (('PIEZA', 'INI-MITO'), 'Ya no creo eso', None, 'b5-3 v7.12 #20 (la base)', 'general, con la base'),
        ([{'codigo': 'IGUAL'}], 'Sigo en las mismas, sin saber', None, 'b5-3 v7.12 #37 (siga igual)',
         'general: «¿Qué crees que hizo que siga igual…?»')],
}
# Después del recorrido: el Plan B pasa a Plan A y se edita b4-1-respalda con R14 (b4-1-menos y b5-1 quedan con eco
# cambiado).
DESPUES = {'b4-1-respalda': [(('PIEZA', 'VAL-1'), 'La verdad la eligió mi mamá, yo no sé', None,
                              'b4-1-respalda v7.8e R14', 'no_sabe')]}
ACTIVIDAD = {item: item.rsplit('-', 1)[0] for item in [*RECORRIDO, *DESPUES]}
CON_REPREGUNTA = ('general', 'no_sabe', 'vacio', 'fuera_de_tema')


class Contador:
    """Cuenta las llamadas al LLM real."""

    def __init__(self, cliente):
        self.cliente, self.llamadas = cliente, 0
        self.modelo = cliente.modelo

    def llamar(self, sistema, mensaje, esquema):
        self.llamadas += 1
        return self.cliente.llamar(sistema, mensaje, esquema)


def estimar():
    # b2-4-cuesta no lleva tarjeta: no llama.
    primeras = sum(len(v) for v in RECORRIDO.values()) + sum(len(v) for v in DESPUES.values()) - 1
    seguimientos = sum(1 for v in RECORRIDO.values() for e in v if e[2])
    return primeras, seguimientos


def mostrar():
    print('# Respuestas del recorrido (DATO DE PRUEBA)\n')
    for etapa, datos in (('recorrido', RECORRIDO), ('tras pasar el Plan B a Plan A', DESPUES)):
        print(f'## {etapa}\n')
        for item, entradas in datos.items():
            for n, (opciones, texto, seguimiento, caso, esperado) in enumerate(entradas):
                marca = ' (edición)' if n else ''
                eleccion = opciones[1] if isinstance(opciones, tuple) else (
                    ', '.join(o['codigo'] for o in opciones) if opciones else '—')
                print(f'- **{item}**{marca} · {eleccion} · «{texto}»')
                if seguimiento:
                    print(f'  - si hay repregunta: «{seguimiento}»')
                if caso:
                    print(f'  - regresión: {caso} → {esperado}')
        print()
    primeras, seguimientos = estimar()
    print(f'Llamadas: {primeras} primeras respuestas + hasta {seguimientos} seguimientos = hasta '
          f'{primeras + seguimientos}.')


def pedir(cliente, metodo, ruta, datos=None):
    respuesta = cliente.request(metodo, ruta, json=datos)
    if respuesta.status_code != 200:
        raise RuntimeError(f'{metodo} {ruta}: {respuesta.status_code} {respuesta.text}')
    return respuesta.json()


def carrera(sesion, nombre):
    filas = sesion.execute(select(m.Carrera.codigo, m.Carrera.nombre).where(
        m.Carrera.busqueda.contains(nombre))).all()
    exacta = [f for f in filas if f.nombre.lower().replace('í', 'i').replace('ó', 'o') == nombre]
    return (exacta or sorted(filas, key=lambda f: len(f.nombre)))[0]


def institucion_de(sesion, codigo_carrera):
    return sesion.scalar(select(m.Institucion.codigo).join(
        m.InstitucionCarrera, m.InstitucionCarrera.institucion_id == m.Institucion.id).join(
        m.Carrera, m.Carrera.id == m.InstitucionCarrera.carrera_id).where(m.Carrera.codigo == codigo_carrera).limit(1))


def intento(sesion, item):
    return sesion.scalar(select(m.RespuestaRegistro).join(m.ItemRegistro).where(
        m.ItemRegistro.codigo == item, m.RespuestaRegistro.vigente).execution_options(populate_existing=True))


def elegir(registro, item, opciones):
    import soporte_ruta
    datos = next(i for i in registro['items'] if i['codigo'] == item)
    if opciones is None:
        return soporte_ruta.eleccion_minima(datos)
    if isinstance(opciones, tuple):
        pieza = next((o for o in datos['opciones'] if o['codigo'] == opciones[1]), None)
        if pieza is None:
            raise RuntimeError(f"{item}: no se ofrece {opciones[1]} ({[o['codigo'] for o in datos['opciones']]})")
        return [{'codigo': pieza['codigo'], 'texto': pieza['texto']}]
    return opciones


def responder(cliente, fabrica, filas, item, entrada, edicion):
    from soporte_ruta import FECHA
    opciones, texto, seguimiento, caso, esperado = entrada
    actividad = ACTIVIDAD[item]
    registro = pedir(cliente, 'GET', f'/cuentas/est-ana/actividades/{actividad}/registro')
    elegidas = elegir(registro, item, opciones)
    paso = pedir(cliente, 'POST', '/acciones/registro/responder', {
        'cuenta': 'est-ana', 'actividad': actividad, 'item': item, 'opciones': elegidas, 'texto': texto,
        'fecha_hora': FECHA})
    with fabrica() as sesion:
        primera = intento(sesion, item)
        fila = dict(item=item, accion='edición' if edicion else 'primera', eleccion=' + '.join(
            e['texto'] for e in primera.opciones_elegidas or ()) or '—', texto=texto, paso=paso['paso'], tipo=primera.primera_tipo,
            sensible=primera.sensible, estado=primera.estado.value, repregunta=paso.get('repregunta'),
            mensaje=paso.get('mensaje'), caso=caso, esperado=esperado,
            mensaje_llm=None)
    filas.append(fila)
    if paso['paso'] == 'REPREGUNTA' and seguimiento:
        segundo = pedir(cliente, 'POST', '/acciones/registro/responder-seguimiento', {
            'cuenta': 'est-ana', 'actividad': actividad, 'item': item, 'texto': seguimiento, 'fecha_hora': FECHA})
        with fabrica() as sesion:
            final = intento(sesion, item)
            filas.append(dict(item=item, accion='seguimiento', eleccion='', texto=seguimiento, paso=segundo['paso'],
                              tipo=final.conjunto_tipo, sensible=final.sensible, estado=final.estado.value,
                              repregunta=None, mensaje=segundo.get('mensaje'), linea=final.linea_registro,
                              caso=caso, esperado=esperado, final=final.tipo_final))


def cerrar_registros(cliente, fabrica, filas, actividad):
    """Responde los ítems de un registro con lo de RECORRIDO, en su orden, y lo termina."""
    from soporte_ruta import FECHA
    registro = pedir(cliente, 'GET', f'/cuentas/est-ana/actividades/{actividad}/registro')
    for datos in registro['items']:
        for n, entrada in enumerate(RECORRIDO[datos['codigo']]):
            responder(cliente, fabrica, filas, datos['codigo'], entrada, n > 0)
    return pedir(cliente, 'POST', '/acciones/registro/entregar', {'cuenta': 'est-ana', 'actividad': actividad,
                                                                  'fecha_hora': FECHA})


def recorrer(aplicacion, cliente, filas):
    import soporte_contenido
    import soporte_planes
    from soporte_ruta import FECHA, responder as responder_items, revelar
    fabrica = aplicacion.state.fabrica_sesiones
    with fabrica.begin() as sesion:
        plan_a, plan_b, inicial = (carrera(sesion, n) for n in (PLAN_A, PLAN_B, INICIAL))
        # DATO DE PRUEBA: la opción inicial que, en la plataforma, deja el primer plan creado antes del bloque inicial.
        sesion.execute(update(m.Cuenta).where(m.Cuenta.codigo == 'est-ana').values(
            opcion_inicial_id=select(m.Carrera.id).where(m.Carrera.codigo == inicial.codigo).scalar_subquery()))
        instituciones = {c.codigo: institucion_de(sesion, c.codigo) for c in (plan_a, plan_b)}
    registros = {item.rsplit('-', 1)[0] for item in RECORRIDO}
    for codigo in soporte_contenido.REQUERIDAS[:soporte_contenido.REQUERIDAS.index(FIN) + 1]:
        if codigo == 'b3-10':
            soporte_contenido.revelar_para_b4(cliente)
        if codigo == 'b4-1':
            # Habilidades sociales con todas las respuestas iguales: todas destacadas (también liderazgo).
            for parte in range(1, 5):
                responder_items(cliente, f'h-habilidades-{parte}', opcion=1)
                pedir(cliente, 'POST', '/acciones/completar-actividad',
                      {'cuenta': 'est-ana', 'actividad': f'h-habilidades-{parte}', 'fecha_hora': FECHA})
            revelar(cliente, instrumento='TEST-HABILIDADES', aplicacion='APL-HABILIDADES')
        if codigo in registros:
            cerrar_registros(cliente, fabrica, filas, codigo)
        else:
            soporte_contenido.completar(cliente, codigo)
        if codigo == 'b3-8':
            for c in (plan_a, plan_b):
                soporte_planes.crear(cliente, c.codigo)
                soporte_planes.guardar(cliente, c.codigo, 'POR_QUE', soporte_planes.por_que_lista())
                soporte_planes.guardar(cliente, c.codigo, 'REALIDAD',
                                       soporte_planes.realidad_lista(institucion=instituciones[c.codigo]))
        if codigo == 'b4-5':
            soporte_planes.guardar(cliente, plan_a.codigo, 'PASOS', {'pasos': [
                {'tipo': 'conversar', 'texto': 'Hablar con un ingeniero de planta.'}]})
    pedir(cliente, 'POST', '/acciones/planes/ordenar', {'cuenta': 'est-ana', 'carreras': [plan_b.codigo, plan_a.codigo],
                                                        'fecha_hora': FECHA})
    for item, entradas in DESPUES.items():
        for entrada in entradas:
            responder(cliente, fabrica, filas, item, entrada, True)
    return plan_a, plan_b, inicial


def contradice(fila):
    if fila['estado'] == 'SIN_EVALUAR' or fila['sensible'] or fila['tipo'] == 'emocional':
        return fila['paso'] != 'MENSAJE'
    if fila['accion'] == 'seguimiento':
        return fila['paso'] != 'SIGUIENTE'
    return fila['paso'] != ('REPREGUNTA' if fila['tipo'] in CON_REPREGUNTA else 'SIGUIENTE')


def informe(cliente, aplicacion, filas, carreras, modo, llamadas):
    plan_a, plan_b, inicial = carreras
    lineas = [f'# Corrida corta del flujo de registros · {modo}', '',
              f'{datetime.now():%Y-%m-%d %H:%M} · llamadas al LLM: {llamadas} · Plan A {plan_a.nombre} '
              f'(después {plan_b.nombre}) · opción inicial {inicial.nombre}', '',
              '## Por ítem', '', '| Ítem | Acción | Elección | Texto | Paso | Tipo | Repregunta o mensaje | Línea |',
              '|---|---|---|---|---|---|---|---|']
    for f in filas:
        tipo = f"{f['tipo']}{' · sensible' if f['sensible'] else ''}" + (f" → final {f['final']}" if f.get('final') else '')
        lineas.append(f"| {f['item']} | {f['accion']} | {f['eleccion']} | {f['texto']} | {f['paso']} | {tipo} | "
                      f"{f['repregunta'] or f['mensaje'] or '—'} | {f.get('linea') or '—'} |")
    lineas += ['', '## Regresión', '', '| Caso | Esperado | Obtenido |', '|---|---|---|']
    for f in filas:
        if f['caso'] and (f['accion'] != 'primera' or not any(
                g['caso'] == f['caso'] and g['accion'] == 'seguimiento' for g in filas)):
            obtenido = f"{f['tipo']}" + (f" → final {f['final']}" if f.get('final') else '') + (
                f" · «{f['repregunta']}»" if f['repregunta'] else '')
            lineas.append(f"| {f['caso']} | {f['esperado']} | {obtenido} |")
    malos = [f for f in filas if contradice(f)]
    lineas += ['', f"## Pasos que contradicen al tipo: {len(malos)}", '']
    lineas += [f"- {f['item']} ({f['accion']}): {f['paso']} con {f['tipo']}" for f in malos]
    lineas += ['', '## Lo que queda citable en las actividades siguientes', '']
    with aplicacion.state.fabrica_sesiones() as sesion:
        for item in RECORRIDO:
            vigente = intento(sesion, item)
            lineas.append(f"- {item}: {vigente.texto_citable or '—'}")
    for actividad, item in (('b4-1', 'b4-1-respalda'), ('b4-1', 'b4-1-menos'), ('b5-3', 'b5-3-cambio'),
                            ('b2-4', 'b2-4-cruce')):
        datos = next(i for i in pedir(cliente, 'GET', f'/cuentas/est-ana/actividades/{actividad}/registro')['items']
                     if i['codigo'] == item)
        lineas.append(f"\n**{item}** · consigna: {datos['consigna'] and datos['consigna']['pregunta_texto']}")
        lineas += [f"- {o['codigo']}: {o['texto']} ({o['origen'] or '—'})" for o in datos['opciones']]
    with aplicacion.state.fabrica_sesiones() as sesion:
        necesito, quien = intento(sesion, 'b3-4-necesito'), intento(sesion, 'b3-4-quien')
        lineas += ['', '## b3-4: la pista de b3-4-necesito y el eco que recibe b3-4-quien', '',
                   f'- b3-4-necesito: tipo {necesito.tipo_final}, pista guardada «{necesito.pista or "—"}», citable '
                   f'{necesito.texto_citable or "—"}',
                   f"- b3-4-quien, ecos al LLM con que se evaluó: {(quien.valores_contexto or {}).get('ecos_llm') or '—'}",
                   f"- b3-4-quien, ecos que se le muestran: {(quien.valores_contexto or {}).get('ecos_mostrar') or '—'}"]
    gusto = next((o for o in next(i for i in pedir(cliente, 'GET', '/cuentas/est-ana/actividades/b4-1/registro')['items']
                                  if i['codigo'] == 'b4-1-respalda')['opciones'] if o['codigo'] == 'GUSTO'), None)
    with aplicacion.state.fabrica_sesiones() as sesion:
        gustos = intento(sesion, 'b1-1-gustos')
    lineas += ['', '## La pieza GUSTO en b4-1', '',
               f'- b1-1-gustos: tipo final {gustos.tipo_final}, línea «{gustos.linea_registro or "—"}», citable '
               f'{gustos.texto_citable}',
               f"- GUSTO en b4-1-respalda: {gusto['texto'] if gusto else 'no se ofrece'}"]
    lineas += ['', '## Eco cambiado al final', '']
    for actividad in sorted({ACTIVIDAD[i] for i in RECORRIDO}):
        for datos in pedir(cliente, 'GET', f'/cuentas/est-ana/actividades/{actividad}/registro')['items']:
            if datos['respuesta'] and datos['respuesta']['eco_cambiado']:
                lineas.append(f"- {datos['codigo']}")
    return '\n'.join(lineas) + '\n'


def main():
    argumentos = argparse.ArgumentParser()
    modo = argumentos.add_mutually_exclusive_group(required=True)
    modo.add_argument('--mostrar', action='store_true')
    modo.add_argument('--seco', action='store_true')
    modo.add_argument('--correr', action='store_true')
    opciones = argumentos.parse_args()
    sys.stdout.reconfigure(encoding='utf-8')
    if opciones.mostrar:
        return mostrar()
    from soporte_acceso import ClienteConToken
    with TemporaryDirectory(prefix='ov-corrida-flujo-') as temporal:
        url = f'sqlite:///{(Path(temporal) / "contenido.db").as_posix()}'
        preparar_base(url, 'contenido', crear_tablas=True)
        aplicacion = crear_aplicacion(url)
        if opciones.correr:
            clave = cargar_configuracion().clave_anthropic
            if not clave:
                raise SystemExit('Falta ANTHROPIC_API_KEY en el .env del backend')
            cliente_llm = Contador(ClienteClaude(clave))
        else:
            from soporte_llm import ClientePrueba
            cliente_llm = Contador(ClientePrueba())
        aplicacion.state.cliente_llm = cliente_llm
        try:
            with ClienteConToken(aplicacion) as cliente:
                filas = []
                carreras = recorrer(aplicacion, cliente, filas)
                texto = informe(cliente, aplicacion, filas, carreras, 'Haiku real' if opciones.correr else 'en seco',
                                cliente_llm.llamadas)
        finally:
            aplicacion.state.motor_bd.dispose()
    print(texto)
    if opciones.correr:
        RESULTADOS.mkdir(parents=True, exist_ok=True)
        destino = RESULTADOS / f'{datetime.now():%Y-%m-%d_%H%M}_haiku.md'
        destino.write_text(texto, encoding='utf-8')
        print(f'Informe: {destino}')


if __name__ == '__main__':
    main()
