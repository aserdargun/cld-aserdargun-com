import { describe, expect, it } from 'vitest'
import type { Source } from './catalog'
import {
  hasExactSourceEvidence,
  sourceEvidenceSetIssues,
} from './sourceEvidence'

const awsPurchaseSource: Source = {
  id: 'aws-purchase',
  owner: 'aws',
  title: 'AWS purchase evidence',
  url: 'https://example.com/aws-purchase',
  kind: 'purchase',
  accessedAt: '2026-08-13',
}

const sourcesById = new Map([[awsPurchaseSource.id, awsPurchaseSource]])

describe('source evidence sets', () => {
  it('diagnoses an empty required set without inventing a source id', () => {
    expect(sourceEvidenceSetIssues(
      [],
      sourcesById,
      'aws',
      'purchase',
      true,
    )).toEqual([{ type: 'empty' }])
    expect(hasExactSourceEvidence(
      [],
      sourcesById,
      'aws',
      'purchase',
      true,
    )).toBe(false)
  })

  it('keeps a nonempty exact source set healthy', () => {
    expect(sourceEvidenceSetIssues(
      [awsPurchaseSource.id],
      sourcesById,
      'aws',
      'purchase',
      true,
    )).toEqual([])
    expect(hasExactSourceEvidence(
      [awsPurchaseSource.id],
      sourcesById,
      'aws',
      'purchase',
      true,
    )).toBe(true)
  })
})
