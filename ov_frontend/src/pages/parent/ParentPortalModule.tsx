import { useMemo } from 'react'
import { BookOpenCheck, Compass, LayoutDashboard, UsersRound } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { AppShell, type AppNavigationGroup } from '@/components/layout/AppShell'
import { ThemeProvider } from '@/components/common/ThemeScope'
import { appPaths } from '@/routes/paths'
import { cerrarSesion } from '@/store/accesoStore'
import { useParentProfile } from '@/features/parent/hooks/useParentProfile'
import { PantallaCargaPortal } from '@/components/staff/PantallaCargaPortal'
import type { ParentPortalContext } from '@/features/parent/context/parentPortalContext'
import { useParentActivities } from '@/features/parent/hooks/useParentActivities'
import { useModoCatalogo } from '@/features/discovery/hooks/useModoCatalogo'

function ParentPortalModule() {
  const navigate = useNavigate()
  const location = useLocation()
  const { completedIds: completedActivityIds, ...source } = useParentActivities()
  const parentProfile = useParentProfile()
  const context = { ...source, completedActivityIds } satisfies ParentPortalContext
  const routeState = getParentRouteState(location.pathname)
  // Ajuste catalogo-apoderado: en api, «Explorar opciones» abre directo el catálogo; en local, la guía de siempre.
  const { catalogoEnPortal } = useModoCatalogo()
  const navigationGroups = useMemo<AppNavigationGroup[]>(
    () => [
      {
        label: 'Familia',
        items: [
          {
            id: 'overview',
            icon: LayoutDashboard,
            label: 'Inicio',
            onSelect: () => navigate(appPaths.parent.overview),
          },
          {
            id: 'activities',
            icon: BookOpenCheck,
            label: 'Mis actividades',
            onSelect: () => navigate(appPaths.parent.activities),
          },
          {
            id: 'conversations',
            icon: UsersRound,
            label: 'Conversaciones',
            onSelect: () => navigate(appPaths.parent.conversations),
          },
          {
            id: 'careers',
            icon: Compass,
            label: 'Explorar opciones',
            onSelect: () =>
              navigate(catalogoEnPortal ? appPaths.parent.explorar.catalog.careers : appPaths.parent.careers),
          },
        ],
      },
    ],
    [navigate, catalogoEnPortal],
  )

  if (source.pantallaCarga)
    return (
      <ThemeProvider theme="staff">
        <div className="theme-staff min-h-svh bg-background text-foreground" data-audience="parent">
          <PantallaCargaPortal
            estado={source.pantallaCarga.estado}
            mensaje={source.pantallaCarga.mensaje}
            onReintentar={source.reintentarCarga}
            onVolver={() => {
              cerrarSesion()
              navigate(appPaths.login, { replace: true })
            }}
          />
        </div>
      </ThemeProvider>
    )

  // Una actividad abierta va sin menú; el diploma (F08), dentro del portal.
  if (/^\/parent\/activities\/(?!diploma\/?$)[^/]+\/?$/.test(location.pathname))
    return (
      <ThemeProvider theme="staff">
        <div className="theme-staff min-h-svh bg-background text-foreground" data-audience="parent">
          <Outlet context={context} />
        </div>
      </ThemeProvider>
    )

  return (
    <AppShell
      theme="staff"
      audience="parent"
      activeItemId={routeState.activeItemId}
      navigationGroups={navigationGroups}
      onLogout={() => {
        cerrarSesion()
        navigate(appPaths.login, { replace: true })
      }}
      onOpenProfile={() => navigate(appPaths.parent.overview)}
      title={routeState.title}
      userName={parentProfile.name}
      userRole={parentProfile.relationship}
    >
      <Outlet context={context} />
    </AppShell>
  )
}

function getParentRouteState(pathname: string) {
  if (pathname.includes('/conversations'))
    return { activeItemId: 'conversations', title: 'Conversaciones en familia' }
  if (pathname.includes('/activities/diploma'))
    return { activeItemId: 'activities', title: 'Actividades para familias · Diploma' }
  if (pathname.includes('/activities')) {
    return { activeItemId: 'activities', title: 'Actividades para familias' }
  }
  if (pathname.includes('/children')) return { activeItemId: 'overview', title: 'Inicio' }
  if (pathname.includes('/careers') || pathname.includes('/explorar'))
    return { activeItemId: 'careers', title: 'Explorar opciones' }
  return { activeItemId: 'overview', title: 'Inicio' }
}

export { ParentPortalModule }
