<script setup>
import { useI18n } from '@/composables/useI18n'
import SvgIcon from '@/components/SvgIcon.vue'

defineProps({
  visible: { type: Boolean, default: false }
})

const { t } = useI18n()
</script>

<template>
  <!-- pointer-events: none so the drop still reaches the window handlers
       registered by useFileDrop -->
  <div v-if="visible" class="file-drop-overlay" aria-hidden="true">
    <div class="file-drop-overlay__hint">
      <SvgIcon name="attach" :size="18" />
      {{ t('common.dropHint') }}
    </div>
  </div>
</template>

<style scoped>
.file-drop-overlay {
  /* below the navbar, above page content; pointer-events: none so the drop
     lands on the window handlers underneath */
  position: fixed;
  top: var(--navbar-height);
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-primary) 6%, transparent);
  border: 2px dashed color-mix(in srgb, var(--color-primary) 45%, transparent);
}
.file-drop-overlay__hint {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--rounded-full);
  /* glass, same material as the chat dock */
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
  backdrop-filter: blur(12px);
  color: var(--color-text-heading);
  font-size: var(--text-sm);
}
</style>
