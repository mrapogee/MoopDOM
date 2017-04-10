
const placeholders: Comment[] = new Array(200)
placeholders.length = 0

export const getPlaceholderNode = (): Node => {
  if (placeholders.length === 0) {
    return document.createComment('')
  } else {
    return placeholders.pop() as Comment
  }
}

export const returnPlaceholderNode = (node: Node) => {
  placeholders.push(node as Comment)
}
