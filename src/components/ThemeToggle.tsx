import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../app/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Aydınlık temaya geç' : 'Karanlık temaya geç'

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    >
      {isDark ? (
        <Sun aria-hidden="true" size={20} strokeWidth={2} />
      ) : (
        <Moon aria-hidden="true" size={20} strokeWidth={2} />
      )}
    </button>
  )
}
