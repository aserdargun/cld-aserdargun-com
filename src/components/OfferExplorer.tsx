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
    <section className="offer-explorer page-section" id="karsilastirma" aria-labelledby="offer-explorer-heading">
      <header className="page-section__heading">
        <div>
          <p className="section-kicker">Kanıt katmanı</p>
          <h2 id="offer-explorer-heading">Teklif ayrıntıları</h2>
        </div>
        <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? 'Teklif ayrıntılarını kapat' : `Tüm teklif ayrıntıları · ${offers.length}`}
        </button>
      </header>
      {open ? <>
        {filterBar}
        {offers.length > 0 ? comparisonTable : (
          <div className="offer-explorer__empty" role="status">
            <h3>Bu filtrelerle eşleşen teklif yok</h3>
            <p>Filtreleri temizleyin veya senaryo kapsamına dönün.</p>
          </div>
        )}
      </> : null}
    </section>
  )
}
