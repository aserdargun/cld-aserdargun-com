import { t } from '../i18n'
import { ExternalLink } from 'lucide-react'
import type { Source } from '../domain/catalog'

interface SourceLinkProps {
  sourceId: string
  sources: readonly Source[]
}

export function SourceLink({ sourceId, sources }: SourceLinkProps) {
  const source = sources.find((candidate) => candidate.id === sourceId)

  if (!source) {
    return <span className="source-link source-link--missing">{t('Doğrulanamadı')}</span>
  }

  return (
    <a className="source-link" href={source.url} target="_blank" rel="noopener noreferrer">
      <span>{source.title}</span>
      <time dateTime={source.accessedAt}>{source.accessedAt}</time>
      <ExternalLink aria-hidden="true" size={15} strokeWidth={1.9} />
    </a>
  )
}
