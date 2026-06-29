<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  suggestions: { type: Array, default: () => [] },
  pos: { type: Object, default: () => ({ top: 0, left: 0 }) }
})
const emit = defineEmits(['select'])

const scrollEl = ref(null)
const hasScrollbar = ref(false)

watch(() => props.suggestions, () => {
  nextTick(() => {
    if (scrollEl.value) {
      hasScrollbar.value = scrollEl.value.scrollHeight > scrollEl.value.clientHeight
    }
  })
}, { immediate: true })
</script>

<template>
  <div
    v-if="suggestions.length"
    class="mention-dropdown"
    :style="{ top: pos.top + 'px', left: pos.left + 'px' }"
  >
    <div ref="scrollEl" class="mention-dropdown__scroll" :class="{ 'mention-dropdown__scroll--bar': hasScrollbar }">
      <div
        v-for="user in suggestions"
        :key="user.id"
        class="mention-dropdown__item"
        @mousedown.prevent="emit('select', user.username)"
      >
        <img v-if="user.avatar" :src="user.avatar" class="mention-dropdown__avatar" />
        <span v-else class="mention-dropdown__avatar-placeholder">{{ (user.nickname || '?')[0] }}</span>
        <span class="mention-dropdown__name">{{ user.nickname }}</span>
        <span class="mention-dropdown__username">@{{ user.username }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mention-dropdown {
  position: absolute;
  z-index: 200;
  transform: translateY(-100%);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  box-shadow: inset 0 0 0 1px var(--color-border);
  padding: 4px;
  min-width: 200px;
}
.mention-dropdown__scroll {
  max-height: 180px;
  overflow-y: auto;
}
.mention-dropdown__scroll--bar {
  padding-right: 4px;
}
.mention-dropdown__scroll::-webkit-scrollbar { width: 4px; }
.mention-dropdown__scroll::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}
.mention-dropdown__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--rounded-sm);
  cursor: pointer;
  transition: background .12s ease;
}
.mention-dropdown__item:hover {
  background: var(--color-primary-light);
}
.mention-dropdown__avatar {
  width: 24px;
  height: 24px;
  border-radius: var(--rounded-full);
  object-fit: cover;
  flex-shrink: 0;
}
.mention-dropdown__avatar-placeholder {
  width: 24px;
  height: 24px;
  border-radius: var(--rounded-full);
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: var(--weight-semibold);
  flex-shrink: 0;
}
.mention-dropdown__name {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-heading);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mention-dropdown__username {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary, #999);
  flex-shrink: 0;
}
</style>
