"""Recorrido de punta a punta de la Leyenda contra un backend levantado, solo por HTTP (Ajuste leyenda).

Requiere el servidor con ENTORNO=desarrollo y EVALUADOR=falso sobre una base con el conjunto `ruta`. Reinicia el estado
de las cuentas, ingresa con los usuarios de prueba (JWT) y hace: Ana y Luis abren Investigaciones y dejan su guía
lista; Ana publica con Luis; Carmen destaca; Mía, Teo y Sol (DATO DE PRUEBA) marcan favorito. Después comprueba la
vista LEYENDAS desde Beto (5B), el sello `t-ins-leyenda` de Ana y de Luis y sus desbloqueos sin ver.

    uv run python scripts/verificar_leyenda.py [--url http://127.0.0.1:8000] [--orden destacada_primero|favoritos_primero]
"""

import argparse
import json
import sys
import urllib.error
import urllib.request

# DATO DE PRUEBA: credenciales de datos/usuarios_prueba.txt.
USUARIOS = {
    'est-ana': ('ana.estudiante@example.com', 'Ana2026!'),
    'est-luis': ('luis.estudiante@example.com', 'Luis2026!'),
    'est-beto': ('beto.estudiante@example.com', 'Beto2026!'),
    'est-mia': ('mia.estudiante@example.com', 'Mia2026!'),
    'est-teo': ('teo.estudiante@example.com', 'Teo2026!'),
    'est-sol': ('sol.estudiante@example.com', 'Sol2026!'),
    'ori-carmen': ('carmen.orientadora@example.com', 'Carmen2026!'),
}
AUTORES = ('est-ana', 'est-luis')
FANS = ('est-mia', 'est-teo', 'est-sol')
OTRO_SALON = 'est-beto'
# El recorrido de `ruta` que abre la Ciudad, y la misión que abre Investigaciones.
RECORRIDO = ('t-inicio', 't-partida', 't-cierre-inicio', 't-expectativas', 't-investigador')
CUESTIONARIOS = ('t-partida',)
REGISTROS = ('t-expectativas',)
# DATO DE PRUEBA: la investigación y la ficha.
PIENSO = {'ocupacion': 'electrician', 'dia': 'Creo que revisa instalaciones de casas y edificios.',
          'necesita': 'Creo que necesita estudiar en un instituto y practicar mucho.',
          'duda': '¿Es peligroso trabajar con electricidad todos los días?'}
FICHA = {'titulo': 'Un día con una electricista', 'profesional': 'Rosa Quispe', 'duracion': '20 minutos',
         'enlace': 'https://youtu.be/dQw4w9WgXcQ', 'resumen': 'Nos contó cómo empezó y qué cuidados toma cada día.',
         'permiso': True}

URL = 'http://127.0.0.1:8000'
TOKENS: dict[str, str] = {}
FALLAS: list[str] = []


def pedir(metodo, ruta, datos=None, cuenta=None, esperado=200):
    cuerpo = None if datos is None else json.dumps(datos).encode()
    solicitud = urllib.request.Request(f'{URL}{ruta}', data=cuerpo, method=metodo,
                                       headers={'Content-Type': 'application/json'})
    if cuenta:
        solicitud.add_header('Authorization', f'Bearer {TOKENS[cuenta]}')
    try:
        with urllib.request.urlopen(solicitud) as respuesta:
            estado, texto = respuesta.status, respuesta.read().decode()
    except urllib.error.HTTPError as error:
        estado, texto = error.code, error.read().decode()
    if estado != esperado:
        raise SystemExit(f'✗ {metodo} {ruta} como {cuenta}: {estado} (esperado {esperado}) {texto[:300]}')
    return json.loads(texto) if texto else None


def accion(nombre, cuenta, datos=None, esperado=200):
    return pedir('POST', f'/acciones/{nombre}', {'cuenta': cuenta, **(datos or {})}, cuenta, esperado)


def comprobar(condicion, texto):
    print(f"  {'✓' if condicion else '✗'} {texto}")
    if not condicion:
        FALLAS.append(texto)


def ingresar(cuenta):
    usuario, contrasena = USUARIOS[cuenta]
    respuesta = pedir('POST', '/sesion/ingresar', {'usuario': usuario, 'contrasena': contrasena})
    TOKENS[cuenta] = respuesta['token']
    return respuesta['cuenta']


def completar(cuenta, actividad):
    if actividad in CUESTIONARIOS:
        items = pedir('GET', f'/actividades/{actividad}/items', cuenta=cuenta)
        accion('responder-items', cuenta, {'actividad': actividad,
                                           'respuestas': [{'item': i['codigo'], 'opcion': 3} for i in items]})
    if actividad in REGISTROS:
        for item in pedir('GET', f'/actividades/{actividad}/items-registro', cuenta=cuenta):
            eleccion = item['eleccion']
            opciones = [] if eleccion is None else [{'codigo': o['codigo']}
                                                    for o in eleccion['opciones'][:eleccion['minima']]]
            accion('registro/guardar-borrador', cuenta, {
                'actividad': actividad, 'item': item['codigo'], 'opciones': opciones,
                'texto': 'DATO DE PRUEBA: una respuesta completa con su ejemplo y su razón.'})
        return accion('registro/entregar', cuenta, {'actividad': actividad})
    return accion('completar-actividad', cuenta, {'actividad': actividad})


def abrir_investigaciones(cuenta):
    for actividad in RECORRIDO:
        completar(cuenta, actividad)
    secciones = {s['codigo']: s['estado'] for s in pedir('GET', f'/cuentas/{cuenta}/secciones', cuenta=cuenta)}
    return secciones.get('INVESTIGACIONES')


def detalle(codigo, cuenta='est-ana', esperado=200):
    return pedir('GET', f'/cuentas/{cuenta}/entrevistas/{codigo}', cuenta=cuenta, esperado=esperado)


def favorito(codigo, cuenta, esperado=200):
    return accion('marcar-favorito', cuenta, {'tipo': 'ENTREVISTA', 'codigo': codigo}, esperado)


def destacar(codigo):
    accion('destacar-entrevista', 'ori-carmen', {'entrevista': codigo, 'destacada': True})
    print('· Carmen destaca la entrevista')


def main():
    global URL
    argumentos = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    argumentos.add_argument('--url', default=URL)
    argumentos.add_argument('--orden', choices=('destacada_primero', 'favoritos_primero'), default='destacada_primero')
    opciones = argumentos.parse_args()
    URL = opciones.url.rstrip('/')

    print(f'== Verificación de la Leyenda en {URL} (orden: {opciones.orden})')
    print('·', pedir('POST', '/desarrollo/reiniciar')['mensaje'])
    for cuenta in USUARIOS:
        resumen = ingresar(cuenta)
        print(f"· Ingresa {resumen['nombre']} ({cuenta}, {resumen['rol']}) con JWT")

    for cuenta in (*AUTORES, *FANS, OTRO_SALON):
        comprobar(abrir_investigaciones(cuenta) == 'DISPONIBLE', f'{cuenta}: sección INVESTIGACIONES abierta')
    print(f'· FAVORITOS_LEYENDA = {pedir("GET", "/cuentas/est-ana/investigaciones", cuenta="est-ana")["favoritos_leyenda"]}')
    for cuenta in ('est-luis', 'est-ana'):
        accion('guardar-lo-que-pienso', cuenta, PIENSO)
        accion('guardar-guion', cuenta, {'preguntas': [{'origen': 'DUDA', 'texto': PIENSO['duda']}],
                                          'descartadas': [], 'terminar': True})
    publicada = accion('publicar-entrevista', 'est-ana', {**FICHA, 'coautores': ['est-luis']})
    codigo = publicada['por_cuenta']['est-ana']['eventos_registrados'][0]['referencia']
    print(f'· Ana publica {codigo} con Luis como coautor')
    for autor in AUTORES:
        # Como el front al mostrar sus avisos: lo pendiente de ver queda solo lo que trae la Leyenda.
        marcadas = pedir('POST', f'/cuentas/{autor}/notificaciones/marcar-vistas', {'codigos': []}, autor)['marcadas']
        print(f'· {autor} ya vio sus notificaciones anteriores (marcar-vistas: {marcadas})')

    print('\n-- Regla 4: los autores no marcan favorito')
    for autor in AUTORES:
        favorito(codigo, autor, esperado=409)
        comprobar(True, f'{autor} → 409 al marcar su propia entrevista')
    favorito(codigo, OTRO_SALON, esperado=404)
    comprobar(True, f'{OTRO_SALON} (5B) → 404: todavía no la ve')

    print('\n-- Acciones')
    if opciones.orden == 'destacada_primero':
        destacar(codigo)
    for fan in FANS:
        respuesta = favorito(codigo, fan)
        ficha = detalle(codigo)
        sello_en_respuesta = any(d['regla'] == 'R-t-ins-leyenda' for d in respuesta['nuevos_desbloqueos'])
        print(f"· {fan} marca favorito → favoritos={ficha['favoritos']}, destacada={ficha['destacada']}, "
              f"leyenda={ficha['leyenda']}{' (sello en la respuesta de quien marca!)' if sello_en_respuesta else ''}")
    if opciones.orden == 'favoritos_primero':
        comprobar(not detalle(codigo)['leyenda'], 'con 3 favoritos y sin destacar aún no es Leyenda')
        destacar(codigo)

    print('\n-- Lecturas')
    ficha = detalle(codigo)
    comprobar(ficha['leyenda'] and ficha['destacada'], f"detalle de Ana: leyenda={ficha['leyenda']}")
    leyendas = pedir('GET', f'/cuentas/{OTRO_SALON}/entrevistas?vista=LEYENDAS', cuenta=OTRO_SALON)
    print(f"· GET /cuentas/{OTRO_SALON}/entrevistas?vista=LEYENDAS → total={leyendas['total']}, "
          f"items={[(t['codigo'], t['titulo'], t['leyenda'], [a['nombre'] for a in t['autores']]) for t in leyendas['items']]}")
    comprobar([t['codigo'] for t in leyendas['items']] == [codigo], 'Beto (5B) la ve en LEYENDAS')
    comprobar(detalle(codigo, OTRO_SALON)['leyenda'], 'Beto (5B) abre su detalle')
    for autor in AUTORES:
        insignia = next(i for i in pedir('GET', f'/cuentas/{autor}/logros', cuenta=autor)['insignias']
                        if i['codigo'] == 't-ins-leyenda')
        print(f"· GET /cuentas/{autor}/logros → t-ins-leyenda: {insignia['nombre']} · {insignia['estado']} · "
              f"obtenida_en={insignia['obtenida_en']} · grupo={insignia['grupo']['nombre']}")
        comprobar(insignia['estado'] == 'OBTENIDA' and insignia['obtenida_en'], f'{autor}: sello obtenido con fecha')
        eventos = [e for e in pedir('GET', f'/cuentas/{autor}/eventos', cuenta=autor)
                   if e['tipo'] in ('ENTREVISTA_DESTACADA', 'ENTREVISTA_LEYENDA')]
        print(f"· GET /cuentas/{autor}/eventos → {[(e['tipo'], e['referencia'], e['fecha_hora']) for e in eventos]}")
        comprobar(sum(e['tipo'] == 'ENTREVISTA_LEYENDA' for e in eventos) == 1, f'{autor}: un ENTREVISTA_LEYENDA')
        pendientes = [n for n in pedir('GET', f'/cuentas/{autor}/notificaciones', cuenta=autor)['items']
                      if not n['vista']]
        sellos = [n for n in pendientes if n['referencia'] == 't-ins-leyenda']
        print(f"· GET /cuentas/{autor}/notificaciones (sin ver) → "
              f"{[(n['tipo'], n['detalle'], n['nombre'], n['creada_en']) for n in pendientes]}")
        comprobar(len(sellos) == 1, f'{autor}: el sello en la campana, sin ver')
    for fan in FANS:
        insignia = next(i for i in pedir('GET', f'/cuentas/{fan}/logros', cuenta=fan)['insignias']
                        if i['codigo'] == 't-ins-leyenda')
        comprobar(insignia['estado'] == 'BLOQUEADA', f'{fan}: no es autor, sin sello')

    print(f"\n== {'OK' if not FALLAS else f'{len(FALLAS)} FALLAS'}: entrevista {codigo}")
    return 1 if FALLAS else 0


if __name__ == '__main__':
    sys.exit(main())
