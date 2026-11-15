import { ListaEstudiantes } from '@/features/counselor/components/estudiantes/ListaEstudiantes'
import { useEstudiantesLista } from '@/features/counselor/hooks/useEstudiantesLista'

// Ajuste panel-estudiantes §4 (api): la lista «Estudiantes» de la orientadora. En local sigue `StudentsView`.
function EstudiantesView() {
  const modelo = useEstudiantesLista()
  return (
    <main className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-7">
      <ListaEstudiantes modelo={modelo} />
    </main>
  )
}
export { EstudiantesView }
