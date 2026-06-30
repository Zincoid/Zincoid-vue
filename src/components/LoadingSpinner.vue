<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConfig } from '@/composables/useConfig'

const props = defineProps({
  visible: { type: Boolean, default: true }
})

const emit = defineEmits(['done'])

const { t } = useI18n()
const { load: loadConfig, get: getConfig } = useConfig()
loadConfig()

const messages = computed(() => t('common.loadingMessages') || [])
const show = ref(props.visible)
let timer = null

const holdMs = computed(() => parseInt(getConfig('loading_spinner_hold', '250')))
const fadeMs = computed(() => parseInt(getConfig('loading_spinner_fade', '125')))

watch(() => props.visible, (v) => {
  clearTimeout(timer)
  if (v) {
    show.value = true
  } else {
    timer = setTimeout(() => {
      show.value = false
    }, holdMs.value)
  }
})

function onAfterLeave() {
  emit('done')
}

onBeforeUnmount(() => clearTimeout(timer))

function pick() {
  return messages.value[Math.floor(Math.random() * messages.value.length)] || ''
}
</script>

<template>
  <Transition name="loader-fade" @after-leave="onAfterLeave">
    <div v-if="show" class="loader" :style="{ '--fade-ms': fadeMs + 'ms' }">
      <span class="loader__prompt">&gt;</span>
      <span class="loader__text">{{ pick() }}</span>
      <span class="loader__dot">.</span>
      <span class="loader__dot">.</span>
      <span class="loader__dot">.</span>
      <span class="loader__cursor">▌</span>
    </div>
  </Transition>
</template>

<style scoped>
.loader-fade-leave-active {
  transition: opacity var(--fade-ms, 125ms) ease, max-height var(--fade-ms, 125ms) ease, margin var(--fade-ms, 125ms) ease;
  overflow: hidden;
}
.loader-fade-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  margin-bottom: 0;
}

.loader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: var(--spacing-sm) var(--spacing-lg);
  margin: var(--spacing-sm) 0;
  max-height: 48px;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
.loader__prompt {
  color: #58a6ff;
  margin-right: 0.5em;
}
.loader__text {
  color: #8b949e;
}
.loader__dot {
  animation: dotFade 0.3s steps(1) infinite;
}
.loader__dot:nth-child(2) { animation-delay: 0.05s; }
.loader__dot:nth-child(3) { animation-delay: 0.1s; }
@keyframes dotFade {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}
.loader__cursor {
  margin-left: 0.4em;
  color: #58a6ff;
  animation: blink 0.3s step-end infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}
</style>
