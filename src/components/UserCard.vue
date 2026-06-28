<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { userAPI } from '@/api'

const { t } = useI18n()
const { getMessage } = useError()
const auth = useAuthStore()

const props = defineProps({
  user: { type: Object, required: true }
})

const emit = defineEmits(['update:user', 'delete:user'])

const router = useRouter()

function goDetail() {
  router.push(`/members/${props.user.id}`)
}

async function toggleStatus() {
  try {
    const next = props.user.status === 1 ? 0 : 1
    await userAPI.updateStatus(props.user.id, next)
    emit('update:user', { ...props.user, status: next })
  } catch (err) {
    alert(getMessage(err, 'common.failed'))
  }
}

async function handleDelete() {
  if (!confirm(t('profile.deleteAccountConfirm'))) return
  try {
    await userAPI.deleteUser(props.user.id)
    emit('delete:user', props.user.id)
  } catch (err) {
    alert(getMessage(err, 'common.failed'))
  }
}
</script>

<template>
  <div class="user-card" @click="goDetail">
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
        <span v-if="user.status === 0" class="user-card__disabled-tag">{{ t('user.disabled') }}</span>
      </h4>
      <span v-if="user.title" class="user-card__title">{{ user.title }}</span>
    </div>
    <div v-if="auth.isAdmin" class="user-card__actions">
      <button class="user-card__btn" @click.stop="toggleStatus" :title="user.status === 1 ? 'Disable' : 'Enable'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line v-if="user.status === 0" x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          <path v-else d="m9 12 2 2 4-4"/>
        </svg>
      </button>
      <button class="user-card__btn user-card__btn--danger" @click.stop="handleDelete" title="Delete user">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
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
  flex: 1;
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

.user-card__disabled-tag {
  font-size: var(--text-xs);
  color: var(--color-danger);
  background: var(--color-danger-bg);
  padding: 1px 6px;
  border-radius: var(--rounded-full);
}

.user-card__title {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-card__actions {
  display: flex;
  gap: var(--spacing-xs);
  flex-shrink: 0;
  margin-left: auto;
}

.user-card__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--rounded-sm);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  z-index: 1;
}
.user-card__btn:hover {
  color: var(--color-text-heading);
  background: var(--color-bg-alt);
}
.user-card__btn--danger:hover {
  color: var(--color-danger);
  background: var(--color-danger-bg);
}
</style>
