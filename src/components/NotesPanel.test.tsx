import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotesPanel } from './NotesPanel'

afterEach(cleanup)

describe('NotesPanel', () => {
  it('renders an empty state with 0 kelime', () => {
    render(<NotesPanel sectionId="sec" value="" onChange={() => {}} />)
    expect(screen.getByTestId('notes-sec')).toHaveValue('')
    expect(screen.getByText('0 kelime')).toBeInTheDocument()
  })

  it('triggers onChange with the current value on every keystroke', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NotesPanel sectionId="sec" value="" onChange={onChange} />)
    const textarea = screen.getByTestId('notes-sec')
    await user.click(textarea)
    await user.keyboard('a')
    expect(onChange).toHaveBeenCalled()
    for (const call of onChange.mock.calls) {
      const [id, value] = call as [string, string]
      expect(id).toBe('sec')
      expect(typeof value).toBe('string')
    }
  })

  it('disables the clear button when empty', () => {
    render(<NotesPanel sectionId="sec" value="" onChange={() => {}} />)
    expect(screen.getByTestId('notes-sec-clear')).toBeDisabled()
  })

  it('clears the value when the clear button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NotesPanel sectionId="sec" value="eski" onChange={onChange} />)
    await user.click(screen.getByTestId('notes-sec-clear'))
    expect(onChange).toHaveBeenCalledWith('sec', '')
  })

  it('counts words correctly for Turkish text', () => {
    render(<NotesPanel sectionId="sec" value="iki kelime" onChange={() => {}} />)
    expect(screen.getByText('2 kelime')).toBeInTheDocument()
  })
})
