import { useEffect, useState } from 'react'
import { usePanelSalon, type TablaInteres } from '@/features/counselor/hooks/usePanelSalon'
import { useListaPanel } from '@/store/servidor/panel'
import type { TipoFormacion } from '@/types/servidor'

const ESPERA_BUSQUEDA = 300

// Ajuste panel-salon §5.4: la lista completa de áreas o instituciones, con buscador, filtro por tipo y el orden
// heredado de la tabla de Inicio (en la URL; al volver, Inicio lo conserva).
export function useListaInteres(tabla: TablaInteres) {
  const modelo = usePanelSalon()
  const orden = tabla === 'areas' ? modelo.ordenAreas : modelo.ordenInstituciones
  const [texto, setTexto] = useState('')
  const [buscar, setBuscar] = useState('')
  const [tipo, setTipo] = useState<TipoFormacion | ''>('')
  useEffect(() => {
    const espera = setTimeout(() => setBuscar(texto.trim()), ESPERA_BUSQUEDA)
    return () => clearTimeout(espera)
  }, [texto])
  const { lista, mostrarMas, reintentar } = useListaPanel(tabla, {
    salon: modelo.salonServidor,
    orden,
    buscar,
    tipo,
  })
  return {
    modelo,
    orden,
    texto,
    buscarTexto: setTexto,
    tipo,
    elegirTipo: (valor: string) => setTipo(valor === 'todos' ? '' : (valor as TipoFormacion)),
    lista,
    hayMas: lista?.estado === 'listo' && lista.items.length < lista.total,
    mostrarMas,
    reintentar,
  }
}
