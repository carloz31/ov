import { obtenerEstadoServidor, publicar } from './sesion'
import type { DesbloqueoNuevo } from '@/types/servidor'

// F00: las actividades que desbloquea una acción se revelan en el mapa una por una. Solo en memoria.
export function revelarDesbloqueos(desbloqueos: DesbloqueoNuevo[]) {
  encolarPorRevelar(desbloqueos.filter((d) => d.tipo_objetivo === 'ACTIVIDAD').map((d) => d.objetivo.codigo))
}
export function encolarPorRevelar(codigos: string[]) {
  const porRevelar = obtenerEstadoServidor().porRevelar
  const nuevas = codigos.filter((c, i) => !porRevelar.includes(c) && codigos.indexOf(c) === i)
  if (nuevas.length) publicar({ porRevelar: [...porRevelar, ...nuevas] })
}
// El mapa ya reveló (o no dibuja) estas actividades.
export function quitarPorRevelar(quitar: (codigo: string) => boolean) {
  const porRevelar = obtenerEstadoServidor().porRevelar
  if (porRevelar.some(quitar)) publicar({ porRevelar: porRevelar.filter((c) => !quitar(c)) })
}
