<script setup>
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

defineProps({
  user: { type: Object, required: true }
})

const router = useRouter()
</script>

<template>
  <div class="user-card" @click="router.push(`/users/${user.id}`)">
    <img
      v-if="user.avatar"
      :src="user.avatar"
      class="user-card__avatar"
      alt=""
    />
    <span v-else class="user-card__avatar-placeholder">
      {{ (user.nickname || 'U')[0].toUpperCase() }}
    </span>
    <div class="user-card__info">
      <h4 class="user-card__name">
        {{ user.nickname }}
        <span v-if="user.gender !== null && user.gender !== undefined" class="user-card__pronouns">{{ user.gender === 0 ? t('user.heHim') : t('user.sheHer') }}</span>
      </h4>
      <span v-if="user.title" class="user-card__title">{{ user.title }}</span>
    </div>
  </div>
</template>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}
.user-card:hover {
  border-color: #f9a8d4;
  box-shadow: var(--shadow-md);
  transform: translateY(-5px);
}

.user-card__avatar {
  width: 56px;
  height: 56px;
  border-radius: var(--rounded-full);
  object-fit: cover;
  border: 2px solid var(--color-border);
  flex-shrink: 0;
}

.user-card__avatar-placeholder {
  width: 56px;
  height: 56px;
  border-radius: var(--rounded-full);
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  font-weight: var(--weight-medium);
  flex-shrink: 0;
}

.user-card__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-card__name {
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  color: var(--color-text-heading);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.user-card__pronouns {
  font-size: var(--text-xs);
  font-weight: var(--weight-normal);
  color: var(--color-text-secondary);
}

.user-card__title {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
