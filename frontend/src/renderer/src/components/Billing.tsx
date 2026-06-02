import React from 'react';
import './styles/Billing.css';
import { EntryRow } from './Entries';

interface BillingProps {
  customer: { name: string; contactNo: string; date: string };
  entries: EntryRow[];
  paymentDetails: { modeOfPayment: string; note: string };
}

const Billing: React.FC<BillingProps> = ({ customer, entries, paymentDetails }) => {
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
              <th>Size</th>
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
                  <td>{row.size || '-'}</td>
                  <td>{row.qty}</td>
                  <td>{row.rate}</td>
                  <td className="amount-col">
                    ₹{(Number(row.amount) || 0).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '16px', fontStyle: 'italic', color: '#9ca3af' }}>
                  No Purchases yet!
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="billing-summary">
          <div className="billing-summary-row" style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '8px' }}>
            <span>Payment Mode:</span>
            <span>{paymentDetails.modeOfPayment || '-'}</span>
          </div>
          {paymentDetails.note && (
            <div className="billing-summary-row" style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '8px' }}>
              <span>Note:</span>
              <span>{paymentDetails.note}</span>
            </div>
          )}
          <div className="billing-summary-row total">
            <span>Total</span>
            <span>₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="billing-footer">
          <p style={{ fontSize: '0.75rem', marginTop: '8px' }}>
            Somnath Nagar Rd, Shri Home Housing Society, 
          </p>
          <p style={{ fontSize: '0.75rem', marginTop: '8px' }}>
            Wadgaon Sheri,
            Pune, Maharashtra 411014.
          </p>
          <p style={{ fontSize: '0.75rem', marginTop: '8px' }}>
            Please visit again!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Billing;
