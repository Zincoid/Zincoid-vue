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
  // Walkman unmounts on logout and its audio element dies with it — drop the
  // shared refs so consumers (DigitalFlow's spectrum) don't keep reading a
  // detached element or a playing flag that can never turn off again
  function unregisterAudio() {
    audioEl.value = null
    isPlaying.value = false
  }
  return { external, playExternal, audioEl, isPlaying, registerAudio, unregisterAudio }
}
