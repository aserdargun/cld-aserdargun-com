import type { Source } from './catalog'

export type SourceEvidenceIssue = 'missing' | 'wrong-owner' | 'wrong-kind'

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
