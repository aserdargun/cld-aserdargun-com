import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { getCatalogHealth, loadCatalog } from '../data/catalog'
import type {
  CatalogHealth,
  FreeTier,
  Offer,
  Provider,
  Scenario,
  Source,
} from '../domain/catalog'
import { ComparisonTable } from './ComparisonTable'

const providers: Provider[] = [
  {
    id: 'azure',
    name: 'Microsoft Azure',
    shortName: 'Azure',
    officialSite: 'https://azure.microsoft.com/',
    purchaseAvailability: 'verified',
    purchaseNote: 'Türkiye satın alımı doğrulandı.',
    purchaseSourceIds: ['azure-purchase'],
    verifiedAt: '2026-08-13',
    strengths: [],
    limitations: [],
    regions: [
      {
        id: 'westeurope',
        name: 'West Europe',
        countryCode: 'NL',
        scope: 'regional',
        sourceId: 'azure-region',
      },
    ],
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    shortName: 'Cloudflare',
    officialSite: 'https://www.cloudflare.com/',
    purchaseAvailability: 'conditional',
    purchaseNote: 'Satın alım koşulludur.',
    purchaseSourceIds: ['cloudflare-purchase'],
    verifiedAt: '2026-08-13',
    strengths: [],
    limitations: [],
    regions: [
      {
        id: 'global',
        name: 'Global edge network',
        countryCode: null,
        scope: 'global',
        sourceId: 'cloudflare-region',
      },
    ],
  },
  {
    id: 'hetzner',
    name: 'Hetzner',
    shortName: 'Hetzner',
    officialSite: 'https://www.hetzner.com/',
    purchaseAvailability: 'conditional',
    purchaseNote: 'Satın alım koşulludur.',
    purchaseSourceIds: ['hetzner-purchase'],
    verifiedAt: '2026-08-13',
    strengths: [],
    limitations: [],
    regions: [
      {
        id: 'nbg1',
        name: 'Nuremberg (NBG1)',
        countryCode: 'DE',
        scope: 'regional',
        sourceId: 'hetzner-region',
      },
    ],
  },
]

const sources: Source[] = [
  {
    id: 'azure-price',
    owner: 'azure',
    title: 'Azure resmi fiyatlandırma',
    url: 'https://azure.microsoft.com/pricing',
    kind: 'pricing',
    accessedAt: '2026-08-13',
  },
  {
    id: 'cloudflare-price',
    owner: 'cloudflare',
    title: 'Cloudflare Workers fiyatlandırma',
    url: 'https://developers.cloudflare.com/workers/platform/pricing/',
    kind: 'pricing',
    accessedAt: '2026-08-12',
  },
  {
    id: 'hetzner-price',
    owner: 'hetzner',
    title: 'Hetzner Cloud fiyatlandırma',
    url: 'https://www.hetzner.com/cloud/',
    kind: 'pricing',
    accessedAt: '2026-08-11',
  },
  {
    id: 'ecb-rate',
    owner: 'ecb',
    title: 'ECB euro reference exchange rate',
    url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/',
    kind: 'exchange-rate',
    accessedAt: '2026-08-13',
  },
]

const offers: Offer[] = [
  {
    id: 'azure-vm',
    providerId: 'azure',
    serviceName: 'Azure VM B2s',
    category: 'compute',
    rankable: true,
    region: 'westeurope',
    specs: { vcpu: 2, ramGb: 4, outboundGb: 100 },
    prices: [{ kind: 'instance-hour', price: 0.05, currency: 'USD', includedQuantity: 0 }],
    sourceIds: ['azure-price'],
    verifiedAt: '2026-08-13',
    notes: ['Disk, yedekleme ve lisans dahil değildir.'],
  },
  {
    id: 'cloudflare-workers',
    providerId: 'cloudflare',
    serviceName: 'Cloudflare Workers Paid',
    category: 'serverless',
    rankable: false,
    region: 'global',
    specs: {},
    prices: [
      { kind: 'flat-month', price: 5, currency: 'USD', includedQuantity: 0 },
      { kind: 'requests-million', price: 0.3, currency: 'USD', includedQuantity: 10 },
    ],
    sourceIds: ['cloudflare-price'],
    verifiedAt: '2026-08-12',
    notes: ['Worker yürütme süresi ve ek depolama dahil değildir.'],
  },
]

const freeTiers: FreeTier[] = [
  {
    id: 'azure-vm-free',
    providerId: 'azure',
    serviceName: 'Azure VM ücretsiz saat',
    category: 'compute',
    compatibleOfferIds: ['azure-vm'],
    compatiblePriceKinds: ['instance-hour'],
    type: 'time-limited',
    quota: { amount: 750, unit: 'instance-hours', period: 'month' },
    durationMonths: 12,
    eligibilityNote: 'Yeni hesaplar.',
    overageNote: 'Aşım ücretlidir.',
    automaticChargeNote: 'Ücretli hesapta otomatik yansır.',
    sourceIds: ['azure-price'],
    verifiedAt: '2026-08-13',
  },
]

const scenario: Scenario = {
  id: 'small-web-app',
  name: 'Küçük web uygulaması',
  description: 'Test senaryosu',
  scopeNote: 'Test kapsamı.',
  requiredCategories: ['compute'],
  coverageByCategory: { compute: ['hoursPerMonth', 'vcpu', 'ramGb'] },
  hoursPerMonth: 100,
  vcpu: 1,
  ramGb: 1,
  storageGb: 0,
  outboundGb: 0,
  requestsMillion: 12,
  databaseGb: 0,
  gpuHours: 0,
  gpuVramGb: 0,
}

function health(overrides: Partial<CatalogHealth> = {}): CatalogHealth {
  return {
    statusByOfferId: { 'azure-vm': 'current', 'cloudflare-workers': 'current' },
    statusByFreeTierId: { 'azure-vm-free': 'current' },
    statusByExchangeRateId: {},
    invalidReferences: [],
    staleCount: 0,
    invalidCount: 0,
    ...overrides,
  }
}

function renderTable(overrides: Partial<React.ComponentProps<typeof ComparisonTable>> = {}) {
  return render(
    <ComparisonTable
      offers={offers}
      providers={providers}
      sources={sources}
      freeTiers={freeTiers}
      exchangeRates={[]}
      health={health()}
      scenario={scenario}
      {...overrides}
    />,
  )
}

afterEach(cleanup)

describe('ComparisonTable', () => {
  it('renders six primary columns with source evidence behind row disclosures', async () => {
    const user = userEvent.setup()
    renderTable()

    const region = screen.getByRole('region', { name: 'Servis karşılaştırma tablosu' })
    const table = within(region).getByRole('table', { name: 'Servis karşılaştırması' })
    expect(table).toBeInTheDocument()
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region).toHaveAttribute('aria-describedby', 'offer-table-scroll-hint')
    expect(document.getElementById('offer-table-scroll-hint')).toHaveTextContent(
      'Tabloyu yatay kaydırın; sağlayıcı sütunu sabit kalır.',
    )

    expect(within(table).getAllByRole('columnheader').map((header) => header.getAttribute('aria-label') ?? header.textContent)).toEqual([
      'Sağlayıcı',
      'Servis',
      'Bölge',
      'Kapasite',
      'Modellenen tutar',
      'Durum ve ayrıntı',
    ])

    const azure = within(table).getByRole('row', { name: /Microsoft Azure/ })
    expect(azure).toHaveTextContent('West Europe · Bölgesel · NL')
    expect(azure).toHaveTextContent('2 vCPU · 4 GB RAM')
    expect(azure).toHaveTextContent('$0.05/saat')
    expect(azure).toHaveTextContent('$5.00/ay')
    expect(azure).toHaveTextContent('750 instance-hours/ay')
    expect(azure).toHaveTextContent('100 GB dahil')
    expect(azure).toHaveTextContent('Sıralanabilir')
    expect(azure).toHaveTextContent('Disk, yedekleme ve lisans dahil değildir.')

    const evidenceSummary = within(azure).getByText('Ayrıntıları göster')
    expect(evidenceSummary.tagName).toBe('SUMMARY')
    expect(evidenceSummary).not.toHaveAttribute('role')
    const evidence = evidenceSummary.closest('details')
    expect(evidence).not.toHaveAttribute('open')
    await user.click(evidenceSummary)
    expect(evidence).toHaveAttribute('open')

    const cloudflare = within(table).getByRole('row', { name: /Cloudflare Workers Paid/ })
    expect(cloudflare).toHaveTextContent('Global edge network · Global')
    expect(cloudflare).toHaveTextContent('Yalnızca bileşen')
    expect(cloudflare).toHaveTextContent('$5.00/ay')
    expect(cloudflare).toHaveTextContent('$0.30/milyon istek · 10 dahil')
    expect(cloudflare).toHaveTextContent('$5.00/ay')
    expect(cloudflare).toHaveTextContent('Esnek / kullanıma göre')
    expect(cloudflare).toHaveTextContent('Yok')
    expect(cloudflare).toHaveTextContent('Kaynaklı trafik bileşeni yok')
    expect(cloudflare).toHaveTextContent('Worker yürütme süresi ve ek depolama dahil değildir.')
    expect(cloudflare).not.toHaveTextContent('$5.00/saat')

    const source = within(azure).getByRole('link', { name: /Azure resmi fiyatlandırma/ })
    expect(source).toHaveAttribute('href', 'https://azure.microsoft.com/pricing')
    expect(source).toHaveAttribute('target', '_blank')
    expect(source).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(source).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
    expect(azure).toHaveTextContent('2026-08-13')
  })

  it('sorts rows with button headers and exposes the active direction through aria-sort', async () => {
    const user = userEvent.setup()
    renderTable({
      scenario: {
        ...scenario,
        requiredCategories: ['compute', 'serverless'],
        coverageByCategory: {
          ...scenario.coverageByCategory,
          serverless: ['requestsMillion'],
        },
      },
    })
    const table = screen.getByRole('table', { name: 'Servis karşılaştırması' })
    const monthlyHeader = within(table).getByRole('columnheader', { name: 'Modellenen tutar' })
    const monthlySort = within(monthlyHeader).getByRole('button', { name: 'Modellenen kategori tutarına göre sırala' })

    expect(monthlyHeader).toHaveAttribute('aria-sort', 'none')
    await user.click(monthlySort)
    expect(monthlyHeader).toHaveAttribute('aria-sort', 'ascending')
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Microsoft Azure')

    await user.click(monthlySort)
    expect(monthlyHeader).toHaveAttribute('aria-sort', 'descending')
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Cloudflare')
  })

  it('sorts provider names without mutating the filtered input order', async () => {
    const user = userEvent.setup()
    renderTable({ offers })
    const table = screen.getByRole('table', { name: 'Servis karşılaştırması' })

    await user.click(screen.getByRole('button', { name: 'Sağlayıcıya göre sırala' }))

    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Cloudflare')
    expect(offers[0]?.providerId).toBe('azure')
  })

  it('sorts service names from their dedicated header button', async () => {
    const user = userEvent.setup()
    renderTable({ offers: [offers[1]!, offers[0]!] })
    const table = screen.getByRole('table', { name: 'Servis karşılaştırması' })

    await user.click(screen.getByRole('button', { name: 'Servise göre sırala' }))

    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Azure VM B2s')
  })

  it('hides an invalid estimate monthly value and keeps it below verified values when sorting', async () => {
    const user = userEvent.setup()
    const invalidOffer: Offer = {
      ...offers[0]!,
      id: 'azure-invalid-estimate',
      serviceName: 'Invalid cheap offer',
      prices: [{ kind: 'instance-hour', price: 0.01, currency: 'USD', includedQuantity: 0 }],
    }
    const verifiedOffer: Offer = {
      ...offers[1]!,
      id: 'cloudflare-verified-estimate',
      serviceName: 'Verified monthly offer',
      prices: [
        { kind: 'flat-month', price: 5, currency: 'USD', includedQuantity: 0 },
        { kind: 'requests-million', price: 0.3, currency: 'USD', includedQuantity: 10 },
      ],
    }
    renderTable({
      offers: [invalidOffer, verifiedOffer],
      freeTiers: [],
      scenario: {
        ...scenario,
        requiredCategories: ['compute', 'serverless'],
        coverageByCategory: {
          ...scenario.coverageByCategory,
          serverless: ['requestsMillion'],
        },
      },
      health: health({
        statusByOfferId: {
          'azure-invalid-estimate': 'invalid',
          'cloudflare-verified-estimate': 'current',
        },
        statusByFreeTierId: {},
      }),
    })

    const invalidRow = screen.getByRole('row', { name: /Invalid cheap offer/ })
    expect(within(invalidRow).getAllByRole('cell')[4]).toHaveTextContent('Doğrulanamadı')
    expect(within(invalidRow).getAllByRole('cell')[4]).not.toHaveTextContent('$0.01/saat')
    expect(within(invalidRow).getAllByRole('cell')[3]).toHaveTextContent('Doğrulanamadı')
    expect(within(invalidRow).getAllByRole('cell')[3]).not.toHaveTextContent('$1.00/ay')

    await user.click(screen.getByRole('button', { name: 'Modellenen kategori tutarına göre sırala' }))
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Verified monthly offer')
  })

  it('projects a required static-site category before calculating table amounts', () => {
    const catalog = loadCatalog()
    const staticSite = catalog.scenarios.find((candidate) => candidate.id === 'static-site')!
    const selectedOffers = catalog.offers.filter((offer) => [
      'digitalocean-spaces-fra1',
      'vultr-object-standard-amsterdam',
    ].includes(offer.id))

    renderTable({
      offers: selectedOffers,
      providers: catalog.providers,
      sources: catalog.sources,
      freeTiers: catalog.freeTiers,
      exchangeRates: catalog.exchangeRates,
      health: getCatalogHealth(catalog, new Date('2026-08-14T00:00:00Z')),
      scenario: staticSite,
    })

    const digitalOcean = screen.getByRole('row', { name: /DigitalOcean Spaces base subscription/ })
    const vultr = screen.getByRole('row', { name: /Vultr Object Storage Standard/ })
    expect(within(digitalOcean).getAllByRole('cell')[3]).toHaveTextContent('$5.00/ay')
    expect(within(vultr).getAllByRole('cell')[3]).toHaveTextContent('$18.00/ay')
    expect(within(digitalOcean).getAllByRole('cell')[3]).not.toHaveTextContent('$14.76/ay')
    expect(within(vultr).getAllByRole('cell')[3]).not.toHaveTextContent('$28.00/ay')
  })

  it('marks real small-web database and worker rows outside the scenario without hiding evidence', () => {
    const catalog = loadCatalog()
    const smallWeb = catalog.scenarios.find((candidate) => candidate.id === 'small-web-app')!
    const selectedOffers = catalog.offers.filter((offer) => [
      'azure-postgres-flex-b1ms-westeurope',
      'cloudflare-workers-paid-global',
    ].includes(offer.id))

    renderTable({
      offers: selectedOffers,
      providers: catalog.providers,
      sources: catalog.sources,
      freeTiers: catalog.freeTiers,
      exchangeRates: catalog.exchangeRates,
      health: getCatalogHealth(catalog, new Date('2026-08-14T00:00:00Z')),
      scenario: smallWeb,
    })

    const database = screen.getByRole('row', { name: /Azure Database for PostgreSQL/ })
    const workers = screen.getByRole('row', { name: /Cloudflare Workers Paid/ })
    for (const row of [database, workers]) {
      expect(within(row).getAllByRole('cell')[3]).toHaveTextContent('Senaryo kapsamı dışında')
      expect(within(row).getAllByRole('cell')[3]).not.toHaveTextContent('Doğrulanamadı')
      expect(row).toHaveTextContent('Güncel')
    }
    expect(within(database).getAllByRole('cell')[4]).toHaveTextContent('$0.0199/saat')
    expect(database).toHaveTextContent('depolama, yedekleme, IOPS')
    expect(within(workers).getAllByRole('cell')[4]).toHaveTextContent('$5.00/ay')
    expect(workers).toHaveTextContent('CPU süresi aşımı')
  })

  it('marks high-traffic object storage rows outside the scenario', () => {
    const catalog = loadCatalog()
    const highTraffic = catalog.scenarios.find((candidate) => candidate.id === 'high-traffic')!
    const selectedOffers = catalog.offers.filter((offer) => [
      'digitalocean-spaces-fra1',
      'vultr-object-standard-amsterdam',
    ].includes(offer.id))

    renderTable({
      offers: selectedOffers,
      providers: catalog.providers,
      sources: catalog.sources,
      freeTiers: catalog.freeTiers,
      exchangeRates: catalog.exchangeRates,
      health: getCatalogHealth(catalog, new Date('2026-08-14T00:00:00Z')),
      scenario: highTraffic,
    })

    for (const serviceName of [
      /DigitalOcean Spaces base subscription/,
      /Vultr Object Storage Standard/,
    ]) {
      const row = screen.getByRole('row', { name: serviceName })
      expect(within(row).getAllByRole('cell')[3]).toHaveTextContent('Senaryo kapsamı dışında')
      expect(within(row).getAllByRole('cell')[3]).not.toHaveTextContent(/\$\d/)
    }
  })

  it('withholds modeled totals from undersized real compute offers without hiding source prices', () => {
    const catalog = loadCatalog()
    const highTraffic = catalog.scenarios.find((candidate) => candidate.id === 'high-traffic')!
    const selectedOffers = catalog.offers.filter((offer) => [
      'azure-b2s-westeurope',
      'azure-d8as-v5-westeurope',
    ].includes(offer.id))

    renderTable({
      offers: selectedOffers,
      providers: catalog.providers,
      sources: catalog.sources,
      freeTiers: catalog.freeTiers,
      exchangeRates: catalog.exchangeRates,
      health: getCatalogHealth(catalog, new Date('2026-08-14T00:00:00Z')),
      scenario: highTraffic,
    })

    const undersized = screen.getByRole('row', { name: /Standard B2s/ })
    const complete = screen.getByRole('row', { name: /Standard D8as v5/ })
    expect(within(undersized).getAllByRole('cell')[4]).toHaveTextContent('$0.048/saat')
    expect(within(undersized).getAllByRole('cell')[3]).toHaveTextContent('Kapasite yetersiz')
    expect(within(undersized).getAllByRole('cell')[3]).toHaveTextContent('Eksik: vCPU, RAM')
    expect(within(undersized).getAllByRole('cell')[3]).not.toHaveTextContent(/\$\d/)
    expect(undersized).toHaveTextContent('Güncel')
    expect(within(complete).getAllByRole('cell')[3]).toHaveTextContent(/\$[\d,.]+\/ay/)
  })

  it('withholds modeled totals from undersized real GPU offers', () => {
    const catalog = loadCatalog()
    const aiGpu = catalog.scenarios.find((candidate) => candidate.id === 'ai-gpu')!
    const selectedOffers = catalog.offers.filter((offer) => [
      'azure-nc4as-t4-v3-westeurope',
      'azure-nc24ads-a100-v4-westeurope',
    ].includes(offer.id))

    renderTable({
      offers: selectedOffers,
      providers: catalog.providers,
      sources: catalog.sources,
      freeTiers: catalog.freeTiers,
      exchangeRates: catalog.exchangeRates,
      health: getCatalogHealth(catalog, new Date('2026-08-14T00:00:00Z')),
      scenario: aiGpu,
    })

    const undersized = screen.getByRole('row', { name: /NVIDIA T4/ })
    const complete = screen.getByRole('row', { name: /A100/ })
    expect(within(undersized).getAllByRole('cell')[3]).toHaveTextContent('Kapasite yetersiz')
    expect(within(undersized).getAllByRole('cell')[3]).toHaveTextContent('Eksik: GPU VRAM')
    expect(within(undersized).getAllByRole('cell')[3]).not.toHaveTextContent(/\$\d/)
    expect(within(complete).getAllByRole('cell')[3]).toHaveTextContent(/\$[\d,.]+\/ay/)
  })

  it('keeps unit price, monthly cap and notes visible for an out-of-scope offer', () => {
    const cappedOutOfScope: Offer = {
      ...offers[0]!,
      id: 'capped-out-of-scope',
      serviceName: 'Capped out of scope',
      category: 'managed-database',
      prices: [{
        kind: 'instance-hour',
        price: 0.05,
        currency: 'USD',
        includedQuantity: 0,
        monthlyCap: 4,
      }],
    }
    renderTable({
      offers: [cappedOutOfScope],
      freeTiers: [],
      health: health({
        statusByOfferId: { 'capped-out-of-scope': 'current' },
        statusByFreeTierId: {},
      }),
    })

    const row = screen.getByRole('row', { name: /Capped out of scope/ })
    expect(within(row).getAllByRole('cell')[4]).toHaveTextContent(
      '$0.05/saat · aylık üst sınır $4.00',
    )
    expect(within(row).getAllByRole('cell')[3]).toHaveTextContent('Senaryo kapsamı dışında')
    expect(row).toHaveTextContent('Disk, yedekleme ve lisans dahil değildir.')
    expect(row).toHaveTextContent('Güncel')
  })

  it('sorts numeric rows before invalid rows and out-of-scope rows in stable input order', async () => {
    const user = userEvent.setup()
    const outOfScopeFirst: Offer = {
      ...offers[1]!,
      id: 'out-of-scope-first',
      serviceName: 'Out of scope first',
      category: 'managed-database',
    }
    const invalidInScope: Offer = {
      ...offers[0]!,
      id: 'invalid-in-scope',
      serviceName: 'Invalid in scope',
    }
    const numericInScope: Offer = {
      ...offers[0]!,
      id: 'numeric-in-scope',
      serviceName: 'Numeric in scope',
    }
    const capacityInScope: Offer = {
      ...offers[0]!,
      id: 'capacity-in-scope',
      serviceName: 'Capacity in scope',
      specs: { vcpu: 0.5, ramGb: 0.5 },
    }
    const outOfScopeSecond: Offer = {
      ...offers[1]!,
      id: 'out-of-scope-second',
      serviceName: 'Out of scope second',
      category: 'serverless',
    }

    renderTable({
      offers: [outOfScopeFirst, capacityInScope, invalidInScope, numericInScope, outOfScopeSecond],
      freeTiers: [],
      health: health({
        statusByOfferId: {
          'out-of-scope-first': 'current',
          'invalid-in-scope': 'invalid',
          'capacity-in-scope': 'current',
          'numeric-in-scope': 'current',
          'out-of-scope-second': 'current',
        },
        statusByFreeTierId: {},
      }),
    })

    await user.click(screen.getByRole('button', { name: 'Modellenen kategori tutarına göre sırala' }))
    const sorted = screen.getAllByRole('row').slice(1).map((row) => row.textContent)
    expect(sorted[0]).toContain('Numeric in scope')
    expect(sorted[1]).toContain('Capacity in scope')
    expect(sorted[2]).toContain('Invalid in scope')
    expect(sorted[3]).toContain('Out of scope first')
    expect(sorted[4]).toContain('Out of scope second')

    await user.click(screen.getByRole('button', { name: 'Modellenen kategori tutarına göre sırala' }))
    const descending = screen.getAllByRole('row').slice(1).map((row) => row.textContent)
    expect(descending[0]).toContain('Numeric in scope')
    expect(descending[1]).toContain('Capacity in scope')
    expect(descending[2]).toContain('Invalid in scope')
    expect(descending[3]).toContain('Out of scope first')
    expect(descending[4]).toContain('Out of scope second')
  })

  it.each([
    ['ascending', 1, 'Invalid expensive', 'Invalid cheap'],
    ['descending', 2, 'Invalid cheap', 'Invalid expensive'],
  ] as const)('keeps invalid estimates stable when sorting %s despite hidden totals', async (
    _direction,
    clickCount,
    firstInvalidName,
    secondInvalidName,
  ) => {
    const user = userEvent.setup()
    const invalidExpensive: Offer = {
      ...offers[0]!,
      id: 'invalid-expensive',
      serviceName: 'Invalid expensive',
      prices: [{ kind: 'instance-hour', price: 0.5, currency: 'USD', includedQuantity: 0 }],
    }
    const invalidCheap: Offer = {
      ...offers[0]!,
      id: 'invalid-cheap',
      serviceName: 'Invalid cheap',
      prices: [{ kind: 'instance-hour', price: 0.01, currency: 'USD', includedQuantity: 0 }],
    }
    const numeric: Offer = {
      ...offers[0]!,
      id: 'numeric-between-invalid',
      serviceName: 'Numeric verified',
      prices: [{ kind: 'instance-hour', price: 0.25, currency: 'USD', includedQuantity: 0 }],
    }
    const invalidByName = {
      'Invalid expensive': invalidExpensive,
      'Invalid cheap': invalidCheap,
    }

    renderTable({
      offers: [invalidByName[firstInvalidName], numeric, invalidByName[secondInvalidName]],
      freeTiers: [],
      health: health({
        statusByOfferId: {
          'invalid-expensive': 'invalid',
          'invalid-cheap': 'invalid',
          'numeric-between-invalid': 'current',
        },
        statusByFreeTierId: {},
      }),
    })

    const monthlySort = screen.getByRole('button', { name: 'Modellenen kategori tutarına göre sırala' })
    for (let click = 0; click < clickCount; click += 1) await user.click(monthlySort)

    const sorted = screen.getAllByRole('row').slice(1).map((row) => row.textContent)
    expect(sorted[0]).toContain('Numeric verified')
    expect(sorted[1]).toContain(firstInvalidName)
    expect(sorted[2]).toContain(secondInvalidName)
  })

  it('fails traffic evidence closed for invalid included capacity and invalid outbound meters', () => {
    const invalidIncluded: Offer = {
      ...offers[0]!,
      id: 'invalid-included-traffic',
      serviceName: 'Invalid included traffic',
      specs: { ...offers[0]!.specs, outboundGb: 100 },
    }
    const invalidMeter: Offer = {
      ...offers[1]!,
      id: 'invalid-metered-traffic',
      serviceName: 'Invalid metered traffic',
      category: 'cdn-network',
      specs: {},
      prices: [{ kind: 'outbound-gb', price: 0.1, currency: 'USD', includedQuantity: 0 }],
    }

    renderTable({
      offers: [invalidIncluded, invalidMeter],
      freeTiers: [],
      health: health({
        statusByOfferId: {
          'invalid-included-traffic': 'invalid',
          'invalid-metered-traffic': 'invalid',
        },
        statusByFreeTierId: {},
      }),
    })

    const includedTraffic = within(
      screen.getByRole('row', { name: /Invalid included traffic/ }),
    ).getAllByRole('cell')[4]
    const meteredTraffic = within(
      screen.getByRole('row', { name: /Invalid metered traffic/ }),
    ).getAllByRole('cell')[4]
    expect(includedTraffic).toHaveTextContent('Doğrulanamadı')
    expect(includedTraffic).not.toHaveTextContent('100 GB dahil')
    expect(meteredTraffic).toHaveTextContent('Doğrulanamadı')
    expect(meteredTraffic).not.toHaveTextContent('$0.10/GB')
  })

  it('uses dated exchange rates and monthly caps while preserving original EUR values', () => {
    const hetznerOffer: Offer = {
      id: 'hetzner-cx23',
      providerId: 'hetzner',
      serviceName: 'Hetzner Cloud CX23',
      category: 'compute',
      rankable: true,
      region: 'nbg1',
      specs: { vcpu: 2, ramGb: 4 },
      prices: [
        {
          kind: 'instance-hour',
          price: 0.0088,
          currency: 'EUR',
          includedQuantity: 0,
          monthlyCap: 5.49,
        },
      ],
      sourceIds: ['hetzner-price'],
      verifiedAt: '2026-08-13',
      notes: [],
    }

    renderTable({
      offers: [hetznerOffer],
      freeTiers: [],
      scenario: { ...scenario, hoursPerMonth: 730 },
      exchangeRates: [
        {
          id: 'eur-usd-2026-08-13',
          base: 'EUR',
          quote: 'USD',
          rate: 1.1,
          date: '2026-08-13',
          sourceId: 'ecb-rate',
        },
        {
          id: 'eur-usd-2026-08-14',
          base: 'EUR',
          quote: 'USD',
          rate: 1.25,
          date: '2026-08-14',
          sourceId: 'ecb-rate',
        },
      ],
      health: health({
        statusByOfferId: { 'hetzner-cx23': 'stale' },
        statusByFreeTierId: {},
        statusByExchangeRateId: {
          'eur-usd-2026-08-13': 'current',
          'eur-usd-2026-08-14': 'current',
        },
      }),
    })

    const row = screen.getByRole('row', { name: /Hetzner Cloud CX23/ })
    expect(row).toHaveTextContent('€0.0088/saat · $0.00968/saat')
    expect(row).toHaveTextContent('aylık üst sınır €5.49 · $6.04')
    expect(row).toHaveTextContent('Kur: 1 EUR = 1.10 USD · 2026-08-13')
    expect(row).toHaveTextContent('$6.04/ay')
    expect(row).toHaveTextContent('Yeniden doğrulanmalı')
  })

  it('does not convert or total an EUR offer with invalid exchange-rate evidence', () => {
    const hetznerOffer: Offer = {
      id: 'hetzner-invalid-rate',
      providerId: 'hetzner',
      serviceName: 'Hetzner invalid exchange rate',
      category: 'compute',
      rankable: true,
      region: 'nbg1',
      specs: { vcpu: 2, ramGb: 4 },
      prices: [{
        kind: 'instance-hour',
        price: 0.0088,
        currency: 'EUR',
        includedQuantity: 0,
        monthlyCap: 5.49,
      }],
      sourceIds: ['hetzner-price'],
      verifiedAt: '2026-08-13',
      notes: [],
    }
    const rate = {
      id: 'invalid-ecb-rate',
      base: 'EUR' as const,
      quote: 'USD' as const,
      rate: 1.1,
      date: '2026-08-13',
      sourceId: 'ecb-rate',
    }

    renderTable({
      offers: [hetznerOffer],
      freeTiers: [],
      scenario: { ...scenario, hoursPerMonth: 730 },
      exchangeRates: [rate],
      health: health({
        statusByOfferId: { 'hetzner-invalid-rate': 'current' },
        statusByFreeTierId: {},
        statusByExchangeRateId: { 'invalid-ecb-rate': 'invalid' },
      }),
    })

    const row = screen.getByRole('row', { name: /Hetzner invalid exchange rate/ })
    const cells = within(row).getAllByRole('cell')
    expect(cells[4]).toHaveTextContent('€0.0088/saat · Doğrulanamadı')
    expect(cells[4]).toHaveTextContent('aylık üst sınır €5.49')
    expect(cells[4]).not.toHaveTextContent('$0.00968/saat')
    expect(cells[4]).not.toHaveTextContent('$6.04')
    expect(cells[4]).not.toHaveTextContent('Kur:')
    expect(cells[3]).toHaveTextContent('Doğrulanamadı')
    expect(row).toHaveTextContent('Doğrulanamadı')
  })

  it.each([
    ['wrong-owner rate source', 'hetzner-price-adjustment'],
    ['missing rate source', 'missing-rate-source'],
  ])('marks an undersized EUR row invalid with a %s while preserving original evidence', (_, sourceId) => {
    const catalog = loadCatalog()
    const highTraffic = catalog.scenarios.find((candidate) => candidate.id === 'high-traffic')!
    const hetzner = catalog.offers.find((offer) => offer.id === 'hetzner-cx23-nuremberg')!
    const exchangeRates = catalog.exchangeRates.map((rate) => ({ ...rate, sourceId }))
    const mutatedCatalog = { ...catalog, exchangeRates }
    const mutatedHealth = getCatalogHealth(mutatedCatalog, new Date('2026-08-14T00:00:00Z'))

    renderTable({
      offers: [hetzner],
      providers: catalog.providers,
      sources: catalog.sources,
      freeTiers: catalog.freeTiers,
      exchangeRates,
      health: mutatedHealth,
      scenario: highTraffic,
    })

    const row = screen.getByRole('row', { name: /Hetzner Cloud CX23/ })
    const cells = within(row).getAllByRole('cell')
    expect(cells[4]).toHaveTextContent('€0.0088/saat · Doğrulanamadı')
    expect(cells[4]).toHaveTextContent('aylık üst sınır €5.49')
    expect(cells[4]).not.toHaveTextContent('$')
    expect(cells[4]).not.toHaveTextContent('Kur:')
    expect(cells[3]).toHaveTextContent('Kapasite yetersiz')
    expect(cells[3]).toHaveTextContent('Eksik: vCPU, RAM')
    expect(cells[4]).toHaveTextContent('Doğrulanamadı')
    expect(cells[4]).not.toHaveTextContent('Güncel')
  })

  it('shows a USD monthly cap beside its metered unit price', () => {
    const cappedOffer: Offer = {
      ...offers[0]!,
      id: 'azure-capped-hourly',
      serviceName: 'Azure capped hourly offer',
      prices: [{
        kind: 'instance-hour',
        price: 0.05,
        currency: 'USD',
        includedQuantity: 0,
        monthlyCap: 4,
      }],
    }

    renderTable({
      offers: [cappedOffer],
      freeTiers: [],
      health: health({
        statusByOfferId: { 'azure-capped-hourly': 'current' },
        statusByFreeTierId: {},
      }),
    })

    const row = screen.getByRole('row', { name: /Azure capped hourly offer/ })
    expect(row).toHaveTextContent('$0.05/saat · aylık üst sınır $4.00')
    expect(row).toHaveTextContent('$4.00/ay')
  })

  it('uses the estimate status when an eligible stale free tier changes the estimate', () => {
    renderTable({
      offers: [offers[0]!],
      freeTiers,
      eligibleFreeTierIds: ['azure-vm-free'],
      monthsSinceAccountCreation: 1,
      health: health({
        statusByOfferId: { 'azure-vm': 'current' },
        statusByFreeTierId: { 'azure-vm-free': 'stale' },
      }),
    })

    const row = screen.getByRole('row', { name: /Azure VM B2s/ })
    expect(row).toHaveTextContent('Yeniden doğrulanmalı')
    expect(within(row).getByText('Yeniden doğrulanmalı')).toHaveAttribute('data-status', 'stale')
    expect(row).not.toHaveTextContent('Güncel')
  })

  it('converts EUR outbound traffic with the selected dated exchange rate', () => {
    const eurOutboundOffer: Offer = {
      id: 'hetzner-eur-outbound',
      providerId: 'hetzner',
      serviceName: 'Hetzner EUR outbound',
      category: 'cdn-network',
      rankable: true,
      region: 'nbg1',
      specs: {},
      prices: [{ kind: 'outbound-gb', price: 0.1, currency: 'EUR', includedQuantity: 0 }],
      sourceIds: ['hetzner-price'],
      verifiedAt: '2026-08-13',
      notes: [],
    }
    renderTable({
      offers: [eurOutboundOffer],
      freeTiers: [],
      exchangeRates: [
        {
          id: 'eur-usd-2026-08-13',
          base: 'EUR',
          quote: 'USD',
          rate: 1.1,
          date: '2026-08-13',
          sourceId: 'ecb-rate',
        },
      ],
      health: health({
        statusByOfferId: { 'hetzner-eur-outbound': 'current' },
        statusByFreeTierId: {},
        statusByExchangeRateId: { 'eur-usd-2026-08-13': 'current' },
      }),
    })

    const row = screen.getByRole('row', { name: /Hetzner EUR outbound/ })
    const trafficCell = within(row).getAllByRole('cell')[4]
    expect(trafficCell).toHaveTextContent('€0.10/GB · $0.11/GB')
    expect(trafficCell).not.toHaveTextContent('Doğrulanamadı')
  })

  it('shows Doğrulanamadı rather than zero for missing prices, regions and source records', () => {
    const incompleteOffer: Offer = {
      ...offers[0]!,
      id: 'azure-incomplete',
      serviceName: 'Eksik teklif',
      region: 'unknown-region',
      prices: [],
      sourceIds: ['missing-source'],
    }

    renderTable({
      offers: [incompleteOffer],
      freeTiers: [],
      health: health({ statusByOfferId: { 'azure-incomplete': 'invalid' }, statusByFreeTierId: {} }),
    })

    const row = screen.getByRole('row', { name: /Eksik teklif/ })
    expect(row).toHaveTextContent('Doğrulanamadı')
    expect(row).not.toHaveTextContent('$0.00')
    expect(within(row).queryByRole('link')).not.toBeInTheDocument()
  })
})
