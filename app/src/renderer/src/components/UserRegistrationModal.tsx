import React, { useState } from 'react'
import { useSubscription } from '../context/SubscriptionContext'
import './styles/Subscription.css'

export const UserRegistrationModal: React.FC = () => {
  const { registerUser } = useSubscription()

  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [contactNo, setContactNo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) {
      setError('Please enter your full name.')
      return
    }

    if (!businessName.trim()) {
      setError('Please enter your business / store name.')
      return
    }

    const cleanContact = contactNo.replace(/\D/g, '')
    if (cleanContact.length < 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }

    setLoading(true)
    try {
      const success = await registerUser({
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        contactNo: contactNo.trim()
      })

      if (!success) {
        setError('Registration could not be completed. Please try again.')
      }
    } catch (err) {
      console.error(err)
      setError('Failed to save registration locally.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sub-overlay">
      <div className="sub-card">
        <div className="sub-header">
          {/* <div className="sub-icon-badge">🚀</div> */}
          <h2 className="sub-title">Welcome to Inventory Management System</h2>
          <p className="sub-subtitle">
            Register your store to <strong>to get started</strong> with full online-offline access.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="sub-body">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400">
              ⚠️ {error}
            </div>
          )}

          <div className="sub-form-group">
            <label className="sub-label">
              Owner / Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="sub-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              autoFocus
              required
            />
          </div>

          <div className="sub-form-group">
            <label className="sub-label">
              Store / Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="sub-input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="sub-form-group">
            <label className="sub-label">
              Contact / WhatsApp Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              className="sub-input"
              value={contactNo}
              onChange={(e) => setContactNo(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="sub-features-box">
            <div className="sub-feature-item">
              <span className="sub-feature-check">✓</span>
              <span>Start using in instant after registartion</span>
            </div>
            <div className="sub-feature-item">
              <span className="sub-feature-check">✓</span>
              <span>100% Offline POS</span>
            </div>
            <div className="sub-feature-item">
              <span className="sub-feature-check">✓</span>
              <span>Direct Customer QR Code Invoicing</span>
            </div>
          </div>

          <button type="submit" className="sub-btn-primary" disabled={loading}>
            {loading ? (
              <>
                <div className="sub-spinner" style={{ borderTopColor: '#ffffff' }}></div>
                <span>Activating...</span>
              </>
            ) : (
              <span>Activate</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default UserRegistrationModal
