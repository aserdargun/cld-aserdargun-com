import { describe, expect, it } from 'vitest'
import type { Source } from './catalog'
import {
  hasExactSourceEvidence,
  isOfficialSourceUrl,
  sourceEvidenceIssue,
  sourceEvidenceSetIssues,
} from './sourceEvidence'

const awsPurchaseSource: Source = {
  id: 'aws-purchase',
  owner: 'aws',
  title: 'AWS purchase evidence',
  url: 'https://aws.amazon.com/aws-purchase',
  kind: 'purchase',
  accessedAt: '2026-08-13',
}

const sourcesById = new Map([[awsPurchaseSource.id, awsPurchaseSource]])

describe('source evidence sets', () => {
  it.each([
    'https://aws.amazon.com.example.org/pricing',
    'https://evilaws.amazon.com/pricing',
    'https://aws.amazon.com@evil.example/pricing',
    'https://user:secret@aws.amazon.com/pricing',
    'https://aws.amazon.com:8443/pricing',
    'http://aws.amazon.com/pricing',
    'https://cloud.google.com/pricing',
    'not-a-url',
  ])('rejects provider metadata attached to an unofficial URL: %s', (url) => {
    expect(isOfficialSourceUrl(url, 'aws')).toBe(false)
    expect(sourceEvidenceIssue({ ...awsPurchaseSource, url }, 'aws', 'purchase')).toBe('unofficial-url')
  })

  it('accepts official pricing subdomains', () => {
    expect(isOfficialSourceUrl('https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/index.json', 'aws')).toBe(true)
    expect(isOfficialSourceUrl('https://docs.cloud.google.com/compute', 'gcp')).toBe(true)
  })
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
