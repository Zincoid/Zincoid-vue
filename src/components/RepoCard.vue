<script setup>
import { useI18n } from '@/composables/useI18n'
import { formatDate } from '@/utils/format'

const { t } = useI18n()

defineProps({
  repo: { type: Object, required: true },
  showUser: { type: Boolean, default: true }
})

const typeLabels = { 0: 'repo.code', 1: 'repo.media', 2: 'repo.file' }
const typeColors = { 0: '#16a34a', 1: '#db2777', 2: '#2563eb' }
</script>

<template>
  <div class="repo-card">
    <div class="repo-card__cover">
      <img v-if="repo.coverImage" :src="repo.coverImage" alt="" />
      <div v-else class="repo-card__cover-placeholder">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      </div>
      <div class="repo-card__badges">
        <span v-if="repo.visibility === 1" class="repo-card__visibility-badge">{{ t('visibility.private') }}</span>
        <span v-if="repo.visibility === 2" class="repo-card__visibility-badge repo-card__visibility-badge--restricted">{{ t('visibility.restricted') }}</span>
        <span class="repo-card__type-badge" :style="{ color: typeColors[repo.type] }">{{ t(typeLabels[repo.type]) }}</span>
      </div>
    </div>
    <div class="repo-card__body">
      <div v-if="showUser && repo.userNickname" class="repo-card__user">
        <div class="repo-card__user-left">
          <img v-if="repo.userAvatar" :src="repo.userAvatar" class="repo-card__avatar" />
          <span v-else class="repo-card__avatar-placeholder">{{ repo.userNickname[0] }}</span>
          <span class="repo-card__nickname">{{ repo.userNickname }}</span>
        </div>
        <span class="repo-card__date">{{ formatDate(repo.createdAt) }}</span>
      </div>
      <span v-else class="repo-card__date">{{ formatDate(repo.createdAt) }}</span>
      <h3 class="repo-card__name">{{ repo.name }}</h3>
      <p class="repo-card__desc">{{ repo.description || t('repo.noDesc') }}</p>
      <div class="repo-card__tags">
        <template v-if="repo.tags?.length">
          <span v-for="tag in repo.tags" :key="tag" class="repo-card__tag">{{ tag }}</span>
        </template>
        <span v-else class="repo-card__tag--empty">{{ t('repo.noTags') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.repo-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}
.repo-card:hover {
  border-color: #f9a8d4;
  transform: scale(1.02);
  box-shadow: 0 0 0 0.5px #f9a8d4;
}

.repo-card__cover {
  position: relative;
  height: 160px;
  background: var(--color-bg-alt);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
}
.repo-card__cover img { width: 100%; height: 100%; object-fit: cover; }
.repo-card__cover-placeholder { display: flex; align-items: center; justify-content: center; }

.repo-card__badges { position: absolute; top: var(--spacing-md); right: var(--spacing-md); display: flex; gap: var(--spacing-sm); }
.repo-card__type-badge { padding: 2px var(--spacing-sm); font-size: var(--text-xs); font-weight: var(--weight-medium); background: rgba(255,255,255,0.85); border-radius: var(--rounded-full); }
.repo-card__visibility-badge { padding: 2px var(--spacing-sm); font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--color-text-secondary); background: rgba(255,255,255,0.85); border-radius: var(--rounded-full); }

.repo-card__body { padding: var(--spacing-lg); display: flex; flex-direction: column; flex: 1; }

.repo-card__user { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-sm); }
.repo-card__user-left { display: flex; align-items: center; gap: var(--spacing-xs); }
.repo-card__avatar { width: 20px; height: 20px; border-radius: var(--rounded-full); object-fit: cover; }
.repo-card__avatar-placeholder { width: 20px; height: 20px; border-radius: var(--rounded-full); background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; }
.repo-card__nickname { font-size: var(--text-xs); color: var(--color-text-secondary); }
.repo-card__date { font-size: var(--text-xs); color: var(--color-text-tertiary); font-family: var(--font-mono); display: block; margin-bottom: var(--spacing-sm); }

.repo-card__name { font-size: var(--text-base); font-weight: var(--weight-semibold); line-height: 1.5; margin-bottom: var(--spacing-sm); overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.repo-card__desc { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; margin-bottom: var(--spacing-sm); }
.repo-card__tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: auto; padding-top: var(--spacing-sm); }
.repo-card__tag { padding: 1px var(--spacing-sm); font-size: var(--text-xs); color: var(--color-text-secondary); background: var(--color-bg-alt); border-radius: var(--rounded-full); }
.repo-card__tag--empty { font-size: var(--text-xs); color: var(--color-text-tertiary); }
</style>
