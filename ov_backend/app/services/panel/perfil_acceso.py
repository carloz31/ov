"""Acceso al perfil de un estudiante (ajuste panel-estudiantes). Toda ruta del perfil (lecturas y acciones de notas)
pasa por `estudiante_de_orientadora`: la cuenta debe ser orientadora y el estudiante de uno de sus salones
(`es_de_su_salon`); si no, 404 «Estudiante no encontrado»."""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.exceptions import ErrorAccion
from app.models import Cuenta, Rol
from app.services.acceso import es_de_su_salon
from app.services.investigaciones.acciones import exigir_orientadora
from app.services.panel.comun import Alcance, resolver_alcance


@dataclass(frozen=True)
class Acceso:
    orientadora: Cuenta
    estudiante: Cuenta
    salon: Alcance
    """El salón del estudiante como alcance (los avisos comparan con su salón)."""

    @property
    def solo(self) -> Alcance:
        """El alcance de solo este estudiante."""
        return Alcance(salones=self.salon.salones, salon=self.salon.salon, ahora=self.salon.ahora,
                       estudiantes=[e for e in self.salon.estudiantes if e.id == self.estudiante.id])


def estudiante_de_orientadora(sesion: Session, codigo_cuenta: str, codigo_estudiante: str,
                              ahora: datetime) -> Acceso:
    orientadora, _ = exigir_orientadora(sesion, codigo_cuenta)
    estudiante = sesion.scalar(select(Cuenta).where(Cuenta.codigo == codigo_estudiante, Cuenta.rol == Rol.ESTUDIANTE))
    if estudiante is None or not es_de_su_salon(sesion, orientadora.id, estudiante.id):
        raise ErrorAccion("Estudiante no encontrado", estado_http=404)
    salones = resolver_alcance(sesion, codigo_cuenta, None, ahora).salones
    return Acceso(orientadora, estudiante,
                  resolver_alcance(sesion, codigo_cuenta, salones[estudiante.salon_id].codigo, ahora))
