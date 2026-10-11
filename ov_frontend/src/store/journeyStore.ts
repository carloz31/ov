import { useSyncExternalStore } from 'react'
import { initialJourney } from '@/lib/activities/logic'
import type { JourneyState } from '@/types/activities'

let key = 'ov.missions.v2'
let cuentaServidor: string | null = null
export const journeyEnServidor = () => cuentaServidor !== null
// Keep initialJourney unchanged for other roles that reuse its legacy schema.
const initialStudentJourney = (): JourneyState => ({
  ...initialJourney(),
  readResourceIds: [],
  challengeResults: [],
})
function read(): JourneyState {
  try {
    const almacen = JSON.parse(localStorage.getItem(key) ?? 'null')
    const value = cuentaServidor ? almacen?.por_cuenta?.[cuentaServidor] : almacen
    const empty = initialStudentJourney()
    if (value?.version !== 2) return empty
    for (const name of Object.keys(empty)) {
      if ((name === 'readResourceIds' || name === 'challengeResults') && value[name] === undefined) continue
      if (Array.isArray(empty[name as keyof JourneyState]) && !Array.isArray(value[name])) return empty
    }
    if (
      !value.progress ||
      !value.drafts ||
      typeof value.progress !== 'object' ||
      typeof value.drafts !== 'object'
    )
      return empty
    return {
      ...empty,
      ...value,
      readResourceIds: value.readResourceIds ?? value.resources,
      challengeResults: value.challengeResults ?? [],
    }
  } catch {
    return initialStudentJourney()
  }
}
let state = read()
let storageError = ''
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function updateJourney(update: (current: JourneyState) => JourneyState) {
  const next = update(state)
  try {
    if (cuentaServidor) {
      const almacen = JSON.parse(localStorage.getItem(key) ?? 'null')
      localStorage.setItem(
        key,
        JSON.stringify({ por_cuenta: { ...almacen?.por_cuenta, [cuentaServidor]: next } }),
      )
    } else localStorage.setItem(key, JSON.stringify(next))
    state = next
    storageError = ''
  } catch {
    storageError = 'No se pudo guardar. Libera espacio o permite el almacenamiento y vuelve a intentarlo.'
  }
  listeners.forEach((listener) => listener())
  return !storageError
}
// Sin red ni configuración de Vite: el módulo de servidor configura y proyecta.
export function configurarJourneyServidor(cuenta: string) {
  if (cuentaServidor === cuenta) return
  key = 'ov.missions.v2.api'
  cuentaServidor = cuenta
  state = read()
  storageError = ''
  listeners.forEach((listener) => listener())
}
export function hidratarJourneyServidor(proyectar: (actual: JourneyState) => JourneyState) {
  const siguiente = proyectar(state)
  // La copia en memoria refleja la BD aunque el navegador no permita persistirla.
  const guardado = updateJourney(() => siguiente)
  if (!guardado) {
    state = siguiente
    listeners.forEach((listener) => listener())
  }
}
export const useJourney = () => useSyncExternalStore(subscribe, () => state)
export const getJourneySnapshot = () => state
export const useJourneyError = () => useSyncExternalStore(subscribe, () => storageError)
window.addEventListener('storage', (event: StorageEvent) => {
  if (event.key === key || event.key === null) {
    state = read()
    listeners.forEach((listener) => listener())
  }
})

async function fileDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('ov.mission-files', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('files')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('No se pudo abrir el almacenamiento de archivos.'))
  })
}
export async function saveFiles(files: File[], ids: string[]) {
  const db = await fileDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('files', 'readwrite')
      files.forEach((file, i) => transaction.objectStore('files').put(file, ids[i]))
      transaction.oncomplete = () => resolve()
      transaction.onerror = transaction.onabort = () =>
        reject(new Error('No se pudo guardar el archivo. Revisa el espacio disponible.'))
    })
  } finally {
    db.close()
  }
}
export async function downloadFile(id: string, name: string) {
  const db = await fileDatabase()
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      const request = db.transaction('files').objectStore('files').get(id)
      request.onsuccess = () =>
        request.result
          ? resolve(request.result)
          : reject(new Error('Este archivo ya no está en este navegador.'))
      request.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } finally {
    db.close()
  }
}
