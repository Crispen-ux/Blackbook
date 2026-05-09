import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface ThemeColors {
  background: string
  surface: string
  surfaceAlt: string
  border: string
  text: string
  textSecondary: string
  textMuted: string
  primary: string
  accent: string
  tabBar: string
  tabBarBorder: string
}

const dark: ThemeColors = {
  background: '#000000',
  surface: '#1a1a2e',
  surfaceAlt: '#16213e',
  border: '#0f3460',
  text: '#ffffff',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  primary: '#6366f1',
  accent: '#e53e3e',
  tabBar: '#1a1a2e',
  tabBarBorder: '#0f3460',
}

const light: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceAlt: '#f1f5f9',
  border: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  primary: '#6366f1',
  accent: '#dc2626',
  tabBar: '#ffffff',
  tabBarBorder: '#e2e8f0',
}

type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  colors: ThemeColors
  toggleTheme: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: dark,
  toggleTheme: () => {},
  isDark: true,
})

export function useAppTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    AsyncStorage.getItem('blackbook-theme').then(val => {
      if (val === 'light' || val === 'dark') setTheme(val)
    })
  }, [])

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      AsyncStorage.setItem('blackbook-theme', next)
      return next
    })
  }

  const colors = theme === 'dark' ? dark : light
  const isDark = theme === 'dark'

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}
