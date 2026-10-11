import { AppRoutes } from '@/routes/AppRoutes'
import { DemoAccessGate } from '@/features/auth/components/DemoAccessGate'

function App() {
  return (
    <DemoAccessGate>
      <AppRoutes />
    </DemoAccessGate>
  )
}

export default App
