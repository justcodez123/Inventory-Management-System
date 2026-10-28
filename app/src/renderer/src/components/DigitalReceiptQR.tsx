import React, { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { EntryRow } from './Entries'
import './styles/BillPanels.css'

interface DigitalReceiptQRProps {
  customer: {
    name: string
    contactNo: string
    date: string
  }
  entries: EntryRow[]
  paymentDetails: {
    modeOfPayment: string
    note: string
  }
}

type Mode = 'bill' | 'upi'

// Helper to generate professional thermal POS PDF
function buildPDF(
  customer: { name: string; contactNo: string; date: string },
  entries: EntryRow[],
  paymentDetails: { modeOfPayment: string; note: string },
  totalAmount: number
): jsPDF {
  const validEntries = entries.filter((r) => r.product || r.qty || r.rate || r.amount)

  // Dynamic receipt height based on item count
  const baseHeight = 115
  const itemHeight = Math.max(validEntries.length * 6, 12)
  const totalHeight = Math.max(baseHeight + itemHeight, 130)

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, totalHeight]
  })

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text("Addy's Studio", 40, 11, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('Somnath Nagar Rd, Wadgaon Sheri, Pune 411014', 40, 16, { align: 'center' })
  doc.text('Contact: +91 98765 43210 | GSTIN: 27AAAAA0000A1Z5', 40, 20, { align: 'center' })

  // Divider
  doc.setLineWidth(0.2)
  doc.setDrawColor(180, 180, 180)
  doc.line(5, 23, 75, 23)

  // Customer Details
  doc.setFontSize(8)
  const dateStr = customer.date || new Date().toISOString().split('T')[0]
  doc.text(`Date: ${dateStr}`, 6, 27)
  doc.text(`Customer: ${customer.name.trim() || 'Valued Customer'}`, 6, 31)
  if (customer.contactNo?.trim()) {
    doc.text(`Phone: ${customer.contactNo.trim()}`, 6, 35)
  }

  // Items table header
  const tableStartY = customer.contactNo?.trim() ? 38 : 34
  doc.line(5, tableStartY, 75, tableStartY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('Item', 6, tableStartY + 4)
  doc.text('Sz', 38, tableStartY + 4)
  doc.text('Qty', 48, tableStartY + 4)
  doc.text('Amt (Rs)', 74, tableStartY + 4, { align: 'right' })
  doc.line(5, tableStartY + 6, 75, tableStartY + 6)

  // Items rows
  doc.setFont('helvetica', 'normal')
  let y = tableStartY + 10
  if (validEntries.length > 0) {
    validEntries.forEach((item, idx) => {
      const pName = item.product || 'Item'
      const truncatedName = pName.length > 15 ? pName.substring(0, 14) + '..' : pName
      doc.text(`${idx + 1}. ${truncatedName}`, 6, y)
      doc.text(`${item.size || '-'}`, 38, y)
      doc.text(`${item.qty || 1}`, 49, y)
      doc.text(`${Number(item.amount || 0).toFixed(2)}`, 74, y, { align: 'right' })
      y += 5
    })
  } else {
    doc.text('No items listed', 6, y)
    y += 5
  }

  // Summary
  doc.line(5, y, 75, y)
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.text('TOTAL:', 6, y)
  doc.text(`Rs. ${totalAmount.toFixed(2)}`, 74, y, { align: 'right' })

  y += 4.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`Payment Mode: ${paymentDetails.modeOfPayment || 'Paid'}`, 6, y)
  if (paymentDetails.note?.trim()) {
    y += 4
    doc.text(`Note: ${paymentDetails.note.trim()}`, 6, y)
  }

  // Footer
  y += 6
  doc.line(5, y, 75, y)
  y += 5
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.text('"Trends expire. The aura doesn\'t."', 40, y, { align: 'center' })
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Thank you for shopping with us! Please visit again.', 40, y, { align: 'center' })

  return doc
}

export const DigitalReceiptQR: React.FC<DigitalReceiptQRProps> = ({
  customer,
  entries,
  paymentDetails
}) => {
  const [qrUrl, setQrUrl] = useState<string>('')
  const [mode, setMode] = useState<Mode>('bill')
  const [pdfLink, setPdfLink] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)

  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const validEntries = entries.filter(
    (row) => row.product || row.qty || row.rate || row.amount
  )
  const totalAmount = validEntries.reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0
  )

  // Clear QR code immediately whenever mode switches to prevent any cross-contamination
  const handleModeChange = (newMode: Mode) => {
    setQrUrl('')
    setPdfLink('')
    setMode(newMode)
  }

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    if (mode === 'upi') {
      // UPI Pay Mode: Encodes upi://pay
      const upiId = 'addys.studio@upi'
      const payeeName = "Addy's Studio"
      const amountStr = totalAmount > 0 ? totalAmount.toFixed(2) : '0.00'
      const note = encodeURIComponent(`Invoice ${customer.name || 'Customer'}`)
      const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=INR&tn=${note}`

      QRCode.toDataURL(upiUri, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f172a', light: '#ffffff' }
      })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error('Failed to generate UPI QR', err))
      return
    }

    // PDF Bill Mode: STRICTLY ONLY GENERATES A DIRECT PDF DOWNLOAD LINK
    setLoading(true)
    setQrUrl('')

    debounceTimer.current = setTimeout(async () => {
      let directDownloadUrl = ''
      try {
        const doc = buildPDF(customer, entries, paymentDetails, totalAmount)
        const arrayBuf = doc.output('arraybuffer')
        const safeName = (customer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')
        const dateStr = customer.date || new Date().toISOString().split('T')[0]
        const fileName = `AddyStudio_Invoice_${safeName}_${dateStr}.pdf`

        // 1. Try Electron main process IPC upload first (Catbox direct HTTPS link)
        // @ts-ignore
        const ipc = window.electron?.ipcRenderer
        if (ipc) {
          try {
            let binary = ''
            const bytes = new Uint8Array(arrayBuf)
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i])
            }
            const pdfBase64 = window.btoa(binary)
            const res = await ipc.invoke('upload-pdf-invoice', { pdfBase64, fileName })
            if (res && res.success && res.cloudUrl) {
              directDownloadUrl = res.cloudUrl
            } else if (res && res.localUrl) {
              directDownloadUrl = res.localUrl
            }
          } catch (ipcErr) {
            console.warn('IPC upload unavailable, trying direct renderer cloud upload...', ipcErr)
          }
        }

        // 2. If IPC was unavailable, upload directly to tmpfiles.org (CORS allowed from all origins)
        if (!directDownloadUrl) {
          try {
            const form = new FormData()
            form.append('file', new Blob([arrayBuf], { type: 'application/pdf' }), fileName)
            const res = await fetch('https://tmpfiles.org/api/v1/upload', {
              method: 'POST',
              body: form
            })
            if (res.ok) {
              const data = await res.json()
              if (data?.data?.url) {
                const intermediateUrl = data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
                try {
                  const pageRes = await fetch(intermediateUrl)
                  const html = await pageRes.text()
                  const match = html.match(/href="([^"]+\.pdf)"/)
                  directDownloadUrl = match ? match[1] : intermediateUrl
                } catch {
                  directDownloadUrl = intermediateUrl
                }
              }
            }
          } catch (cloudErr) {
            console.warn('Direct cloud upload failed:', cloudErr)
          }
        }

        // 3. Fallback to local server or digital invoice URL
        if (!directDownloadUrl) {
          directDownloadUrl = `http://10.12.150.174:4988/invoice.pdf`
        }

        setPdfLink(directDownloadUrl)

        // Generate the clean QR code strictly for this direct PDF link
        const qr = await QRCode.toDataURL(directDownloadUrl, {
          width: 320,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#0f172a', light: '#ffffff' }
        })
        setQrUrl(qr)
      } catch (err) {
        console.error('Failed to generate bill PDF QR:', err)
        if (directDownloadUrl) {
          setPdfLink(directDownloadUrl)
          const qr = await QRCode.toDataURL(directDownloadUrl, { width: 320, margin: 2 })
          setQrUrl(qr)
        }
      } finally {
        setLoading(false)
      }
    }, 450)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [customer.name, customer.contactNo, customer.date, entries, paymentDetails.modeOfPayment, paymentDetails.note, mode, totalAmount])

  const handleDownloadOnPC = () => {
    const doc = buildPDF(customer, entries, paymentDetails, totalAmount)
    const safeName = (customer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')
    const dateStr = customer.date || new Date().toISOString().split('T')[0]
    doc.save(`Invoice_${safeName}_${dateStr}.pdf`)
  }

  const handleCopyLink = async () => {
    if (!pdfLink) return
    try {
      await navigator.clipboard.writeText(pdfLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <aside className="bill-side-panel glass-card fade-in">
      <h3 className="bill-panel-title">
        {mode === 'bill' ? 'Customer PDF Bill' : 'UPI Payment'}
      </h3>
      <p className="bill-panel-sub">
        {mode === 'bill'
          ? 'Scan to download official PDF bill on phone'
          : 'Scan with UPI app (GPay / PhonePe) to pay'}
      </p>

      {/* Main Mode Selector: Download PDF vs UPI Pay */}
      <div className="qr-mode-switch">
        <button
          type="button"
          className={mode === 'bill' ? 'active' : ''}
          onClick={() => handleModeChange('bill')}
        >
          📄 Download PDF
        </button>
        {/* <button
          type="button"
          className={mode === 'upi' ? 'active' : ''}
          onClick={() => handleModeChange('upi')}
        >
          ⚡ UPI Pay
        </button> */}
      </div>

      {/* Dynamic QR Box */}
      <div className="qr-display-box">
        {loading ? (
          <div className="qr-loading">
            <div className="loading-spinner" style={{ width: 24, height: 24, borderTopColor: '#6366f1' }}></div>
            <span style={{ marginTop: '0.65rem', fontSize: '0.78rem', fontWeight: 600 }}>
              Preparing PDF Bill...
            </span>
          </div>
        ) : qrUrl ? (
          <div className="qr-image-wrapper">
            <img
              src={qrUrl}
              alt={mode === 'bill' ? 'Scan to Download PDF Bill' : 'Scan to Pay with UPI'}
              className="qr-image"
            />
          </div>
        ) : (
          <div className="qr-loading">Generating QR...</div>
        )}

        {mode === 'bill' && !loading && (
          <div className="pdf-badge">
            <span>✓ Direct PDF Download Ready</span>
          </div>
        )}

        {/* UPI PAYMENT LOGIC */}
        {/* {mode === 'upi' && (
          <div className="upi-amount-badge">
            <span className="upi-amount-label">Amount:</span>
            <span className="upi-amount-value">₹{totalAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="qr-caption">
          <span className="qr-scan-icon">📷</span>
          <span className="qr-caption-text">
            {mode === 'bill'
              ? 'Scan with camera — opens and downloads PDF directly on client phone'
              : 'Scan with phone camera or UPI app (GPay / PhonePe / Paytm) to pay'}
          </span>
        </div> */}

        {/* Action Buttons for Cashier */}
        {mode === 'bill' && (
          <div className="pdf-actions">
            <button
              type="button"
              className="pdf-action-btn"
              onClick={handleDownloadOnPC}
              title="Save a PDF copy directly to this computer"
            >
              📥 Save PDF on PC
            </button>
            {pdfLink && (
              <button
                type="button"
                className="pdf-action-btn secondary"
                onClick={handleCopyLink}
                title="Copy PDF download URL to clipboard"
              >
                {copied ? '✓ PDF Link Copied!' : '🔗 Copy PDF Link'}
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

export default DigitalReceiptQR
