import React from 'react';
import './styles/Billing.css';
import { EntryRow } from './Entries';

interface BillingProps {
  customer: { name: string; contactNo: string; date: string };
  entries: EntryRow[];
}

const Billing: React.FC<BillingProps> = ({ customer, entries }) => {
  const handlePrint = () => {
    const dateStr = (customer.date || new Date().toISOString().split('T')[0]).replace(/-/g, '');
    //const nameStr = customer.name ? `_${customer.name.replace(/\s+/g, '_')}` : '';
    const numberStr = customer.contactNo ? `_${customer.contactNo}` : '';
    const defaultFilename = `Invoice${numberStr}_${dateStr}.pdf`;
    
    // Check if running inside Electron
    // @ts-ignore
    if (window.electron) {
      // @ts-ignore
      window.electron.ipcRenderer.send('save-bill-pdf', defaultFilename);
    } else {
      alert("Native PDF saving is only available in the Electron desktop app. Falling back to browser print.");
      window.print();
    }
  };

  // Filter out completely empty rows
  const validEntries = entries.filter(
    (row) => row.product || row.qty || row.rate || row.amount
  );

  const totalAmount = validEntries.reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0
  );

  return (
    <div className="billing-container">
      <div className="billing-receipt" id="printable-receipt">
        <div className="billing-header">
          <h2 className="billing-store-name">Addy's Studio</h2>
          <p className="billing-store-info">Thank you for shopping with us!</p>
        </div>

        <div className="billing-customer-details">
          <div><strong>Date:</strong> {customer.date || new Date().toLocaleDateString()}</div>
          {customer.name && <div><strong>Name:</strong> {customer.name}</div>}
          {customer.contactNo && <div><strong>Contact:</strong> {customer.contactNo}</div>}
        </div>

        <table className="billing-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th className="amount-col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {validEntries.length > 0 ? (
              validEntries.map((row, index) => (
                <tr key={row.id || index}>
                  <td>{row.product || 'Unknown Item'}</td>
                  <td>{row.qty}</td>
                  <td>{row.rate}</td>
                  <td className="amount-col">
                    ₹{(Number(row.amount) || 0).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '16px', fontStyle: 'italic', color: '#9ca3af' }}>
                  No Purchases yet!
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="billing-summary">
          <div className="billing-summary-row total">
            <span>Total</span>
            <span>₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="billing-footer">
          <p>Please visit again!</p>
          {/* <p style={{ fontSize: '0.75rem', marginTop: '8px' }}>
            Goods once sold will not be taken back.
          </p> */}
        </div>
      </div>

      <button onClick={handlePrint} className="billing-print-btn">
        Save PDF
      </button>
    </div>
  );
};

export default Billing;
