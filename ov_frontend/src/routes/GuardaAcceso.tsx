import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAcceso } from '@/features/auth/hooks/useAcceso'
import { appPaths, portalPorRol, raizPorRol, type RolPortal } from './paths'

const portales = Object.entries(raizPorRol) as [RolPortal, string][]

function rolDeRuta(pathname: string) {
  return portales.find(([, raiz]) => pathname === raiz || pathname.startsWith(`${raiz}/`))?.[0] ?? null
}

/** B17: sin sesión, todo salvo el login va a /login; con sesión, cada portal solo para su rol. */
export function GuardaAcceso({ children }: { children: ReactNode }) {
  const { cuenta } = useAcceso()
  const { pathname } = useLocation()
  if (pathname === appPaths.home || pathname === appPaths.login) return children
  if (!cuenta) return <Navigate replace to={appPaths.login} />
  const rol = rolDeRuta(pathname)
  if (rol && rol !== cuenta.rol) return <Navigate replace to={portalPorRol[cuenta.rol]} />
  return children
}
