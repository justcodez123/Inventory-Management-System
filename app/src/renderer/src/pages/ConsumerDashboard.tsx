/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React, { useState } from 'react'
import Entries, { EntryRow } from '../components/Entries'
import Billing from '../components/Billing'
//import { Navbar, NavOption } from '../components/Navbar';
/**
 * Interface for Customer Details state.
 */
interface CustomerDetails {
  name: string
  contactNo: string
  date: string
}

const ConsumerBilling: React.FC = () => {
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

  const DEFAULT_PRODUCTS = ['Tshirt', 'Jeans', 'Sando', 'Trousers', 'Shirt', 'Shorts', 'Jacket']

  // State for Available Products (with localStorage persistence)
  const [availableProducts, setAvailableProducts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('availableProducts')
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('Failed to parse availableProducts from localStorage', e)
    }
    return DEFAULT_PRODUCTS
  })

  const handleAddProduct = (newProduct: string) => {
    if (newProduct && !availableProducts.includes(newProduct)) {
      const updated = [...availableProducts, newProduct]
      setAvailableProducts(updated)
      localStorage.setItem('availableProducts', JSON.stringify(updated))
    }
  }
  // const [activeTab, setActiveTab] = useState<NavOption>('Billing');

  // Calculate Total Revenue automatically from valid entries
  // const totalRevenue = entries.reduce(
  //   (sum, row) => sum + (Number(row.amount) || 0),
  //   0
  // );

  // Handler for input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCustomer((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  //   const formatToNormalDate = (dateString: string) =>{
  //     if(!dateString) return '';
  //     try {
  //       const [year, month, day] = dateString.split('-').map(Number);

  //     } catch (error) {
  //       console.error('Failed to format date:', error);
  //       return dateString;
  //     }

  //   };

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

    const dateStr = (customer.date || new Date().toISOString().split('T')[0]).replace(/-/g, '')
    const defaultFilename = `Invoice_${customer.contactNo || 'Guest'}_${dateStr}.pdf`

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
          // After DB save, trigger PDF save if the user wants it
          // @ts-ignore - Electron IPC call
          const response = await window.electron.ipcRenderer.invoke('show-message-box', {
            type: 'question',
            buttons: ['Yes', 'No'],
            title: 'Create PDF',
            message: 'Do you want to create PDF?'
          })

          if (response.response === 0) {
            // @ts-ignore - Electron IPC call
            window.electron.ipcRenderer.send('save-bill-pdf', defaultFilename)
          }

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
    <div className="bg-gray-100 p-6 flex flex-col items-center ">
      {/* Main Container */}
      <div className="w-full max-w-7xl bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
        {/* Header Section */}
        <header className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center space-x-2">
            {/* <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">L</span>
            </div> */}
          </div>

          {/* <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold text-sm border border-green-200">
            Total Revenue: <span className="ml-1">₹{totalRevenue.toFixed(2)}</span>
          </div> */}
        </header>

        {/* Content Area */}
        <main className="p-8 space-y-8">
          {/* Daily Totals Section */}
          {/* <section className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <span className="text-gray-500 text-sm font-medium">Total Sale</span>
              <span className="text-2xl font-bold text-indigo-600">₹{dailyTotals.Total.toFixed(2)}</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <span className="text-gray-500 text-sm font-medium">Cash</span>
              <span className="text-2xl font-bold text-green-600">₹{dailyTotals.Cash.toFixed(2)}</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <span className="text-gray-500 text-sm font-medium">Card</span>
              <span className="text-2xl font-bold text-blue-600">₹{dailyTotals.Card.toFixed(2)}</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <span className="text-gray-500 text-sm font-medium">UPI</span>
              <span className="text-2xl font-bold text-purple-600">₹{dailyTotals.UPI.toFixed(2)}</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <span className="text-gray-500 text-sm font-medium">Credit</span>
              <span className="text-2xl font-bold text-red-500">₹{dailyTotals.Credit.toFixed(2)}</span>
            </div>
          </section> */}

          {/* Customer Details Section */}
          <section className="p-6 border border-gray-200 rounded-xl bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center">
              <span className="w-2 h-6 bg-indigo-500 rounded-full mr-3"></span>
              Customer Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Customer Name */}
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-bold text-gray-700">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                />
              </div>

              {/* Contact No */}
              <div className="space-y-2">
                <label htmlFor="contactNo" className="block text-sm font-bold text-gray-700">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label htmlFor="date" className="block text-sm font-bold text-gray-700">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                />
              </div>
            </div>
          </section>

          {/* Placeholders for Future Modules */}
          <div className="grid grid-cols-1 gap-8">
            {/* Product Table Module */}
            <Entries
              rows={entries}
              setRows={setEntries}
              availableProducts={availableProducts}
              onAddProduct={handleAddProduct}
              paymentDetails={paymentDetails}
              setPaymentDetails={setPaymentDetails}
              onSubmit={handleTransactionSubmit}
            />

            <Billing customer={customer} entries={entries} paymentDetails={paymentDetails} />
          </div>
        </main>

        {/* Footer info */}
        <footer className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            © 2026 Clothing Inventory Management - Offline Edition
          </p>
        </footer>
      </div>
    </div>
  )
}

export default ConsumerBilling
