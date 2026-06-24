<script setup>
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

const props = defineProps({
  page: { type: Number, default: 1 },
  pages: { type: Number, default: 1 },
  total: { type: Number, default: 0 }
})

const emit = defineEmits(['change'])

function go(page) {
  if (page >= 1 && page <= props.pages) {
    emit('change', page)
  }
}
</script>

<template>
  <div class="pagination" v-if="pages > 1">
    <button
      class="pagination__btn"
      :disabled="page <= 1"
      @click="go(page - 1)"
    >
      {{ t('common.prev') }}
    </button>
    <template v-for="p in pages" :key="p">
      <button
        v-if="p === 1 || p === pages || Math.abs(p - page) <= 2"
        class="pagination__btn"
        :class="{ 'pagination__btn--active': p === page }"
        @click="go(p)"
      >
        {{ p }}
      </button>
      <span v-else-if="Math.abs(p - page) === 3" class="pagination__dots">…</span>
    </template>
    <button
      class="pagination__btn"
      :disabled="page >= pages"
      @click="go(page + 1)"
    >
      {{ t('common.next') }}
    </button>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-2xl);
}

.pagination__btn {
  min-width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text);
  background: var(--color-surface);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.pagination__btn:hover:not(:disabled):not(.pagination__btn--active) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
}
.pagination__btn--active {
  background: #111827;
  border-color: #111827;
  color: white;
  box-shadow: var(--shadow-sm);
}
.pagination__btn:active:not(:disabled) {
  transform: scale(0.95);
}
.pagination__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination__dots {
  padding: 0 var(--spacing-xs);
  color: var(--color-text-secondary);
}
</style>
