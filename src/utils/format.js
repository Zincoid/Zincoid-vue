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

export function relativeDate(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return null
  const min = Math.floor(diff / 60000)
  if (min < 60) return { value: min, unit: 'min' }
  const hour = Math.floor(min / 60)
  if (hour < 24) return { value: hour, unit: 'hour' }
  const day = Math.floor(hour / 24)
  if (day < 30) return { value: day, unit: 'day' }
  const month = Math.floor(day / 30)
  if (month < 12) return { value: month, unit: 'month' }
  return { value: Math.floor(month / 12), unit: 'year' }
}
