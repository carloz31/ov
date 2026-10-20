"""B17: hash de contraseñas con Argon2id y las tres políticas de acceso, sobre SQLite en memoria sin conjunto."""

import pytest
from sqlalchemy.orm import Session

from app import models as m
from app.database import crear_motor_bd
from app.services import acceso


def test_hash_argon2id_con_sal_y_verificacion():
    primero, segundo = acceso.generar_hash('Ana2026!'), acceso.generar_hash('Ana2026!')
    assert primero.startswith('$argon2id$') and primero != segundo
    assert acceso.verificar_contrasena(primero, 'Ana2026!')
    assert not acceso.verificar_contrasena(primero, 'ana2026!')


@pytest.mark.parametrize('contrasena_hash', [None, '', 'no-es-un-hash'])
def test_sin_hash_valido_no_verifica(contrasena_hash):
    assert not acceso.verificar_contrasena(contrasena_hash, 'sin-cuenta')


def test_correo_normalizado():
    assert acceso.normalizar_correo('  Ana.Estudiante@Example.COM ') == 'ana.estudiante@example.com'


@pytest.fixture
def sesion():
    motor_bd = crear_motor_bd('sqlite:///:memory:')
    m.Base.metadata.create_all(motor_bd)
    with Session(motor_bd) as sesion:
        # DATO DE PRUEBA: dos salones, dos estudiantes, un apoderado y una orientadora.
        salones = [m.Salon(codigo='5A', nombre='5A'), m.Salon(codigo='5B', nombre='5B')]
        sesion.add_all(salones)
        sesion.flush()
        ana = m.Cuenta(codigo='ana', nombre='Ana', rol=m.Rol.ESTUDIANTE, salon_id=salones[0].id)
        beto = m.Cuenta(codigo='beto', nombre='Beto', rol=m.Rol.ESTUDIANTE, salon_id=salones[1].id)
        rosa = m.Cuenta(codigo='rosa', nombre='Rosa', rol=m.Rol.APODERADO)
        carmen = m.Cuenta(codigo='carmen', nombre='Carmen', rol=m.Rol.ORIENTADORA)
        sesion.add_all([ana, beto, rosa, carmen])
        sesion.flush()
        sesion.add_all([m.VinculoFamiliar(codigo='V-ANA', estudiante_id=ana.id, apoderado_id=rosa.id),
                        m.VinculoFamiliar(codigo='V-BETO', estudiante_id=beto.id, apoderado_id=rosa.id,
                                          es_activo=False),
                        m.OrientadoraSalon(orientadora_id=carmen.id, salon_id=salones[0].id, es_principal=True)])
        sesion.flush()
        sesion.cuentas = {c.codigo: c.id for c in (ana, beto, rosa, carmen)}
        yield sesion
    motor_bd.dispose()


def test_es_propia(sesion):
    ids = sesion.cuentas
    assert acceso.es_propia(sesion, ids['ana'], ids['ana'])
    assert not acceso.es_propia(sesion, ids['beto'], ids['ana'])


def test_es_hijo_vinculado_solo_con_vinculo_activo(sesion):
    ids = sesion.cuentas
    assert acceso.es_hijo_vinculado(sesion, ids['rosa'], ids['ana'])
    assert not acceso.es_hijo_vinculado(sesion, ids['rosa'], ids['beto'])
    assert not acceso.es_hijo_vinculado(sesion, ids['carmen'], ids['ana'])


def test_es_de_su_salon(sesion):
    ids = sesion.cuentas
    assert acceso.es_de_su_salon(sesion, ids['carmen'], ids['ana'])
    assert not acceso.es_de_su_salon(sesion, ids['carmen'], ids['beto'])
    assert not acceso.es_de_su_salon(sesion, ids['rosa'], ids['ana'])
