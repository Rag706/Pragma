import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'

const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext)

// Module-level ref so the QueryClient (created outside React) can call addToast
let _addToast = null
export const showToast = (message, type = 'error') => _addToast?.(message, type)

const ICONS = {
  error:   '✕',
  warning: '⚠',
  success: '✓',
}
const COLORS = {
  error:   'border-red-500/40 bg-red-500/10 text-red-300',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'error') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-4), { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }, [])

  useEffect(() => {
    _addToast = addToast
    return () => { _addToast = null }
  }, [addToast])

  function dismiss(id) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast stack — bottom right */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-2xl text-sm max-w-sm pointer-events-auto animate-in slide-in-from-right-4 ${COLORS[t.type] ?? COLORS.error}`}
          >
            <span className="font-bold shrink-0 mt-0.5">{ICONS[t.type]}</span>
            <span className="flex-1 leading-snug">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
