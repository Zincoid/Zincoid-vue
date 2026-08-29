import { ref } from 'vue'

const external = ref(null)
const audioEl = ref(null)
const isPlaying = ref(false)

export function useWalkman() {
  function playExternal(track) {
    external.value = track
  }
  function registerAudio(el) {
    audioEl.value = el
  }
  return { external, playExternal, audioEl, isPlaying, registerAudio }
}
