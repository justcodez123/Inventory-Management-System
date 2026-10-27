import React, { useState, useEffect } from 'react'
import { useSubscription } from '../context/SubscriptionContext'
import paymentQrImg from '../assets/payment-qr.jpg'

export const SubscriptionLockoutModal: React.FC = () => {
  const { license, syncWithServer, isSyncing } = useSubscription()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Background polling every 10 seconds to auto-detect payment confirmation from server
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await syncWithServer()
      } catch {
        // Silently retry
      }
    }, 10 * 1000)

    return () => clearInterval(interval)
  }, [syncWithServer])

  if (!license?.isLocked || !license.registration) return null

  const { businessName, fullName, contactNo, currentPrice, notes } = license.registration
  const machineId = license.machineId || 'UNKNOWN_ID'

  const upiId = 'aashishkaaley@okaxis'
  const payeeName = 'Aashish Kaaley'
  const merchantPhone = '+91 7387365308'

  const getLockTitle = () => {
    switch (license.lockReason) {
      case 'CLOCK_TAMPERED':
        return 'Security Alert: System Clock or Database Tamper Detected'
      case 'TRIAL_EXPIRED':
        return 'Your 30-Day Free Trial Has Expired'
      case 'PENDING':
      default:
        return 'Subscription Payment Pending'
    }
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const isClockTamper = license.lockReason === 'CLOCK_TAMPERED'

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white space-y-5 my-auto">
        {/* Lock Header */}
        <div className="border-b border-slate-800 pb-4">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 mb-2">
            Application Locked
          </span>
          <h2 className="text-xl font-bold text-white">{getLockTitle()}</h2>
          <p className="text-xs text-slate-400 mt-1">
            {isClockTamper
              ? 'Your computer date or time was moved backward. Please synchronize your system time with the internet to unlock.'
              : 'Your store subscription is pending renewal. Scan the QR code or send payment below to reactivate.'}
          </p>
        </div>

        {/* Synced Store & Owner Details Card */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 text-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Business Name:</span>
            <span className="font-semibold text-white">{businessName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Registered Owner:</span>
            <span className="font-medium text-slate-200">{fullName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Owner Contact:</span>
            <span className="font-medium text-slate-200">{contactNo}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-700/60">
            <span className="text-slate-400">Machine ID:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-amber-400 select-all">{machineId}</span>
              <button
                type="button"
                onClick={() => handleCopy(machineId, 'mid')}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
              >
                {copiedKey === 'mid' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Custom Admin Message from PostgreSQL `notes` Column */}
        {notes && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-sm text-amber-200">
            <p className="font-semibold text-amber-400 text-xs uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <span>📢</span> Message from Administrator
            </p>
            <p className="whitespace-pre-line text-xs">{notes}</p>
          </div>
        )}

        {!isClockTamper && (
          <>
            {/* Embedded Payment QR Code & Renewal Amount */}
            <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 flex flex-col items-center text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Renewal Amount Due
              </p>
              <p className="text-3xl font-extrabold text-emerald-400 my-1">
                ₹{currentPrice.toLocaleString('en-IN')}
                <span className="text-xs font-normal text-slate-400 ml-1.5">/ month</span>
              </p>

              {/* Embedded QR Code Image */}
              <div className="mt-3 p-3 bg-white rounded-xl shadow-md border border-slate-700/50 flex flex-col items-center">
                <img
                  src={paymentQrImg}
                  alt="Scan to Pay Monthly Subscription"
                  className="w-48 h-48 rounded-lg object-contain"
                />
                <span className="text-[11px] text-slate-600 font-semibold mt-2">
                  Scan with GPay / PhonePe / Paytm / BHIM
                </span>
              </div>
            </div>

            {/* Direct UPI & Merchant Payment Details */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5 text-xs space-y-2 text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">UPI ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-200">{upiId}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(upiId, 'upi')}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                  >
                    {copiedKey === 'upi' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Payee Name:</span>
                <span className="text-slate-200 font-semibold">{payeeName}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Support / Contact:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-200">{merchantPhone}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(merchantPhone, 'phone')}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                  >
                    {copiedKey === 'phone' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {isClockTamper && (
          <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-xs space-y-2 text-red-300">
            <p className="font-semibold text-red-200">How to resolve clock inconsistency:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Open Windows Settings &gt; Time &amp; Language &gt; Date &amp; Time.</li>
              <li>Toggle on &quot;Set time automatically&quot; and click &quot;Sync now&quot;.</li>
              <li>Click the verification button below to re-verify your system.</li>
            </ol>
          </div>
        )}

        {/* Action Button */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => syncWithServer()}
            disabled={isSyncing}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold text-sm transition cursor-pointer shadow-lg flex items-center justify-center gap-2 text-white"
          >
            {isSyncing ? (
              <>
                <span className="animate-spin text-base">↻</span>
                <span>Checking Server Status...</span>
              </>
            ) : (
              <span>{isClockTamper ? '🔄 Re-verify System Clock' : '✓ I Have Paid — Verify & Unlock Now'}</span>
            )}
          </button>

          {!isClockTamper && (
            <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Auto-detecting payment confirmation...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default SubscriptionLockoutModal
