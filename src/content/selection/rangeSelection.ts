type RangeItem = {
  pathname: string
}

/**
 * The items a shift-click selects: everything from the range anchor (the last plain click) to
 * the clicked item, inclusive, in either direction. When the anchor's conversation appears more
 * than once on the page, the occurrence nearest the click wins, so the range stays within the
 * list the user is looking at. Returns undefined when the anchor is not on the page.
 */
export function getShiftClickRange<Item extends RangeItem>(
  items: readonly Item[],
  anchorPathname: string | undefined,
  targetIndex: number,
): Item[] | undefined {
  let anchorIndex = -1
  items.forEach((item, index) => {
    if (item.pathname !== anchorPathname) {
      return
    }

    const isNearer = anchorIndex === -1
      || Math.abs(index - targetIndex) < Math.abs(anchorIndex - targetIndex)
    if (isNearer) {
      anchorIndex = index
    }
  })

  if (anchorIndex === -1 || targetIndex === -1) {
    return undefined
  }

  const start = Math.min(anchorIndex, targetIndex)
  const end = Math.max(anchorIndex, targetIndex)
  return items.slice(start, end + 1)
}
