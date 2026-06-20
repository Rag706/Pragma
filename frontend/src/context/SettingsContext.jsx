import { createContext, useContext, useState } from 'react'

const KEY = 'taskflow_settings'

export const SETTING_DEFAULTS = {
  default_status:          'todo',
  default_priority:        'medium',
  default_sort_field:      'status',
  default_sort_dir:        'asc',
  default_dashboard_view:  'overview',
  hide_done:               false,
  hide_cancelled:          false,
  focus_show_overdue:      true,
  focus_show_today:        true,
  focus_show_tomorrow:     true,
  focus_show_in_progress:  true,
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...SETTING_DEFAULTS, ...JSON.parse(raw) } : { ...SETTING_DEFAULTS }
  } catch {
    return { ...SETTING_DEFAULTS }
  }
}

const Ctx = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)

  function update(key, value) {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }

  function reset() {
    localStorage.setItem(KEY, JSON.stringify(SETTING_DEFAULTS))
    setSettings({ ...SETTING_DEFAULTS })
  }

  return (
    <Ctx.Provider value={{ settings, update, reset }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSettings() {
  return useContext(Ctx)
}
