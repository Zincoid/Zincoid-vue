import { ref, reactive } from 'vue'
import { userAPI } from '@/api'

export function useMention() {
  const suggestions = ref([])
  const mentionActive = ref(false)
  const mentionPos = ref({ top: 0, left: 0 })
  let searchTimer = null
  let searchSeq = 0

  function onInput(textarea) {
    const seq = ++searchSeq
    const value = textarea.value
    const cursor = textarea.selectionStart
    const beforeCursor = value.substring(0, cursor)

    const atIdx = beforeCursor.lastIndexOf('@')
    if (atIdx === -1) {
      close()
      return
    }
    const partial = beforeCursor.substring(atIdx + 1)
    if (partial.includes(' ') || partial.length > 50) {
      close()
      return
    }

    const pos = getCaretPixelPos(textarea, atIdx)
    mentionPos.value = { top: pos.top, left: pos.left }

    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      userAPI.getList(1, 10, null, partial || null).then(res => {
        if (seq !== searchSeq) return
        const records = res.data?.data?.records || []
        if (records.length > 0) {
          suggestions.value = records
          mentionActive.value = true
        } else {
          close()
        }
      }).catch(() => close())
    }, 150)
  }

  function insert(textarea, username) {
    if (!username) return
    const value = textarea.value
    const cursor = textarea.selectionStart
    const beforeCursor = value.substring(0, cursor)
    const atIdx = beforeCursor.lastIndexOf('@')
    const before = value.substring(0, atIdx)
    const after = value.substring(cursor)
    const newValue = before + '@' + username + ' ' + after
    textarea.value = newValue
    const newCursor = atIdx + username.length + 2
    textarea.setSelectionRange(newCursor, newCursor)
    textarea.focus()
    close()
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  }

  function close() {
    searchSeq++
    clearTimeout(searchTimer)
    mentionActive.value = false
    suggestions.value = []
  }

  // style.top/left on a position:fixed element and getBoundingClientRect() can
  // live in different scales — CSS zoom (html { zoom: 0.75 } on the mobile
  // breakpoint) multiplies one and not the other, which floated the dropdown
  // far above the caret on phones. A throwaway fixed probe measures the map
  // between the two spaces so placement is right under either convention.
  function fixedSpace() {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;top:0;left:0;width:1000px;height:1000px;visibility:hidden;pointer-events:none'
    document.body.appendChild(probe)
    const r = probe.getBoundingClientRect()
    document.body.removeChild(probe)
    return { ox: r.left, oy: r.top, sx: r.width / 1000 || 1, sy: r.height / 1000 || 1 }
  }

  function getCaretPixelPos(textarea, charIdx) {
    const map = fixedSpace()
    const style = window.getComputedStyle(textarea)
    const taRect = textarea.getBoundingClientRect()

    // overlay a styled mirror on the textarea and measure the caret inside it
    const mirror = document.createElement('div')
    mirror.style.position = 'fixed'
    mirror.style.top = (taRect.top - map.oy) / map.sy + 'px'
    mirror.style.left = (taRect.left - map.ox) / map.sx + 'px'
    mirror.style.visibility = 'hidden'
    mirror.style.whiteSpace = 'pre-wrap'
    mirror.style.wordWrap = 'break-word'
    mirror.style.overflowWrap = 'break-word'
    mirror.style.boxSizing = 'border-box'
    mirror.style.width = taRect.width / map.sx + 'px'
    mirror.style.height = taRect.height / map.sy + 'px'
    mirror.style.font = style.font
    mirror.style.fontSize = style.fontSize
    mirror.style.fontFamily = style.fontFamily
    mirror.style.lineHeight = style.lineHeight
    mirror.style.padding = style.padding
    mirror.style.border = style.border
    mirror.style.letterSpacing = style.letterSpacing
    mirror.style.overflowY = 'auto'
    mirror.textContent = textarea.value.substring(0, charIdx) + '​'
    document.body.appendChild(mirror)
    mirror.scrollTop = textarea.scrollTop

    const span = document.createElement('span')
    span.textContent = '​'
    mirror.appendChild(span)

    const caret = span.getBoundingClientRect()
    document.body.removeChild(mirror)
    return {
      top: (caret.top - 8 - map.oy) / map.sy,
      left: (caret.left + 8 - map.ox) / map.sx
    }
  }

  return reactive({ suggestions, mentionActive, mentionPos, onInput, insert, close })
}

/**
 * Insert plain text at the caret of a textarea, keeping the caret after it.
 * Same write-then-dispatch pattern as useMention().insert so the controlled
 * `:value` binding picks the change up. Used by the chat / comment tool
 * buttons (e.g. typing an @ to open the mention dropdown).
 */
export function insertAtCursor(textarea, text) {
  if (!textarea) return
  const start = textarea.selectionStart ?? textarea.value.length
  const end = textarea.selectionEnd ?? start
  textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end)
  const pos = start + text.length
  textarea.setSelectionRange(pos, pos)
  textarea.focus()
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}
