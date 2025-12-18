import { useState } from 'react'
import Login from './components/Login'
import MainLayout from './components/MainLayout'
import { ThemeProvider } from './contexts/ThemeContext'
import { UIProvider } from './contexts/UIContext'
import { AIProvider } from './contexts/AIContext'
import './index.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
      // Allow access if no password is set
      return !localStorage.getItem('fiacloud_access_password');
  })

  return (
    <ThemeProvider>
      <UIProvider>
        <AIProvider>
          <div className="app-container">
            {isAuthenticated ? (
              <MainLayout onLogout={() => setIsAuthenticated(false)} />
            ) : (
              <Login onLoginSuccess={() => setIsAuthenticated(true)} />
            )}
          </div>
        </AIProvider>
      </UIProvider>
    </ThemeProvider>
  )
}

export default App
