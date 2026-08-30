import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { CatalogHealth, FreeTier, Provider, Source } from '../domain/catalog'
import { FreeTierGuide } from './FreeTierGuide'

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
    automaticChargeNote: `${providerNames[providerId]} otomatik ücret kaydı.`,
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
    eligibilityNote: 'Yalnızca yeni Azure hesapları uygundur.',
    automaticChargeNote: 'Azure ücretli hesapta aşımı otomatik faturalar.',
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
  statusByFreeTierId: {
    ...Object.fromEntries(freeTiers.map((freeTier) => [freeTier.id, 'current'])),
    'cloud-run': 'stale',
  },
  statusByExchangeRateId: {},
  invalidReferences: [],
  staleCount: 1,
  invalidCount: 0,
}

afterEach(cleanup)

describe('FreeTierGuide', () => {
  it('derives honest provider summaries and reveals exact record evidence only on demand', async () => {
    const user = userEvent.setup()
    render(<FreeTierGuide freeTiers={freeTiers} providers={providers} sources={sources} health={health} />)

    const guide = screen.getByRole('region', { name: 'Ücretsiz kullanım rehberi' })
    const azure = within(guide).getByRole('button', { name: /Microsoft Azure/ })
    const gcp = within(guide).getByRole('button', { name: /Google Cloud/ })

    expect(guide).toHaveAttribute('id', 'ucretsiz-katmanlar')
    expect(within(guide).getByRole('heading', { name: 'Ücretsiz kullanım rehberi', level: 2 })).toBeInTheDocument()
    expect(azure).toHaveTextContent('2 teklif')
    expect(azure).toHaveTextContent('Yeni hesap kredisi var')
    expect(gcp).toHaveTextContent('Sürekli ücretsiz kota var')
    expect(azure).toHaveTextContent('En uzun süreli teklif: 12 ay')
    expect(gcp).toHaveTextContent('Yeniden doğrulama gereken kayıt var')
    expect(guide).toHaveTextContent('Aşım davranışı kayıt bazında değişir')
    expect(guide).toHaveTextContent('Bilgi amaçlı; tahmine uygulanmadı')
    expect(azure).toHaveAttribute('aria-pressed', 'true')
    expect(gcp).toHaveAttribute('aria-pressed', 'false')
    expect(azure).not.toHaveAttribute('aria-controls')
    expect(gcp).not.toHaveAttribute('aria-controls')
    expect(screen.queryByText('Azure ücretli hesapta aşımı otomatik faturalar.')).not.toBeInTheDocument()

    await user.click(azure)

    expect(azure).toHaveAttribute('aria-controls', 'free-tier-records')
    expect(guide).toContainElement(document.getElementById('free-tier-records'))
    const record = screen.getByRole('article', { name: 'Azure free account credit' })
    expect(within(record).getByText('Azure ücretli hesapta aşımı otomatik faturalar.')).toBeInTheDocument()
    expect(within(record).getByText('Yalnızca yeni Azure hesapları uygundur.')).toBeInTheDocument()
    expect(within(record).getByText('Güncel')).toHaveAttribute('data-status', 'current')
    expect(record.querySelector('.data-table__meta')).toHaveAttribute('dateTime', '2026-08-13')

    const source = within(record).getByRole('link', { name: /Microsoft Azure resmi ücretsiz katman/ })
    expect(source).toHaveAttribute('href', 'https://example.com/azure/free')
    expect(source).toHaveAttribute('target', '_blank')
    expect(source).toHaveAttribute('rel', 'noopener noreferrer')

    const overage = within(record).getByText('Aşım')
    const automaticCharge = within(record).getByText('Otomatik ücret')
    const eligibility = within(record).getByText('Uygunluk / kapsam')
    expect(overage.compareDocumentPosition(automaticCharge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(automaticCharge.compareDocumentPosition(eligibility) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('replaces mounted records when another provider is selected', async () => {
    const user = userEvent.setup()
    render(<FreeTierGuide freeTiers={freeTiers} providers={providers} sources={sources} health={health} />)

    const guide = screen.getByRole('region', { name: 'Ücretsiz kullanım rehberi' })
    const azure = within(guide).getByRole('button', { name: /Microsoft Azure/ })
    const gcp = within(guide).getByRole('button', { name: /Google Cloud/ })

    await user.click(azure)
    expect(screen.getByRole('article', { name: 'Azure free account credit' })).toBeInTheDocument()

    await user.click(gcp)

    expect(azure).toHaveAttribute('aria-pressed', 'false')
    expect(gcp).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('article', { name: 'Azure free account credit' })).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Google Cloud Run' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Google Compute Engine e2-micro' })).toBeInTheDocument()
  })

  it('uses the latest verification date when a provider has records from different dates', () => {
    const datedAzureTiers = [
      { ...freeTiers[0]!, verifiedAt: '2026-08-01' },
      { ...freeTiers[1]!, verifiedAt: '2026-08-15' },
    ]

    render(
      <FreeTierGuide
        freeTiers={datedAzureTiers}
        providers={providers}
        sources={sources}
        health={health}
      />,
    )

    const azure = screen.getByRole('button', { name: /Microsoft Azure/ })
    expect(azure).toHaveTextContent('Son doğrulama: 2026-08-15')
    expect(within(azure).getByText('2026-08-15')).toHaveAttribute('dateTime', '2026-08-15')
  })

  it('keeps heterogeneous credits and recurring quotas as separate records', async () => {
    const user = userEvent.setup()
    render(<FreeTierGuide freeTiers={freeTiers} providers={providers} sources={sources} health={health} />)

    const guide = screen.getByRole('region', { name: 'Ücretsiz kullanım rehberi' })
    await user.click(within(guide).getByRole('button', { name: /Microsoft Azure/ }))

    expect(screen.getByRole('article', { name: 'Azure free account credit' })).toHaveTextContent(
      '200 USD credit · tek sefer',
    )
    expect(screen.getByRole('article', { name: 'Azure virtual machines' })).toHaveTextContent(
      '750 instance-hours · aylık',
    )
    expect(guide).not.toHaveTextContent('950')
  })

  it('renders an explicit fail-closed status when there are no free-tier records', () => {
    render(<FreeTierGuide freeTiers={[]} providers={providers} sources={sources} health={health} />)

    const guide = screen.getByRole('region', { name: 'Ücretsiz kullanım rehberi' })
    expect(within(guide).getByRole('status')).toHaveTextContent('Ücretsiz kullanım kaydı bulunamadı.')
    expect(within(guide).queryByRole('button')).not.toBeInTheDocument()
  })

  it('fails closed when a free-tier record has no matching provider', () => {
    const unmatchedTier = tier('unmatched-azure-tier', 'azure', 'always-free')
    const providersWithoutAzure = providers.filter((provider) => provider.id !== 'azure')

    render(
      <FreeTierGuide
        freeTiers={[unmatchedTier]}
        providers={providersWithoutAzure}
        sources={sources}
        health={health}
      />,
    )

    const guide = screen.getByRole('region', { name: 'Ücretsiz kullanım rehberi' })
    expect(within(guide).getByRole('status')).toHaveTextContent(
      'Ücretsiz kullanım kayıtları doğrulanamadı: sağlayıcı eşleşmesi eksik.',
    )
    expect(within(guide).queryByText(unmatchedTier.serviceName)).not.toBeInTheDocument()
  })

  it('reports a provider mismatch without hiding valid matched-provider records', async () => {
    const user = userEvent.setup()
    const matchedTier = freeTiers[0]!
    const unmatchedTier = tier('unmatched-oracle-tier', 'oracle', 'always-free')
    const providersWithoutOracle = providers.filter((provider) => provider.id !== 'oracle')

    render(
      <FreeTierGuide
        freeTiers={[matchedTier, unmatchedTier]}
        providers={providersWithoutOracle}
        sources={sources}
        health={health}
      />,
    )

    const guide = screen.getByRole('region', { name: 'Ücretsiz kullanım rehberi' })
    expect(within(guide).getByRole('status')).toHaveTextContent(
      'Ücretsiz kullanım kayıtları doğrulanamadı: sağlayıcı eşleşmesi eksik.',
    )

    await user.click(within(guide).getByRole('button', { name: /Microsoft Azure/ }))

    expect(within(guide).getByRole('article', { name: matchedTier.serviceName })).toBeInTheDocument()
    expect(within(guide).queryByText(unmatchedTier.serviceName)).not.toBeInTheDocument()
  })
})
