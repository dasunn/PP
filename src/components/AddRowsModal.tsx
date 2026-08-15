import { useState } from 'react'
import Modal from './Modal'
import Dropzone from './Dropzone'
import { useStore } from '../store/store'
import { useToast } from './Toast'
import Spinner from './Spinner'
import { parseOrderChart, yieldToPaint } from '../lib/excel'
import { buildPreProdRows } from '../lib/preprod'

interface Props {
  onClose: () => void
}

export default function AddRowsModal({ onClose }: Props) {
  const { merchants, addPreProdRows, addHistory } = useStore()
  const toast = useToast()

  const [inquiryNo, setInquiryNo] = useState('')
  const [merchant, setMerchant] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = inquiryNo.trim() !== '' && !!file && !busy

  async function handleOk() {
    setError('')
    if (!file) return setError('Please add an order chart file.')
    if (!inquiryNo.trim()) return setError('Inquiry number is required.')

    setBusy(true)
    try {
      await yieldToPaint()
      const { headers, rows } = await parseOrderChart(file)
      if (rows.length === 0) {
        setBusy(false)
        return setError('No data rows were found in this file.')
      }
      const { rows: preRows, missingGlobalStyle } = buildPreProdRows(rows, headers, {
        inquiryNo: inquiryNo.trim(),
        merchant,
      })
      if (preRows.length === 0) {
        setBusy(false)
        return setError(
          'No "Global Style" column values were detected — please check the order chart headers.',
        )
      }
      addPreProdRows(preRows)
      addHistory({ type: 'import', fileName: file.name, rows: preRows.length })
      toast(
        `Imported ${preRows.length} style${preRows.length > 1 ? 's' : ''}${
          missingGlobalStyle ? ` · ${missingGlobalStyle} line(s) skipped (no global style)` : ''
        }`,
      )
      onClose()
    } catch (e) {
      setError('Could not read this file. Make sure it is a valid Excel or CSV file.')
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Add rows from order chart"
      subtitle="Upload an order chart to generate Pre-Prod rows (one per global style)."
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleOk} disabled={!canSubmit}>
            {busy && <Spinner />}
            {busy ? 'Reading workbook…' : 'OK'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>
          Inquiry Number <span className="req">*</span>
        </label>
        <input
          className="input"
          value={inquiryNo}
          onChange={(e) => setInquiryNo(e.target.value)}
          placeholder="e.g. INQ-2026-0142"
          autoFocus
        />
      </div>

      <div className="field">
        <label>Merchant name</label>
        <select className="select" value={merchant} onChange={(e) => setMerchant(e.target.value)}>
          <option value="">Select a merchant…</option>
          {merchants.map((m) => (
            <option key={m.id} value={m.fullName}>
              {m.fullName}
            </option>
          ))}
        </select>
        {merchants.length === 0 && (
          <p className="hint">No merchants yet — add them on the Merchants page.</p>
        )}
      </div>

      <div className="field">
        <label>Order chart file</label>
        <Dropzone file={file} onFile={setFile} disabled={busy} />
      </div>

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: 12.5, margin: '4px 0 0', fontWeight: 600 }}>
          {error}
        </p>
      )}
    </Modal>
  )
}
