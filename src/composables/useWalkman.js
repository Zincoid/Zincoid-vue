import { ref } from 'vue'

const external = ref(null)

export function useWalkman() {
  function playExternal(track) {
    external.value = track
  }
  return { external, playExternal }
}
