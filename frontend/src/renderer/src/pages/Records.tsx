/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React, { useState, useEffect } from 'react'

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
                      <td
                        className="px-6 py-4 max-w-[200px] truncate text-sm font-medium"
                        title={record.items_summary}
                      >
                        {record.items_summary || '-'}
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400 italic">
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
