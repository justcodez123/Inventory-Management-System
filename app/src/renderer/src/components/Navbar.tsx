import React from 'react'
import { useAuth } from '../context/AuthContext'
import './styles/Navbar.css'

/* Wholesalers, Records, and other features can be added late */
export type NavOption = 'Billing' | 'Records'

interface NavbarProps {
  activeTab: NavOption
  onTabChange: (tab: NavOption) => void
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const { isLoggedIn, user, logout, setShowLoginModal } = useAuth()
  
  // Define the navigation options
  const options: NavOption[] = ['Billing', 'Records']

  return (
    <nav className="navbar-container">
      {/* Brand / Logo Section */}
      <div className="navbar-brand">
        <h1>Addy's Studio</h1>
      </div>

      {/* Navigation Links Section */}
      <ul className="navbar-links">
        {options.map((option) => (
          <li key={option} className="navbar-item">
            <button
              className={`navbar-button ${activeTab === option ? 'active' : ''}`}
              onClick={() => onTabChange(option)}
            >
              {option}
            </button>
          </li>
        ))}
      </ul>
      
      {/* Auth Section */}
      <div className="ml-auto flex items-center pr-4">
        {isLoggedIn ? (
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700">Welcome, {user}</span>
            <button 
              onClick={logout}
              className="px-4 py-1.5 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors border border-red-200"
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowLoginModal(true)}
            className="px-4 py-1.5 bg-indigo-50 text-indigo-600 font-medium rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  )
}
