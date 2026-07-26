import { ref } from 'vue'

const visible = ref(false)
const message = ref('')
let resolvePromise = null

function confirm(msg) {
  return new Promise((resolve) => {
    message.value = msg
    visible.value = true
    resolvePromise = resolve
  })
}

function onConfirm() {
  visible.value = false
  resolvePromise?.(true)
  resolvePromise = null
}

function onCancel() {
  visible.value = false
  resolvePromise?.(false)
  resolvePromise = null
}

export function useConfirm() {
  return { confirm, visible, message, onConfirm, onCancel }
}
