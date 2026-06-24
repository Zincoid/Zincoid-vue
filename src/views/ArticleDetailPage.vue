<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { articleAPI, commentAPI, adminAPI, likeAPI } from '@/api'
import CommentSection from '@/components/CommentSection.vue'
import LikeButton from '@/components/LikeButton.vue'
import { formatDate } from '@/utils/format'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const article = ref(null)
const comments = ref([])
const loading = ref(true)
const likeLiked = ref(false)
const likeCount = ref(0)

onMounted(async () => {
  try {
    const [aRes, cRes, lRes] = await Promise.all([
      articleAPI.getDetail(route.params.id),
      commentAPI.getArticle(route.params.id),
      likeAPI.getStatus(1, Number(route.params.id))
    ])
    article.value = aRes.data.data
    comments.value = cRes.data.data || []
    likeLiked.value = lRes.data.data.liked
    likeCount.value = lRes.data.data.count
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

async function handleComment({ content, parentId }) {
  try {
    await commentAPI.addArticle(route.params.id, { content, parentId })
    const { data } = await commentAPI.getArticle(route.params.id)
    comments.value = data.data || []
  } catch (err) {
    alert(err.response?.data?.message || t('comment.postFailed'))
  }
}

async function handleDeleteComment(commentId) {
  if (!confirm(t('comment.deleteConfirm'))) return
  try {
    await commentAPI.delete(commentId)
    const { data } = await commentAPI.getArticle(route.params.id)
    comments.value = data.data || []
  } catch (err) {
    alert(err.response?.data?.message || t('comment.deleteFailed'))
  }
}

async function handleDelete() {
  if (!confirm(t('article.deleteConfirm'))) return
  try {
    await articleAPI.delete(route.params.id)
    window.location.href = '/#/articles'
  } catch (err) {
    alert(err.response?.data?.message || t('article.deleteError'))
  }
}

watch(likeLiked, (liked) => {
  if (!article.value || !auth.user) return
  if (!article.value.recentLikers) article.value.recentLikers = []
  const likers = article.value.recentLikers
  if (liked) {
    if (!likers.some(l => l.userId === auth.user.id)) {
      likers.unshift({
        userId: auth.user.id,
        avatar: auth.user.avatar,
        nickname: auth.user.nickname
      })
    }
  } else {
    const idx = likers.findIndex(l => l.userId === auth.user.id)
    if (idx !== -1) likers.splice(idx, 1)
  }
})
</script>

<template>
  <div class="article-detail container" v-if="article">
    <div class="article-header">
      <span v-if="article.isPinned" class="pin-badge">{{ t('article.pinned') }}</span>
      <h1 class="article-title">{{ article.title }}</h1>

      <div class="article-meta">
        <router-link :to="`/users/${article.userId}`" class="article-author">
          <img v-if="article.userAvatar" :src="article.userAvatar" class="author-avatar" alt="" />
          <span v-else class="author-avatar-placeholder">{{ (article.userNickname || 'U')[0] }}</span>
          <span class="author-nickname">{{ article.userNickname }}</span>
        </router-link>
        <div class="article-meta__right">
          <span class="article-date">{{ formatDate(article.createdAt) }}</span>
          <span class="article-views">{{ article.viewCount }} {{ t('article.views') }}</span>
          <div v-if="auth.isFounder || auth.user?.id === article.userId" class="article-actions">
            <router-link :to="`/articles/${article.id}/edit`" class="link-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </router-link>
            <button class="link-danger" @click="handleDelete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              {{ t('article.delete') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="article.coverImage" class="article-cover">
      <img :src="article.coverImage" alt="" />
    </div>

    <div class="article-body markdown-body" v-html="article.contentHtml || ''"></div>

    <div class="detail__actions-bar">
      <LikeButton
        :target-type="1"
        :target-id="Number(route.params.id)"
        :liked="likeLiked"
        :count="likeCount"
        @update:liked="likeLiked = $event"
        @update:count="likeCount = $event"
      />
      <div v-if="article.recentLikers?.length" class="recent-likers">
        <router-link
          v-for="liker in article.recentLikers"
          :key="liker.userId"
          :to="`/users/${liker.userId}`"
          class="recent-liker-link"
        >
          <img :src="liker.avatar" :title="liker.nickname" class="recent-liker-avatar" alt="" />
        </router-link>
      </div>
    </div>

    <CommentSection
      :comments="comments"
      :target-id="route.params.id"
      target-type="article"
      @submit="handleComment"
      @delete="handleDeleteComment"
    />
  </div>
  <p v-else-if="!loading" class="empty-state">{{ t('article.notFound') }}</p>
</template>

<style scoped>
.article-detail { padding-top: var(--spacing-2xl); padding-bottom: var(--spacing-4xl); }

.article-header { margin-bottom: var(--spacing-2xl); }
.pin-badge { display: inline-block; font-size: var(--text-xs); color: var(--color-primary); background: var(--color-primary-light); padding: 2px 10px; border-radius: var(--rounded-full); font-weight: var(--weight-medium); margin-bottom: var(--spacing-sm); }
.article-title { font-size: var(--text-4xl); margin-bottom: var(--spacing-lg); line-height: 1.3; }

.article-meta { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-lg); font-size: var(--text-sm); color: var(--color-text-secondary); flex-wrap: wrap; }
.article-meta__right { display: flex; align-items: center; gap: var(--spacing-md); }
.article-author { display: flex; align-items: center; gap: var(--spacing-sm); text-decoration: none; color: inherit; font-size: var(--text-base); }
.author-avatar { width: 44px; height: 44px; border-radius: var(--rounded-full); object-fit: cover; border: 2px solid var(--color-border); }
.author-avatar-placeholder { width: 44px; height: 44px; border-radius: var(--rounded-full); background: var(--color-primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: var(--weight-medium); }
.author-nickname { font-weight: var(--weight-medium); color: var(--color-text-heading); }
.article-date { font-family: var(--font-mono); }

.article-cover { margin-bottom: var(--spacing-2xl); border-radius: var(--rounded-lg); overflow: hidden; }
.article-cover img { width: 100%; }

/* Rendered markdown body */
.article-body :deep(h1) { font-size: var(--text-3xl); margin: var(--spacing-2xl) 0 var(--spacing-lg); }
.article-body :deep(h2) { font-size: var(--text-2xl); margin: var(--spacing-xl) 0 var(--spacing-md); border-bottom: 1px solid var(--color-border); padding-bottom: var(--spacing-sm); }
.article-body :deep(h3) { font-size: var(--text-xl); margin: var(--spacing-lg) 0 var(--spacing-sm); }
.article-body :deep(p) { margin-bottom: var(--spacing-lg); line-height: var(--leading-relaxed); }
.article-body :deep(ul), .article-body :deep(ol) { padding-left: var(--spacing-xl); margin-bottom: var(--spacing-lg); }
.article-body :deep(li) { margin-bottom: var(--spacing-xs); }
.article-body :deep(img) { max-width: 100%; border-radius: var(--rounded-md); margin: var(--spacing-lg) 0; }
.article-body :deep(pre) { margin: var(--spacing-lg) 0; }

.article-actions { display: flex; gap: var(--spacing-sm); align-items: center; }
.detail__actions-bar { display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-2xl); }
.recent-likers { display: flex; align-items: center; }
.recent-liker-link { display: flex; line-height: 0; }
.recent-liker-link + .recent-liker-link { margin-left: -8px; }
.recent-liker-avatar { width: 28px; height: 28px; border-radius: var(--rounded-full); object-fit: cover; border: 2px solid var(--color-surface); cursor: pointer; }
.recent-liker-avatar:hover { border-color: var(--color-primary-light); }
</style>
