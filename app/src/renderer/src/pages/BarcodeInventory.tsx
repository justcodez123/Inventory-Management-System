import React from 'react'

interface BarcodeInventoryProps {
  onBackToBilling?: () => void
}

export const BarcodeInventory: React.FC<BarcodeInventoryProps> = ({ onBackToBilling }) => {
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 sm:p-12 text-slate-100 select-none animate-fadeIn">
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl -z-10" />
      </div>

      <div className="max-w-xl w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-8 sm:p-10 shadow-2xl backdrop-blur-md text-center flex flex-col items-center relative overflow-hidden">
        {/* Subtle decorative top border */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

        {/* Animated Barcode Visual with Laser Line */}
        <div className="relative mb-6 p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-center">
          <svg
            className="w-20 h-16 text-indigo-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 5v14" />
            <path d="M8 5v14" />
            <path d="M12 5v14" />
            <path d="M17 5v14" />
            <path d="M21 5v14" />
            <path d="M5 5v14" />
            <path d="M15 5v14" />
            <path d="M19 5v14" />
          </svg>

          {/* Glowing Red Laser Scan Bar */}
          <div className="absolute inset-x-2 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
        </div>

        {/* Coming Soon Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-3">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          Coming Soon
        </div>

        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-3">
          Barcode Inventory
        </h2>

        {/* Description */}
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8 max-w-md">
          Automated hardware barcode scanner integration, batch SKU labeling, real-time stock-in/stock-out logs, and low-inventory alerts are under active development.
        </p>

        {/* Feature Teasers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left mb-8">
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-lg">⚡</span>
            <h4 className="text-xs font-bold text-slate-200 mt-1">USB / 2.4G Scanner</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Plug & play instant scan capture</p>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-lg">📦</span>
            <h4 className="text-xs font-bold text-slate-200 mt-1">Real-Time Stock</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Automated deduction on billing</p>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-lg">🏷️</span>
            <h4 className="text-xs font-bold text-slate-200 mt-1">Label Printing</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Barcode tag generator for shelves</p>
          </div>
        </div>

        {/* Back Button */}
        {onBackToBilling && (
          <button
            type="button"
            onClick={onBackToBilling}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
          >
            <span>←</span> Back to Billing
          </button>
        )}
      </div>
    </div>
  )
}

export default BarcodeInventory
