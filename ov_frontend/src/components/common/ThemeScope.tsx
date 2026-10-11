// oxlint-disable react/only-export-components -- Theme context is shared by layout and portal primitives.
import { createContext, useContext, type ReactNode } from 'react'

export type AppTheme = 'student' | 'staff'
const ThemeContext = createContext<AppTheme>('student')

export function ThemeProvider({ theme, children }: { theme: AppTheme; children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useAppTheme() {
  return useContext(ThemeContext)
}

export function useThemeClass() {
  return `theme-${useAppTheme()}`
}
