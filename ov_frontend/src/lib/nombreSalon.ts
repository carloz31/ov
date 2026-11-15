import type { SalonDatos } from '@/types/servidor'

// Ajuste panel-entrevistas-configuracion: el servidor entrega promoción (año de egreso) y sección; el nombre depende
// del año en curso del dispositivo. Quinto, cuarto y tercero se nombran por su grado; cualquier otro (promociones
// egresadas o de segundo para abajo), por su promoción.
const GRADOS: Record<number, string> = { 5: 'Quinto', 4: 'Cuarto', 3: 'Tercero' }

export function nombreSalon(
  salon: Pick<SalonDatos, 'promocion' | 'seccion'>,
  anio: number = new Date().getFullYear(),
): string {
  const grado = GRADOS[5 - (salon.promocion - anio)]
  return grado ? `${grado} ${salon.seccion}` : `Promoción ${salon.promocion} ${salon.seccion}`
}

// Los salones de la sesión con su nombre, para los selectores del panel que lo muestran.
export const salonesConNombre = <S extends SalonDatos>(salones: S[], anio?: number) =>
  salones.map((s) => ({ ...s, nombre: nombreSalon(s, anio) }))
