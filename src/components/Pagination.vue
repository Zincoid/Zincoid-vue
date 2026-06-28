<script setup>
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

const props = defineProps({
  page: { type: Number, default: 1 },
  pages: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  size: { type: Number, default: 10 }
})

const emit = defineEmits(['change'])

function go(page) {
  if (page >= 1 && page <= props.pages) {
    emit('change', page)
  }
}
</script>

<template>
  <div class="pagination" v-if="total > 0">
    <div class="pagination__info">
      <span class="pagination__total">{{ t('common.total', { total }) }}</span>
      <span class="pagination__sep">/</span>
      <span class="pagination__size">{{ t('common.perPage', { size }) }}</span>
    </div>
    <div class="pagination__controls" v-if="pages > 1">
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
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-2xl);
}

.pagination__info {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

.pagination__sep {
  color: var(--color-border);
}

.pagination__controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.pagination__btn {
  min-width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--rounded-sm);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  background: transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.pagination__btn:hover:not(:disabled) {
  color: var(--color-text-heading);
}
.pagination__btn--active {
  color: var(--color-primary);
  font-weight: var(--weight-semibold);
}
.pagination__btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pagination__dots {
  padding: 0 var(--spacing-xs);
  color: var(--color-text-secondary);
}
</style>
