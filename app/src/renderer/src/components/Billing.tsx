import React from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import './styles/Billing.css'
import { EntryRow } from './Entries'

interface BillingProps {
  customer: { name: string; contactNo: string; date: string }
  entries: EntryRow[]
  paymentDetails: { modeOfPayment: string; note: string }
  onSend?: () => void
}

const Billing: React.FC<BillingProps> = ({ customer, entries, paymentDetails, onSend }) => {
  // Filter out completely empty rows
  const validEntries = entries.filter((row) => row.product || row.qty || row.rate || row.amount)

  const totalAmount = validEntries.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)

  const handleWhatsAppShare = async () => {
    const receiptElement = document.getElementById('printable-receipt')
    if (!receiptElement) return

    try {
      // Temporarily add a style to ensure it captures fully without being cut off
      const originalStyle = receiptElement.style.cssText
      receiptElement.style.padding = '20px'
      receiptElement.style.background = '#ffffff'

      const canvas = await html2canvas(receiptElement, { scale: 2 })

      // Revert style
      receiptElement.style.cssText = originalStyle

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save('Receipt.pdf')

      const text = encodeURIComponent('Thank You for Shopping with us. We Hope to see You again! Please check the Bill')

      // Clean the contact number by removing non-numeric characters (like spaces or dashes)
      const num = customer.contactNo ? customer.contactNo.replace(/\D/g, '') : ''

      // Open WhatsApp chat directly if number exists, otherwise fallback to general wa.me
      const whatsappUrl = num 
        ? `https://wa.me/${num}?text=${text}`
        : `https://wa.me/?text=${text}`
        
      window.open(whatsappUrl, '_blank')
      
      onSend?.()
    } catch (error) {
      console.error('Error generating PDF:', error)
    }
  }

  return (
    <div className="billing-container">
      <div className="billing-receipt" id="printable-receipt">
        <div className="billing-header">
          <h2 className="billing-store-name">Addy's Studio</h2>
          <p className="billing-store-info">Thank you for shopping with us!</p>
        </div>

        <div className="billing-customer-details">
          <div>
            <strong>Date:</strong> {customer.date || new Date().toLocaleDateString()}
          </div>
          {customer.name && (
            <div>
              <strong>Name:</strong> {customer.name}
            </div>
          )}
          {customer.contactNo && (
            <div>
              <strong>Contact:</strong> {customer.contactNo}
            </div>
          )}
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
                  <td className="amount-col">₹{(Number(row.amount) || 0).toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: 'center',
                    padding: '16px',
                    fontStyle: 'italic',
                    color: '#9ca3af'
                  }}
                >
                  No Purchases yet!
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="billing-summary">
          <div
            className="billing-summary-row"
            style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '8px' }}
          >
            <span>Payment Mode:</span>
            <span>{paymentDetails.modeOfPayment || '-'}</span>
          </div>
          {paymentDetails.note && (
            <div
              className="billing-summary-row"
              style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '8px' }}
            >
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
            Wadgaon Sheri, Pune, Maharashtra 411014.
          </p>
          <p style={{ fontSize: '0.75rem', marginTop: '8px' }}>Please visit again!</p>
        </div>
      </div>
      <div className="billing-actions-container">
        <button className="billing-action-btn btn-whatsapp" onClick={handleWhatsAppShare}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
          </svg>
          Send
        </button>
        {/* <button className="billing-action-btn btn-print" onClick={() => window.print()}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9V2h12v7" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <path d="M6 14h12v8H6z" />
          </svg>
          Print
        </button> */}
      </div>
    </div>
  )
}

export default Billing
