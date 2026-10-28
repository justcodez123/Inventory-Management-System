/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React, { useState, useEffect } from 'react'
import Entries, { EntryRow } from '../components/Entries'
import Billing from '../components/Billing'
import { QuickAddPanel, TopSellersPanel } from '../components/SidePanels'
import { CustomerProfileCard } from '../components/CustomerProfileCard'
import { DigitalReceiptQR } from '../components/DigitalReceiptQR'
import '../components/styles/SidePanels.css'
import '../components/styles/BillPanels.css'

/**
 * Interface for Customer Details state.
 */
interface CustomerDetails {
  name: string
  contactNo: string
  date: string
}

export interface ConsumerBillingProps {
  initialRecord?: any
  onClearInitialRecord?: () => void
}

/**
 * Parses items_summary string back into editable EntryRow items.
 * Example: "10x Tshirt (Size: M), 2x Belt (Size: 30)"
 */
export function parseItemsSummary(summary: string, totalAmount?: number): EntryRow[] {
  if (!summary || !summary.trim() || summary === '-') return []

  const parts = summary.split(/,\s*(?=\d+x\s+)/)
  const rows: EntryRow[] = []

  parts.forEach((part) => {
    const trimmed = part.trim()
    if (!trimmed) return

    const match = trimmed.match(/^(\d+)x\s+(.+?)\s+\(Size:\s*(.*?)\)$/)
    if (match) {
      const qty = parseInt(match[1], 10) || ''
      const product = match[2].trim()
      const rawSize = match[3].trim()
      const size = rawSize === '-' || rawSize === 'NA' ? '' : rawSize

      rows.push({
        id: Math.random().toString(36).substring(2, 9),
        product,
        size,
        qty,
        rate: '',
        amount: ''
      })
    } else {
      const simpleMatch = trimmed.match(/^(\d+)x\s+(.+)$/)
      if (simpleMatch) {
        rows.push({
          id: Math.random().toString(36).substring(2, 9),
          product: simpleMatch[2].trim(),
          size: '',
          qty: parseInt(simpleMatch[1], 10) || '',
          rate: '',
          amount: ''
        })
      } else {
        rows.push({
          id: Math.random().toString(36).substring(2, 9),
          product: trimmed,
          size: '',
          qty: 1,
          rate: '',
          amount: ''
        })
      }
    }
  })

  // If there is only one item and totalAmount is given, calculate rate and amount
  if (rows.length === 1 && typeof rows[0].qty === 'number' && rows[0].qty > 0 && totalAmount && totalAmount > 0) {
    rows[0].amount = totalAmount
    rows[0].rate = Math.round((totalAmount / rows[0].qty) * 100) / 100
  }

  return rows
}

const HEADER_QUOTES = [
  '“Aura expires. The Trend doesn’t.”',
  '“Style is a way to say who you are without having to speak.”',
  '“Quality is remembered long after the price is forgotten.”',
  '“Dress like you’re already famous.”',
  '“Fashion fades, only style remains the same.”',
  '“Elegance is not standing out, but being remembered is.”',
  '“Buy More, choose well, make it last.”',
  '“Fashion with Confidence is the best outfit. Rock it and own it.”',
  '“Every day is a fashion show and the world is your runway.”',
  '“Fashion is the ultimate sophistication.”'
]

const ConsumerBilling: React.FC<ConsumerBillingProps> = ({ initialRecord, onClearInitialRecord }) => {
  // Rotating Header Quote State (changes every 5 seconds randomly)
  const [quoteIndex, setQuoteIndex] = useState<number>(() =>
    Math.floor(Math.random() * HEADER_QUOTES.length)
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => {
        let next = Math.floor(Math.random() * HEADER_QUOTES.length)
        if (next === prev) {
          next = (prev + 1) % HEADER_QUOTES.length
        }
        return next
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // State for Customer Details
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: '',
    contactNo: '',
    date: new Date().toISOString().split('T')[0]
  })

  // State for Product Entries
  const [entries, setEntries] = useState<EntryRow[]>([])

  // State for Payment Details
  const [paymentDetails, setPaymentDetails] = useState({ modeOfPayment: '', note: '' })

  // State for editing existing transaction record
  const [editingId, setEditingId] = useState<number | null>(null)

  // Populate fields when editing an existing record from Records page
  useEffect(() => {
    if (initialRecord) {
      setEditingId(initialRecord.id || null)

      setCustomer({
        name: initialRecord.customer_name || '',
        contactNo: initialRecord.contact_no || '',
        date: initialRecord.date || new Date().toISOString().split('T')[0]
      })

      let mode = initialRecord.payment_mode || ''
      if (!mode) {
        if (initialRecord.cash_amount > 0) mode = 'Cash'
        else if (initialRecord.upi_amount > 0) mode = 'UPI'
        else if (initialRecord.card_amount > 0) mode = 'Credit Card'
        else if (initialRecord.credit_amount > 0) mode = 'On Credit'
        else mode = 'Cash'
      }

      setPaymentDetails({
        modeOfPayment: mode,
        note: initialRecord.notes || ''
      })

      if (initialRecord.items_summary) {
        const parsed = parseItemsSummary(initialRecord.items_summary, initialRecord.total_amount)
        if (parsed.length > 0) {
          setEntries(parsed)
        }
      }

      onClearInitialRecord?.()
    }
  }, [initialRecord, onClearInitialRecord])

  // State to hold the submitted bill so it stays visible on the right
  const [submittedBill, setSubmittedBill] = useState<{
    customer: CustomerDetails
    entries: EntryRow[]
    paymentDetails: { modeOfPayment: string; note: string }
  } | null>(null)

  const DEFAULT_PRODUCTS = [
    'Tshirt',
    'Jeans',
    'Sando',
    'Trousers',
    'Shirt',
    'Shorts',
    'Jacket',
    'Sneakers',
    'Watch',
    'Hoodie',
    'Sweater',
    'Kurta',
    'Saree',
    'Dress',
    'Skirt',
    'Blazer',
    'Track Pants',
    'Leggings',
    'Innerwear',
    'Socks',
    'Cap',
    'Belt',
    'Wallet',
    'Sunglasses',
    'Sandals',
    'Formal Shoes'
  ]

  // State for Available Products (with localStorage persistence)
  const [availableProducts, setAvailableProducts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('availableProducts')
      if (saved !== null) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed
        }
      }
    } catch (e) {
      console.error('Failed to parse availableProducts from localStorage', e)
    }
    return DEFAULT_PRODUCTS
  })

  const handleAddProduct = (newProduct: string) => {
    const trimmed = newProduct.trim()
    if (!trimmed) return
    if (availableProducts.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      return
    }
    const updated = [trimmed, ...availableProducts]
    setAvailableProducts(updated)
    localStorage.setItem('availableProducts', JSON.stringify(updated))
  }

  const handleDeleteProduct = (productToDelete: string) => {
    const updated = availableProducts.filter((p) => p !== productToDelete)
    setAvailableProducts(updated)
    localStorage.setItem('availableProducts', JSON.stringify(updated))
  }

  const handleResetProducts = () => {
    if (window.confirm('Reset Quick Add products to the original default list?')) {
      setAvailableProducts(DEFAULT_PRODUCTS)
      localStorage.setItem('availableProducts', JSON.stringify(DEFAULT_PRODUCTS))
    }
  }


  // Quick-add: fill the last empty row, otherwise append a new row with the product
  const handleQuickAdd = (product: string) => {
    setEntries((prev) => {
      const last = prev[prev.length - 1]
      if (last && !last.product && !last.qty && !last.rate && !last.size) {
        return prev.map((r, i) => (i === prev.length - 1 ? { ...r, product } : r))
      }
      return [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          product,
          size: '',
          qty: '',
          rate: '',
          amount: ''
        }
      ]
    })
  }

  // Handler for input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCustomer((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  // Auto-dismiss submitted bill when user starts a new entry
  useEffect(() => {
    if (submittedBill) {
      const hasEntries = entries.some((r) => r.product || r.qty || r.rate || r.amount || r.size)
      if (hasEntries || customer.name || customer.contactNo) {
        setSubmittedBill(null)
      }
    }
  }, [entries, customer, submittedBill])

  const handleTransactionSubmit = async () => {
    // @ts-ignore - Electron IPC call
    const isElectron = !!window.electron

    const showError = async (msg: string) => {
      if (isElectron) {
        // @ts-ignore - Electron IPC call
        await window.electron.ipcRenderer.invoke('show-message-box', {
          type: 'warning',
          title: 'Missing Information',
          message: msg
        })
      } else {
        alert(msg)
      }
    }

    const validEntries = entries.filter(
      (row) => row.product || row.qty || row.rate || row.size || row.amount
    )

    if (validEntries.length === 0) {
      await showError('Please add at least one product to the entries.')
      return
    }

    for (let i = 0; i < validEntries.length; i++) {
      const row = validEntries[i]
      if (!row.product || !row.qty || !row.rate || !row.size) {
        await showError(
          `Please fill out all mandatory fields (Product, Qty, Rate, Size) for entry #${i + 1}.`
        )
        return
      }
    }

    const totalAmount = validEntries.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)

    if (!customer.name) {
      await showError('Please enter customer name.')
      return
    }

    if (!paymentDetails.modeOfPayment) {
      await showError('Please select a Mode of Payment.')
      return
    }

    if (paymentDetails.modeOfPayment === 'On Credit' && !paymentDetails.note?.trim()) {
      await showError('On Credit option needs to have notes (e.g. details of credit).')
      return
    }

    // Calculate totals per payment mode
    let cashAmount = 0
    let cardAmount = 0
    let upiAmount = 0
    let creditAmount = 0

    if (paymentDetails.modeOfPayment === 'Cash') cashAmount = totalAmount
    else if (
      paymentDetails.modeOfPayment === 'Credit Card' ||
      paymentDetails.modeOfPayment === 'Debit Card'
    )
      cardAmount = totalAmount
    else if (paymentDetails.modeOfPayment === 'UPI') upiAmount = totalAmount
    else if (paymentDetails.modeOfPayment === 'On Credit') creditAmount = totalAmount

    const itemsSummary = validEntries
      .map((row) => `${row.qty}x ${row.product} (Size: ${row.size || '-'})`)
      .join(', ')

    const record = {
      date: customer.date || new Date().toISOString().split('T')[0],
      customer_name: customer.name,
      contact_no: customer.contactNo,
      total_amount: totalAmount,
      cash_amount: cashAmount,
      card_amount: cardAmount,
      upi_amount: upiAmount,
      credit_amount: creditAmount,
      items_summary: itemsSummary,
      notes: paymentDetails.note || ''
    }

    if (isElectron) {
      try {
        // @ts-ignore - Electron IPC call
        const isDuplicate = await window.electron.ipcRenderer.invoke(
          'check-duplicate-transaction',
          record
        )
        if (isDuplicate) {
          // @ts-ignore - Electron IPC call
          const response = await window.electron.ipcRenderer.invoke('show-message-box', {
            type: 'question',
            buttons: ['Yes', 'No'],
            title: 'Duplicate Entry Detected',
            message:
              'This exact entry is already in the database with the same Customer, Qty, Rate, and Amount. Do you want to submit this entry?'
          })

          if (response.response === 1) {
            return
          }
        }

        // @ts-ignore - Electron IPC call
        const result = await window.electron.ipcRenderer.invoke('submit-transaction', record)
        if (result.success) {
          // Capture the bill to keep it displayed
          setSubmittedBill({ customer, entries, paymentDetails })

          // Clear form after successful submit
          setCustomer({ name: '', contactNo: '', date: new Date().toISOString().split('T')[0] })
          setEntries([])
          setPaymentDetails({ modeOfPayment: '', note: '' })
        } else {
          // @ts-ignore - Electron IPC call
          await window.electron.ipcRenderer.invoke('show-message-box', {
            type: 'error',
            title: 'Database Error',
            message: 'Failed to save transaction to Database'
          })
        }
      } catch (err) {
        console.error(err)
        // @ts-ignore - Electron IPC call
        await window.electron.ipcRenderer.invoke('show-message-box', {
          type: 'error',
          title: 'Error',
          message: 'Error occurred while submitting transaction'
        })
      }
    } else {
      alert(
        'Database and PDF saving is only available in the Electron desktop app. Falling back to browser print.'
      )
      window.print()
    }
  }

  return (
    <div className="bg-gray-100 p-2 sm:p-3 flex flex-col items-center w-full">
      <div className="dashboard-layout">
        {/* Left Side: Quick-Add Tiles */}
        <QuickAddPanel
          products={availableProducts}
          onPick={handleQuickAdd}
          onAddProduct={handleAddProduct}
          onDeleteProduct={handleDeleteProduct}
          onResetProducts={handleResetProducts}
        />

        {/* Center: Main Dashboard Container */}
        <div className="w-full glass-card rounded-xl flex flex-col overflow-hidden">
          {/* Header Quote Section */}
          <header className="px-3 py-3 sm:px-8 sm:py-5 border-b border-gray-100 flex justify-center items-center bg-white">
            <blockquote className="header-quote transition-opacity duration-300">
              {HEADER_QUOTES[quoteIndex]}
            </blockquote>
          </header>

          {/* Content Area */}
          <main className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6">
            {/* Editing Notice Banner */}
            {editingId && (
              <div className="flex items-center justify-between p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs sm:text-sm font-semibold text-indigo-700 shadow-sm">
                <div className="flex items-center gap-2">
                  <span>
                    Editing Transaction #{editingId} — Consumer details &amp; items loaded into fields below.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setCustomer({ name: '', contactNo: '', date: new Date().toISOString().split('T')[0] })
                    setEntries([])
                    setPaymentDetails({ modeOfPayment: '', note: '' })
                  }}
                  className="px-3 py-1 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-indigo-700 font-semibold text-xs"
                >
                  Clear Form
                </button>
              </div>
            )}

            {/* Customer Details Section */}
            <section className="p-3.5 sm:p-6 border border-gray-200 rounded-xl bg-gray-50/50">
              <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 sm:mb-6 flex items-center">
                <span className="w-2 h-5 sm:h-6 bg-indigo-500 rounded-full mr-2.5 sm:mr-3"></span>
                Customer Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6">
                {/* Customer Name */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label htmlFor="name" className="block text-xs sm:text-sm font-bold text-gray-700">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={customer.name}
                    onChange={handleInputChange}
                    placeholder="Enter name"
                    required
                    className="w-full px-3.5 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-base sm:text-sm"
                  />
                </div>

                {/* Contact No */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label htmlFor="contactNo" className="block text-xs sm:text-sm font-bold text-gray-700">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    id="contactNo"
                    name="contactNo"
                    value={customer.contactNo}
                    onChange={handleInputChange}
                    placeholder="Enter contact number"
                    required
                    className="w-full px-3.5 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-base sm:text-sm"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label htmlFor="date" className="block text-xs sm:text-sm font-bold text-gray-700">
                    Date of Purchase <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={customer.date}
                    onChange={handleInputChange}
                    placeholder="MM/DD/YYYY"
                    required
                    className="w-full px-3.5 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-base sm:text-sm"
                  />
                </div>
              </div>
            </section>

            {/* Product Table Module */}
            <div className="grid grid-cols-1 gap-4 sm:gap-8">
              <Entries
                rows={entries}
                setRows={setEntries}
                availableProducts={availableProducts}
                onAddProduct={handleAddProduct}
                paymentDetails={paymentDetails}
                setPaymentDetails={setPaymentDetails}
                onSubmit={handleTransactionSubmit}
              />

              {/* 3-Column Bill Station: Profile (Left) | Receipt (Center) | UPI Pay QR (Right) */}
              <div className="bill-checkout-grid">
                <CustomerProfileCard
                  customer={submittedBill ? submittedBill.customer : customer}
                />
                <Billing
                  customer={submittedBill ? submittedBill.customer : customer}
                  entries={submittedBill ? submittedBill.entries : entries}
                  paymentDetails={submittedBill ? submittedBill.paymentDetails : paymentDetails}
                  onSend={() => setSubmittedBill(null)}
                />
                <DigitalReceiptQR
                  customer={submittedBill ? submittedBill.customer : customer}
                  entries={submittedBill ? submittedBill.entries : entries}
                  paymentDetails={submittedBill ? submittedBill.paymentDetails : paymentDetails}
                />
              </div>
            </div>
          </main>
        </div>

        {/* Right Side: Top Sellers Mini Bar Chart */}
        <TopSellersPanel refreshKey={submittedBill} />
      </div>
    </div>
  )
}

export default ConsumerBilling
