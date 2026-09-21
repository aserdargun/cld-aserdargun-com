import { locale, t } from './i18n'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { applyTheme, getInitialTheme } from './app/theme'
import './styles/global.css'

document.documentElement.lang = locale
if (locale === 'en') {
  document.title = 'CLD - Cloud Provider Cost Comparison'
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute(
      'content',
      'Source-backed, pre-tax USD cloud cost comparisons for services accessible from Türkiye, with interactive learning resources.',
    )
}
document
  .querySelector('link[rel="canonical"]')
  ?.setAttribute('href', `https://cld.aserdargun.com/?lang=${locale}`)
applyTheme(getInitialTheme())

const root = document.getElementById('root')

if (!root) {
  throw new Error(t('Uygulama kökü bulunamadı.'))
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
