<script setup>
defineProps({
  suggestions: { type: Array, default: () => [] },
  pos: { type: Object, default: () => ({ top: 0, left: 0 }) }
})
const emit = defineEmits(['select'])
</script>

<template>
  <Teleport to="body">
    <div
      v-if="suggestions.length"
      class="mention-dropdown"
      :style="{ top: pos.top + 'px', left: pos.left + 'px' }"
    >
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
  </Teleport>
</template>

<style scoped>
.mention-dropdown {
  position: fixed;
  z-index: 200;
  transform: translateY(-100%);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  box-shadow: 0 8px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06);
  min-width: 200px;
  max-height: 196px;
  overflow-y: auto;
  padding: var(--spacing-xs);
}
.mention-dropdown::-webkit-scrollbar { width: 4px; }
.mention-dropdown::-webkit-scrollbar-thumb {
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
