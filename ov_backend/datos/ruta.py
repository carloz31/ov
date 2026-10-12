"""Ruta mínima de prueba: lo justo para demostrar cada mecánica.

DATO DE PRUEBA: todo este módulo. Los códigos `t-...` nombran la mecánica que prueban.
Cada lote agrega filas en este formato; el cargador las interpreta sin lógica a medida.
La transacción pertenece al llamador; este módulo no confirma ni migra.
"""

from sqlalchemy.orm import Session

from app import models as modelos
from datos import fijos
from datos.ocupaciones import validar_distribucion_items


# (código, nombre, rol)
CUENTAS = (('est-ana', 'Ana', 'ESTUDIANTE'), ('est-luis', 'Luis', 'ESTUDIANTE'),
           ('est-beto', 'Beto', 'ESTUDIANTE'), ('apo-rosa', 'Rosa', 'APODERADO'))

# (código, estudiante, apoderado)
VINCULOS = (('VIN-ANA', 'est-ana', 'apo-rosa'),)

# (código, número, nombre, espacio, audiencia)
BLOQUES = (('T0', 1, 'Inicio', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('T1', 2, 'Camino', 'MISIONES_CAMPO', 'ESTUDIANTE'),
           ('CIUDAD', 3, 'La ciudad', 'CIUDAD', 'ESTUDIANTE'),
           ('FAMILIA', 1, 'Actividades para familias', 'PORTAL_FAMILIA', 'APODERADO'))

# (código, bloque, título, tipo, puntaje mínimo). El orden es el de la tupla dentro de cada
# bloque y el contenido es el código con guiones bajos.
ACTIVIDADES = (('t-inicio', 'T0', 'Inicio de prueba', 'INFORMATIVA', None),
               ('t-cierre-inicio', 'T0', 'Cierre del inicio', 'INFORMATIVA', None),
               ('t-expectativas', 'T1', 'Registro de expectativas', 'REGISTRO', None),
               ('t-mision-intereses', 'CIUDAD', 'Misión de intereses', 'CUESTIONARIO', None),
               ('t-mision-intereses-2', 'CIUDAD', 'Misión de intereses, segunda parte', 'CUESTIONARIO', None),
               ('t-caso', 'CIUDAD', 'Caso de prueba', 'CASO', 60),
               ('t-apo-1', 'FAMILIA', 'Primera actividad del apoderado', 'INFORMATIVA', None),
               ('t-apo-carta', 'FAMILIA', 'Carta del apoderado', 'INFORMATIVA', None))

# (actividad, instrumento, primer ítem, último ítem). El RIASEC va en dos misiones para probar que el
# resultado espera a todas las de su aplicación.
ITEMS_ACTIVIDADES = (('t-mision-intereses', 'TEST-RIASEC', 1, 30),
                     ('t-mision-intereses-2', 'TEST-RIASEC', 31, 60))

# (aplicación, actividad)
APLICACIONES_ACTIVIDADES = (('APL-RIASEC', 't-mision-intereses'), ('APL-RIASEC', 't-mision-intereses-2'))

# (código, título, contenido)
FICHAS = (('t-ficha', 'Ficha de prueba', 'Ficha que otorga t-inicio.'),)

# (código, título, tema)
CONVERSACIONES = (('t-conv-1', 'Primera conversación', 'Tema de prueba 1.'),
                  ('t-conv-2', 'Segunda conversación', 'Tema de prueba 2.'))

# (código, nombre, descripción, requisito, oculta)
INSIGNIAS = (('t-ins-1', 'Insignia de prueba', 'Completaste t-inicio.', 'Completa t-inicio.', False),
             ('t-ins-oculta', 'Insignia oculta', 'Venciste sin perder destellos.',
              'Vence al enemigo sin perder destellos.', True))

# (número, título)
NIVELES = ((1, 'Nivel 1 de prueba'), (2, 'Nivel 2 de prueba'))

# (código, tipo de objetivo, objetivo, condiciones); cada condición: (evento, referencia, conteo, mínimo).
REGLAS = (
    ('R-t-cierre-inicio', 'ACTIVIDAD', 't-cierre-inicio', (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-T1', 'BLOQUE', 'T1', (('COMPLETA_BLOQUE', 'T0', 'EVENTOS', 1),)),
    ('R-CIUDAD', 'BLOQUE', 'CIUDAD', (('COMPLETA_ACTIVIDAD', 't-expectativas', 'EVENTOS', 1),)),
    ('R-t-mision-intereses-2', 'ACTIVIDAD', 't-mision-intereses-2',
     (('COMPLETA_ACTIVIDAD', 't-mision-intereses', 'EVENTOS', 1),)),
    ('R-t-caso', 'ACTIVIDAD', 't-caso', (('COMPLETA_ACTIVIDAD', 't-mision-intereses-2', 'EVENTOS', 1),)),
    ('R-t-ficha', 'FICHA', 't-ficha', (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-t-ins-1', 'INSIGNIA', 't-ins-1', (('COMPLETA_ACTIVIDAD', 't-inicio', 'EVENTOS', 1),)),
    ('R-t-ins-oculta', 'INSIGNIA', 't-ins-oculta', (('VENCE_DESAFIO_INTACTO', None, 'EVENTOS', 1),)),
    ('R-NIV-2', 'NIVEL', 2, (('COMPLETA_BLOQUE', 'T0', 'EVENTOS', 1),)),
    ('R-t-apo-carta', 'ACTIVIDAD', 't-apo-carta', (('COMPLETA_ACTIVIDAD', 't-apo-1', 'EVENTOS', 1),)),
    ('R-FAM-ESTUDIANTE', 'CONVERSACIONES', None, (('COMPLETA_BLOQUE', 'T0', 'EVENTOS', 1),)),
    ('R-FAM-APODERADO', 'CONVERSACIONES', None, (('ESCRIBE_CARTA', None, 'EVENTOS', 1),)),
)


def contenido(codigo: str) -> str:
    return codigo.replace('-', '_')


def _cargar_estructura(sesion):
    cuentas = {c: modelos.Cuenta(codigo=c, nombre=n, rol=modelos.Rol(r)) for c, n, r in CUENTAS}
    bloques = {c: modelos.Bloque(codigo=c, numero=num, nombre=n, espacio=modelos.Espacio(e),
                                audiencia=modelos.Audiencia(a)) for c, num, n, e, a in BLOQUES}
    fichas = {c: modelos.Ficha(codigo=c, titulo=t, contenido=texto) for c, t, texto in FICHAS}
    conversaciones = [modelos.Conversacion(codigo=c, titulo=t, tema=tema) for c, t, tema in CONVERSACIONES]
    insignias = {c: modelos.Insignia(codigo=c, nombre=n, descripcion=d, requisito=r, es_oculta=o,
                                   audiencia=modelos.Audiencia.ESTUDIANTE) for c, n, d, r, o in INSIGNIAS}
    niveles = {num: modelos.Nivel(numero=num, titulo=t) for num, t in NIVELES}
    sesion.add_all([*cuentas.values(), *bloques.values(), *fichas.values(), *conversaciones,
                    *insignias.values(), *niveles.values()])
    sesion.flush()
    sesion.add_all(modelos.VinculoFamiliar(codigo=c, estudiante_id=cuentas[e].id, apoderado_id=cuentas[a].id)
                   for c, e, a in VINCULOS)
    ordenes = {}
    actividades = {}
    for codigo, bloque, titulo, tipo, puntaje in ACTIVIDADES:
        ordenes[bloque] = ordenes.get(bloque, 0) + 1
        actividades[codigo] = modelos.Actividad(
            codigo=codigo, titulo=titulo, tipo=modelos.TipoActividad(tipo), contenido=contenido(codigo),
            orden=ordenes[bloque], bloque_id=bloques[bloque].id, puntaje_minimo=puntaje)
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


def _cargar_reglas(sesion, objetivos):
    referencias = {'COMPLETA_ACTIVIDAD': objetivos['ACTIVIDAD'], 'COMPLETA_BLOQUE': objetivos['BLOQUE']}
    reglas = []
    for codigo, tipo, objetivo, condiciones in REGLAS:
        regla = modelos.ReglaDesbloqueo(codigo=codigo, nombre=f'Desbloquear {objetivo or "conversaciones"}',
            tipo_objetivo=modelos.TipoObjetivo(tipo),
            id_objetivo=None if objetivo is None else objetivos[tipo][objetivo].id)
        regla.condiciones = [modelos.CondicionDesbloqueo(tipo_evento=modelos.TipoEventoUso(evento),
            id_referencia=None if referencia is None else referencias[evento][referencia].id,
            tipo_conteo=modelos.TipoConteo(conteo), cantidad_minima=cantidad)
            for evento, referencia, conteo, cantidad in condiciones]
        reglas.append(regla)
    sesion.add_all(reglas)


def cargar(sesion: Session) -> None:
    base = fijos.cargar(sesion)
    objetivos = _cargar_estructura(sesion)
    _unir_instrumentos(sesion, objetivos['ACTIVIDAD'], base)
    _cargar_reglas(sesion, objetivos)
    sesion.flush()
    validar_distribucion_items(sesion)
