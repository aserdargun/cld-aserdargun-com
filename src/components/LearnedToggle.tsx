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
export function LearnedToggle({ id, learned, onToggle, label = 'Öğrendim' }: LearnedToggleProps) {
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
      <span>{learned ? 'Öğrenildi' : label}</span>
    </button>
  )
}
