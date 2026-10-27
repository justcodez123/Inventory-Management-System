import React, { useState, useEffect } from 'react'
import './styles/BillPanels.css'

interface CustomerProfileCardProps {
  customer: {
    name: string
    contactNo: string
    date: string
  }
}

interface CustomerStats {
  pastVisits: number
  totalVisits: number
  totalSpent: number
  pendingCredit: number
  lastVisitDate?: string
  lastNotes?: string
}

// Convert number to ordinal string (1st, 2nd, 3rd, 4th, etc.)
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export const CustomerProfileCard: React.FC<CustomerProfileCardProps> = ({ customer }) => {
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [noteTag, setNoteTag] = useState<string>('')
  const [isEditingTag, setIsEditingTag] = useState<boolean>(false)
  const [tempTag, setTempTag] = useState<string>('')

  const customerIdentifier = customer.contactNo.trim() || customer.name.trim()

  // Load persisted custom preference tag
  useEffect(() => {
    if (customerIdentifier) {
      const saved = localStorage.getItem(`addy_tag_${customerIdentifier}`)
      if (saved) {
        setNoteTag(saved)
      } else {
        setNoteTag('Prefers slim fit / size M')
      }
    } else {
      setNoteTag('')
    }
  }, [customerIdentifier])

  // Fetch transaction history when name or contact changes
  useEffect(() => {
    const trimmedName = customer.name.trim()
    const trimmedContact = customer.contactNo.trim()

    if (!trimmedName && !trimmedContact) {
      setStats(null)
      return
    }

    // @ts-ignore - Electron IPC
    const ipc = window.electron?.ipcRenderer
    if (!ipc) {
      // Demo mock if running outside Electron
      setStats({
        pastVisits: 3,
        totalVisits: 4,
        totalSpent: 14200,
        pendingCredit: 0,
        lastVisitDate: '2026-10-10'
      })
      return
    }

    setLoading(true)
    const timeout = setTimeout(async () => {
      try {
        const filter: { customerName?: string; contactNo?: string } = {}
        if (trimmedContact) filter.contactNo = trimmedContact
        else if (trimmedName) filter.customerName = trimmedName

        const records = await ipc.invoke('get-filtered-records', filter)

        if (records && records.length > 0) {
          const pastVisits = records.length
          const totalSpent = records.reduce(
            (sum: number, r: any) => sum + (Number(r.total_amount) || 0),
            0
          )
          const pendingCredit = records.reduce(
            (sum: number, r: any) => sum + (Number(r.credit_amount) || 0),
            0
          )
          const lastVisitDate = records[0]?.date
          const lastNotes = records.find((r: any) => r.notes?.trim())?.notes

          setStats({
            pastVisits,
            totalVisits: pastVisits + 1, // Current is next visit
            totalSpent,
            pendingCredit,
            lastVisitDate,
            lastNotes
          })
        } else {
          // New customer
          setStats({
            pastVisits: 0,
            totalVisits: 1,
            totalSpent: 0,
            pendingCredit: 0
          })
        }
      } catch (err) {
        console.error('Failed to load customer profile stats', err)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timeout)
  }, [customer.name, customer.contactNo])

  const handleSaveTag = () => {
    if (customerIdentifier && tempTag.trim()) {
      localStorage.setItem(`addy_tag_${customerIdentifier}`, tempTag.trim())
      setNoteTag(tempTag.trim())
    }
    setIsEditingTag(false)
  }

  const quickPresets = ['Prefers slim fit / size M', 'Prefers cotton', 'Size L regular', 'VIP Client']

  return (
    <aside className="bill-side-panel glass-card fade-in">
      <h3 className="bill-panel-title">
        {customer.name ? customer.name : 'Client Insights'}
      </h3>

      {customer.contactNo ? (
        <p className="bill-panel-sub">📞 {customer.contactNo}</p>
      ) : (
        <p className="bill-panel-sub">Loyalty & purchase metrics</p>
      )}

      {!customer.name && !customer.contactNo ? (
        <div className="profile-placeholder">
          <div className="placeholder-icon">📋</div>
          <p className="placeholder-title">No Customer Selected</p>
          <p className="placeholder-text">
            Type customer name or contact number above to view total visits, lifetime spend & pending credits.
          </p>
        </div>
      ) : loading ? (
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <span>Analyzing customer history...</span>
        </div>
      ) : (
        <div className="profile-content">
          {/* Stat 1: Total Visits */}
          <div className="stat-card">
            <span className="stat-label">Total Visits</span>
            <div className="stat-value-row">
              <span className="stat-value highlight">
                {stats ? `${getOrdinal(stats.totalVisits)} Visit` : '1st Visit'}
              </span>
              {stats && stats.pastVisits > 0 ? (
                <span className="stat-pill past">({stats.pastVisits} past)</span>
              ) : (
                <span className="stat-pill new">New Client</span>
              )}
            </div>
          </div>

          {/* Stat 2: Total Spent */}
          <div className="stat-card">
            <span className="stat-label">Total Spent</span>
            <div className="stat-value-row">
              <span className="stat-value currency">
                ₹{stats ? stats.totalSpent.toLocaleString('en-IN') : '0'}
              </span>
              <span className="stat-pill spend">Lifetime</span>
            </div>
          </div>

          {/* Stat 3: Pending Credit */}
          <div className="stat-card">
            <span className="stat-label">Pending Credit</span>
            <div className="stat-value-row">
              {stats && stats.pendingCredit > 0 ? (
                <span className="stat-badge due">
                  ⚠️ ₹{stats.pendingCredit.toLocaleString('en-IN')} (Due)
                </span>
              ) : (
                <span className="stat-badge clear">
                  ✓ ₹0 (All Clear)
                </span>
              )}
            </div>
          </div>

          {/* Stat 4: Quick Note Tag */}
          <div className="preference-section">
            <div className="pref-header">
              <span className="pref-title">Quick Note</span>
              {!isEditingTag && (
                <button
                  type="button"
                  className="pref-edit-btn"
                  onClick={() => {
                    setTempTag(noteTag)
                    setIsEditingTag(true)
                  }}
                >
                  ✎ Edit
                </button>
              )}
            </div>

            {isEditingTag ? (
              <div className="pref-edit-box">
                <input
                  type="text"
                  value={tempTag}
                  onChange={(e) => setTempTag(e.target.value)}
                  placeholder="e.g. Prefers slim fit / size M"
                  className="pref-input"
                  autoFocus
                />
                <div className="pref-preset-list">
                  {quickPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="pref-preset-pill"
                      onClick={() => setTempTag(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className="pref-actions">
                  <button type="button" className="pref-save-btn" onClick={handleSaveTag}>
                    Save
                  </button>
                  <button
                    type="button"
                    className="pref-cancel-btn"
                    onClick={() => setIsEditingTag(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="pref-tag-display"
                onClick={() => {
                  setTempTag(noteTag)
                  setIsEditingTag(true)
                }}
                title="Click to edit preference note"
              >
                <span className="pref-tag-icon">🏷️</span>
                <span className="pref-tag-text">{noteTag || 'Prefers slim fit / size M'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

export default CustomerProfileCard
