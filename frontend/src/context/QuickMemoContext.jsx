import { createContext, useContext, useState } from 'react'

const QuickMemoContext = createContext(null)

export function QuickMemoProvider({ children }) {
  const [isOpen, setIsOpen]           = useState(false)
  const [previewedTask, setPreviewedTask] = useState(null)

  return (
    <QuickMemoContext.Provider value={{
      isOpen,
      openPanel:    () => setIsOpen(true),
      closePanel:   () => { setIsOpen(false); setPreviewedTask(null) },
      previewedTask,
      previewTask:  setPreviewedTask,
      clearPreview: () => setPreviewedTask(null),
    }}>
      {children}
    </QuickMemoContext.Provider>
  )
}

export const useQuickMemo = () => useContext(QuickMemoContext)
