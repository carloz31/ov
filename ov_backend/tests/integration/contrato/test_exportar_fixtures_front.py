"""Contrato, reproducibilidad y aislamiento del exportador de fixtures `ruta-*`."""

import json
import subprocess
import sys
from pathlib import Path

import pytest
from pydantic import TypeAdapter
from scripts import exportar_fixtures_front as exportador
from soporte_ruta import BLOQUE_FAMILIA

from app import main as principal
from app.schemas.referencias import ReferenciasConsultadas
from app.schemas.acciones import (
    RespuestaAccion, RespuestaAgrupada, RespuestaReiniciarInstrumento, RespuestaResolverBatalla, RespuestaResolverCaso,
    RespuestaRevelarResultado,
)
from app.schemas.batallas import BatallaCuenta, PreguntaIntento
from app.schemas.casos import CasoCuenta, OcupacionColeccion
from app.schemas.diario import (
    AmistadAsistente, CheckInsCuenta, EntradaDiarioPublica, PreguntaDelDia, PreguntaDiarioEstado,
)
from app.schemas.tematicas import AvanceTematica
from app.schemas.catalogo import (
    CarreraDetalle, FamiliaPublica, InstitucionDetalle, OcupacionCaso, OcupacionDetalle, PaginaCarreras,
    PaginaInstituciones, PaginaOcupaciones, UbicacionPublica,
)
from app.schemas.conversaciones import ConversacionesCuenta
from app.schemas.familia import FamiliaApoderado
from app.schemas.favoritos import FavoritosCuenta
from app.schemas.notificaciones import PaginaNotificaciones
from app.schemas.planes import PlanesCuenta
from app.schemas.testimonios import TestimonioEstado
from app.schemas.cuentas import CuentaResumen, ResumenCuenta
from app.schemas.actividades import BloqueActividades
from app.schemas.fichas import FichaCuenta, FichaDetalle
from app.schemas.logros import LogrosCuenta
from app.schemas.avance import AvanceEstudiante
from app.schemas.presentaciones import PresentacionesCuenta
from app.schemas.investigaciones import (
    EntrevistaDetalle, InvestigacionesCuenta, PaginaEntrevistas, PaginaPublicaciones, PublicacionDetalle,
    SugerenciasGuion,
)
from app.schemas.secciones import SeccionEstado
from app.schemas.instrumentos import (
    AvanceInstrumento, ComparacionAutopercepcion, InstrumentoPublico, ItemPublico, RespuestasActividad,
    ResultadoHistorico, ResultadoPublico,
)
from app.schemas.registro import ItemRegistroPublico, PasoRegistro, RegistroConsultado, RespuestaRegistroAccion
from soporte_catalogo_ruta import ING_CIVIL, INST_UNI, PERIODISMO, PSICOLOGIA


SCRIPT = Path(exportador.__file__).resolve()
NOMBRES = {f'ruta-{nombre}.json' for nombre in (
    'cuentas', 'resumen-inicial', 'actividades-inicial', 'actividades-t1', 'actividades-ciudad',
    'fichas-inicial', 'fichas-final', 'logros-inicial', 'logros-final', 'vitrina', 'progreso-nivel-3',
    'avance-inicial', 'avance-t1', 'avance-ciudad', 'avance-t2', 'avance-final',
    'completar-t-inicio', 'completar-t-cierre-inicio', 'items-t-mision-intereses', 'revelar-riasec', 'resultado-riasec',
    'notificaciones', 'notificaciones-marcar-una', 'notificaciones-pagina-2', 'notificaciones-autora',
    'notificaciones-apoderado', 'apoderado-actividades-inicial', 'apoderado-actividades-final',
    'secciones-inicial', 'secciones-t1', 'presentaciones-inicial', 'presentacion-vista', 'apoderado-secciones-inicial', 'apoderado-secciones-final',
    'items-registro-t-expectativas', 'responder-t-exp-ruta', 'entregar-t-expectativas', 'registro-t-expectativas-cerrado',
    'items-registro-t-valores', 'entregar-t-valores',
    'items-registro-t-eco', 'referencias-t-eco', 'referencias-t-eco-sin-dato',
    'referencias-t-contraste',
    'items-t-partida', 'respuestas-t-partida', 'revelar-partida', 'resultado-partida', 'referencias-t-lee-cuestionario', 'actividades-t2',
    'comparacion-partida-llegada', 'testimonios-inicial', 'testimonios-final', 'ficha-t-ficha', 'ver-ficha', 'marcar-favorito-ficha', 'preguntas-batalla',
    'resolver-batalla-derrota',
    'resolver-batalla-victoria', 'batallas', 'resolver-caso', 'casos', 'coleccion',
    'catalogo-carreras', 'catalogo-carrera-psychology', 'catalogo-ocupaciones-riasec', 'catalogo-ocupacion-psychologist', 'ocupaciones-caso',
    'catalogo-instituciones', 'catalogo-institucion-t-uni', 'ver-ocupacion', 'marcar-favorito', 'favoritos',
    'catalogo-familias', 'catalogo-ubicaciones', 'ver-carrera', 'catalogo-inesperada', 'catalogo-carreras-favoritos',
    'catalogo-familia', 'catalogo-ocupaciones-familia', 'catalogo-ocupacion-afin',
    'diario-preguntas', 'pregunta-del-dia', 'escribir-entrada-fija', 'escribir-entrada-libre',
    'editar-entrada', 'diario-entradas', 'diario-amistad', 'desarchivar-pregunta', 'archivar-pregunta',
    'diario-preguntas-buzon', 'check-ins', 'tematicas',
    'crear-plan-no-favorita', 'guardar-seccion-bloqueada', 'planes-misma-familia', 'ordenar-planes', 'eliminar-plan',
    'planes-tras-eliminar', 'crear-plan', 'guardar-seccion-por-que', 'guardar-seccion-conocimiento', 'guardar-seccion-realidad',
    'medidores-plan', 'referencias-t-comparar', 'guardar-seccion-pasos', 'paso-hecho', 'referencias-t-proyecto',
    'planes', 'familia', 'familia-resultados', 'familia-resultados-luis', 'conversaciones-sin-carta', 'escribir-carta-est-ana',
    'escribir-carta-apo-rosa', 'responder-conversacion', 'conversaciones-te-toca', 'conversaciones-final',
    # F08: conversaciones en cada estado, segundo hijo, regalo y fichas del apoderado.
    'conversaciones-estudiante-sin-carta', 'apoderado-conversaciones-sin-carta', 'conversaciones-estudiante-carta',
    'conversaciones-esperando', 'responder-conversacion-segundo', 'conversaciones-conversada',
    'conversaciones-apoderado-conversada', 'conversaciones-apoderado-final', 'apoderado-fichas-inicial',
    'apoderado-fichas-final', 'apoderado-ficha-t-ficha-apo', 'apoderado-familia-inicial',
    'apoderado-completar-t-apo-1', 'apoderado-actividades-mitad', 'apoderado-familia-mitad', 'apoderado-completar-t-apo-2',
    'sesion-ingresar-estudiante', 'sesion-ingresar-apoderado', 'sesion-ingresar-orientadora',
    'sesion-estudiante', 'sesion-apoderado', 'sesion-orientadora', 'sesion-error',
    # F03: avance para el libro de Helena, llegada, perfil plano con su reinicio y resultados sin diploma.
    'avance-instrumentos-inicial', 'avance-instrumentos-partida-lista', 'avance-instrumentos-riasec-listo',
    'avance-instrumentos-llegada-lista', 'avance-instrumentos-final', 'avance-instrumentos-reiniciado',
    'items-t-mision-intereses-2', 'items-t-llegada', 'revelar-llegada', 'resultado-llegada',
    'revelar-riasec-plano', 'resultado-riasec-plano', 'historial-riasec-plano', 'historial-riasec',
    'reiniciar-riasec', 'referencias-t-contraste-plano', 'referencias-t-contraste-reiniciado',
    'familia-resultados-sin-diploma', 'items-registro-t-contraste', 'instrumentos',
    # B13: investigaciones y entrevistas.
    'investigaciones-inicial', 'sugerencias-guion', 'investigaciones-guia-lista', 'publicar-entrevista',
    'entrevistas-salon', 'entrevistas-mias', 'entrevista-detalle', 'publicaciones', 'publicacion-detalle',
    'referencias-investigador-cierre',
    # F09: en curso con sugerencias, Luis con guía lista, por ocupación y el detalle propio.
    'investigaciones-en-curso', 'investigaciones-luis', 'entrevistas-familia', 'entrevista-detalle-propia',
)}


# Ajuste front de registros (lote 1): el registro b1-1 de `contenido`, con cada paso del flujo con el LLM.
NOMBRES_CONTENIDO = {f'contenido-{nombre}.json' for nombre in (
    'registro-b1-1-inicial', 'responder-b1-1-repregunta', 'registro-b1-1-a-medias', 'seguimiento-b1-1-con-pista',
    'responder-b1-1-mensaje', 'responder-b1-1-sin-evaluar', 'registro-b1-1-sin-terminar', 'reenviar-b1-1',
    'responder-b1-1-edicion', 'seguimiento-b1-1-sin-pista', 'seguimiento-b1-1-mensaje', 'entregar-b1-1',
    'registro-b1-1-completado')} | {
    # Ajuste front de registros (lote 2): los registros con piezas y ecos, sin responder y completados.
    f'contenido-registro-{actividad}-{momento}.json' for actividad in ('b4-1', 'b4-5', 'b5-1', 'b5-3')
    for momento in ('inicial', 'completado')} | {
    # Ajuste lumi-mensajes: las actividades de una cuenta nueva de `contenido`, para el camino del mapa.
    'contenido-actividades-inicial.json'}


def leer(archivos):
    return {ruta.name.removeprefix('ruta-').removesuffix('.json'): json.loads(ruta.read_bytes())
            for ruta in archivos}


def estados(bloques):
    return {a['codigo']: a['estado'] for b in bloques for a in b['actividades']}


def test_exportador_exige_destino_incluso_desde_otro_directorio(tmp_path):
    resultado = subprocess.run([sys.executable, str(SCRIPT)], cwd=tmp_path,
                               capture_output=True, text=True)
    assert resultado.returncode == 2
    assert 'Falta --destino' in resultado.stderr
    assert 'tests/fixtures/servidor de ov_frontend' in resultado.stderr
    assert list(tmp_path.iterdir()) == []


def test_fixtures_reproducen_el_contrato_y_se_regeneran_identicos(tmp_path, monkeypatch):
    ruta_ajena = tmp_path / 'base-del-usuario.db'
    # DATO DE PRUEBA: un archivo que jamás debe abrir ni reiniciar el exportador.
    ruta_ajena.write_bytes(b'Base del usuario: conservar estos bytes')
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{ruta_ajena.as_posix()}')
    bases = []
    crear = principal.crear_aplicacion

    def crear_temporal(url_bd):
        ruta = Path(url_bd.removeprefix('sqlite:///'))
        assert ruta.name in ('ruta.db', 'contenido.db') and ruta.parent.is_dir()
        assert ruta != ruta_ajena
        bases.append(ruta)
        return crear(url_bd)

    monkeypatch.setattr(principal, 'crear_aplicacion', crear_temporal)
    destino = tmp_path / 'front' / 'tests' / 'fixtures' / 'servidor'
    # Los fixtures congelados de la raíz no se tocan.
    destino.mkdir(parents=True)
    congelado = destino / 'actividades-inicial.json'
    congelado.write_text('congelado', encoding='utf-8')
    archivos = exportador.exportar_fixtures(destino)
    assert {ruta.name for ruta in archivos} == NOMBRES | NOMBRES_CONTENIDO
    assert all(ruta.parent == destino / ('ruta' if ruta.name.startswith('ruta-') else 'contenido') for ruta in archivos)
    assert {ruta.name for ruta in (destino / 'ruta').iterdir()} == NOMBRES
    assert {ruta.name for ruta in (destino / 'contenido').iterdir()} == NOMBRES_CONTENIDO
    _contrato_registro_contenido(leer(a for a in archivos if a.name.startswith('contenido-')))
    assert congelado.read_text(encoding='utf-8') == 'congelado'
    bytes_antes = {ruta.name: ruta.read_bytes() for ruta in archivos}
    datos = leer(archivos)
    ResumenCuenta.model_validate(datos['resumen-inicial'])
    for nombre in ('actividades-inicial', 'actividades-t1', 'actividades-ciudad'):
        TypeAdapter(list[BloqueActividades]).validate_python(datos[nombre])
    for momento in ('inicial', 'final'):
        TypeAdapter(list[FichaCuenta]).validate_python(datos[f'fichas-{momento}'])
        LogrosCuenta.model_validate(datos[f'logros-{momento}'])
    for nombre in ('completar-t-inicio', 'completar-t-cierre-inicio'):
        RespuestaAccion.model_validate(datos[nombre])
    TypeAdapter(list[ItemPublico]).validate_python(datos['items-t-mision-intereses'])
    ResultadoPublico.model_validate(datos['resultado-riasec'])
    revelado = RespuestaRevelarResultado.model_validate(datos['revelar-riasec'])
    # B07: con la partida revelada y T1 cerrado, revelar el RIASEC prioritario del 5A también abre T2.
    assert sorted(d.regla for d in revelado.nuevos_desbloqueos) == ['R-T2', 'R-t-contraste']
    TypeAdapter(list[ItemPublico]).validate_python(datos['items-t-partida'])
    assert RespuestaRevelarResultado.model_validate(datos['revelar-partida']).nuevos_desbloqueos == []
    partida = ResultadoPublico.model_validate(datos['resultado-partida'])
    # Ajuste de F03: respuestas por dimensión, para una dimensión sin cambios (A) y otra que baja (D).
    assert [d.zona for d in partida.dimensiones] == ['EN_CAMINO', 'POR_TRABAJAR', 'POR_TRABAJAR', 'FUERTE',
                                                     'POR_TRABAJAR']
    respuestas = RespuestasActividad.model_validate(datos['respuestas-t-partida']).respuestas
    assert respuestas[0].item == 'AUTO-01' and respuestas[0].opcion.etiqueta == 'Bastante de acuerdo'
    assert all(d.puntaje is None and d.puntaje_visual is None for d in partida.dimensiones)
    cita, = ReferenciasConsultadas.model_validate(datos['referencias-t-lee-cuestionario']).referencias
    assert (cita.tipo, cita.estado, cita.texto) == ('RESPUESTA_CUESTIONARIO', 'DISPONIBLE', 'Bastante de acuerdo')
    assert estados(datos['actividades-t2'])['t-llegada'] == 'DISPONIBLE'
    comparacion = ComparacionAutopercepcion.model_validate(datos['comparacion-partida-llegada'])
    assert [(d.zona_partida, d.zona_llegada) for d in comparacion.dimensiones] == [
        ('EN_CAMINO', 'EN_CAMINO'), ('POR_TRABAJAR', 'FUERTE'), ('POR_TRABAJAR', 'EN_CAMINO'),
        ('FUERTE', 'EN_CAMINO'), ('POR_TRABAJAR', 'POR_TRABAJAR')]
    assert not any(i.cambio for i in comparacion.dimensiones[0].items)
    assert '"puntaje' not in json.dumps(datos['comparacion-partida-llegada'])
    # F03: el avance distingue «listo para revelar» (COMPLETADO sin resultado vigente).
    def aplicacion(momento, codigo):
        avance = TypeAdapter(list[AvanceInstrumento]).validate_python(datos[f'avance-instrumentos-{momento}'])
        return next((a.estado, a.hay_resultado_vigente) for i in avance for a in i.aplicaciones
                    if a.aplicacion == codigo)
    assert aplicacion('inicial', 'APL-PARTIDA') == ('NO_INICIADO', False)
    assert aplicacion('partida-lista', 'APL-PARTIDA') == ('COMPLETADO', False)
    assert aplicacion('riasec-listo', 'APL-RIASEC') == ('COMPLETADO', False)
    assert aplicacion('llegada-lista', 'APL-LLEGADA') == ('COMPLETADO', False)
    assert aplicacion('final', 'APL-LLEGADA') == ('COMPLETADO', True)
    assert aplicacion('reiniciado', 'APL-RIASEC') == ('EN_PROGRESO', False)
    TypeAdapter(list[ItemPublico]).validate_python(datos['items-t-llegada'])
    RespuestaRevelarResultado.model_validate(datos['revelar-llegada'])
    assert {d.zona for d in ResultadoPublico.model_validate(datos['resultado-llegada']).dimensiones} >= {'FUERTE'}
    assert RespuestaRevelarResultado.model_validate(datos['revelar-riasec-plano']).perfil_plano
    assert ResultadoPublico.model_validate(datos['resultado-riasec-plano']).ocupaciones is None
    plano, = TypeAdapter(list[ResultadoHistorico]).validate_python(datos['historial-riasec-plano'])
    assert plano.perfil_plano and plano.anulado_en is None
    anulado, = TypeAdapter(list[ResultadoHistorico]).validate_python(datos['historial-riasec'])
    assert anulado.perfil_plano and anulado.anulado_en is not None
    RespuestaReiniciarInstrumento.model_validate(datos['reiniciar-riasec'])
    assert {(r.estado, tuple(r.opciones or ())) for r in ReferenciasConsultadas.model_validate(
        datos['referencias-t-contraste-plano']).referencias} == {('DISPONIBLE', ())}
    assert {r.estado for r in ReferenciasConsultadas.model_validate(
        datos['referencias-t-contraste-reiniciado']).referencias} == {'SIN_DATO'}
    assert datos['familia-resultados-sin-diploma']['detail']['mensaje']
    assert {i.codigo for i in TypeAdapter(list[InstrumentoPublico]).validate_python(datos['instrumentos'])} >= {
        'TEST-RIASEC', 'TEST-PARTIDA-LLEGADA'}
    TypeAdapter(list[ItemRegistroPublico]).validate_python(datos['items-registro-t-expectativas'])
    # Ajuste registros llm (lote 3): ítem por ítem (sin LLM en `ruta`: SIGUIENTE) y terminar, que emite
    # REGISTRO_ADECUADO (abre la misión adicional); nunca hay clasificaciones.
    paso = PasoRegistro.model_validate(datos['responder-t-exp-ruta'])
    assert (paso.item, paso.paso, paso.repregunta, paso.mensaje) == ('t-exp-ruta', 'SIGUIENTE', None, None)
    entrega = RespuestaRegistroAccion.model_validate(datos['entregar-t-expectativas'])
    assert entrega.estado == 'COMPLETADA' and all(i.respuesta for i in entrega.items) and entrega.item_actual is None
    assert 'R-t-adicional' in {d.regla for d in entrega.nuevos_desbloqueos}
    assert not {'clasificacion', 'tipo_final', 'motivo'} & set(json.dumps(datos['entregar-t-expectativas']).split('"'))
    cerrado = RegistroConsultado.model_validate(datos['registro-t-expectativas-cerrado'])
    assert cerrado.estado == 'COMPLETADA' and all(i.respuesta.primera_respuesta for i in cerrado.items)
    assert [(o.codigo, o.texto) for o in cerrado.items[0].respuesta.opciones_elegidas] == [
        ('INSTITUTO', 'Estudiar en un instituto'), ('OTRA-1', 'Viajar un año')]
    # F01: t-valores elige en orden.
    orden = TypeAdapter(list[ItemRegistroPublico]).validate_python(datos['items-registro-t-valores'])[0]
    assert orden.eleccion.ordenada and orden.eleccion.minima == orden.eleccion.maxima == 3
    valores = RespuestaRegistroAccion.model_validate(datos['entregar-t-valores'])
    assert valores.estado == 'COMPLETADA'
    assert [o.codigo for o in valores.items[0].respuesta.opciones_elegidas] == ['CREAR', 'LIBERTAD', 'ESTABILIDAD']
    # B05: t-eco retoma la elección; el texto queda sin dato (un ítem sin LLM no deja texto citable).
    ruta_eco, espera_eco = TypeAdapter(list[ItemRegistroPublico]).validate_python(datos['items-registro-t-eco'])
    # F02: retoma la elección de t-exp-ruta con su misma lista; la referencia solo marca lo elegido antes.
    assert ruta_eco.eleccion.referencia == 't-ref-rutas' and ruta_eco.eleccion.lista == 'RUTAS_DESPUES_COLEGIO'
    assert ruta_eco.eleccion.opciones
    assert espera_eco.eleccion is None
    referencias = ReferenciasConsultadas.model_validate(datos['referencias-t-eco'])
    assert [(r.codigo, r.estado) for r in referencias.referencias] == [
        ('t-ref-espera', 'SIN_DATO'), ('t-ref-rutas', 'DISPONIBLE')]
    assert referencias.referencias[0].texto is None and referencias.referencias[1].opciones
    assert 'clasificacion' not in json.dumps(datos['referencias-t-eco'])
    # F02: sin entregar, sin dato; ELECCION y TEXTO nombran su actividad en todo estado.
    sin_dato = ReferenciasConsultadas.model_validate(datos['referencias-t-eco-sin-dato']).referencias
    assert [r.estado for r in sin_dato] == ['SIN_DATO', 'SIN_DATO']
    assert all(r.actividad == 't-expectativas' for r in (*sin_dato, *referencias.referencias))
    contraste = ReferenciasConsultadas.model_validate(datos['referencias-t-contraste'])
    assert [(r.codigo, r.tipo, r.estado) for r in contraste.referencias] == [
        ('t-ref-coincidencias', 'COINCIDENCIAS', 'DISPONIBLE'), ('t-ref-resultado', 'RESULTADO', 'DISPONIBLE')]
    assert all(r.opciones for r in contraste.referencias)
    inicial = estados(datos['actividades-inicial'])
    assert inicial['t-inicio'] == 'DISPONIBLE'
    assert all(e == 'BLOQUEADA' for c, e in inicial.items() if c != 't-inicio')
    assert datos['resumen-inicial']['nivel_actual']['numero'] == 1
    assert any(i['codigo'] == '???' for i in datos['logros-inicial']['insignias'])
    assert {d['regla'] for d in datos['completar-t-inicio']['nuevos_desbloqueos']} == {
        'R-t-partida', 'R-t-batalla', 'R-t-ficha', 'R-t-ficha-2', 'R-t-ins-1', 'R-SEC-DIARIO', 'R-SEC-CATALOGO', 'R-SEC-PLANES',
        'R-t-diario-fija', 'R-PLAN-POR_QUE'}
    assert [e['codigo'] for e in datos['completar-t-inicio']['entradas_desbloqueadas']] == ['t-diario-fija']
    cierre = datos['completar-t-cierre-inicio']
    assert {d['regla'] for d in cierre['nuevos_desbloqueos']} == {'R-T1', 'R-NIV-2', 'R-SEC-CHECK_IN'}
    for nombre in ('secciones-inicial', 'secciones-t1', 'apoderado-secciones-inicial', 'apoderado-secciones-final'):
        TypeAdapter(list[SeccionEstado]).validate_python(datos[nombre])
    assert all(s['estado'] == 'BLOQUEADA' and s['bloqueo'] for s in datos['secciones-inicial'])
    assert {s['codigo']: s['estado'] for s in datos['secciones-t1']} == {
        'CATALOGO': 'DISPONIBLE', 'CHECK_IN': 'DISPONIBLE', 'DIARIO': 'DISPONIBLE', 'FAMILIA': 'BLOQUEADA',
        'INVESTIGACIONES': 'BLOQUEADA', 'LIBRO_HELENA': 'DISPONIBLE', 'PLANES': 'DISPONIBLE'}
    assert [(s['codigo'], s['estado']) for s in datos['apoderado-secciones-inicial']] == [('CONVERSACIONES', 'BLOQUEADA')]
    assert [(s['codigo'], s['estado']) for s in datos['apoderado-secciones-final']] == [('CONVERSACIONES', 'DISPONIBLE')]
    # Ajuste presentaciones-vistas.
    assert PresentacionesCuenta.model_validate(datos['presentaciones-inicial']).vistas == []
    assert PresentacionesCuenta.model_validate(datos['presentacion-vista']).vistas == ['missions']
    assert cierre['eventos_registrados'][-1]['referencia'] == 'T0'
    assert estados(datos['actividades-t1'])['t-expectativas'] == 'DISPONIBLE'
    ciudad = next(b for b in datos['actividades-ciudad'] if b['codigo'] == 'CIUDAD')
    assert ciudad['estado'] == 'DISPONIBLE'
    assert [(a['codigo'], a['estado']) for a in ciudad['actividades']] == [
        ('t-mision-intereses', 'DISPONIBLE'), ('t-mision-intereses-2', 'BLOQUEADA'),
        ('t-mision-inteligencias', 'DISPONIBLE'), ('t-mision-habilidades', 'DISPONIBLE'), ('t-caso', 'BLOQUEADA'),
        ('t-contraste', 'BLOQUEADA'), ('t-caso-2', 'BLOQUEADA'), ('t-investigador', 'DISPONIBLE'),
        # Ajuste registros: `t-referencia`, sin regla propia.
        ('t-investigador-cierre', 'BLOQUEADA'), ('t-referencia', 'DISPONIBLE')]
    assert next(b for b in datos['actividades-inicial'] if b['codigo'] == 'CIUDAD')['bloqueo'][0]['mensaje']
    items = datos['items-t-mision-intereses']
    assert [i['codigo'] for i in items] == [f'RIASEC-{n:02}' for n in range(1, 31)]
    assert len(items[0]['escala']['opciones']) == 5
    resultado = datos['resultado-riasec']
    assert resultado['calculado_en'] == exportador.FECHA
    assert resultado['codigo_interes'] == {'codigo': 'IRA', 'hay_empate': False}
    assert {d['codigo']: d['puntaje_visual'] for d in resultado['dimensiones']} == {
        'I': 100, 'R': 75, 'A': 50, 'S': 0, 'E': 0, 'C': 0,
    }
    # Ajuste resultados-intereses: ocupaciones afines con parecido y banda, por área y familias; sin favoritos.
    assert 10 <= len(resultado['ocupaciones']) <= 30 and resultado['perfil_poco_marcado'] is False
    assert '19-2042.00' in [c['codigo'] for c in resultado['ocupaciones']]
    assert resultado['familias'] and resultado['por_area'] and resultado['mensaje'] and resultado['lectura']
    assert 'es_favorita' not in resultado['ocupaciones'][0] and 'carreras_recomendadas' not in resultado
    assert datos['catalogo-familia']['recomendada_posicion'] == 1
    assert datos['catalogo-ocupacion-afin']['afinidad']['parecido'] == resultado['ocupaciones'][0]['parecido']
    assert {o['via_familia'] for o in datos['catalogo-ocupaciones-familia']['items']} <= {'PRINCIPAL', 'SECUNDARIA'}
    # B10: catálogo, vistas y favoritos.
    # F06: listados paginados, opciones de filtro, lugar inesperado y filtro de favoritos.
    carreras = PaginaCarreras.model_validate(datos['catalogo-carreras'])
    assert (carreras.total, carreras.total_dominio, len(carreras.items)) == (603, 603, 4)
    PaginaOcupaciones.model_validate(datos['catalogo-ocupaciones-riasec'])
    instituciones = PaginaInstituciones.model_validate(datos['catalogo-instituciones'])
    assert (instituciones.total, len(instituciones.items)) == (706, 20)
    assert CarreraDetalle.model_validate(datos['catalogo-carrera-psychology']).ingreso.nacional.jovenes.promedio == 2824
    assert OcupacionDetalle.model_validate(datos['catalogo-ocupacion-psychologist']).aptitudes
    directorio = TypeAdapter(list[OcupacionCaso]).validate_python(datos['ocupaciones-caso'])
    assert [o.codigo for o in directorio] == list(exportador.DIRECTORIO_T_CASO) and all(o.titulo for o in directorio)
    assert InstitucionDetalle.model_validate(datos['catalogo-institucion-t-uni']).pagina_web
    assert all('SI' in ''.join(o['riasec']) for o in datos['catalogo-ocupaciones-riasec']['items'])
    TypeAdapter(list[FamiliaPublica]).validate_python(datos['catalogo-familias'])
    assert len(TypeAdapter(list[UbicacionPublica]).validate_python(datos['catalogo-ubicaciones'])) == 25
    assert datos['catalogo-inesperada'] == {'codigo': 'mtpe-1', 'revisitando': False}
    assert {d['regla'] for d in datos['ver-carrera']['nuevos_desbloqueos']} == {'R-t-explorar-carrera'}
    favoritas = PaginaCarreras.model_validate(datos['catalogo-carreras-favoritos'])
    # F07a: las carreras de los planes también son favoritas (un plan se crea desde una favorita).
    assert {c.codigo for c in favoritas.items} == {ING_CIVIL, PSICOLOGIA, PERIODISMO}
    assert all(c.es_favorita for c in favoritas.items)
    assert [e['tipo'] for e in datos['marcar-favorito']['eventos_registrados']] == ['MARCA_FAVORITO']
    favoritos = FavoritosCuenta.model_validate(datos['favoritos'])
    assert ({c.codigo for c in favoritos.carreras}, [o.codigo for o in favoritos.ocupaciones],
            [i.codigo for i in favoritos.instituciones]) == ({ING_CIVIL, PSICOLOGIA, PERIODISMO}, ['19-2042.00'],
                                                             [INST_UNI])
    # B09: diario, check-ins y temáticas.
    preguntas = TypeAdapter(list[PreguntaDiarioEstado]).validate_python(datos['diario-preguntas'])
    # Ajuste cartas-diario: la carta adaptada llega armada (INSTITUTO en t-exp-ruta, variante OTRA_RUTA).
    carta = 'DATO DE PRUEBA: pensaste en el instituto. ¿Cómo te sientes con eso?'
    assert [(p.codigo, p.redactada) for p in preguntas] == [('t-diario-fija', True), ('t-diario-personal', True),
                                                            ('t-diario-tras-conversar', False)]
    assert datos['entregar-t-expectativas']['entradas_desbloqueadas'][0]['texto'] == carta
    PreguntaDelDia.model_validate(datos['pregunta-del-dia'])
    entradas = TypeAdapter(list[EntradaDiarioPublica]).validate_python(datos['diario-entradas'])
    assert sorted((e.numero, e.origen, e.titulo_mostrado) for e in entradas)[3] == (4, 'LIBRE', 'Mi tarde')
    assert [e.numero for e in entradas if e.numero == 5] == []
    assert AmistadAsistente.model_validate(datos['diario-amistad']).puntos == 3
    # Ajuste del diario (F05): bandeja, remitente y archivo.
    assert PreguntaDiarioEstado.model_validate(datos['desarchivar-pregunta']).bandeja == 'PENDIENTE'
    assert PreguntaDiarioEstado.model_validate(datos['archivar-pregunta']).bandeja == 'ARCHIVADA'
    buzon = {p.codigo: p for p in TypeAdapter(list[PreguntaDiarioEstado]).validate_python(
        datos['diario-preguntas-buzon'])}
    assert (buzon['t-diario-fija'].bandeja, buzon['t-diario-fija'].entrada) == ('RESPONDIDA', 1)
    assert buzon['t-diario-fija'].actividad.codigo == 't-inicio'
    assert (buzon['t-diario-personal'].bandeja, buzon['t-diario-personal'].actividad.codigo) == (
        'ARCHIVADA', 't-expectativas')
    assert buzon['t-diario-tras-conversar'].bandeja is None
    check_ins = CheckInsCuenta.model_validate(datos['check-ins'])
    assert check_ins.dias_registrados == 2 and check_ins.registrado_hoy  # «hoy» fijado en FECHA (F05)
    assert any(t.completadas for t in TypeAdapter(list[AvanceTematica]).validate_python(datos['tematicas']))
    assert 'afinidad' in datos['logros-final']
    # Ajuste del panel (F05): el avance del panel, con total fijo, en cada momento; la Ciudad es la afinidad.
    for momento in ('inicial', 't1', 'ciudad', 't2', 'final'):
        AvanceEstudiante.model_validate(datos[f'avance-{momento}'])
    assert datos['avance-final']['ciudad']['porcentaje'] == datos['logros-final']['afinidad']
    assert {datos[f'avance-{m}']['camino']['total'] for m in ('inicial', 't1', 'ciudad', 't2', 'final')} == {14}
    # Ajuste notificaciones: los logros del camino de Ana (sin actividades, secciones ni preguntas), sin ver.
    campana = PaginaNotificaciones.model_validate(datos['notificaciones'])
    assert {(n.tipo, n.detalle, n.referencia) for n in campana.items} == {
        ('DESBLOQUEO', 'FICHA', 't-ficha'), ('DESBLOQUEO', 'FICHA', 't-ficha-2'), ('DESBLOQUEO', 'INSIGNIA', 't-ins-1'),
        ('DESBLOQUEO', 'NIVEL', 'N2'), ('DESBLOQUEO', 'BLOQUE', 'CIUDAD')}
    assert campana.total == campana.no_vistas == len(campana.items)
    assert all(not n.vista and n.creada_en.isoformat() == exportador.FECHA for n in campana.items)
    assert datos['notificaciones-marcar-una'] == {'marcadas': 1}
    assert PaginaNotificaciones.model_validate(datos['notificaciones-pagina-2']).items == []
    autora = PaginaNotificaciones.model_validate(datos['notificaciones-autora'])
    assert [n.tipo for n in autora.items[:2]] == ['ENTREVISTA_DESTACADA', 'REACCION_ENTREVISTA']
    assert autora.items[1].detalle == 'Aprendí algo' and autora.no_vistas < autora.total
    rosa = PaginaNotificaciones.model_validate(datos['notificaciones-apoderado'])
    assert {(n.tipo, n.referencia, n.estudiante) for n in rosa.items} == {
        ('RESPUESTA_CONVERSACION', 't-conv-1', 'est-ana'), ('RESPUESTA_CONVERSACION', 't-conv-2', 'est-ana'),
        ('DESBLOQUEO', 't-ficha-apo', None)}
    assert [(f['codigo'], f['estado']) for f in datos['fichas-inicial']] == [
        ('t-ficha', 'BLOQUEADA'), ('t-ficha-2', 'BLOQUEADA'), ('t-ficha-3', 'BLOQUEADA')]
    # Ajuste mochila: abrir t-ficha (ver-ficha) la deja vista; t-ficha-2 sigue nueva y t-ficha-3, bloqueada.
    RespuestaAccion.model_validate(datos['ver-ficha'])
    assert FichaDetalle.model_validate(datos['ficha-t-ficha']).contenido.startswith('Muchas decisiones')
    assert [e['tipo'] for e in datos['marcar-favorito-ficha']['eventos_registrados']] == ['MARCA_FAVORITO_FICHA']
    assert [f['es_favorita'] for f in datos['fichas-final']] == [True, False, False]
    assert [(f['codigo'], f['estado'], f['visto'], (f['tramo'] or {}).get('numero'))
            for f in datos['fichas-final']] == [
        ('t-ficha', 'DISPONIBLE', True, 1), ('t-ficha-2', 'DISPONIBLE', False, 1),
        ('t-ficha-3', 'BLOQUEADA', False, None)]
    assert [n['estado'] for n in datos['logros-final']['niveles']] == ['OBTENIDO', 'OBTENIDO', 'BLOQUEADO']
    # B08: batalla con reintento, caso superado, colección y testimonios.
    derrota, victoria = (RespuestaResolverBatalla.model_validate(datos[nombre])
                         for nombre in ('resolver-batalla-derrota', 'resolver-batalla-victoria'))
    assert (derrota.victoria, derrota.aciertos, derrota.preguntas, derrota.destellos_restantes) == (False, 1, 4, 0)
    assert (victoria.victoria, victoria.practica, victoria.aciertos, victoria.destellos_restantes) == (True, False, 5, 2)
    assert datos['resolver-batalla-derrota']['eventos_registrados'] == []
    assert datos['resolver-batalla-victoria']['nuevos_desbloqueos'] == []
    batalla, = TypeAdapter(list[BatallaCuenta]).validate_python(datos['batallas'])
    assert (batalla.estado, batalla.intentos, batalla.primer_intento.victoria) == ('COMPLETADA', 2, False)
    assert (batalla.primer_intento.aciertos, batalla.primer_intento.preguntas) == (1, 4)
    assert [(f.codigo, f.estado) for f in batalla.fichas] == [('t-ficha', 'DISPONIBLE'), ('t-ficha-2', 'DISPONIBLE')]
    # F04b: las preguntas del intento, con semilla fija.
    preguntas = TypeAdapter(list[PreguntaIntento]).validate_python(datos['preguntas-batalla'])
    assert len(preguntas) == batalla.preguntas_por_intento == 7
    assert (batalla.vidas_enemigo, batalla.destellos) == (5, 3)
    superado = RespuestaResolverCaso.model_validate(datos['resolver-caso'])
    assert [(o.codigo, o.titulo) for o in superado.ocupaciones_nuevas] == [
        ('19-3091.00', 'Antropólogo y arqueólogo'), ('25-4013.00', 'Conservador y restaurador')]
    # Ajuste mochila: el segundo testimonio pide además el proyecto; t-caso-2 sigue cerrado.
    assert {d.regla for d in superado.nuevos_desbloqueos} == {'R-t-testimonio-1'}
    caso, otro = TypeAdapter(list[CasoCuenta]).validate_python(datos['casos'])
    assert (otro.actividad, otro.estado) == ('t-caso-2', 'BLOQUEADA')
    assert (caso.puntaje_maximo, caso.estado, caso.intentos, caso.superado) == (8, 'COMPLETADA', 2, True)
    assert [o.ocupacion for o in TypeAdapter(list[OcupacionColeccion]).validate_python(datos['coleccion'])] == [
        '19-3091.00', '25-4013.00']
    inicial = TypeAdapter(list[TestimonioEstado]).validate_python(datos['testimonios-inicial'])
    assert [(t.estado, t.pista is not None, t.video_id) for t in inicial] == [('BLOQUEADA', True, None)] * 4
    final = TypeAdapter(list[TestimonioEstado]).validate_python(datos['testimonios-final'])
    # Ajuste mochila: el segundo pide además el proyecto (bloqueado con su caso disponible); los dos últimos
    # esperan un caso que el recorrido no abre.
    assert [(t.estado, t.visto, t.pista is None, t.caso_disponible) for t in final] == [
        ('DISPONIBLE', True, True, True), ('BLOQUEADA', False, False, True),
        ('BLOQUEADA', False, False, False), ('BLOQUEADA', False, False, False)]
    # Ajustes Central (7): quién lo cuenta, solo disponible; el caso que lo regala, siempre.
    assert [(t.persona, t.caso.codigo) for t in inicial] == [
        (None, 't-caso'), (None, 't-caso'), (None, 't-caso-2'), (None, 't-caso-2')]
    assert [(t.persona, t.ocupacion and t.ocupacion.codigo, t.video_id, t.contexto) for t in final] == [
        ('Luis Mendoza', '19-3091.00', 'ysz5S6PUM-U', None), (None, None, None, None),
        (None, None, None, None), (None, None, None, None)]
    # B11: planes con sus secciones, requisitos de comparar y proyecto, y referencias de planes.
    for nombre in ('crear-plan', 'guardar-seccion-por-que', 'guardar-seccion-conocimiento', 'guardar-seccion-realidad',
                   'medidores-plan', 'guardar-seccion-pasos', 'paso-hecho'):
        RespuestaAccion.model_validate(datos[nombre])
    assert datos['crear-plan-no-favorita']['detail']['mensaje'] == 'Primero guarda la carrera en tus favoritos'
    # F07a, con est-luis: dos planes de la misma familia, POR_QUE corto en proceso, ordenar y eliminar.
    assert 'mensaje' in datos['guardar-seccion-bloqueada']['detail']
    familia = PlanesCuenta.model_validate(datos['planes-misma-familia'])
    assert [(a.tipo, a.planes) for a in familia.avisos] == [('MISMA_FAMILIA', ['A', 'B'])]
    assert [s.estado for s in familia.planes[0].secciones] == ['EN_PROCESO', 'BLOQUEADA', 'BLOQUEADA', 'BLOQUEADA']
    for nombre in ('ordenar-planes', 'eliminar-plan'):
        RespuestaAccion.model_validate(datos[nombre])
    assert [p.carrera.codigo for p in PlanesCuenta.model_validate(datos['planes-tras-eliminar']).planes] == [
        PSICOLOGIA]
    assert {d['regla'] for d in datos['guardar-seccion-realidad']['nuevos_desbloqueos']} == {'R-t-comparar'}
    assert {d['regla'] for d in datos['guardar-seccion-pasos']['nuevos_desbloqueos']} == {'R-t-proyecto'}
    planes = PlanesCuenta.model_validate(datos['planes'])
    assert [(p.prioridad, p.carrera.codigo, p.lista_para_comparar) for p in planes.planes] == [
        ('A', PSICOLOGIA, True), ('B', PERIODISMO, True)]
    assert [s.estado for s in planes.planes[0].secciones] == ['LISTA', 'LISTA', 'LISTA', 'LISTA']
    assert planes.opcion_inicial.codigo == PSICOLOGIA and planes.avisos == []
    assert {s.generada_por for s in planes.planes[0].sugerencias} == {'LLM'}
    comparar, = ReferenciasConsultadas.model_validate(datos['referencias-t-comparar']).referencias
    assert [o.codigo for o in comparar.opciones] == [PSICOLOGIA, PERIODISMO]
    proyecto = {r.tipo: r for r in ReferenciasConsultadas.model_validate(datos['referencias-t-proyecto']).referencias}
    assert proyecto['PLAN'].cita.startswith('DATO DE PRUEBA') and proyecto['OPCION_INICIAL'].texto == 'Psicología'
    # B12: ruta del apoderado, resultados del hijo, conversaciones y cartas.
    familia = FamiliaApoderado.model_validate(datos['familia'])
    assert familia.diploma.obtenido and familia.avance.porcentaje == 100.0
    # Ajuste inicio-apoderado: los dos hijos, cada uno con sus cuestionarios visibles y su estado.
    assert [e.codigo for e in familia.estudiantes] == ['est-ana', 'est-luis']
    assert [c.instrumento for c in familia.estudiantes[0].cuestionarios] == ['TEST-RIASEC']
    assert familia.estudiantes[0].cuestionarios[0].aplicaciones[0].completado_en is not None
    assert [r['instrumento'] for r in datos['familia-resultados']] == ['TEST-RIASEC']
    assert all(r['instrumento'] == 'TEST-RIASEC' for r in datos['familia-resultados-luis'])
    assert familia.diploma.codigo.startswith('EXP-AP-')
    assert ConversacionesCuenta.model_validate(datos['conversaciones-sin-carta']).carta_pendiente
    assert {d['regla'] for d in datos['escribir-carta-est-ana']['nuevos_desbloqueos']} == {'R-t-conv-1'}
    luis = ConversacionesCuenta.model_validate(datos['apoderado-conversaciones-sin-carta'])
    assert luis.carta_pendiente and luis.otro.codigo == 'est-luis'
    carta = ConversacionesCuenta.model_validate(datos['conversaciones-estudiante-carta'])
    assert [c.estado for c in carta.conversaciones] == ['sin_responder', 'bloqueada']
    RespuestaAgrupada.model_validate(datos['responder-conversacion'])
    te_toca = ConversacionesCuenta.model_validate(datos['conversaciones-te-toca'])
    assert [(c.codigo, c.estado, c.respuesta_otro, c.abierta_para_hijo) for c in te_toca.conversaciones] == [
        ('t-conv-1', 'te_toca', None, True), ('t-conv-2', 'sin_responder', None, False)]
    esperando = ConversacionesCuenta.model_validate(datos['conversaciones-esperando'])
    assert esperando.conversaciones[0].estado == 'esperando_al_otro'
    segundo = datos['responder-conversacion-segundo']['por_cuenta']
    for cuenta in ('est-ana', 'apo-rosa'):
        assert [e['tipo'] for e in segundo[cuenta]['eventos_registrados']] == ['COMPLETA_CONVERSACION']
    conversada = ConversacionesCuenta.model_validate(datos['conversaciones-conversada']).conversaciones[0]
    assert conversada.estado == 'conversada' and conversada.preguntas_guia and conversada.algo_que_saben
    assert conversada.entrada_diario.codigo == 't-diario-tras-conversar'
    assert ConversacionesCuenta.model_validate(datos['conversaciones-apoderado-conversada']).conversaciones[
        0].entrada_diario is None
    for nombre, carta_otro in (('conversaciones-final', 'apo-rosa'), ('conversaciones-apoderado-final', 'est-ana')):
        final = ConversacionesCuenta.model_validate(datos[nombre])
        assert (final.completadas, final.total, final.cartas_disponibles) == (2, 2, True)
        assert final.carta_recibida == f'DATO DE PRUEBA: carta de {carta_otro}.'
        assert {c.estado for c in final.conversaciones} == {'conversada'}
    fichas_inicio = [FichaCuenta.model_validate(f) for f in datos['apoderado-fichas-inicial']]
    assert [(f.codigo, f.estado, f.actividad.codigo) for f in fichas_inicio] == [('t-ficha-apo', 'BLOQUEADA', 't-apo-1')]
    assert FichaDetalle.model_validate(datos['apoderado-ficha-t-ficha-apo']).codigo == 't-ficha-apo'
    # B13: investigaciones, entrevistas y publicaciones con el esquema de la respuesta.
    inicial = InvestigacionesCuenta.model_validate(datos['investigaciones-inicial'])
    assert inicial.en_curso is None and inicial.favoritos_leyenda == 3 and len(inicial.tipos_reaccion) == 4
    assert SugerenciasGuion.model_validate(datos['sugerencias-guion']).estado == 'LISTAS'
    guia = InvestigacionesCuenta.model_validate(datos['investigaciones-guia-lista'])
    assert guia.en_curso.estado == 'GUIA_LISTA' and [a.codigo for a in guia.aliados.misma_familia] == ['est-luis']
    entrevista = RespuestaAgrupada.model_validate(datos['publicar-entrevista']).por_cuenta['est-ana']
    codigo = entrevista.eventos_registrados[0].referencia
    salon = PaginaEntrevistas.model_validate(datos['entrevistas-salon'])
    assert [(t.codigo, t.destacada, t.favorita, t.vista) for t in salon.items] == [(codigo, True, True, True)]
    assert PaginaEntrevistas.model_validate(datos['entrevistas-mias']).items[0].reacciones_por_tipo == {'APRENDI': 1}
    ficha = EntrevistaDetalle.model_validate(datos['entrevista-detalle'])
    assert [(r.tipo, r.propia) for r in ficha.lista_reacciones] == [('APRENDI', True), (None, False)]
    fila, = PaginaPublicaciones.model_validate(datos['publicaciones']).items
    assert (fila.codigo, fila.estado, fila.favoritos, fila.reacciones) == (codigo, 'DESTACADA', 1, 1)
    detalle_orientadora = PublicacionDetalle.model_validate(datos['publicacion-detalle'])
    assert detalle_orientadora.autores[0].lo_que_pensaba.duda == '¿Es peligroso?'
    # F09: la reacción reportada va primero, con el salón de su autor.
    reportada = detalle_orientadora.reacciones[0]
    assert (reportada.autor.codigo, reportada.autor.salon, len(reportada.reportes)) == ('est-luis', '5A', 1)
    en_curso = InvestigacionesCuenta.model_validate(datos['investigaciones-en-curso']).en_curso
    assert en_curso.estado == 'EN_CURSO' and en_curso.sugerencias and en_curso.sugerencias_vigentes
    luis = InvestigacionesCuenta.model_validate(datos['investigaciones-luis'])
    assert luis.en_curso.estado == 'GUIA_LISTA' and luis.conteos.mias == 0 and luis.conteos.salon == 1
    assert [t.codigo for t in PaginaEntrevistas.model_validate(datos['entrevistas-familia']).items] == [codigo]
    propia = EntrevistaDetalle.model_validate(datos['entrevista-detalle-propia'])
    assert propia.propia and [r.reportada_por_mi for r in propia.lista_reacciones if r.tipo] == [True]
    eco, = ReferenciasConsultadas.model_validate(datos['referencias-investigador-cierre']).referencias
    assert eco.tipo == 'LO_QUE_PIENSO' and eco.estado == 'DISPONIBLE'
    # Regenera sobre archivos existentes sin tocar otros archivos del destino.
    conservar = destino / 'ruta' / 'conservar.txt'
    conservar.write_text('Conservar', encoding='utf-8')
    exportador.exportar_fixtures(destino)
    assert {ruta.name: ruta.read_bytes() for ruta in archivos} == bytes_antes
    assert conservar.read_text(encoding='utf-8') == 'Conservar'
    # Dos exportaciones, cada una con tres bases: ruta, el registro b1-1 y los registros de piezas (lote 2).
    assert len(bases) == 6 and all(not ruta.parent.exists() for ruta in bases)
    assert ruta_ajena.read_bytes() == b'Base del usuario: conservar estos bytes'


def test_fallo_del_recorrido_no_escribe_fixtures(tmp_path, monkeypatch):
    destino = tmp_path / 'no-publicado'

    def fallar(cliente):
        raise RuntimeError('Fallo de prueba del recorrido')

    monkeypatch.setattr(exportador, '_recorrer', fallar)
    with pytest.raises(RuntimeError, match='Fallo de prueba del recorrido'):
        exportador.exportar_fixtures(destino)
    assert not destino.exists()


def test_fixtures_de_cuentas_y_apoderado(tmp_path):
    datos = leer(exportador.exportar_fixtures(tmp_path / 'servidor'))
    cuentas = TypeAdapter(list[CuentaResumen]).validate_python(datos['cuentas'])
    assert [(c.codigo, c.rol) for c in cuentas] == [
        ('apo-rosa', 'APODERADO'), ('est-ana', 'ESTUDIANTE'), ('est-beto', 'ESTUDIANTE'), ('est-luis', 'ESTUDIANTE'),
        ('est-mia', 'ESTUDIANTE'), ('est-sol', 'ESTUDIANTE'), ('est-teo', 'ESTUDIANTE'), ('ori-carmen', 'ORIENTADORA'),
    ]
    for momento in ('inicial', 'final'):
        TypeAdapter(list[BloqueActividades]).validate_python(datos[f'apoderado-actividades-{momento}'])
    assert datos['apoderado-actividades-inicial'] == [BLOQUE_FAMILIA]
    bloque, = datos['apoderado-actividades-final']
    assert bloque['actividades'] == [{**a, 'estado': 'COMPLETADA', 'bloqueo': None} for a in BLOQUE_FAMILIA['actividades']]


def test_fallo_del_apoderado_no_escribe_fixtures(tmp_path, monkeypatch):
    destino = tmp_path / 'sin-publicar'

    def fallar(cliente):
        raise RuntimeError('Fallo de prueba del apoderado')

    monkeypatch.setattr(exportador, '_recorrer_apoderado', fallar)
    with pytest.raises(RuntimeError, match='Fallo de prueba del apoderado'):
        exportador.exportar_fixtures(destino)
    assert not destino.exists()


def test_cli_exporta_los_fixtures_de_ruta(tmp_path):
    destino = tmp_path / 'front' / 'tests' / 'fixtures' / 'servidor'
    resultado = subprocess.run([sys.executable, str(SCRIPT), '--destino', str(destino)],
                               cwd=tmp_path, capture_output=True, text=True)
    assert resultado.returncode == 0, resultado.stderr
    assert f'Exportados {len(NOMBRES) + len(NOMBRES_CONTENIDO)} fixtures' in resultado.stdout
    assert {ruta.name for ruta in (destino / 'ruta').glob('*.json')} == NOMBRES
    assert {ruta.name for ruta in (destino / 'contenido').glob('*.json')} == NOMBRES_CONTENIDO
    assert list(destino.glob('*.json')) == []


def test_fixtures_de_sesion(tmp_path):
    """B17: ingreso y sesión de cada rol con token y vencimiento fijos; el error de credenciales."""
    from app.schemas.sesion import IngresoRespuesta, SesionRespuesta
    datos = leer(exportador.exportar_fixtures(tmp_path / 'servidor'))
    for codigo, rol in exportador.ROLES_SESION:
        ingreso = IngresoRespuesta.model_validate(datos[f'sesion-ingresar-{rol}'])
        assert ingreso.token == exportador.TOKEN_FIJO and ingreso.cuenta.codigo == codigo
        sesion = SesionRespuesta.model_validate(datos[f'sesion-{rol}'])
        assert sesion.cuenta.codigo == codigo
    assert [h.codigo for h in SesionRespuesta.model_validate(datos['sesion-apoderado']).hijos] == [
        'est-ana', 'est-luis']
    assert [s.codigo for s in SesionRespuesta.model_validate(datos['sesion-orientadora']).salones] == ['5A']
    assert datos['sesion-error'] == {'detail': {'mensaje': 'Usuario o contraseña incorrectos'}}


def _contrato_registro_contenido(datos):
    """Los fixtures `contenido-*` del registro b1-1 (ajuste front de registros, lote 1)."""
    datos = {n.removeprefix('contenido-'): d for n, d in datos.items()}
    inicial = RegistroConsultado.model_validate(datos['registro-b1-1-inicial'])
    assert inicial.item_actual == 'b1-1-gustos' and not any(i.respuesta for i in inicial.items)
    assert inicial.items[0].consigna.dialogo == 'Todo mapa empieza por donde uno ya estuvo.'
    pasos = {n: PasoRegistro.model_validate(d) for n, d in datos.items() if n.split('-')[0] in (
        'responder', 'seguimiento', 'reenviar')}
    assert {n: p.paso for n, p in pasos.items()} == {
        'responder-b1-1-repregunta': 'REPREGUNTA', 'seguimiento-b1-1-con-pista': 'SIGUIENTE',
        'responder-b1-1-mensaje': 'MENSAJE', 'responder-b1-1-sin-evaluar': 'MENSAJE', 'reenviar-b1-1': 'SIGUIENTE',
        'responder-b1-1-edicion': 'REPREGUNTA', 'seguimiento-b1-1-sin-pista': 'SIGUIENTE',
        'seguimiento-b1-1-mensaje': 'MENSAJE'}

    def respuesta(paso_o_registro, item):
        registro = getattr(paso_o_registro, 'registro', paso_o_registro)
        return next(i for i in registro.items if i.codigo == item).respuesta

    assert respuesta(pasos['seguimiento-b1-1-con-pista'], 'b1-1-gustos').pista
    assert respuesta(pasos['seguimiento-b1-1-sin-pista'], 'b1-1-gustos').pista is None
    assert respuesta(pasos['responder-b1-1-sin-evaluar'], 'b1-1-dificultad').reenviable
    a_medias = RegistroConsultado.model_validate(datos['registro-b1-1-a-medias'])
    assert a_medias.item_actual == 'b1-1-logro' and respuesta(a_medias, 'b1-1-gustos').pista
    sin_terminar = RegistroConsultado.model_validate(datos['registro-b1-1-sin-terminar'])
    assert (sin_terminar.item_actual, sin_terminar.estado) == (None, 'EN_CURSO')
    completado = RegistroConsultado.model_validate(datos['registro-b1-1-completado'])
    assert completado.estado == 'COMPLETADA'
    assert not {'tipo_final', 'primera_tipo', 'motivo', 'sensible', 'repregunta_cerrada'} & set(
        json.dumps(datos).split('"'))
    _contrato_registros_piezas(datos)


def _contrato_registros_piezas(datos):
    """Ajuste front de registros (lote 2): b4-1, b4-5, b5-1 y b5-3, con sus piezas y las formas de sus ecos."""
    def items(nombre):
        return {i.codigo: i for i in RegistroConsultado.model_validate(datos[nombre]).items}

    respalda = items('registro-b4-1-inicial')['b4-1-respalda']
    assert [e['forma'] for e in respalda.ecos] == ['cabecera']
    assert respalda.ecos[0]['nombre'] == 'Tu Plan A' and respalda.ecos[0]['idea_origen']
    assert all(o.origen for o in respalda.opciones) and any(o.lineas for o in respalda.opciones)
    assert [e['forma'] for e in items('registro-b4-5-inicial')['b4-5-moneda'].ecos] == ['plan_a_b']
    seguridad = items('registro-b5-1-inicial')['b5-1-seguridad']
    assert [e.get('forma') for e in seguridad.ecos] == ['proyecto', 'pasos', None]
    assert seguridad.ecos[2]['texto'] == '2 de 5'
    cambio = items('registro-b5-3-inicial')['b5-3-cambio']
    assert [e.get('nombre') for e in cambio.ecos] == ['Hoy', 'qué tan seguro/a te sientes de tu proyecto']
    assert all(o.grupo is None for o in cambio.opciones) and [o.codigo for o in cambio.opciones if o.exclusiva] == [
        'IGUAL']
    assert all(i.respuesta for actividad in ('b4-1', 'b4-5', 'b5-1', 'b5-3')
               for i in items(f'registro-{actividad}-completado').values())
