import { useState } from 'react'
import Login from './components/Login'
import MainLayout from './components/MainLayout'
import { ThemeProvider } from './contexts/ThemeContext'
import './index.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  return (
    <ThemeProvider>
      <div className="app-container">
        {isAuthenticated ? (
          <MainLayout onLogout={() => setIsAuthenticated(false)} />
        ) : (
          <Login onLoginSuccess={() => setIsAuthenticated(true)} />
        )}
      </div>
    </ThemeProvider>
  )
}

export default App
