<script setup>
import { useToast } from '@/composables/useToast'
import SvgIcon from '@/components/SvgIcon.vue'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="toast-host">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast-item" :class="`toast-item--${t.type}`" @click="dismiss(t.id)">
        <div class="toast-item__bar"></div>
        <p class="toast-item__msg"><span class="toast-item__prompt">&gt;</span>{{ t.msg }}</p>
        <div class="toast-item__actions">
          <span class="toast-item__cursor">▌</span>
          <span class="toast-item__spacer"></span>
          <SvgIcon name="close" :size="12" />
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  left: var(--spacing-xl);
  bottom: var(--spacing-xl);
  z-index: 950;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-sm);
  pointer-events: none;
}
.toast-item {
  position: relative;
  pointer-events: auto;
  background: var(--color-surface);
  border: 2px solid rgba(128, 128, 128, 0.35);
  border-radius: var(--rounded-lg);
  min-width: 280px;
  max-width: 440px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--shadow-md);
}
.toast-item__bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 2px;
  width: 100%;
  background: #58a6ff;
  transform-origin: left center;
  animation: toast-shrink 5s linear forwards;
}
.toast-item--error .toast-item__bar { background: #d03238; }
.toast-item--success .toast-item__bar { background: #16a34a; }
@keyframes toast-shrink {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}
.toast-item__msg {
  font-size: var(--text-sm);
  color: var(--color-text);
  padding: var(--spacing-xl) var(--spacing-2xl) var(--spacing-sm) var(--spacing-2xl);
  line-height: var(--leading-relaxed);
  word-break: break-word;
}
.toast-item__prompt {
  color: #58a6ff;
  margin-right: 0.5em;
}
.toast-item--error .toast-item__prompt { color: #d03238; }
.toast-item--success .toast-item__prompt { color: #16a34a; }
.toast-item__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-2xl) var(--spacing-xl) var(--spacing-2xl);
  color: var(--color-text-tertiary);
}
.toast-item__cursor {
  color: #58a6ff;
  animation: toast-blink 0.3s step-end infinite;
}
.toast-item--error .toast-item__cursor { color: #d03238; }
.toast-item--success .toast-item__cursor { color: #16a34a; }
.toast-item__spacer { flex: 1; }
@keyframes toast-blink {
  50% { opacity: 0; }
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-80px);
}
</style>