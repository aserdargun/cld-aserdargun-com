import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProviderMark } from './ProviderMark'

const providerNames = {
  azure: 'Microsoft Azure',
  gcp: 'Google Cloud',
  aws: 'Amazon Web Services',
  hetzner: 'Hetzner',
  oracle: 'Oracle Cloud',
  cloudflare: 'Cloudflare',
  digitalocean: 'DigitalOcean',
  vultr: 'Vultr',
} as const

describe('ProviderMark', () => {
  it('renders a supported provider mark as decorative beside visible text', () => {
    render(
      <div>
        <ProviderMark providerId="gcp" />
        <span>Google Cloud</span>
      </div>,
    )
    expect(screen.getByText('Google Cloud')).toBeInTheDocument()
    expect(document.querySelector('svg[data-provider="gcp"]')).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps every full provider name accessible when composed with the mark', () => {
    render(
      <>
        {Object.entries(providerNames).map(([id, name]) => (
          <div key={id}>
            <ProviderMark providerId={id as keyof typeof providerNames} />
            <span>{name}</span>
          </div>
        ))}
      </>,
    )
    for (const name of Object.values(providerNames)) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0)
    }
  })

  it('renders only the five current official marks', () => {
    const { container } = render(
      <>
        {Object.keys(providerNames).map((id) => (
          <ProviderMark key={id} providerId={id as keyof typeof providerNames} />
        ))}
      </>,
    )
    expect(container.querySelectorAll('svg')).toHaveLength(5)
  })

  it('does not render forbidden brand art or fallback SVGs', () => {
    const { container } = render(
      <>
        <ProviderMark providerId="azure" />
        <ProviderMark providerId="aws" />
        <ProviderMark providerId="oracle" />
      </>,
    )
    expect(container.querySelectorAll('svg')).toHaveLength(0)
    expect(container.textContent).toBe('')
  })
})
