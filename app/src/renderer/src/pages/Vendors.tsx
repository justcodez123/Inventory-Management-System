/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import '../components/styles/Vendors.css'

export interface Vendor {
  id: number
  name: string
  phone?: string
  city?: string
  notes?: string
  opening_balance: number
  total_quantity: number
  total_purchases: number
  total_paid: number
  current_outstanding: number
}

export interface VendorTransaction {
  id: number
  wholesaler_id: number
  date: string
  transaction_type: 'PURCHASE' | 'PAYMENT'
  product?: string
  quantity: number
  bill_amount: number
  paid_amount: number
  pending_amount: number
  running_outstanding: number
  notes?: string
}

// Default mock wholesalers if running outside Electron
const MOCK_VENDORS: Vendor[] = [
  {
    id: 1,
    name: 'Hariyan Wholesale',
    phone: '+91 98230 11223',
    city: 'Haryana',
    notes: 'Lease supplier for denim & shirts',
    opening_balance: 100000,
    total_quantity: 56,
    total_purchases: 56000,
    total_paid: 25000,
    current_outstanding: 131000
  },
  {
    id: 2,
    name: 'Mumbai Wholesaler',
    phone: '+91 98190 44556',
    city: 'Mumbai',
    notes: 'Wholesale supplier for jackets & trousers',
    opening_balance: 0,
    total_quantity: 0,
    total_purchases: 0,
    total_paid: 0,
    current_outstanding: 0
  },
  {
    id: 3,
    name: 'Delhi Wholesaler',
    phone: '+91 98110 77889',
    city: 'Delhi',
    notes: 'Cotton & casual wear supplier',
    opening_balance: 0,
    total_quantity: 0,
    total_purchases: 0,
    total_paid: 0,
    current_outstanding: 0
  }
]

const MOCK_TRANSACTIONS: Record<number, VendorTransaction[]> = {
  1: [
    {
      id: 101,
      wholesaler_id: 1,
      date: '2026-05-14',
      transaction_type: 'PURCHASE',
      product: 'Jeans',
      quantity: 56,
      bill_amount: 56000,
      paid_amount: 25000,
      pending_amount: 31000,
      running_outstanding: 131000,
      notes: 'Taken on credit / lease'
    }
  ]
}

export const Vendors: React.FC = () => {
  const { isLoggedIn, setShowLoginModal } = useAuth()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<VendorTransaction[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Modals state
  const [showVendorModal, setShowVendorModal] = useState<boolean>(false)
  const [vendorFormData, setVendorFormData] = useState({
    id: 0,
    name: '',
    phone: '',
    city: '',
    opening_balance: '',
    notes: ''
  })
  const [isEditingVendor, setIsEditingVendor] = useState<boolean>(false)

  // Stock (Purchase/Lease) Modal state
  const [showStockModal, setShowStockModal] = useState<boolean>(false)
  const [stockFormData, setStockFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    product: '',
    quantity: '',
    bill_amount: '',
    paid_amount: '',
    notes: ''
  })

  // Payment Settlement Modal state
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false)
  const [paymentFormData, setPaymentFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_mode: 'Bank Transfer / UPI',
    notes: ''
  })

  // @ts-ignore
  const isElectron = !!window.electron

  // Load vendors list
  const loadVendors = async () => {
    setLoading(true)
    try {
      if (isElectron) {
        // @ts-ignore
        const data = await window.electron.ipcRenderer.invoke('get-vendors')
        setVendors(data)
        if (data.length > 0 && !selectedVendorId) {
          setSelectedVendorId(data[0].id)
        }
      } else {
        setVendors(MOCK_VENDORS)
        if (!selectedVendorId) {
          setSelectedVendorId(MOCK_VENDORS[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to load vendors', err)
      setVendors(MOCK_VENDORS)
    } finally {
      setLoading(false)
    }
  }

  // Load transactions for selected vendor
  const loadTransactions = async (vendorId: number) => {
    try {
      if (isElectron) {
        // @ts-ignore
        const data = await window.electron.ipcRenderer.invoke('get-vendor-transactions', vendorId)
        setTransactions(data)
      } else {
        setTransactions(MOCK_TRANSACTIONS[vendorId] || [])
      }
    } catch (err) {
      console.error('Failed to load transactions', err)
      setTransactions(MOCK_TRANSACTIONS[vendorId] || [])
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      loadVendors()
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (selectedVendorId) {
      loadTransactions(selectedVendorId)
    }
  }, [selectedVendorId])

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId) || null

  // Filter vendors by search
  const filteredVendors = vendors.filter((v) => {
    const q = searchQuery.toLowerCase()
    return (
      v.name.toLowerCase().includes(q) ||
      (v.city && v.city.toLowerCase().includes(q)) ||
      (v.phone && v.phone.includes(q))
    )
  })

  // Save / Update Wholesaler
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendorFormData.name.trim()) {
      alert('Please enter a wholesaler name')
      return
    }

    try {
      if (isElectron) {
        if (isEditingVendor) {
          // @ts-ignore
          await window.electron.ipcRenderer.invoke('update-vendor', {
            id: vendorFormData.id,
            name: vendorFormData.name,
            phone: vendorFormData.phone,
            city: vendorFormData.city,
            notes: vendorFormData.notes,
            opening_balance: Number(vendorFormData.opening_balance) || 0
          })
        } else {
          // @ts-ignore
          await window.electron.ipcRenderer.invoke('add-vendor', {
            name: vendorFormData.name,
            phone: vendorFormData.phone,
            city: vendorFormData.city,
            notes: vendorFormData.notes,
            opening_balance: Number(vendorFormData.opening_balance) || 0
          })
        }
        await loadVendors()
      } else {
        // Mock fallback
        if (isEditingVendor) {
          setVendors((prev) =>
            prev.map((v) =>
              v.id === vendorFormData.id
                ? {
                    ...v,
                    name: vendorFormData.name,
                    phone: vendorFormData.phone,
                    city: vendorFormData.city,
                    notes: vendorFormData.notes
                  }
                : v
            )
          )
        } else {
          const newV: Vendor = {
            id: Date.now(),
            name: vendorFormData.name,
            phone: vendorFormData.phone,
            city: vendorFormData.city,
            notes: vendorFormData.notes,
            opening_balance: Number(vendorFormData.opening_balance) || 0,
            total_quantity: 0,
            total_purchases: 0,
            total_paid: 0,
            current_outstanding: Number(vendorFormData.opening_balance) || 0
          }
          setVendors((prev) => [...prev, newV])
          setSelectedVendorId(newV.id)
        }
      }
      setShowVendorModal(false)
    } catch (err) {
      console.error(err)
      alert('Error saving wholesaler')
    }
  }

  // Delete Wholesaler
  const handleDeleteVendor = async (vendorId: number) => {
    if (!confirm('Are you sure you want to delete this wholesaler and all their ledger records?'))
      return
    try {
      if (isElectron) {
        // @ts-ignore
        await window.electron.ipcRenderer.invoke('delete-vendor', vendorId)
        const updated = vendors.filter((v) => v.id !== vendorId)
        setVendors(updated)
        if (updated.length > 0) setSelectedVendorId(updated[0].id)
        else setSelectedVendorId(null)
      } else {
        const updated = vendors.filter((v) => v.id !== vendorId)
        setVendors(updated)
        if (updated.length > 0) setSelectedVendorId(updated[0].id)
        else setSelectedVendorId(null)
      }
    } catch (err) {
      console.error(err)
      alert('Failed to delete vendor')
    }
  }

  // Add Purchase / Stock Taken
  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVendorId) return
    if (!stockFormData.product.trim()) {
      alert('Please specify the product name (e.g. Jeans, Shirts)')
      return
    }

    const qty = Number(stockFormData.quantity) || 0
    const billAmt = Number(stockFormData.bill_amount) || 0
    const paidAmt = Number(stockFormData.paid_amount) || 0

    if (billAmt <= 0) {
      alert('Please enter a valid bill amount')
      return
    }

    try {
      if (isElectron) {
        // @ts-ignore
        await window.electron.ipcRenderer.invoke('add-vendor-transaction', {
          wholesaler_id: selectedVendorId,
          date: stockFormData.date,
          transaction_type: 'PURCHASE',
          product: stockFormData.product.trim(),
          quantity: qty,
          bill_amount: billAmt,
          paid_amount: paidAmt,
          notes: stockFormData.notes
        })
        await loadVendors()
        await loadTransactions(selectedVendorId)
      } else {
        const pending = billAmt - paidAmt
        const prevOut = selectedVendor ? selectedVendor.current_outstanding : 0
        const newOut = prevOut + pending
        const newTx: VendorTransaction = {
          id: Date.now(),
          wholesaler_id: selectedVendorId,
          date: stockFormData.date,
          transaction_type: 'PURCHASE',
          product: stockFormData.product,
          quantity: qty,
          bill_amount: billAmt,
          paid_amount: paidAmt,
          pending_amount: pending,
          running_outstanding: newOut,
          notes: stockFormData.notes
        }
        setTransactions((prev) => [newTx, ...prev])
        setVendors((prev) =>
          prev.map((v) =>
            v.id === selectedVendorId
              ? {
                  ...v,
                  total_quantity: v.total_quantity + qty,
                  total_purchases: v.total_purchases + billAmt,
                  total_paid: v.total_paid + paidAmt,
                  current_outstanding: newOut
                }
              : v
          )
        )
      }

      setShowStockModal(false)
      setStockFormData({
        date: new Date().toISOString().split('T')[0],
        product: '',
        quantity: '',
        bill_amount: '',
        paid_amount: '',
        notes: ''
      })
    } catch (err) {
      console.error(err)
      alert('Failed to save stock purchase entry')
    }
  }

  // Record Payment Settlement Only
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVendorId) return
    const amt = Number(paymentFormData.amount) || 0
    if (amt <= 0) {
      alert('Please enter a valid payment amount')
      return
    }

    try {
      const noteStr = paymentFormData.notes
        ? `${paymentFormData.payment_mode} - ${paymentFormData.notes}`
        : paymentFormData.payment_mode

      if (isElectron) {
        // @ts-ignore
        await window.electron.ipcRenderer.invoke('add-vendor-transaction', {
          wholesaler_id: selectedVendorId,
          date: paymentFormData.date,
          transaction_type: 'PAYMENT',
          product: 'Payment Settlement',
          quantity: 0,
          bill_amount: 0,
          paid_amount: amt,
          notes: noteStr
        })
        await loadVendors()
        await loadTransactions(selectedVendorId)
      } else {
        const prevOut = selectedVendor ? selectedVendor.current_outstanding : 0
        const newOut = prevOut - amt
        const newTx: VendorTransaction = {
          id: Date.now(),
          wholesaler_id: selectedVendorId,
          date: paymentFormData.date,
          transaction_type: 'PAYMENT',
          product: 'Payment Settlement',
          quantity: 0,
          bill_amount: 0,
          paid_amount: amt,
          pending_amount: -amt,
          running_outstanding: newOut,
          notes: noteStr
        }
        setTransactions((prev) => [newTx, ...prev])
        setVendors((prev) =>
          prev.map((v) =>
            v.id === selectedVendorId
              ? {
                  ...v,
                  total_paid: v.total_paid + amt,
                  current_outstanding: newOut
                }
              : v
          )
        )
      }

      setShowPaymentModal(false)
      setPaymentFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_mode: 'Bank Transfer / UPI',
        notes: ''
      })
    } catch (err) {
      console.error(err)
      alert('Failed to record payment')
    }
  }

  // Delete single transaction
  const handleDeleteTransaction = async (txId: number) => {
    if (!confirm('Are you sure you want to delete this ledger entry?')) return
    try {
      if (isElectron) {
        // @ts-ignore
        await window.electron.ipcRenderer.invoke('delete-vendor-transaction', txId)
        if (selectedVendorId) {
          await loadVendors()
          await loadTransactions(selectedVendorId)
        }
      } else {
        setTransactions((prev) => prev.filter((t) => t.id !== txId))
      }
    } catch (err) {
      console.error(err)
      alert('Failed to delete transaction')
    }
  }

  // Calculations for live preview in Add Stock Modal
  const inputBillAmt = Number(stockFormData.bill_amount) || 0
  const inputPaidAmt = Number(stockFormData.paid_amount) || 0
  const inputPendingAmt = Math.max(inputBillAmt - inputPaidAmt, 0)
  const currentVendorBalance = selectedVendor ? selectedVendor.current_outstanding : 0
  const projectedOutstanding = currentVendorBalance + (inputBillAmt - inputPaidAmt)

  // Calculations for live preview in Record Payment Modal
  const inputPayAmt = Number(paymentFormData.amount) || 0
  const projectedBalanceAfterPay = currentVendorBalance - inputPayAmt

  if (!isLoggedIn) {
    return (
      <div className="vendors-page-wrapper bg-gray-100 p-4 sm:p-6 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="vendors-auth-lock-card max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 sm:p-10 flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-4xl shadow-sm text-indigo-600 vendor-lock-icon">
            🔒
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight vendor-lock-title">
              Vendor Ledger Locked
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed vendor-lock-sub">
              Access to Wholesale Vendors, Credit Ledger, and Outstanding Balances is restricted to authorized managers. Please sign in to view and manage wholesaler accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🔐</span>
            <span>Sign In to Unlock Vendors</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="vendors-page-wrapper bg-gray-100 p-4 sm:p-6 flex flex-col items-center min-h-full">
      <div className="vendors-main-card w-full max-w-7xl bg-white rounded-xl shadow-lg flex flex-col overflow-hidden p-6 sm:p-8 space-y-6 sm:space-y-8">
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
              Wholesalers &amp; Vendors Account
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Account for stock taken on lease/credit, payments given, and outstanding balance to wholesalers
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditingVendor(false)
              setVendorFormData({
                id: 0,
                name: '',
                phone: '',
                city: '',
                opening_balance: '',
                notes: ''
              })
              setShowVendorModal(true)
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all text-sm flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add New Wholesaler</span>
          </button>
        </div>

        {/* Main Split Layout: Directory + Ledger Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Sidebar: Wholesalers Directory */}
          <aside className="vendor-sidebar lg:col-span-4 flex flex-col gap-4 p-4 sm:p-5">
            <h3 className="text-base font-semibold text-gray-700 flex items-center">
              <span className="w-2 h-5 bg-indigo-500 rounded-full mr-2.5"></span>
              Wholesalers ({filteredVendors.length})
            </h3>

            {/* Search Box */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search wholesalers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-800"
              />
            </div>

            {/* Wholesalers Cards */}
            <div className="flex flex-col gap-3 py-2 px-1 max-h-[620px] overflow-y-auto pr-2 vendors-sidebar-scroll">
              {loading ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  Loading wholesalers...
                </div>
              ) : filteredVendors.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  No wholesalers found
                </div>
              ) : (
                filteredVendors.map((vendor) => {
                  const isSelected = vendor.id === selectedVendorId
                  const isDue = vendor.current_outstanding > 0

                  return (
                    <div
                      key={vendor.id}
                      onClick={() => setSelectedVendorId(vendor.id)}
                      className={`vendor-item-card ${
                        isSelected ? 'vendor-item-selected' : 'vendor-item-default'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="vendor-name truncate">
                          {vendor.name}
                        </span>
                        {vendor.city && (
                          <span className="vendor-city-badge">
                            {vendor.city}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="vendor-qty-taken">
                          📦 {vendor.total_quantity || 0} pcs taken
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                            isDue ? 'vendor-due-badge' : 'vendor-clear-badge'
                          }`}
                        >
                          {isDue ? `₹${vendor.current_outstanding.toLocaleString('en-IN')} Due` : '✓ All Clear'}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </aside>

          {/* Right Main Panel: Selected Wholesaler Ledger & Actions */}
          <main className="lg:col-span-8 flex flex-col space-y-6">
            {selectedVendor ? (
              <>
                {/* Wholesaler Header Banner */}
                <div className="vendors-header-banner p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                      <span className="w-2.5 h-6 bg-indigo-500 rounded-full mr-3"></span>
                      {selectedVendor.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-600 font-medium">
                      {selectedVendor.city && (
                        <span className="inline-flex items-center gap-1">
                          📍 {selectedVendor.city}
                        </span>
                      )}
                      {selectedVendor.phone && (
                        <span className="inline-flex items-center gap-1">
                          📞 {selectedVendor.phone}
                        </span>
                      )}
                      {selectedVendor.notes && (
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          📝 {selectedVendor.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowStockModal(true)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span>Add Stock (Lease / Purchase)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(true)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>💸</span>
                      <span>Record Payment Given</span>
                    </button>

                    {/* Edit Wholesaler Button */}
                    <button
                      type="button"
                      title="Edit Wholesaler Details"
                      onClick={() => {
                        setIsEditingVendor(true)
                        setVendorFormData({
                          id: selectedVendor.id,
                          name: selectedVendor.name,
                          phone: selectedVendor.phone || '',
                          city: selectedVendor.city || '',
                          opening_balance: String(selectedVendor.opening_balance || 0),
                          notes: selectedVendor.notes || ''
                        })
                        setShowVendorModal(true)
                      }}
                      className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>

                    {/* Delete Wholesaler Button */}
                    <button
                      type="button"
                      title="Delete Wholesaler"
                      onClick={() => handleDeleteVendor(selectedVendor.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 4 KPI Summary Cards (Styling aligned with Records.tsx) */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* 1. Quantity Taken */}
                  <div className="vendor-kpi-card p-5 flex flex-col items-center justify-center text-center">
                    <span className="text-xs sm:text-sm font-bold text-gray-600">Quantity Taken</span>
                    <span className="text-xl sm:text-2xl font-bold text-indigo-600 mt-1">
                      {selectedVendor.total_quantity || 0} pcs
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1">Total units on lease</span>
                  </div>

                  {/* 2. Total Purchases */}
                  <div className="vendor-kpi-card p-5 flex flex-col items-center justify-center text-center">
                    <span className="text-xs sm:text-sm font-bold text-gray-600">Total Purchases</span>
                    <span className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
                      ₹{(selectedVendor.total_purchases || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1">Cumulative bill value</span>
                  </div>

                  {/* 3. Amount Given */}
                  <div className="vendor-kpi-card p-5 flex flex-col items-center justify-center text-center">
                    <span className="text-xs sm:text-sm font-bold text-gray-600">Amount Given</span>
                    <span className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
                      ₹{(selectedVendor.total_paid || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1">Total payments sent</span>
                  </div>

                  {/* 4. Outstanding (To Give) */}
                  <div className="vendor-kpi-card p-5 flex flex-col items-center justify-center text-center">
                    <span className="text-xs sm:text-sm font-bold text-gray-600">Outstanding (To Give)</span>
                    <span
                      className={`text-xl sm:text-2xl font-bold mt-1 ${
                        selectedVendor.current_outstanding > 0 ? 'text-red-500' : 'text-emerald-600'
                      }`}
                    >
                      ₹{(selectedVendor.current_outstanding || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1">
                      {selectedVendor.current_outstanding > 0 ? 'Net balance pending' : 'All clear'}
                    </span>
                  </div>
                </section>

                {/* Ledger Table Section */}
                <section className="vendor-table-card shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="text-base font-semibold text-gray-800 flex items-center">
                      <span className="w-2 h-5 bg-indigo-500 rounded-full mr-2.5"></span>
                      Ledger Statement — {selectedVendor.name}
                    </h3>
                    <span className="text-xs font-medium text-gray-500">
                      Showing {transactions.length} entries
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="vendor-table-th px-4 py-3.5">Date</th>
                          <th className="vendor-table-th px-4 py-3.5">Product / Desc</th>
                          <th className="vendor-table-th px-4 py-3.5 text-center">Qty</th>
                          <th className="vendor-table-th px-4 py-3.5 text-right">Bill Amt</th>
                          <th className="vendor-table-th px-4 py-3.5 text-right">Paid</th>
                          <th className="vendor-table-th px-4 py-3.5 text-right">Pending</th>
                          <th className="vendor-table-th px-4 py-3.5 text-right">Outstanding</th>
                          <th className="vendor-table-th px-4 py-3.5">Notes</th>
                          <th className="vendor-table-th px-4 py-3.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                <span className="text-2xl">📦</span>
                                <p className="font-semibold text-gray-700">No transactions recorded yet for this wholesaler</p>
                                <p className="text-xs text-gray-400">Click &quot;Add Stock (Lease / Purchase)&quot; above to record your first batch.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          transactions.map((tx) => {
                            const isPaymentOnly = tx.transaction_type === 'PAYMENT'
                            return (
                              <tr key={tx.id} className="vendor-table-row hover:bg-gray-50 transition-colors">
                                <td className="vendor-table-td px-4 py-3.5 text-gray-900 font-medium whitespace-nowrap">{tx.date}</td>
                                <td className="vendor-table-td px-4 py-3.5 font-semibold">
                                  {isPaymentOnly ? (
                                    <span className="text-emerald-600 inline-flex items-center gap-1">
                                      💸 {tx.product || 'Payment Given'}
                                    </span>
                                  ) : (
                                    <span className="text-gray-800 inline-flex items-center gap-1">
                                      👕 {tx.product || 'Stock Batch'}
                                    </span>
                                  )}
                                </td>
                                <td className="vendor-table-td px-4 py-3.5 text-center">
                                  {tx.quantity > 0 ? (
                                    <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-bold text-xs">
                                      {tx.quantity}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                                <td className="vendor-table-td px-4 py-3.5 text-right font-medium text-gray-900">
                                  {tx.bill_amount > 0 ? `₹${Number(tx.bill_amount).toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="vendor-table-td px-4 py-3.5 text-right font-bold text-emerald-600">
                                  ₹{Number(tx.paid_amount || 0).toLocaleString('en-IN')}
                                </td>
                                <td className="vendor-table-td px-4 py-3.5 text-right font-semibold">
                                  {tx.pending_amount > 0 ? (
                                    <span className="text-amber-600">₹{Number(tx.pending_amount).toLocaleString('en-IN')}</span>
                                  ) : tx.pending_amount < 0 ? (
                                    <span className="text-emerald-600">-₹{Math.abs(Number(tx.pending_amount)).toLocaleString('en-IN')}</span>
                                  ) : (
                                    <span className="text-gray-400">₹0</span>
                                  )}
                                </td>
                                <td className="vendor-table-td px-4 py-3.5 text-right font-bold text-gray-900">
                                  ₹{Number(tx.running_outstanding || 0).toLocaleString('en-IN')}
                                </td>
                                <td className="vendor-table-td px-4 py-3.5 text-xs text-gray-500 max-w-[180px] truncate" title={tx.notes}>
                                  {tx.notes || '-'}
                                </td>
                                <td className="vendor-table-td px-4 py-3.5 text-center">
                                  <button
                                    type="button"
                                    title="Delete entry"
                                    onClick={() => handleDeleteTransaction(tx.id)}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  >
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <line x1="18" y1="6" x2="6" y2="18"></line>
                                      <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : (
              <div className="vendors-header-banner p-12 text-center">
                <p className="text-lg font-bold text-gray-700">No wholesaler selected</p>
                <p className="text-sm text-gray-500 mt-1">Please select or add a wholesaler from the left to view their ledger.</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ================= MODAL 1: ADD / EDIT WHOLESALER ================= */}
      {showVendorModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowVendorModal(false)}
        >
          <div
            className="vendor-modal-card bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vendor-modal-header px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <span className="w-2 h-5 bg-indigo-500 rounded-full mr-2.5"></span>
                {isEditingVendor ? 'Edit Wholesaler Details' : 'Add New Wholesaler / Vendor'}
              </h3>
              <button
                type="button"
                onClick={() => setShowVendorModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Wholesaler Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hariyan Wholesale, Mumbai Wholesaler"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-800 text-sm"
                  value={vendorFormData.name}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">City / State</label>
                  <input
                    type="text"
                    placeholder="e.g. Haryana, Delhi, Surat"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-800 text-sm"
                    value={vendorFormData.city}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-800 text-sm"
                    value={vendorFormData.phone}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })}
                  />
                </div>
              </div>

              {!isEditingVendor && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Prior Pending Balance (₹ Opening Outstanding)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 100000 if you already owe them money"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-800 text-sm"
                    value={vendorFormData.opening_balance}
                    onChange={(e) =>
                      setVendorFormData({ ...vendorFormData, opening_balance: e.target.value })
                    }
                  />
                  <span className="text-xs text-gray-400 mt-1 block">
                    Enter any existing outstanding debt carried forward before today.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 30-day lease credit, denim specialist"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-800 text-sm"
                  value={vendorFormData.notes}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all text-sm cursor-pointer"
                >
                  {isEditingVendor ? 'Update Wholesaler' : 'Save Wholesaler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: ADD STOCK (PURCHASE / LEASE) ================= */}
      {showStockModal && selectedVendor && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowStockModal(false)}
        >
          <div
            className="vendor-modal-card bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vendor-modal-header px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <span className="w-2 h-5 bg-indigo-500 rounded-full mr-2.5"></span>
                Add Stock Taken — {selectedVendor.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowStockModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-800 text-sm"
                    value={stockFormData.date}
                    onChange={(e) => setStockFormData({ ...stockFormData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Product <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jeans, Shirts, Trousers"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-800 text-sm"
                    value={stockFormData.product}
                    onChange={(e) => setStockFormData({ ...stockFormData, product: e.target.value })}
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity (Qnt)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 56"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-800 text-sm"
                    value={stockFormData.quantity}
                    onChange={(e) => setStockFormData({ ...stockFormData, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Bill Amount (Amt ₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="e.g. 56000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-800 text-sm"
                    value={stockFormData.bill_amount}
                    onChange={(e) =>
                      setStockFormData({ ...stockFormData, bill_amount: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Amount Paid Now (Paid ₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 25000 (leave 0 if taking full on credit)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-800 text-sm"
                  value={stockFormData.paid_amount}
                  onChange={(e) => setStockFormData({ ...stockFormData, paid_amount: e.target.value })}
                />
              </div>

              {/* Live Preview Calculation Box */}
              <div className="vendor-preview-box p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Bill Amount:</span>
                  <span className="font-semibold text-gray-800">₹{inputBillAmt.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid Now:</span>
                  <span className="font-semibold text-emerald-600">-₹{inputPaidAmt.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending from this Bill:</span>
                  <span className="font-semibold text-amber-600">₹{inputPendingAmt.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Prior Outstanding:</span>
                  <span className="font-semibold text-gray-800">₹{currentVendorBalance.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-2 mt-1 border-t border-gray-200 font-bold text-sm text-gray-900">
                  <span>New Outstanding (To Give):</span>
                  <span className={projectedOutstanding > 0 ? 'text-red-500' : 'text-emerald-600'}>
                    ₹{projectedOutstanding.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes / Lease Terms</label>
                <input
                  type="text"
                  placeholder="e.g. Taken on 30-day lease, invoice #901"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-800 text-sm"
                  value={stockFormData.notes}
                  onChange={(e) => setStockFormData({ ...stockFormData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all text-sm cursor-pointer"
                >
                  Save Stock Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: RECORD PAYMENT GIVEN ================= */}
      {showPaymentModal && selectedVendor && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            className="vendor-modal-card bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vendor-modal-header px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <span className="w-2 h-5 bg-indigo-500 rounded-full mr-2.5"></span>
                Record Payment Given — {selectedVendor.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-800 text-sm"
                    value={paymentFormData.date}
                    onChange={(e) =>
                      setPaymentFormData({ ...paymentFormData, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Amount Given (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="e.g. 25000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-800 text-sm"
                    value={paymentFormData.amount}
                    onChange={(e) =>
                      setPaymentFormData({ ...paymentFormData, amount: e.target.value })
                    }
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Mode</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-800 text-sm"
                  value={paymentFormData.payment_mode}
                  onChange={(e) =>
                    setPaymentFormData({ ...paymentFormData, payment_mode: e.target.value })
                  }
                >
                  <option value="Bank Transfer / UPI">Bank Transfer / UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="RTGS / NEFT">RTGS / NEFT</option>
                </select>
              </div>

              {/* Live Preview Box */}
              <div className="vendor-preview-box p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Current Outstanding Balance:</span>
                  <span className="font-semibold text-gray-800">₹{currentVendorBalance.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Given:</span>
                  <span className="font-semibold text-emerald-600">-₹{inputPayAmt.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-2 mt-1 border-t border-gray-200 font-bold text-sm text-gray-900">
                  <span>Remaining Outstanding (To Give):</span>
                  <span
                    className={
                      Math.max(projectedBalanceAfterPay, 0) > 0 ? 'text-red-500' : 'text-emerald-600'
                    }
                  >
                    ₹{Math.max(projectedBalanceAfterPay, 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Transaction Reference / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Cheque #88902 or UPI UTR #901283"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-gray-800 text-sm"
                  value={paymentFormData.notes}
                  onChange={(e) =>
                    setPaymentFormData({ ...paymentFormData, notes: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all text-sm cursor-pointer"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Vendors
