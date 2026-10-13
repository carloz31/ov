"""Lo fijo de la plataforma, sea cual sea la ruta: secciones, RIASEC y el catálogo O*NET.

Se carga en todo conjunto. La transacción pertenece al llamador; este módulo no confirma ni migra.
"""

from dataclasses import dataclass

from sqlalchemy import insert
from sqlalchemy.orm import Session

from app import models as modelos
from app.core.parametros import DESCRIPCIONES_RIASEC, DIMENSIONES_RIASEC, transformar_opcion_onet
from datos.ocupaciones import RUTA_OCUPACIONES, leer_ocupaciones


# (código, nombre, audiencia). Cada ruta decide con sus reglas cuándo se abre cada sección.
SECCIONES = (('CATALOGO', 'Catálogo', 'ESTUDIANTE'), ('CHECK_IN', 'Check-in', 'ESTUDIANTE'),
             ('DIARIO', 'Diario', 'ESTUDIANTE'), ('FAMILIA', 'Familia', 'ESTUDIANTE'),
             ('PLANES', 'Planes', 'ESTUDIANTE'), ('CONVERSACIONES', 'Conversaciones', 'APODERADO'))

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

OCUPACIONES = (('sound-technician', 'Técnico/a de sonido', '27-4014.00'),
 ('electrician', 'Electricista', '47-2111.00'),
 ('event-coordinator', 'Coordinador/a de eventos', '13-1121.00'),
 ('translator', 'Traductor/a', '27-3091.00'),
 ('community-manager', 'Community manager', '27-3031.00'),
 ('graphic-designer', 'Diseñador/a gráfico/a', '27-1024.00'),
 ('event-assistant', 'Asistente de eventos', '39-3031.00'),
 ('security-guard', 'Guardia de seguridad', '33-9032.00'),
 ('paramedic', 'Paramédico/a', '29-2043.00'),
 ('photographer', 'Fotógrafo/a', '27-4021.00'),
 ('lawyer', 'Abogado/a', '23-1011.00'),
 ('cook', 'Cocinero/a', '35-2014.00'),
 ('illustrator', 'Ilustrador/a', '27-1013.00'),
 ('firefighter', 'Bombero/a', '33-2011.00'),
 ('meteorologist', 'Meteorólogo/a', '19-2021.00'),
 ('municipal-police', 'Policía municipal', '33-3051.00'),
 ('medical-specialist', 'Médico/a especialista', '29-1216.00'),
 ('veterinarian', 'Veterinario/a', '29-1131.00'),
 ('biologist', 'Biólogo/a', '19-1029.04'),
 ('environmental-engineer', 'Ingeniero/a medioambiental', '17-2081.00'),
 ('civil-engineer', 'Ingeniero/a civil', '17-2051.00'),
 ('machinery-operator', 'Operador/a de maquinaria', '47-2073.00'),
 ('social-worker', 'Trabajador/a social', '21-1021.00'),
 ('psychologist', 'Psicólogo/a', '19-3033.00'),
 ('logistics-coordinator', 'Coordinador/a logístico/a', '13-1081.00'),
 ('journalist', 'Periodista', '27-3023.00'),
 ('teacher', 'Docente', '25-2031.00'),
 ('architect', 'Arquitecto/a', '17-1011.00'),
 ('geologist', 'Geólogo/a', '19-2042.00'),
 ('agricultural-engineer', 'Ingeniero/a agrónomo/a', '17-2021.00'),
 ('public-administrator', 'Gestor/a público/a', '11-3012.00'),
 ('sociologist', 'Sociólogo/a', '19-3041.00'),
 ('data-analyst', 'Analista de datos', '15-2051.00'),
 ('urban-planner', 'Urbanista', '19-3051.00'),
 ('documentary-filmmaker', 'Documentalista', '27-2012.00'),
 # nurse no existe en el catálogo del frontend; la exige la carrera nursing.
 ('nurse', 'Enfermero/a', '29-1141.00'))

CARRERAS = (('environmental-engineering',
  'Ingeniería Ambiental',
  'Ingeniería y ambiente',
  ('environmental-engineer', 'agricultural-engineer', 'geologist', 'data-analyst')),
 ('journalism',
  'Periodismo',
  'Comunicación',
  ('journalist', 'documentary-filmmaker', 'photographer', 'community-manager', 'translator')),
 ('nursing', 'Enfermería', 'Salud', ('nurse', 'paramedic')),
 ('civil-engineering',
  'Ingeniería Civil',
  'Ingeniería e infraestructura',
  ('civil-engineer', 'architect', 'urban-planner', 'geologist', 'machinery-operator')),
 ('veterinary-medicine',
  'Medicina Veterinaria',
  'Salud y ciencias naturales',
  ('veterinarian', 'agricultural-engineer', 'biologist')),
 ('psychology',
  'Psicología',
  'Ciencias sociales y salud',
  ('psychologist', 'teacher', 'sociologist', 'social-worker')))


PATRON_RIASEC = 'RRIIAASSEECC'
OPCIONES_LIKERT = ('Me disgusta mucho', 'Me disgusta', 'No estoy seguro', 'Me gusta', 'Me gusta mucho')


@dataclass(frozen=True)
class Fijos:
    """Lo que la ruta necesita de lo fijo para unir actividades, instrumentos y reglas."""
    aplicaciones: dict[str, modelos.Aplicacion]
    items: dict[str, dict[int, modelos.ItemInstrumento]]
    secciones: dict[str, modelos.Seccion]


def _leer_catalogo_seleccionado():
    archivo = {fila.codigo_onet: fila for fila in leer_ocupaciones(RUTA_OCUPACIONES)}
    for codigo, _, codigo_onet in OCUPACIONES:
        if codigo_onet not in archivo:
            raise ValueError(f'Falta la ocupación O*NET {codigo_onet}, requerida por {codigo}')
    return {codigo: archivo[codigo_onet] for codigo, _, codigo_onet in OCUPACIONES}


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


def _cargar_catalogo(sesion, archivo, dimensiones):
    ocupaciones = {c: modelos.Ocupacion(codigo=c, titulo=t, codigo_onet=onet) for c, t, onet in OCUPACIONES}
    familias = {c: modelos.FamiliaCarrera(codigo=f'family-{c}', nombre=f) for c, _, f, _ in CARRERAS}
    sesion.add_all([*ocupaciones.values(), *familias.values()])
    sesion.flush()
    carreras = {c: modelos.Carrera(codigo=c, nombre=n, familia_id=familias[c].id) for c, n, _, _ in CARRERAS}
    sesion.add_all(carreras.values())
    sesion.flush()
    sesion.execute(insert(modelos.PuntajeOcupacion), [
        {'ocupacion_id': ocupaciones[c].id, 'dimension_id': dimensiones[d].id, 'valor': fila.valores[n]}
        for c, fila in archivo.items() for n, (d, _) in enumerate(DIMENSIONES_RIASEC)
    ])
    sesion.execute(insert(modelos.CarreraOcupacion), [
        {'carrera_id': carreras[c].id, 'ocupacion_id': ocupaciones[o].id}
        for c, _, _, relaciones in CARRERAS for o in relaciones
    ])


def _cargar_secciones(sesion):
    secciones = {c: modelos.Seccion(codigo=c, nombre=n, audiencia=modelos.Audiencia(a)) for c, n, a in SECCIONES}
    sesion.add_all(secciones.values())
    sesion.flush()
    return secciones


def cargar(sesion: Session) -> Fijos:
    secciones = _cargar_secciones(sesion)
    archivo = _leer_catalogo_seleccionado()
    dimensiones, aplicacion, items = _cargar_riasec(sesion)
    _cargar_catalogo(sesion, archivo, dimensiones)
    sesion.flush()
    return Fijos(aplicaciones={aplicacion.codigo: aplicacion}, items={'TEST-RIASEC': items}, secciones=secciones)
