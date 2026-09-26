<script setup>
import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/utils/format'
import SvgIcon from '@/components/SvgIcon.vue'

import { computed } from 'vue'

const { t } = useI18n()
const auth = useAuthStore()

const props = defineProps({
  repo: { type: Object, required: true },
  showUser: { type: Boolean, default: true },
  sortUpdated: { type: Boolean, default: false }
})

const noAccess = computed(() => props.repo.visibility === 2 && props.repo.restricted)

const typeLabels = { 0: 'repo.code', 1: 'repo.media', 2: 'repo.file' }
const typeColors = { 0: '#16a34a', 1: '#db2777', 2: '#2563eb' }
</script>

<template>
  <div class="repo-card">
    <div class="repo-card__cover">
      <img v-if="repo.coverThumb && !noAccess" :src="repo.coverThumb" alt="" loading="lazy" />
      <div v-else class="repo-card__cover-placeholder">
        <SvgIcon :name="noAccess ? 'lock' : 'folder'" :size="32" />
      </div>
      <span v-if="repo.isPinned" class="repo-card__pin">{{ t('repo.pinned') }}</span>
      <div class="repo-card__badges">
        <span v-if="repo.visibility === 1" class="repo-card__visibility-badge">{{ t('visibility.private') }}</span>
        <span v-if="repo.visibility === 2" class="repo-card__visibility-badge repo-card__visibility-badge--restricted">{{ repo.restricted ? `${t('visibility.restricted')} · ${t('visibility.unauthorized')}` : `${t('visibility.restricted')} · ${t(auth.isAdmin ? 'visibility.admin' : 'visibility.authorized')}` }}</span>
        <span v-if="repo.contributed" class="repo-card__contributing-badge">{{ t('repo.contributing') }}</span>
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
        <span class="repo-card__date">{{ formatDate(sortUpdated ? repo.updatedAt : repo.createdAt) }}</span>
      </div>
      <span v-else class="repo-card__date">{{ formatDate(sortUpdated ? repo.updatedAt : repo.createdAt) }}</span>
      <h3 class="repo-card__name">{{ repo.name }}</h3>
      <p class="repo-card__desc">{{ repo.description || t('repo.noDesc') }}</p>
      <div class="repo-card__tags">
        <template v-if="repo.tags?.length">
          <span v-for="tag in repo.tags" :key="tag" class="repo-card__tag">{{ tag }}</span>
        </template>
        <span v-else class="repo-card__tag--empty">{{ t('repo.noTags') }}</span>
    </div>
  </div>
    <div class="repo-card__footer">
      <div class="repo-card__footer-left">
        <span class="repo-card__views">
          <SvgIcon name="eye" :size="14" />
          {{ repo.viewCount || 0 }}
        </span>
        <span v-if="(repo.type === 1 || repo.type === 2) && repo.itemCount != null" class="repo-card__views">
          <SvgIcon name="package" :size="14" />
          {{ repo.itemCount }}
        </span>
      </div>
      <div class="repo-card__right">
      <span class="repo-card__stat">
        <SvgIcon name="chat" :size="14" />
        {{ repo.commentCount || 0 }}
      </span>
      <span class="repo-card__likes" :class="{ 'repo-card__likes--active': repo.isLiked }">
        <SvgIcon :name="repo.isLiked ? 'heart-filled' : 'heart'" :size="14" />
        {{ repo.likeCount || 0 }}
      </span>
      </div>
    </div>
</div>
</template>

<style scoped>
.repo-card {
  display: flex;
  flex-direction: column;
  position: relative;
  --lock-color: #ec66a6;
}
[data-theme="dark"] .repo-card {
  --lock-color: #2952cc;
}
/* Lock-on corner brackets on hover */
.repo-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--transition-fast);
  background:
    linear-gradient(var(--lock-color), var(--lock-color)) top left / var(--spacing-lg) 3px no-repeat,
    linear-gradient(var(--lock-color), var(--lock-color)) top left / 3px var(--spacing-lg) no-repeat,
    linear-gradient(var(--lock-color), var(--lock-color)) top right / var(--spacing-lg) 3px no-repeat,
    linear-gradient(var(--lock-color), var(--lock-color)) top right / 3px var(--spacing-lg) no-repeat,
    linear-gradient(var(--lock-color), var(--lock-color)) bottom left / var(--spacing-lg) 3px no-repeat,
    linear-gradient(var(--lock-color), var(--lock-color)) bottom left / 3px var(--spacing-lg) no-repeat,
    linear-gradient(var(--lock-color), var(--lock-color)) bottom right / var(--spacing-lg) 3px no-repeat,
    linear-gradient(var(--lock-color), var(--lock-color)) bottom right / 3px var(--spacing-lg) no-repeat;
}
.repo-card:hover::before {
  opacity: 1;
}

.repo-card__cover {
  position: relative;
  height: 160px;
  background: var(--color-bg-alt);
  overflow: hidden;
  border-radius: var(--rounded-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  transition: margin var(--transition-fast), height var(--transition-fast);
}
.repo-card:hover .repo-card__cover {
  margin: var(--spacing-md);
  height: calc(160px - 2 * var(--spacing-md));
}
/* touch / mobile layout: no hover effect at all */
@media (hover: none), (max-width: 857px) {
  .repo-card:hover::before { opacity: 0; }
  .repo-card:hover .repo-card__cover { margin: 0; height: 160px; }
  .repo-card:hover .repo-card__footer::before { left: calc(-1 * var(--spacing-md)); right: calc(-1 * var(--spacing-md)); }
}
.repo-card__cover img { width: 100%; height: 100%; object-fit: cover; }
.repo-card__cover-placeholder { display: flex; align-items: center; justify-content: center; }
[data-theme="dark"] .repo-card__cover { background: #13151c; }

.repo-card__badges { position: absolute; top: var(--spacing-md); right: var(--spacing-md); display: flex; gap: var(--spacing-sm); }
.repo-card__type-badge { padding: 2px var(--spacing-sm); font-size: var(--text-xs); font-weight: var(--weight-medium); background: rgba(255,255,255,0.85); border-radius: var(--rounded-full); }
.repo-card__visibility-badge { padding: 2px var(--spacing-sm); font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--color-text-secondary); background: rgba(255,255,255,0.85); border-radius: var(--rounded-full); }
.repo-card__contributing-badge { padding: 2px var(--spacing-sm); font-size: var(--text-xs); font-weight: var(--weight-medium); color: #7c3aed; background: rgba(255,255,255,0.85); border-radius: var(--rounded-full); }
.repo-card__pin { position: absolute; top: var(--spacing-md); left: var(--spacing-md); padding: 2px var(--spacing-sm); font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--color-primary); background: rgba(255,255,255,0.85); border-radius: var(--rounded-full); }
[data-theme="dark"] .repo-card__type-badge,
[data-theme="dark"] .repo-card__visibility-badge,
[data-theme="dark"] .repo-card__pin { background: rgba(46,48,58,0.9); }
[data-theme="dark"] .repo-card__contributing-badge { background: rgba(46,48,58,0.9); color: #a78bfa; }
[data-theme="dark"] .repo-card__pin { color: #58a6ff; }

.repo-card__body { padding: var(--spacing-lg); display: flex; flex-direction: column; flex: 1; }

.repo-card__user { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-sm); }
.repo-card__user-left { display: flex; align-items: center; gap: var(--spacing-sm); }
.repo-card__avatar { width: 20px; height: 20px; border-radius: var(--rounded-full); object-fit: cover; }
.repo-card__avatar-placeholder { width: 20px; height: 20px; border-radius: var(--rounded-full); background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; }
.repo-card__nickname { font-size: var(--text-xs); color: var(--color-text-secondary); }
.repo-card__date { font-size: var(--text-xs); color: var(--color-text-tertiary); font-family: var(--font-mono); display: block; margin-bottom: var(--spacing-sm); }
.repo-card__user .repo-card__date { margin-bottom: 0; }

.repo-card__name { font-size: var(--text-base); font-weight: var(--weight-semibold); line-height: 1.5; margin-bottom: var(--spacing-sm); overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.repo-card__desc { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; margin-bottom: var(--spacing-sm); }
.repo-card__tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: auto; padding-top: var(--spacing-sm); }
.repo-card__tag { padding: 1px var(--spacing-sm); font-size: var(--text-xs); color: var(--color-text-secondary); background: var(--color-bg-alt); border-radius: var(--rounded-full); }
[data-theme="dark"] .repo-card__tag { background: #2e303a; }
.repo-card__tag--empty { font-size: var(--text-xs); color: var(--color-text-tertiary); }

.repo-card__footer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-md);
}
.repo-card__footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: calc(-1 * var(--spacing-md));
  right: calc(-1 * var(--spacing-md));
  border-top: 1px solid var(--color-border-light);
  transition: left var(--transition-fast), right var(--transition-fast);
}
.repo-card:hover .repo-card__footer::before {
  left: 0;
  right: 0;
}
.repo-card__footer-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.repo-card__views, .repo-card__stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  line-height: 1;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.repo-card__right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.repo-card__likes {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  line-height: 1;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}
.repo-card__likes--active {
  color: var(--color-danger);
}
</style>
