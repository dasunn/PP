import { useRef, useState } from 'react'
import { UploadCloud, FileSpreadsheet, X } from 'lucide-react'

interface Props {
  file: File | null
  onFile: (file: File | null) => void
  label?: string // what the file is, e.g. "the materials workbook"
  /** Locked while the chosen file is being parsed. */
  disabled?: boolean
}

const ACCEPT = '.xlsx,.xls,.csv'

export default function Dropzone({
  file,
  onFile,
  label = 'the order chart',
  disabled = false,
}: Props) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (files && files[0]) onFile(files[0])
  }

  if (file) {
    return (
      <div className="file-pill">
        <FileSpreadsheet size={20} className="fp-ico" />
        <span className="fp-name">{file.name}</span>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
          {(file.size / 1024).toFixed(0)} KB
        </span>
        <button
          className="btn icon-btn btn-ghost btn-sm"
          onClick={() => onFile(null)}
          disabled={disabled}
          aria-label="Remove"
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`dropzone${drag ? ' drag' : ''}${disabled ? ' is-disabled' : ''}`}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        if (!disabled) handleFiles(e.dataTransfer.files)
      }}
    >
      <UploadCloud size={34} className="dz-ico" />
      <b>Drag &amp; drop {label} here</b>
      <p>or click to browse — .xlsx, .xls or .csv</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
