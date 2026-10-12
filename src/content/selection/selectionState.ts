import type { SelectedConversation } from '../../bulk/types'

type Listener = () => void

/**
 * Whether selection mode is on and which conversations are selected, keyed by link pathname.
 * The sidebar toggle, link interception, and action bar all read and react to this one object.
 */
class SelectionState {
  #isActive = false
  #selected = new Map<string, SelectedConversation>()
  // The conversation last clicked without Shift, where a shift-click range starts.
  #rangeAnchorPathname: string | undefined
  #listeners = new Set<Listener>()

  get isActive() {
    return this.#isActive
  }

  get items() {
    return [...this.#selected.values()]
  }

  get rangeAnchorPathname() {
    return this.#rangeAnchorPathname
  }

  has(pathname: string) {
    return this.#selected.has(pathname)
  }

  setActive(isActive: boolean) {
    this.#isActive = isActive
    if (!isActive) {
      this.#selected.clear()
      this.#rangeAnchorPathname = undefined
    }
    this.#notify()
  }

  toggle(conversation: SelectedConversation) {
    if (!this.#selected.delete(conversation.pathname)) {
      this.#selected.set(conversation.pathname, conversation)
    }
    this.#rangeAnchorPathname = conversation.pathname
    this.#notify()
  }

  // Adds to the selection without deselecting anything or moving the range anchor, so
  // consecutive shift-clicks all extend from the same starting point, as in file managers.
  selectMany(conversations: SelectedConversation[]) {
    for (const conversation of conversations) {
      this.#selected.set(conversation.pathname, conversation)
    }
    this.#notify()
  }

  // Keeps only the given conversations selected, such as the ones a bulk action failed on.
  replace(conversations: SelectedConversation[]) {
    this.#selected = new Map(conversations.map((conversation) => [conversation.pathname, conversation]))
    this.#notify()
  }

  subscribe(listener: Listener) {
    this.#listeners.add(listener)
  }

  #notify() {
    for (const listener of this.#listeners) {
      listener()
    }
  }
}

export const selectionState = new SelectionState()
