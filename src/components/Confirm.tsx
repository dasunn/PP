import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

export interface ConfirmOptions {
  title: string
  /** Body copy — say what will happen, not just "are you sure". */
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Styles the confirm button as destructive. */
  danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn>(async () => false)

/**
 * Replaces `window.confirm`, which blocks the page, ignores the app's styling
 * and cannot be dismissed with the same affordances as the rest of the UI.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  // Held across renders so the promise settles exactly once, on the user's answer.
  const resolveRef = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const settle = useCallback((ok: boolean) => {
    setOptions(null)
    resolveRef.current?.(ok)
    resolveRef.current = null
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <Modal
          title={options.title}
          maxWidth={420}
          onClose={() => settle(false)}
          footer={
            <>
              <button className="btn" onClick={() => settle(false)}>
                {options.cancelLabel ?? 'Cancel'}
              </button>
              <button
                className={`btn ${options.danger ? 'btn-destructive' : 'btn-primary'}`}
                onClick={() => settle(true)}
                autoFocus
              >
                {options.confirmLabel ?? 'Confirm'}
              </button>
            </>
          }
        >
          <div className="confirm-body">
            {options.danger && (
              <span className="confirm-ico">
                <AlertTriangle size={20} />
              </span>
            )}
            <p>{options.message}</p>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext)
}
