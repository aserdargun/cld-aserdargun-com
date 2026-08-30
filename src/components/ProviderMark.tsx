import {
  siCloudflare,
  siDigitalocean,
  siGooglecloud,
  siHetzner,
  siVultr,
} from 'simple-icons'
import type { ProviderId } from '../domain/catalog'

const marks: Partial<Record<ProviderId, { path: string }>> = {
  gcp: siGooglecloud,
  hetzner: siHetzner,
  cloudflare: siCloudflare,
  digitalocean: siDigitalocean,
  vultr: siVultr,
}

export function ProviderMark({ providerId, size = 20 }: { providerId: ProviderId; size?: number }) {
  const mark = marks[providerId]

  if (!mark) {
    return null
  }

  return (
    <svg
      aria-hidden="true"
      data-provider={providerId}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      focusable="false"
    >
      <path d={mark.path} />
    </svg>
  )
}
