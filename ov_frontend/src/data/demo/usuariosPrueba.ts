// DATO DE PRUEBA: usuarios del modo local, con los mismos correos y contraseñas que Ana, Rosa y Carmen en
// ov_backend/datos/usuarios_prueba.txt; se reemplazarán por las cuentas que registre el colegio.
import type { CuentaResumen } from '@/types/servidor'

export type UsuarioPrueba = { usuario: string; contrasena: string; cuenta: CuentaResumen }

export const usuariosPrueba: UsuarioPrueba[] = [
  {
    usuario: 'ana.estudiante@example.com',
    contrasena: 'Ana2026!',
    cuenta: { codigo: 'est-ana', nombre: 'Ana', rol: 'ESTUDIANTE' },
  },
  {
    usuario: 'rosa.apoderada@example.com',
    contrasena: 'Rosa2026!',
    cuenta: { codigo: 'apo-rosa', nombre: 'Rosa', rol: 'APODERADO' },
  },
  {
    usuario: 'carmen.orientadora@example.com',
    contrasena: 'Carmen2026!',
    cuenta: { codigo: 'ori-carmen', nombre: 'Carmen', rol: 'ORIENTADORA' },
  },
]
