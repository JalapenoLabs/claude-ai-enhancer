import type { SelectedConversation } from '../../bulk/types'

// Core
import { beforeEach, describe, expect, it } from 'vitest'

// Misc
import { selectionState } from './selectionState'

function conversation(pathname: string): SelectedConversation {
  return { kind: 'chat', id: pathname, title: pathname, pathname }
}

describe('selectionState', () => {
  beforeEach(() => {
    selectionState.setActive(false)
    selectionState.setActive(true)
  })

  it('moves the range anchor on toggle, but not on selectMany', () => {
    selectionState.toggle(conversation('/chat/a'))
    selectionState.selectMany([conversation('/chat/b'), conversation('/chat/c')])

    expect(selectionState.rangeAnchorPathname).toBe('/chat/a')
    expect(selectionState.items.map((item) => item.pathname)).toEqual(['/chat/a', '/chat/b', '/chat/c'])
  })

  it('never deselects or duplicates on selectMany', () => {
    selectionState.toggle(conversation('/chat/a'))
    selectionState.selectMany([conversation('/chat/a'), conversation('/chat/b')])

    expect(selectionState.items).toHaveLength(2)
  })

  it('clears the selection and range anchor when leaving selection mode', () => {
    selectionState.toggle(conversation('/chat/a'))
    selectionState.setActive(false)

    expect(selectionState.items).toEqual([])
    expect(selectionState.rangeAnchorPathname).toBeUndefined()
  })
})
