<template>
  <div class="fab-container">
    <slot />
  </div>
</template>

<style scoped>
.fab-container {
  position: fixed;
  right: var(--spacing-4xl);
  bottom: 75px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 50;
}

@media (max-width: 768px) {
  .fab-container {
    bottom: 80px;
  }
}
</style>
