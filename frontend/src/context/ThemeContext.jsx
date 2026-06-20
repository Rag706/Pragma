import { createContext, useContext, useState, useEffect } from 'react'

const ThemeCtx = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('taskflow_theme') ?? 'default'
  )

  useEffect(() => {
    document.documentElement.classList.remove('theme-default', 'theme-bright')
    if (theme !== 'default') document.documentElement.classList.add(`theme-${theme}`)
    localStorage.setItem('taskflow_theme', theme)
  }, [theme])

  return (
    <ThemeCtx.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeCtx)
}
