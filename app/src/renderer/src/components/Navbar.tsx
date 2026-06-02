import React from 'react'
import './styles/Navbar.css'

/* Wholesalers, Records, and other features can be added late */
export type NavOption = 'Billing' | 'Records'

interface NavbarProps {
  activeTab: NavOption
  onTabChange: (tab: NavOption) => void
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
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
    </nav>
  )
}
