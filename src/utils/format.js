export function formatDate(dateStr) {
  if (!dateStr) return ''
  return dateStr.replace('T', ' ').replace(/\.\d+/, '')
}

export function formatActiveTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
  if (isToday) return d.toTimeString().slice(0, 8)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
