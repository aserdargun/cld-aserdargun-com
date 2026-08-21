import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { applyTheme, getInitialTheme } from './app/theme'
import './styles/global.css'

applyTheme(getInitialTheme())

const root = document.getElementById('root')

if (!root) {
  throw new Error('Uygulama kökü bulunamadı.')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
