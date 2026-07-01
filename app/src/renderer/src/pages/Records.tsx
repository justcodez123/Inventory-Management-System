/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

interface RecordType {
  id: number
  date: string
  customer_name: string
  contact_no: string
  total_amount: number
  cash_amount: number
  card_amount: number
  upi_amount: number
  credit_amount: number
  items_summary?: string
  notes: string
  created_at?: string
}

const Records: React.FC = () => {
  const { isLoggedIn, setShowLoginModal } = useAuth()
  
  const [records, setRecords] = useState<RecordType[]>([])
  const todayStr = new Date().toISOString().split('T')[0]
  const [filters, setFilters] = useState({
    startDate: todayStr,
    endDate: todayStr,
    customerName: '',
    contactNo: '',
    paymentMode: ''
  })

  const [summary, setSummary] = useState({ Total: 0, Cash: 0, Card: 0, UPI: 0, Credit: 0 })
  const [showKPIs, setShowKPIs] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  const toggleExpand = (id: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = async (id: number) => {
    if (!isLoggedIn) {
      const wantToLogin = window.confirm('You are not logged in! Do you want to login to delete this entry?')
      if (wantToLogin) {
        setShowLoginModal(true)
      }
      return
    }

    const confirmDelete = window.confirm('Are you sure about Deleting the Entry?')
    if (confirmDelete) {
      try {
        // @ts-ignore
        if (window.electron) {
          // @ts-ignore
          const res = await window.electron.ipcRenderer.invoke('delete-record', id)
          if (res.success) {
            fetchRecords()
          } else {
            alert('Failed to delete record: ' + res.error)
          }
        }
      } catch (err) {
        console.error('Error deleting record', err)
        alert('An error occurred while deleting the record.')
      }
    }
  }

  const fetchRecords = async () => {
    try {
      // @ts-ignore - Electron IPC call
      if (window.electron) {
        // @ts-ignore - Electron IPC call
        const data = await window.electron.ipcRenderer.invoke('get-filtered-records', filters)
        setRecords(data)

        // Calculate summary
        const newSummary = { Total: 0, Cash: 0, Card: 0, UPI: 0, Credit: 0 }
        data.forEach((r: RecordType) => {
          newSummary.Total += r.total_amount || 0
          newSummary.Cash += r.cash_amount || 0
          newSummary.Card += r.card_amount || 0
          newSummary.UPI += r.upi_amount || 0
          newSummary.Credit += r.credit_amount || 0
        })
        setSummary(newSummary)
      }
    } catch (err) {
      console.error('Failed to fetch records', err)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [filters])

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="bg-gray-100 p-6 flex flex-col items-center min-h-full">
      <div className="w-full max-w-7xl bg-white rounded-xl shadow-lg flex flex-col overflow-hidden p-8 space-y-8">
        {/* Summary Section */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Records Dashboard</h2>
          <button
            onClick={() => setShowKPIs(!showKPIs)}
            className="px-4 py-2 bg-indigo-50 text-indigo-600 font-medium rounded-lg hover:bg-indigo-100 transition-colors"
          >
            {showKPIs ? 'Hide' : 'Show'}
          </button>
        </div>

        {showKPIs && (
          <section className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <span className=" text-sm font-medium font-bold">Total Sale</span>
              <span className="text-2xl font-bold text-indigo-600">
                ₹{summary.Total.toFixed(2)}
              </span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <span className="text-sm font-medium font-bold">Cash</span>
              <span className="text-2xl font-bold text-green-600">₹{summary.Cash.toFixed(2)}</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <span className="text-sm font-medium font-bold">Card</span>
              <span className="text-2xl font-bold text-blue-600">₹{summary.Card.toFixed(2)}</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <span className="text-sm font-medium font-bold">UPI</span>
              <span className="text-2xl font-bold text-purple-600">₹{summary.UPI.toFixed(2)}</span>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <span className="text-sm font-medium font-bold">Credit</span>
              <span className="text-2xl font-bold text-red-500">₹{summary.Credit.toFixed(2)}</span>
            </div>
          </section>
        )}

        {/* Filters Section */}
        <section className="p-6 border border-gray-200 rounded-xl bg-gray-50/50">
          <div className="text-sm font-medium text-gray-600 flex items-center justify-center pb-6">
            For a Single Day Record, Use Same Date for both Start and End Date
          </div>
          <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center">
            <span className="w-2 h-6 bg-indigo-500 rounded-full mr-3"></span>
            Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium font-bold">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium font-bold">End Date</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium font-bold">Customer Name</label>
              <input
                type="text"
                name="customerName"
                value={filters.customerName}
                onChange={handleFilterChange}
                placeholder="Search name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium font-bold">Contact No</label>
              <input
                type="text"
                name="contactNo"
                value={filters.contactNo}
                onChange={handleFilterChange}
                placeholder="Search contact"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
              />
            </div>
            {/* <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">Payment Mode</label>
              <select
                name="paymentMode"
                value={filters.paymentMode}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all "
              >
                <option value="">All</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="On Credit">On Credit</option>
              </select>
            </div> */}
          </div>
        </section>

        {/* Data Table */}
        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Contact No</th>
                  <th className="px-6 py-4">Items (Qty & Size)</th>
                  <th className="px-6 py-4">Payment Summary</th>
                  <th className="px-6 py-4">Notes</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.length > 0 ? (
                  records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold">{record.id}</td>
                      <td className="px-6 py-4 font-bold">{record.date}</td>
                      <td className="px-6 py-4 font-bold whitespace-nowrap">
                        {record.created_at
                          ? new Date(record.created_at + 'Z').toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'}
                      </td>
                      <td className="px-6 py-4 font-bold">{record.customer_name || 'N/A'}</td>
                      <td className="px-6 py-4 font-bold">{record.contact_no || 'N/A'}</td>
                      <td className="px-6 py-4 max-w-[200px] text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className={expandedItems.has(record.id) ? 'break-words' : 'truncate'}
                            title={record.items_summary}
                          >
                            {record.items_summary || '-'}
                          </span>
                          {record.items_summary && (
                            <button
                              onClick={() => toggleExpand(record.id)}
                              className="text-gray-400 hover:text-indigo-600 flex-shrink-0"
                              title={expandedItems.has(record.id) ? 'Show Less' : 'Show More'}
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
                                {expandedItems.has(record.id) ? (
                                  <>
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                  </>
                                ) : (
                                  <>
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </>
                                )}
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs space-y-1">
                        {record.cash_amount > 0 && (
                          <div className="text-green-700 font-bold">
                            Cash: ₹{record.cash_amount}
                          </div>
                        )}
                        {record.card_amount > 0 && (
                          <div className="text-blue-700 font-bold">Card: ₹{record.card_amount}</div>
                        )}
                        {record.upi_amount > 0 && (
                          <div className="text-purple-700 font-bold">UPI: ₹{record.upi_amount}</div>
                        )}
                        {record.credit_amount > 0 && (
                          <div className="text-red-600 font-bold">
                            Credit: ₹{record.credit_amount}
                          </div>
                        )}
                      </td>
                      <td
                        className="px-6 py-4 max-w-[200px] truncate font-bold"
                        title={record.notes}
                      >
                        {record.notes || '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        ₹{record.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          {/* <button
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit Record"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button> */}
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Delete Record"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              const text = encodeURIComponent(
                                `Hello ${record.customer_name || ''}, Thank you for your purchase of ₹${record.total_amount}.`
                              )
                              const num = record.contact_no ? record.contact_no.replace(/\D/g, '') : ''
                              const whatsappUrl = num
                                ? `https://wa.me/${num}?text=${text}`
                                : `https://wa.me/?text=${text}`
                              window.open(whatsappUrl, '_blank')
                            }}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Share via WhatsApp"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-gray-400 italic">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Records
