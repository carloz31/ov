// Fechas del contrato: el backend entrega la hora de Lima (UTC−05:00, sin horario de verano) sin zona
// (`2026-10-29T04:53:09`). `new Date` la leería como hora del navegador; todo lo que lea una fecha del servidor (para
// mostrarla, contar días, decidir si es de hoy u ordenar) pasa por aquí. Una cadena con zona (`Z` o `±hh:mm`, como
// las que guarda el navegador en modo local) se lee tal cual, así que sirve también en vistas de los dos modos.
// No importa nada: los adaptadores la usan y las pruebas los cargan aislados.

export const ZONA_SERVIDOR = 'America/Lima'

export function fechaServidor(iso: string): Date {
  if (/(Z|[+-]\d\d:?\d\d)$/i.test(iso)) return new Date(iso)
  // Solo fecha (`2026-10-29`): el inicio de ese día en Lima, no la medianoche UTC.
  return new Date(`${iso.length === 10 ? `${iso}T00:00:00` : iso}-05:00`)
}

// El día de calendario en Lima (`2026-10-29`) de un instante: para comparar con «hoy» o contar días.
export function diaLima(fecha: Date): string {
  return fecha.toLocaleDateString('en-CA', { timeZone: ZONA_SERVIDOR })
}
