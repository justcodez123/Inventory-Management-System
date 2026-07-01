import { useState } from 'react'
import ConsumerBilling from './pages/ConsumerDashboard'
import Records from './pages/Records'
import { Navbar, NavOption } from './components/Navbar'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginModal from './components/LoginModal'

function AppContent(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<NavOption>('Billing')
  const { showLoginModal, setShowLoginModal, login } = useAuth()
  
  return (
    <div className="flex flex-col h-screen overflow-hidden relative">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'Billing' ? <ConsumerBilling /> : <Records />}
      </div>
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onSuccess={login} 
      />
    </div>
  )
}

function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
