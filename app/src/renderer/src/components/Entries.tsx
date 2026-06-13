import React, { useEffect } from 'react'
import './styles/Entries.css'

export interface EntryRow {
  id: string
  product: string
  size: string
  qty: number | ''
  rate: number | ''
  amount: number | ''
}

export interface PaymentDetails {
  modeOfPayment: string
  note: string
}

interface EntriesProps {
  rows: EntryRow[]
  setRows: React.Dispatch<React.SetStateAction<EntryRow[]>>
  availableProducts: string[]
  onAddProduct: (product: string) => void
  paymentDetails: PaymentDetails
  setPaymentDetails: React.Dispatch<React.SetStateAction<PaymentDetails>>
  onSubmit: () => void
}

const PaymentModes: string[] = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'On Credit']

const Entries: React.FC<EntriesProps> = ({
  rows,
  setRows,
  availableProducts,
  onAddProduct,
  paymentDetails,
  setPaymentDetails,
  onSubmit
}) => {
  // At Start (i.e. at the time, where nothing is entered), there must be empty Screen cells.
  useEffect(() => {
    if (rows.length === 0) {
      handleAddRow()
    }
  }, [])

  const handleAddRow = () => {
    const newRow: EntryRow = {
      id: Math.random().toString(36).substring(2, 9),
      product: '',
      size: '',
      qty: '',
      rate: '',
      amount: ''
    }
    setRows((prev) => [...prev, newRow])
  }

  const handleRowChange = (id: string, field: keyof EntryRow, value: string | number) => {
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value }

          // Auto-calculate amount
          if (field === 'qty' || field === 'rate') {
            const qty = field === 'qty' ? value : row.qty
            const rate = field === 'rate' ? value : row.rate

            if (qty !== '' && rate !== '' && !isNaN(Number(qty)) && !isNaN(Number(rate))) {
              updatedRow.amount = Number(qty) * Number(rate)
            } else {
              updatedRow.amount = ''
            }
          }
          return updatedRow
        }
        return row
      })
    )
  }

  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id))
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      
      const target = e.currentTarget
      const focusableInputs = Array.from(
        document.querySelectorAll<HTMLInputElement>('.entries-table .entries-input')
      ).filter((el) => !el.disabled)
      
      const index = focusableInputs.indexOf(target)
      
      if (index > -1) {
        if (index < focusableInputs.length - 1) {
          focusableInputs[index + 1].focus()
        } else {
          handleAddRow()
          setTimeout(() => {
            const updatedInputs = Array.from(
              document.querySelectorAll<HTMLInputElement>('.entries-table .entries-input')
            ).filter((el) => !el.disabled)
            if (updatedInputs.length > focusableInputs.length) {
              updatedInputs[focusableInputs.length].focus()
            }
          }, 0)
        }
      }
    }
  }

  // const handleSubmit = () => {
  //   if (window.confirm('Do you want to submit an application?')) {
  //     console.log('Submitted Entries:', rows);
  //     alert('Application submitted successfully!');
  //   }
  // };

  return (
    <div className="entries-container">
      <div
        className="entries-header"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="entries-header-icon"></div>
          <h2 style={{ margin: 0 }}>Product Entries</h2>
        </div>

        <div className="flex flex-wrap items-center gap-6 mt-2 sm:mt-0">
          
        </div>
      </div>

      <div className="entries-table-wrapper">
        <datalist id="product-options">
          {availableProducts.map((prod) => (
            <option key={prod} value={prod} />
          ))}
        </datalist>
        <table className="entries-table">
          <thead className="entries-thead">
            <tr>
              <th style={{ fontWeight: 'bold' }}>
                Product <span className="text-red-500">*</span>
              </th>
              <th style={{ fontWeight: 'bold' }}>
                Size <span className="text-red-500">*</span>
              </th>
              <th style={{ fontWeight: 'bold' }}>
                Qty <span className="text-red-500">*</span>
              </th>
              <th style={{ fontWeight: 'bold' }}>
                Rate <span className="text-red-500">*</span>
              </th>
              <th style={{ fontWeight: 'bold' }}>Amount</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="entries-row">
                <td className="entries-cell">
                  <input
                    list="product-options"
                    className="entries-input"
                    value={row.product}
                    onChange={(e) => handleRowChange(row.id, 'product', e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value && !availableProducts.includes(e.target.value)) {
                        onAddProduct(e.target.value)
                      }
                    }}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Select or type product"
                    required
                  />
                </td>
                
                <td className="entries-cell">
                  <input
                    type="text"
                    className="entries-input"
                    placeholder="Size"
                    value={row.size || ''}
                    required
                    onChange={(e) => handleRowChange(row.id, 'size', e.target.value)}
                    onKeyDown={handleInputKeyDown}
                  />
                </td>

                <td className="entries-cell">
                  <input
                    type="number"
                    min="1"
                    className="entries-input"
                    placeholder="0"
                    value={row.qty}
                    required
                    onChange={(e) =>
                      handleRowChange(row.id, 'qty', e.target.value ? Number(e.target.value) : '')
                    }
                    onKeyDown={handleInputKeyDown}
                  />
                </td>

                <td className="entries-cell">
                  <input
                    min="0"
                    className="entries-input"
                    placeholder="0.00"
                    value={row.rate}
                    required
                    onChange={(e) =>
                      handleRowChange(row.id, 'rate', e.target.value ? Number(e.target.value) : '')
                    }
                    onKeyDown={handleInputKeyDown}
                  />
                </td>
                
                <td className="entries-cell">
                  <input
                    min="0"
                    className="entries-input"
                    placeholder="0.00"
                    value={row.amount}
                    onChange={(e) =>
                      handleRowChange(row.id, 'amount', e.target.value ? Number(e.target.value) : '')
                    }
                    onKeyDown={handleInputKeyDown}
                  />
                </td>

                <td className="entries-cell">
                  <button
                    className="entries-delete-btn"
                    onClick={() => handleDeleteRow(row.id)}
                    title="Delete Row"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}

          </tbody>
        </table>
      </div>

      <div className="entries-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <button className="entries-submit-btn" onClick={handleAddRow}>
          Add
        </button>

        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-gray-700 whitespace-nowrap">
            Mode of Payment <span className="text-red-500">*</span>
          </label>
          <select
            className="entries-select !py-1 !px-2"
            value={paymentDetails.modeOfPayment}
            onChange={(e) =>
              setPaymentDetails((prev) => ({ ...prev, modeOfPayment: e.target.value }))
            }
            required
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="" disabled>
              Select
            </option>
            {PaymentModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
            <label className="text-sm font-bold text-gray-700 whitespace-nowrap">
              Note{' '}
              {paymentDetails.modeOfPayment === 'On Credit' && (
                <span className="text-red-500">*</span>
              )}
            </label>
            <input
              type="text"
              className="entries-input !py-1 !px-2 w-48"
              placeholder="Note..."
              value={paymentDetails.note}
              onChange={(e) => setPaymentDetails((prev) => ({ ...prev, note: e.target.value }))}
            />
        </div>

        <button onClick={onSubmit} className="entries-submit-btn">
          Submit
        </button>
      </div>
    </div>
  )
}

export default Entries
