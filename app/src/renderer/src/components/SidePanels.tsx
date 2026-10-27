import React, { useEffect, useMemo, useState } from 'react'
import './styles/SidePanels.css'

/* ---------- Quick Add tiles ---------- */
interface QuickAddProps {
  products: string[]
  onPick: (product: string) => void
  onAddProduct?: (product: string) => void
  onDeleteProduct?: (product: string) => void
  onResetProducts?: () => void
}

export const QuickAddPanel: React.FC<QuickAddProps> = ({
  products,
  onPick,
  onAddProduct,
  onDeleteProduct,
  onResetProducts
}) => {
  const [newItem, setNewItem] = useState('')
  const [isManaging, setIsManaging] = useState(false)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newItem.trim()
    if (!trimmed) return
    onAddProduct?.(trimmed)
    setNewItem('')
  }

  return (
    <aside className="side-panel glass-card fade-in">
      <div className="quick-add-header">
        <div>
          <h3 className="side-panel-title">Quick Add</h3>
          <p className="side-panel-sub">Tap product to bill</p>
        </div>
        <div className="quick-add-actions">
          {onDeleteProduct && (
            <button
              type="button"
              className={`quick-manage-btn ${isManaging ? 'active' : ''}`}
              title={isManaging ? 'Done editing' : 'Manage / Delete products'}
              onClick={() => setIsManaging(!isManaging)}
            >
              {isManaging ? 'Done' : '⚙️'}
            </button>
          )}
        </div>
      </div>

      {onAddProduct && (
        <form onSubmit={handleAdd} className="quick-add-form">
          <input
            type="text"
            className="quick-add-input"
            placeholder="Add new product..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
          <button type="submit" className="quick-add-btn" title="Add to Quick Add">
            +
          </button>
        </form>
      )}

      {isManaging && onResetProducts && (
        <button
          type="button"
          onClick={onResetProducts}
          className="quick-reset-btn"
          title="Restore original default items"
        >
          ↺ Reset Defaults
        </button>
      )}

      <div className="quick-tiles">
        {products.length === 0 ? (
          <p className="side-panel-empty">No quick products. Add one above!</p>
        ) : (
          products.map((p) => (
            <button
              key={p}
              type="button"
              className={`quick-tile ${isManaging ? 'managing' : ''}`}
              onClick={() => onPick(p)}
              title={isManaging ? `Click ✕ to delete ${p}` : `Add ${p} to bill`}
            >
              <span className="quick-tile-initial">{p.charAt(0).toUpperCase()}</span>
              <span className="quick-tile-name">{p}</span>
              {onDeleteProduct && (
                <span
                  role="button"
                  tabIndex={0}
                  className="quick-tile-delete"
                  title={`Delete ${p}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteProduct(p)
                  }}
                >
                  ✕
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </aside>
  )
}


/* ---------- Top Sellers ---------- */
type Range = 'today' | 'week'

interface TopSellersProps {
  /** Changes whenever a new bill is saved so the chart refreshes. */
  refreshKey?: unknown
}

const toISO = (d: Date): string => {
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().split('T')[0]
}

export const TopSellersPanel: React.FC<TopSellersProps> = ({ refreshKey }) => {
  const [range, setRange] = useState<Range>('today')
  const [records, setRecords] = useState<{ items_summary?: string }[]>([])

  useEffect(() => {
    // @ts-ignore - Electron IPC call
    const ipc = window.electron?.ipcRenderer
    if (!ipc) return
    const end = new Date()
    const start = new Date()
    if (range === 'week') start.setDate(start.getDate() - 6)
    ipc
      .invoke('get-filtered-records', { startDate: toISO(start), endDate: toISO(end) })
      .then((rows: any[]) => setRecords(rows || []))
      .catch(() => setRecords([]))
  }, [range, refreshKey])

  const top = useMemo(() => {
    const totals: Record<string, number> = {}
    records.forEach((r) => {
      // items_summary looks like: "2x Tshirt (Size: M), 1x Jeans (Size: 32)"
      ;(r.items_summary || '').split(', ').forEach((part) => {
        const m = part.match(/^(\d+(?:\.\d+)?)x\s+(.+?)\s*\(Size:/)
        if (m) totals[m[2]] = (totals[m[2]] || 0) + Number(m[1])
      })
    })
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  }, [records])

  const max = top.length ? top[0][1] : 1

  return (
    <aside className="side-panel glass-card fade-in">
      <h3 className="side-panel-title">Top Sellers</h3>
      <div className="range-switch">
        <button
          type="button"
          className={range === 'today' ? 'active' : ''}
          onClick={() => setRange('today')}
        >
          Today
        </button>
        <button
          type="button"
          className={range === 'week' ? 'active' : ''}
          onClick={() => setRange('week')}
        >
          This Week
        </button>
      </div>

      {top.length === 0 ? (
        <p className="side-panel-empty">No sales yet for this period.</p>
      ) : (
        <ul className="bar-chart">
          {top.map(([name, qty], i) => (
            <li key={name} className="bar-row">
              <div className="bar-label">
                <span>{name}</span>
                <strong>{qty}</strong>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(qty / max) * 100}%`, animationDelay: `${i * 80}ms` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
