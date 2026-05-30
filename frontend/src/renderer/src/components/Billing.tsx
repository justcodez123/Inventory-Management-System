import React from 'react';
import './styles/Billing.css';
import { EntryRow } from './Entries';

interface BillingProps {
  customer: { name: string; contactNo: string; date: string };
  entries: EntryRow[];
  onTransactionSubmit?: () => void;
}

const Billing: React.FC<BillingProps> = ({ customer, entries, onTransactionSubmit }) => {
  // Filter out completely empty rows
  const validEntries = entries.filter(
    (row) => row.product || row.qty || row.rate || row.amount
  );

  const totalAmount = validEntries.reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0
  );

  const handleSubmit = async () => {
    // @ts-ignore
    const isElectron = !!window.electron;

    if (!customer.name) {
      if (isElectron) {
        // @ts-ignore
        await window.electron.ipcRenderer.invoke('show-message-box', {
          type: 'warning',
          title: 'Missing Information',
          message: 'Please enter customer name'
        });
      } else {
        alert("Please enter customer name");
      }
      return;
    }
    
    const dateStr = (customer.date || new Date().toISOString().split('T')[0]).replace(/-/g, '');
    const defaultFilename = `Invoice_${customer.contactNo || 'Guest'}_${dateStr}.pdf`;
    
    // Calculate totals per payment mode
    let cashAmount = 0;
    let cardAmount = 0;
    let upiAmount = 0;
    let creditAmount = 0;
    const notesArray: string[] = [];

    validEntries.forEach(row => {
      const amt = Number(row.amount) || 0;
      if (row.modeOfPayment === 'Cash') cashAmount += amt;
      else if (row.modeOfPayment === 'Credit Card' || row.modeOfPayment === 'Debit Card') cardAmount += amt;
      else if (row.modeOfPayment === 'UPI') upiAmount += amt;
      else if (row.modeOfPayment === 'On Credit') creditAmount += amt;

      if (row.note && row.note.trim() !== '') {
        notesArray.push(`${row.product}: ${row.note.trim()}`);
      }
    });
    
    const record = {
      date: customer.date || new Date().toISOString().split('T')[0],
      customer_name: customer.name,
      contact_no: customer.contactNo,
      total_amount: totalAmount,
      cash_amount: cashAmount,
      card_amount: cardAmount,
      upi_amount: upiAmount,
      credit_amount: creditAmount,
      notes: notesArray.join(' | ')
    };

    if (isElectron) {
      try {
        // @ts-ignore
        const result = await window.electron.ipcRenderer.invoke('submit-transaction', record);
        if (result.success) {
          if (onTransactionSubmit) onTransactionSubmit();
          
          // After DB save, trigger PDF save if the user wants it
          // @ts-ignore
          const response = await window.electron.ipcRenderer.invoke('show-message-box', {
            type: 'question',
            buttons: ['Yes', 'No'],
            title: 'Create PDF',
            message: 'Do you want to create PDF?'
          });

          if (response.response === 0) {
            // @ts-ignore
            window.electron.ipcRenderer.send('save-bill-pdf', defaultFilename);
          }
        } else {
          // @ts-ignore
          await window.electron.ipcRenderer.invoke('show-message-box', {
            type: 'error',
            title: 'Database Error',
            message: 'Failed to save transaction to Database'
          });
        }
      } catch (err) {
        console.error(err);
        // @ts-ignore
        await window.electron.ipcRenderer.invoke('show-message-box', {
          type: 'error',
          title: 'Error',
          message: 'Error occurred while submitting transaction'
        });
      }
    } else {
      alert("Database and PDF saving is only available in the Electron desktop app. Falling back to browser print.");
      window.print();
    }
  };

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
              <th>Payment</th>
              <th>Note</th>
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
                  <td>{row.modeOfPayment || '-'}</td>
                  <td>{row.note || '-'}</td>
                  <td className="amount-col">
                    ₹{(Number(row.amount) || 0).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '16px', fontStyle: 'italic', color: '#9ca3af' }}>
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

      <div className="mt-6 flex flex-col items-center w-full gap-4">
        <button onClick={handleSubmit} className="billing-print-btn w-full py-3 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all">
          Submit
        </button>
      </div>
    </div>
  );
};

export default Billing;
