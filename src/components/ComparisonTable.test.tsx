import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
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
    notes: [],
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
    notes: [],
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
  requiredCategories: ['compute'],
  hoursPerMonth: 100,
  vcpu: 1,
  ramGb: 1,
  storageGb: 20,
  outboundGb: 20,
  requestsMillion: 12,
  databaseGb: 0,
  gpuHours: 0,
  gpuVramGb: 0,
}

function health(overrides: Partial<CatalogHealth> = {}): CatalogHealth {
  return {
    statusByOfferId: { 'azure-vm': 'current', 'cloudflare-workers': 'current' },
    statusByFreeTierId: { 'azure-vm-free': 'current' },
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
  it('renders sourced offers with semantic columns and unit-aware pricing', () => {
    renderTable()

    const region = screen.getByRole('region', { name: 'Servis karşılaştırma tablosu' })
    const table = within(region).getByRole('table', { name: 'Servis karşılaştırması' })
    expect(table).toBeInTheDocument()

    for (const column of [
      'Sağlayıcı',
      'Servis',
      'Bölge',
      'Kapasite',
      'Saatlik / birim fiyat',
      'Aylık tahmin',
      'Ücretsiz kota',
      'Trafik',
      'Doğrulama',
      'Kaynak',
    ]) {
      expect(within(table).getByRole('columnheader', { name: column })).toBeInTheDocument()
    }

    const azure = within(table).getByRole('row', { name: /Microsoft Azure/ })
    expect(azure).toHaveTextContent('West Europe · Bölgesel · NL')
    expect(azure).toHaveTextContent('2 vCPU · 4 GB RAM')
    expect(azure).toHaveTextContent('$0.05/saat')
    expect(azure).toHaveTextContent('$5.00/ay')
    expect(azure).toHaveTextContent('750 instance-hours/ay')
    expect(azure).toHaveTextContent('100 GB dahil')
    expect(azure).toHaveTextContent('Sıralanabilir')

    const cloudflare = within(table).getByRole('row', { name: /Cloudflare Workers Paid/ })
    expect(cloudflare).toHaveTextContent('Global edge network · Global')
    expect(cloudflare).toHaveTextContent('Yalnızca bileşen')
    expect(cloudflare).toHaveTextContent('$5.00/ay')
    expect(cloudflare).toHaveTextContent('$0.30/milyon istek · 10 dahil')
    expect(cloudflare).toHaveTextContent('$5.60/ay')
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
    renderTable()
    const table = screen.getByRole('table', { name: 'Servis karşılaştırması' })
    const monthlyHeader = within(table).getByRole('columnheader', { name: 'Aylık tahmin' })
    const monthlySort = within(monthlyHeader).getByRole('button', { name: 'Aylık tahmine göre sırala' })

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
      prices: [{ kind: 'flat-month', price: 5, currency: 'USD', includedQuantity: 0 }],
    }
    renderTable({
      offers: [invalidOffer, verifiedOffer],
      freeTiers: [],
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
    expect(within(invalidRow).getAllByRole('cell')[4]).not.toHaveTextContent('$1.00/ay')

    await user.click(screen.getByRole('button', { name: 'Aylık tahmine göre sırala' }))
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Verified monthly offer')
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
      health: health({ statusByOfferId: { 'hetzner-cx23': 'stale' }, statusByFreeTierId: {} }),
    })

    const row = screen.getByRole('row', { name: /Hetzner Cloud CX23/ })
    expect(row).toHaveTextContent('€0.0088/saat · $0.00968/saat')
    expect(row).toHaveTextContent('Kur: 1 EUR = 1.10 USD · 2026-08-13')
    expect(row).toHaveTextContent('$6.04/ay')
    expect(row).toHaveTextContent('Yeniden doğrulanmalı')
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
      health: health({ statusByOfferId: { 'hetzner-eur-outbound': 'current' }, statusByFreeTierId: {} }),
    })

    const row = screen.getByRole('row', { name: /Hetzner EUR outbound/ })
    const trafficCell = within(row).getAllByRole('cell')[6]
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
