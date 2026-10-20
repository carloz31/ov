import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import '@/index.css'
import App from '@/App'
import { configurarServidor, modoApi } from '@/config/env'
import { conectarAccesoApi, validarSesionGuardada } from '@/store/accesoStore'
import { prepararAlmacenesApi } from '@/store/servidor/sesion'

configurarServidor(import.meta.env)
if (modoApi) {
  conectarAccesoApi()
  prepararAlmacenesApi()
  void validarSesionGuardada()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
