import { t, tf } from '../i18n'
import { useState, type ReactNode } from 'react'
import type { Offer } from '../domain/catalog'

interface OfferExplorerProps {
  offers: readonly Offer[]
  filterBar: ReactNode
  comparisonTable: ReactNode
}

export function OfferExplorer({ offers, filterBar, comparisonTable }: OfferExplorerProps) {
  const [open, setOpen] = useState(false)

  return (
    <section
      className="offer-explorer page-section"
      id="karsilastirma"
      aria-labelledby="offer-explorer-heading"
    >
      <header className="page-section__heading">
        <div>
          <p className="section-kicker">{t('Kanıt katmanı')}</p>
          <h2 id="offer-explorer-heading">{t('Teklif ayrıntıları')}</h2>
        </div>
        <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open
            ? t('Teklif ayrıntılarını kapat')
            : tf('Tüm teklif ayrıntıları · {0}', [offers.length])}
        </button>
      </header>
      {open ? (
        <>
          {filterBar}
          {offers.length > 0 ? (
            comparisonTable
          ) : (
            <div className="offer-explorer__empty" role="status">
              <h3>{t('Bu filtrelerle eşleşen teklif yok')}</h3>
              <p>{t('Filtreleri temizleyin veya senaryo kapsamına dönün.')}</p>
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}
