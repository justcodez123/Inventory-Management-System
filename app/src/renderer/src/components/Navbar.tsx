import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { ThemeToggle } from './ThemeToggle'
import './styles/Navbar.css'

export type NavOption = 'Billing' | 'Records' | 'Vendors'

interface NavbarProps {
  activeTab: NavOption
  onTabChange: (tab: NavOption) => void
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const { isLoggedIn, user, logout, setShowLoginModal } = useAuth()
  const { license, syncWithServer, isSyncing } = useSubscription()

  const businessName = license?.registration?.businessName || 'Inventory System'
  const fullName = license?.registration?.fullName
  // const contactNo = license?.registration?.contactNo
  const adminNote = license?.registration?.notes

  // Define the navigation options
  const options: NavOption[] = ['Billing', 'Records', 'Vendors']

  return (
    <header className="w-full bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 py-2.5 flex flex-col gap-2 z-50">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Synced Business Name & Owner Info */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>{businessName}</span>
              {/* {license?.paymentStatus === 'Paid' && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ✓ Pro Active ({license.daysRemaining}d)
                </span>
              )} */}
              {/* {license?.paymentStatus === 'Trial' && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Free Trial ({license.daysRemaining}d left)
                </span>
              )} */}
            </h1>
            {fullName && (
              <p className="text-xs text-slate-400">
                Owner: <span className="text-slate-200 font-medium">{fullName}</span>
                {/* {contactNo ? ` • ${contactNo}` : ''}
                <span className="ml-2 text-slate-500 font-mono">({license?.machineId})</span> */}
              </p>
            )}
          </div>
        </div>

        {/* Center: Navigation Options */}
        <nav className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === option
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              onClick={() => {
                onTabChange(option)
                if (option === 'Vendors' && !isLoggedIn) {
                  setShowLoginModal(true)
                }
              }}
            >
              {option}
            </button>
          ))}
        </nav>

        {/* Right: Manual Sync Trigger, Theme Toggle & Auth */}
        <div className="flex items-center gap-3">
          {/* Manual Sync Trigger */}
          <button
            type="button"
            onClick={() => syncWithServer()}
            disabled={isSyncing}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Sync with Remote Master Server"
          >
            <span className={isSyncing ? 'animate-spin' : ''}>↻</span>
            <span>{isSyncing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <ThemeToggle />

          {isLoggedIn ? (
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-700">
              <span className="text-xs font-medium text-slate-300">
                Welcome, {user}
              </span>
              <button
                type="button"
                onClick={logout}
                className="px-2.5 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium rounded-lg transition-colors border border-red-500/30 text-xs cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="px-3 py-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 font-medium rounded-lg transition-colors border border-indigo-500/30 text-xs cursor-pointer"
            >
              Login
            </button>
          )}
        </div>
      </div>

      {/* Optional: Server-Controlled Admin Broadcast / Note Banner */}
      {adminNote && (
        <div className="bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-xs px-3 py-1.5 rounded flex items-center justify-between">
          <span>
            <strong className="text-indigo-400 mr-1.5">Notice:</strong>
            {adminNote}
          </span>
        </div>
      )}
    </header>
  )
}

export default Navbar
