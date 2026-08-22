<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useConfirm } from '@/composables/useConfirm'
import { useI18n } from '@/composables/useI18n'
import SvgIcon from '@/components/SvgIcon.vue'

const { t } = useI18n()
const { visible, message, onConfirm, onCancel } = useConfirm()

const running = ref(false)
let timer = null

function startTimer() {
  running.value = false
  requestAnimationFrame(() => { running.value = true })
  timer = setTimeout(() => { onCancel() }, 10000)
}

function stopTimer() {
  running.value = false
  if (timer) { clearTimeout(timer); timer = null }
}

watch(visible, (v) => { if (v) startTimer(); else stopTimer() })
onBeforeUnmount(() => stopTimer())
</script>

<template>
  <Transition name="confirm-fade">
    <div v-if="visible" class="confirm-overlay" @click.self="onCancel">
      <div class="confirm-dialog" :class="{ 'confirm-dialog--run': running }">
        <div class="confirm-dialog__bar" :class="{ 'confirm-dialog__bar--run': running }"></div>
        <p class="confirm-dialog__msg"><span class="confirm-dialog__prompt">&gt;</span>{{ message }}</p>
        <div class="confirm-dialog__actions">
          <span class="confirm-dialog__cursor">▌</span>
          <span class="confirm-dialog__spacer"></span>
          <button class="confirm-dialog__btn confirm-dialog__btn--cancel" @click="onCancel"><SvgIcon name="close" :size="14" />{{ t('common.cancel') }}</button>
          <button class="confirm-dialog__btn confirm-dialog__btn--confirm" @click="onConfirm"><SvgIcon name="check" :size="14" />{{ t('common.confirm') }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.confirm-overlay {
  position: fixed; inset: 0; z-index: 900;
  display: flex; align-items: flex-end; justify-content: flex-end;
  padding: var(--spacing-xl);
  background: rgba(0,0,0,0.12); backdrop-filter: blur(2px);
}
.confirm-dialog {
  position: relative;
  background: var(--color-surface);
  border: 2px solid rgba(128,128,128,0.35);
  border-radius: var(--rounded-lg);
  min-width: 280px; max-width: 440px;
  overflow: hidden;
  opacity: 0;
  transform: translateX(80px);
}
.confirm-dialog--run {
  animation: confirm-slide-in 0.3s ease forwards;
}
@keyframes confirm-slide-in {
  to { opacity: 1; transform: translateX(0); }
}
.confirm-dialog__bar {
  position: absolute; top: 0; left: 0; height: 2px; width: 100%;
  background: #16a34a;
  transform-origin: left center;
  transform: scaleX(1);
}
.confirm-dialog__bar--run {
  animation: confirm-shrink 10s linear forwards;
}
@keyframes confirm-shrink {
  0%   { transform: scaleX(1); background: #16a34a; }
  33%  { background: #2952cc; }
  66%  { background: #d03238; }
  100% { transform: scaleX(0); background: #d03238; }
}
.confirm-dialog__msg {
  font-size: var(--text-sm); color: var(--color-text);
  padding: var(--spacing-xl) var(--spacing-2xl) var(--spacing-sm) var(--spacing-2xl);
  line-height: var(--leading-relaxed);
}
.confirm-dialog__prompt {
  color: #58a6ff;
  margin-right: 0.5em;
}
.confirm-dialog__actions {
  display: flex; align-items: center; justify-content: flex-end; gap: var(--spacing-sm);
  padding: 0 var(--spacing-2xl) var(--spacing-xl) var(--spacing-2xl);
}
.confirm-dialog__cursor {
  color: #58a6ff;
  animation: blink 0.3s step-end infinite;
}
.confirm-dialog__spacer {
  flex: 1;
}
@keyframes blink {
  50% { opacity: 0; }
}
.confirm-dialog__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--rounded-full);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
  line-height: 1.5;
}
.confirm-dialog__btn--cancel {
  background: transparent;
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}
.confirm-dialog__btn--cancel:hover {
  color: var(--color-text-heading);
  border-color: var(--color-text-secondary);
  background: var(--color-bg-alt);
}
.confirm-dialog__btn--confirm {
  background: #111827;
  color: white;
  border-color: #111827;
}
.confirm-dialog__btn--confirm:hover {
  background: #1f2937;
  border-color: #1f2937;
}
[data-theme="dark"] .confirm-dialog__btn--confirm {
  border-color: #374151;
}
[data-theme="dark"] .confirm-dialog__btn--confirm:hover {
  border-color: #4b5563;
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.25s ease;
}
.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}
</style>
