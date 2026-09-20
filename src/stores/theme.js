import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const saved = localStorage.getItem('theme')
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = ref(saved ? saved : (systemDark ? 'dark' : 'light'))
  document.documentElement.setAttribute('data-theme', theme.value)

  watch(theme, (val) => {
    localStorage.setItem('theme', val)
    document.documentElement.setAttribute('data-theme', val)
  })

  function applyTheme(val) {
    theme.value = val
  }

  function toggleTheme(event) {
    const next = theme.value === 'dark' ? 'light' : 'dark'
    const doc = document
    if (!event || typeof doc.startViewTransition !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      applyTheme(next)
      return
    }
    const x = event.clientX ?? innerWidth / 2
    const y = event.clientY ?? innerHeight / 2
    const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const transition = doc.startViewTransition(() => {
      applyTheme(next)
    })
    transition.ready.then(() => {
      doc.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
        { duration: 500, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
      )
    })
  }

  return { theme, toggleTheme }
})
