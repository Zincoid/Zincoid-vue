<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { articleAPI, commentAPI, adminAPI, likeAPI } from '@/api'
import CommentSection from '@/components/CommentSection.vue'
import LikeButton from '@/components/LikeButton.vue'
import { formatDate } from '@/utils/format'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

const { t } = useI18n()
const { getMessage } = useError()
const route = useRoute()
const auth = useAuthStore()
const article = ref(null)
const comments = ref([])
const loading = ref(true)
const likeLiked = ref(false)
const likeCount = ref(0)

// TOC
const tocItems = ref([])
const activeTocId = ref('')
let tocObserver = null

function buildToc() {
  const items = []
  const regex = /<h([1-3])\s*[^>]*>([\s\S]*?)<\/h\1>/gi
  let match
  let index = 0
  while ((match = regex.exec(article.value.contentHtml)) !== null) {
    const level = parseInt(match[1])
    const text = match[2].replace(/<[^>]*>/g, '').trim()
    if (!text) continue
    items.push({ id: `heading-${index++}`, level, text })
  }
  tocItems.value = items
}

function injectHeadingIds() {
  const body = document.querySelector('.article-body')
  if (!body) return
  const headings = body.querySelectorAll('h1, h2, h3')
  headings.forEach((el, i) => {
    el.id = `heading-${i}`
  })
}

function setupScrollSpy() {
  cleanupScrollSpy()
  const headings = [...document.querySelectorAll('.article-body h1[id], .article-body h2[id], .article-body h3[id]')]
  if (headings.length === 0) return

  const visibleSet = new Set()
  tocObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visibleSet.add(entry.target)
        else visibleSet.delete(entry.target)
      }
      const first = headings.find(h => visibleSet.has(h))
      if (first) activeTocId.value = first.id
    },
    { rootMargin: '-80px 0px 0px 0px' }
  )
  headings.forEach(h => tocObserver.observe(h))
}

function cleanupScrollSpy() {
  if (tocObserver) { tocObserver.disconnect(); tocObserver = null }
}

function scrollToHeading(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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

    buildToc()
    await nextTick()
    injectHeadingIds()
    setupScrollSpy()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  cleanupScrollSpy()
})

async function handleComment({ content, parentId }) {
  try {
    await commentAPI.addArticle(route.params.id, { content, parentId })
    const { data } = await commentAPI.getArticle(route.params.id)
    comments.value = data.data || []
  } catch (err) {
    alert(getMessage(err, 'comment.postFailed'))
  }
}

async function handleDeleteComment(commentId) {
  if (!confirm(t('comment.deleteConfirm'))) return
  try {
    await commentAPI.delete(commentId)
    const { data } = await commentAPI.getArticle(route.params.id)
    comments.value = data.data || []
  } catch (err) {
    alert(getMessage(err, 'comment.deleteFailed'))
  }
}

async function handleDelete() {
  if (!confirm(t('article.deleteConfirm'))) return
  try {
    await articleAPI.delete(route.params.id)
    window.location.href = '/#/articles'
  } catch (err) {
    alert(getMessage(err, 'article.deleteError'))
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
    <nav v-if="tocItems.length" class="article-toc">
      <div class="toc-title">{{ t('article.toc') }}</div>
      <ul class="toc-list">
        <li
          v-for="item in tocItems"
          :key="item.id"
          :class="['toc-item', `toc-level-${item.level}`, { 'toc-active': activeTocId === item.id }]"
        >
          <a :href="`#${item.id}`" @click.prevent="scrollToHeading(item.id)">{{ item.text }}</a>
        </li>
      </ul>
    </nav>
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
          <div v-if="auth.isAdmin || auth.user?.id === article.userId" class="article-actions">
            <router-link :to="`/articles/${article.id}/edit`" class="link-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              {{ t('common.edit') }}
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

  <router-link to="/articles" class="back-fab" :title="t('common.backToList')">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
  </router-link>
  <div class="like-fab">
    <LikeButton
      :target-type="1"
      :target-id="Number(route.params.id)"
      :liked="likeLiked"
      :count="likeCount"
      @update:liked="likeLiked = $event"
      @update:count="likeCount = $event"
    />
  </div>
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
.article-body :deep(h1) { font-size: var(--text-3xl); margin: var(--spacing-2xl) 0 var(--spacing-lg); scroll-margin-top: calc(var(--navbar-height) + var(--spacing-md)); }
.article-body :deep(h2) { font-size: var(--text-2xl); margin: var(--spacing-xl) 0 var(--spacing-md); border-bottom: 1px solid var(--color-border); padding-bottom: var(--spacing-sm); scroll-margin-top: calc(var(--navbar-height) + var(--spacing-md)); }
.article-body :deep(h3) { font-size: var(--text-xl); margin: var(--spacing-lg) 0 var(--spacing-sm); scroll-margin-top: calc(var(--navbar-height) + var(--spacing-md)); }
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

/* TOC */
.article-toc::-webkit-scrollbar { width: 3px; }
.article-toc::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.25); border-radius: var(--rounded-full); }
.article-toc::-webkit-scrollbar-track { background: transparent; }
.article-toc {
  position: fixed;
  left: max(calc((100vw - var(--content-max-width)) / 2 - 260px), var(--spacing-xl));
  top: calc(var(--navbar-height) + var(--spacing-2xl));
  bottom: 80px;
  width: 220px;
  overflow-y: auto;
  z-index: 40;
  padding-right: var(--spacing-md);
}
.toc-title {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-md);
}
.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.toc-item {
  margin-bottom: 2px;
}
.toc-item a {
  display: block;
  padding: 4px var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  border-left: 2px solid transparent;
  border-radius: 0 var(--rounded-sm) var(--rounded-sm) 0;
  transition: all var(--transition-fast);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.toc-item a:hover {
  color: var(--color-text-heading);
  border-left-color: var(--color-border);
}
.toc-level-2 a { padding-left: calc(var(--spacing-sm) + var(--spacing-md)); font-size: var(--text-sm); }
.toc-level-3 a { padding-left: calc(var(--spacing-sm) + var(--spacing-xl)); font-size: var(--text-xs); }
.toc-active a {
  color: var(--color-primary) !important;
  border-left-color: var(--color-primary) !important;
  font-weight: var(--weight-medium);
}
@media (min-width: 1201px) {
  .article-detail { padding-left: 200px; }
}
@media (max-width: 1200px) {
  .article-toc { display: none; }
}
</style>
