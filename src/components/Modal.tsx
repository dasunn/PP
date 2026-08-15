import { type ReactNode, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  maxWidth?: number
  className?: string // extra modifier, e.g. "modal-erp"
}

export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth,
  className,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /**
   * A backdrop dismissal only counts when the press *and* the release both land
   * on the backdrop itself. Closing on mousedown alone threw away in-progress
   * edits whenever a stray press reached the overlay — most visibly when a
   * native <select> popup was dismissed over it, which closed the whole form.
   */
  const pressedBackdrop = useRef(false)

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) onClose()
        pressedBackdrop.current = false
      }}
    >
      <div
        className={`modal${className ? ` ${className}` : ''}`}
        style={maxWidth ? { maxWidth } : undefined}
      >
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="btn icon-btn btn-ghost" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
