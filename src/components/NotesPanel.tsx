import { t, tf } from '../i18n'
interface NotesPanelProps {
  /** Benzersiz bölüm kimliği; localStorage'da anahtar olarak kullanılır. */
  sectionId: string
  /** localStorage'dan gelen mevcut not. */
  value: string
  /** Not değiştiğinde çağrılır; dış hook persist eder. */
  onChange: (sectionId: string, next: string) => void
}

/**
 * Bölüm başına serbest metin not paneli.
 * Tamamen kontrollü: her değişiklik doğrudan dış hook'a iletilir, oradan
 * `localStorage`’a yazılır.
 */
export function NotesPanel({ sectionId, value, onChange }: NotesPanelProps) {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(sectionId, event.target.value)
  }

  const handleClear = () => {
    onChange(sectionId, '')
  }

  const wordCount = value.trim() === '' ? 0 : value.trim().split(/\s+/).length

  return (
    <section className="notes-panel" aria-labelledby={`notes-${sectionId}-heading`}>
      <header className="notes-panel__header">
        <h4 id={`notes-${sectionId}-heading`}>{t('Kişisel notun')}</h4>
        <p>
          {t(
            'Bu bölümü okuduktan sonra kafana takılanları 1-2 cümleyle yaz. Sadece senin tarayıcında saklanır.',
          )}
        </p>
      </header>
      <textarea
        className="notes-panel__textarea"
        rows={3}
        placeholder={t('Örn. Bu kavramın en kritik noktası şuymuş...')}
        value={value}
        onChange={handleChange}
        data-testid={`notes-${sectionId}`}
        aria-label={tf('{0} bölümü için kişisel not', [sectionId])}
      />
      <div className="notes-panel__footer">
        <span className="notes-panel__count">
          {wordCount}
          {t(' kelime')}
        </span>
        <button
          type="button"
          onClick={handleClear}
          disabled={value.trim() === ''}
          className="notes-panel__clear"
          data-testid={`notes-${sectionId}-clear`}
        >
          {t('Notu temizle')}
        </button>
      </div>
    </section>
  )
}
