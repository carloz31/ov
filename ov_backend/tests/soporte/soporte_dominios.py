"""Consultas HTTP reales para conservar las aserciones de escenarios por dominio."""

RUTAS_DOMINIO = ('resumen', 'actividades', 'fichas', 'logros', 'testimonios',
                 'diario/preguntas', 'secciones')


def proyectar_bloques(bloques):
    return [{
        **{clave: bloque[clave] for clave in ('codigo', 'nombre', 'espacio', 'estado')},
        'actividades': [{clave: actividad[clave] for clave in ('codigo', 'titulo', 'estado')}
                        for actividad in bloque['actividades']],
    } for bloque in sorted(bloques, key=lambda bloque: bloque['codigo'])]


def consultar_dominios(cliente, cuenta='est-ana', *, resumen=None):
    def pedir(ruta, bloqueable=False):
        respuesta = cliente.get(f'/cuentas/{cuenta}/{ruta}')
        if bloqueable and respuesta.status_code == 409:
            return None  # El contenido de una sección bloqueada no se lee (B01).
        assert respuesta.status_code == 200, respuesta.text
        return respuesta.json()

    return {
        **(pedir('resumen') if resumen is None else resumen),
        'bloques': proyectar_bloques(pedir('actividades')), **pedir('logros'),
        'fichas': pedir('fichas'), 'testimonios': pedir('testimonios'),
        'preguntas_diario': pedir('diario/preguntas', bloqueable=True),
        'secciones': {seccion['codigo']: seccion['estado'] for seccion in pedir('secciones')},
    }
