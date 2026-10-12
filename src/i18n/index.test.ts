// Core
import { describe, expect, it } from 'vitest'

// Misc
import { t } from './index'

describe('t', () => {
  it('picks the singular and plural forms by count', () => {
    expect(t('selection.count', { count: 1 })).toBe('1 selected')
    expect(t('selection.confirmDelete', { count: 1 })).toContain('delete 1 conversation?')
    expect(t('selection.confirmDelete', { count: 3 })).toContain('delete 3 conversations?')
  })

  it('interpolates values without HTML escaping', () => {
    expect(t('transcript.attachment', { fileName: 'a<b>.md' })).toBe('Attachment: a<b>.md')
  })
})
