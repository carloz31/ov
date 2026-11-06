import { BotonLimpiar } from './BotonLimpiar'

// Ajuste catalogo-datos-reales (revisión de F6a): debajo del panel de filtros, cuántos resultados hay y cuántos
// filtros están activos, con «Limpiar filtros». Mientras se busca, solo «Buscando…».
export function FilaResultado({
  buscando,
  total,
  nombres,
  activos,
  onLimpiar,
}: {
  buscando: boolean
  total: number | null
  nombres: [string, string]
  activos: number
  onLimpiar: () => void
}) {
  return (
    <div className="sx-c-resultado">
      <p aria-live="polite">
        {buscando || total === null ? (
          'Buscando…'
        ) : (
          <>
            <strong>{total.toLocaleString('es-PE')}</strong> {total === 1 ? nombres[0] : nombres[1]}
            {activos > 0 && ` · ${activos} ${activos === 1 ? 'filtro activo' : 'filtros activos'}`}
          </>
        )}
      </p>
      {activos > 0 && <BotonLimpiar onLimpiar={onLimpiar} />}
    </div>
  )
}
