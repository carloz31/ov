"""Contrato, reproducibilidad y aislamiento del exportador de fixtures `ruta-*`."""

import json
import os
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
    RespuestaAccion, RespuestaReiniciarInstrumento, RespuestaResolverBatalla, RespuestaResolverCaso,
    RespuestaRevelarResultado,
)
from app.schemas.batallas import BatallaCuenta, PreguntaIntento
from app.schemas.casos import CasoCuenta, OcupacionColeccion
from app.schemas.diario import (
    AmistadAsistente, CheckInsCuenta, EntradaDiarioPublica, PreguntaAbierta, PreguntaDelDia, PreguntaDiarioEstado,
)
from app.schemas.tematicas import AvanceTematica
from app.schemas.catalogo import (
    CarreraDetalle, CarreraResumen, InstitucionDetalle, InstitucionResumen, OcupacionDetalle, OcupacionResumen,
)
from app.schemas.conversaciones import ConversacionesCuenta
from app.schemas.familia import FamiliaApoderado
from app.schemas.favoritos import FavoritosCuenta
from app.schemas.planes import PlanesCuenta
from app.schemas.testimonios import TestimonioEstado
from app.schemas.cuentas import CuentaResumen, DesbloqueoLegible, ResumenCuenta
from app.schemas.actividades import BloqueActividades
from app.schemas.comun import ContenidoEstado
from app.schemas.logros import LogrosCuenta
from app.schemas.secciones import SeccionEstado
from app.schemas.instrumentos import (
    AvanceInstrumento, ComparacionAutopercepcion, InstrumentoPublico, ItemPublico, RespuestasActividad,
    ResultadoHistorico, ResultadoPublico,
)
from app.schemas.registro import EstadoItemRegistro, ItemRegistroPublico, RegistroConsultado, RespuestaRegistroAccion


SCRIPT = Path(exportador.__file__).resolve()
NOMBRES = {f'ruta-{nombre}.json' for nombre in (
    'cuentas', 'resumen-inicial', 'actividades-inicial', 'actividades-t1', 'actividades-ciudad',
    'fichas-inicial', 'fichas-final', 'logros-inicial', 'logros-final',
    'completar-t-inicio', 'completar-t-cierre-inicio', 'items-t-mision-intereses', 'revelar-riasec', 'resultado-riasec',
    'desbloqueos-no-vistos', 'apoderado-actividades-inicial', 'apoderado-actividades-final',
    'secciones-inicial', 'secciones-t1', 'apoderado-secciones-inicial', 'apoderado-secciones-final',
    'items-registro-t-expectativas', 'borrador-t-expectativas', 'registro-t-expectativas-borrador',
    'entregar-t-expectativas', 'registro-t-expectativas-cerrado', 'editar-t-expectativas',
    'items-registro-t-valores', 'borrador-t-valores', 'entregar-t-valores-seguimiento', 'registro-t-valores-pendiente',
    'responder-seguimiento-t-valores', 'continuar-sin-responder-t-valores', 'registro-t-valores-por-ampliar',
    'items-registro-t-eco', 'referencias-t-eco', 'referencias-t-eco-sin-dato', 'referencias-t-eco-disponible',
    'referencias-t-contraste',
    'items-t-partida', 'respuestas-t-partida', 'revelar-partida', 'resultado-partida', 'referencias-t-lee-cuestionario', 'actividades-t2',
    'comparacion-partida-llegada', 'testimonios-inicial', 'testimonios-final', 'preguntas-batalla',
    'resolver-batalla-derrota',
    'resolver-batalla-victoria', 'batallas', 'resolver-caso', 'casos', 'coleccion',
    'catalogo-carreras', 'catalogo-carrera-psychology', 'catalogo-ocupaciones-riasec', 'catalogo-ocupacion-psychologist',
    'catalogo-instituciones', 'catalogo-institucion-t-uni', 'ver-ocupacion', 'marcar-favorito', 'favoritos',
    'diario-preguntas', 'abrir-pregunta-personal', 'pregunta-del-dia', 'escribir-entrada-fija', 'escribir-entrada-libre',
    'editar-entrada', 'diario-entradas', 'diario-amistad', 'check-ins', 'tematicas',
    'crear-plan', 'guardar-seccion-por-que', 'guardar-seccion-conocimiento', 'guardar-seccion-realidad',
    'medidores-plan', 'referencias-t-comparar', 'guardar-seccion-pasos', 'paso-hecho', 'referencias-t-proyecto',
    'planes', 'familia', 'familia-resultados', 'conversaciones-sin-carta', 'escribir-carta-est-ana',
    'escribir-carta-apo-rosa', 'responder-conversacion', 'conversaciones-te-toca', 'conversaciones-por-conversar',
    'completar-conversacion', 'conversaciones-final',
    'sesion-ingresar-estudiante', 'sesion-ingresar-apoderado', 'sesion-ingresar-orientadora',
    'sesion-estudiante', 'sesion-apoderado', 'sesion-orientadora', 'sesion-error',
    # F03: avance para el libro de Helena, llegada, perfil plano con su reinicio y resultados sin diploma.
    'avance-instrumentos-inicial', 'avance-instrumentos-partida-lista', 'avance-instrumentos-riasec-listo',
    'avance-instrumentos-llegada-lista', 'avance-instrumentos-final', 'avance-instrumentos-reiniciado',
    'items-t-mision-intereses-2', 'items-t-llegada', 'revelar-llegada', 'resultado-llegada',
    'revelar-riasec-plano', 'resultado-riasec-plano', 'historial-riasec-plano', 'historial-riasec',
    'reiniciar-riasec', 'referencias-t-contraste-plano', 'referencias-t-contraste-reiniciado',
    'familia-resultados-sin-diploma', 'items-registro-t-contraste', 'instrumentos',
)}


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
    monkeypatch.setenv('EVALUADOR', 'gemini')
    ruta_ajena = tmp_path / 'base-del-usuario.db'
    # DATO DE PRUEBA: un archivo que jamás debe abrir ni reiniciar el exportador.
    ruta_ajena.write_bytes(b'Base del usuario: conservar estos bytes')
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{ruta_ajena.as_posix()}')
    bases = []
    crear = principal.crear_aplicacion
    crear_evaluador = principal.crear_evaluador_registro

    def crear_temporal(url_bd):
        ruta = Path(url_bd.removeprefix('sqlite:///'))
        assert ruta.name == 'ruta.db' and ruta.parent.is_dir()
        assert ruta != ruta_ajena
        bases.append(ruta)
        return crear(url_bd)

    def solo_falso(configuracion):
        assert configuracion.evaluador == 'falso'
        return crear_evaluador(configuracion)

    monkeypatch.setattr(principal, 'crear_aplicacion', crear_temporal)
    monkeypatch.setattr(principal, 'crear_evaluador_registro', solo_falso)
    destino = tmp_path / 'front' / 'tests' / 'fixtures' / 'servidor'
    # Los fixtures congelados de la raíz no se tocan.
    destino.mkdir(parents=True)
    congelado = destino / 'actividades-inicial.json'
    congelado.write_text('congelado', encoding='utf-8')
    archivos = exportador.exportar_fixtures(destino)
    assert {ruta.name for ruta in archivos} == NOMBRES
    assert all(ruta.parent == destino / 'ruta' for ruta in archivos)
    assert {ruta.name for ruta in (destino / 'ruta').iterdir()} == NOMBRES
    assert congelado.read_text(encoding='utf-8') == 'congelado'
    bytes_antes = {ruta.name: ruta.read_bytes() for ruta in archivos}
    datos = leer(archivos)
    ResumenCuenta.model_validate(datos['resumen-inicial'])
    for nombre in ('actividades-inicial', 'actividades-t1', 'actividades-ciudad'):
        TypeAdapter(list[BloqueActividades]).validate_python(datos[nombre])
    for momento in ('inicial', 'final'):
        TypeAdapter(list[ContenidoEstado]).validate_python(datos[f'fichas-{momento}'])
        LogrosCuenta.model_validate(datos[f'logros-{momento}'])
    for nombre in ('completar-t-inicio', 'completar-t-cierre-inicio'):
        RespuestaAccion.model_validate(datos[nombre])
    TypeAdapter(list[ItemPublico]).validate_python(datos['items-t-mision-intereses'])
    TypeAdapter(list[DesbloqueoLegible]).validate_python(datos['desbloqueos-no-vistos'])
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
    assert all(d.puntaje is None and d.porcentaje is None for d in partida.dimensiones)
    cita, = ReferenciasConsultadas.model_validate(datos['referencias-t-lee-cuestionario']).referencias
    assert (cita.tipo, cita.estado, cita.texto) == ('RESPUESTA_CUESTIONARIO', 'DISPONIBLE', 'Bastante de acuerdo')
    assert estados(datos['actividades-t2'])['t-llegada'] == 'DISPONIBLE'
    comparacion = ComparacionAutopercepcion.model_validate(datos['comparacion-partida-llegada'])
    assert [(d.zona_partida, d.zona_llegada) for d in comparacion.dimensiones] == [
        ('EN_CAMINO', 'EN_CAMINO'), ('POR_TRABAJAR', 'FUERTE'), ('POR_TRABAJAR', 'EN_CAMINO'),
        ('FUERTE', 'EN_CAMINO'), ('POR_TRABAJAR', 'POR_TRABAJAR')]
    assert not any(i.cambio for i in comparacion.dimensiones[0].items)
    assert 'puntaje' not in json.dumps(datos['comparacion-partida-llegada'])
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
    assert ResultadoPublico.model_validate(datos['resultado-riasec-plano']).coincidencias == []
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
    EstadoItemRegistro.model_validate(datos['borrador-t-expectativas'])
    borrador = RegistroConsultado.model_validate(datos['registro-t-expectativas-borrador'])
    assert borrador.posicion == 't-exp-ruta' and borrador.respuestas[0].estado == 'BORRADOR'
    # B03: entregar todo adecuado cierra el registro y abre la misión adicional, sin clasificaciones.
    entrega = RespuestaRegistroAccion.model_validate(datos['entregar-t-expectativas'])
    assert entrega.estado == 'COMPLETADA' and entrega.items_por_ampliar == []
    assert 'R-t-adicional' in {d.regla for d in entrega.nuevos_desbloqueos}
    assert 'clasificacion' not in json.dumps(datos['entregar-t-expectativas'])
    # B04: el registro cerrado trae la consolidada y lo que se puede ampliar; editar abre un intento.
    cerrado = RegistroConsultado.model_validate(datos['registro-t-expectativas-cerrado'])
    assert cerrado.items_por_ampliar == [] and all(r.texto_consolidado for r in cerrado.respuestas)
    edicion = RespuestaRegistroAccion.model_validate(datos['editar-t-expectativas'])
    assert [r.estado for r in edicion.respuestas if r.item == 't-exp-ruta'] == ['PENDIENTE_SEGUIMIENTO']
    assert 'clasificacion' not in json.dumps(datos['editar-t-expectativas'])
    # F01: t-valores elige en orden y recibe dos preguntas; la segunda se omite y el cierre trae la pista.
    orden = TypeAdapter(list[ItemRegistroPublico]).validate_python(datos['items-registro-t-valores'])[0]
    assert orden.eleccion.ordenada and orden.eleccion.minima == orden.eleccion.maxima == 3
    pendiente = RegistroConsultado.model_validate(datos['registro-t-valores-pendiente'])
    assert [o.codigo for o in pendiente.respuestas[0].opciones_elegidas] == ['CREAR', 'LIBERTAD', 'ESTABILIDAD']
    for nombre in ('entregar-t-valores-seguimiento', 'responder-seguimiento-t-valores'):
        accion = RespuestaRegistroAccion.model_validate(datos[nombre])
        assert accion.estado == 'EN_CURSO' and accion.respuestas[0].estado == 'PENDIENTE_SEGUIMIENTO'
        assert accion.respuestas[0].conversacion[-1].tipo == 'pregunta'
    cierre_valores = RespuestaRegistroAccion.model_validate(datos['continuar-sin-responder-t-valores'])
    assert cierre_valores.estado == 'COMPLETADA' and [i.item for i in cierre_valores.items_por_ampliar] == ['t-val-orden']
    assert 'clasificacion' not in json.dumps(datos['continuar-sin-responder-t-valores'])
    # B05: t-eco retoma la elección y cita; con t-exp-espera poco desarrollada, sale «por desarrollar».
    ruta_eco, espera_eco = TypeAdapter(list[ItemRegistroPublico]).validate_python(datos['items-registro-t-eco'])
    # F02: retoma la elección de t-exp-ruta con su misma lista; la referencia solo marca lo elegido antes.
    assert ruta_eco.eleccion.referencia == 't-ref-rutas' and ruta_eco.eleccion.lista == 'RUTAS_DESPUES_COLEGIO'
    assert ruta_eco.eleccion.opciones
    assert espera_eco.eleccion is None
    referencias = ReferenciasConsultadas.model_validate(datos['referencias-t-eco'])
    assert [(r.codigo, r.estado) for r in referencias.referencias] == [
        ('t-ref-espera', 'POR_DESARROLLAR'), ('t-ref-rutas', 'DISPONIBLE')]
    assert referencias.referencias[0].texto is None and referencias.referencias[1].opciones
    assert 'clasificacion' not in json.dumps(datos['referencias-t-eco'])
    # F02: sin entregar, sin dato; ya ampliada, la cita; ELECCION y TEXTO nombran su actividad en todo estado.
    for nombre, esperados in (('referencias-t-eco-sin-dato', ['SIN_DATO', 'SIN_DATO']),
                            ('referencias-t-eco-disponible', ['DISPONIBLE', 'DISPONIBLE'])):
        resueltas = ReferenciasConsultadas.model_validate(datos[nombre]).referencias
        assert [r.estado for r in resueltas] == esperados
        assert all(r.actividad == 't-expectativas' for r in resueltas)
    assert all(r.actividad == 't-expectativas' for r in referencias.referencias)
    por_ampliar = RegistroConsultado.model_validate(datos['registro-t-valores-por-ampliar'])
    assert por_ampliar.estado == 'COMPLETADA' and [p.item for p in por_ampliar.items_por_ampliar] == ['t-val-orden']
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
        'PLANES': 'DISPONIBLE'}
    assert [(s['codigo'], s['estado']) for s in datos['apoderado-secciones-inicial']] == [('CONVERSACIONES', 'BLOQUEADA')]
    assert [(s['codigo'], s['estado']) for s in datos['apoderado-secciones-final']] == [('CONVERSACIONES', 'DISPONIBLE')]
    assert cierre['eventos_registrados'][-1]['referencia'] == 'T0'
    assert estados(datos['actividades-t1'])['t-expectativas'] == 'DISPONIBLE'
    ciudad = next(b for b in datos['actividades-ciudad'] if b['codigo'] == 'CIUDAD')
    assert ciudad['estado'] == 'DISPONIBLE'
    assert [(a['codigo'], a['estado']) for a in ciudad['actividades']] == [
        ('t-mision-intereses', 'DISPONIBLE'), ('t-mision-intereses-2', 'BLOQUEADA'), ('t-caso', 'BLOQUEADA'),
        ('t-contraste', 'BLOQUEADA')]
    assert next(b for b in datos['actividades-inicial'] if b['codigo'] == 'CIUDAD')['bloqueo'][0]['mensaje']
    items = datos['items-t-mision-intereses']
    assert [i['codigo'] for i in items] == [f'RIASEC-{n:02}' for n in range(1, 31)]
    assert len(items[0]['escala']['opciones']) == 5
    resultado = datos['resultado-riasec']
    assert resultado['calculado_en'] == exportador.FECHA
    assert resultado['codigo_interes'] == {'codigo': 'IRA', 'hay_empate': False}
    assert {d['codigo']: d['porcentaje'] for d in resultado['dimensiones']} == {
        'I': 100, 'R': 75, 'A': 50, 'S': 0, 'E': 0, 'C': 0,
    }
    assert len(resultado['coincidencias']) == 10
    assert resultado['coincidencias'][0]['codigo'] == 'geologist'
    assert {c['codigo'] for c in resultado['carreras_recomendadas']} == {
        'environmental-engineering', 'civil-engineering', 'veterinary-medicine',
    }
    # B10 · HU-026: los favoritos marcados antes de revelar se indican en el resultado.
    assert [c['codigo'] for c in resultado['coincidencias'] if c['es_favorita']] == ['geologist']
    assert [c['codigo'] for c in resultado['carreras_recomendadas'] if c['es_favorita']] == ['civil-engineering']
    # B10: catálogo, vistas y favoritos.
    TypeAdapter(list[CarreraResumen]).validate_python(datos['catalogo-carreras'])
    TypeAdapter(list[OcupacionResumen]).validate_python(datos['catalogo-ocupaciones-riasec'])
    TypeAdapter(list[InstitucionResumen]).validate_python(datos['catalogo-instituciones'])
    assert CarreraDetalle.model_validate(datos['catalogo-carrera-psychology']).ingreso.promedio_mensual == 3200
    assert OcupacionDetalle.model_validate(datos['catalogo-ocupacion-psychologist']).conocimientos
    assert InstitucionDetalle.model_validate(datos['catalogo-institucion-t-uni']).pagina_web
    assert all('SI' in ''.join(o['riasec']) for o in datos['catalogo-ocupaciones-riasec'])
    assert {d['regla'] for d in datos['ver-ocupacion']['nuevos_desbloqueos']} == {'R-t-explorar-ocupacion'}
    assert [e['tipo'] for e in datos['marcar-favorito']['eventos_registrados']] == ['MARCA_FAVORITO']
    favoritos = FavoritosCuenta.model_validate(datos['favoritos'])
    assert ([c.codigo for c in favoritos.carreras], [o.codigo for o in favoritos.ocupaciones],
            [i.codigo for i in favoritos.instituciones]) == (['civil-engineering'], ['geologist'], ['t-uni'])
    # B09: diario, check-ins y temáticas.
    preguntas = TypeAdapter(list[PreguntaDiarioEstado]).validate_python(datos['diario-preguntas'])
    assert [(p.codigo, p.redactada) for p in preguntas] == [('t-diario-fija', True), ('t-diario-personal', False),
                                                            ('t-diario-tras-conversar', False)]
    assert datos['entregar-t-expectativas']['entradas_desbloqueadas'][0]['texto'] is None
    assert PreguntaAbierta.model_validate(datos['abrir-pregunta-personal']).texto.startswith('Sobre «')
    PreguntaDelDia.model_validate(datos['pregunta-del-dia'])
    entradas = TypeAdapter(list[EntradaDiarioPublica]).validate_python(datos['diario-entradas'])
    assert sorted((e.numero, e.origen, e.titulo_mostrado) for e in entradas)[3] == (4, 'LIBRE', 'Mi tarde')
    assert [e.numero for e in entradas if e.numero == 5] == []
    assert AmistadAsistente.model_validate(datos['diario-amistad']).puntos == 3
    check_ins = CheckInsCuenta.model_validate(datos['check-ins'])
    assert check_ins.dias_registrados == 2 and check_ins.registrado_hoy  # «hoy» fijado en FECHA (F05)
    assert any(t.completadas for t in TypeAdapter(list[AvanceTematica]).validate_python(datos['tematicas']))
    assert 'afinidad' in datos['logros-final']
    avisos = datos['desbloqueos-no-vistos']
    assert {d['regla'] for d in avisos} == {
        'R-t-partida', 'R-t-cierre-inicio', 'R-t-batalla', 'R-t-ficha', 'R-t-ficha-2', 'R-t-ins-1', 'R-T1', 'R-NIV-2', 'R-CIUDAD',
        'R-t-opcional',
        'R-SEC-DIARIO', 'R-SEC-CATALOGO', 'R-SEC-PLANES', 'R-SEC-CHECK_IN', 'R-SEC-FAMILIA', 'R-t-adicional',
        'R-t-eco', 'R-t-diario-fija', 'R-t-diario-personal', 'R-PLAN-POR_QUE'}
    assert all(d['visto'] is False and d['fecha_hora'] == exportador.FECHA for d in avisos)
    assert [(f['codigo'], f['estado']) for f in datos['fichas-inicial']] == [
        ('t-ficha', 'BLOQUEADA'), ('t-ficha-2', 'BLOQUEADA')]
    assert [(f['codigo'], f['estado']) for f in datos['fichas-final']] == [
        ('t-ficha', 'DISPONIBLE'), ('t-ficha-2', 'DISPONIBLE')]
    assert [n['estado'] for n in datos['logros-final']['niveles']] == ['OBTENIDO', 'OBTENIDO']
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
        ('firefighter', 'Bombero/a'), ('paramedic', 'Paramédico/a')]
    assert {d.regla for d in superado.nuevos_desbloqueos} == {'R-t-testimonio-1', 'R-t-testimonio-2'}
    caso, = TypeAdapter(list[CasoCuenta]).validate_python(datos['casos'])
    assert (caso.dimensiones, caso.estado, caso.intentos, caso.superado) == (['R', 'S'], 'COMPLETADA', 2, True)
    assert [o.ocupacion for o in TypeAdapter(list[OcupacionColeccion]).validate_python(datos['coleccion'])] == [
        'firefighter', 'paramedic']
    inicial = TypeAdapter(list[TestimonioEstado]).validate_python(datos['testimonios-inicial'])
    assert [(t.estado, t.pista is not None, t.enlace) for t in inicial] == [('BLOQUEADA', True, None),
                                                                            ('BLOQUEADA', False, None)]
    final = TypeAdapter(list[TestimonioEstado]).validate_python(datos['testimonios-final'])
    assert [(t.estado, t.visto, t.pista) for t in final] == [('DISPONIBLE', True, None), ('DISPONIBLE', False, None)]
    # Ajustes Central (7): quién lo cuenta, solo disponible; el caso que lo regala, siempre.
    assert [(t.persona, t.caso.codigo) for t in inicial] == [(None, 't-caso'), (None, 't-caso')]
    assert [(t.persona, t.ocupacion.codigo, t.anios_experiencia) for t in final] == [
        ('Luis Mendoza', 'paramedic', 5), ('Sofía Kim', 'translator', 6)]
    # B11: planes con sus secciones, requisitos de comparar y proyecto, y referencias de planes.
    for nombre in ('crear-plan', 'guardar-seccion-por-que', 'guardar-seccion-conocimiento', 'guardar-seccion-realidad',
                   'medidores-plan', 'guardar-seccion-pasos', 'paso-hecho'):
        RespuestaAccion.model_validate(datos[nombre])
    assert {d['regla'] for d in datos['guardar-seccion-realidad']['nuevos_desbloqueos']} == {'R-t-comparar'}
    assert {d['regla'] for d in datos['guardar-seccion-pasos']['nuevos_desbloqueos']} == {'R-t-proyecto'}
    planes = PlanesCuenta.model_validate(datos['planes'])
    assert [(p.prioridad, p.carrera.codigo, p.lista_para_comparar) for p in planes.planes] == [
        ('A', 'psychology', True), ('B', 'journalism', True)]
    assert [s.estado for s in planes.planes[0].secciones] == ['LISTA', 'LISTA', 'LISTA', 'LISTA']
    assert planes.opcion_inicial.codigo == 'psychology' and planes.avisos == []
    assert {s.generada_por for s in planes.planes[0].sugerencias} == {'LLM'}
    comparar, = ReferenciasConsultadas.model_validate(datos['referencias-t-comparar']).referencias
    assert [o.codigo for o in comparar.opciones] == ['psychology', 'journalism']
    proyecto = {r.tipo: r for r in ReferenciasConsultadas.model_validate(datos['referencias-t-proyecto']).referencias}
    assert proyecto['PLAN'].cita.startswith('DATO DE PRUEBA') and proyecto['OPCION_INICIAL'].texto == 'Psicología'
    # B12: ruta del apoderado, resultados del hijo, conversaciones y cartas.
    familia = FamiliaApoderado.model_validate(datos['familia'])
    assert familia.diploma.obtenido and familia.avance.porcentaje == 100.0 and familia.estudiante.codigo == 'est-ana'
    assert [r['instrumento'] for r in datos['familia-resultados']] == ['TEST-RIASEC']
    assert ConversacionesCuenta.model_validate(datos['conversaciones-sin-carta']).carta_pendiente
    assert {d['regla'] for d in datos['escribir-carta-est-ana']['nuevos_desbloqueos']} == {'R-t-conv-1'}
    RespuestaAccion.model_validate(datos['responder-conversacion'])
    te_toca = ConversacionesCuenta.model_validate(datos['conversaciones-te-toca'])
    assert [(c.codigo, c.estado, c.respuesta_otro) for c in te_toca.conversaciones] == [
        ('t-conv-1', 'te_toca', None), ('t-conv-2', 'sin_responder', None)]
    por_conversar, = ConversacionesCuenta.model_validate(datos['conversaciones-por-conversar']).conversaciones
    assert por_conversar.estado == 'por_conversar' and por_conversar.preguntas_guia
    marca = datos['completar-conversacion']['por_cuenta']
    assert [e['tipo'] for e in marca['est-ana']['eventos_registrados']] == ['COMPLETA_CONVERSACION']
    assert marca['apo-rosa']['eventos_registrados'] == []
    final = ConversacionesCuenta.model_validate(datos['conversaciones-final'])
    assert (final.completadas, final.total, final.carta_recibida) == (2, 2, 'DATO DE PRUEBA: carta de apo-rosa.')
    assert {c.estado for c in final.conversaciones} == {'conversada'}
    # Regenera sobre archivos existentes sin tocar otros archivos del destino.
    conservar = destino / 'ruta' / 'conservar.txt'
    conservar.write_text('Conservar', encoding='utf-8')
    exportador.exportar_fixtures(destino)
    assert {ruta.name: ruta.read_bytes() for ruta in archivos} == bytes_antes
    assert conservar.read_text(encoding='utf-8') == 'Conservar'
    assert len(bases) == 2 and all(not ruta.parent.exists() for ruta in bases)
    assert ruta_ajena.read_bytes() == b'Base del usuario: conservar estos bytes'
    assert exportador.os.environ['EVALUADOR'] == 'gemini'


def test_fallo_del_recorrido_no_escribe_fixtures_y_restaura_evaluador(tmp_path, monkeypatch):
    monkeypatch.delenv('EVALUADOR', raising=False)
    destino = tmp_path / 'no-publicado'

    def fallar(cliente):
        raise RuntimeError('Fallo de prueba del recorrido')

    monkeypatch.setattr(exportador, '_recorrer', fallar)
    with pytest.raises(RuntimeError, match='Fallo de prueba del recorrido'):
        exportador.exportar_fixtures(destino)
    assert not destino.exists()
    assert 'EVALUADOR' not in exportador.os.environ


def test_fixtures_de_cuentas_y_apoderado(tmp_path):
    datos = leer(exportador.exportar_fixtures(tmp_path / 'servidor'))
    cuentas = TypeAdapter(list[CuentaResumen]).validate_python(datos['cuentas'])
    assert [(c.codigo, c.rol) for c in cuentas] == [
        ('apo-rosa', 'APODERADO'), ('est-ana', 'ESTUDIANTE'), ('est-beto', 'ESTUDIANTE'), ('est-luis', 'ESTUDIANTE'),
        ('ori-carmen', 'ORIENTADORA'),
    ]
    for momento in ('inicial', 'final'):
        TypeAdapter(list[BloqueActividades]).validate_python(datos[f'apoderado-actividades-{momento}'])
    assert datos['apoderado-actividades-inicial'] == [BLOQUE_FAMILIA]
    bloque, = datos['apoderado-actividades-final']
    assert bloque['actividades'] == [{**a, 'estado': 'COMPLETADA', 'bloqueo': None} for a in BLOQUE_FAMILIA['actividades']]


@pytest.mark.parametrize('evaluador_previo', [None, 'gemini'])
def test_fallo_del_apoderado_no_escribe_fixtures_y_restaura_evaluador(tmp_path, monkeypatch, evaluador_previo):
    if evaluador_previo is None:
        monkeypatch.delenv('EVALUADOR', raising=False)
    else:
        monkeypatch.setenv('EVALUADOR', evaluador_previo)
    destino = tmp_path / 'sin-publicar'

    def fallar(cliente):
        assert os.environ['EVALUADOR'] == 'falso'
        raise RuntimeError('Fallo de prueba del apoderado')

    monkeypatch.setattr(exportador, '_recorrer_apoderado', fallar)
    with pytest.raises(RuntimeError, match='Fallo de prueba del apoderado'):
        exportador.exportar_fixtures(destino)
    assert not destino.exists()
    assert os.environ.get('EVALUADOR') == evaluador_previo


def test_cli_exporta_los_fixtures_de_ruta(tmp_path):
    destino = tmp_path / 'front' / 'tests' / 'fixtures' / 'servidor'
    resultado = subprocess.run([sys.executable, str(SCRIPT), '--destino', str(destino)],
                               cwd=tmp_path, capture_output=True, text=True)
    assert resultado.returncode == 0, resultado.stderr
    assert f'Exportados {len(NOMBRES)} fixtures' in resultado.stdout
    assert {ruta.name for ruta in (destino / 'ruta').glob('*.json')} == NOMBRES
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
    assert [h.codigo for h in SesionRespuesta.model_validate(datos['sesion-apoderado']).hijos] == ['est-ana']
    assert [s.codigo for s in SesionRespuesta.model_validate(datos['sesion-orientadora']).salones] == ['5A']
    assert datos['sesion-error'] == {'detail': {'mensaje': 'Usuario o contraseña incorrectos'}}
