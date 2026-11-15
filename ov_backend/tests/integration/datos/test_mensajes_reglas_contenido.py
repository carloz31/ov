"""Ajuste lumi-mensajes: los mensajes de bloqueo del estudiante en `contenido` dicen qué hacer en la plataforma.

Cada condición con una actividad de referencia nombra su título entre «»; cada COMPLETA_BLOQUE nombra el tramo o su
última misión requerida. Si un ajuste cambia un título, esta prueba avisa que hay que cambiar también el mensaje.
"""

from datos import contenido


TIPOS = ('ACTIVIDAD', 'BLOQUE', 'SECCION', 'SECCION_PLAN', 'CONVERSACION', 'TESTIMONIO')
EVENTOS_CON_TITULO = ('COMPLETA_ACTIVIDAD', 'SUPERA_BATALLA', 'REGISTRO_ADECUADO')
# Del apoderado (se leen en orden en «Mis actividades») y de los recuerdos de Lumi (sin actividad de referencia).
FUERA = ('R-p', 'R-SEC-CONVERSACIONES', 'R-lumi-')
# Los dos primeros temas solo esperan la carta: «Las voces y la mía» ya está hecha cuando se abre «En familia».
SOLO_CARTA = {'R-conv-1', 'R-conv-2'}

TITULOS = {codigo: titulo for codigo, _bloque, titulo, *_ in contenido.ACTIVIDADES}
TRAMOS = {codigo: nombre for codigo, _numero, nombre, *_ in contenido.BLOQUES}


def _ultima_requerida(bloque):
    requeridas = [codigo for codigo, b, *_ in contenido.ACTIVIDADES
                  if b == bloque and contenido.PROPIEDADES.get(codigo, {}).get('requerida', True)]
    return requeridas[-1]


def _reglas_estudiante():
    return [r for r in contenido.REGLAS if r[1] in TIPOS and not r[0].startswith(FUERA)
            and r[0] not in SOLO_CARTA]


def test_cada_condicion_de_actividad_nombra_su_mision():
    faltan = [(codigo, referencia) for codigo, _t, _o, mensaje, condiciones in _reglas_estudiante()
              for evento, referencia, *_ in condiciones
              if evento in EVENTOS_CON_TITULO and referencia and f'«{TITULOS[referencia]}»' not in mensaje]
    assert faltan == []


def test_cada_condicion_de_tramo_nombra_el_tramo_o_su_ultima_mision():
    faltan = [(codigo, referencia) for codigo, _t, _o, mensaje, condiciones in _reglas_estudiante()
              for evento, referencia, *_ in condiciones
              if evento == 'COMPLETA_BLOQUE'
              and f'«{TRAMOS[referencia]}»' not in mensaje
              and f'«{TITULOS[_ultima_requerida(referencia)]}»' not in mensaje]
    assert faltan == []


def test_ningun_mensaje_del_estudiante_habla_de_lumi_en_tercera_persona():
    assert [r[0] for r in _reglas_estudiante() if 'Lumi te' in r[3]] == []
