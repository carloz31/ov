import { AppRoutes } from '@/routes/AppRoutes'
import { GuardaAcceso } from '@/routes/GuardaAcceso'

function App() {
  return (
    <GuardaAcceso>
      <AppRoutes />
    </GuardaAcceso>
  )
}

export default App
