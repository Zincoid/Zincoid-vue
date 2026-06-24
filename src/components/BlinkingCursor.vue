<template>
  <span class="blinking-cursor">_</span>
</template>

<style scoped>
.blinking-cursor {
  display: inline-block;
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}
</style>
