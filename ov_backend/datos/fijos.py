"""Lo fijo de la plataforma, sea cual sea la ruta: secciones, listas comunes, repreguntas por tipo
de criterio, temáticas, RIASEC, el catálogo real (`datos/catalogo.py`) y el cuestionario de partida y llegada.

Se carga en todo conjunto. La transacción pertenece al llamador; este módulo no confirma ni migra.
"""

from dataclasses import dataclass

from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as modelos
from app.core.parametros import DESCRIPCIONES_RIASEC, DIMENSIONES_RIASEC, transformar_opcion_onet
from datos import catalogo


# (código, nombre, audiencia). Cada ruta decide con sus reglas cuándo se abre cada sección.
SECCIONES = (('CATALOGO', 'Catálogo', 'ESTUDIANTE'), ('CHECK_IN', 'Check-in', 'ESTUDIANTE'),
             ('DIARIO', 'Diario', 'ESTUDIANTE'), ('FAMILIA', 'Familia', 'ESTUDIANTE'),
             ('PLANES', 'Planes', 'ESTUDIANTE'), ('CONVERSACIONES', 'Conversaciones', 'APODERADO'))

# (código, audiencia). Presentaciones de primera visita: los ids de las vistas del estudiante en el front
# (`ov_frontend/src/lib/studentViews.ts`); el texto está en el front.
PRESENTACIONES = tuple((codigo, 'ESTUDIANTE') for codigo in (
    'activities', 'catalog-careers', 'catalog-detail', 'catalog-institutions', 'catalog-professions', 'central',
    'community', 'conversations', 'investigations', 'journal', 'journal-signals', 'missions', 'profile-decisions',
    'profile-general', 'profile-helena', 'research', 'research-guide', 'resources',
))

# Código reservado para la opción «otra»; ninguna lista puede usarlo.
CODIGO_OTRA = 'OTRA'

# (código, nombre, ((código, texto), ...)). Listas comunes: se comparan entre actividades y tarjetas.
# Textos provisionales hasta la carga real (B02).
LISTAS_COMUNES = (
    ('RUTAS_DESPUES_COLEGIO', 'Rutas después del colegio',
     (('UNIVERSIDAD', 'Estudiar en una universidad'), ('INSTITUTO', 'Estudiar en un instituto'),
      ('TRABAJAR', 'Trabajar'), ('EMPRENDER', 'Emprender un negocio'), ('AUN_NO_SE', 'Aún no lo sé'))),
    ('DIFICULTADES', 'Dificultades',
     (('ECONOMICAS', 'Económicas'), ('ACADEMICAS', 'Académicas'), ('FAMILIARES', 'Familiares'),
      ('INFORMACION', 'Falta de información'), ('DISTANCIA', 'Distancia'))),
    # B11 · Tarjeta de carrera. VALORES es también la lista del registro 2.3.
    ('VALORES', 'Valores',
     (('ESTABILIDAD', 'Estabilidad'), ('INGRESOS', 'Ingresos'), ('AYUDAR', 'Ayudar a otros'), ('CREAR', 'Crear'),
      ('AUTONOMIA', 'Autonomía'), ('RECONOCIMIENTO', 'Reconocimiento'), ('TIEMPO_FAMILIA', 'Tiempo para la familia'),
      ('APRENDER', 'Aprender'), ('COMUNIDAD', 'Aportar a mi comunidad'))),
    ('CAMINOS', 'Cómo llegaría a la carrera',
     (('POSTULAR_DIRECTO', 'Postular directamente'), ('PREPARARME', 'Prepararme primero'),
      ('ESTUDIAR_Y_TRABAJAR', 'Estudiar y trabajar'), ('TRABAJAR_PRIMERO', 'Trabajar primero y luego estudiar'),
      ('TECNICA_PRIMERO', 'Empezar con una técnica y continuar'), ('TOMARME_TIEMPO', 'Tomarme un tiempo'))),
    ('RUBROS_GASTO', 'Rubros de gasto',
     (('PREPARACION', 'Preparación'), ('ADMISION', 'Admisión'), ('MATRICULA', 'Matrícula'), ('PENSION', 'Pensión'),
      ('MATERIALES', 'Materiales'), ('TRANSPORTE', 'Transporte'), ('ALIMENTACION', 'Alimentación'),
      ('VIVIENDA', 'Vivienda'))),
    ('FINANCIAMIENTO', 'Cómo lo financiaría',
     (('FAMILIA', 'Apoyo de mi familia'), ('TRABAJO', 'Mi propio trabajo'), ('BECA', 'Beca (Beca 18 u otra)'),
      ('CREDITO', 'Crédito educativo'), ('AHORROS', 'Ahorros'), ('INSTITUCION', 'Apoyos de la institución'))),
    # El código del tipo de paso es el que recibe y devuelve el LLM de sugerencias.
    ('PASOS', 'Tipos de paso',
     (('investigar', 'Investigar'), ('conversar', 'Conversar con alguien'), ('visitar', 'Visitar'),
      ('curso', 'Llevar un curso'), ('practicar', 'Practicar'), ('otra', 'Otro'))),
    ('DUDAS_SUGERIDAS', 'Dudas sugeridas',
     (('POSTULANTES', '¿Cuántos postulan y cuántos ingresan?'),
      ('CURSOS_DIFICILES', '¿Qué cursos son los más difíciles?'),
      ('SUELDO_INICIAL', '¿Cuánto gana alguien que recién termina?'))),
    # Las cinco preguntas de conocimiento (códigos de `PreguntaConocimiento`) y la duda que crea cada una al
    # responder «más o menos» o «no»; `{carrera}` se reemplaza por el nombre. Textos de las preguntas provisionales.
    ('PREGUNTAS_CONOCIMIENTO', 'Qué tanto conozco la carrera',
     (('DIA_NORMAL', '¿Sabes cómo es un día normal de alguien de {carrera}?'),
      ('DONDE_TRABAJAR', '¿Sabes dónde podrías trabajar si estudias {carrera}?'),
      ('CURSOS', '¿Sabes qué cursos se llevan en {carrera}?'),
      ('INGRESO', '¿Sabes cómo se ingresa a {carrera}?'),
      ('CONOCE_ALGUIEN', '¿Conoces a alguien que estudie o trabaje en {carrera}?'))),
    ('DUDAS_CONOCIMIENTO', 'Dudas de las preguntas de conocimiento',
     (('DIA_NORMAL', '¿Cómo es un día normal de alguien de {carrera}?'),
      ('DONDE_TRABAJAR', '¿Dónde podría trabajar si estudio {carrera}?'),
      ('CURSOS', '¿Qué cursos se llevan en {carrera}?'),
      ('INGRESO', '¿Cómo se ingresa a {carrera}?'),
      ('CONOCE_ALGUIEN', '¿A quién podría preguntarle sobre {carrera}?'))),
)

# B11 · Secciones de la tarjeta de carrera: (código, nombre, ¿cuenta para «listo para comparar»?). Cada ruta
# decide con reglas SECCION_PLAN cuándo se abre cada una.
SECCIONES_TARJETA = (('POR_QUE', 'Por qué', True), ('CONOCIMIENTO', 'Qué tanto la conozco', False),
                     ('REALIDAD', 'Qué tan real es', True), ('PASOS', 'Mis pasos', False))

# Rubros que el front propone en REALIDAD: (rubro, frecuencia recomendada, monto de referencia en soles o None si
# se consulta en la institución, en cero si la institución es pública, solo si el camino incluye prepararse).
# Alimentación y Vivienda no se proponen: el estudiante los agrega a mano.
REFERENCIAS_RUBROS = (('PREPARACION', 'UNICA', 1300, False, True), ('ADMISION', 'UNICA', 350, False, False),
                      ('MATRICULA', 'POR_CICLO', None, False, False), ('PENSION', 'MENSUAL', None, True, False),
                      ('MATERIALES', 'POR_CICLO', 300, False, False), ('TRANSPORTE', 'MENSUAL', 150, False, False))

# Caminos que incluyen prepararse antes de postular (precargan el rubro Preparación).
CAMINOS_CON_PREPARACION = ('PREPARARME',)

# Repregunta de cada tipo de criterio; el criterio la hereda si no trae la suya. Provisional (B02).
REPREGUNTAS_CRITERIO = {
    'EJEMPLO': '¿Podrías darme un ejemplo concreto?',
    'RAZON': '¿Por qué lo piensas así?',
    'ACCION': '¿Qué podrías hacer al respecto?',
    'CONTRASTE': '¿En qué se diferencia de lo que pensabas antes?',
}

# (código, nombre, descripción). Las cinco dimensiones del cuestionario de partida y llegada (B07).
TEMATICAS = (
    ('A', 'Claridad', 'Qué tan claro tienes lo que quieres hacer después del colegio.'),
    ('B', 'Conocimiento de mí', 'Qué tanto reconoces tus intereses, habilidades y valores.'),
    ('C', 'Conocimiento de las opciones', 'Qué tanto conoces las carreras, los caminos y lo que piden.'),
    ('D', 'Decisión propia', 'Qué tanto sientes que la decisión es tuya y no de otros.'),
    ('E', 'Confianza', 'Qué tan seguro te sientes de poder tomar y sostener tu decisión.'),
)

# Cuestionario de punto de partida (ENTRADA) y de llegada (SALIDA): las mismas afirmaciones en cinco
# dimensiones, una por temática. Provisional hasta la carga real (B07): (temática, enunciado, inverso).
OPCIONES_ACUERDO = ('Nada de acuerdo', 'Poco de acuerdo', 'Bastante de acuerdo', 'Muy de acuerdo')
ENUNCIADOS_PARTIDA_LLEGADA = (
    ('A', 'Sé qué quiero hacer cuando termine el colegio.', False),
    ('A', 'Puedo explicar con mis palabras qué camino me atrae.', False),
    ('A', 'Tengo una o dos opciones que me interesan más que las demás.', False),
    ('A', 'Me siento perdido cuando pienso en lo que viene después del colegio.', True),
    ('B', 'Conozco las actividades que más disfruto.', False),
    ('B', 'Sé en qué soy bueno.', False),
    ('B', 'Sé qué es importante para mí en un trabajo.', False),
    ('B', 'Reconozco qué cosas no me gustaría hacer.', False),
    ('C', 'Conozco varias carreras o caminos que podría seguir.', False),
    ('C', 'Sé qué se estudia en las carreras que me interesan.', False),
    ('C', 'Sé dónde puedo estudiar lo que me interesa.', False),
    ('C', 'Conozco cuánto cuesta y cuánto dura lo que me interesa estudiar.', False),
    ('D', 'La decisión sobre mi futuro la tomo yo.', False),
    ('D', 'Puedo conversar con mi familia sobre lo que quiero.', False),
    ('D', 'Elijo pensando en lo que quiero y no solo en lo que otros esperan.', False),
    ('D', 'Busco información por mi cuenta antes de decidir.', False),
    ('E', 'Me siento capaz de tomar una buena decisión.', False),
    ('E', 'Si algo no sale como espero, sé que puedo buscar otro camino.', False),
    ('E', 'Confío en que podré lograr lo que me proponga.', False),
)

# Los 60 enunciados de §4.3.7, sin texto narrativo del front.
ENUNCIADOS_RIASEC = {'R': ('Reparar una bicicleta o un electrodoméstico.',
       'Armar muebles siguiendo un plano.',
       'Cultivar un huerto o cuidar plantas.',
       'Manejar maquinaria o herramientas eléctricas.',
       'Instalar el cableado eléctrico de una casa.',
       'Construir una maqueta o una estructura de madera.',
       'Cuidar animales en una granja o un refugio.',
       'Trabajar al aire libre, en el campo o en una obra.',
       'Pintar o reparar paredes y techos.',
       'Ensamblar las piezas de una computadora.'),
 'I': ('Hacer experimentos en un laboratorio.',
       'Investigar por qué ocurre un fenómeno natural.',
       'Resolver problemas de matemáticas o de lógica.',
       'Analizar datos para encontrar patrones.',
       'Leer sobre descubrimientos científicos.',
       'Estudiar cómo funciona el cuerpo humano.',
       'Observar el cielo y aprender sobre los planetas.',
       'Investigar las causas de una enfermedad.',
       'Programar una solución para un problema.',
       'Comparar información de distintas fuentes antes de concluir.'),
 'A': ('Dibujar o pintar.',
       'Escribir cuentos, poemas o guiones.',
       'Tocar un instrumento o componer música.',
       'Actuar en una obra de teatro.',
       'Diseñar un afiche o la portada de una revista.',
       'Tomar fotografías o grabar videos creativos.',
       'Decorar un espacio con un estilo propio.',
       'Bailar o crear una coreografía.',
       'Diseñar ropa o accesorios.',
       'Inventar personajes para una historia o un videojuego.'),
 'S': ('Enseñar algo a un niño o a un compañero.',
       'Escuchar y aconsejar a alguien que tiene un problema.',
       'Cuidar a personas enfermas o mayores.',
       'Organizar actividades para ayudar a la comunidad.',
       'Trabajar como voluntario en una campaña.',
       'Explicar un tema difícil a un grupo.',
       'Mediar en una discusión entre amigos.',
       'Acompañar a alguien en su primer día en un lugar nuevo.',
       'Orientar a otros estudiantes sobre sus estudios.',
       'Atender a personas que llegan buscando ayuda.'),
 'E': ('Vender un producto o una idea.',
       'Liderar un equipo para cumplir una meta.',
       'Iniciar un negocio propio.',
       'Convencer a otros en un debate.',
       'Organizar un evento y conseguir auspiciadores.',
       'Negociar un acuerdo o un precio.',
       'Representar a tu salón ante la dirección.',
       'Planificar cómo hacer crecer un emprendimiento.',
       'Dirigir una reunión y tomar decisiones.',
       'Promocionar una actividad en redes sociales.'),
 'C': ('Ordenar y clasificar documentos.',
       'Llevar las cuentas de ingresos y gastos.',
       'Registrar datos en una hoja de cálculo.',
       'Revisar un texto para corregir errores.',
       'Seguir un procedimiento paso a paso.',
       'Organizar un inventario de materiales.',
       'Preparar un horario o un calendario de actividades.',
       'Archivar información para encontrarla rápido.',
       'Verificar que una factura esté correcta.',
       'Mantener al día una base de datos.')}

# (slug, código O*NET). Las ocupaciones que casos, testimonios y escenarios nombran por slug; las demás de
# Mi Próximo Paso se codifican `onet-<código>` (`datos/catalogo.py`).
OCUPACIONES = (
    ('sound-technician', '27-4014.00'),
    ('electrician', '47-2111.00'),
    ('event-coordinator', '13-1121.00'),
    ('translator', '27-3091.00'),
    ('community-manager', '27-3031.00'),
    ('graphic-designer', '27-1024.00'),
    ('event-assistant', '39-3031.00'),
    ('security-guard', '33-9032.00'),
    ('paramedic', '29-2043.00'),
    ('photographer', '27-4021.00'),
    ('lawyer', '23-1011.00'),
    ('cook', '35-2014.00'),
    ('illustrator', '27-1013.00'),
    ('firefighter', '33-2011.00'),
    ('meteorologist', '19-2021.00'),
    ('municipal-police', '33-3051.00'),
    ('medical-specialist', '29-1216.00'),
    ('veterinarian', '29-1131.00'),
    ('biologist', '19-1029.04'),
    ('environmental-engineer', '17-2081.00'),
    ('civil-engineer', '17-2051.00'),
    ('machinery-operator', '47-2073.00'),
    ('social-worker', '21-1021.00'),
    ('psychologist', '19-3033.00'),
    ('logistics-coordinator', '13-1081.00'),
    ('journalist', '27-3023.00'),
    ('teacher', '25-2031.00'),
    ('architect', '17-1011.00'),
    ('geologist', '19-2042.00'),
    ('agricultural-engineer', '17-2021.00'),
    ('public-administrator', '11-3012.00'),
    ('sociologist', '19-3041.00'),
    ('data-analyst', '15-2051.00'),
    ('urban-planner', '19-3051.00'),
    ('documentary-filmmaker', '27-2012.00'),
    ('nurse', '29-1141.00'),
)

PATRON_RIASEC = 'RRIIAASSEECC'
OPCIONES_LIKERT = ('Me disgusta mucho', 'Me disgusta', 'No estoy seguro', 'Me gusta', 'Me gusta mucho')


@dataclass(frozen=True)
class Fijos:
    """Lo que la ruta necesita de lo fijo para unir actividades, instrumentos y reglas."""
    aplicaciones: dict[str, modelos.Aplicacion]
    items: dict[str, dict[int, modelos.ItemInstrumento]]
    secciones: dict[str, modelos.Seccion]
    listas: dict[str, modelos.ListaOpciones]
    tematicas: dict[str, modelos.Tematica]
    secciones_tarjeta: dict[str, modelos.SeccionTarjeta]


def _cargar_riasec(sesion):
    instrumento = modelos.Instrumento(codigo='TEST-RIASEC', nombre='Test de intereses (RIASEC)',
        descripcion='Versión de prueba para la iteración 1.', tipo_resultado=modelos.TipoResultado.COINCIDENCIAS)
    escala = modelos.EscalaRespuesta(codigo='ESC-LIKERT5', nombre='Preferencia en cinco opciones')
    sesion.add_all([instrumento, escala])
    sesion.flush()
    sesion.add_all(modelos.OpcionEscala(escala_id=escala.id, orden=n, etiqueta=etiqueta,
                                      puntaje=transformar_opcion_onet(n))
                   for n, etiqueta in enumerate(OPCIONES_LIKERT, start=1))
    dimensiones = {c: modelos.Dimension(codigo=c, nombre=n, instrumento_id=instrumento.id, orden=orden,
                                        descripcion=DESCRIPCIONES_RIASEC[c])
                   for orden, (c, n) in enumerate(DIMENSIONES_RIASEC, start=1)}
    aplicacion = modelos.Aplicacion(codigo='APL-RIASEC', nombre='Intereses', instrumento_id=instrumento.id,
                                    momento=modelos.MomentoAplicacion.UNICA)
    sesion.add_all([*dimensiones.values(), aplicacion])
    sesion.flush()
    items = {}
    for numero in range(1, 61):
        dimension = PATRON_RIASEC[(numero - 1) % 12]
        indice = 2 * ((numero - 1) // 12) + ((numero - 1) % 12) % 2
        items[numero] = modelos.ItemInstrumento(codigo=f'RIASEC-{numero:02}', numero=numero,
            enunciado=ENUNCIADOS_RIASEC[dimension][indice], instrumento_id=instrumento.id,
            dimension_id=dimensiones[dimension].id, escala_id=escala.id, inverso=False)
    sesion.add_all(items.values())
    sesion.flush()
    return dimensiones, aplicacion, items


def _cargar_tematicas(sesion):
    tematicas = {c: modelos.Tematica(codigo=c, nombre=n, descripcion=d, orden=orden)
                 for orden, (c, n, d) in enumerate(TEMATICAS, start=1)}
    sesion.add_all(tematicas.values())
    sesion.flush()
    return tematicas


def _cargar_partida_llegada(sesion, tematicas):
    instrumento = modelos.Instrumento(codigo='TEST-PARTIDA-LLEGADA', nombre='Punto de partida y de llegada',
        descripcion='Las mismas afirmaciones al inicio y al cierre, para ver cuánto cambiaste.',
        tipo_resultado=modelos.TipoResultado.COMPARACION)
    escala = modelos.EscalaRespuesta(codigo='ESC-ACUERDO4', nombre='Acuerdo en cuatro opciones')
    sesion.add_all([instrumento, escala])
    sesion.flush()
    sesion.add_all(modelos.OpcionEscala(escala_id=escala.id, orden=n, etiqueta=etiqueta, puntaje=n)
                   for n, etiqueta in enumerate(OPCIONES_ACUERDO, start=1))
    dimensiones = {c: modelos.Dimension(codigo=f'AUTO-{c}', nombre=t.nombre, descripcion=t.descripcion,
                                        instrumento_id=instrumento.id, orden=t.orden, tematica_id=t.id)
                   for c, t in tematicas.items()}
    aplicaciones = [modelos.Aplicacion(codigo='APL-PARTIDA', nombre='Punto de partida', instrumento_id=instrumento.id,
                                       momento=modelos.MomentoAplicacion.ENTRADA),
                    modelos.Aplicacion(codigo='APL-LLEGADA', nombre='Punto de llegada', instrumento_id=instrumento.id,
                                       momento=modelos.MomentoAplicacion.SALIDA)]
    sesion.add_all([*dimensiones.values(), *aplicaciones])
    sesion.flush()
    items = {numero: modelos.ItemInstrumento(codigo=f'AUTO-{numero:02}', numero=numero, enunciado=enunciado,
                                             instrumento_id=instrumento.id, dimension_id=dimensiones[tematica].id,
                                             escala_id=escala.id, inverso=inverso)
             for numero, (tematica, enunciado, inverso) in enumerate(ENUNCIADOS_PARTIDA_LLEGADA, start=1)}
    sesion.add_all(items.values())
    sesion.flush()
    return aplicaciones, items


def _cargar_secciones(sesion):
    secciones = {c: modelos.Seccion(codigo=c, nombre=n, audiencia=modelos.Audiencia(a)) for c, n, a in SECCIONES}
    sesion.add_all(secciones.values())
    sesion.flush()
    return secciones


def _cargar_presentaciones(sesion):
    sesion.add_all(modelos.Presentacion(codigo=c, audiencia=modelos.Audiencia(a)) for c, a in PRESENTACIONES)


def cargar_listas(sesion, listas, comun):
    """Carga listas de opciones; la ruta usa la misma función para sus listas propias."""
    cargadas = {}
    for codigo, nombre, opciones in listas:
        codigos = [codigo_opcion for codigo_opcion, _ in opciones]
        if CODIGO_OTRA in codigos:
            raise ValueError(f'La lista {codigo} usa el código reservado {CODIGO_OTRA}')
        if not codigos or len(codigos) != len(set(codigos)):
            raise ValueError(f'La lista {codigo} debe tener opciones con códigos distintos')
        cargadas[codigo] = modelos.ListaOpciones(codigo=codigo, nombre=nombre, comun=comun)
    sesion.add_all(cargadas.values())
    sesion.flush()
    sesion.add_all(modelos.OpcionLista(lista_id=cargadas[codigo].id, codigo=c, texto=t, orden=orden)
                   for codigo, _, opciones in listas for orden, (c, t) in enumerate(opciones, start=1))
    return cargadas


def _cargar_tarjeta(sesion, listas):
    """Secciones de la tarjeta y los datos de precarga de rubros y caminos (B11)."""
    secciones = {c: modelos.SeccionTarjeta(codigo=c, nombre=n, orden=orden, para_comparar=p)
                 for orden, (c, n, p) in enumerate(SECCIONES_TARJETA, start=1)}
    sesion.add_all(secciones.values())
    opciones_comunes = {codigo: opciones for codigo, _, opciones in LISTAS_COMUNES}
    preguntas = {codigo for codigo, _ in opciones_comunes['PREGUNTAS_CONOCIMIENTO']}
    dudas = {codigo for codigo, _ in opciones_comunes['DUDAS_CONOCIMIENTO']}
    if preguntas != set(modelos.PreguntaConocimiento) or dudas != preguntas:
        raise ValueError('Las preguntas y dudas de conocimiento deben usar los códigos de PreguntaConocimiento')
    sesion.flush()
    opciones = {(lista, codigo): opcion_id for lista, codigo, opcion_id in sesion.execute(
        select(modelos.ListaOpciones.codigo, modelos.OpcionLista.codigo, modelos.OpcionLista.id).join(
            modelos.OpcionLista, modelos.OpcionLista.lista_id == modelos.ListaOpciones.id).where(
            modelos.ListaOpciones.id.in_([listas['RUBROS_GASTO'].id, listas['CAMINOS'].id])))}
    for rubro, *_ in REFERENCIAS_RUBROS:
        if ('RUBROS_GASTO', rubro) not in opciones:
            raise ValueError(f'El rubro {rubro} no está en RUBROS_GASTO')
    for camino in CAMINOS_CON_PREPARACION:
        if ('CAMINOS', camino) not in opciones:
            raise ValueError(f'El camino {camino} no está en CAMINOS')
    sesion.add_all(modelos.ReferenciaRubro(
        opcion_id=opciones['RUBROS_GASTO', rubro], frecuencia_recomendada=modelos.FrecuenciaGasto(frecuencia),
        monto_referencia=monto, cero_si_publica=cero, solo_si_camino_prepara=prepara)
        for rubro, frecuencia, monto, cero, prepara in REFERENCIAS_RUBROS)
    sesion.add_all(modelos.ReferenciaCamino(opcion_id=opcion_id, incluye_preparacion=codigo in CAMINOS_CON_PREPARACION)
                   for (lista, codigo), opcion_id in sorted(opciones.items()) if lista == 'CAMINOS')
    return secciones


def cargar(sesion: Session) -> Fijos:
    secciones = _cargar_secciones(sesion)
    _cargar_presentaciones(sesion)
    listas = cargar_listas(sesion, LISTAS_COMUNES, comun=True)
    secciones_tarjeta = _cargar_tarjeta(sesion, listas)
    tematicas = _cargar_tematicas(sesion)
    dimensiones, aplicacion, items = _cargar_riasec(sesion)
    catalogo.cargar(sesion, dimensiones, {onet: slug for slug, onet in OCUPACIONES})
    comparacion, items_comparacion = _cargar_partida_llegada(sesion, tematicas)
    sesion.flush()
    return Fijos(aplicaciones={a.codigo: a for a in (aplicacion, *comparacion)},
                 items={'TEST-RIASEC': items, 'TEST-PARTIDA-LLEGADA': items_comparacion}, secciones=secciones,
                 listas=listas, tematicas=tematicas, secciones_tarjeta=secciones_tarjeta)


def validar_distribucion_items(sesion: Session) -> None:
    """Cada aplicación presenta todos los ítems de su instrumento exactamente una vez."""
    for aplicacion in sesion.scalars(select(modelos.Aplicacion).order_by(modelos.Aplicacion.codigo)):
        esperados = dict(sesion.execute(select(modelos.ItemInstrumento.id, modelos.ItemInstrumento.codigo).where(
            modelos.ItemInstrumento.instrumento_id == aplicacion.instrumento_id,
        )).all())
        presentados = Counter(sesion.scalars(select(modelos.ActividadItem.item_id).join(
            modelos.AplicacionActividad, modelos.AplicacionActividad.actividad_id == modelos.ActividadItem.actividad_id,
        ).where(modelos.AplicacionActividad.aplicacion_id == aplicacion.id)))
        if not esperados or presentados != Counter({item: 1 for item in esperados}):
            faltantes = [codigo for item, codigo in esperados.items() if presentados[item] == 0]
            repetidos = [codigo for item, codigo in esperados.items() if presentados[item] > 1]
            ajenos = sesion.scalars(select(modelos.ItemInstrumento.codigo).where(
                modelos.ItemInstrumento.id.in_(set(presentados) - set(esperados)),
            )).all()
            raise ValueError(f"Distribución inválida en {aplicacion.codigo}: faltantes={faltantes}, "
                             f"repetidos={repetidos}, ajenos={ajenos}")
