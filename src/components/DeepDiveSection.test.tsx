import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeepDiveSection } from './DeepDiveSection'

afterEach(cleanup)

function renderSection(overrides: Partial<Parameters<typeof DeepDiveSection>[0]> = {}) {
  const onMarkLearned = vi.fn()
  const isLearned = vi.fn(() => false)
  const onSetNote = vi.fn()
  const notes: Record<string, string> = {}
  render(
    <DeepDiveSection
      onMarkLearned={onMarkLearned}
      isLearned={isLearned}
      onSetNote={onSetNote}
      notes={notes}
      {...overrides}
    />,
  )
  return { onMarkLearned, isLearned, onSetNote }
}

describe('DeepDiveSection', () => {
  it('renders the three deep dives', () => {
    renderSection()
    expect(screen.getByText("Kubernetes'a giriş")).toBeInTheDocument()
    expect(screen.getByText('Sunucusuz mimari desenleri')).toBeInTheDocument()
    expect(screen.getByText('GPU ve yapay zeka iş yükleri')).toBeInTheDocument()
  })

  it('marks the deep dive as learned on toggle', async () => {
    const user = userEvent.setup()
    const { onMarkLearned } = renderSection()
    const button = screen.getByTestId('learned-toggle-deep-dive:kubernetes-intro')
    await user.click(button)
    expect(onMarkLearned).toHaveBeenCalledWith('deep-dive:kubernetes-intro', true)
  })

  it('shows prerequisites, steps and pitfalls for each deep dive', () => {
    renderSection()
    const k8s = screen.getByRole('article', { name: /Kubernetes'a giriş/ })
    expect(within(k8s).getByText('Önce bilmen gereken')).toBeInTheDocument()
    expect(within(k8s).getAllByText(/Sık yapılan hata/).length).toBeGreaterThan(0)
    expect(within(k8s).getAllByText(/Sonraki adım/).length).toBeGreaterThan(0)
  })

  it('persists the inline note when the user types', async () => {
    const user = userEvent.setup()
    const { onSetNote } = renderSection()
    const textarea = screen.getByTestId('notes-deep-dive:kubernetes-intro')
    await user.type(textarea, 'x')
    expect(onSetNote).toHaveBeenCalledWith('deep-dive:kubernetes-intro', expect.any(String))
  })

  it('renders the architecture flow caption for at least one dive', () => {
    renderSection()
    expect(screen.getAllByText(/Tipik bir K8s|S3 yüklemesini|Yapay zeka ürününün/).length).toBeGreaterThan(0)
  })
})
