import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { CatalogHealth, FreeTier, Provider, Source } from '../domain/catalog'
import { FreeTierTable } from './FreeTierTable'

const providerIds = ['azure', 'gcp', 'aws', 'oracle'] as const
const providerNames = {
  azure: 'Microsoft Azure',
  gcp: 'Google Cloud',
  aws: 'Amazon Web Services',
  oracle: 'Oracle Cloud Infrastructure',
}

const providers: Provider[] = providerIds.map((id) => ({
  id,
  name: providerNames[id],
  shortName: id === 'gcp' ? 'GCP' : id === 'aws' ? 'AWS' : id === 'azure' ? 'Azure' : 'Oracle',
  officialSite: `https://example.com/${id}`,
  purchaseAvailability: 'verified',
  purchaseNote: 'Satın alım notu.',
  purchaseSourceIds: [`${id}-purchase`],
  verifiedAt: '2026-08-13',
  strengths: [],
  limitations: [],
  regions: [
    {
      id: `${id}-region`,
      name: `${id} region`,
      countryCode: 'DE',
      scope: 'regional',
      sourceId: `${id}-region-source`,
    },
  ],
}))

const sources: Source[] = providerIds.map((id) => ({
  id: `${id}-free-source`,
  owner: id,
  title: `${providerNames[id]} resmi ücretsiz katman`,
  url: `https://example.com/${id}/free`,
  kind: 'free-tier',
  accessedAt: '2026-08-13',
}))

function tier(
  id: string,
  providerId: (typeof providerIds)[number],
  type: FreeTier['type'],
  overrides: Partial<FreeTier> = {},
): FreeTier {
  return {
    id,
    providerId,
    serviceName: `${providerNames[providerId]} ${id}`,
    category: 'compute',
    compatibleOfferIds: [],
    compatiblePriceKinds: [],
    type,
    quota: { amount: 1, unit: 'instance-month', period: 'month' },
    durationMonths: null,
    eligibilityNote: `${providerNames[providerId]} uygunluk koşulları.`,
    overageNote: `${providerNames[providerId]} aşım tarifesi uygulanır.`,
    automaticChargeNote: `${providerNames[providerId]} ücretli hesapta aşımı otomatik faturalar.`,
    sourceIds: [`${providerId}-free-source`],
    verifiedAt: '2026-08-13',
    ...overrides,
  }
}

const freeTiers: FreeTier[] = [
  tier('welcome-credit', 'azure', 'new-account-credit', {
    serviceName: 'Azure free account credit',
    quota: { amount: 200, unit: 'USD credit', period: 'once' },
    durationMonths: 1,
  }),
  tier('vm-hours', 'azure', 'time-limited', {
    serviceName: 'Azure virtual machines',
    quota: { amount: 750, unit: 'instance-hours', period: 'month' },
    durationMonths: 12,
  }),
  tier('cloud-run', 'gcp', 'always-free', {
    serviceName: 'Google Cloud Run',
    quota: { amount: 2, unit: 'million requests', period: 'month' },
  }),
  tier('e2-micro', 'gcp', 'eligibility-limited', {
    serviceName: 'Google Compute Engine e2-micro',
    eligibilityNote: 'Yalnızca belirli ABD bölgelerinde kullanılabilir.',
  }),
  tier('lambda', 'aws', 'always-free', {
    serviceName: 'AWS Lambda',
    quota: { amount: 1, unit: 'million requests', period: 'month' },
  }),
  tier('ampere', 'oracle', 'always-free', {
    serviceName: 'OCI Ampere A1',
    quota: { amount: 1500, unit: 'OCPU-hours', period: 'month' },
  }),
]

const health: CatalogHealth = {
  statusByOfferId: {},
  statusByFreeTierId: Object.fromEntries(freeTiers.map((freeTier) => [freeTier.id, 'current'])),
  invalidReferences: [],
  staleCount: 0,
  invalidCount: 0,
}

afterEach(cleanup)

describe('FreeTierTable', () => {
  it('shows all four offer types and keeps eligibility ahead of cost implications', () => {
    render(<FreeTierTable freeTiers={freeTiers} providers={providers} sources={sources} health={health} />)

    const region = screen.getByRole('region', { name: 'Ücretsiz katmanlar tablosu' })
    const table = within(region).getByRole('table', { name: 'Ücretsiz katmanlar' })
    for (const column of [
      'Sağlayıcı',
      'Servis',
      'Tür',
      'Kota',
      'Süre',
      'Uygunluk / kapsam',
      'Aşım',
      'Otomatik ücret',
      'Doğrulama',
      'Kaynak',
    ]) {
      expect(within(table).getByRole('columnheader', { name: column })).toBeInTheDocument()
    }

    expect(table).toHaveTextContent('Yeni hesap kredisi')
    expect(table).toHaveTextContent('Süreli ücretsiz kullanım')
    expect(table).toHaveTextContent('Sürekli ücretsiz kota')
    expect(table).toHaveTextContent('Uygunlukla sınırlı kota')
    expect(table).toHaveTextContent('200 USD credit · tek sefer')
    expect(table).toHaveTextContent('750 instance-hours · aylık')
    expect(table).toHaveTextContent('12 ay')
    expect(table).toHaveTextContent('Süre sınırı yok')

    const headers = within(table).getAllByRole('columnheader').map((header) => header.textContent)
    expect(headers.indexOf('Uygunluk / kapsam')).toBeLessThan(headers.indexOf('Aşım'))
    expect(headers.indexOf('Aşım')).toBeLessThan(headers.indexOf('Otomatik ücret'))
    expect(table).not.toHaveTextContent('AWS Lambda')
    expect(table).not.toHaveTextContent('OCI Ampere A1')
  })

  it('defaults to Azure and GCP and lets people explicitly include AWS and Oracle', async () => {
    const user = userEvent.setup()
    render(<FreeTierTable freeTiers={freeTiers} providers={providers} sources={sources} health={health} />)

    const azure = screen.getByRole('button', { name: 'Azure' })
    const gcp = screen.getByRole('button', { name: 'GCP' })
    const aws = screen.getByRole('button', { name: 'AWS' })
    const oracle = screen.getByRole('button', { name: 'Oracle' })
    expect(azure).toHaveAttribute('aria-pressed', 'true')
    expect(gcp).toHaveAttribute('aria-pressed', 'true')
    expect(aws).toHaveAttribute('aria-pressed', 'false')
    expect(oracle).toHaveAttribute('aria-pressed', 'false')

    await user.click(aws)
    await user.click(oracle)
    expect(screen.getByRole('row', { name: /AWS Lambda/ })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /OCI Ampere A1/ })).toBeInTheDocument()

    await user.click(azure)
    expect(screen.queryByRole('row', { name: /Azure free account credit/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Azure virtual machines/ })).not.toBeInTheDocument()
  })

  it('keeps credits and recurring quotas separate and never invents a combined value', () => {
    render(<FreeTierTable freeTiers={freeTiers} providers={providers} sources={sources} health={health} />)

    expect(screen.getByRole('row', { name: /Azure free account credit/ })).toHaveTextContent(
      '200 USD credit · tek sefer',
    )
    expect(screen.getByRole('row', { name: /Azure virtual machines/ })).toHaveTextContent(
      '750 instance-hours · aylık',
    )
    expect(screen.getByRole('table', { name: 'Ücretsiz katmanlar' })).not.toHaveTextContent('950')
  })
})
