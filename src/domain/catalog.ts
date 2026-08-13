export const providerIds = [
  'azure',
  'gcp',
  'aws',
  'hetzner',
  'oracle',
  'cloudflare',
  'digitalocean',
  'vultr',
] as const

export type ProviderId = (typeof providerIds)[number]

export const serviceCategories = [
  'compute',
  'gpu-ai',
  'object-storage',
  'managed-database',
  'serverless',
  'cdn-network',
  'kubernetes',
] as const

export type ServiceCategory = (typeof serviceCategories)[number]
export type VerificationStatus = 'current' | 'stale' | 'invalid'
export type PurchaseAvailability = 'verified' | 'conditional' | 'unverified'
export type Currency = 'USD' | 'EUR'
export type PriceKind =
  | 'instance-hour'
  | 'flat-month'
  | 'storage-gb-month'
  | 'outbound-gb'
  | 'requests-million'
  | 'database-gb-month'
  | 'gpu-hour'

export interface PriceComponent {
  kind: PriceKind
  price: number
  currency: Currency
  includedQuantity: number
  monthlyCap?: number
}

export interface Offer {
  id: string
  providerId: ProviderId
  serviceName: string
  category: ServiceCategory
  region: string
  specs: {
    vcpu?: number
    ramGb?: number
    storageGb?: number
    gpuModel?: string
    gpuVramGb?: number
  }
  prices: PriceComponent[]
  sourceIds: string[]
  verifiedAt: string
  notes: string[]
}

export type FreeTierType =
  | 'new-account-credit'
  | 'time-limited'
  | 'always-free'
  | 'eligibility-limited'

export interface Provider {
  id: ProviderId
  name: string
  shortName: string
  officialSite: string
  purchaseAvailability: PurchaseAvailability
  purchaseNote: string
  purchaseSourceIds: string[]
  verifiedAt: string
  strengths: string[]
  limitations: string[]
  regions: Array<{
    id: string
    name: string
    countryCode: string
    sourceId: string
  }>
}

export interface Source {
  id: string
  owner: ProviderId | 'ecb'
  title: string
  url: string
  kind: 'pricing' | 'free-tier' | 'regions' | 'purchase' | 'exchange-rate'
  accessedAt: string
}

export interface ExchangeRate {
  id: string
  base: 'EUR'
  quote: 'USD'
  rate: number
  date: string
  sourceId: string
}

export interface FreeTier {
  id: string
  providerId: ProviderId
  serviceName: string
  category: ServiceCategory
  type: FreeTierType
  quota: { amount: number; unit: string; period: 'once' | 'month' }
  durationMonths: number | null
  eligibilityNote: string
  overageNote: string
  automaticChargeNote: string
  sourceIds: string[]
  verifiedAt: string
}

export interface Scenario {
  id: string
  name: string
  description: string
  requiredCategories: ServiceCategory[]
  hoursPerMonth: number
  vcpu: number
  ramGb: number
  storageGb: number
  outboundGb: number
  requestsMillion: number
  databaseGb: number
  gpuHours: number
  gpuVramGb: number
}

export interface Catalog {
  providers: Provider[]
  sources: Source[]
  offers: Offer[]
  freeTiers: FreeTier[]
  exchangeRates: ExchangeRate[]
  scenarios: Scenario[]
}

export interface CatalogHealth {
  statusByOfferId: Record<string, VerificationStatus>
  statusByFreeTierId: Record<string, VerificationStatus>
  invalidReferences: string[]
  staleCount: number
  invalidCount: number
}
