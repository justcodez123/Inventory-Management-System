import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDarkMode}
      aria-label="Toggle dark mode"
      className={`theme-switch ${isDarkMode ? 'is-dark' : ''}`}
      onClick={toggleTheme}
    >
      <span className="theme-switch-icon theme-switch-sun">☀️</span>
      <span className="theme-switch-icon theme-switch-moon">🌙</span>
      <span className="theme-switch-knob" />
    </button>
  );
};
