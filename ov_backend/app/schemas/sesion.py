from datetime import datetime

from pydantic import BaseModel

from app.schemas.cuentas import CuentaResumen


class IngresoEntrada(BaseModel):
    usuario: str
    contrasena: str


class IngresoRespuesta(BaseModel):
    token: str
    expira_en: datetime
    cuenta: CuentaResumen


class HijoSesion(BaseModel):
    codigo: str
    nombre: str
    salon: str | None
    parentesco: str | None


class SalonSesion(BaseModel):
    codigo: str
    nombre: str
    es_principal: bool


class SesionRespuesta(BaseModel):
    cuenta: CuentaResumen
    expira_en: datetime
    hijos: list[HijoSesion]
    salones: list[SalonSesion]
