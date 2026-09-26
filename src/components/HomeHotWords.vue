<script setup>
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
</script>

<template>
  <!--
    TODO(hot-words): replace the ghost chips with API-driven trending keywords
    (top terms extracted from moments/articles). Render as chips linking to a
    filtered list or search. Data source/API to be defined later — swap the
    ghost row for a v-for over a `hotWords` ref and this slot is done.
  -->
  <div class="container-wide">
    <div class="hot-words__header">
      <h2 class="hot-words__title"># {{ t('home.hotWords') }}<span class="cursor">_</span></h2>
    </div>
    <div class="hot-words__row" aria-hidden="true">
      <span v-for="i in 5" :key="i" class="hot-words__chip"></span>
    </div>
  </div>
</template>

<style scoped>
.hot-words__header {
  margin-bottom: var(--spacing-xl);
}
.hot-words__title {
  font-size: var(--text-2xl);
  font-weight: var(--weight-semibold);
  margin: 0;
}
.hot-words__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}
.hot-words__chip {
  display: inline-block;
  height: 28px;
  border-radius: var(--rounded-full);
  background: var(--color-bg-alt);
}
/* varied widths so the reserved row reads as chips, not bars */
.hot-words__chip:nth-child(1) { width: 72px; }
.hot-words__chip:nth-child(2) { width: 96px; }
.hot-words__chip:nth-child(3) { width: 60px; }
.hot-words__chip:nth-child(4) { width: 110px; }
.hot-words__chip:nth-child(5) { width: 84px; }
</style>
