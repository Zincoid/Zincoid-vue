<script setup>
import { useConfirm } from '@/composables/useConfirm'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const { visible, message, onConfirm, onCancel } = useConfirm()
</script>

<template>
  <Transition name="confirm">
    <div v-if="visible" class="confirm-overlay" @click.self="onCancel">
      <div class="confirm-dialog">
        <p class="confirm-dialog__msg">{{ message }}</p>
        <div class="confirm-dialog__actions">
          <button class="btn btn--ghost" @click="onCancel">{{ t('common.cancel') }}</button>
          <button class="btn btn--primary" @click="onConfirm">{{ t('common.confirm') }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: var(--spacing-xl);
  pointer-events: none;
}
.confirm-dialog {
  pointer-events: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  padding: var(--spacing-lg);
  min-width: 300px;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
}
.confirm-dialog__msg {
  font-size: var(--text-sm);
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
  line-height: var(--leading-normal);
}
.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}

.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
