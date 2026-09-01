<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

defineProps({
  maxHeight: { type: String, default: '' },
  padding: { type: String, default: 'var(--spacing-xs)' }
})
defineEmits(['scroll'])

const body = ref(null)
let observer = null

function updateScrollState() {
  const el = body.value
  if (!el) return
  const scrolling = el.scrollHeight > el.clientHeight + 1
  el.classList.toggle('scroll-thin--noscroll', !scrolling)
}

onMounted(() => {
  updateScrollState()
  observer = new MutationObserver(updateScrollState)
  observer.observe(body.value, { childList: true, subtree: true })
})
onBeforeUnmount(() => observer?.disconnect())

defineExpose({ body })
</script>

<template>
  <div
    class="scroll-area"
    :style="[
      maxHeight ? { '--sa-max-height': maxHeight } : {},
      padding ? { '--sa-padding': padding } : {}
    ]"
  >
    <div ref="body" class="scroll-area__body scroll-thin" @scroll="$emit('scroll', $event)">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.scroll-area {
  position: relative;
  overflow: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.scroll-area__body {
  flex: 1;
  min-height: 0;
  max-height: var(--sa-max-height, none);
  padding: var(--sa-padding, var(--spacing-xs));
}
</style>
