import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { appPaths } from '@/routes/paths'
import { useDemoAccess } from '../lib/demoAccess'

export function DemoAccessGate({ children }: { children: ReactNode }) {
  const active = useDemoAccess()
  const { pathname } = useLocation()
  if (!active && pathname !== appPaths.home && pathname !== appPaths.login) {
    return <Navigate replace to={appPaths.login} />
  }
  return children
}
