import { ref } from 'vue'

const toasts = ref([])
let seq = 0

function toast(msg, type = 'info', duration = 5000) {
  const id = ++seq
  toasts.value.push({ id, msg, type })
  if (duration > 0) setTimeout(() => dismiss(id), duration)
  return id
}

function dismiss(id) {
  const idx = toasts.value.findIndex(t => t.id === id)
  if (idx !== -1) toasts.value.splice(idx, 1)
}

export function useToast() {
  return { toasts, toast, dismiss }
}