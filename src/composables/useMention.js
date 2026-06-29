import { ref, reactive } from 'vue'
import { userAPI } from '@/api'

export function useMention() {
  const suggestions = ref([])
  const mentionActive = ref(false)
  const mentionPos = ref({ top: 0, left: 0 })
  let searchTimer = null

  function onInput(textarea) {
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
    mentionActive.value = false
    suggestions.value = []
  }

  function getCaretPixelPos(textarea, charIdx) {
    const container = textarea.offsetParent
    const style = window.getComputedStyle(textarea)
    const mirror = document.createElement('div')
    mirror.style.position = 'absolute'
    mirror.style.top = textarea.offsetTop + 'px'
    mirror.style.left = textarea.offsetLeft + 'px'
    mirror.style.visibility = 'hidden'
    mirror.style.whiteSpace = 'pre-wrap'
    mirror.style.wordWrap = 'break-word'
    mirror.style.overflowWrap = 'break-word'
    mirror.style.width = textarea.clientWidth + 'px'
    mirror.style.height = textarea.clientHeight + 'px'
    mirror.style.font = style.font
    mirror.style.fontSize = style.fontSize
    mirror.style.fontFamily = style.fontFamily
    mirror.style.lineHeight = style.lineHeight
    mirror.style.padding = style.padding
    mirror.style.border = style.border
    mirror.style.boxSizing = style.boxSizing
    mirror.style.letterSpacing = style.letterSpacing
    mirror.style.overflowY = 'auto'
    mirror.textContent = textarea.value.substring(0, charIdx) + '​'
    container.appendChild(mirror)
    mirror.scrollTop = textarea.scrollTop

    const span = document.createElement('span')
    span.textContent = '​'
    mirror.appendChild(span)

    const result = {
      top: textarea.offsetTop + span.offsetTop - 8,
      left: textarea.offsetLeft + span.offsetLeft + 8
    }
    container.removeChild(mirror)
    return result
  }

  return reactive({ suggestions, mentionActive, mentionPos, onInput, insert, close })
}
