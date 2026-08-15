import { useState } from 'react'
import { Plus, Pencil, Trash2, Users, Mail } from 'lucide-react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'
import type { Merchant } from '../types'

const blank = { fullName: '', email: '', status: 'Active' as const }

export default function Merchants() {
  const { merchants, addMerchant, updateMerchant, deleteMerchant } = useStore()
  const toast = useToast()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Merchant | null>(null)
  const [form, setForm] = useState<{ fullName: string; email: string; status: 'Active' | 'Inactive' }>(blank)
  const [error, setError] = useState('')

  function startAdd() {
    setEditing(null)
    setForm(blank)
    setError('')
    setOpen(true)
  }
  function startEdit(m: Merchant) {
    setEditing(m)
    setForm({ fullName: m.fullName, email: m.email, status: m.status })
    setError('')
    setOpen(true)
  }

  function save() {
    if (!form.fullName.trim()) return setError('Full name is required.')
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return setError('Please enter a valid email address.')

    if (editing) {
      updateMerchant({ ...editing, ...form, fullName: form.fullName.trim() })
      toast('Merchant updated')
    } else {
      addMerchant({ ...form, fullName: form.fullName.trim() })
      toast('Merchant added')
    }
    setOpen(false)
  }

  async function remove(m: Merchant) {
    const ok = await confirm({
      title: 'Delete this merchant?',
      message: (
        <>
          <b>{m.fullName}</b> will no longer be selectable in the Pre-Prod merchant lookup.
          Existing rows keep the name already saved on them.
        </>
      ),
      confirmLabel: 'Delete merchant',
      danger: true,
    })
    if (!ok) return
    deleteMerchant(m.id)
    toast('Merchant deleted')
  }

  return (
    <Layout
      title="Merchants"
      subtitle="People available in the Pre-Prod merchant lookup."
      actions={
        <button className="btn btn-primary" onClick={startAdd}>
          <Plus size={16} />
          Add merchant
        </button>
      }
    >
      <div className="grid-wrap">
        {merchants.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">
              <Users size={30} />
            </div>
            <h3>No merchants yet</h3>
            <p>Add merchants so they appear in the Pre-Prod chart lookup.</p>
          </div>
        ) : (
          <div className="grid-scroll">
            <table className="grid">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{m.fullName}</td>
                    <td>
                      {m.email ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Mail size={13} style={{ color: 'var(--muted)' }} />
                          {m.email}
                        </span>
                      ) : (
                        <span className="empty-cell">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${m.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn icon-btn btn-ghost btn-sm"
                          onClick={() => startEdit(m)}
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn icon-btn btn-danger btn-sm"
                          onClick={() => remove(m)}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <Modal
          title={editing ? 'Edit merchant' : 'Add merchant'}
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={save}>
                {editing ? 'Save changes' : 'Add merchant'}
              </button>
            </>
          }
        >
          <div className="field">
            <label>
              Full name <span className="req">*</span>
            </label>
            <input
              className="input"
              value={form.fullName}
              autoFocus
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="e.g. Nimal Perera"
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="name@example.com"
            />
          </div>
          <div className="field">
            <label>Status</label>
            <select
              className="select"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'Active' | 'Inactive' }))}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 12.5, fontWeight: 600, margin: 0 }}>{error}</p>
          )}
        </Modal>
      )}
    </Layout>
  )
}
