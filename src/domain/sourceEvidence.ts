import type { Source } from './catalog'

export type SourceEvidenceIssue = 'missing' | 'wrong-owner' | 'wrong-kind' | 'unofficial-url'

// Ownership metadata alone cannot establish that a URL belongs to the provider.
const officialDomains: Record<Source['owner'], readonly string[]> = {
  azure: ['microsoft.com', 'azure.com'],
  gcp: ['cloud.google.com'],
  aws: ['aws.amazon.com', 'pricing.us-east-1.amazonaws.com'],
  hetzner: ['hetzner.com'],
  oracle: ['oracle.com'],
  cloudflare: ['cloudflare.com'],
  digitalocean: ['digitalocean.com'],
  vultr: ['vultr.com'],
  ecb: ['ecb.europa.eu'],
}

export function isOfficialSourceUrl(url: string, owner: Source['owner']): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password &&
      !parsed.port && officialDomains[owner].some((domain) =>
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

export type SourceEvidenceSetIssue =
  | { type: 'empty' }
  | {
    type: 'source'
    sourceId: string
    issue: SourceEvidenceIssue
  }

export function sourceEvidenceIssue(
  source: Source | undefined,
  expectedOwner: Source['owner'],
  expectedKind: Source['kind'],
): SourceEvidenceIssue | null {
  if (!source) return 'missing'
  if (source.owner !== expectedOwner) return 'wrong-owner'
  if (source.kind !== expectedKind) return 'wrong-kind'
  if (!isOfficialSourceUrl(source.url, expectedOwner)) return 'unofficial-url'
  return null
}

export function hasExactSourceEvidence(
  sourceIds: readonly string[],
  sourcesById: ReadonlyMap<string, Source>,
  expectedOwner: Source['owner'],
  expectedKind: Source['kind'],
  requireAtLeastOne = false,
): boolean {
  return sourceEvidenceSetIssues(
    sourceIds,
    sourcesById,
    expectedOwner,
    expectedKind,
    requireAtLeastOne,
  ).length === 0
}

export function sourceEvidenceSetIssues(
  sourceIds: readonly string[],
  sourcesById: ReadonlyMap<string, Source>,
  expectedOwner: Source['owner'],
  expectedKind: Source['kind'],
  requireAtLeastOne = false,
): SourceEvidenceSetIssue[] {
  if (requireAtLeastOne && sourceIds.length === 0) return [{ type: 'empty' }]

  const issues: SourceEvidenceSetIssue[] = []
  sourceIds.forEach((sourceId) => {
    const issue = sourceEvidenceIssue(sourcesById.get(sourceId), expectedOwner, expectedKind)
    if (issue) issues.push({ type: 'source', sourceId, issue })
  })
  return issues
}
