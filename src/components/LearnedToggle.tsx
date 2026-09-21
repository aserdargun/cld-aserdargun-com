import { t } from '../i18n'
interface LearnedToggleProps {
  id: string
  learned: boolean
  onToggle: (id: string) => void
  label?: string
}

/**
 * Bir kavram kartının üzerinde görünen "Öğrendim" düğmesi.
 * Eğer öğrenildiyse dolu görünür, tıklayınca geri alınabilir.
 */
export function LearnedToggle({
  id,
  learned,
  onToggle,
  label = t('Öğrendim'),
}: LearnedToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={`learned-toggle${learned ? ' is-learned' : ''}`}
      aria-pressed={learned}
      data-testid={`learned-toggle-${id}`}
    >
      <span aria-hidden="true" className="learned-toggle__icon">
        {learned ? '✓' : '○'}
      </span>
      <span>{learned ? t('Öğrenildi') : label}</span>
    </button>
  )
}
