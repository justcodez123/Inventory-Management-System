import React, { useEffect } from 'react';
import './styles/Entries.css';
import { AddMoreModal } from './Modals/AddMore';

export interface EntryRow {
  id: string;
  product: string;
  qty: number | '';
  rate: number | '';
  amount: number | '';
  modeOfPayment: string;
}

interface EntriesProps {
  rows: EntryRow[];
  setRows: React.Dispatch<React.SetStateAction<EntryRow[]>>;
  availableProducts: string[];
  onAddProduct: (product: string) => void;
}

const PaymentModes: string[] = [
  'Cash',
  'UPI',
  'Credit Card',
  'Debit Card'
];

const Entries: React.FC<EntriesProps> = ({ rows, setRows, availableProducts, onAddProduct }) => {
  // At Start (i.e. at the time, where nothing is entered), there must be empty Screen cells.
  useEffect(() => {
    if (rows.length === 0) {
      handleAddRow();
    }
  }, []);

  const handleAddRow = () => {
    const newRow: EntryRow = {
      id: Math.random().toString(36).substring(2, 9),
      product: '',
      qty: '',
      rate: '',
      amount: '',
      modeOfPayment: ''
    };
    setRows((prev) => [...prev, newRow]);
  };

  const handleRowChange = (id: string, field: keyof EntryRow, value: string | number) => {
    setRows(prevRows => prevRows.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        
        // Auto-calculate amount
        if (field === 'qty' || field === 'rate') {
          const qty = field === 'qty' ? value : row.qty;
          const rate = field === 'rate' ? value : row.rate;
          
          if (qty !== '' && rate !== '' && !isNaN(Number(qty)) && !isNaN(Number(rate))) {
            updatedRow.amount = Number(qty) * Number(rate);
          } else {
            updatedRow.amount = '';
          }
        }
        return updatedRow;
      }
      return row;
    }));
  };

  const handleDeleteRow = (id: string) => {
    setRows(prev => prev.filter(row => row.id !== id));
  };

  const handleSubmit = () => {
    if (window.confirm('Do you want to submit an application?')) {
      console.log('Submitted Entries:', rows);
      alert('Application submitted successfully!');
    }
  };

  return (
    <div className="entries-container">
      <div className="entries-header">
        <div className="entries-header-icon"></div>
        <h2>Product Entries</h2>
      </div>

      <div className="entries-table-wrapper">
        <table className="entries-table">
          <thead className="entries-thead">
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
              <th>Mode of Payment</th>
              <th style={{ width: '50px' }}></th>
            </tr>
          </thead>
          
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="entries-row">
                <td className="entries-cell">
                  <select 
                    className="entries-select"
                    value={row.product}
                    onChange={(e) => handleRowChange(row.id, 'product', e.target.value)}
                    required
                  >
                    <option value="" disabled>Select Product</option>
                    {availableProducts.map(prod => (
                      <option key={prod} value={prod}>{prod}</option>
                    ))}
                    <option value="Add More">Add More...</option>
                  </select>
                  
                  {row.product === 'Add More' && (
                     <AddMoreModal 
                        existingProducts={availableProducts}
                        onAdd={(newProduct) => {
                          onAddProduct(newProduct);
                          handleRowChange(row.id, 'product', newProduct);
                        }}
                        onClose={() => {
                          handleRowChange(row.id, 'product', '');
                        }}
                     />
                  )}
                </td>
                <td className="entries-cell">
                  <input 
                    type="number" 
                    min="1"
                    className="entries-input"
                    placeholder="0"
                    value={row.qty}
                    required
                    onChange={(e) => handleRowChange(row.id, 'qty', e.target.value ? Number(e.target.value) : '')}
                  />
                </td>
                <td className="entries-cell">
                  <input 
                    min="0"
                    className="entries-input"
                    placeholder="0.00"
                    value={row.rate}
                    required   
                    onChange={(e) => handleRowChange(row.id, 'rate', e.target.value ? Number(e.target.value) : '')}
                  />
                </td>
                <td className="entries-cell">
                  <input 
                    min="0"
                    className="entries-input"
                    placeholder="0.00"
                    value={row.amount}
                    readOnly
                  />
                </td>
                {/* <td className="entries-cell">
                  <input 
                    type="text" 
                    className="entries-input"
                    placeholder="e.g. Cash, UPI"
                    value={row.modeOfPayment}
                    required
                    onChange={(e) => handleRowChange(row.id, 'modeOfPayment', e.target.value)}
                  />
                </td> */}
                
                <td className="entries-cell">
                  <select
                    className="entries-input"
                    value={row.modeOfPayment}
                    onChange={(e) => handleRowChange(row.id, 'modeOfPayment', e.target.value)}
                    required
                  >
                    <option value="" disabled>Select Payment Mode</option>
                    {PaymentModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="entries-cell">
                  <button 
                    className="entries-delete-btn"
                    onClick={() => handleDeleteRow(row.id)}
                    title="Delete Row"
                  >
                    {/* <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg> */}
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="entries-actions">
        <button className="entries-submit-btn" onClick={handleAddRow}>
          {/* <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg> */}
          Add 
        </button>

        <button className="entries-add-btn" onClick={handleSubmit}>
          Submit
        </button>
      </div>
    </div>
  );
};

export default Entries;
