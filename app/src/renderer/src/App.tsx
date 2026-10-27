import { useState } from 'react'
import ConsumerBilling from './pages/ConsumerDashboard'
import Records from './pages/Records'
import Vendors from './pages/Vendors'
import { Navbar, NavOption } from './components/Navbar'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext'
import LoginModal from './components/LoginModal'
import UserRegistrationModal from './components/UserRegistrationModal'
import SubscriptionLockoutModal from './components/SubscriptionLockoutModal'

function AppContent(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<NavOption>('Billing')
  const [editingRecord, setEditingRecord] = useState<any | null>(null)
  const { showLoginModal, setShowLoginModal, login } = useAuth()
  const { license, isLoading } = useSubscription()

  const handleEditRecord = (record: any) => {
    setEditingRecord(record)
    setActiveTab('Billing')
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden relative">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Subscription Expiry Warning Banner (within 5 days) */}
      {!isLoading &&
        license &&
        !license.isLocked &&
        license.daysRemaining <= 5 && (
          <div className="bg-amber-500 text-white px-4 py-1.5 text-xs font-semibold text-center flex items-center justify-center gap-2 shadow-sm">
            <span>⚠️</span>
            <span>
              Your Subscription expires in <strong>{license.daysRemaining} days</strong>.
            </span>
          </div>
        )}

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'Billing' && (
          <ConsumerBilling
            initialRecord={editingRecord}
            onClearInitialRecord={() => setEditingRecord(null)}
          />
        )}
        {activeTab === 'Records' && <Records onEditRecord={handleEditRecord} />}
        {activeTab === 'Vendors' && <Vendors />}
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={login}
      />

      {/* Mandatory Registration Modal on Fresh Installation */}
      {!isLoading && !license?.isRegistered && <UserRegistrationModal />}

      {/* Hard Lockout Modal on Day 30 Expiry or Pending Status */}
      {!isLoading && license?.isRegistered && license?.isLocked && <SubscriptionLockoutModal />}
    </div>
  )
}

function App(): React.JSX.Element {
  return (
    <SubscriptionProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SubscriptionProvider>
  )
}

export default App
