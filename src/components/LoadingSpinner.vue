<script setup>
defineProps({
  message: { type: String, default: '' }
})
</script>

<template>
  <div class="spinner-wrap">
    <div class="spinner">
      <div class="spinner__dot spinner__dot--1"></div>
      <div class="spinner__dot spinner__dot--2"></div>
      <div class="spinner__dot spinner__dot--3"></div>
    </div>
    <p v-if="message" class="spinner__msg">{{ message }}</p>
  </div>
</template>

<style scoped>
.spinner-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl) var(--spacing-lg);
}
.spinner {
  display: flex;
  align-items: center;
  gap: 6px;
}
.spinner__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--rounded-full);
  background: var(--color-primary);
  animation: dotPulse 1.4s ease-in-out infinite;
}
.spinner__dot--1 { animation-delay: 0s; }
.spinner__dot--2 { animation-delay: 0.2s; }
.spinner__dot--3 { animation-delay: 0.4s; }
@keyframes dotPulse {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}
.spinner__msg {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
</style>
