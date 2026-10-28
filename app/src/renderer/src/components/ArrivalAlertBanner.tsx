import React, { useState, useEffect, useCallback } from 'react'

export interface UpcomingArrivalItem {
  id: number
  wholesaler_id: number
  wholesaler_name: string
  wholesaler_city?: string
  date: string
  arrival_date: string
  product: string
  quantity: number
  bill_amount: number
  notes?: string
  daysLeft: number
}

interface ArrivalAlertBannerProps {
  onNavigateToVendors?: () => void
}

export const VENDOR_NOTIF_SNOOZE_KEY = 'vendor_notif_snooze_until'
export const TWO_HOURS_MS = 2 * 60 * 60 * 1000 // 2 hours in milliseconds (7,200,000 ms)

export const getVendorNotifRemainingMs = (): number => {
  try {
    const raw = localStorage.getItem(VENDOR_NOTIF_SNOOZE_KEY)
    if (!raw) return 0
    const until = Number(raw)
    if (Number.isNaN(until) || Date.now() >= until) {
      localStorage.removeItem(VENDOR_NOTIF_SNOOZE_KEY)
      return 0
    }
    return Math.max(0, until - Date.now())
  } catch {
    return 0
  }
}

export const isVendorNotifStopped = (): boolean => {
  return getVendorNotifRemainingMs() > 0
}

export const stopVendorNotificationsForTwoHours = (): void => {
  try {
    const until = Date.now() + TWO_HOURS_MS
    localStorage.setItem(VENDOR_NOTIF_SNOOZE_KEY, String(until))
    window.dispatchEvent(new CustomEvent('vendor-notif-state-changed'))
  } catch (err) {
    console.error('Failed to snooze vendor notifications:', err)
  }
}

export const startVendorNotificationsNow = (): void => {
  try {
    localStorage.removeItem(VENDOR_NOTIF_SNOOZE_KEY)
    window.dispatchEvent(new CustomEvent('vendor-notif-state-changed'))
  } catch (err) {
    console.error('Failed to start vendor notifications:', err)
  }
}

const getDaysUntilArrival = (arrivalDateStr: string): number | null => {
  if (!arrivalDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(arrivalDateStr.trim())) {
    return null
  }
  const [year, month, day] = arrivalDateStr.trim().split('-').map(Number)
  const arrivalMidnight = new Date(year, month - 1, day).getTime()

  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  const diffMs = arrivalMidnight - todayMidnight
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) return dateStr
  const [year, month, day] = dateStr.trim().split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  return dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export const ArrivalAlertBanner: React.FC<ArrivalAlertBannerProps> = ({ onNavigateToVendors }) => {
  const [arrivals, setArrivals] = useState<UpcomingArrivalItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isStopped, setIsStopped] = useState<boolean>(() => isVendorNotifStopped())

  // @ts-ignore
  const isElectron = Boolean(window.electron && window.electron.ipcRenderer)

  const fetchUpcomingArrivals = useCallback(async () => {
    try {
      let rawList: any[] = []
      if (isElectron) {
        // @ts-ignore
        const res = await window.electron.ipcRenderer.invoke('get-upcoming-arrivals')
        if (Array.isArray(res)) {
          rawList = res
        }
      } else {
        const cached = localStorage.getItem('mock_upcoming_arrivals')
        if (cached) {
          rawList = JSON.parse(cached)
        }
      }

      const filtered: UpcomingArrivalItem[] = rawList
        .map((item) => {
          const daysLeft = getDaysUntilArrival(item.arrival_date)
          return {
            ...item,
            daysLeft: daysLeft ?? -999
          }
        })
        // Keep only arrivals within 5 days down to today (0 <= daysLeft <= 5)
        .filter((item) => item.daysLeft >= 0 && item.daysLeft <= 5)
        .sort((a, b) => a.daysLeft - b.daysLeft || a.id - b.id)

      setArrivals(filtered)
      setCurrentIndex((prev) => (filtered.length > 0 ? prev % filtered.length : 0))
    } catch (error) {
      console.error('Failed to fetch upcoming stock arrivals:', error)
    }
  }, [isElectron])

  // Track stop/start state and enforce automatic 2-hour re-activation
  useEffect(() => {
    let wakeTimer: ReturnType<typeof setTimeout> | null = null

    const syncNotifState = () => {
      if (wakeTimer) {
        clearTimeout(wakeTimer)
        wakeTimer = null
      }

      const remainingMs = getVendorNotifRemainingMs()
      if (remainingMs > 0) {
        setIsStopped(true)
        // Automatically re-enable notifications when the 2-hour snooze expires
        wakeTimer = setTimeout(() => {
          localStorage.removeItem(VENDOR_NOTIF_SNOOZE_KEY)
          setIsStopped(false)
          fetchUpcomingArrivals()
          window.dispatchEvent(new CustomEvent('vendor-notif-state-changed'))
        }, remainingMs)
      } else {
        setIsStopped(false)
      }
    }

    syncNotifState()
    window.addEventListener('vendor-notif-state-changed', syncNotifState)

    // Periodic 15-second check as a safeguard against system sleep/wake drift
    const checkInterval = setInterval(() => {
      const currentlyStopped = isVendorNotifStopped()
      setIsStopped((prev) => {
        if (prev && !currentlyStopped) {
          fetchUpcomingArrivals()
          window.dispatchEvent(new CustomEvent('vendor-notif-state-changed'))
        }
        return currentlyStopped
      })
    }, 15000)

    return () => {
      if (wakeTimer) clearTimeout(wakeTimer)
      window.removeEventListener('vendor-notif-state-changed', syncNotifState)
      clearInterval(checkInterval)
    }
  }, [fetchUpcomingArrivals])

  useEffect(() => {
    fetchUpcomingArrivals()

    const handleArrivalUpdate = () => {
      fetchUpcomingArrivals()
    }

    window.addEventListener('vendor-arrivals-updated', handleArrivalUpdate)
    // Refresh every 60 seconds so date changes at midnight are picked up automatically
    const refreshInterval = setInterval(fetchUpcomingArrivals, 60000)

    return () => {
      window.removeEventListener('vendor-arrivals-updated', handleArrivalUpdate)
      clearInterval(refreshInterval)
    }
  }, [fetchUpcomingArrivals])

  // Rotate through multiple upcoming arrivals every 4.5 seconds
  useEffect(() => {
    if (arrivals.length <= 1 || isStopped) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % arrivals.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [arrivals.length, isStopped])

  if (isStopped || arrivals.length === 0) return null

  const current = arrivals[currentIndex] || arrivals[0]
  const isToday = current.daysLeft === 0
  const isTomorrow = current.daysLeft === 1

  const getCountdownLabel = (days: number) => {
    if (days === 0) return 'ARRIVING TODAY'
    if (days === 1) return 'IN 1 DAY (TOMORROW)'
    return `IN ${days} DAYS`
  }

  return (
    <div
      className={`w-full px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-sm border-b transition-colors z-40 ${
        isToday
          ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white border-emerald-700'
          : isTomorrow
            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white border-amber-600'
            : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white border-indigo-700'
      }`}
    >
      {/* Left / Center Alert Content */}
      <div className="flex items-center justify-center gap-2.5 flex-1 flex-wrap text-center sm:text-left">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-white/20 text-white border border-white/30 shadow-xs">
          <span>{isToday ? '🚨' : '🚚'}</span>
          <span>{getCountdownLabel(current.daysLeft)}</span>
        </span>

        <span className="tracking-wide">
          Stock of{' '}
          <strong className="font-extrabold underline decoration-white/60 underline-offset-2">
            {current.quantity > 0 ? `${current.quantity} pcs ` : ''}
            {current.product || 'Stock Batch'}
          </strong>{' '}
          from{' '}
          <strong className="font-extrabold bg-black/15 px-2 py-0.5 rounded-md">
            {current.wholesaler_name}
            {current.wholesaler_city ? ` (${current.wholesaler_city})` : ''}
          </strong>{' '}
          {isToday ? (
            <span>is scheduled to arrive <strong>Today ({formatDisplayDate(current.arrival_date)})</strong>!</span>
          ) : (
            <span>
              is arriving in <strong>{current.daysLeft} {current.daysLeft === 1 ? 'day' : 'days'}</strong> on{' '}
              <strong>{formatDisplayDate(current.arrival_date)}</strong>.
            </span>
          )}
        </span>
      </div>

      {/* Right Controls: Multi-item stepper & quick link */}
      <div className="flex items-center gap-2 shrink-0">
        {arrivals.length > 1 && (
          <div className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-lg border border-white/20 text-xs">
            <button
              type="button"
              onClick={() =>
                setCurrentIndex((prev) => (prev - 1 + arrivals.length) % arrivals.length)
              }
              className="hover:text-white/80 px-1 font-bold cursor-pointer"
              title="Previous Arrival"
            >
              ‹
            </button>
            <span className="font-semibold text-[11px]">
              {currentIndex + 1}/{arrivals.length}
            </span>
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => (prev + 1) % arrivals.length)}
              className="hover:text-white/80 px-1 font-bold cursor-pointer"
              title="Next Arrival"
            >
              ›
            </button>
          </div>
        )}

        {onNavigateToVendors && (
          <button
            type="button"
            onClick={onNavigateToVendors}
            className="px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/25 transition-colors cursor-pointer whitespace-nowrap"
          >
            View Ledger →
          </button>
        )}
      </div>
    </div>
  )
}

export default ArrivalAlertBanner
