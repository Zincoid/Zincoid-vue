<script setup>
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { formatDate } from '@/utils/format'

defineProps({
  article: { type: Object, required: true }
})

const { t } = useI18n()
const router = useRouter()

function goDetail(id) {
  router.push(`/articles/${id}`)
}
</script>

<template>
  <article class="article-card" @click="goDetail(article.id)">
    <div v-if="article.coverImage" class="article-card__cover">
      <img :src="article.coverImage" alt="" loading="lazy" />
    </div>
    <div class="article-card__body">
      <div class="article-card__header">
        <span v-if="article.isPinned" class="article-card__pin">{{ t('article.pinned') }}</span>
        <h3 class="article-card__title">{{ article.title }}</h3>
      </div>
      <p v-if="article.summary" class="article-card__summary">{{ article.summary }}</p>
      <div class="article-card__meta">
        <span class="article-card__author">
          <img v-if="article.userAvatar" :src="article.userAvatar" class="article-card__avatar" alt="" />
          <span v-else class="article-card__avatar-placeholder">
            {{ (article.userNickname || 'U')[0] }}
          </span>
          {{ article.userNickname }}
        </span>
        <div class="article-card__stats">
          <span>{{ article.viewCount || 0 }} {{ t('article.views') }}</span>
          <span>{{ article.commentCount || 0 }} {{ t('article.comments') }}</span>
          <span class="article-card__date">{{ formatDate(article.createdAt) }}</span>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.article-card {
  display: flex;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  overflow: hidden;
  cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}
.article-card:hover {
  border-color: #f9a8d4;
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.article-card__cover {
  flex-shrink: 0;
  width: 140px;
  min-height: 100px;
  border-right: 1px solid var(--color-border);
  padding: var(--spacing-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}
.article-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--rounded-sm);
}

.article-card__body {
  flex: 1;
  min-width: 0;
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.article-card__header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.article-card__pin {
  font-size: var(--text-xs);
  color: var(--color-primary);
  background: var(--color-primary-light);
  padding: 1px 8px;
  border-radius: var(--rounded-full);
  font-weight: var(--weight-medium);
  flex-shrink: 0;
}

.article-card__title {
  font-size: var(--text-lg);
  font-weight: var(--weight-medium);
  color: var(--color-text-heading);
  margin: 0;
}

.article-card__summary {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: var(--spacing-sm);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  min-width: 0;
  gap: var(--spacing-sm);
}

.article-card__author {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  min-width: 0;
}

.article-card__avatar {
  width: 20px;
  height: 20px;
  border-radius: var(--rounded-full);
  object-fit: cover;
}
.article-card__avatar-placeholder {
  width: 20px;
  height: 20px;
  border-radius: var(--rounded-full);
  background: var(--color-primary);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.article-card__stats {
  display: flex;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}
.article-card__stats span {
  white-space: nowrap;
}

@media (max-width: 768px) {
  .article-card {
    flex-direction: column;
  }
  .article-card__cover {
    width: 100%;
    min-height: auto;
    aspect-ratio: 16/9;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }
}
</style>
