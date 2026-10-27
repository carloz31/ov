"""Lectura del catálogo real (ajuste catalogo-datos-reales): limpieza, fusiones y errores por fila."""

import csv
import shutil

import pytest
from datos import catalogo as datos_catalogo
from datos.catalogo import ciclos_de, leer_catalogo, lineas_ambito, primera_linea, rango, titulo


@pytest.fixture(scope='module')
def real():
    return leer_catalogo()


@pytest.fixture
def copia(tmp_path):
    carpeta = tmp_path / 'catalogo'
    shutil.copytree(datos_catalogo.CARPETA_CATALOGO, carpeta)
    return carpeta


def reescribir(ruta, cambiar):
    """Reescribe un CSV aplicando `cambiar(filas)` sobre sus filas como diccionarios."""
    with ruta.open(encoding='utf-8-sig', newline='') as archivo:
        lector = csv.DictReader(archivo)
        columnas, filas = lector.fieldnames, list(lector)
    filas = cambiar(filas)
    with ruta.open('w', encoding='utf-8', newline='') as archivo:
        escritor = csv.DictWriter(archivo, columnas)
        escritor.writeheader()
        escritor.writerows(filas)


@pytest.mark.parametrize('entrada, esperado', [
    ('INGENIERÍA DE SISTEMAS E INFORMÁTICA', 'Ingeniería de Sistemas e Informática'),
    ('CIENCIAS ADMINISTRATIVAS Y POLICIALES', 'Ciencias Administrativas y Policiales'),
    ('ESCUELA DE OFICIALES PNP', 'Escuela de Oficiales PNP'),
    ('INSTITUTO NAVAL (CITEN)', 'Instituto Naval (CITEN)'),
    ('EDUCACIÓN INICIAL (INTERCULTURAL Y BILINGÜE)', 'Educación Inicial (Intercultural y Bilingüe)'),
    ('DE LA SALLE', 'De la Salle'),
])
def test_titulo_conserva_conectores_y_siglas(entrada, esperado):
    assert titulo(entrada) == esperado


def test_limpieza_de_textos_y_rangos():
    assert lineas_ambito('¿ Hospitales.\n¿Colegios.\n\n') == 'Hospitales.\nColegios.'
    assert lineas_ambito('  ') is None
    assert primera_linea('5 años\nOtros: 5 años y medio') == '5 años'
    assert (ciclos_de('5 años'), ciclos_de('5 años académicos'), ciclos_de('Sin dato'), ciclos_de(None)) == (
        10, 10, None, None)
    assert rango('De S/ 2 987 a S/ 40 050') == (2987, 40050)
    with pytest.raises(ValueError, match='Rango de ingresos inválido'):
        rango('2 987 - 40 050')
    with pytest.raises(ValueError, match='invertido'):
        rango('De S/ 500 a S/ 100')


def test_catalogo_real_conteos_y_fusiones(real):
    assert (len(real.carreras), len(real.instituciones), len(real.ofertas), len(real.familias)) == (603, 706, 3597, 89)
    assert (len(real.departamentos), len(real.grupos), len(real.estilos), len(real.ocupaciones)) == (26, 22, 21, 923)
    ids = {c.id for c in real.carreras}
    # Las duplicadas por tilde se fusionan en la que tiene instituciones, que recibe sus relaciones.
    assert {'176', '106', '50', '163', '107'} <= ids and not {'322', '325', '236', '179', '344'} & ids
    assert all(c in ids for _, c in real.ofertas)
    assert real.departamentos['15'] == 'Lima' and real.departamentos['26'] == 'Lima Provincias'
    assert real.departamentos['17'] == 'Madre de Dios' and '0' not in real.departamentos
    assert {i.gestion for i in real.instituciones} == {'PUBLICA', 'PRIVADA'}
    assert {i.departamento for i in real.instituciones} == set(real.departamentos) - {'26'}


def test_catalogo_real_carreras_e_ingresos(real):
    carreras = {c.id: c for c in real.carreras}
    psicologia = carreras['369']
    assert (psicologia.nombre, psicologia.tipo, psicologia.familia, psicologia.duracion) == (
        'Psicología', 'UNIVERSIDAD', '313', '5 años')
    assert '¿' not in psicologia.ambito_laboral and len(psicologia.ambito_laboral.splitlines()) > 1
    assert not psicologia.descripcion.endswith('"')
    assert sum(1 for c in real.carreras if c.ambito_laboral is None) == 1
    nacionales = {(f.tipo, f.familia) for f in real.ingresos_familia if f.departamento is None}
    assert len(nacionales) == 100
    assert all(f.jovenes[1] <= f.jovenes[2] and f.adultos[1] <= f.adultos[2] for f in real.ingresos_familia)
    claves = [(f.tipo, f.familia, f.departamento) for f in real.ingresos_familia]
    assert len(claves) == len(set(claves))
    assert real.ingresos_institucion['3', '331'] == (10812, 1500, 29627)


def test_catalogo_real_ocupaciones(real):
    ocupaciones = {o.codigo_onet: o for o in real.ocupaciones}
    directores = ocupaciones['11-1011.00']
    assert directores.titulo == 'Directores Ejecutivos' and 'Presidente' in directores.tambien_llamado
    assert directores.grupo == '11' and directores.perfil == 'EC' and directores.job_zone == 5
    assert all(len(o.resumen) <= datos_catalogo.TOPE_RESUMEN for o in real.ocupaciones)
    assert directores.resumen.endswith('…')
    assert directores.estilos_trabajo[0] == 'tolerancia-ambiguedad'
    assert directores.conocimientos[:2] == ('Administración', 'Recursos humanos')
    assert all(t[:1].isupper() for o in real.ocupaciones for t in (*o.tareas, *o.conocimientos, *o.aptitudes))
    assert all(len(set(o.conocimientos)) == len(o.conocimientos) for o in real.ocupaciones)


def test_riasec_de_carreras_es_opcional(copia, real):
    assert all(c.riasec == '' for c in real.carreras)  # sin carreras_riasec.csv
    (copia / 'carreras_riasec.csv').write_text(
        'id,codigo_1,codigo_2,codigo_3\n369,S,I,A\n14,A,,\n322,R,,\n', encoding='utf-8')  # DATO DE PRUEBA
    carreras = {c.id: c for c in leer_catalogo(copia).carreras}
    assert (carreras['369'].riasec, carreras['14'].riasec, carreras['106'].riasec) == ('SIA', 'A', '')
    (copia / 'carreras_riasec.csv').write_text('id,codigo_1,codigo_2,codigo_3\n369,S,S,\n', encoding='utf-8')
    with pytest.raises(ValueError, match='carreras_riasec.csv, fila 2: letras RIASEC inválidas'):
        leer_catalogo(copia)


@pytest.mark.parametrize('archivo, cambio, mensaje', [
    ('ocupaciones_mpp_completo.csv', lambda f: [{**f[0], 'estilos_trabajo': '["Desconocido"]'}, *f[1:]],
     "ocupaciones_mpp_completo.csv, fila 2: estilo de trabajo desconocido 'Desconocido'"),
    ('ocupaciones_mpp_completo.csv', lambda f: [{**f[0], 'grupo_mayor': '98'}, *f[1:]],
     'ocupaciones_mpp_completo.csv, fila 2: grupo desconocido 98'),
    ('ocupaciones_mpp_completo.csv', lambda f: [{**f[0], 'tareas': '[sin comillas'}, *f[1:]],
     'ocupaciones_mpp_completo.csv, fila 2: JSON inválido'),
    ('ocupaciones_mpp_completo.csv', lambda f: [{**f[0], 'riasec_R': '9'}, *f[1:]],
     'ocupaciones_mpp_completo.csv, fila 2: puntaje RIASEC fuera de la escala'),
    ('carreras_mtpe.csv', lambda f: [{**f[0], 'codigo_cine': '999999'}, *f[1:]],
     'carreras_mtpe.csv, fila 2: código CINE inválido 999999'),
    ('instituciones.csv', lambda f: [{**f[0], 'tipo_gestion_nombre': 'Mixta'}, *f[1:]],
     "instituciones.csv, fila 2: gestión desconocida 'Mixta'"),
    ('carreras_salarios_por_departamento.csv', lambda f: [{**f[0], 'min_max_jovenes': 'S/ 100'}, *f[1:]],
     'carreras_salarios_por_departamento.csv, fila 2: Rango de ingresos inválido'),
])
def test_errores_con_numero_de_fila(copia, archivo, cambio, mensaje):
    reescribir(copia / archivo, cambio)
    with pytest.raises(ValueError, match=mensaje.replace('(', r'\(').replace(')', r'\)').replace('[', r'\[')):
        leer_catalogo(copia)


def test_archivo_ausente_o_sin_columnas(copia):
    (copia / 'grupos_ocupacionales.csv').write_text('codigo\n11\n', encoding='utf-8')
    with pytest.raises(ValueError, match='grupos_ocupacionales.csv: faltan las columnas nombre'):
        leer_catalogo(copia)
    (copia / 'departamentos.csv').unlink()
    with pytest.raises(ValueError, match='Falta el archivo del catálogo'):
        leer_catalogo(copia)
