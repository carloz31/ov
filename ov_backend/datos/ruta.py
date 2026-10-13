"""Ruta mínima de prueba: lo justo para demostrar cada mecánica.

DATO DE PRUEBA: todo este módulo. Los códigos `t-...` nombran la mecánica que prueban.
Cada lote agrega filas en este formato; el cargador las interpreta sin lógica a medida.
La transacción pertenece al llamador; este módulo no confirma ni migra.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as modelos
from app.core.parametros import MAXIMO_ITEMS_REGISTRO
from datos import fijos
from datos.ocupaciones import validar_distribucion_items


# (código, nombre)
SALONES = (('5A', 'Quinto A'), ('5B', 'Quinto B'))

# (código, nombre, rol, salón)
CUENTAS = (('est-ana', 'Ana', 'ESTUDIANTE', '5A'), ('est-luis', 'Luis', 'ESTUDIANTE', '5A'),
           ('est-beto', 'Beto', 'ESTUDIANTE', '5B'), ('apo-rosa', 'Rosa', 'APODERADO', None),
           ('ori-carmen', 'Carmen', 'ORIENTADORA', None))

# (orientadora, salón, es principal)
ORIENTADORAS_SALONES = (('ori-carmen', '5A', True),)

# (código, estudiante, apoderado, parentesco)
VINCULOS = (('VIN-ANA', 'est-ana', 'apo-rosa', 'madre'),)

# (código, número, nombre, espacio, audiencia)
BLOQUES = (('T0', 1, 'Inicio', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('T1', 2, 'Camino', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('T2', 3, 'Decisión', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('CIUDAD', 4, 'La ciudad', 'CIUDAD', 'ESTUDIANTE'),
           ('FAMILIA', 1, 'Actividades para familias', 'PORTAL_FAMILIA', 'APODERADO'))

# (código, bloque, título, tipo, puntaje mínimo, duración estimada en minutos). El orden es el de la
# tupla dentro de cada bloque y el contenido es el código con guiones bajos.
ACTIVIDADES = (('t-inicio', 'T0', 'Inicio de prueba', 'INFORMATIVA', None, 5),
               ('t-partida', 'T0', 'Punto de partida', 'CUESTIONARIO', None, 10),
               ('t-cierre-inicio', 'T0', 'Cierre del inicio', 'INFORMATIVA', None, 5),
               ('t-expectativas', 'T1', 'Registro de expectativas', 'REGISTRO', None, 15),
               ('t-opcional', 'T1', 'Actividad opcional', 'INFORMATIVA', None, 5),
               ('t-valores', 'T1', 'Registro de valores', 'REGISTRO', None, 10),
               ('t-adicional', 'T1', 'Misión adicional', 'INFORMATIVA', None, 5),
               ('t-eco', 'T1', 'Registro que retoma respuestas', 'REGISTRO', None, 10),
               ('t-llegada', 'T2', 'Punto de llegada', 'CUESTIONARIO', None, 10),
               ('t-mision-intereses', 'CIUDAD', 'Misión de intereses', 'CUESTIONARIO', None, 10),
               ('t-mision-intereses-2', 'CIUDAD', 'Misión de intereses, segunda parte', 'CUESTIONARIO', None, 10),
               ('t-caso', 'CIUDAD', 'Caso de prueba', 'CASO', 60, 10),
               ('t-contraste', 'CIUDAD', 'Registro de contraste de intereses', 'REGISTRO', None, 10),
               ('t-apo-1', 'FAMILIA', 'Primera actividad del apoderado', 'INFORMATIVA', None, 10),
               ('t-apo-carta', 'FAMILIA', 'Carta del apoderado', 'INFORMATIVA', None, 10))

# Lo que cambia los valores por defecto (requerida, visibilidad SIEMPRE, sin descripción).
PROPIEDADES = {'t-opcional': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR',
                              'descripcion': 'Actividad opcional que aparece al desbloquearse.'},
               't-valores': {'requerida': False},
               't-eco': {'requerida': False},
               't-adicional': {'requerida': False, 'visibilidad': 'AL_DESBLOQUEAR',
                               'descripcion': 'Misión adicional que aparece si el registro quedó adecuado.'}}

# (actividad, instrumento, primer ítem, último ítem). El RIASEC va en dos misiones para probar que el
# resultado espera a todas las de su aplicación.
ITEMS_ACTIVIDADES = (('t-mision-intereses', 'TEST-RIASEC', 1, 30),
                     ('t-mision-intereses-2', 'TEST-RIASEC', 31, 60),
                     ('t-partida', 'TEST-PARTIDA-LLEGADA', 1, 19),
                     ('t-llegada', 'TEST-PARTIDA-LLEGADA', 1, 19))

# (aplicación, actividad)
APLICACIONES_ACTIVIDADES = (('APL-RIASEC', 't-mision-intereses'), ('APL-RIASEC', 't-mision-intereses-2'),
                            ('APL-PARTIDA', 't-partida'), ('APL-LLEGADA', 't-llegada'))

# (actividad, temáticas). Solo las necesarias para contar actividades completadas por dimensión (B07).
TEMATICAS_ACTIVIDADES = (('t-expectativas', ('A', 'B')), ('t-valores', ('B',)), ('t-eco', ('A',)),
                         ('t-mision-intereses', ('B',)), ('t-caso', ('C',)))

# Listas propias de una actividad: (código, nombre, ((código, texto), ...)).
LISTAS = (('t-lista-apoyos', 'Quién te apoya', (('FAMILIA', 'Mi familia'), ('DOCENTES', 'Mis docentes'),
                                                ('AMIGOS', 'Mis amigos'))),
          ('t-lista-valores', 'Valores', (('SERVIR', 'Servir a otros'), ('CREAR', 'Crear cosas nuevas'),
                                          ('ESTABILIDAD', 'Tener estabilidad'), ('RECONOCIMIENTO', 'Ser reconocido'),
                                          ('LIBERTAD', 'Tener libertad'))))

# (actividad, código, nombre, consigna, elección, criterios). El orden es el de la tupla dentro de cada
# actividad. Elección: None, (lista, mínima, máxima, ordenada, permite «otra») o, por referencia,
# ('ref', referencia ELECCION de la misma actividad, mínima, máxima, ordenada). Criterio: (código, tipo,
# descripción); la repregunta sale de `fijos.REPREGUNTAS_CRITERIO`.
ITEMS_REGISTRO = (
    ('t-expectativas', 't-exp-ruta', 'Ruta', '¿Qué te gustaría hacer al terminar el colegio y por qué?',
     ('RUTAS_DESPUES_COLEGIO', 1, 2, False, True), (('C1', 'RAZON', 'Por qué elige esa ruta'),)),
    ('t-expectativas', 't-exp-apoyo', 'Apoyo', '¿Quién te apoya en esta decisión? Cuenta un ejemplo.',
     ('t-lista-apoyos', 1, 1, False, False), (('C1', 'EJEMPLO', 'Un ejemplo concreto de apoyo'),)),
    ('t-expectativas', 't-exp-espera', 'Expectativas', '¿Qué esperan de ti las personas cercanas?', None,
     (('C1', 'EJEMPLO', 'Una expectativa concreta'), ('C2', 'RAZON', 'Por qué cree que la tienen'))),
    ('t-valores', 't-val-orden', 'Valores', 'Ordena los tres valores más importantes para ti y explica el primero.',
     ('t-lista-valores', 3, 3, True, False), (('C1', 'RAZON', 'Por qué el primero es el más importante'),)),
    ('t-valores', 't-val-libre', 'Libre', 'Escribe lo que quieras sobre tus valores.', None, ()),
    ('t-valores', 't-val-breve', 'Breve', 'Describe un momento en que actuaste según tus valores.', None, ()),
    ('t-eco', 't-eco-ruta', 'Ruta elegida', 'De las rutas que elegiste, ¿cuál te atrae más y por qué?',
     ('ref', 't-ref-rutas', 1, 1, False), (('C1', 'RAZON', 'Por qué esa ruta le atrae más'),)),
    ('t-eco', 't-eco-espera', 'Lo que esperan', 'Antes escribiste lo que esperan de ti. ¿Sigues pensando lo mismo?',
     None, ()),
    ('t-contraste', 't-con-contraste', 'Contraste',
     '¿En qué se parece tu resultado a lo que pensabas de ti? ¿En qué se diferencia?', None,
     (('C1', 'CONTRASTE', 'Compara el resultado con lo que pensaba antes'),)),
)

# Referencias: (código, (tipo de dueño, dueño), tipo, fuente). Dueño: ('ACTIVIDAD', código) o
# ('PREGUNTA_DIARIO', código). El tipo es uno de `TipoReferencia`; ELECCION y TEXTO leen un ítem de registro
# de otra actividad, y RESULTADO y COINCIDENCIAS, el resultado revelado de una aplicación.
REFERENCIAS = (('t-ref-espera', ('ACTIVIDAD', 't-eco'), 'TEXTO', 't-exp-espera'),
               ('t-ref-rutas', ('ACTIVIDAD', 't-eco'), 'ELECCION', 't-exp-ruta'),
               ('t-ref-resultado', ('ACTIVIDAD', 't-contraste'), 'RESULTADO', 'APL-RIASEC'),
               ('t-ref-coincidencias', ('ACTIVIDAD', 't-contraste'), 'COINCIDENCIAS', 'APL-RIASEC'))
FUENTE_APLICACION = ('RESULTADO', 'COINCIDENCIAS')

# Lo que cambia los valores por defecto de un ítem (obligatorio, sin longitud mínima).
PROPIEDADES_ITEMS = {'t-val-breve': {'min_caracteres': 40}}
REPREGUNTA_GENERICA = '¿Podrías contarme un poco más?'

# (código, título, contenido, audiencia)
FICHAS = (('t-ficha', 'Ficha de prueba', 'Ficha que otorga t-inicio.', 'ESTUDIANTE'),
          ('t-ficha-apo', 'Ficha del apoderado', 'Ficha que otorga t-apo-1.', 'APODERADO'))

# (código, título, tema)
CONVERSACIONES = (('t-conv-1', 'Primera conversación', 'Tema de prueba 1.'),
                  ('t-conv-2', 'Segunda conversación', 'Tema de prueba 2.'))

# (código, nombre, descripción, requisito, oculta)
INSIGNIAS = (('t-ins-1', 'Insignia de prueba', 'Completaste t-inicio.', 'Completa t-inicio.', False),
             ('t-ins-oculta', 'Insignia oculta', 'Venciste sin perder destellos.',
              'Vence al enemigo sin perder destellos.', True))

# (número, título)
NIVELES = ((1, 'Nivel 1 de prueba'), (2, 'Nivel 2 de prueba'))

# (código, tipo de objetivo, objetivo, mensaje de bloqueo, condiciones); cada condición:
# (evento, referencia, conteo, mínimo).
REGLAS = (
    ('R-t-cierre-inicio', 'ACTIVIDAD', 't-cierre-inicio', 'Completa el inicio para continuar.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-T1', 'BLOQUE', 'T1', 'Termina el bloque de inicio para abrir el camino.',
     (('COMPLETA_BLOQUE', 'T0', 'EVENTOS', 1),)),
    ('R-T2', 'BLOQUE', 'T2', 'Termina el camino y revela tu punto de partida para abrir la decisión.',
     (('COMPLETA_BLOQUE', 'T1', 'EVENTOS', 1), ('REVELA_RESULTADO', 'APL-PARTIDA', 'EVENTOS', 1))),
    ('R-t-adicional', 'ACTIVIDAD', 't-adicional', 'Desarrolla todas tus respuestas del registro de expectativas.',
     (('REGISTRO_ADECUADO', 't-expectativas', 'EVENTOS', 1),)),
    ('R-t-eco', 'ACTIVIDAD', 't-eco', 'Completa el registro de expectativas para retomarlo.',
     (('COMPLETA_ACTIVIDAD', 't-expectativas', 'EVENTOS', 1),)),
    ('R-t-opcional', 'ACTIVIDAD', 't-opcional', 'Completa el registro de expectativas.',
     (('COMPLETA_ACTIVIDAD', 't-expectativas', 'EVENTOS', 1),)),
    ('R-CIUDAD', 'BLOQUE', 'CIUDAD', 'Completa el registro de expectativas para llegar a la ciudad.',
     (('COMPLETA_ACTIVIDAD', 't-expectativas', 'EVENTOS', 1),)),
    ('R-t-mision-intereses-2', 'ACTIVIDAD', 't-mision-intereses-2', 'Completa la primera misión de intereses.',
     (('COMPLETA_ACTIVIDAD', 't-mision-intereses', 'EVENTOS', 1),)),
    ('R-t-caso', 'ACTIVIDAD', 't-caso', 'Completa las dos misiones de intereses.',
     (('COMPLETA_ACTIVIDAD', 't-mision-intereses-2', 'EVENTOS', 1),)),
    ('R-t-contraste', 'ACTIVIDAD', 't-contraste', 'Revela tu resultado de intereses para contrastarlo.',
     (('REVELA_RESULTADO', 'APL-RIASEC', 'EVENTOS', 1),)),
    ('R-t-ficha', 'FICHA', 't-ficha', 'Completa el inicio para obtener esta ficha.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-t-ficha-apo', 'FICHA', 't-ficha-apo', 'Completa tu primera actividad para obtener esta ficha.',
     (('COMPLETA_ACTIVIDAD', 't-apo-1', 'EVENTOS', 1),)),
    ('R-t-ins-1', 'INSIGNIA', 't-ins-1', 'Completa el inicio.', (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-t-ins-oculta', 'INSIGNIA', 't-ins-oculta', 'Logro oculto.',
     (('VENCE_DESAFIO_INTACTO', None, 'EVENTOS', 1),)),
    ('R-NIV-2', 'NIVEL', 2, 'Termina el bloque de inicio para subir de nivel.',
     (('COMPLETA_BLOQUE', 'T0', 'EVENTOS', 1),)),
    ('R-t-apo-carta', 'ACTIVIDAD', 't-apo-carta', 'Completa la primera actividad.',
     (('COMPLETA_ACTIVIDAD', 't-apo-1', 'EVENTOS', 1),)),
    ('R-SEC-DIARIO', 'SECCION', 'DIARIO', 'Completa el inicio para abrir tu diario.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-SEC-CATALOGO', 'SECCION', 'CATALOGO', 'Completa el inicio para abrir el catálogo.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-SEC-PLANES', 'SECCION', 'PLANES', 'Completa el inicio para abrir tus planes.',
     (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-SEC-CHECK_IN', 'SECCION', 'CHECK_IN', 'Completa el cierre del inicio para hacer tu check-in.',
     (('COMPLETA_ACTIVIDAD', 't-cierre-inicio', 'EVENTOS', 1),)),
    ('R-SEC-FAMILIA', 'SECCION', 'FAMILIA', 'Completa el registro de expectativas para abrir la sección Familia.',
     (('COMPLETA_ACTIVIDAD', 't-expectativas', 'EVENTOS', 1),)),
    ('R-SEC-CONVERSACIONES', 'SECCION', 'CONVERSACIONES', 'Completa tus actividades para conversar en familia.',
     (('COMPLETA_BLOQUE', 'FAMILIA', 'EVENTOS', 1),)),
)


def contenido(codigo: str) -> str:
    return codigo.replace('-', '_')


def _cargar_estructura(sesion):
    salones = {c: modelos.Salon(codigo=c, nombre=n) for c, n in SALONES}
    sesion.add_all(salones.values())
    sesion.flush()
    cuentas = {c: modelos.Cuenta(codigo=c, nombre=n, rol=modelos.Rol(r),
                                 salon_id=None if salon is None else salones[salon].id)
               for c, n, r, salon in CUENTAS}
    bloques = {c: modelos.Bloque(codigo=c, numero=num, nombre=n, espacio=modelos.Espacio(e),
                                audiencia=modelos.Audiencia(a)) for c, num, n, e, a in BLOQUES}
    fichas = {c: modelos.Ficha(codigo=c, titulo=t, contenido=texto, audiencia=modelos.Audiencia(a))
              for c, t, texto, a in FICHAS}
    conversaciones = [modelos.Conversacion(codigo=c, titulo=t, tema=tema) for c, t, tema in CONVERSACIONES]
    insignias = {c: modelos.Insignia(codigo=c, nombre=n, descripcion=d, requisito=r, es_oculta=o,
                                   audiencia=modelos.Audiencia.ESTUDIANTE) for c, n, d, r, o in INSIGNIAS}
    niveles = {num: modelos.Nivel(numero=num, titulo=t) for num, t in NIVELES}
    sesion.add_all([*cuentas.values(), *bloques.values(), *fichas.values(), *conversaciones,
                    *insignias.values(), *niveles.values()])
    sesion.flush()
    sesion.add_all(modelos.VinculoFamiliar(codigo=c, estudiante_id=cuentas[e].id, apoderado_id=cuentas[a].id,
                                           parentesco=p) for c, e, a, p in VINCULOS)
    sesion.add_all(modelos.OrientadoraSalon(orientadora_id=cuentas[o].id, salon_id=salones[salon].id,
                                            es_principal=p) for o, salon, p in ORIENTADORAS_SALONES)
    ordenes = {}
    actividades = {}
    for codigo, bloque, titulo, tipo, puntaje, duracion in ACTIVIDADES:
        ordenes[bloque] = ordenes.get(bloque, 0) + 1
        propiedades = PROPIEDADES.get(codigo, {})
        actividades[codigo] = modelos.Actividad(
            codigo=codigo, titulo=titulo, tipo=modelos.TipoActividad(tipo), contenido=contenido(codigo),
            orden=ordenes[bloque], bloque_id=bloques[bloque].id, puntaje_minimo=puntaje,
            duracion_estimada_min=duracion, requerida=propiedades.get('requerida', True),
            visibilidad=modelos.Visibilidad(propiedades.get('visibilidad', 'SIEMPRE')),
            descripcion=propiedades.get('descripcion'))
    sesion.add_all(actividades.values())
    sesion.flush()
    return {'BLOQUE': bloques, 'ACTIVIDAD': actividades, 'FICHA': fichas, 'INSIGNIA': insignias, 'NIVEL': niveles}


def _unir_instrumentos(sesion, actividades, base: fijos.Fijos):
    sesion.add_all(modelos.AplicacionActividad(aplicacion_id=base.aplicaciones[a].id,
                                               actividad_id=actividades[c].id)
                   for a, c in APLICACIONES_ACTIVIDADES)
    sesion.add_all(modelos.ActividadItem(actividad_id=actividades[c].id, item_id=base.items[i][numero].id,
                                         orden=orden)
                   for c, i, inicio, fin in ITEMS_ACTIVIDADES
                   for orden, numero in enumerate(range(inicio, fin + 1), start=1))


def _unir_tematicas(sesion, actividades, base: fijos.Fijos):
    for actividad, tematicas in TEMATICAS_ACTIVIDADES:
        if actividad not in actividades or any(t not in base.tematicas for t in tematicas):
            raise ValueError(f'Las temáticas de {actividad} apuntan a una actividad o temática inexistente')
    sesion.add_all(modelos.ActividadTematica(actividad_id=actividades[a].id, tematica_id=base.tematicas[t].id)
                   for a, tematicas in TEMATICAS_ACTIVIDADES for t in tematicas)


def _validar_eleccion(codigo, eleccion, listas):
    if eleccion is None or eleccion[0] == POR_REFERENCIA:
        return
    lista, minima, maxima, _, permite_otra = eleccion
    if lista not in listas:
        raise ValueError(f'El ítem {codigo} usa la lista inexistente {lista}')
    disponibles = len(listas[lista][2]) + (1 if permite_otra else 0)
    if not 0 <= minima <= maxima or not 1 <= maxima <= disponibles:
        raise ValueError(f'El ítem {codigo} tiene una elección mínima o máxima incoherente')


POR_REFERENCIA = 'ref'


def _cargar_registros(sesion, actividades, base: fijos.Fijos):
    listas = {codigo: (codigo, nombre, opciones) for codigo, nombre, opciones in (*fijos.LISTAS_COMUNES, *LISTAS)}
    cargadas = {**base.listas, **fijos.cargar_listas(sesion, LISTAS, comun=False)}
    ordenes, vistos = {}, set()
    items = {}
    for actividad, codigo, nombre, consigna, eleccion, criterios in ITEMS_REGISTRO:
        if codigo in vistos:
            raise ValueError(f'El ítem {codigo} aparece en dos actividades')
        vistos.add(codigo)
        if actividades[actividad].tipo != modelos.TipoActividad.REGISTRO:
            raise ValueError(f'El ítem {codigo} está en {actividad}, que no es de registro')
        ordenes[actividad] = ordenes.get(actividad, 0) + 1
        if ordenes[actividad] > MAXIMO_ITEMS_REGISTRO:
            raise ValueError(f'El registro {actividad} tiene más de {MAXIMO_ITEMS_REGISTRO} ítems')
        _validar_eleccion(codigo, eleccion, listas)
        referencia = None
        if eleccion is not None and eleccion[0] == POR_REFERENCIA:
            lista, otra = None, False
            _, referencia, minima, maxima, ordenada = eleccion
        else:
            lista, minima, maxima, ordenada, otra = eleccion or (None, None, None, False, False)
        propiedades = PROPIEDADES_ITEMS.get(codigo, {})
        item = modelos.ItemRegistro(
            codigo=codigo, actividad_id=actividades[actividad].id, orden=ordenes[actividad], nombre=nombre,
            consigna=consigna, min_caracteres=propiedades.get('min_caracteres'),
            obligatorio=propiedades.get('obligatorio', True),
            repregunta_generica=REPREGUNTA_GENERICA, lista_id=None if lista is None else cargadas[lista].id,
            eleccion_minima=minima, eleccion_maxima=maxima, eleccion_ordenada=ordenada, permite_otra=otra)
        items[codigo] = (item, criterios, referencia)
    referencias = _validar_referencias(sesion, actividades, items, base)
    _insertar_en_orden(sesion, items, referencias)
    sesion.add_all(modelos.CriterioCompletitud(item_registro_id=item.id, codigo=c, tipo=modelos.TipoCriterio(tipo),
                                               descripcion=d, repregunta=fijos.REPREGUNTAS_CRITERIO[tipo], orden=orden)
                   for item, criterios, _ in items.values()
                   for orden, (c, tipo, d) in enumerate(criterios, start=1))


def _validar_referencias(sesion, actividades, items, base: fijos.Fijos):
    """Valida `REFERENCIAS` y las elecciones por referencia; devuelve {código: (referencia, ítem fuente)}.

    Las referencias que leen una aplicación llevan ya su `aplicacion_id` y no tienen ítem fuente (None)."""
    instrumentos = {i.id: i for i in sesion.scalars(select(modelos.Instrumento))}
    preguntas = {p.codigo: p for p in sesion.scalars(select(modelos.PreguntaDiario))}
    referencias = {}
    for codigo, (tipo_dueno, dueno), tipo, fuente in REFERENCIAS:
        if tipo not in modelos.TipoReferencia.__members__:
            raise ValueError(f'La referencia {codigo} tiene el tipo {tipo}, fuera del catálogo')
        if tipo_dueno == 'ACTIVIDAD' and dueno in actividades:
            dueno_id = dict(actividad_id=actividades[dueno].id)
        elif tipo_dueno == 'PREGUNTA_DIARIO' and dueno in preguntas:
            dueno_id = dict(pregunta_diario_id=preguntas[dueno].id)
        else:
            raise ValueError(f'La referencia {codigo} tiene un dueño inexistente: {tipo_dueno} {dueno}')
        if tipo in FUENTE_APLICACION:
            aplicacion = base.aplicaciones.get(fuente)
            if aplicacion is None:
                raise ValueError(f'La referencia {codigo} lee la aplicación inexistente {fuente}')
            if instrumentos[aplicacion.instrumento_id].tipo_resultado == modelos.TipoResultado.COMPARACION:
                raise ValueError(f'La referencia {codigo} lee {fuente}, que no genera resultado')
            referencias[codigo] = (modelos.Referencia(codigo=codigo, tipo=modelos.TipoReferencia(tipo),
                                                      aplicacion_id=aplicacion.id, **dueno_id), None)
            continue
        if fuente not in items:
            raise ValueError(f'La referencia {codigo} lee el ítem inexistente {fuente}')
        item_fuente = items[fuente][0]
        if item_fuente.actividad_id == dueno_id.get('actividad_id'):
            raise ValueError(f'La referencia {codigo} lee un ítem de su propia actividad')
        if tipo == 'ELECCION' and item_fuente.lista_id is None:
            raise ValueError(f'La referencia {codigo} lee la elección de {fuente}, que no tiene lista')
        referencias[codigo] = (modelos.Referencia(codigo=codigo, tipo=modelos.TipoReferencia(tipo), **dueno_id),
                               fuente)
    for codigo, (item, _, referencia) in items.items():
        if referencia is None:
            continue
        if (referencia not in referencias or referencias[referencia][0].tipo != modelos.TipoReferencia.ELECCION
                or referencias[referencia][0].actividad_id != item.actividad_id):
            raise ValueError(f'El ítem {codigo} elige por {referencia}, que no es una ELECCION de su actividad')
        fuente = items[referencias[referencia][1]][0]
        if item.eleccion_minima > fuente.eleccion_minima or item.eleccion_maxima > fuente.eleccion_maxima:
            raise ValueError(f'El ítem {codigo} pide una elección mínima o máxima mayor que la de su fuente')
    return referencias


def _insertar_en_orden(sesion, items, referencias):
    """Ítems y referencias se leen entre sí: cada ronda inserta lo que ya tiene a quién apuntar."""
    items_pendientes = dict(items)
    referencias_pendientes = dict(referencias)
    while items_pendientes or referencias_pendientes:
        listos = [codigo for codigo, (_, _, referencia) in items_pendientes.items()
                  if referencia is None or referencia not in referencias_pendientes]
        for codigo in listos:
            item, _, referencia = items_pendientes.pop(codigo)
            if referencia is not None:
                item.referencia_id = referencias[referencia][0].id
            sesion.add(item)
        sesion.flush()
        listas = [codigo for codigo, (_, fuente) in referencias_pendientes.items() if fuente not in items_pendientes]
        for codigo in listas:
            referencia, fuente = referencias_pendientes.pop(codigo)
            if fuente is not None:
                referencia.item_registro_id = items[fuente][0].id
            sesion.add(referencia)
        sesion.flush()
        if not listos and not listas:
            raise ValueError('Las referencias y las elecciones por referencia forman un ciclo')


def _cargar_reglas(sesion, objetivos):
    referencias = {'COMPLETA_ACTIVIDAD': objetivos['ACTIVIDAD'], 'COMPLETA_BLOQUE': objetivos['BLOQUE'],
                   'REGISTRO_ADECUADO': objetivos['ACTIVIDAD'], 'REVELA_RESULTADO': objetivos['APLICACION']}
    reglas = []
    for codigo, tipo, objetivo, mensaje, condiciones in REGLAS:
        if not mensaje.strip():
            raise ValueError(f'La regla {codigo} no tiene mensaje de bloqueo')
        regla = modelos.ReglaDesbloqueo(codigo=codigo, nombre=f'Desbloquear {objetivo}', mensaje_bloqueo=mensaje,
            tipo_objetivo=modelos.TipoObjetivo(tipo), id_objetivo=objetivos[tipo][objetivo].id)
        regla.condiciones = [modelos.CondicionDesbloqueo(tipo_evento=modelos.TipoEventoUso(evento),
            id_referencia=None if referencia is None else referencias[evento][referencia].id,
            tipo_conteo=modelos.TipoConteo(conteo), cantidad_minima=cantidad)
            for evento, referencia, conteo, cantidad in condiciones]
        reglas.append(regla)
    sesion.add_all(reglas)


def cargar(sesion: Session) -> None:
    base = fijos.cargar(sesion)
    objetivos = {**_cargar_estructura(sesion), 'SECCION': base.secciones, 'APLICACION': base.aplicaciones}
    _unir_instrumentos(sesion, objetivos['ACTIVIDAD'], base)
    _unir_tematicas(sesion, objetivos['ACTIVIDAD'], base)
    _cargar_registros(sesion, objetivos['ACTIVIDAD'], base)
    _cargar_reglas(sesion, objetivos)
    sesion.flush()
    validar_distribucion_items(sesion)
