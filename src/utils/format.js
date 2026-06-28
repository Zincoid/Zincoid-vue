export function formatDate(dateStr) {
  if (!dateStr) return ''
  return dateStr.replace('T', ' ').replace(/\.\d+/, '')
}
