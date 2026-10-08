import { ref, onUnmounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'

// the same media set the attachment pickers accept
const MEDIA_RE = /^(image|video|audio)\//

/**
 * Window-level drag & drop for attaching media files (chat, moment create/edit).
 *
 * Listeners live on window so drops on the page margins (outside the .container)
 * work too; a depth counter absorbs enter/leave churn over children. Non-media
 * files are filtered out and a toast is shown when nothing droppable remains.
 *
 * @param {{ enabled: () => boolean, onFiles: (files: File[]) => void }} opts
 *   enabled — gate: overlay and drop handling are ignored while it returns false
 *   onFiles — receives the dropped media files (never empty)
 * @returns {{ dragOver: import('vue').Ref<boolean> }}
 */
export function useFileDrop({ enabled, onFiles }) {
  const { t } = useI18n()
  const { toast } = useToast()

  const dragOver = ref(false)
  let dragDepth = 0

  function onDragEnter(e) {
    if (!enabled()) return
    if (!e.dataTransfer?.types?.includes?.('Files')) return
    dragDepth++
    dragOver.value = true
  }

  function onDragLeave() {
    if (!dragOver.value) return
    dragDepth = Math.max(0, dragDepth - 1)
    if (dragDepth === 0) dragOver.value = false
  }

  function onDragOver(e) {
    // accept file drags even when disabled so the drop can be swallowed below —
    // otherwise the browser navigates to the dropped file
    if (e.dataTransfer?.types?.includes?.('Files')) e.preventDefault()
  }

  function onDrop(e) {
    e.preventDefault()
    dragDepth = 0
    dragOver.value = false
    if (!enabled()) return
    const media = Array.from(e.dataTransfer?.files || []).filter((f) => MEDIA_RE.test(f.type))
    if (!media.length) {
      toast(t('common.dropUnsupported'), 'error')
      return
    }
    onFiles(media)
  }

  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('drop', onDrop)
  onUnmounted(() => {
    window.removeEventListener('dragenter', onDragEnter)
    window.removeEventListener('dragover', onDragOver)
    window.removeEventListener('dragleave', onDragLeave)
    window.removeEventListener('drop', onDrop)
  })

  return { dragOver }
}
