"""`scripts/crear_cuentas.py`: las cuentas de una prueba desde un CSV, con las funciones del cargador. Alias y correos
ficticios; DATO DE PRUEBA."""

import csv
import importlib.util
import json
from pathlib import Path

import pytest
from sqlalchemy import func, select, update

from app import models as m
from soporte_ruta import FECHA

RAIZ = Path(__file__).resolve().parents[3]
_spec = importlib.util.spec_from_file_location('crear_cuentas', RAIZ / 'scripts' / 'crear_cuentas.py')
crear_cuentas = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(crear_cuentas)

CLAVE = 'DATO-DE-PRUEBA-2026'
FILAS = [
    ('ORIENTADORA', 'ori-prueba', 'Orientadora', '5P', 'ori@ov.test', CLAVE, '', ''),
    ('ESTUDIANTE', 'nav-01', 'Navegante-01', '5P', 'nav01@ov.test', CLAVE, '', ''),
    ('ESTUDIANTE', 'nav-02', 'Navegante-02', '5P', 'nav02@ov.test', CLAVE, '', ''),
    ('APODERADO', 'fam-01', 'Familia-01', '', 'fam01@ov.test', CLAVE, 'nav-01', 'madre'),
    ('APODERADO', 'fam-12', 'Familia-12', '', 'fam12@ov.test', CLAVE, 'nav-01;nav-02', 'madre'),
]
TABLAS = (m.Cuenta, m.Salon, m.VinculoFamiliar, m.OrientadoraSalon, m.SalonInstrumento, m.SalonActividadPrioritaria)


def _csv(tmp_path, filas, nombre='cuentas-prueba.csv'):
    ruta = tmp_path / nombre
    with ruta.open('w', encoding='utf-8', newline='') as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(crear_cuentas.COLUMNAS)
        escritor.writerows(filas)
    return ruta


def _url(aplicacion):
    return aplicacion.state.configuracion.url_bd


def _conteos(aplicacion):
    with aplicacion.state.fabrica_sesiones() as sesion:
        return {t.__tablename__: sesion.scalar(select(func.count()).select_from(t)) for t in TABLAS}


def _token(cliente, correo, clave=CLAVE):
    respuesta = cliente.post('/sesion/ingresar', json={'usuario': correo, 'contrasena': clave})
    assert respuesta.status_code == 200, respuesta.text
    return {'Authorization': f'Bearer {respuesta.json()["token"]}'}


def _sin_identidad(datos, reemplazos):
    texto = json.dumps(datos, ensure_ascii=False, sort_keys=True)
    for viejo, nuevo in reemplazos:
        texto = texto.replace(viejo, nuevo)
    return json.loads(texto)


@pytest.fixture
def creadas(aplicacion_contenido, tmp_path):
    crear_cuentas.crear(_url(aplicacion_contenido), _csv(tmp_path, FILAS))
    return aplicacion_contenido


def test_el_estudiante_creado_responde_como_est_mia_recien_cargada(creadas, cliente_contenido):
    cliente = cliente_contenido
    nav = _token(cliente, 'nav01@ov.test')
    mia = _token(cliente, 'mia.estudiante@example.com', 'Mia2026!')
    for ruta in ('actividades', 'avance', 'resumen', 'secciones', 'presentaciones'):
        propia = cliente.get(f'/cuentas/nav-01/{ruta}', headers=nav).json()
        modelo = cliente.get(f'/cuentas/est-mia/{ruta}', headers=mia).json()
        assert _sin_identidad(propia, [('nav-01', 'X'), ('Navegante-01', 'N')]) == \
            _sin_identidad(modelo, [('est-mia', 'X'), ('Mía', 'N')]), ruta


def test_el_estudiante_creado_ingresa_completa_b0_1_y_abre_b1_1(creadas, cliente_contenido):
    cliente = cliente_contenido
    nav = _token(cliente, '  NAV01@ov.TEST ')
    respuesta = cliente.post('/acciones/completar-actividad', headers=nav,
                             json={'cuenta': 'nav-01', 'actividad': 'b0-1', 'fecha_hora': FECHA})
    assert respuesta.status_code == 200, respuesta.text
    registro = cliente.get('/cuentas/nav-01/actividades/b1-1/registro', headers=nav)
    assert registro.status_code == 200 and registro.json()['items']


def test_el_salon_nuevo_tiene_la_configuracion_de_5a_y_su_orientadora_solo_lo_ve_ella(creadas, cliente_contenido):
    cliente = cliente_contenido
    with creadas.state.fabrica_sesiones() as sesion:
        def configuracion(codigo):
            salon = sesion.scalar(select(m.Salon).where(m.Salon.codigo == codigo))
            instrumentos = sorted((i.instrumento_id, i.es_prioritario, i.visible_apoderado) for i in sesion.scalars(
                select(m.SalonInstrumento).where(m.SalonInstrumento.salon_id == salon.id)))
            prioritarias = sorted(p.actividad_id for p in sesion.scalars(select(m.SalonActividadPrioritaria).where(
                m.SalonActividadPrioritaria.salon_id == salon.id)))
            return salon.colegio_id, instrumentos, prioritarias
        assert configuracion('5P') == configuracion('5A')
    ori = _token(cliente, 'ori@ov.test')
    assert [s['codigo'] for s in cliente.get('/sesion', headers=ori).json()['salones']] == ['5P']
    assert cliente.get('/cuentas/ori-prueba/panel/seguimiento?salon=5P', headers=ori).status_code == 200
    carmen = _token(cliente, 'carmen.orientadora@example.com', 'Carmen2026!')
    assert '5P' not in [s['codigo'] for s in cliente.get('/sesion', headers=carmen).json()['salones']]
    assert cliente.get('/cuentas/ori-carmen/panel/seguimiento?salon=5P', headers=carmen).status_code != 200
    lista = cliente.get('/cuentas/ori-prueba/panel/lista-estudiantes?salon=5P', headers=ori)
    assert lista.status_code == 200 and 'Navegante-01' in lista.text and 'est-ana' not in lista.text


@pytest.mark.parametrize('hijos', (1, 2))
def test_el_apoderado_creado_responde_como_apo_rosa_recien_cargada(creadas, cliente_contenido, hijos):
    cliente = cliente_contenido
    if hijos == 1:
        with creadas.state.fabrica_sesiones.begin() as sesion:
            sesion.execute(update(m.VinculoFamiliar).where(m.VinculoFamiliar.codigo == 'VIN-LUIS').values(es_activo=False))
    codigo, correo = ('fam-01', 'fam01@ov.test') if hijos == 1 else ('fam-12', 'fam12@ov.test')
    fam = _token(cliente, correo)
    rosa = _token(cliente, 'rosa.apoderada@example.com', 'Rosa2026!')
    propios = [(codigo, 'A'), ('Familia-01', 'F'), ('Familia-12', 'F'), ('nav-01', 'H1'), ('Navegante-01', 'N1'),
               ('nav-02', 'H2'), ('Navegante-02', 'N2'), (f'VIN-{codigo}-', 'VIN-')]
    de_rosa = [('apo-rosa', 'A'), ('Rosa', 'F'), ('est-ana', 'H1'), ('Ana', 'N1'), ('est-luis', 'H2'), ('Luis', 'N2')]
    for ruta in ('actividades', 'familia', 'conversaciones'):
        propia = cliente.get(f'/cuentas/{codigo}/{ruta}', headers=fam)
        modelo = cliente.get(f'/cuentas/apo-rosa/{ruta}', headers=rosa)
        assert propia.status_code == modelo.status_code, ruta
        assert _sin_identidad(propia.json(), propios) == _sin_identidad(modelo.json(), de_rosa), ruta
    # Ingresa, completa p1 y ve la tarjeta de su hijo.
    respuesta = cliente.post('/acciones/completar-actividad', headers=fam,
                             json={'cuenta': codigo, 'actividad': 'p1', 'fecha_hora': FECHA})
    assert respuesta.status_code == 200, respuesta.text
    familia = cliente.get(f'/cuentas/{codigo}/familia', headers=fam).json()
    assert [e['nombre'] for e in familia['estudiantes']] == ['Navegante-01', 'Navegante-02'][:hijos]


def test_una_segunda_ejecucion_no_crea_ni_cambia_nada(creadas, tmp_path):
    antes = _conteos(creadas)
    with creadas.state.fabrica_sesiones() as sesion:
        hashes = dict(sesion.execute(select(m.Cuenta.codigo, m.Cuenta.contrasena_hash)).all())
    ruta = _csv(tmp_path, FILAS, 'otra.csv')
    plan = crear_cuentas.crear(_url(creadas), ruta)
    assert (plan.nuevas, sorted(f.codigo for f in plan.existentes)) == ([], sorted(f[1] for f in FILAS))
    assert _conteos(creadas) == antes
    with creadas.state.fabrica_sesiones() as sesion:
        assert dict(sesion.execute(select(m.Cuenta.codigo, m.Cuenta.contrasena_hash)).all()) == hashes


@pytest.mark.parametrize('fila, error', (
    (('ESTUDIANTE', 'nav-09', 'Navegante-09', '5P', 'nav09@ov.test', 'corta', '', ''), 'menos de 8'),
    (('ESTUDIANTE', 'nav-09', 'Navegante-09', '', 'nav09@ov.test', CLAVE, '', ''), 'falta el salón'),
    (('ESTUDIANTE', 'nav-01', 'Navegante-09', '5P', 'nav09@ov.test', CLAVE, '', ''), 'código repetido'),
    (('ESTUDIANTE', 'nav-09', 'Navegante-09', '5P', 'NAV01@ov.test', CLAVE, '', ''), 'correo repetido'),
    (('APODERADO', 'fam-09', 'Familia-09', '', 'fam09@ov.test', CLAVE, 'nav-99', 'madre'), 'no existe'),
    (('APODERADO', 'fam-09', 'Familia-09', '', 'fam09@ov.test', CLAVE, 'apo-rosa', 'madre'), 'no es un estudiante'),
    (('APODERADO', 'fam-09', 'Familia-09', '', 'fam09@ov.test', CLAVE, 'nav-01', ''), 'parentesco'),
    (('ESTUDIANTE', 'nav-09', 'Navegante-09', '5P', 'ana.estudiante@example.com', CLAVE, '', ''), 'ya es de la cuenta'),
    (('JEFE', 'nav-09', 'Navegante-09', '5P', 'nav09@ov.test', CLAVE, '', ''), 'rol'),
))
def test_una_fila_invalida_no_crea_ninguna_cuenta(aplicacion_contenido, tmp_path, fila, error):
    antes = _conteos(aplicacion_contenido)
    with pytest.raises(crear_cuentas.ErrorCuentas, match=error):
        crear_cuentas.crear(_url(aplicacion_contenido), _csv(tmp_path, [*FILAS, fila]))
    assert _conteos(aplicacion_contenido) == antes


def test_simular_no_escribe_y_las_contrasenas_generadas_van_al_resultado_sin_imprimirse(aplicacion_contenido, tmp_path,
                                                                                     capsys, monkeypatch):
    sin_clave = [(*f[:5], '', *f[6:]) for f in FILAS]
    ruta = _csv(tmp_path, sin_clave)
    antes = _conteos(aplicacion_contenido)
    monkeypatch.setattr(crear_cuentas, 'cargar_configuracion', lambda: aplicacion_contenido.state.configuracion)
    assert crear_cuentas.main([str(ruta), '--simular']) == 0
    assert _conteos(aplicacion_contenido) == antes
    assert not ruta.with_name('cuentas-prueba.resultado.csv').exists()
    assert crear_cuentas.main([str(ruta)]) == 0
    salida = capsys.readouterr().out
    resultado = ruta.with_name('cuentas-prueba.resultado.csv')
    filas = list(csv.DictReader(resultado.open(encoding='utf-8')))
    assert [f['codigo'] for f in filas] == [f[1] for f in FILAS]
    assert all(len(f['contrasena']) >= 8 and f['contrasena'] not in salida for f in filas)
    with aplicacion_contenido.state.fabrica_sesiones() as sesion:
        assert sesion.scalar(select(func.count()).select_from(m.Cuenta).where(m.Cuenta.codigo.like('nav-%'))) == 2
