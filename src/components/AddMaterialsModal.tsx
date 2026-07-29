import { useState } from 'react'
import Modal from './Modal'
import Dropzone from './Dropzone'
import { useStore } from '../store/store'
import { useToast } from './Toast'
import { MissingSheetError, parseMaterialData } from '../lib/excel'
import { EXCLUDED_PROD_GRP, MATERIAL_SHEET_NAME, buildMaterialRows } from '../lib/materials'

interface Props {
  onClose: () => void
}

export default function AddMaterialsModal({ onClose }: Props) {
  const { addMaterials, addHistory } = useStore()
  const toast = useToast()

  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleOk() {
    setError('')
    if (!file) return setError('Please add a materials file.')

    setBusy(true)
    try {
      const { headers, rows } = await parseMaterialData(file)
      if (rows.length === 0) {
        setBusy(false)
        return setError(`No data rows were found on the "${MATERIAL_SHEET_NAME}" tab.`)
      }
      const built = buildMaterialRows(rows, headers)
      const { rows: materialRows, excludedProdGrp, missingStyle, duplicates, styles } = built
      if (materialRows.length === 0) {
        setBusy(false)
        return setError(
          excludedProdGrp > 0
            ? `Every line on the Data tab was either ${EXCLUDED_PROD_GRP} or had no STYLE — nothing to import.`
            : 'No "STYLE" column values were detected — please check the Data tab headers.',
        )
      }
      addMaterials(materialRows)
      addHistory({ type: 'import', fileName: file.name, rows: materialRows.length })

      const skipped = [
        excludedProdGrp && `${excludedProdGrp} ${EXCLUDED_PROD_GRP}`,
        duplicates && `${duplicates} duplicate`,
        missingStyle && `${missingStyle} without a style`,
      ].filter(Boolean)
      toast(
        `Imported ${materialRows.length} material line${materialRows.length > 1 ? 's' : ''} for ${styles} style${styles > 1 ? 's' : ''}${
          skipped.length ? ` · skipped ${skipped.join(', ')}` : ''
        }`,
      )
      onClose()
    } catch (e) {
      setBusy(false)
      if (e instanceof MissingSheetError) {
        setError(
          `This workbook has no "${MATERIAL_SHEET_NAME}" tab${
            e.available.length ? ` — it contains: ${e.available.join(', ')}` : ''
          }.`,
        )
        return
      }
      setError('Could not read this file. Make sure it is a valid Excel or CSV file.')
    }
  }

  return (
    <Modal
      title="Add material details"
      subtitle={`Upload a materials workbook — only the "${MATERIAL_SHEET_NAME}" tab is read.`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleOk} disabled={!file || busy}>
            {busy ? 'Processing…' : 'OK'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Materials file</label>
        <Dropzone file={file} onFile={setFile} label="the materials workbook" />
        <p className="hint">
          Expected columns: <b>STYLE</b>, <b>PROD_GRP</b>, <b>ITEM_DESCRIPTION</b>,{' '}
          <b>MAT_COLOUR</b>, <b>SUPPLIER</b>. Lines are matched to Pre-Prod rows on{' '}
          <b>STYLE</b> = <b>M3 Style</b>. Re-uploading a style replaces its existing lines.
        </p>
        <p className="hint">
          On import, <b>{EXCLUDED_PROD_GRP}</b> lines are dropped and each style keeps only
          unique field combinations — repeated lines are collapsed into one.
        </p>
      </div>

      {error && (
        <p style={{ color: 'var(--red)', fontSize: 12.5, margin: '4px 0 0', fontWeight: 600 }}>
          {error}
        </p>
      )}
    </Modal>
  )
}
