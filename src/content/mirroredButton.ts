/**
 * Builds a button that mirrors one of claude.ai's design-system (`data-cds`) buttons, so it
 * follows claude.ai's styling and themes without copying any CSS. Those buttons carry their
 * variant in `data-cds*` attributes and render two layers: a background span holding the fill
 * and press animation, and a content span holding the icon and label.
 */
export function createMirroredButton(source: HTMLButtonElement) {
  const [backgroundLayer, contentLayer] = source.children

  const button = document.createElement('button')
  button.type = 'button'
  button.className = source.className
  for (const attribute of source.attributes) {
    if (attribute.name.startsWith('data-cds') || attribute.name === 'data-size') {
      button.setAttribute(attribute.name, attribute.value)
    }
  }

  const background = document.createElement('span')
  background.className = backgroundLayer?.className ?? ''

  const content = document.createElement('span')
  content.className = contentLayer?.className ?? ''

  button.append(background, content)
  return { button, content } as const
}
