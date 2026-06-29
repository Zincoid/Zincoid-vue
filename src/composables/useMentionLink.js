export function parseMentions(text) {
  if (!text) return []
  const parts = []
  let last = 0
  const re = /@(\w{3,50})/g
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) })
    parts.push({ text: m[0], username: m[1], link: true })
    last = re.lastIndex
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}
