import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'

type ToastFn = (message: string) => void
const ToastContext = createContext<ToastFn>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)

  const notify = useCallback((message: string) => {
    setMsg(message)
    window.clearTimeout((notify as any)._t)
    ;(notify as any)._t = window.setTimeout(() => setMsg(null), 2600)
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {msg && (
        <div className="toast">
          <CheckCircle2 size={18} className="ok" />
          {msg}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastFn {
  return useContext(ToastContext)
}
