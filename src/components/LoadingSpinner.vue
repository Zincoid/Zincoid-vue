<script setup>
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'

const props = defineProps({
  message: { type: String, default: '' }
})

const { t } = useI18n()

const messages = computed(() => t('common.loadingMessages') || [])

function pick() {
  return messages.value[Math.floor(Math.random() * messages.value.length)] || ''
}

const text = computed(() => {
  if (props.message) return props.message.replace(/\.+$/, '')
  return pick()
})
</script>

<template>
  <div class="loader">
    <span class="loader__prompt">&gt;</span>
    <span class="loader__text">{{ text }}</span>
    <span class="loader__dot">.</span>
    <span class="loader__dot">.</span>
    <span class="loader__dot">.</span>
    <span class="loader__cursor">▌</span>
  </div>
</template>

<style scoped>
.loader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: var(--spacing-3xl) var(--spacing-lg);
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
