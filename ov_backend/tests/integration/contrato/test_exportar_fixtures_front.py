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
from app.schemas.acciones import RespuestaAccion, RespuestaResolverCaso, RespuestaRevelarResultado
from app.schemas.batallas import BatallaCuenta
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
from app.schemas.instrumentos import ComparacionAutopercepcion, ItemPublico, ResultadoPublico
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
    'items-registro-t-eco', 'referencias-t-eco', 'referencias-t-contraste',
    'items-t-partida', 'revelar-partida', 'resultado-partida', 'referencias-t-lee-cuestionario', 'actividades-t2',
    'comparacion-partida-llegada', 'testimonios-inicial', 'testimonios-final', 'resolver-batalla-derrota',
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
    assert {d.zona for d in partida.dimensiones} == {'EN_CAMINO'}
    assert all(d.puntaje is None and d.porcentaje is None for d in partida.dimensiones)
    cita, = ReferenciasConsultadas.model_validate(datos['referencias-t-lee-cuestionario']).referencias
    assert (cita.tipo, cita.estado, cita.texto) == ('RESPUESTA_CUESTIONARIO', 'DISPONIBLE', 'Bastante de acuerdo')
    assert estados(datos['actividades-t2'])['t-llegada'] == 'DISPONIBLE'
    comparacion = ComparacionAutopercepcion.model_validate(datos['comparacion-partida-llegada'])
    assert [(d.zona_partida, d.zona_llegada) for d in comparacion.dimensiones][1:] == [('EN_CAMINO', 'FUERTE')] * 4
    assert 'puntaje' not in json.dumps(datos['comparacion-partida-llegada'])
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
    # B05: t-eco elige por referencia y cita; con t-exp-espera poco desarrollada, sale «por desarrollar».
    ruta_eco, espera_eco = TypeAdapter(list[ItemRegistroPublico]).validate_python(datos['items-registro-t-eco'])
    assert ruta_eco.eleccion.referencia == 't-ref-rutas' and ruta_eco.eleccion.opciones == []
    assert espera_eco.eleccion is None
    referencias = ReferenciasConsultadas.model_validate(datos['referencias-t-eco'])
    assert [(r.codigo, r.estado) for r in referencias.referencias] == [
        ('t-ref-espera', 'POR_DESARROLLAR'), ('t-ref-rutas', 'DISPONIBLE')]
    assert referencias.referencias[0].texto is None and referencias.referencias[1].opciones
    assert 'clasificacion' not in json.dumps(datos['referencias-t-eco'])
    contraste = ReferenciasConsultadas.model_validate(datos['referencias-t-contraste'])
    assert [(r.codigo, r.tipo, r.estado) for r in contraste.referencias] == [
        ('t-ref-coincidencias', 'COINCIDENCIAS', 'DISPONIBLE'), ('t-ref-resultado', 'RESULTADO', 'DISPONIBLE')]
    assert all(r.opciones for r in contraste.referencias)
    inicial = estados(datos['actividades-inicial'])
    assert inicial['t-inicio'] == inicial['t-partida'] == 'DISPONIBLE'
    assert all(e == 'BLOQUEADA' for c, e in inicial.items() if c not in ('t-inicio', 't-partida'))
    assert datos['resumen-inicial']['nivel_actual']['numero'] == 1
    assert any(i['codigo'] == '???' for i in datos['logros-inicial']['insignias'])
    assert {d['regla'] for d in datos['completar-t-inicio']['nuevos_desbloqueos']} == {
        'R-t-cierre-inicio', 'R-t-batalla', 'R-t-ficha', 'R-t-ins-1', 'R-SEC-DIARIO', 'R-SEC-CATALOGO', 'R-SEC-PLANES',
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
    assert CheckInsCuenta.model_validate(datos['check-ins']).dias_registrados == 2
    assert any(t.completadas for t in TypeAdapter(list[AvanceTematica]).validate_python(datos['tematicas']))
    assert 'afinidad' in datos['logros-final']
    avisos = datos['desbloqueos-no-vistos']
    assert {d['regla'] for d in avisos} == {
        'R-t-cierre-inicio', 'R-t-batalla', 'R-t-ficha', 'R-t-ins-1', 'R-T1', 'R-NIV-2', 'R-CIUDAD', 'R-t-opcional',
        'R-SEC-DIARIO', 'R-SEC-CATALOGO', 'R-SEC-PLANES', 'R-SEC-CHECK_IN', 'R-SEC-FAMILIA', 'R-t-adicional',
        'R-t-eco', 'R-t-diario-fija', 'R-t-diario-personal', 'R-PLAN-POR_QUE'}
    assert all(d['visto'] is False and d['fecha_hora'] == exportador.FECHA for d in avisos)
    assert [(f['codigo'], f['estado']) for f in datos['fichas-inicial']] == [('t-ficha', 'BLOQUEADA')]
    assert [(f['codigo'], f['estado']) for f in datos['fichas-final']] == [('t-ficha', 'DISPONIBLE')]
    assert [n['estado'] for n in datos['logros-final']['niveles']] == ['OBTENIDO', 'OBTENIDO']
    # B08: batalla con reintento, caso superado, colección y testimonios.
    for nombre in ('resolver-batalla-derrota', 'resolver-batalla-victoria'):
        RespuestaAccion.model_validate(datos[nombre])
    assert datos['resolver-batalla-derrota']['eventos_registrados'] == []
    assert datos['resolver-batalla-victoria']['nuevos_desbloqueos'] == []
    batalla, = TypeAdapter(list[BatallaCuenta]).validate_python(datos['batallas'])
    assert (batalla.estado, batalla.intentos, batalla.primer_intento.victoria) == ('COMPLETADA', 2, False)
    superado = RespuestaResolverCaso.model_validate(datos['resolver-caso'])
    assert superado.ocupaciones_nuevas == ['firefighter', 'paramedic']
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
